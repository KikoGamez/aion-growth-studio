import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  // Verify superuser via access token
  const accessToken = cookies.get('sb-access-token')?.value;
  if (!accessToken) return redirect('/login');

  const supabaseUrl = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = import.meta.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return redirect('/login');

  const sb = createClient(supabaseUrl, anonKey);
  const { data: { user }, error } = await sb.auth.getUser(accessToken);

  if (error || !user || !user.email?.endsWith('@aiongrowth.studio')) {
    return redirect('/dashboard');
  }

  const form = await request.formData();
  const clientId = form.get('clientId') as string;

  if (clientId === 'clear') {
    cookies.delete('aion_active_client', { path: '/' });
    return redirect('/admin');
  }

  cookies.set('aion_active_client', clientId, {
    path: '/', httpOnly: true, sameSite: 'lax',
  });

  return redirect('/dashboard');
};
