/**
 * Builds a complete client context string for the Radar agent (Sonnet).
 * Aggregates: onboarding, snapshot history, recommendations history,
 * diff correlations, and strategic plan.
 */

import {
  getClientOnboarding, getAllSnapshots, getAllRecommendations,
  type Recommendation, type ClientOnboarding,
} from '../db';
import { analyzeEvolution } from './diff-engine';
import type { Snapshot } from '../demo-data';

export interface ClientContext {
  text: string;
  onboarding: ClientOnboarding | null;
  snapshotCount: number;
  recommendationCount: number;
}

export async function buildClientContext(
  clientId: string,
  clientName: string,
  domain: string,
): Promise<ClientContext> {
  const [onboarding, snapshots, allRecs] = await Promise.all([
    getClientOnboarding(clientId),
    getAllSnapshots(clientId),
    getAllRecommendations(clientId),
  ]);

  const sections: string[] = [];

  // ─── 1. Client profile ──────────────────────────────────────────────────
  if (onboarding) {
    sections.push(`PERFIL DEL CLIENTE:
Empresa: ${clientName} (${domain})
Descripción: ${onboarding.business_description || 'No proporcionada'}
Objetivo: ${onboarding.primary_goal || 'No especificado'}${onboarding.goal_detail ? ` — ${onboarding.goal_detail}` : ''}
Zona: ${onboarding.geo_scope || '?'}${onboarding.geo_detail ? ` — ${onboarding.geo_detail}` : ''}
Presupuesto: ${onboarding.monthly_budget || '?'}
Equipo: ${onboarding.team_size || '?'}
Competidores: ${(onboarding.competitors || []).map(c => c.name || c.url).join(', ') || 'No especificados'}`);
  }

  // ─── 2. Score evolution (last 8 snapshots) ──────────────────────────────
  if (snapshots.length > 0) {
    const recent = snapshots.slice(-8);
    const scoreTimeline = recent.map(s => `${s.date}: score ${s.score}`).join(', ');

    const latest = recent[recent.length - 1];
    const prev = recent.length >= 2 ? recent[recent.length - 2] : null;
    const lr = latest.pipeline_output || {};
    const pr = prev?.pipeline_output || {};

    sections.push(`EVOLUCIÓN DE SCORES (últimas ${recent.length} semanas):
${scoreTimeline}
Tendencia: ${latest.score > (prev?.score || 0) ? 'mejorando' : latest.score < (prev?.score || 0) ? 'empeorando' : 'estable'}

DATOS ACTUALES:
- SEO: ${lr.seo?.keywordsTop10 || '?'} keywords top10, tráfico ${lr.seo?.organicTrafficEstimate || '?'}
- GEO: ${lr.geo?.mentions || '?'}/${lr.geo?.totalQueries || '?'} menciones IA (${lr.geo?.mentionRate || '?'}%)
- PageSpeed mobile: ${lr.pagespeed?.mobile?.performance || '?'}/100, LCP ${lr.pagespeed?.mobile?.lcp || '?'}ms
- Conversión: funnel score ${lr.conversion?.funnelScore || '?'}
- Blog: ${lr.content_cadence?.postsLast90Days || 0} posts últimos 90 días, último hace ${lr.content_cadence?.daysSinceLastPost || '?'} días
- Reputación: GBP ${lr.reputation?.gbpRating || 'sin ficha'} (${lr.reputation?.totalReviews || 0} reseñas)
- TechStack: maturity ${lr.techstack?.maturityScore || '?'}/100`);

    // Competitor data
    const compItems = lr.competitor_traffic?.items || [];
    if (compItems.length > 0) {
      const compLines = compItems.map((c: any) =>
        `- ${c.domain}: tráfico ${c.organicTrafficEstimate || '?'}, kw top10 ${c.keywordsTop10 || '?'}, PS mobile ${c.mobilePerformance || '?'}`
      ).join('\n');
      sections.push(`COMPETIDORES (datos actuales):\n${compLines}`);
    }
  }

  // ─── 3. Recommendation history ──────────────────────────────────────────
  if (allRecs.length > 0) {
    const done = allRecs.filter(r => r.status === 'done');
    const inPlan = allRecs.filter(r => r.status === 'accepted' || r.status === 'in_progress');
    const pending = allRecs.filter(r => r.status === 'pending');
    const rejected = allRecs.filter(r => r.status === 'rejected');

    const lines: string[] = [];

    if (done.length > 0) {
      lines.push('ACCIONES COMPLETADAS:');
      done.forEach(r => lines.push(`- ✓ ${r.title}${r.description ? ` (${r.description.slice(0, 80)})` : ''}`));
    }

    if (inPlan.length > 0) {
      lines.push('\nPLAN ESTRATÉGICO DEL CLIENTE (acciones que ha decidido hacer):');
      inPlan.forEach(r => lines.push(`- ${r.status === 'in_progress' ? '▶' : '◻'} ${r.title} [${r.status}]`));
    }

    if (pending.length > 0) {
      lines.push(`\nSUGERENCIAS ANTERIORES PENDIENTES (${pending.length}): ${pending.map(r => r.title).join(', ')}`);
    }

    if (rejected.length > 0) {
      lines.push('\nACCIONES DESCARTADAS POR EL CLIENTE:');
      rejected.forEach(r => lines.push(`- ✗ ${r.title}${r.feedback ? ` — Razón: "${r.feedback}"` : ''}`));
    }

    sections.push(lines.join('\n'));
  }

  // ─── 4. Action correlations (if enough data) ───────────────────────────
  if (snapshots.length >= 3 && allRecs.length > 0) {
    const diff = analyzeEvolution(snapshots, allRecs);
    const probableCorrelations = diff.correlations.filter(c => c.correlationType === 'probable_cause');
    if (probableCorrelations.length > 0) {
      const corrLines = probableCorrelations.map(c =>
        `- "${c.actionTitle}" → ${c.kpiLabel}: ${c.explanation.slice(0, 100)}`
      ).join('\n');
      sections.push(`IMPACTO VERIFICADO DE ACCIONES PASADAS:\n${corrLines}`);
    }
  }

  const text = sections.join('\n\n');

  return {
    text,
    onboarding,
    snapshotCount: snapshots.length,
    recommendationCount: allRecs.length,
  };
}
