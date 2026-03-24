import type { CompetitorTrafficResult } from '../types';

const DFS_LOGIN = import.meta.env.DATAFORSEO_LOGIN || process.env.DATAFORSEO_LOGIN;
const DFS_PASSWORD = import.meta.env.DATAFORSEO_PASSWORD || process.env.DATAFORSEO_PASSWORD;

function parseDFSItem(name: string, domain: string, url: string, task: any) {
  if (!task) {
    console.error(`[competitor-traffic] ${domain}: no task returned`);
    return { name, domain, url, apiError: 'no_task' };
  }
  if (task.status_code !== 20000) {
    console.error(`[competitor-traffic] ${domain}: status ${task.status_code} — ${task.status_message}`);
    return { name, domain, url, apiError: `${task.status_code}: ${task.status_message}` };
  }
  if (!task.result_count) {
    console.error(`[competitor-traffic] ${domain}: result_count=0`);
    return { name, domain, url, apiError: 'no_data' };
  }
  const labsItem = task.result[0]?.items?.[0];
  if (!labsItem) {
    console.error(`[competitor-traffic] ${domain}: items empty`);
    return { name, domain, url, apiError: 'empty_items' };
  }
  const m = labsItem.metrics?.organic;
  const mp = labsItem.metrics?.paid;
  const kw10 = m ? (m.pos_1 ?? 0) + (m.pos_2_3 ?? 0) + (m.pos_4_10 ?? 0) : undefined;
  console.log(`[competitor-traffic] ${domain}: etv=${m?.etv ?? 'n/a'} kw10=${kw10 ?? 'n/a'}`);
  return {
    name, domain, url,
    organicTrafficEstimate: m?.etv != null ? Math.round(m.etv) : undefined,
    estimatedAdsCost: m?.estimated_paid_traffic_cost != null ? Math.round(m.estimated_paid_traffic_cost) : undefined,
    keywordsTop10: kw10 || undefined,
    paidKeywordsTotal: (mp?.count ?? 0) || undefined,
    paidTrafficEstimate: mp?.etv != null ? Math.round(mp.etv) : undefined,
    paidTrafficValue: mp?.estimated_paid_traffic_cost != null ? Math.round(mp.estimated_paid_traffic_cost) : undefined,
  };
}

/** Fetch all domains in a single batched request — one HTTP call instead of N sequential */
async function fetchBatch(
  auth: string,
  items: Array<{ name: string; domain: string; url: string }>,
  locationCode?: number,
): Promise<any[] | null> {
  const body = items.map((item) => {
    const obj: any = { target: item.domain };
    if (locationCode) {
      obj.location_code = locationCode;
      obj.language_code = 'es';
    }
    return obj;
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);
  try {
    const res = await fetch(
      'https://api.dataforseo.com/v3/dataforseo_labs/google/domain_rank_overview/live',
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data?.tasks ?? null; // one task per item in the batch
  } catch (err: any) {
    console.error(`[competitor-traffic] batch request failed: ${err.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function runCompetitorTraffic(
  competitors: Array<{ name: string; url: string }>,
): Promise<CompetitorTrafficResult> {
  if (!DFS_LOGIN || !DFS_PASSWORD) {
    return { skipped: true, reason: 'DATAFORSEO credentials not configured' };
  }

  const filtered = competitors.slice(0, 5);
  if (!filtered.length) return { items: [] };

  const items = filtered.map((c) => {
    let domain = c.url;
    try {
      domain = new URL(c.url.startsWith('http') ? c.url : `https://${c.url}`)
        .hostname.replace(/^www\./, '');
    } catch {}
    return { name: c.name, url: c.url, domain };
  });

  const auth = Buffer.from(`${DFS_LOGIN}:${DFS_PASSWORD}`).toString('base64');

  // Single batched request for Spain — replaces 5 sequential requests with 1.5s delays
  console.log(`[competitor-traffic] Batch fetching ${items.length} domains (Spain)...`);
  let tasks = await fetchBatch(auth, items, 2724);

  // If batch failed entirely, retry without location (global)
  if (!tasks) {
    console.log(`[competitor-traffic] Retrying batch (global)...`);
    tasks = await fetchBatch(auth, items);
  }

  const result = items.map((item, i) => {
    const task = tasks?.[i] ?? null;
    const parsed = parseDFSItem(item.name, item.domain, item.url, task);

    // If Spain returned no data for this specific domain, that's ok — global fallback not needed
    // since we already have global as the batch fallback above
    return parsed;
  });

  return { items: result };
}
