import type { APIRoute } from 'astro';
import { findRecentAuditByDomain, createSnapshotFromAudit, IS_DEMO } from '../../../lib/db';
import { createAuditPage } from '../../../lib/audit/supabase-storage';

export const prerender = false;

/**
 * POST /api/radar/first-run
 * Triggered after onboarding to ensure the client has data in their dashboard.
 *
 * Logic:
 * 1. Check if a recent audit (< 12h) exists for this domain → reuse it
 * 2. If not, start a new audit pipeline
 *
 * Body: { domain: string, clientId: string, email?: string }
 * Returns: { status: 'linked' | 'started', auditId: string }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { domain, clientId, email } = body;

    if (!domain) {
      return new Response(JSON.stringify({ error: 'domain required' }), { status: 400 });
    }

    // In demo mode, pretend it worked
    if (IS_DEMO) {
      return new Response(JSON.stringify({ status: 'linked', auditId: 'demo-audit', message: 'Demo mode — data already available' }));
    }

    // 1. Look for a recent audit for this domain (< 12 hours)
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    const recentAudit = await findRecentAuditByDomain(cleanDomain, 12);

    if (recentAudit) {
      // Reuse existing audit — link as first snapshot
      try {
        await createSnapshotFromAudit(recentAudit.id, clientId);
      } catch (e) {
        // Snapshot might already exist, that's fine
        console.log(`[first-run] Snapshot link note: ${(e as Error).message}`);
      }
      return new Response(JSON.stringify({
        status: 'linked',
        auditId: recentAudit.id,
        message: `Reused recent audit (score: ${recentAudit.score})`,
      }));
    }

    // 2. No recent audit — start a new one
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
