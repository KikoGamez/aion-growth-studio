import type { QAResult } from '../types';

const ANTHROPIC_API_KEY =
  import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

function buildQAPrompt(results: Record<string, any>): string {
  // Extract key facts for the review
  const seo = results.seo || {};
  const geo = results.geo || {};
  const rep = results.reputation || {};
  const ts = results.techstack || {};
  const sector = results.sector?.sector || 'unknown';
  const crawl = results.crawl || {};
  const ctItems: any[] = results.competitor_traffic?.items || [];
  const allCompetitorsEmpty = ctItems.length > 0 && ctItems.every(
    (c: any) => c.organicTrafficEstimate == null && c.keywordsTop10 == null,
  );

  const summary = {
    sector,
    url: crawl.title || '',
    seo_etv: seo.organicTrafficEstimate,
    seo_keywords_top10: seo.keywordsTop10,
    seo_trend_lost: seo.trendLost,
    seo_trend_up: seo.trendUp,
    geo_score: geo.overallScore,
    geo_queries_count: geo.queries?.length ?? 0,
    geo_mentioned_count: geo.queries?.filter((q: any) => q.mentioned).length ?? 0,
    rep_level: rep.reputationLevel,
    rep_combined_rating: rep.combinedRating,
    rep_total_reviews: rep.totalReviews,
    techstack_maturity: ts.maturityScore,
    techstack_cms: ts.cms,
    competitors_all_empty: allCompetitorsEmpty,
    paid_investing: seo.isInvestingPaid,
  };

  return `Eres un consultor senior de growth y marketing digital con 10 años de experiencia auditando empresas medianas.
Tu trabajo es revisar el informe de diagnóstico digital que AION ha generado automáticamente y detectar
cualquier conclusión incorrecta, inconsistente o no respaldada por los datos.

RESUMEN DE DATOS DEL AUDIT:
${JSON.stringify(summary, null, 2)}

DATOS COMPLETOS (subset relevante):
${JSON.stringify({
    seo: { ...seo, paidTopKeywords: undefined, topKeywords: seo.topKeywords?.slice(0, 3) },
    geo: { overallScore: geo.overallScore, brandScore: geo.brandScore, sectorScore: geo.sectorScore, queries: geo.queries?.slice(0, 4) },
    reputation: rep,
    techstack: { maturityScore: ts.maturityScore, cms: ts.cms, analytics: ts.analytics },
    sector: results.sector,
    competitors_count: ctItems.length,
    all_competitors_empty: allCompetitorsEmpty,
  }, null, 2)}

Revisa las posibles inconsistencias y responde ÚNICAMENTE con JSON válido con esta estructura exacta:
{
  "approved": true,
  "issues": [],
  "suppressed_sections": [],
  "overall_assessment": "valoración breve de 1-2 frases"
}

Criterios que debes aplicar:

1. COHERENCIA: Si etv orgánico < 100 y el informe sugiere "buena visibilidad orgánica", es contradicción.
2. PROYECCIONES: Si la proyección de tráfico supera el 200% del tráfico actual, ajústala.
3. SECCIONES SIN DATOS: Si competitor_traffic tiene todos los items vacíos, marca "competitor_benchmark" para supresión.
4. URGENCIA INJUSTIFICADA: Si el informe usa alerta roja pero los datos no son críticos (etv > 1000, rating > 4.0), suaviza.
5. TECH STACK: Si el CMS es enterprise (Drupal, SAP, Salesforce) y no hay analytics detectado, añade nota de caveat en lugar de conclusión categórica.
6. GEO: Si el score GEO > 50 y hay texto de "invisibilidad crítica", es inconsistente.
7. COMPETIDORES VACÍOS: Si all_competitors_empty es true, suprime la sección "competitor_benchmark".

Para suppressed_sections usa estos identificadores exactos: "competitor_benchmark", "geo_analysis", "seo_visibility", "reputation", "techstack".

Solo marca approved: false si hay issues que cambian materialmente las conclusiones.
Issues menores de tono → approved: true con correcciones opcionales.`;
}

export async function runQAAgent(results: Record<string, any>): Promise<QAResult> {
  if (!ANTHROPIC_API_KEY) {
    return {
      approved: true,
      issues: [],
      suppressedSections: [],
      overallAssessment: 'QA not configured (no ANTHROPIC_API_KEY)',
      qaBypassed: true,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        temperature: 0,
        messages: [{ role: 'user', content: buildQAPrompt(results) }],
      }),
    });

    if (!res.ok) {
      return { approved: true, issues: [], suppressedSections: [], qaBypassed: true, overallAssessment: `API error ${res.status}` };
    }

    const data = await res.json();
    const text: string = data?.content?.[0]?.text || '';

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return { approved: true, issues: [], suppressedSections: [], qaBypassed: true, overallAssessment: 'Invalid QA response' };
    }

    const qa = JSON.parse(match[0]);
    return {
      approved: qa.approved ?? true,
      issues: qa.issues || [],
      suppressedSections: (qa.suppressed_sections || []).map((s: any) => s.section ?? s),
      overallAssessment: qa.overall_assessment || '',
      qaTimestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    const reason = err.name === 'AbortError' ? 'QA agent timed out (15s)' : err.message?.slice(0, 100);
    return { approved: true, issues: [], suppressedSections: [], qaBypassed: true, overallAssessment: reason };
  } finally {
    clearTimeout(timer);
  }
}
