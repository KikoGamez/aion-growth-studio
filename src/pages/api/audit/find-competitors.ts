export const prerender = false;

import type { APIRoute } from 'astro';
import axios from 'axios';
import * as cheerio from 'cheerio';

const API_KEY = import.meta.env.ANTHROPIC_API_KEY;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return json({ error: 'URL required' }, 400);
    }

    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

    // Quick page fetch — title, description, h1
    let title = '';
    let description = '';
    let h1 = '';
    let bodyText = '';

    try {
      const res = await axios.get(normalizedUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AIONAuditBot/1.0)',
          Accept: 'text/html',
        },
        validateStatus: (s) => s < 500,
      });
      const $ = cheerio.load(res.data as string);
      title = $('title').first().text().trim().slice(0, 120);
      description = $('meta[name="description"]').attr('content')?.trim().slice(0, 200) || '';
      h1 = $('h1').first().text().trim().slice(0, 120);
      bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 500);
    } catch {
      // Continue with empty data — Claude can still work with domain alone
    }

    const domain = new URL(normalizedUrl).hostname.replace(/^www\./, '');

    if (!API_KEY) {
      return json({ competitors: [], sector: 'desconocido', businessScope: 'unknown' });
    }

    const prompt = `Analiza esta empresa y devuelve sus competidores directos.

Dominio: ${domain}
Título web: ${title || 'N/A'}
Meta descripción: ${description || 'N/A'}
H1 principal: ${h1 || 'N/A'}
Contenido parcial: ${bodyText || 'N/A'}

Determina:
1. El sector/industria de la empresa
2. Si es un negocio LOCAL (sirve clientes en una ciudad/región específica), NACIONAL (España/país) o GLOBAL/SAAS (clientes en todo el mundo)
3. 4-5 competidores directos REALES con sus URLs

REGLAS IMPORTANTES:
- Para negocios locales (restaurante, clínica, tienda física, etc.): busca competidores de la misma ciudad/región
- Para negocios nacionales (agencia, consultora, ecommerce): busca competidores del mismo país
- Para SaaS/productos digitales: busca competidores globales del mismo espacio
- Incluye SOLO empresas que realmente existen y tienen web activa
- NO incluyas al propio negocio analizado

Responde ÚNICAMENTE con JSON válido:
{
  "sector": "nombre del sector en español",
  "businessScope": "local" | "national" | "global",
  "location": "ciudad/región si es local, null si no",
  "competitors": [
    {"name": "Nombre Empresa", "url": "https://...", "why": "Por qué es competidor directo (1 frase)"},
    ...
  ]
}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    const text: string = data?.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      return json({ competitors: [], sector: 'desconocido', businessScope: 'unknown' });
    }

    const parsed = JSON.parse(match[0]);
    return json({
      sector: parsed.sector || 'desconocido',
      businessScope: parsed.businessScope || 'unknown',
      location: parsed.location || null,
      competitors: (parsed.competitors || []).slice(0, 5).map((c: any) => ({
        name: (c.name || '').slice(0, 80),
        url: (c.url || '').slice(0, 120),
        why: (c.why || '').slice(0, 150),
      })),
    });
  } catch (err: any) {
    console.error('find-competitors error:', err.message);
    return json({ competitors: [], sector: 'desconocido', businessScope: 'unknown' });
  }
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
