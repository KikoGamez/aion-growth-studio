import type { APIRoute } from 'astro';
import { getAuditPage } from '../../../../lib/audit/supabase-storage';

export const prerender = false;

/**
 * GET /api/audit/{id}/competitors
 * Returns the competitors detected in a completed audit.
 * Public endpoint (no auth) — only returns competitor URLs, nothing sensitive.
 */
export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ competitors: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const audit = await getAuditPage(id);
    if (!audit || audit.status !== 'completed') {
      return new Response(JSON.stringify({ competitors: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const r = audit.results || {};
    // Get competitors from multiple possible sources
    const detected = (r.competitors?.competitors || []).map((c: any) => ({
      url: c.url || (c.domain ? `https://${c.domain}` : ''),
      name: c.name || '',
    })).filter((c: any) => c.url);

    return new Response(JSON.stringify({ competitors: detected.slice(0, 3) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ competitors: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
};
