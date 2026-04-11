import type { APIRoute } from 'astro';
import {
  findRecentAuditByDomain, createSnapshotFromAudit, IS_DEMO,
  getClientOnboarding, getAllSnapshots, logRecommendation,
  getActionPlan, getCompletedActions, getRejectedRecommendations,
  getClientById,
} from '../../../lib/db';
import { createAuditPage } from '../../../lib/audit/supabase-storage';
import { generateBriefing } from '../../../lib/briefing';
import { runGrowthAgent } from '../../../lib/ai/growth-agent';
import { getSupabase } from '../../../lib/db';

export const prerender = false;

/**
 * POST /api/radar/first-run
 * Triggered after onboarding to ensure the client has data + recommendations.
 *
 * Logic:
 * 1. Check if a recent audit (< 12h) exists for this domain → reuse it
 * 2. If not, start a new audit pipeline
 * 3. If linked, generate briefing + seed initial recommendations
 *
 * Body: { domain: string, clientId: string, email?: string, clientName?: string }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { domain, clientId, email, clientName } = body;

    if (!domain) {
      return new Response(JSON.stringify({ error: 'domain required' }), { status: 400 });
    }

    if (IS_DEMO) {
      return new Response(JSON.stringify({ status: 'linked', auditId: 'demo-audit', message: 'Demo mode' }));
    }

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    const recentAudit = await findRecentAuditByDomain(cleanDomain, 12);

    if (recentAudit) {
      // Reuse existing audit — link as first snapshot
      let snapshotId: string | null = null;
      try {
        snapshotId = await createSnapshotFromAudit(recentAudit.id, clientId);
      } catch (e) {
        console.log(`[first-run] Snapshot link note: ${(e as Error).message}`);
      }

      // Generate briefing + seed recommendations from the audit data
      try {
        await seedRecommendationsFromAudit(clientId, clientName || cleanDomain, cleanDomain);
      } catch (e) {
        console.error(`[first-run] Recommendation seeding failed:`, (e as Error).message);
      }

      return new Response(JSON.stringify({
        status: 'linked',
        auditId: recentAudit.id,
        message: `Reused recent audit (score: ${recentAudit.score})`,
      }));
    }

    // No recent audit — start a new one
    const url = `https://${cleanDomain}`;
    const auditId = await createAuditPage(url, email || 'radar@aiongrowth.com');

    return new Response(JSON.stringify({
      status: 'started',
      auditId,
      message: 'New audit started — poll /api/audit/{id}/status for progress',
    }));

  } catch (err) {
    console.error('[first-run] Error:', (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
};

/**
 * After linking a snapshot, generate a personalized briefing and seed
 * initial recommendations so the client sees actionable items on first load.
 */
async function seedRecommendationsFromAudit(clientId: string, clientName: string, domain: string) {
  const onboarding = await getClientOnboarding(clientId);
  const snapshots = await getAllSnapshots(clientId);
  if (snapshots.length === 0) return;

  const latest = snapshots[snapshots.length - 1];
  const auditResults = latest.pipeline_output || {};
  const priorSnapshot = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null;

  // Generate briefing with Sonnet (legacy — kept until commit 3)
  const briefing = await generateBriefing({
    onboarding: onboarding || { client_id: clientId } as any,
    auditResults,
    clientName,
    domain,
  });

  console.log(`[first-run] Briefing generated: ${briefing.priorities.length} priorities, ${briefing.quickWins.length} quick wins`);

  // Generate Growth Agent analysis (unified, coherent narrative + actions)
  // Runs in parallel to briefing during transition. Fails soft — won't block first-run.
  let growthAnalysis: any = null;
  try {
    const [client, inProgress, completed, rejected] = await Promise.all([
      getClientById(clientId).catch(() => null),
      getActionPlan(clientId).catch(() => []),
      getCompletedActions(clientId).catch(() => []),
      getRejectedRecommendations(clientId).catch(() => []),
    ]);

    growthAnalysis = await runGrowthAgent({
      clientName,
      domain,
      sector: client?.sector,
      tier: client?.tier,
      onboarding,
      pipelineOutput: auditResults,
      priorSnapshot: priorSnapshot ? { date: priorSnapshot.date, pipeline_output: priorSnapshot.pipeline_output || {} } : null,
      priorityKeywords: onboarding?.priority_keywords,
      keywordStrategy: onboarding?.keyword_strategy,
      actionHistory: {
        completed: completed.map(a => ({ title: a.title, impact: a.impact, completedAt: a.completed_at })),
        inProgress: inProgress.filter(a => a.status === 'in_progress').map(a => ({ title: a.title, impact: a.impact })),
        rejected: rejected.map(r => ({ title: r.title, reason: r.rejected_reason })),
      },
    });
    console.log(`[first-run] Growth Agent: ${growthAnalysis.prioritizedActions.length} actions, model=${growthAnalysis.model}`);
  } catch (e) {
    console.error(`[first-run] Growth Agent failed (non-blocking):`, (e as Error).message);
  }

  // Save briefing + growth_analysis into the snapshot
  try {
    const sb = getSupabase();
    const updated: Record<string, any> = { ...auditResults, briefing };
    if (growthAnalysis) updated.growth_analysis = growthAnalysis;
    await sb.from('snapshots').update({ pipeline_output: updated }).eq('id', latest.id);
  } catch (e) {
    console.error(`[first-run] Snapshot save failed:`, (e as Error).message);
  }

  // Seed recommendations from briefing priorities (commit 2 will switch to growth_analysis.prioritizedActions)
  for (const priority of briefing.priorities) {
    await logRecommendation({
      client_id: clientId,
      source: 'radar',
      title: priority.title,
      description: priority.description,
      impact: priority.impact || 'high',
      status: 'pending',
    });
  }

  console.log(`[first-run] Seeded ${briefing.priorities.length} recommendations for ${domain}`);
}
