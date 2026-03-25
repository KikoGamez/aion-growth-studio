import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

export const GET: APIRoute = async ({ request, redirect }) => {
  const url = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = import.meta.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) return redirect('/login?error=not_configured');

  const sb = createClient(url, anonKey);
  const origin = new URL(request.url).origin;

  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/api/auth/callback` },
  });

  if (error || !data.url) return redirect('/login?error=oauth_failed');
  return redirect(data.url);
};
