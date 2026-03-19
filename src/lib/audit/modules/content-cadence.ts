import type { ContentCadenceResult } from '../types';

const BLOG_PATH_RE = /\/(blog|noticias|post|posts|articulos|actualidad)\//i;

async function fetchSitemapXml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const text = await res.text();
    // Minimum sanity check: must look like XML with <url> or <sitemap> tags
    if (!text.includes('<url>') && !text.includes('<sitemap>')) return null;
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseBlogDates(xml: string, requireBlogPath: boolean): Date[] {
  const dates: Date[] = [];
  const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/gi) || [];
  for (const block of urlBlocks) {
    const locMatch = block.match(/<loc>([\s\S]*?)<\/loc>/i);
    const lastmodMatch = block.match(/<lastmod>([\s\S]*?)<\/lastmod>/i);
    if (!locMatch || !lastmodMatch) continue;
    const loc = locMatch[1].trim();
    if (requireBlogPath && !BLOG_PATH_RE.test(loc)) continue;
    const d = new Date(lastmodMatch[1].trim());
    if (!isNaN(d.getTime())) dates.push(d);
  }
  return dates;
}

export async function runContentCadence(url: string): Promise<ContentCadenceResult> {
  try {
    const origin = new URL(url.startsWith('http') ? url : `https://${url}`).origin;

    const candidates = [
      { url: `${origin}/blog/sitemap.xml`,  requireBlogPath: false },
      { url: `${origin}/sitemap-blog.xml`,  requireBlogPath: false },
      { url: `${origin}/sitemap_blog.xml`,  requireBlogPath: false },
      { url: `${origin}/sitemap.xml`,       requireBlogPath: true  },
    ];

    let dates: Date[] = [];
    for (const candidate of candidates) {
      const xml = await fetchSitemapXml(candidate.url);
      if (!xml) continue;
      const parsed = parseBlogDates(xml, candidate.requireBlogPath);
      if (parsed.length >= 1) {
        dates = parsed;
        break;
      }
    }

    if (dates.length < 3) {
      return { skipped: true, reason: 'No sitemap de blog con ≥3 entradas encontrado' };
    }

    // Sort descending (newest first)
    dates.sort((a, b) => b.getTime() - a.getTime());

    const now = new Date();
    const lastPostDate = dates[0];
    const daysSinceLastPost = Math.floor(
      (now.getTime() - lastPostDate.getTime()) / 86_400_000,
    );

    // Average interval between consecutive posts
    let totalInterval = 0;
    for (let i = 0; i < dates.length - 1; i++) {
      totalInterval += (dates[i].getTime() - dates[i + 1].getTime()) / 86_400_000;
    }
    const avgDaysBetweenPosts = Math.round(totalInterval / (dates.length - 1));

    // Posts in last 90 days
    const cutoff90 = new Date(now.getTime() - 90 * 86_400_000);
    const postsLast90Days = dates.filter((d) => d >= cutoff90).length;

    let cadenceLevel: 'active' | 'irregular' | 'inactive';
    if (avgDaysBetweenPosts <= 14) {
      cadenceLevel = 'active';
    } else if (avgDaysBetweenPosts <= 60 && daysSinceLastPost <= 90) {
      cadenceLevel = 'irregular';
    } else {
      cadenceLevel = 'inactive';
    }

    return {
      totalPosts: dates.length,
      lastPostDate: lastPostDate.toISOString().split('T')[0],
      daysSinceLastPost,
      avgDaysBetweenPosts,
      postsLast90Days,
      cadenceLevel,
    };
  } catch {
    return { skipped: true, reason: 'Error al analizar sitemap de contenido' };
  }
}
