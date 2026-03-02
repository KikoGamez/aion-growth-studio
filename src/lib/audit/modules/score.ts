import type { ScoreResult, ModuleResult, CrawlResult, SSLResult, PageSpeedResult, ContentResult, GeoResult, GBPResult } from '../types';

export async function runScore(results: Record<string, ModuleResult>): Promise<ScoreResult> {
  const crawl = (results.crawl || {}) as CrawlResult;
  const ssl = (results.ssl || {}) as SSLResult;
  const pagespeed = (results.pagespeed || {}) as PageSpeedResult;
  const content = (results.content || {}) as ContentResult;
  const geo = (results.geo || {}) as GeoResult;
  const gbp = (results.gbp || {}) as GBPResult;

  // Technical score: SSL + canonical + schema + sitemap
  let technical = 40;
  if (ssl.valid) technical += 25;
  if (crawl.hasCanonical) technical += 10;
  if (crawl.hasSchemaMarkup) technical += 15;
  if (crawl.hasSitemap) technical += 10;
  technical = Math.min(100, technical);

  // Performance score: PageSpeed average mobile + desktop
  let performance = 40;
  if (!pagespeed.skipped && pagespeed.mobile) {
    const mob = pagespeed.mobile.performance;
    const desk = pagespeed.desktop?.performance ?? mob;
    performance = Math.round((mob + desk) / 2);
  }

  // Content score: clarity from LLM analysis
  let contentScore = 50;
  if (!content.skipped && content.clarity !== undefined) {
    contentScore = content.clarity;
  }

  // Visibility score: GEO + GBP
  let visibility = 0;
  if (!geo.skipped && geo.overallScore !== undefined) {
    visibility = geo.overallScore;
  }
  if (!gbp.skipped && gbp.found) {
    visibility = Math.min(100, visibility + 20);
    if ((gbp.rating || 0) >= 4) {
      visibility = Math.min(100, visibility + 10);
    }
  }

  // Weighted total
  const total = Math.round(
    technical * 0.3 + performance * 0.25 + contentScore * 0.25 + visibility * 0.2,
  );

  return {
    total,
    breakdown: {
      technical,
      performance,
      content: contentScore,
      visibility,
    },
  };
}
