import type { APIRoute } from 'astro';
import { getIntegration, saveIntegration } from '../../../lib/integrations';

export const prerender = false;

/**
 * POST /api/integrations/google-select-property
 * When user has multiple GA4 properties, they select one.
 * Body: { clientId, propertyName, propertyDisplayName }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const { clientId, propertyName, propertyDisplayName } = await request.json();
    if (!clientId || !propertyName) {
      return new Response(JSON.stringify({ error: 'clientId and propertyName required' }), { status: 400 });
    }

    const integration = await getIntegration(clientId, 'google_analytics');
    if (!integration) {
      return new Response(JSON.stringify({ error: 'No Google integration found' }), { status: 404 });
    }

    await saveIntegration({
      ...integration,
      property_id: propertyName,
      property_name: propertyDisplayName || propertyName,
    });

    return new Response(JSON.stringify({ ok: true, propertyId: propertyName }));
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
};
