export const prerender = false;

import type { APIRoute } from 'astro';
import { getSupabase, IS_DEMO } from '../../../lib/db';

/**
 * POST /api/advisor/unlock-day
 *
 * Purchase a 24h bypass of the daily Advisor cap. Current implementation
 * is a STUB that grants the unlock immediately — Stripe integration is not
 * wired yet. When Stripe is enabled, this endpoint should:
 *   1. Create a one-time Checkout Session for €1 (STRIPE_PRICE_DAY_UNLOCK)
 *   2. Return { checkoutUrl } for the client to redirect to
 *   3. Grant unlock from the webhook after 'checkout.session.completed'
 *
 * For now (stub) the grant is direct — makes the full UX testable end to
 * end without blocking on Stripe setup.
 */
export const POST: APIRoute = async ({ locals }) => {
  const client = (locals as any).client;
  if (!client?.id) return new Response(JSON.stringify({ error: 'Unauthenticated' }), { status: 401 });
  if (IS_DEMO) return new Response(JSON.stringify({ ok: true, demo: true, fakeUnlock: true }), { status: 200 });

  const sb = getSupabase();
  const month = new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().slice(0, 10);
  const unlockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Upsert the monthly usage row and set unlock_until = now + 24h
  const { data: existing } = await sb.from('client_usage')
    .select('id')
    .eq('client_id', client.id)
    .eq('month', month)
    .single();

  if (existing) {
    await sb.from('client_usage')
      .update({ unlock_until: unlockUntil })
      .eq('client_id', client.id)
      .eq('month', month);
  } else {
    await sb.from('client_usage').insert({
      client_id: client.id,
      month,
      tokens_used: 0,
      messages_count: 0,
      cost_cents_daily: 0,
      last_daily_reset: today,
      unlock_until: unlockUntil,
    });
  }

  console.log(`[advisor:unlock-day] STUB granted for client=${client.id} until ${unlockUntil}`);

  return new Response(JSON.stringify({
    ok: true,
    fakeUnlock: true,
    unlockUntil,
    // When Stripe is live, we'd return { checkoutUrl } instead and the
    // client would redirect. For the stub, we signal success + target time.
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
