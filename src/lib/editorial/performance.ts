/**
 * Editorial AI — performance ingestion (Loop 4 of P7-S6).
 *
 * For each published article of a client, fetch weekly metrics from the
 * relevant source and upsert `article_performance` rows:
 *
 *   - Blog organic (GA4, filtered by page_path)
 *   - Blog social  (GA4, filtered by utm_content = tracking_id)
 *   - LinkedIn     (Apify post metrics by post URL)
 *   - Newsletter   (Resend open/click metrics by article tag)
 *
 * Then aggregates into articles.performance_summary for fast dashboard reads.
 *
 * Called from run-radar.ts after analytics ingestion. Non-fatal on failure —
 * missing metrics just leave rows empty, they'll be re-attempted next week.
 */

import axios from 'axios';
import { getSupabase } from '../db';
import { getIntegration, getValidAccessToken } from '../integrations';
import {
  listArticles, upsertArticlePerformance, updateArticle,
} from './db';
import type { Article, PerformanceSource, PerformanceSummary } from './types';

const APIFY_TOKEN = import.meta.env?.APIFY_TOKEN || process.env.APIFY_TOKEN;
const RESEND_API_KEY = import.meta.env?.RESEND_API_KEY || process.env.RESEND_API_KEY;

// ─── Helpers ────────────────────────────────────────────────────────────

/** Last Monday (UTC) as YYYY-MM-DD. Weekly rollup key. */
function weekOfMonday(d: Date = new Date()): string {
  const day = d.getUTCDay();
  const diff = (day === 0 ? 6 : day - 1);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
  return monday.toISOString().slice(0, 10);
}

function pathFromUrl(u: string | undefined | null): string | null {
  if (!u) return null;
  try { return new URL(u).pathname; } catch { return null; }
}

// ─── GA4 — blog organic + social ────────────────────────────────────────

async function ga4Report(
  propertyId: string,
  accessToken: string,
  body: any,
): Promise<any | null> {
  try {
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function ga4Metric(row: any, idx: number): number {
  return parseFloat(row?.metricValues?.[idx]?.value ?? '0');
}

/**
 * Fetch blog organic metrics (filtered by page_path) AND blog social metrics
 * (filtered by utm_content = tracking_id) for a single article over the last
 * 7 days. Returns one row per source populated or null if GA4 not connected.
 */
async function fetchGA4PerformanceForArticle(
  propertyId: string,
  accessToken: string,
  article: Article,
): Promise<{ organic?: Partial<any>; social?: Partial<any> }> {
  const path = pathFromUrl(article.published_url);
  const trackingId = article.tracking_id;
  const out: { organic?: any; social?: any } = {};

  if (path) {
    const organicReport = await ga4Report(propertyId, accessToken, {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'sessions' }, { name: 'totalUsers' },
        { name: 'bounceRate' }, { name: 'averageSessionDuration' },
        { name: 'conversions' },
      ],
      dimensionFilter: {
        filter: { fieldName: 'pagePath', stringFilter: { value: path, matchType: 'EXACT' } },
      },
    });
    const row = organicReport?.rows?.[0];
    if (row) {
      const sessions = Math.round(ga4Metric(row, 0));
      out.organic = {
        sessions,
        users: Math.round(ga4Metric(row, 1)),
        bounce_rate: +(ga4Metric(row, 2) * 100).toFixed(2),
        avg_session_duration: Math.round(ga4Metric(row, 3)),
        conversions: Math.round(ga4Metric(row, 4)),
        conversion_rate: sessions > 0 ? +((ga4Metric(row, 4) / sessions) * 100).toFixed(2) : 0,
      };
    }
  }

  if (trackingId) {
    const socialReport = await ga4Report(propertyId, accessToken, {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionManualAdContent' }],
      metrics: [
        { name: 'sessions' }, { name: 'totalUsers' },
        { name: 'bounceRate' }, { name: 'conversions' },
      ],
      dimensionFilter: {
        filter: { fieldName: 'sessionManualAdContent', stringFilter: { value: trackingId, matchType: 'EXACT' } },
      },
    });
    const row = socialReport?.rows?.[0];
    if (row) {
      const sessions = Math.round(ga4Metric(row, 0));
      out.social = {
        sessions,
        users: Math.round(ga4Metric(row, 1)),
        bounce_rate: +(ga4Metric(row, 2) * 100).toFixed(2),
        conversions: Math.round(ga4Metric(row, 3)),
        conversion_rate: sessions > 0 ? +((ga4Metric(row, 3) / sessions) * 100).toFixed(2) : 0,
      };
    }
  }

  return out;
}

// ─── LinkedIn (Apify) ───────────────────────────────────────────────────

/**
 * Query Apify for engagement metrics on a single LinkedIn post URL.
 * Uses the harvestapi/linkedin-post-search-scraper actor to fetch metrics.
 * Non-fatal: returns empty object if post unreachable or Apify fails.
 */
async function fetchLinkedInPerformanceForUrl(postUrl: string): Promise<{
  impressions?: number; likes?: number; comments?: number; shares?: number; engagement_rate?: number;
}> {
  if (!APIFY_TOKEN) return {};
  try {
    // Actor supports array of URLs; we send one at a time for simplicity
    const res = await axios.post(
      `https://api.apify.com/v2/acts/harvestapi~linkedin-post-search-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      { urls: [postUrl] },
      { timeout: 60_000, validateStatus: s => s < 500 },
    );
    const items = Array.isArray(res.data) ? res.data : [];
    const post = items[0];
    if (!post) return {};
    const likes = post.numLikes ?? post.totalReactionsCount ?? 0;
    const comments = post.numComments ?? post.commentsCount ?? 0;
    const shares = post.numShares ?? post.totalShares ?? 0;
    const impressions = post.numImpressions ?? post.impressionsCount ?? 0;
    const engagement = impressions > 0 ? ((likes + comments + shares) / impressions) * 100 : 0;
    return {
      impressions, likes, comments, shares,
      engagement_rate: +engagement.toFixed(2),
    };
  } catch { return {}; }
}

// ─── Resend (newsletter) ────────────────────────────────────────────────

/**
 * Query Resend for opens/clicks by tag (we tag newsletter sends with
 * article_id so this works). Non-fatal on failure.
 */
async function fetchNewsletterPerformanceForArticle(articleId: string): Promise<{
  opens?: number; clicks?: number;
}> {
  if (!RESEND_API_KEY) return {};
  try {
    // Resend's public API does not yet expose a clean per-tag aggregated
    // metrics endpoint. We keep the function as a placeholder and return
    // zeros when nothing is configured. Implementation left as a future
    // extension once we integrate the Resend webhook pipeline.
    return {};
  } catch { return {}; }
}

// ─── Summary aggregation ────────────────────────────────────────────────

async function aggregatePerformance(articleId: string): Promise<PerformanceSummary | null> {
  const sb = getSupabase();
  const { data: rows } = await sb
    .from('article_performance').select('*').eq('article_id', articleId);
  if (!rows || rows.length === 0) return null;

  let total_sessions = 0, total_users = 0, total_conversions = 0, total_engagement = 0;
  let weeks = new Set<string>();
  let primary: { source: PerformanceSource; sessions: number } = { source: 'other', sessions: 0 };

  for (const r of rows as any[]) {
    weeks.add(r.week_of);
    const sessions = r.sessions ?? 0;
    total_sessions += sessions;
    total_users += r.users ?? 0;
    total_conversions += r.conversions ?? 0;
    total_engagement += (r.likes ?? 0) + (r.comments ?? 0) + (r.shares ?? 0) + (r.clicks ?? 0);
    if (sessions > primary.sessions) primary = { source: r.source, sessions };
  }

  // Trend: compare last 4 weeks avg vs 4-8 weeks avg (simple heuristic)
  const sorted = [...(rows as any[])].sort((a, b) => a.week_of.localeCompare(b.week_of));
  const recentSum = sorted.slice(-4).reduce((s, r) => s + (r.sessions ?? 0), 0);
  const priorSum = sorted.slice(-8, -4).reduce((s, r) => s + (r.sessions ?? 0), 0);
  const trend: 'growing' | 'stable' | 'declining' =
    priorSum === 0 && recentSum > 0 ? 'growing' :
    recentSum > priorSum * 1.2       ? 'growing' :
    recentSum < priorSum * 0.8       ? 'declining' : 'stable';

  // Composite ROI 0-100: sessions normalized to log scale + conversion bonus
  const sessionsScore = total_sessions > 0 ? Math.min(100, Math.log10(total_sessions + 1) * 25) : 0;
  const conversionBonus = total_conversions > 0 ? Math.min(20, total_conversions * 2) : 0;
  const engagementBonus = total_engagement > 0 ? Math.min(10, Math.log10(total_engagement + 1) * 5) : 0;
  const roi_score = Math.round(Math.min(100, sessionsScore + conversionBonus + engagementBonus));

  return {
    total_sessions,
    total_users,
    total_engagement,
    total_conversions,
    primary_channel: primary.source,
    roi_score,
    trend,
    weeks_measured: weeks.size,
  };
}

// ─── Public: weekly performance ingestion per client ────────────────────

export async function ingestEditorialPerformance(clientId: string): Promise<{
  articles_processed: number;
  rows_upserted: number;
  errors: number;
}> {
  let articles_processed = 0, rows_upserted = 0, errors = 0;

  // Fetch articles published in the last 12 weeks (3 months)
  const published = await listArticles(clientId, {
    status: ['published', 'approved_salvaged'],
    limit: 100,
  });
  if (published.length === 0) return { articles_processed: 0, rows_upserted: 0, errors: 0 };

  const week_of = weekOfMonday();

  // Resolve GA4 once per client
  let ga4Property: string | null = null;
  let ga4Token: string | null = null;
  try {
    const integ = await getIntegration(clientId, 'google_analytics');
    if (integ && integ.status === 'connected' && integ.property_id) {
      ga4Token = await getValidAccessToken(integ);
      ga4Property = integ.property_id;
    }
  } catch { /* non-fatal */ }

  for (const article of published) {
    articles_processed++;
    try {
      // ── GA4 blog organic + social (if GA4 connected + article has URL) ──
      if (ga4Property && ga4Token) {
        const ga4 = await fetchGA4PerformanceForArticle(ga4Property, ga4Token, article);
        if (ga4.organic) {
          await upsertArticlePerformance({
            article_id: article.id, week_of, source: 'blog_organic' as PerformanceSource,
            ...ga4.organic,
          });
          rows_upserted++;
        }
        if (ga4.social) {
          await upsertArticlePerformance({
            article_id: article.id, week_of, source: 'blog_social' as PerformanceSource,
            ...ga4.social,
          });
          rows_upserted++;
        }
      }

      // ── LinkedIn post metrics (if we stored a LinkedIn URL) ──
      const liEntry = (article.published_urls ?? []).find(p => p.platform === 'linkedin');
      if (liEntry?.url) {
        const li = await fetchLinkedInPerformanceForUrl(liEntry.url);
        if (Object.keys(li).length > 0) {
          await upsertArticlePerformance({
            article_id: article.id, week_of, source: 'linkedin' as PerformanceSource,
            ...li,
          });
          rows_upserted++;
        }
      }

      // ── Newsletter (placeholder, implementation deferred) ──
      const nlEntry = (article.published_urls ?? []).find(p => p.platform === 'newsletter');
      if (nlEntry) {
        const nl = await fetchNewsletterPerformanceForArticle(article.id);
        if (Object.keys(nl).length > 0) {
          await upsertArticlePerformance({
            article_id: article.id, week_of, source: 'newsletter' as PerformanceSource,
            ...nl,
          });
          rows_upserted++;
        }
      }

      // Recompute aggregated summary and stash on the article itself
      const summary = await aggregatePerformance(article.id);
      if (summary) {
        await updateArticle(article.id, { performance_summary: summary });
      }
    } catch (err) {
      errors++;
      console.error(`[editorial-performance] Article ${article.id} failed:`, (err as Error).message);
    }
  }

  return { articles_processed, rows_upserted, errors };
}

// ─── Public: build context for Growth Agent ─────────────────────────────

export interface EditorialPerformanceContext {
  winners: Array<{ topic: string; sessions: number; conversions: number; type: string }>;
  losers: Array<{ topic: string; sessions: number; type: string }>;
}

/**
 * Summarize winners + losers for the Growth Agent. Winner threshold: roi_score
 * ≥ 60. Loser threshold: roi_score < 25 AND weeks_measured ≥ 2 (so we don't
 * label a brand-new article as a loser).
 */
export async function getEditorialPerformanceContext(
  clientId: string,
  limit: number = 6,
): Promise<EditorialPerformanceContext> {
  const published = await listArticles(clientId, {
    status: ['published', 'approved_salvaged'],
    limit: 50,
  });

  const winners: EditorialPerformanceContext['winners'] = [];
  const losers: EditorialPerformanceContext['losers'] = [];

  for (const a of published) {
    const s = a.performance_summary;
    if (!s) continue;
    const profileType = a.profile_id.slice(0, 8);  // compact label; UI-side we'll resolve
    if (s.roi_score >= 60) {
      winners.push({
        topic: a.topic,
        sessions: s.total_sessions,
        conversions: s.total_conversions,
        type: profileType,
      });
    } else if (s.roi_score < 25 && s.weeks_measured >= 2) {
      losers.push({ topic: a.topic, sessions: s.total_sessions, type: profileType });
    }
  }

  winners.sort((a, b) => (b.sessions + b.conversions * 50) - (a.sessions + a.conversions * 50));
  losers.sort((a, b) => a.sessions - b.sessions);

  return {
    winners: winners.slice(0, limit),
    losers: losers.slice(0, limit),
  };
}
