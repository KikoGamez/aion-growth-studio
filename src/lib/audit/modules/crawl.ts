import axios from 'axios';
import * as cheerio from 'cheerio';
import type { BusinessType, CrawlResult, HreflangAlternate } from '../types';

export async function runCrawl(url: string): Promise<CrawlResult> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIONAuditBot/1.0; +https://aiongrowth.studio)',
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    });

    const html = String(response.data);
    const $ = cheerio.load(html);

    const title = $('title').first().text().trim().slice(0, 100);
    const description = ($('meta[name="description"]').attr('content') || '').trim().slice(0, 200);
    const h1s = $('h1')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean)
      .slice(0, 5)
      .map((h) => h.slice(0, 100));
    const h2Count = $('h2').length;

    const images = $('img');
    const imageCount = images.length;
    const imagesWithAlt = images.filter((_, el) => !!$(el).attr('alt')).length;

    const hasCanonical = $('link[rel="canonical"]').length > 0;
    const hasRobots = $('meta[name="robots"]').length > 0;
    const hasSchemaMarkup = $('script[type="application/ld+json"]').length > 0;

    const hostname = new URL(url).hostname;
    const internalLinks = $('a[href]')
      .filter((_, el) => {
        const href = $(el).attr('href') || '';
        return href.startsWith('/') || href.includes(hostname);
      })
      .length;

    const bodyText = $('body').text().trim();
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

    // Quick sitemap check
    let hasSitemap = false;
    try {
      const sitemapUrl = new URL('/sitemap.xml', url).href;
      const sitemapRes = await axios.head(sitemapUrl, { timeout: 3000, validateStatus: () => true });
      hasSitemap = sitemapRes.status < 400;
    } catch {
      // no sitemap
    }

    // Extract hreflang alternates (multi-domain detection)
    const domain = hostname.replace(/^www\./, '');
    const hreflangAlternates: HreflangAlternate[] = [];
    $('link[rel="alternate"][hreflang]').each((_, el) => {
      const hreflang = $(el).attr('hreflang');
      const href = $(el).attr('href');
      if (hreflang && href && hreflang !== 'x-default') {
        try {
          const altDomain = new URL(href).hostname.replace(/^www\./, '');
          if (altDomain !== domain) {
            hreflangAlternates.push({ hreflang, href, domain: altDomain });
          }
        } catch { /* invalid URL, skip */ }
      }
    });

    // Extract social media handles — check <a href> first, then full HTML text
    const allLinks = $('a[href]').map((_, el) => $(el).attr('href') || '').get();

    let instagramHandle = extractHandle(allLinks, /instagram\.com\/([A-Za-z0-9_.]+)/);
    const twitterHandle = extractHandle(allLinks, /(?:twitter|x)\.com\/([A-Za-z0-9_]+)/);
    const linkedinRaw = allLinks.find((h) => h.includes('linkedin.com/company') || h.includes('linkedin.com/in'));
    let linkedinUrl = linkedinRaw ? linkedinRaw.split('?')[0] : undefined;

    // Fallback: search raw HTML for social patterns (catches JS-rendered links, data-href, etc.)
    const IG_BLACKLIST = ['explore', 'reels', 'stories', 'p', 'tv', 'share', 'sharer', 'reel'];
    if (!instagramHandle) {
      const igMatch = html.match(/instagram\.com\/([A-Za-z0-9_.]{3,30})(?:\/|\?|"|'|\s|\\)/);
      const igCandidate = igMatch?.[1];
      if (igCandidate && !IG_BLACKLIST.includes(igCandidate)) {
        instagramHandle = igCandidate;
      }
    }
    if (!linkedinUrl) {
      const liMatch = html.match(/linkedin\.com\/(company|in)\/([A-Za-z0-9_%\-]+)/);
      if (liMatch) {
        linkedinUrl = `https://www.linkedin.com/${liMatch[1]}/${liMatch[2]}`;
      }
    }

    const businessType = detectBusinessType(html, $, allLinks);

    return {
      title,
      description,
      h1s,
      h2Count,
      imageCount,
      imagesWithAlt,
      hasCanonical,
      hasRobots,
      hasSitemap,
      hasSchemaMarkup,
      internalLinks,
      wordCount,
      loadedOk: true,
      businessType,
      ...(instagramHandle && { instagramHandle }),
      ...(twitterHandle && { twitterHandle }),
      ...(linkedinUrl && { linkedinUrl }),
      ...(hreflangAlternates.length > 0 && { hreflangAlternates }),
    };
  } catch (err: any) {
    return {
      loadedOk: false,
      error: (err.message || 'Failed to crawl').slice(0, 150),
    };
  }
}

/**
 * Detect the business model from HTML signals.
 * Uses a scoring approach — highest score wins.
 */
function detectBusinessType(html: string, $: ReturnType<typeof cheerio.load>, links: string[]): BusinessType {
  const text = html.toLowerCase();
  const scores: Record<BusinessType, number> = { ecommerce: 0, saas: 0, b2b: 0, local: 0, media: 0, unknown: 0 };

  // ── Ecommerce signals ──────────────────────────────────────────
  // Platform fingerprints
  if (/shopify|woocommerce|magento|prestashop|bigcommerce|wix\.com\/stores|tiendanube/.test(text)) scores.ecommerce += 4;
  // Cart/checkout URLs
  if (links.some(l => /\/(cart|carrito|checkout|cesta|bag|basket)/.test(l))) scores.ecommerce += 3;
  // Schema: Product / Offer
  if (/\"@type\"\s*:\s*\"product\"|\"@type\"\s*:\s*\"offer\"/.test(text)) scores.ecommerce += 3;
  // CTA keywords
  if (/añadir al carrito|add to cart|comprar ahora|buy now|ver producto|agregar al carrito/.test(text)) scores.ecommerce += 3;
  // Price patterns ($€ followed by numbers in body)
  const priceMatches = (text.match(/[€$]\s*\d+[\.,]\d{2}/g) || []).length;
  if (priceMatches >= 3) scores.ecommerce += 2;

  // ── SaaS / Subscription signals ───────────────────────────────
  if (/prueba gratuita|free trial|prueba gratis|start for free|empieza gratis|try for free/.test(text)) scores.saas += 4;
  if (/\/pricing|\/precios|\/planes|\/plans|\/subscription/.test(text)) scores.saas += 3;
  // SaaS tech stack signals in scripts/meta
  if (/intercom|segment\.com|mixpanel|heap\.io|amplitude|paddle\.com|stripe\.js/.test(text)) scores.saas += 3;
  if (/app\.|dashboard|workspace|login|sign up|create account|crear cuenta/.test(text)) scores.saas += 2;
  if (/monthly|annually|por mes|al mes|\/month|\/year|per seat/.test(text)) scores.saas += 2;

  // ── B2B lead-gen signals ───────────────────────────────────────
  if (/pedir demo|request a demo|solicitar demo|book a demo|hablar con ventas|contact sales/.test(text)) scores.b2b += 4;
  if (/caso de ?éxito|casos de uso|case stud|testimonios de clientes|trusted by/.test(text)) scores.b2b += 3;
  if (/solicitar presupuesto|pide presupuesto|get a quote|contact us|contáctanos/.test(text)) scores.b2b += 2;
  // LinkedIn prominence = B2B signal
  if (links.filter(l => l.includes('linkedin.com')).length >= 1) scores.b2b += 1;
  // Long enterprise-y copy
  if (/empresa|corporativo|enterprise|b2b|negocio|solución empresarial/.test(text)) scores.b2b += 2;

  // ── Local service signals ──────────────────────────────────────
  // Schema: LocalBusiness / Restaurant
  if (/\"@type\"\s*:\s*\"localbusiness\"|\"@type\"\s*:\s*\"restaurant\"|\"@type\"\s*:\s*\"store\"/.test(text)) scores.local += 4;
  // Address / phone patterns
  if (/calle |avenida |plaza |c\/ |av\. /.test(text)) scores.local += 2;
  if (/\+34|\+1|\+44|tel:|phone:/.test(text)) scores.local += 2;
  // Google Maps embed
  if (/maps\.google|google\.com\/maps|goo\.gl\/maps/.test(text)) scores.local += 3;
  if (/horario|opening hours|abierto|cerrado|lunes.*viernes/.test(text)) scores.local += 2;

  // ── Media / Content signals ────────────────────────────────────
  // Multiple /blog /news /article paths
  const blogLinks = links.filter(l => /\/(blog|news|articulo|article|post|noticias|revista)\//.test(l)).length;
  if (blogLinks >= 5) scores.media += 4;
  else if (blogLinks >= 2) scores.media += 2;
  // Newsletter / subscribe
  if (/newsletter|suscríbete|subscribe|suscribirse/.test(text)) scores.media += 2;
  // Large word count = content site
  const wc = (text.match(/\b\w+\b/g) || []).length;
  if (wc > 3000) scores.media += 1;

  // ── Pick winner ────────────────────────────────────────────────
  const winner = (Object.entries(scores) as [BusinessType, number][])
    .filter(([t]) => t !== 'unknown')
    .sort(([, a], [, b]) => b - a)[0];

  // Require at least 3 pts to commit to a type
  return winner[1] >= 3 ? winner[0] : 'unknown';
}

function extractHandle(links: string[], pattern: RegExp): string | undefined {
  for (const link of links) {
    const match = link.match(pattern);
    if (match?.[1] && !['explore', 'reels', 'stories', 'p', 'tv', 'share', 'sharer'].includes(match[1])) {
      return match[1];
    }
  }
  return undefined;
}
