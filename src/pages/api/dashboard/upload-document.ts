export const prerender = false;

import type { APIRoute } from 'astro';
import { saveClientDocument, updateDocumentStatus, getClientDocuments } from '../../../lib/db';
import { extractText } from '../../../lib/documents/extract';
import { summarizeDocument } from '../../../lib/documents/summarize';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_DOCUMENTS = 10;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
]);

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
    // Check document limit
    const existing = await getClientDocuments(client.id);
    if (existing.length >= MAX_DOCUMENTS) {
      return new Response(
        JSON.stringify({ error: `Máximo ${MAX_DOCUMENTS} documentos. Elimina alguno antes de subir más.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Parse multipart form
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
    }

    // Validate type
    if (!ALLOWED_TYPES.has(file.type) && !file.name.match(/\.(pdf|docx|txt|csv|png|jpe?g)$/i)) {
      return new Response(
        JSON.stringify({ error: 'Tipo de archivo no soportado. Acepta: PDF, DOCX, TXT, CSV, PNG, JPG' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `Archivo demasiado grande (${Math.round(file.size / 1024 / 1024)}MB). Máximo: 25MB` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const storagePath = `${client.id}/${crypto.randomUUID()}-${file.name}`;
    const sb = getSupabase();
    const { error: uploadErr } = await sb.storage
      .from('client-documents')
      .upload(storagePath, buffer, { contentType: file.type });

    if (uploadErr) {
      console.error('[upload-document] Storage upload failed:', uploadErr.message);
      return new Response(
        JSON.stringify({ error: 'Error al subir el archivo. Inténtalo de nuevo.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Create document record
    const docId = await saveClientDocument({
      client_id: client.id,
      filename: file.name,
      file_path: storagePath,
      file_type: file.type,
      file_size_bytes: file.size,
      status: 'processing',
    });

    if (!docId) {
      return new Response(
        JSON.stringify({ error: 'Error al registrar el documento' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Extract text + summarize (synchronous — fast enough for Haiku)
    try {
      const { text, charCount, truncated } = await extractText(buffer, file.type);
      console.log(`[upload-document] Extracted ${charCount} chars from ${file.name}${truncated ? ' (truncated)' : ''}`);

      if (!text.trim()) {
        // No text extractable (image, empty file, etc.)
        await updateDocumentStatus(docId, 'ready', {
          extracted_text: '',
          summary: 'Documento sin texto extraíble (imagen o archivo vacío).',
          category: 'other',
        });

        return new Response(
          JSON.stringify({ ok: true, documentId: docId, status: 'ready', hasText: false }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      // Summarize with Haiku
      const result = await summarizeDocument(text, file.name);
      console.log(`[upload-document] Summarized ${file.name}: category=${result.category}, facts=${result.key_facts.length}`);

      await updateDocumentStatus(docId, 'ready', {
        extracted_text: text.slice(0, 100_000), // keep full text for potential future use
        summary: result.summary,
        category: result.category,
        entities: result.entities,
      });

      // key_facts stored via direct update (not in the typed helper)
      try {
        await sb.from('client_documents')
          .update({ key_facts: result.key_facts })
          .eq('id', docId);
      } catch { /* column may not exist yet — graceful degradation */ }

      return new Response(
        JSON.stringify({
          ok: true,
          documentId: docId,
          status: 'ready',
          summary: result.summary.slice(0, 200) + '...',
          category: result.category,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    } catch (procErr) {
      console.error('[upload-document] Processing failed:', (procErr as Error).message);
      await updateDocumentStatus(docId, 'error', {
        error_message: (procErr as Error).message?.slice(0, 200),
      });

      return new Response(
        JSON.stringify({ ok: true, documentId: docId, status: 'error', error: 'Error procesando el documento' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
  } catch (err) {
    console.error('[upload-document] Unexpected error:', (err as Error).message);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
