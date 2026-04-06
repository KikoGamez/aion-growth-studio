import type { ClientOnboarding } from './db';

const ANTHROPIC_API_KEY = import.meta.env?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

interface BriefingInput {
  onboarding: ClientOnboarding;
  auditResults: Record<string, any>;
  clientName: string;
  domain: string;
  clientContext?: string;  // Extended context from buildClientContext()
}

export interface Briefing {
  summary: string;
  priorities: Array<{ title: string; description: string; impact: 'high' | 'medium' | 'low' }>;
  quickWins: string[];
  warnings: string[];
  generatedAt: string;
}

export async function generateBriefing(input: BriefingInput): Promise<Briefing> {
  if (!ANTHROPIC_API_KEY) {
    return fallbackBriefing(input);
  }

  const { onboarding: ob, auditResults: r, clientName, domain, clientContext } = input;

  // Use extended context if available, otherwise build basic context
  const context = clientContext || `
EMPRESA: ${clientName} (${domain})
DESCRIPCIÓN: ${ob.business_description || 'No proporcionada'}
OBJETIVO PRINCIPAL: ${formatGoal(ob.primary_goal, ob.goal_detail)}
ZONA GEOGRÁFICA: ${formatGeo(ob.geo_scope, ob.geo_detail)}
ARQUITECTURA URLs: ${ob.url_architecture || 'URL única'}${ob.url_detail ? ` — ${ob.url_detail}` : ''}
PRESUPUESTO MARKETING: ${formatBudget(ob.monthly_budget)}
EQUIPO: ${formatTeam(ob.team_size)}
COMPETIDORES: ${(ob.competitors || []).map(c => c.url).join(', ') || 'No especificados'}

DATOS DE LA AUDITORÍA:
- Score total: ${r.score?.total ?? 'N/A'}/100
- SEO: ${r.seo?.keywordsTop10 ?? '?'} keywords top10, tráfico orgánico ${r.seo?.organicTrafficEstimate ?? '?'}
- GEO (IA): mention rate ${r.geo?.mentionRate ?? '?'}%
- PageSpeed mobile: ${r.pagespeed?.mobile?.performance ?? '?'}/100
- Conversión: funnel score ${r.conversion?.funnelScore ?? r.conversion?.score ?? '?'}
- Competidores detectados: ${(r.competitors?.competitors || []).map((c: any) => c.name || c.url).join(', ') || 'ninguno'}
- SSL: ${r.ssl?.valid ? 'válido' : 'problema'}
- TechStack maturity: ${r.techstack?.maturityScore ?? '?'}/100
- Blog activo: ${r.content_cadence?.cadenceLevel ?? 'no detectado'}
- GBP: ${r.gbp?.found ? `rating ${r.gbp.rating}` : 'no encontrado'}
`.trim();

  const historyRules = clientContext
    ? `
7. NO repitas recomendaciones que ya están completadas o en el plan estratégico del cliente.
8. NO sugieras acciones que el cliente descartó — respeta sus razones. Si la razón fue "muy caro", busca una alternativa más económica.
9. Ten en cuenta el plan estratégico actual: prioriza acciones que complementen lo que ya está haciendo.
10. Si una acción completada tuvo buen impacto verificado, sugiere acciones similares.
11. Referencia datos concretos de la evolución (ej: "tu score subió de X a Y esta semana").`
    : '';

  const prompt = `Eres el consultor de growth marketing de AION Growth Studio. Genera un briefing semanal personalizado para este cliente.

${context}

REGLAS:
1. Adapta el tono al tamaño del equipo: si es "Solo yo", sé muy práctico y no sugieras cosas que requieran equipo.
2. Adapta al presupuesto: si es 0€, no sugieras campañas paid.
3. Prioriza según el objetivo principal del cliente.
4. Usa datos concretos de la auditoría (números, no generalidades).
5. Si la zona es local, enfatiza SEO local y GBP. Si es multi-country, enfatiza hreflang y arquitectura.
6. Máximo 3 prioridades, 3 quick wins, 2 warnings.${historyRules}

RESPONDE EN JSON VÁLIDO:
{
  "summary": "2-3 frases de resumen ejecutivo personalizado con datos concretos",
  "priorities": [
    {"title": "Acción concreta", "description": "2 frases: problema + solución con dato", "impact": "high|medium|low"}
  ],
  "quickWins": ["Acción rápida 1 (< 1 semana)", "Acción rápida 2", "Acción rápida 3"],
  "warnings": ["Riesgo o problema urgente 1", "Riesgo 2"]
}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

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
        max_tokens: 1024,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`[briefing] API error ${res.status}`);
      return fallbackBriefing(input);
    }

    const data = await res.json();
    const text = data?.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallbackBriefing(input);

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: parsed.summary || '',
      priorities: (parsed.priorities || []).slice(0, 3),
      quickWins: (parsed.quickWins || parsed.quick_wins || []).slice(0, 3),
      warnings: (parsed.warnings || []).slice(0, 2),
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[briefing] Error:', (err as Error).message);
    return fallbackBriefing(input);
  }
}

function fallbackBriefing(input: BriefingInput): Briefing {
  const r = input.auditResults;
  const score = r.score?.total ?? 0;
  return {
    summary: `${input.clientName} tiene un score de presencia digital de ${score}/100. Se recomienda completar el análisis para obtener un briefing personalizado.`,
    priorities: [
      { title: 'Completar perfil de empresa', description: 'Añade más contexto sobre tu negocio para recibir recomendaciones personalizadas.', impact: 'high' },
    ],
    quickWins: ['Verificar que SSL está activo', 'Comprobar velocidad de carga mobile'],
    warnings: score < 40 ? ['Score de presencia digital por debajo del umbral crítico'] : [],
    generatedAt: new Date().toISOString(),
  };
}

function formatGoal(goal?: string, detail?: string): string {
  const goals: Record<string, string> = {
    generate_leads: 'Generar leads / contactos',
    sell_online: 'Vender online (ecommerce)',
    brand_positioning: 'Posicionar la marca',
    local_traffic: 'Atraer clientes locales',
    other: detail || 'Otro',
  };
  return goals[goal || ''] || 'No especificado';
}

function formatGeo(scope?: string, detail?: string): string {
  const scopes: Record<string, string> = {
    local_city: 'Local (ciudad)',
    national: 'Nacional',
    multi_country: 'Multi-país',
    global: 'Global',
  };
  const base = scopes[scope || ''] || 'No especificado';
  return detail ? `${base} — ${detail}` : base;
}

function formatBudget(budget?: string): string {
  const budgets: Record<string, string> = {
    '0': 'Sin presupuesto',
    '<500': 'Menos de 500€/mes',
    '500-2000': '500–2.000€/mes',
    '2000-5000': '2.000–5.000€/mes',
    '>5000': 'Más de 5.000€/mes',
  };
  return budgets[budget || ''] || 'No especificado';
}

function formatTeam(team?: string): string {
  const teams: Record<string, string> = {
    solo: '1 persona (founder)',
    '2-5': '2–5 personas',
    '6-20': '6–20 personas',
    '>20': 'Más de 20 personas',
  };
  return teams[team || ''] || 'No especificado';
}
