import axios from 'axios';
import * as cheerio from 'cheerio';
import type { InstagramResult, InstagramCompetitor, CrawlResult } from '../types';

// Instagram internal web API — no auth required for public profiles
const IG_HEADERS = {
  'x-ig-app-id': '936619743392459',
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram/303.0.0.11.118',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'X-Requested-With': 'XMLHttpRequest',
  Referer: 'https://www.instagram.com/',
};

export async function runInstagram(
  crawlData: CrawlResult,
  competitorUrls: string[] = [],
  userHandle?: string,
): Promise<InstagramResult> {
  const handle = userHandle || crawlData.instagramHandle;

  if (!handle) {
    return { found: false, reason: 'No Instagram account link found on the website' };
  }

  const profileData = await fetchProfile(handle);

  // Try to find Instagram for up to 3 competitors
  const competitorResults: InstagramCompetitor[] = [];
  if (competitorUrls.length > 0) {
    const competitorHandles = await Promise.all(
      competitorUrls.slice(0, 3).map(extractHandleFromSite),
    );
    for (const ch of competitorHandles) {
      if (!ch) continue;
      const cp = await fetchProfile(ch);
      if (cp.found) {
        competitorResults.push({
          handle: ch,
          followers: cp.followers,
          posts: cp.posts,
          engagementRate: cp.engagementRate,
          url: `https://www.instagram.com/${ch}/`,
        });
      }
    }
  }

  return {
    ...profileData,
    ...(competitorResults.length > 0 && { competitors: competitorResults }),
  };
}

async function fetchProfile(handle: string): Promise<InstagramResult> {
  try {
    const res = await axios.get(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`,
      { headers: IG_HEADERS, timeout: 10000 },
    );

    const user = res.data?.data?.user;
    if (!user) throw new Error('empty user');

    const recentPosts: any[] =
      user.edge_owner_to_timeline_media?.edges?.slice(0, 12) || [];
    const followers = user.edge_followed_by?.count ?? 0;

    let avgLikes: number | undefined;
    let avgComments: number | undefined;
    let engagementRate: number | undefined;

    if (recentPosts.length > 0 && followers > 0) {
      const totalLikes = recentPosts.reduce(
        (s: number, p: any) => s + (p.node?.edge_liked_by?.count ?? 0),
        0,
      );
      const totalComments = recentPosts.reduce(
        (s: number, p: any) => s + (p.node?.edge_media_to_comment?.count ?? 0),
        0,
      );
      avgLikes = Math.round(totalLikes / recentPosts.length);
      avgComments = Math.round(totalComments / recentPosts.length);
      engagementRate =
        Math.round(((avgLikes + avgComments) / followers) * 10000) / 100; // %
    }

    return {
      found: true,
      handle,
      url: `https://www.instagram.com/${handle}/`,
      followers,
      following: user.edge_follow?.count,
      posts: user.edge_owner_to_timeline_media?.count,
      bio: user.biography?.slice(0, 200),
      isVerified: user.is_verified,
      isBusinessAccount: user.is_business_account,
      businessCategory: user.business_category_name || undefined,
      ...(avgLikes !== undefined && { avgLikes }),
      ...(avgComments !== undefined && { avgComments }),
      ...(engagementRate !== undefined && { engagementRate }),
    };
  } catch {
    // Internal API blocked — try scraping the profile page HTML as fallback
    return await fetchProfileFallback(handle);
  }
}

async function fetchProfileFallback(handle: string): Promise<InstagramResult> {
  try {
    const res = await axios.get(`https://www.instagram.com/${handle}/`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        Accept: 'text/html',
      },
      timeout: 8000,
    });

    const $ = cheerio.load(res.data as string);

    // Instagram embeds some data in meta tags even without JS
    const description = $('meta[name="description"]').attr('content') || '';
    // Format: "X Followers, X Following, X Posts - ..."
    const followersMatch = description.match(/([\d,.KkMm]+)\s*Followers/i);
    const postsMatch = description.match(/([\d,.KkMm]+)\s*Posts/i);

    const followers = followersMatch ? parseCount(followersMatch[1]) : undefined;
    const posts = postsMatch ? parseCount(postsMatch[1]) : undefined;

    return {
      found: true,
      handle,
      url: `https://www.instagram.com/${handle}/`,
      ...(followers !== undefined && { followers }),
      ...(posts !== undefined && { posts }),
      reason: 'Limited data — Instagram restricted full API access',
    };
  } catch {
    return {
      found: true,
      handle,
      url: `https://www.instagram.com/${handle}/`,
      reason: 'Profile detected but data access blocked by Instagram',
    };
  }
}

async function extractHandleFromSite(siteUrl: string): Promise<string | null> {
  try {
    const normalized = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
    const res = await axios.get(normalized, {
      timeout: 6000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIONAuditBot/1.0)' },
      validateStatus: (s) => s < 500,
    });
    const $ = cheerio.load(res.data as string);
    const links = $('a[href*="instagram.com"]')
      .map((_, el) => $(el).attr('href') || '')
      .get();
    for (const link of links) {
      const match = link.match(/instagram\.com\/([A-Za-z0-9_.]+)/);
      if (
        match?.[1] &&
        !['explore', 'reels', 'stories', 'p', 'tv', 'share'].includes(match[1])
      ) {
        return match[1];
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function parseCount(raw: string): number | undefined {
  const s = raw.replace(/,/g, '').toUpperCase();
  if (s.endsWith('M')) return Math.round(parseFloat(s) * 1_000_000);
  if (s.endsWith('K')) return Math.round(parseFloat(s) * 1_000);
  const n = parseInt(s, 10);
  return isNaN(n) ? undefined : n;
}
