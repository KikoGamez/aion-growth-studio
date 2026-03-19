import type { MetaAdsResult, CrawlResult } from '../types';

async function checkMetaAds(query: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const encoded = encodeURIComponent(query);
    const url =
      `https://www.facebook.com/ads/library/async/search_typeahead/?` +
      `q=${encoded}&session_id=1&country=ES&reload=false&surface=SEARCH` +
      `&is_targeted_country=false&view_all_page_id=&type=page&search_type=page`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; AIONBot/1.0; +https://aiongrowth.studio)',
        Accept: 'application/json',
      },
    });

    // 403 / 429 / non-200 → treat as unknown (not as "no ads")
    if (!res.ok) return false;

    const text = await res.text();

    // Strip for_iframe JSONP wrapper if present
    const jsonText = text.replace(/^for_iframe\(/, '').replace(/\)$/, '');
    let data: any;
    try { data = JSON.parse(jsonText); } catch { return false; }

    const pages: any[] = data?.data?.pages || data?.payload?.pages || [];
    return pages.length > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function runMetaAds(
  url: string,
  crawl: CrawlResult,
  competitors: Array<{ name: string; url: string }>,
): Promise<MetaAdsResult> {
  const domain = new URL(url.startsWith('http') ? url : `https://${url}`)
    .hostname.replace(/^www\./, '');
  const companyName = crawl.title?.split(/[-|]/)[0]?.trim() || domain;

  // Run client + competitor checks in parallel
  const [clientHasAds, ...compResults] = await Promise.all([
    checkMetaAds(companyName),
    ...competitors.slice(0, 5).map((c) =>
      checkMetaAds(c.name || c.url).then((hasAds) => ({ name: c.name, url: c.url, hasMetaAds: hasAds })),
    ),
  ]);

  const competitorsWithAds = compResults.filter((c) => c.hasMetaAds);

  // If everything returned false (likely blocked), skip silently
  if (!clientHasAds && competitorsWithAds.length === 0) {
    return { skipped: true, reason: 'No Meta Ads detected or endpoint unavailable' };
  }

  return {
    hasMetaAds: clientHasAds,
    metaPageName: clientHasAds ? companyName : undefined,
    competitorsWithMetaAds: competitorsWithAds.length,
    competitorDetails: compResults,
  };
}
