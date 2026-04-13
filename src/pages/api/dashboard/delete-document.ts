export const prerender = false;

import type { APIRoute } from 'astro';
import { getClientDocuments } from '../../../lib/db';

function getSupabase() {
  const url = import.meta.env?.SUPABASE_URL || process.env.SUPABASE_URL;
  const key = import.meta.env?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    || import.meta.env?.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key);
}

export const POST: APIRoute = async ({ request, locals }) => {
  const client = (locals as any).client;
  if (!client?.id) {
    return new Response(JSON.stringify({ error: 'Auth required' }), { status: 401 });
  }

  try {
    const { documentId } = await request.json();
    if (!documentId) {
      return new Response(JSON.stringify({ error: 'Missing documentId' }), { status: 400 });
    }

    // Verify document belongs to this client
    const docs = await getClientDocuments(client.id);
    const doc = docs.find((d) => d.id === documentId);
    if (!doc) {
      return new Response(JSON.stringify({ error: 'Documento no encontrado' }), { status: 404 });
    }

    const sb = getSupabase();

    // Delete from storage
    if (doc.file_path) {
      await sb.storage.from('client-documents').remove([doc.file_path]);
    }

    // Delete from database
    await sb.from('client_documents').delete().eq('id', documentId);

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[delete-document]', (err as Error).message);
    return new Response(
      JSON.stringify({ error: 'Error al eliminar el documento' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
