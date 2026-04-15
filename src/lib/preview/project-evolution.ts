/**
 * Build a plausible 8-week evolution projection from a client's CURRENT
 * snapshot + resolved benchmark profile. Week 0 is always the real data
 * (this client, today). Weeks 1-7 are a deterministic curve that closes
 * part of the gap toward the sector ceiling — conservative, never
 * optimistic, never promising something the pipeline can't realistically
 * deliver.
 *
 * Deterministic by design: same client + same profile always produces
 * the same preview across reloads. Seeded pseudo-random noise adds the
 * week-to-week wobble real data has, without changing the trend.
 *
 * This is a UI-only helper — no LLM calls, no cost. Only used when the
 * client has a single snapshot and the Evolución page would otherwise
 * render an empty state.
 */

import type { BenchmarkProfile } from '../benchmarks/types';

export interface ProjectedWeek {
  week: number;                 // 0..N
  date: string;                 // ISO date of that week's Monday
  score: number;                // 0-100
  breakdown: Record<string, number>; // per-pillar score
}

type PillarKey = 'seo' | 'geo' | 'web' | 'conversion' | 'content' | 'reputation';

/**
 * How much of the gap between current value and sector ceiling a pillar
 * can realistically close in 8 weeks of steady work, ordered by how fast
 * the pillar moves:
 *   - Web: page-speed fixes land immediately → 60% of the gap.
 *   - Content: publishing cadence compounds fast → 55%.
 *   - Conversion: A/B tests on landing + CTA changes → 50%.
 *   - Reputation: reviews + press build slower → 45%.
 *   - SEO: Google indexing + ranking takes weeks → 35%.
 *   - GEO: LLM training data lags behind production → 25%.
 */
const PILLAR_SPEED: Record<PillarKey, number> = {
  web: 0.60,
  content: 0.55,
  conversion: 0.50,
  reputation: 0.45,
  seo: 0.35,
  geo: 0.25,
};

/**
 * A plausible "where you could reasonably aim" score per pillar for a
 * given profile. Not the perfect-100 ceiling — that's unreachable in 8
 * weeks. Approximates "sector median-ish" which is what the pipeline
 * would actually measure for a well-executed mid-sized player.
 */
function reasonableTarget(profile: BenchmarkProfile, pillar: PillarKey): number {
  // Derived from the profile's pillar weight: pillars the profile weighs
  // heavily are expected to reach higher (the client cares → the client
  // invests). E.g. a freelance weights reputation 0.40 → target 80 there;
  // weights SEO 0.20 → target 55.
  const weight = profile.weights[pillar] ?? 0.15;
  return Math.round(40 + weight * 100); // weight 0.10 → 50, 0.40 → 80, 0.25 → 65
}

/**
 * Cheap deterministic PRNG seeded from a string (client id). mulberry32.
 */
function seededRandom(seed: string): () => number {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mondayOf(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

export interface ProjectEvolutionArgs {
  clientId: string;                              // used as PRNG seed
  profile: BenchmarkProfile;
  currentBreakdown: Record<string, number>;     // real score per pillar today
  currentTotal: number;                          // real global score today
  currentDate: string;                           // ISO date of the real snapshot (week 0)
  weeksAhead?: number;                           // default 7 (so total length = 8)
}

export function projectEvolution(args: ProjectEvolutionArgs): ProjectedWeek[] {
  const weeksAhead = args.weeksAhead ?? 7;
  const rand = seededRandom(args.clientId);
  const monday0 = mondayOf(new Date(args.currentDate));

  const pillars: PillarKey[] = ['seo', 'geo', 'web', 'conversion', 'content', 'reputation'];
  // Precompute per-pillar target and curve parameters
  const plan: Record<PillarKey, { current: number; target: number }> = {} as any;
  for (const p of pillars) {
    const current = Math.round(args.currentBreakdown[p] ?? 0);
    const ceiling = reasonableTarget(args.profile, p);
    const speed = PILLAR_SPEED[p];
    // If the client is already above the "reasonable" target (mature on that
    // pillar), project modest continued improvement — never downward. Floor
    // the implicit ceiling at current + 5 so every pillar grows a bit.
    const effectiveCeiling = Math.max(ceiling, current + 5);
    const gap = effectiveCeiling - current;
    const target = current + Math.round(gap * speed);
    plan[p] = { current, target };
  }

  const weeks: ProjectedWeek[] = [];
  for (let w = 0; w <= weeksAhead; w++) {
    const date = new Date(monday0);
    date.setDate(monday0.getDate() + w * 7);

    const breakdown: Record<string, number> = {};
    for (const p of pillars) {
      const { current, target } = plan[p];
      // Pillars that are zero today stay zero in the projection. Projecting
      // "you'll have 14 GEO mentions in 6 weeks from nothing" would be both
      // dishonest and mathematically dilute the weighted total — the same
      // set of active pillars must hold across weeks or the avg jumps.
      if (current === 0) {
        breakdown[p] = 0;
        continue;
      }
      if (w === 0) {
        breakdown[p] = current;
      } else {
        // Ease-out curve: early weeks move more than late ones.
        const progress = w / weeksAhead;
        const eased = Math.pow(progress, 0.65);
        const ideal = current + (target - current) * eased;
        // Small ±1.5pt wobble so the line isn't artificially smooth.
        const wobble = (rand() - 0.5) * 3;
        const value = Math.max(0, Math.min(100, ideal + wobble));
        breakdown[p] = Math.round(value);
      }
    }

    // Global score = weighted avg using profile.weights. Only the 5 main
    // pillars participate in the total — content is informational-only in
    // the real score.ts path, so we don't double-count it here either.
    const scoredPillars: PillarKey[] = ['seo', 'geo', 'web', 'conversion', 'reputation'];
    const active = scoredPillars
      .map(p => ({ value: breakdown[p], weight: args.profile.weights[p] }))
      .filter(x => x.value > 0);
    const totalW = active.reduce((s, x) => s + x.weight, 0);
    const total = totalW > 0
      ? Math.round(active.reduce((s, x) => s + x.value * x.weight, 0) / totalW)
      : 0;

    weeks.push({
      week: w,
      date: date.toISOString().slice(0, 10),
      score: w === 0 ? args.currentTotal : total,
      breakdown,
    });
  }

  return weeks;
}
