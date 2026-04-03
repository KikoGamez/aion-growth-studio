export const prerender = false;

import type { APIRoute } from 'astro';
import { getClientOnboarding, getLatestSnapshot, IS_DEMO } from '../../../lib/db';
import { generateBriefing } from '../../../lib/briefing';

/**
 * POST /api/dashboard/generate-briefing
 * Generates a personalized briefing from onboarding data + latest audit snapshot.
 */
export const POST: APIRoute = async ({ locals }) => {
  const client = (locals as any).client;

  if (!client?.id) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const onboarding = await getClientOnboarding(client.id);
    if (!onboarding) {
      return new Response(JSON.stringify({ error: 'Complete onboarding first' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const snapshot = await getLatestSnapshot(client.id);
    if (snapshot.id === 'empty') {
      return new Response(JSON.stringify({ error: 'No audit data available' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const briefing = await generateBriefing({
      onboarding,
      auditResults: snapshot.pipeline_output,
      clientName: client.name,
      domain: client.domain,
    });

    // Store briefing in snapshot (non-blocking update)
    if (!IS_DEMO) {
      const { createClient } = await import('@supabase/supabase-js');
      const url = import.meta.env?.SUPABASE_URL || process.env.SUPABASE_URL;
      const key = import.meta.env?.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
      if (url && key) {
        const sb = createClient(url, key);
        await sb.from('snapshots')
          .update({ pipeline_output: { ...snapshot.pipeline_output, briefing } })
          .eq('id', snapshot.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, briefing }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[generate-briefing] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
