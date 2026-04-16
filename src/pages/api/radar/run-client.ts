export const prerender = false;

import type { APIRoute } from 'astro';
import { getClientById, IS_DEMO } from '../../../lib/db';
import { runRadarForClient } from '../../../lib/radar/run-radar';

const CRON_SECRET = import.meta.env?.CRON_SECRET || process.env.CRON_SECRET;
const PUBLIC_SITE_URL = import.meta.env?.PUBLIC_SITE_URL
  || process.env.PUBLIC_SITE_URL
  || 'https://aiongrowth.studio';

/**
 * POST /api/radar/run-client
 *
 * Runs the Radar pipeline for a single client in 3 self-chaining phases
 * so no single Function invocation has to fit the entire work in 300s:
 *
 *   Phase A (~120-150s): crawl → ssl → ... → competitors (stops before competitor_traffic)
 *   Phase B (~120-150s): competitor_traffic → ... → score (stops before growth_agent)
 *   Phase C (~120-180s): growth_agent → snapshot + recs + analytics
 *
 * Each phase runs in its own Vercel Function invocation (300s budget).
 * At the end of A and B, it fires a POST to itself for the next phase,
 * using AbortSignal.timeout(5000) — enough to flush the TCP request
 * over the network, then we disconnect. The server-side keeps running
 * because Vercel does NOT cancel functions (no supportsCancellation
 * in vercel.json).
 *
 * Body: { clientId: string, phase?: 'A'|'B'|'C', auditId?: string }
 * Auth: CRON_SECRET
 */
export const POST: APIRoute = async ({ request }) => {
  if (IS_DEMO) {
    return new Response(JSON.stringify({ error: 'Demo mode' }), { status: 400 });
  }

  const authHeader = request.headers.get('authorization');
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  if (!authHeader?.includes(CRON_SECRET || '') && !isVercelCron && CRON_SECRET) {
    console.warn('[radar:single] Unauthorized — missing/wrong authorization header');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId } = body;
    let { auditId: existingAuditId } = body;
    let phase: string = body.phase || 'A';

    if (!clientId) {
      return new Response(JSON.stringify({ error: 'clientId required' }), { status: 400 });
    }

    const client = await getClientById(clientId);

    // Resume detection for phase A: if a prior audit for this client is
    // stuck in 'processing' (self-chain failed at some point), resume
    // from its current step instead of starting a fresh pipeline.
    if (phase === 'A' && !existingAuditId) {
      try {
        const { getSupabase } = await import('../../../lib/db');
        const sb = getSupabase();
        const { data: stuckAudits } = await sb
          .from('audits')
          .select('id, current_step, updated_at')
          .ilike('url', `%${client.domain}%`)
          .eq('status', 'processing')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (stuckAudits?.length) {
          const stuck = stuckAudits[0];
          const ageMin = (Date.now() - new Date(stuck.updated_at).getTime()) / 60000;
          if (ageMin > 3) {
            existingAuditId = stuck.id;
            const step = stuck.current_step;
            if (step === 'growth_agent' || step === 'done') phase = 'C';
            else if (step === 'competitor_traffic' || step === 'score') phase = 'B';
            console.log(`[radar:single] Resuming stuck audit ${stuck.id} at step=${step} (${Math.round(ageMin)}min old) as Phase ${phase}`);
          }
        }
      } catch { /* non-fatal */ }
    }

    console.log(`[radar:single] Phase ${phase} for ${client.name} (${client.domain})`);

    const PHASE_CONFIG: Record<string, { stopBefore?: string; nextPhase?: string }> = {
      A: { stopBefore: 'competitor_traffic', nextPhase: 'B' },
      B: { stopBefore: 'growth_agent', nextPhase: 'C' },
      C: { /* run to done + post-pipeline */ },
    };
    const config = PHASE_CONFIG[phase] || PHASE_CONFIG.A;

    const result = await runRadarForClient(
      { id: client.id, name: client.name, domain: client.domain },
      {
        existingAuditId: existingAuditId || undefined,
        stopBefore: config.stopBefore as any,
      },
    );

    console.log(`[radar:single] Phase ${phase} ${client.domain}: ${result.success ? 'OK' : 'FAIL'} in ${result.durationMs}ms`);

    // Self-chain to next phase via fire-and-abort. 5 seconds is enough
    // to flush the TCP request; server keeps running afterwards.
    if (result.success && config.nextPhase && result.auditId) {
      const selfUrl = `${PUBLIC_SITE_URL.replace(/\/$/, '')}/api/radar/run-client`;
      const authValue = authHeader || `Bearer ${CRON_SECRET}`;
      try {
        await fetch(selfUrl, {
          method: 'POST',
          headers: {
            'Authorization': authValue,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientId,
            auditId: result.auditId,
            phase: config.nextPhase,
          }),
          signal: AbortSignal.timeout(5000),
        });
        console.log(`[radar:single] Phase ${config.nextPhase} chain returned before timeout (unusual)`);
      } catch (err) {
        const name = (err as Error).name;
        if (name === 'TimeoutError' || name === 'AbortError') {
          console.log(`[radar:single] Phase ${config.nextPhase} chain fired for ${client.domain}`);
        } else {
          console.error(`[radar:single] Phase ${config.nextPhase} chain failed: ${(err as Error).message}`);
        }
      }
    }

    return new Response(JSON.stringify({ ...result, phase }), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[radar:single] Unhandled error:', (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
};
