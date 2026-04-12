import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ConversionResult, CrawlResult } from '../types';

const ANTHROPIC_API_KEY = import.meta.env?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

export async function runConversion(url: string, crawlData: CrawlResult): Promise<ConversionResult> {
  try {
    const res = await axios.get(url, {
      timeout: 120_000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIONAuditBot/1.0)' },
      maxRedirects: 5,
      validateStatus: (s) => s < 500,
    });

    const html = String(res.data);
    const $ = cheerio.load(html);
    const bodyText = $('body').text();

    // ── Forms ────────────────────────────────────────────────────
    const formCount = $('form').length;
    const formFieldCount = $('form input:not([type=hidden]), form textarea, form select').length;
    const hasContactForm = formFieldCount >= 2;

    // ── CTA buttons ──────────────────────────────────────────────
    const CTA_RE = /contact|contac|demo|prueba|trial|compra|buy|register|registra|empieza|agenda|book|reserv|solicita|request|download|descarg|get.start|suscr|subscribe|habla|llama|cotiza|quote/i;
    const ctaEls = $('button, a.btn, a.button, [class*="cta"], [class*="btn-"], [class*="button"]').filter((_, el) => {
      return CTA_RE.test($(el).text()) || CTA_RE.test($(el).attr('class') || '') || CTA_RE.test($(el).attr('href') || '');
    });
    const ctaCount = ctaEls.length;
    const hasCTA = ctaCount > 0;

    // ── Lead magnets ─────────────────────────────────────────────
    const LEAD_RE = /gratis|free|descarga|download|guía|guide|ebook|webinar|plantilla|template|checklist|recurso|resource|herramienta|tool|demo gratis|free trial/i;
    const hasLeadMagnet = LEAD_RE.test(bodyText);

    // ── Social proof / testimonials ──────────────────────────────
    const hasSchemaReview = $('[itemtype*="Review"], [itemtype*="Testimonial"]').length > 0;
    const TESTIMONIAL_RE = /testimonio|testimonial|opini[oó]n|review|cliente|client|caso de [eé]xito|case study|lo que dicen|what our/i;
    const hasTestimonials = hasSchemaReview || TESTIMONIAL_RE.test(bodyText);

    // ── Pricing ──────────────────────────────────────────────────
    const PRICING_RE = /precio|price|plan|tarifa|package|nuestros precios|our pricing/i;
    const hasPricing = PRICING_RE.test(bodyText) &&
      $('[class*="price"], [class*="pricing"], [class*="plan"], [class*="tarif"]').length > 0;

    // ── Video ────────────────────────────────────────────────────
    const hasVideo = $('video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="wistia"], iframe[src*="loom"]').length > 0;

    // ── Chat widget ──────────────────────────────────────────────
    const hasChatWidget = $('[id*="chat"], [class*="chat-widget"], [class*="chat_widget"], [id*="crisp"], [id*="tidio"], [class*="intercom-"], [id*="drift"]').length > 0;

    // ── Commerce signals (cart, checkout, product pages) ────────
    const CART_RE = /carrito|cart|cesta|basket|bag|bolsa|a[ñn]adir|add.to.cart|add.to.bag|comprar|buy.now|kaufen/i;
    const hasAddToCart = $(
      'button, a.btn, a.button, [class*="add-to-cart"], [class*="addtocart"], [class*="buy-button"]'
    ).filter((_, el) => CART_RE.test($(el).text()) || CART_RE.test($(el).attr('class') || '')).length > 0;

    const CART_PAGE_RE = /\/cart|\/carrito|\/cesta|\/basket|\/bag|\/checkout|\/pago|\/finalizar/i;
    const hasCart = hasAddToCart
      || $('a[href*="/cart"], a[href*="/carrito"], a[href*="/cesta"], a[href*="/basket"]').length > 0
      || CART_PAGE_RE.test(html);

    const CHECKOUT_RE = /\/checkout|\/pago|\/finalizar|\/tramitar|\/payment|\/order/i;
    const hasCheckout = $(`a[href*="checkout"], a[href*="pago"], a[href*="finalizar"]`).length > 0
      || CHECKOUT_RE.test(html);

    const PRODUCT_PRICE_RE = /(\d+[.,]\d{2}\s*€|€\s*\d+[.,]\d{2}|\$\s*\d+[.,]\d{2}|\d+[.,]\d{2}\s*\$)/;
    const priceElements = $('[class*="price"], [class*="precio"], [data-price], [itemprop="price"]');
    const hasProductPrices = priceElements.length >= 2 || (priceElements.length >= 1 && PRODUCT_PRICE_RE.test(bodyText));
    const productCount = $('[itemtype*="Product"], [class*="product-card"], [class*="product-item"], [class*="producto"]').length;

    const NEWSLETTER_RE = /newsletter|suscr[íi]bete|suscripci[oó]n|email.*ofertas|mantente.informad|te avisamos|no te pierdas|sign.up.*email|stay.updated/i;
    const hasNewsletter = NEWSLETTER_RE.test(bodyText)
      || $('[class*="newsletter"], [id*="newsletter"], [class*="subscribe"], [class*="popup-email"]').length > 0;

    const hasWishlist = $('[class*="wishlist"], [class*="favorit"], [class*="lista-deseos"], [aria-label*="wishlist"], [aria-label*="favorit"]').length > 0
      || /lista de deseos|wishlist|guardar favorit|add to wishlist/i.test(bodyText);

    const hasProductFilters = $('[class*="filter"], [class*="filtro"], [class*="facet"], [data-filter]').length >= 2
      || $('select[name*="sort"], select[name*="orden"]').length > 0;

    // ── Detect dominant conversion model ────────────────────────
    const commerceSignals = [hasCart, hasAddToCart, hasCheckout, hasProductPrices, productCount >= 3].filter(Boolean).length;
    const leadGenSignals = [hasContactForm, hasLeadMagnet, hasChatWidget].filter(Boolean).length;
    const detectedModel: 'ecommerce' | 'lead_gen' | 'hybrid' | 'informational' =
      commerceSignals >= 3 ? 'ecommerce'
        : leadGenSignals >= 2 && commerceSignals >= 2 ? 'hybrid'
        : leadGenSignals >= 1 ? 'lead_gen'
        : 'informational';

    // Post-validation: resolve contradictions
    // A lead magnet requires at least one CTA to access it
    const validatedHasCTA = hasCTA || hasLeadMagnet || hasContactForm || hasAddToCart;
    const validatedCtaCount = validatedHasCTA && ctaCount === 0 ? 1 : ctaCount;

    const structural = {
      formCount, formFieldCount, hasContactForm,
      ctaCount: validatedCtaCount, hasCTA: validatedHasCTA,
      hasLeadMagnet, hasTestimonials, hasPricing, hasVideo, hasChatWidget,
      hasCart, hasAddToCart, hasCheckout, hasProductPrices, hasNewsletter,
      hasWishlist, hasProductFilters, productCount,
      detectedModel,
    };

    // ── Heuristic score — counts ALL signals regardless of model ──
    let funnelScore = 0;
    // Lead-gen signals
    if (hasContactForm) funnelScore += 15;
    if (hasCTA) funnelScore += Math.min(15, ctaCount * 5);
    if (hasLeadMagnet) funnelScore += 12;
    if (hasChatWidget) funnelScore += 5;
    // Commerce signals
    if (hasAddToCart) funnelScore += 15;
    if (hasCart) funnelScore += 5;
    if (hasCheckout) funnelScore += 10;
    if (hasProductPrices) funnelScore += 8;
    if (hasProductFilters) funnelScore += 5;
    if (hasNewsletter) funnelScore += 5;
    if (hasWishlist) funnelScore += 3;
    // Shared signals
    if (hasTestimonials) funnelScore += 10;
    if (hasPricing) funnelScore += 7;
    if (hasVideo) funnelScore += 5;
    funnelScore = Math.min(100, funnelScore);

    // ── LLM qualitative analysis (Haiku) ────────────────────────
    if (ANTHROPIC_API_KEY) {
      const llm = await analyzeWithLLM(url, structural, crawlData);

      // Post-validate LLM output: remove contradictions with structural data
      const FORM_RE = /formulario|form|lead magnet|captación|capture/i;
      let strengths = llm.strengths || [];
      let weaknesses = llm.weaknesses || [];

      if (!structural.hasContactForm && structural.formFieldCount === 0) {
        // No real form detected → remove form-related strengths, keep as weakness
        strengths = strengths.filter((s: string) => !FORM_RE.test(s));
      }
      if (structural.hasContactForm) {
        // Has form → remove "no form" from weaknesses
        weaknesses = weaknesses.filter((w: string) => !/sin formulario|no form|no tiene formulario/i.test(w));
      }

      return {
        ...structural,
        funnelScore: llm.funnelScore ?? funnelScore,
        summary: llm.summary,
        strengths,
        weaknesses,
      };
    }

    return { ...structural, funnelScore };
  } catch (err: any) {
    return { skipped: true, reason: err.message?.slice(0, 100) };
  }
}

async function analyzeWithLLM(
  url: string,
  structural: any,
  crawl: CrawlResult,
): Promise<{ funnelScore?: number; summary?: string; strengths?: string[]; weaknesses?: string[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150_000);
  try {
    const prompt = `Analiza la capacidad de conversión de este sitio web. Evalúa TODOS los elementos — tanto de captación de leads (formularios, CTAs) como de comercio electrónico (carrito, checkout, fichas de producto).

URL: ${url}
Título: ${crawl.title || '—'}
Descripción meta: ${crawl.description || '—'}
H1 principal: ${(crawl.h1s || []).join(', ') || '—'}
Modelo detectado: ${structural.detectedModel}

Señales de captación de leads:
- Formularios: ${structural.formCount} (${structural.formFieldCount} campos visibles)
- CTAs detectados: ${structural.ctaCount}
- Lead magnet: ${structural.hasLeadMagnet ? 'Sí' : 'No'}
- Chat en vivo: ${structural.hasChatWidget ? 'Sí' : 'No'}

Señales de comercio electrónico:
- Botón "Añadir al carrito": ${structural.hasAddToCart ? 'Sí' : 'No'}
- Carrito / cesta: ${structural.hasCart ? 'Sí' : 'No'}
- Checkout / pago: ${structural.hasCheckout ? 'Sí' : 'No'}
- Precios de producto visibles: ${structural.hasProductPrices ? 'Sí' : 'No'}
- Fichas de producto detectadas: ${structural.productCount}
- Filtros de producto: ${structural.hasProductFilters ? 'Sí' : 'No'}
- Lista de deseos / favoritos: ${structural.hasWishlist ? 'Sí' : 'No'}

Señales compartidas:
- Newsletter / suscripción email: ${structural.hasNewsletter ? 'Sí' : 'No'}
- Testimonios / prueba social: ${structural.hasTestimonials ? 'Sí' : 'No'}
- Precios visibles (servicios/planes): ${structural.hasPricing ? 'Sí' : 'No'}
- Vídeo: ${structural.hasVideo ? 'Sí' : 'No'}

Responde SOLO con JSON válido (sin markdown, sin \`\`\`):
{
  "funnelScore": <0-100 madurez del funnel de conversión, sea de leads o de venta>,
  "summary": "<1-2 frases evaluando la capacidad de convertir visitas en leads o ventas, según lo que sea este negocio>",
  "strengths": ["fortaleza concreta 1", "fortaleza concreta 2"],
  "weaknesses": ["brecha o mejora prioritaria 1", "brecha o mejora prioritaria 2"]
}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) return {};
    const data = await res.json();
    const text: string = data?.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}
