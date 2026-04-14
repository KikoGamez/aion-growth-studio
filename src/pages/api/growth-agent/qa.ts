export const prerender = false;

import type { APIRoute } from 'astro';
import { getSupabase, IS_DEMO } from '../../../lib/db';
import { runQAReview, applyCorrections } from '../../../lib/ai/growth-agent-qa';
import { resolveProfile } from '../../../lib/benchmarks/resolve-profile';
import { logAiGeneration } from '../../../lib/data/ai-log';

const CRON_SECRET = import.meta.env?.CRON_SECRET || process.env.CRON_SECRET;
const STUDIO_API_KEY = import.meta.env?.STUDIO_API_KEY || process.env.STUDIO_API_KEY;

/**
 * POST /api/growth-agent/qa
 *
 * Runs the Opus QA review over a previously-saved Sonnet draft. This lets
 * the Growth Agent pipeline split its work across TWO Vercel Function
 * invocations, each with its own 300s budget:
 *
 *   Invocation A (runGrowthAgent skipQA:true):
 *     Sonnet draft + structural validation  (~150-220s)
 *     → save draft to snapshot with qaPending=true
 *     → fire-and-forget this endpoint
 *
 *   Invocation B (/api/growth-agent/qa):
 *     Load draft from snapshot
 *     → Opus QA review (~60-120s)
 *     → apply corrections
 *     → save corrected analysis with qaPending=false, qaPassed=true
 *
 * Body: { clientId: string, snapshotId: string }
 * Auth: CRON_SECRET via Authorization header OR x-studio-api-key.
 */
export const POST: APIRoute = async ({ request }) => {
  if (IS_DEMO) {
    return new Response(JSON.stringify({ error: 'Demo mode' }), { status: 400 });
  }

  // Auth
  const authHeader = request.headers.get('authorization') || '';
  const apiKey = request.headers.get('x-studio-api-key') || '';
  const authed =
    (!!CRON_SECRET && authHeader.includes(CRON_SECRET)) ||
    (!!STUDIO_API_KEY && apiKey === STUDIO_API_KEY);
  if (!authed) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId, snapshotId } = body;
    if (!clientId || !snapshotId) {
      return new Response(JSON.stringify({ error: 'clientId + snapshotId required' }), { status: 400 });
    }

    const t0 = Date.now();
    const sb = getSupabase();

    // Load the snapshot that holds the Sonnet draft
    const { data: snapshot, error: loadErr } = await sb
      .from('snapshots')
      .select('id, pipeline_output')
      .eq('id', snapshotId)
      .eq('client_id', clientId)
      .single();
    if (loadErr || !snapshot) {
      return new Response(JSON.stringify({ error: `Snapshot not found: ${snapshotId}` }), { status: 404 });
    }

    const draft = snapshot.pipeline_output?.growth_analysis;
    if (!draft || !draft.executiveSummary) {
      return new Response(JSON.stringify({ error: 'No draft to review on this snapshot' }), { status: 400 });
    }

    if (draft.qaPending === false && draft.qaPassed === true) {
      // Already QA'd — likely a duplicate fire. Skip gracefully.
      return new Response(JSON.stringify({ ok: true, skipped: 'already-qa-passed' }), { status: 200 });
    }

    // Resolve profile from the stored pipeline context (same cascade as elsewhere).
    // We don't have the onboarding here — the agent run that created the draft
    // already baked it into sector inference if the user confirmed.
    const resolved = resolveProfile({
      sectorResult: {
        businessProfile: (snapshot.pipeline_output.sector as any)?.businessProfile,
        geoScope: (snapshot.pipeline_output.sector as any)?.geoScope,
        confidence: (snapshot.pipeline_output.sector as any)?.confidence,
      },
    });

    console.log(`[growth-agent-qa-endpoint] Running QA for client=${clientId} snapshot=${snapshotId} profile=${resolved.profile}/${resolved.geoScope}`);

    let qa;
    try {
      qa = await runQAReview(draft, snapshot.pipeline_output, resolved);
    } catch (err) {
      console.error('[growth-agent-qa-endpoint] QA threw:', (err as Error).message);
      qa = { approved: true, corrections: [], summary: `QA crashed: ${(err as Error).message}` };
    }

    const qaCorrections = qa.corrections?.length || 0;
    const corrected = qa.approved && qaCorrections === 0
      ? { ...draft, qaPassed: true, qaPending: false, qaNotes: [qa.summary] }
      : { ...applyCorrections(draft, qa.corrections), qaPassed: true, qaPending: false };

    // Persist corrected analysis back to the snapshot
    const { error: saveErr } = await sb
      .from('snapshots')
      .update({
        pipeline_output: { ...snapshot.pipeline_output, growth_analysis: corrected },
      })
      .eq('id', snapshotId);

    if (saveErr) {
      console.error('[growth-agent-qa-endpoint] Save failed:', saveErr.message);
      return new Response(JSON.stringify({ error: `Save failed: ${saveErr.message}` }), { status: 500 });
    }

    logAiGeneration({
      client_id: clientId,
      agent: 'growth_agent_qa',
      model: 'claude-opus-4-6',
      layer: 3,
      success: true,
      latency_ms: Date.now() - t0,
      qa_corrections: qaCorrections,
    }).catch(() => {});

    console.log(`[growth-agent-qa-endpoint] Done in ${Date.now() - t0}ms — ${qaCorrections} corrections applied`);

    return new Response(JSON.stringify({
      ok: true,
      corrections: qaCorrections,
      summary: qa.summary,
      latencyMs: Date.now() - t0,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('[growth-agent-qa-endpoint] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
