import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const email = form.get('email') as string;
  const password = form.get('password') as string;

  const url = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = import.meta.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const sb = createClient(url!, anonKey!);

  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return redirect('/login?error=invalid');
  }

  // Set session cookies
  cookies.set('sb-access-token', data.session.access_token, {
    path: '/',
    httpOnly: true,
    maxAge: 3600,
    sameSite: 'lax',
  });
  cookies.set('sb-refresh-token', data.session.refresh_token, {
    path: '/',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  });

  return redirect('/dashboard');
};
