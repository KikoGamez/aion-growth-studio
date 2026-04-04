export const prerender = false;

import type { APIRoute } from 'astro';
import { listAllClients, IS_DEMO } from '../../../lib/db';
import { runRadarForClient } from '../../../lib/radar/run-radar';

const CRON_SECRET = import.meta.env?.CRON_SECRET || process.env.CRON_SECRET;

/**
 * POST /api/radar/run
 *
 * Triggered by Vercel Cron (weekly) or manually from admin.
 * Runs Radar for all active clients sequentially.
 *
 * Auth: requires CRON_SECRET header or superuser session.
 */
export const POST: APIRoute = async ({ request }) => {
  if (IS_DEMO) {
    return new Response(JSON.stringify({ error: 'Radar not available in demo mode' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Auth: cron secret or check authorization header
  const authHeader = request.headers.get('authorization');
  const cronAuth = authHeader === `Bearer ${CRON_SECRET}`;
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';

  if (!cronAuth && !isVercelCron && CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const clients = await listAllClients();

    // Filter: only clients with tier != 'radar' (free tier) get Radar
    // For now, run for all clients — tier filtering can be added later
    const radarClients = clients.map(c => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
    }));

    if (radarClients.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'No clients to process', results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[radar:cron] Starting Radar for ${radarClients.length} clients...`);

    // Run sequentially to avoid API rate limits
    const results = [];
    for (const client of radarClients) {
      const result = await runRadarForClient(client);
      results.push(result);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

    console.log(`[radar:cron] Complete: ${successful} success, ${failed} failed, ${totalDuration}ms total`);

    return new Response(JSON.stringify({
      ok: true,
      processed: results.length,
      successful,
      failed,
      totalDurationMs: totalDuration,
      results: results.map(r => ({
        domain: r.domain,
        success: r.success,
        newRecommendations: r.newRecommendations,
        correlationsFound: r.correlationsFound,
        durationMs: r.durationMs,
        error: r.error,
      })),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[radar:cron] Fatal error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
