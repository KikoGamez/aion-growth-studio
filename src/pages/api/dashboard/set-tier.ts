export const prerender = false;
import type { APIRoute } from 'astro';
import type { Tier } from '../../../lib/demo-data';

const VALID_TIERS: Tier[] = ['radar', 'señales', 'palancas'];

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const tier = formData.get('tier') as Tier;

  if (!VALID_TIERS.includes(tier)) {
    return new Response('Invalid tier', { status: 400 });
  }

  cookies.set('aion_tier', tier, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
    sameSite: 'lax',
  });

  return redirect('/dashboard/settings');
};
