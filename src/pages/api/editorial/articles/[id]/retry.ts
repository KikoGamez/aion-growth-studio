export const prerender = false;

import type { APIRoute } from 'astro';
import { getArticle, updateArticle } from '../../../../../lib/editorial/db';

/**
 * POST /api/editorial/articles/:id/retry
 *
 * Resets an article from error_* or stuck processing_* status back
 * to the corresponding queued_* status so it can be retried.
 *
 *   error_writer / processing_writer    → queued_writer
 *   error_editor / processing_editor    → queued_editor
 *   error_rewrite / processing_rewrite  → queued_rewrite
 *   error_salvage / processing_salvage  → queued_salvage
 */
export const POST: APIRoute = async ({ params, locals }) => {
  const client = (locals as any).client;
  const articleId = params.id as string;

  if (!client?.id) {
    return json({ error: 'Authentication required' }, 401);
  }

  const article = await getArticle(articleId);
  if (!article) return json({ error: 'Article not found' }, 404);
  if (article.client_id !== client.id) return json({ error: 'Forbidden' }, 403);

  const RESET_MAP: Record<string, string> = {
    error_writer: 'queued_writer',
    processing_writer: 'queued_writer',
    error_editor: 'queued_editor',
    processing_editor: 'queued_editor',
    error_rewrite: 'queued_rewrite',
    processing_rewrite: 'queued_rewrite',
    error_salvage: 'queued_salvage',
    processing_salvage: 'queued_salvage',
  };

  const resetTo = RESET_MAP[article.status];
  if (!resetTo) {
    return json({ error: `Cannot retry from status '${article.status}'` }, 409);
  }

  const updated = await updateArticle(articleId, {
    status: resetTo,
    error_message: null,
  });

  console.log(`[editorial:retry] Article ${articleId} reset from ${article.status} → ${resetTo}`);

  return json({
    article_id: updated.id,
    previous_status: article.status,
    status: updated.status,
  });
};

function json(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}
