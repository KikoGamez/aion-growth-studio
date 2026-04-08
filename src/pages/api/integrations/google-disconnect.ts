import type { APIRoute } from 'astro';
import { getIntegration, disconnectIntegration, revokeToken } from '../../../lib/integrations';

export const prerender = false;

/**
 * POST /api/integrations/google-disconnect
 * Revokes Google tokens and marks integration as disconnected.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const { clientId } = await request.json();
    if (!clientId) return new Response(JSON.stringify({ error: 'clientId required' }), { status: 400 });

    const integration = await getIntegration(clientId, 'google_analytics');
    if (integration) {
      // Revoke tokens at Google
      try {
        if (integration.access_token) await revokeToken(integration.access_token);
        if (integration.refresh_token) await revokeToken(integration.refresh_token);
      } catch { /* Best effort — revoke might fail if already expired */ }

      await disconnectIntegration(clientId, 'google_analytics');
    }

    return new Response(JSON.stringify({ ok: true }));
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
};
