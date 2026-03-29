import type { ModuleResult } from '../types';

const DFS_LOGIN = import.meta.env?.DATAFORSEO_LOGIN || process.env.DATAFORSEO_LOGIN;
const DFS_PASSWORD = import.meta.env?.DATAFORSEO_PASSWORD || process.env.DATAFORSEO_PASSWORD;

export interface ShoppingAdvertiser {
  domain: string;
  name: string;
  appearances: number; // how many queries they appeared in
}

export interface GoogleShoppingResult extends ModuleResult {
  advertisers?: ShoppingAdvertiser[];
  clientFound?: boolean;        // did the client domain appear in Shopping?
  queriesSearched?: number;
  totalShoppingResults?: number;
}

export async function runGoogleShopping(
  url: string,
  topKeywords: Array<{ keyword: string; volume: number }>,
  competitors: Array<{ name: string; url: string }>,
): Promise<GoogleShoppingResult> {
  if (!DFS_LOGIN || !DFS_PASSWORD) {
    return { skipped: true, reason: 'DataForSEO credentials not configured' };
  }

  const domain = new URL(url.startsWith('http') ? url : `https://${url}`)
    .hostname.replace(/^www\./, '');

  const auth = Buffer.from(`${DFS_LOGIN}:${DFS_PASSWORD}`).toString('base64');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    // Pick up to 3 high-volume product keywords to search in Google Shopping
    const queries = topKeywords
      .filter(kw => kw.volume >= 50)
      .slice(0, 3)
      .map(kw => kw.keyword);

    if (queries.length === 0) {
      return { skipped: true, reason: 'No suitable product keywords found' };
    }

    // Search Google Shopping for each query in parallel
    const results = await Promise.allSettled(
      queries.map(keyword =>
        fetch('https://api.dataforseo.com/v3/serp/google/shopping/live/regular', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
          body: JSON.stringify([{
            keyword,
            location_code: 2724,
            language_code: 'es',
            depth: 20,
          }]),
        }).then(r => r.ok ? r.json() : null)
      )
    );

    // Aggregate: count how many times each domain appears across all queries
    const domainCounts = new Map<string, { name: string; count: number }>();
    let clientFound = false;
    let totalResults = 0;

    for (const r of results) {
      if (r.status !== 'fulfilled' || !r.value) continue;
      const items: any[] = r.value?.tasks?.[0]?.result?.[0]?.items || [];
      for (const item of items) {
        if (item.type !== 'shopping') continue;
        totalResults++;
        const sellerDomain = (item.domain || '').replace(/^www\./, '');
        if (!sellerDomain) continue;

        if (sellerDomain === domain || sellerDomain.includes(domain)) {
          clientFound = true;
        }

        const existing = domainCounts.get(sellerDomain);
        if (existing) {
          existing.count++;
        } else {
          domainCounts.set(sellerDomain, {
            name: item.seller || sellerDomain,
            count: 1,
          });
        }
      }
    }

    // Build advertisers list sorted by appearances, exclude the client domain
    const advertisers: ShoppingAdvertiser[] = [...domainCounts.entries()]
      .filter(([d]) => d !== domain && !d.includes(domain))
      .map(([d, v]) => ({ domain: d, name: v.name, appearances: v.count }))
      .sort((a, b) => b.appearances - a.appearances)
      .slice(0, 10);

    return {
      advertisers,
      clientFound,
      queriesSearched: queries.length,
      totalShoppingResults: totalResults,
      _log: `queries:${queries.length} results:${totalResults} advertisers:${advertisers.length} client:${clientFound}`,
    } as GoogleShoppingResult;
  } catch (err: any) {
    return { error: `Google Shopping check failed: ${err.message}` };
  } finally {
    clearTimeout(timer);
  }
}
