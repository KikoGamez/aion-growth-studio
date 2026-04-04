export const prerender = false;

import type { APIRoute } from 'astro';
import { updateRecommendationStatus, logInteraction } from '../../../lib/db';

/**
 * POST /api/dashboard/update-action
 * Marks a recommendation/action as done, in_progress, or pending.
 * Records timestamp for correlation with KPI changes.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const client = (locals as any).client;
  const user = (locals as any).user;

  if (!client?.id) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { recommendationId, status, feedback } = body;

    if (!recommendationId || !status) {
      return new Response(JSON.stringify({ error: 'recommendationId and status required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validStatuses = ['pending', 'accepted', 'in_progress', 'done', 'rejected'];
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid status' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await updateRecommendationStatus(recommendationId, status, feedback);

    // Log the action change for correlation tracking
    logInteraction(client.id, 'recommendation_status_changed', {
      recommendationId,
      newStatus: status,
      feedback: feedback || null,
    }, user?.id).catch(() => {});

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[update-action] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
