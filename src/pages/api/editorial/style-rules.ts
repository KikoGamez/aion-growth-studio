export const prerender = false;

import type { APIRoute } from 'astro';
import { listStyleRules, createStyleRule, archiveStyleRule } from '../../../lib/editorial/db';

/**
 * GET  /api/editorial/style-rules — list all active rules for this client
 * POST /api/editorial/style-rules — add a new rule
 *   Body: { rule_type, content, priority?, language? }
 *   rule_type: 'vocabulary_avoid' | 'vocabulary_prefer' | 'tone' | 'structure' | 'formula'
 *
 * DELETE /api/editorial/style-rules — archive a rule
 *   Body: { id }
 */
export const GET: APIRoute = async ({ locals }) => {
  const client = (locals as any).client;
  if (!client?.id) return json({ error: 'Authentication required' }, 401);

  const rules = await listStyleRules(client.id);
  return json({ rules: rules.filter(r => !r.archived_at) });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const client = (locals as any).client;
  if (!client?.id) return json({ error: 'Authentication required' }, 401);

  const body = await request.json();
  const { rule_type, content, priority, language } = body;

  if (!rule_type || !content?.trim()) {
    return json({ error: 'rule_type and content are required' }, 400);
  }

  const validTypes = ['vocabulary_avoid', 'vocabulary_prefer', 'tone', 'structure', 'formula', 'length', 'formatting'];
  if (!validTypes.includes(rule_type)) {
    return json({ error: `Invalid rule_type. Valid: ${validTypes.join(', ')}` }, 400);
  }

  const rule = await createStyleRule({
    client_id: client.id,
    rule_type,
    content: content.trim(),
    priority: Math.min(5, Math.max(1, priority ?? 4)),
    language: language || null,
    source: 'manual',
  });

  return json({ ok: true, rule });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const client = (locals as any).client;
  if (!client?.id) return json({ error: 'Authentication required' }, 401);

  const body = await request.json();
  if (!body.id) return json({ error: 'Missing rule id' }, 400);

  await archiveStyleRule(body.id);
  return json({ ok: true });
};

function json(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}
