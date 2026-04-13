/**
 * Conversion × GA4 cross-diagnostics.
 *
 * Three simple signals that combine static conversion analysis
 * with real GA4 behavior data. Called after analytics ingestion
 * in run-radar.ts — never during pipeline execution.
 */

import type { ConversionResult, ConversionGA4Diagnostic, PageSpeedResult } from './types';
import type { AnalyticsData } from '../analytics/ingest';

export function enrichConversionWithGA4(
  conversion: ConversionResult | undefined,
  analytics: AnalyticsData,
  pagespeed: PageSpeedResult | undefined,
): ConversionGA4Diagnostic[] {
  if (!conversion || conversion.skipped) return [];

  const ga4 = analytics.ga4;
  const diagnostics: ConversionGA4Diagnostic[] = [];

  // ─── 1. Blind spot: GA4 connected but 0 conversion events ───────
  // The client is measuring visits but not results. Critical finding.
  if (ga4 && ga4.sessions > 0 && ga4.conversions === 0) {
    const modelHint = conversion.detectedModel === 'ecommerce'
      ? 'purchase, add_to_cart, begin_checkout'
      : conversion.detectedModel === 'lead_gen'
      ? 'generate_lead, form_submit, contact_click'
      : 'generate_lead, purchase, contact_click';

    diagnostics.push({
      id: 'blind_spot',
      severity: 'critical',
      title: 'No mides conversiones',
      description: `Tienes GA4 activo con ${ga4.sessions.toLocaleString()} sesiones/semana, pero 0 eventos de conversión configurados. Estás volando a ciegas: no sabes cuántas visitas se convierten en clientes. Configura estos eventos: ${modelHint}.`,
      icon: 'visibility_off',
    });
  }

  // ─── 2. Bounce × CTA: high bounce despite CTAs present ──────────
  // Users land and leave immediately even though CTAs exist.
  if (ga4 && ga4.bounceRate > 65 && conversion.hasCTA && conversion.ctaCount && conversion.ctaCount > 0) {
    const bounceRound = Math.round(ga4.bounceRate);
    const avgDuration = Math.round(ga4.avgSessionDuration);
    const durationHint = avgDuration < 30
      ? ` Los usuarios pasan solo ${avgDuration}s de media — no leen el contenido.`
      : '';

    diagnostics.push({
      id: 'bounce_vs_cta',
      severity: bounceRound > 80 ? 'critical' : 'warning',
      title: `${bounceRound}% de rebote con ${conversion.ctaCount} CTAs`,
      description: `Tienes ${conversion.ctaCount} llamadas a la acción en tu web, pero el ${bounceRound}% de visitantes se van sin interactuar.${durationHint} Revisa: posición del CTA (¿visible sin scroll?), velocidad de carga, y coherencia entre el anuncio/búsqueda y lo que muestra la página.`,
      icon: 'exit_to_app',
    });
  }

  // ─── 3. Mobile friction: mostly mobile traffic + slow mobile ────
  // The majority of users are on mobile but PageSpeed is bad.
  if (ga4 && ga4.deviceBreakdown) {
    const total = ga4.deviceBreakdown.desktop + ga4.deviceBreakdown.mobile + ga4.deviceBreakdown.tablet;
    const mobilePct = total > 0 ? Math.round((ga4.deviceBreakdown.mobile / total) * 100) : 0;
    const mobilePerf = pagespeed?.mobile?.performance;

    if (mobilePct >= 60 && mobilePerf != null && mobilePerf < 50) {
      diagnostics.push({
        id: 'mobile_friction',
        severity: mobilePerf < 30 ? 'critical' : 'warning',
        title: `${mobilePct}% de tu tráfico es móvil, pero tu web móvil puntúa ${mobilePerf}/100`,
        description: `${mobilePct}% de tus visitantes navegan desde el móvil, pero tu PageSpeed mobile es ${mobilePerf}/100. Cada segundo extra de carga reduce las conversiones ~7%. Prioriza: optimizar imágenes, reducir JavaScript, y mejorar LCP.`,
        icon: 'smartphone',
      });
    }
  }

  return diagnostics;
}
