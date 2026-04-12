/**
 * KPI extraction — writes structured time-series data from a snapshot's
 * pipeline_output into the kpi_series table and materialized snapshot columns.
 *
 * Called once per snapshot creation (createSnapshotFromAudit or Radar run).
 * Each call produces ~20 INSERTs into kpi_series + 1 UPDATE on snapshots.
 *
 * The kpi_series table has a unique index on (client_id, date, kpi_key)
 * so re-runs for the same date are safe (upsert pattern).
 */

import { getSupabase } from '../db';

interface KpiEntry {
  kpi_key: string;
  value: number | null;
  source: 'dfs' | 'gsc' | 'ga4' | 'pipeline' | 'score' | 'geo' | 'ps';
}

/**
 * Extract ~20 KPIs from pipeline_output as flat numeric values.
 */
export function extractKpis(r: Record<string, any>): KpiEntry[] {
  const seo = r.seo || {};
  const geo = r.geo || {};
  const ps = r.pagespeed || {};
  const conv = r.conversion || {};
  const rep = r.reputation || {};
  const cc = r.content_cadence || {};
  const score = r.score || {};
  const breakdown = score.breakdown || {};
  const gsc = r.analytics?.gsc;
  const ga4 = r.analytics?.ga4;

  const entries: KpiEntry[] = [
    // Score breakdown (always available after pipeline)
    { kpi_key: 'score.total', value: score.total ?? null, source: 'score' },
    { kpi_key: 'score.seo', value: breakdown.seo ?? null, source: 'score' },
    { kpi_key: 'score.geo', value: breakdown.geo ?? null, source: 'score' },
    { kpi_key: 'score.web', value: breakdown.web ?? null, source: 'score' },
    { kpi_key: 'score.conversion', value: breakdown.conversion ?? null, source: 'score' },
    { kpi_key: 'score.reputation', value: breakdown.reputation ?? null, source: 'score' },

    // SEO (DataForSEO)
    { kpi_key: 'seo.keywordsTop3', value: seo.keywordsTop3 ?? null, source: 'dfs' },
    { kpi_key: 'seo.keywordsTop10', value: seo.keywordsTop10 ?? null, source: 'dfs' },
    { kpi_key: 'seo.keywordsTop30', value: seo.keywordsTop30 ?? null, source: 'dfs' },
    { kpi_key: 'seo.organicTrafficEstimate', value: seo.organicTrafficEstimate ?? null, source: 'dfs' },
    { kpi_key: 'seo.indexedPages', value: seo.indexedPages ?? null, source: 'dfs' },
    { kpi_key: 'seo.brandTrafficPct', value: seo.brandTrafficPct ?? null, source: 'dfs' },

    // GEO (AI visibility)
    { kpi_key: 'geo.mentionRate', value: geo.mentionRate ?? null, source: 'geo' },
    { kpi_key: 'geo.brandScore', value: geo.brandScore ?? null, source: 'geo' },

    // Web performance (PageSpeed)
    { kpi_key: 'web.mobile', value: ps.mobile?.performance ?? null, source: 'ps' },
    { kpi_key: 'web.desktop', value: ps.desktop?.performance ?? null, source: 'ps' },
    { kpi_key: 'web.lcp', value: ps.mobile?.lcp ?? null, source: 'ps' },

    // Conversion
    { kpi_key: 'conversion.funnelScore', value: conv.funnelScore ?? null, source: 'pipeline' },

    // Content cadence
    { kpi_key: 'content.postsLast90Days', value: cc.postsLast90Days ?? null, source: 'pipeline' },

    // Reputation
    { kpi_key: 'reputation.rating', value: rep.combinedRating ?? rep.gbpRating ?? null, source: 'pipeline' },
    { kpi_key: 'reputation.totalReviews', value: rep.totalReviews ?? null, source: 'pipeline' },
  ];

  // GSC real data (if connected)
  if (gsc) {
    entries.push(
      { kpi_key: 'gsc.totalClicks', value: gsc.totalClicks ?? null, source: 'gsc' },
      { kpi_key: 'gsc.totalImpressions', value: gsc.totalImpressions ?? null, source: 'gsc' },
      { kpi_key: 'gsc.avgCtr', value: gsc.avgCtr ?? null, source: 'gsc' },
      { kpi_key: 'gsc.avgPosition', value: gsc.avgPosition ?? null, source: 'gsc' },
    );
  }

  // GA4 real data (if connected)
  if (ga4) {
    entries.push(
      { kpi_key: 'ga4.sessions', value: ga4.sessions ?? null, source: 'ga4' },
      { kpi_key: 'ga4.users', value: ga4.users ?? null, source: 'ga4' },
      { kpi_key: 'ga4.conversions', value: ga4.conversions ?? null, source: 'ga4' },
      { kpi_key: 'ga4.bounceRate', value: ga4.bounceRate ?? null, source: 'ga4' },
    );
    // Organic sessions (computed from trafficSources)
    const orgSessions = (ga4.trafficSources || [])
      .filter((t: any) => (t.medium || '').toLowerCase() === 'organic')
      .reduce((sum: number, t: any) => sum + (t.sessions || 0), 0);
    if (orgSessions > 0) {
      entries.push({ kpi_key: 'ga4.organicSessions', value: orgSessions, source: 'ga4' });
    }
  }

  // Filter out nulls — only store KPIs that have real values
  return entries.filter(e => e.value != null);
}

/**
 * Write extracted KPIs to the kpi_series table.
 * Uses ON CONFLICT (upsert) so re-runs are safe.
 */
export async function writeKpiSeries(
  clientId: string,
  snapshotId: string,
  date: string,
  pipelineOutput: Record<string, any>,
): Promise<number> {
  const entries = extractKpis(pipelineOutput);
  if (entries.length === 0) return 0;

  const sb = getSupabase();
  const rows = entries.map(e => ({
    client_id: clientId,
    snapshot_id: snapshotId,
    date,
    kpi_key: e.kpi_key,
    value: e.value,
    source: e.source,
  }));

  const { error } = await sb
    .from('kpi_series')
    .upsert(rows, { onConflict: 'client_id,date,kpi_key' });

  if (error) {
    console.error('[kpi-series] Write failed:', error.message);
    return 0;
  }

  console.log(`[kpi-series] Wrote ${rows.length} KPIs for ${clientId} on ${date}`);
  return rows.length;
}

/**
 * Update materialized columns on the snapshot row itself.
 * These enable fast SQL queries without JSONB deserialization.
 */
export async function materializeSnapshotColumns(
  snapshotId: string,
  pipelineOutput: Record<string, any>,
): Promise<void> {
  const score = pipelineOutput.score || {};
  const breakdown = score.breakdown || {};
  const seo = pipelineOutput.seo || {};
  const geo = pipelineOutput.geo || {};
  const ps = pipelineOutput.pagespeed || {};

  const sb = getSupabase();
  const { error } = await sb
    .from('snapshots')
    .update({
      score_total: score.total ?? null,
      score_seo: breakdown.seo ?? null,
      score_geo: breakdown.geo ?? null,
      score_web: breakdown.web ?? null,
      score_conversion: breakdown.conversion ?? null,
      score_reputation: breakdown.reputation ?? null,
      keywords_top10: seo.keywordsTop10 ?? null,
      organic_traffic: seo.organicTrafficEstimate ?? null,
      mention_rate: geo.mentionRate ?? null,
      pagespeed_mobile: ps.mobile?.performance ?? null,
      has_growth_analysis: !!pipelineOutput.growth_analysis && pipelineOutput.growth_analysis.model !== 'fallback',
    })
    .eq('id', snapshotId);

  if (error) {
    console.error('[snapshot-materialize] Update failed:', error.message);
  }
}
