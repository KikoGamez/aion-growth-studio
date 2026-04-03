export const prerender = false;

import type { APIRoute } from 'astro';
import { createSnapshotFromAudit, findAuditByEmail } from '../../../lib/db';

/**
 * POST /api/dashboard/link-audit
 *
 * Links a completed free audit to the authenticated client, creating
 * the first dashboard snapshot.
 *
 * Body: { auditId?: string }
 * - If auditId provided: link that specific audit
 * - If omitted: find the most recent completed audit matching the user's email
 *
 * Requires authenticated user with client (set by middleware).
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const client = (locals as any).client;
  const user = (locals as any).user;

  if (!client?.id || !user?.email) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    let auditId = body.auditId;

    // If no auditId provided, find by user email
    if (!auditId) {
      const found = await findAuditByEmail(user.email);
      if (!found) {
        return new Response(JSON.stringify({ error: 'No completed audit found for your email' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      auditId = found.id;
    }

    const snapshotId = await createSnapshotFromAudit(auditId, client.id);

    return new Response(JSON.stringify({ ok: true, snapshotId, auditId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[link-audit] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
