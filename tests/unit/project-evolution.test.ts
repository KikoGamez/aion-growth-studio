import { describe, it, expect } from 'vitest';
const { projectEvolution } = await import('../../src/lib/preview/project-evolution');
const { PROFILES } = await import('../../src/lib/benchmarks/profiles');

const freelance = PROFILES.freelance;

describe('projectEvolution', () => {
  const baseArgs = {
    clientId: 'test-client-uuid',
    profile: freelance,
    currentBreakdown: { seo: 22, geo: 0, web: 71, conversion: 28, content: 40, reputation: 76 },
    currentTotal: 56,
    currentDate: '2026-04-14',
    weeksAhead: 7,
  };

  it('returns 8 weeks (week 0 + 7 projected)', () => {
    const out = projectEvolution(baseArgs);
    expect(out).toHaveLength(8);
    expect(out[0].week).toBe(0);
    expect(out[7].week).toBe(7);
  });

  it('week 0 is exactly the real data', () => {
    const out = projectEvolution(baseArgs);
    expect(out[0].score).toBe(baseArgs.currentTotal);
    expect(out[0].breakdown.seo).toBe(baseArgs.currentBreakdown.seo);
    expect(out[0].breakdown.reputation).toBe(baseArgs.currentBreakdown.reputation);
  });

  it('is deterministic — same input, same output', () => {
    const a = projectEvolution(baseArgs);
    const b = projectEvolution(baseArgs);
    expect(a).toEqual(b);
  });

  it('different client ids produce different wobble (not identical timelines)', () => {
    const a = projectEvolution({ ...baseArgs, clientId: 'client-a' });
    const b = projectEvolution({ ...baseArgs, clientId: 'client-b' });
    // Week 0 is real data so must match; later weeks diverge due to wobble.
    expect(a[0]).toEqual(b[0]);
    const laterWeeksDiffer = a.slice(1).some((w, i) => w.score !== b[i + 1].score);
    expect(laterWeeksDiffer).toBe(true);
  });

  it('projection trends upward overall (ease-out curve, never collapses)', () => {
    const out = projectEvolution(baseArgs);
    expect(out[7].score).toBeGreaterThan(out[0].score);
  });

  it('never exceeds 100 on any pillar', () => {
    // High starting values shouldn't push projection past 100
    const out = projectEvolution({
      ...baseArgs,
      currentBreakdown: { seo: 90, geo: 95, web: 98, conversion: 92, content: 85, reputation: 99 },
      currentTotal: 93,
    });
    for (const w of out) {
      for (const v of Object.values(w.breakdown)) expect(v).toBeLessThanOrEqual(100);
      expect(w.score).toBeLessThanOrEqual(100);
    }
  });

  it('keeps growth conservative — never jumps more than 30pt total in 8 weeks', () => {
    const out = projectEvolution(baseArgs);
    const totalJump = out[7].score - out[0].score;
    expect(totalJump).toBeLessThan(30);
  });

  it('faster pillars (web/content) move more than slower ones (seo/geo)', () => {
    const out = projectEvolution({
      ...baseArgs,
      currentBreakdown: { seo: 20, geo: 20, web: 20, conversion: 20, content: 20, reputation: 20 },
      currentTotal: 20,
    });
    const webDelta = out[7].breakdown.web - out[0].breakdown.web;
    const seoDelta = out[7].breakdown.seo - out[0].breakdown.seo;
    const geoDelta = out[7].breakdown.geo - out[0].breakdown.geo;
    expect(webDelta).toBeGreaterThan(seoDelta);
    expect(seoDelta).toBeGreaterThan(geoDelta);
  });

  it('dates are weekly spaced (Mondays)', () => {
    const out = projectEvolution(baseArgs);
    const d0 = new Date(out[0].date);
    const d1 = new Date(out[1].date);
    const diffDays = (d1.getTime() - d0.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(7);
  });
});
