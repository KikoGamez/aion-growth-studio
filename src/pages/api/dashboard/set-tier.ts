export const prerender = false;
import type { APIRoute } from 'astro';
import type { Tier } from '../../../lib/demo-data';
import { IS_DEMO, updateClientTier } from '../../../lib/db';

const VALID_TIERS: Tier[] = ['radar', 'señales', 'palancas'];

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  let tier: Tier;

  // Support both JSON and FormData
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await request.json();
    tier = body.tier;
  } else {
    const formData = await request.formData();
    tier = formData.get('tier') as Tier;
  }

  if (!VALID_TIERS.includes(tier)) {
    return new Response(JSON.stringify({ error: 'Invalid tier' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Demo mode: set cookie
  cookies.set('aion_tier', tier, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  });

  // Real mode: also update in database
  if (!IS_DEMO) {
    const client = (locals as any).client;
    if (client?.id) {
      await updateClientTier(client.id, tier);
    }
  }

  // Return JSON for fetch calls, redirect for form submissions
  if (contentType.includes('application/json')) {
    return new Response(JSON.stringify({ ok: true, tier }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(null, { status: 302, headers: { Location: '/dashboard/subscription' } });
};
