export const prerender = false;

import type { APIRoute } from 'astro';

/**
 * GET /api/validate-url?url=https://example.com
 * Checks if a URL is reachable (HEAD request with 5s timeout).
 */
export const GET: APIRoute = async ({ url: reqUrl }) => {
  const target = reqUrl.searchParams.get('url');

  if (!target) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const normalized = target.startsWith('http') ? target : `https://${target}`;
    new URL(normalized); // validate format

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(normalized, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIONBot/1.0)' },
    });
    clearTimeout(timer);

    return new Response(JSON.stringify({
      reachable: res.ok || res.status < 500,
      status: res.status,
      url: normalized,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({
      reachable: false,
      error: err.name === 'AbortError' ? 'Timeout' : 'Unreachable',
      url: target,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
