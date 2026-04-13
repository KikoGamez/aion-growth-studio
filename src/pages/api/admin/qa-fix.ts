export const prerender = false;

import type { APIRoute } from 'astro';

function getSupabase() {
  const url = import.meta.env?.SUPABASE_URL || process.env.SUPABASE_URL;
  const key = import.meta.env?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    || import.meta.env?.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key);
}

/**
 * POST /api/admin/qa-fix
 * Actions: mark-applied, verify
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user || user.role !== 'superuser') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, evaluationId, commitSha, notes } = body;
    const sb = getSupabase();

    if (action === 'mark-applied') {
      // Get the evaluation
      const { data: eval_ } = await sb.from('qa_quality_evaluations')
        .select('id, domain, overall, prompt_for_claude_code')
        .eq('id', evaluationId)
        .single();

      if (!eval_) {
        return new Response(JSON.stringify({ error: 'Evaluation not found' }), { status: 404 });
      }

      // Check if fix already exists
      const { data: existing } = await sb.from('qa_fixes')
        .select('id')
        .eq('evaluation_id', evaluationId)
        .limit(1);

      if (existing && existing.length > 0) {
        // Update existing
        await sb.from('qa_fixes').update({
          status: 'applied',
          applied_at: new Date().toISOString(),
          commit_sha: commitSha || null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        }).eq('id', existing[0].id);

        return new Response(JSON.stringify({ ok: true, fixId: existing[0].id, action: 'updated' }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }

      // Create new fix record
      const { data: fix, error } = await sb.from('qa_fixes').insert({
        evaluation_id: evaluationId,
        domain: eval_.domain,
        prompt: eval_.prompt_for_claude_code || '',
        status: 'applied',
        applied_at: new Date().toISOString(),
        commit_sha: commitSha || null,
        score_before: eval_.overall,
        notes: notes || null,
      }).select('id').single();

      if (error) {
        console.error('[qa-fix] Insert failed:', error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      return new Response(JSON.stringify({ ok: true, fixId: fix.id, action: 'created' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
  } catch (err) {
    console.error('[qa-fix]', (err as Error).message);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
};
