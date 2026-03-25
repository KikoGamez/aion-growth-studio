import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  // Verify superuser
  const accessToken = cookies.get('sb-access-token')?.value;
  if (!accessToken) return redirect('/login');

  const supabaseUrl = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = import.meta.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) return redirect('/admin?error=not_configured');

  const sb = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await sb.auth.getUser(accessToken);

  if (authError || !user || !user.email?.endsWith('@aiongrowth.studio')) {
    return redirect('/admin');
  }

  const form = await request.formData();
  const name = (form.get('name') as string)?.trim();
  const domain = (form.get('domain') as string)?.trim().toLowerCase().replace(/^https?:\/\//, '');
  const sector = (form.get('sector') as string)?.trim();
  const tier = (form.get('tier') as string) || 'radar';
  const adminEmail = (form.get('adminEmail') as string)?.trim().toLowerCase();

  if (!name || !domain) return redirect('/admin/clients/new?error=missing_fields');

  const sbAdmin = createClient(supabaseUrl, serviceKey);

  // Create client row
  const { data: clientData, error: clientError } = await sbAdmin
    .from('clients')
    .insert({ name, domain, sector: sector || 'General', tier })
    .select('id')
    .single();

  if (clientError || !clientData) {
    return redirect('/admin/clients/new?error=db_error');
  }

  // If admin email provided, invite them and create client_users row
  if (adminEmail) {
    const { data: invited, error: inviteError } = await sbAdmin.auth.admin.inviteUserByEmail(adminEmail);
    if (!inviteError && invited.user) {
      await sbAdmin.from('client_users').insert({
        client_id: clientData.id,
        user_id: invited.user.id,
        role: 'admin',
      });
    }
  }

  return redirect('/admin');
};
