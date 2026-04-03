export const prerender = false;

import type { APIRoute } from 'astro';
import { saveClientOnboarding } from '../../../lib/db';

/**
 * POST /api/dashboard/save-onboarding
 * Saves the onboarding business context for the authenticated client.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const client = (locals as any).client;

  if (!client?.id) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();

    await saveClientOnboarding({
      client_id: client.id,
      business_description: body.business_description || null,
      primary_goal: body.primary_goal || null,
      goal_detail: body.goal_detail || null,
      geo_scope: body.geo_scope || null,
      geo_detail: body.geo_detail || null,
      url_architecture: body.url_architecture || null,
      url_detail: body.url_detail || null,
      monthly_budget: body.monthly_budget || null,
      team_size: body.team_size || null,
      competitors: body.competitors || [],
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[save-onboarding] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
