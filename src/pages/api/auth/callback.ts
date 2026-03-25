import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  if (!code) return redirect('/login?error=no_code');

  const supabaseUrl = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = import.meta.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !anonKey) return redirect('/login?error=not_configured');

  const sb = createClient(supabaseUrl, anonKey);
  const { data, error } = await sb.auth.exchangeCodeForSession(code);

  if (error || !data.session) return redirect('/login?error=oauth_failed');

  const { session, user } = data;

  cookies.set('sb-access-token', session.access_token, {
    path: '/', httpOnly: true, maxAge: 3600, sameSite: 'lax',
  });
  cookies.set('sb-refresh-token', session.refresh_token, {
    path: '/', httpOnly: true, maxAge: 60 * 60 * 24 * 30, sameSite: 'lax',
  });

  // Superuser → admin panel
  if (user.email?.endsWith('@aiongrowth.studio')) {
    return redirect('/admin');
  }

  // Check if user already has a client (returning user vs new self-service)
  if (serviceKey) {
    const sbAdmin = createClient(supabaseUrl, serviceKey);
    const { data: cuData } = await sbAdmin
      .from('client_users')
      .select('client_id')
      .eq('user_id', user.id)
      .limit(1);
    if (!cuData || cuData.length === 0) {
      return redirect('/dashboard/onboarding?step=0');
    }
  }

  return redirect('/dashboard');
};
