import { getClientOnboarding, getLatestSnapshot, getAllSnapshots, getProposedRecommendations, getActionPlan, getCompletedActions } from '../db';
import { getIntegration } from '../integrations';
import { getRecentMessages, getLearnings, getDocuments, type AdvisorMessage } from './db';
import { buildPlaybookContext } from '../ai/playbooks';

/**
 * Build the full client context for the advisor prompt.
 *
 * Includes: onboarding, KPIs, evolution, recommendations, past conversations,
 * learnings, uploaded documents, connected integrations, priority keywords
 * and keyword strategy.
 *
 * Memory strategy:
 * - Last 60 days: all messages included verbatim
 * - Older: only client_learnings (auto-summarized)
 */
export async function buildAdvisorContext(clientId: string, domain: string): Promise<string> {
  const [onboarding, latestSnap, allSnaps, proposedRecs, actionPlan, completedActions, recentMsgs, learnings, documents, googleIntegration] =
    await Promise.all([
      getClientOnboarding(clientId),
      getLatestSnapshot(clientId),
      getAllSnapshots(clientId),
      getProposedRecommendations(clientId),
      getActionPlan(clientId),
      getCompletedActions(clientId),
      getRecentMessages(clientId, 60),
      getLearnings(clientId, 50),
      getDocuments(clientId),
      getIntegration(clientId, 'google_analytics').catch(() => null),
    ]);

  const sections: string[] = [];

  // ── 1. Client profile ──────────────────────────────────────────
  sections.push('## PERFIL DEL CLIENTE');
  sections.push(`Dominio: ${domain}`);
  if (onboarding) {
    if (onboarding.sector) sections.push(`Sector: ${onboarding.sector}`);
    if (onboarding.business_description) sections.push(`Negocio: ${onboarding.business_description}`);
    if (onboarding.primary_goal) sections.push(`Objetivo principal: ${onboarding.primary_goal}${onboarding.goal_detail ? ` — ${onboarding.goal_detail}` : ''}`);
    if (onboarding.geo_scope) sections.push(`Alcance geográfico: ${onboarding.geo_scope}${onboarding.geo_detail ? ` (${onboarding.geo_detail})` : ''}`);
    if (onboarding.monthly_budget) sections.push(`Presupuesto mensual: ${onboarding.monthly_budget}`);
    if (onboarding.team_size) sections.push(`Tamaño equipo: ${onboarding.team_size}`);
    if (onboarding.competitors?.length) {
      sections.push(`Competidores: ${onboarding.competitors.map(c => c.name || c.url).join(', ')}`);
    }
    if (onboarding.instagram_handle) sections.push(`Instagram: @${onboarding.instagram_handle}`);
    if (onboarding.linkedin_url) sections.push(`LinkedIn: ${onboarding.linkedin_url}`);
  }

  // ── 1c. Connected integrations — NEVER suggest re-connecting ──
  sections.push('\n## INTEGRACIONES CONECTADAS');
  sections.push('(El cliente YA tiene estas integraciones configuradas — no las sugieras reconectar ni configurar)');
  if (googleIntegration && googleIntegration.status === 'connected') {
    const parts: string[] = [];
    parts.push('- Google Search Console: CONECTADO (scope: webmasters.readonly)');
    if (googleIntegration.property_id) {
      parts.push(`- Google Analytics 4: CONECTADO — property "${googleIntegration.property_name || googleIntegration.property_id}"`);
    } else {
      parts.push('- Google Analytics 4: OAuth autorizado pero sin property_id seleccionada (el cliente podría seleccionar una desde ajustes)');
    }
    if (googleIntegration.account_email) parts.push(`- Cuenta Google vinculada: ${googleIntegration.account_email}`);
    sections.push(parts.join('\n'));
  } else {
    sections.push('- Google Analytics 4 / Search Console: NO conectados (puedes recomendar conectarlos si aplica)');
  }

  // ── 1d. Priority keywords — the client's declared strategic focus ──
  const priorityKeywords = onboarding?.priority_keywords || [];
  const keywordStrategy = onboarding?.keyword_strategy;
  if (priorityKeywords.length > 0 || (keywordStrategy && (keywordStrategy.demandType || keywordStrategy.focus || keywordStrategy.growthService))) {
    sections.push('\n## KEYWORDS PRIORITARIAS Y ESTRATEGIA (definidas por el cliente)');
    sections.push('(Son el norte estratégico del cliente. Cualquier recomendación SEO/contenido DEBE referenciarlas cuando aplique — por nombre literal.)');

    if (keywordStrategy) {
      const stratParts: string[] = [];
      if (keywordStrategy.demandType) {
        stratParts.push(`Tipo de demanda: ${keywordStrategy.demandType === 'existing' ? 'captar demanda existente' : keywordStrategy.demandType === 'create' ? 'crear demanda nueva' : 'mezcla'}`);
      }
      if (keywordStrategy.focus) {
        stratParts.push(`Foco: ${keywordStrategy.focus === 'volume' ? 'volumen' : 'cualificación'}`);
      }
      if (keywordStrategy.growthService) {
        stratParts.push(`Servicio a hacer crecer: ${keywordStrategy.growthService}`);
      }
      if (stratParts.length) sections.push(`Estrategia declarada: ${stratParts.join(' · ')}`);
    }

    if (priorityKeywords.length > 0) {
      sections.push(`Lista (${priorityKeywords.length} keywords):`);
      priorityKeywords.forEach((kw: any, i: number) => {
        const parts: string[] = [`  ${i + 1}. "${kw.keyword}"`];
        if (kw.volume != null) parts.push(`${kw.volume} búsquedas/mes`);
        if (kw.currentPosition != null) parts.push(`posición actual ${kw.currentPosition}`);
        if (kw.difficulty != null) parts.push(`dificultad ${kw.difficulty}/100`);
        if (kw.feasibility) parts.push(`factibilidad ${kw.feasibility}`);
        if (kw.intent) parts.push(`intent ${kw.intent}`);
        sections.push(parts[0] + ' (' + parts.slice(1).join(', ') + ')');
      });
    }
  }

  // ── 1e. Primary KPIs the client has chosen to track ──
  const primaryKpis = onboarding?.primary_kpis || [];
  if (primaryKpis.length > 0) {
    sections.push('\n## KPIs OBJETIVO (elegidos por el cliente en ajustes)');
    sections.push('(El cliente ya ha elegido estos KPIs como foco. Cualquier recomendación debería mover al menos uno de ellos.)');
    primaryKpis.forEach((kpi: any) => {
      const t = kpi.target != null ? ` · objetivo 6m: ${kpi.target}` : '';
      sections.push(`- ${kpi.label} (key: ${kpi.key})${t}`);
    });
  }

  // ── 1b. Business-type playbook ──────────────────────────────────
  const r = (latestSnap && latestSnap.id !== 'empty') ? latestSnap.pipeline_output : null;
  const seoData = r?.seo as any;
  const playbook = buildPlaybookContext({
    primaryGoal: onboarding?.primary_goal,
    businessType: (r?.sector as any)?.businessType,
    sector: onboarding?.sector || (r?.sector as any)?.sector,
    teamSize: onboarding?.team_size,
    monthlyBudget: onboarding?.monthly_budget,
    geoScope: onboarding?.geo_scope,
    keywordsTop10: seoData?.keywordsTop10,
    organicTraffic: seoData?.organicTraffic,
  });
  if (playbook) sections.push(playbook);

  // ── 2. Current KPIs (latest snapshot) ──────────────────────────
  if (r) {
    sections.push('\n## KPIS ACTUALES (último análisis)');
    const score = r.score as any;
    if (score?.total != null) {
      sections.push(`Score global: ${score.total}/100`);
      const b = score.breakdown || {};
      sections.push(`  SEO: ${b.seo ?? '?'} | GEO: ${b.geo ?? '?'} | Web: ${b.web ?? '?'} | Conversión: ${b.conversion ?? '?'} | Reputación: ${b.reputation ?? '?'}`);
    }

    const seo = r.seo as any;
    if (seo && !seo.skipped) {
      sections.push(`SEO: ${seo.keywordsTop10 ?? '?'} KW top10, ${seo.keywordsTop3 ?? '?'} top3, tráfico orgánico ~${seo.organicTraffic ?? '?'}`);
    }

    const geo = r.geo as any;
    if (geo && !geo.skipped) {
      sections.push(`GEO (IA): mention rate ${geo.mentionRate ?? '?'}%`);
    }

    const ps = r.pagespeed as any;
    if (ps && !ps.skipped) {
      sections.push(`PageSpeed: mobile ${ps.mobile?.performance ?? '?'}, desktop ${ps.desktop?.performance ?? '?'}, LCP ${ps.mobile?.lcp ?? '?'}ms`);
    }

    const conversion = r.conversion as any;
    if (conversion && !conversion.skipped) {
      sections.push(`Conversión: funnel score ${conversion.funnelScore ?? '?'}/100, CTAs: ${conversion.ctaCount ?? '?'}, forms: ${conversion.formCount ?? '?'}`);
    }

    const ig = r.instagram as any;
    if (ig?.found && ig.followers) {
      sections.push(`Instagram: ${ig.followers} followers, ER ${ig.engagementRate ?? '?'}%`);
    }

    const li = r.linkedin as any;
    if (li?.found && li.followers) {
      sections.push(`LinkedIn: ${li.followers} followers`);
    }

    const rep = r.reputation as any;
    if (rep && !rep.skipped) {
      sections.push(`Reputación: ${rep.combinedRating ? `${rep.combinedRating}★` : 'sin rating'}, ${rep.totalReviews ?? 0} reviews, ${rep.newsCount ?? 0} menciones en prensa`);
    }

    // Competitor data
    const ct = r.competitor_traffic as any;
    if (ct?.items?.length) {
      sections.push('\nCompetidores (datos SEO):');
      for (const c of ct.items.slice(0, 3)) {
        sections.push(`  ${c.name || c.domain}: ${c.keywordsTop10 ?? '?'} KW top10, tráfico ~${c.organicTraffic ?? '?'}`);
      }
    }

    // ── Growth Agent analysis ─────────────────────────────────────
    // CRITICAL for coherence: this is exactly what the client sees on
    // their dashboard home, SEO page, GEO page and recommendations.
    // The advisor MUST refer to this same analysis when chatting so
    // there's never a contradiction between "dashboard says X" and
    // "chat says Y". Everything the client reads comes from here.
    const ga = r.growth_analysis as any;
    if (ga) {
      sections.push('\n## LO QUE YA LE HE DICHO AL CLIENTE EN EL DASHBOARD');
      sections.push('Este análisis está publicado en su dashboard — debes ser coherente con él. No contradigas lo que ya leyó, y cuando referencies algo, usa el mismo léxico.');

      const exec = ga.executiveSummary || {};
      if (exec.headline) sections.push(`\n### Resumen ejecutivo — titular\n${exec.headline}`);
      if (exec.situation) sections.push(`### Situación\n${exec.situation}`);
      if (exec.strengths?.length) sections.push(`### Fortalezas\n${exec.strengths.map((s: string) => `- ${s}`).join('\n')}`);
      if (exec.criticalGaps?.length) sections.push(`### Gaps críticos\n${exec.criticalGaps.map((g: string) => `- ${g}`).join('\n')}`);
      if (exec.upsidePotential?.metric) {
        const u = exec.upsidePotential;
        sections.push(`### Potencial cuantificado\n${u.metric}: de ${u.current} a ${u.potential} en ${u.timeframe} (${u.dependency})`);
      }

      const pa = ga.pillarAnalysis || {};
      const pillars: Array<[string, string]> = [['seo','SEO'],['geo','GEO / Visibilidad IA'],['web','Web & técnico'],['conversion','Conversión'],['content','Contenido'],['reputation','Reputación']];
      const narratives: string[] = [];
      for (const [key, label] of pillars) {
        const p = pa[key];
        if (p?.assessment) narratives.push(`**${label}**: ${p.assessment}${p.keyFinding ? ` → lo que más importa: ${p.keyFinding}` : ''}`);
      }
      if (narratives.length) {
        sections.push(`\n### Análisis por pilar\n${narratives.join('\n\n')}`);
      }

      if (Array.isArray(ga.prioritizedActions) && ga.prioritizedActions.length) {
        sections.push('\n### Plan de acción priorizado (lo que ya ve el cliente)');
        for (const a of ga.prioritizedActions) {
          sections.push(`${a.rank}. [${a.pillar}] ${a.title} — ${a.expectedOutcome || ''} (${a.effort || 'medium'} effort, ${a.timeframe || '?'})`);
          if (a.rationale) sections.push(`   · ${a.rationale}`);
        }
      }
    }
  }

  // ── 3. Evolution (if multiple snapshots) ───────────────────────
  if (allSnaps.length >= 2) {
    sections.push('\n## EVOLUCIÓN');
    const prev = allSnaps[allSnaps.length - 2]?.pipeline_output;
    const curr = allSnaps[allSnaps.length - 1]?.pipeline_output;
    if (prev && curr) {
      const prevScore = (prev.score as any)?.total;
      const currScore = (curr.score as any)?.total;
      if (prevScore != null && currScore != null) {
        const delta = currScore - prevScore;
        sections.push(`Score: ${prevScore} → ${currScore} (${delta >= 0 ? '+' : ''}${delta})`);
      }
      const prevKW = (prev.seo as any)?.keywordsTop10;
      const currKW = (curr.seo as any)?.keywordsTop10;
      if (prevKW != null && currKW != null) {
        sections.push(`KW Top10: ${prevKW} → ${currKW} (${currKW - prevKW >= 0 ? '+' : ''}${currKW - prevKW})`);
      }
      const prevGeo = (prev.geo as any)?.mentionRate;
      const currGeo = (curr.geo as any)?.mentionRate;
      if (prevGeo != null && currGeo != null) {
        sections.push(`GEO mention rate: ${prevGeo}% → ${currGeo}%`);
      }
    }
    sections.push(`Total snapshots: ${allSnaps.length} (desde ${allSnaps[0]?.date || '?'})`);
  }

  // ── 4. Recommendations + Action Plan ────────────────────────────
  if (proposedRecs.length) {
    sections.push('\n## RECOMENDACIONES PENDIENTES DE DECISIÓN');
    for (const r of proposedRecs.slice(0, 5)) {
      sections.push(`  - [${r.impact}] ${r.title} (fuente: ${r.source})`);
    }
  }

  if (actionPlan.length || completedActions.length) {
    sections.push('\n## PLAN DE ACCIÓN DEL CLIENTE');
    const active = actionPlan.filter(a => a.status === 'in_progress');
    const pending = actionPlan.filter(a => a.status === 'pending');
    if (active.length) {
      sections.push('En marcha:');
      for (const a of active) {
        sections.push(`  - ${a.title} (desde ${a.started_at?.slice(0, 10) || '?'})`);
      }
    }
    if (pending.length) {
      sections.push('Pendientes de empezar:');
      for (const a of pending.slice(0, 5)) {
        sections.push(`  - [${a.impact}] ${a.title}`);
      }
    }
    if (completedActions.length) {
      sections.push(`Completadas: ${completedActions.length} acciones`);
      for (const a of completedActions.slice(0, 5)) {
        sections.push(`  - ${a.title} (completada ${a.completed_at?.slice(0, 10) || '?'})`);
      }
    }
  }

  // ── 5. Learnings (accumulated memory) ──────────────────────────
  if (learnings.length) {
    // Separate action results (what worked/didn't) from other learnings
    const actionResults = learnings.filter((l: any) => l.type === 'action_result');
    const otherLearnings = learnings.filter((l: any) => l.type !== 'action_result');

    if (actionResults.length) {
      sections.push('\n## QUÉ HA FUNCIONADO Y QUÉ NO (correlaciones acción → KPI)');
      sections.push('IMPORTANTE: Usa estos datos para priorizar recomendaciones futuras. Recomienda más de lo que funcionó, menos de lo que no.');
      for (const l of actionResults.slice(0, 20)) {
        const m = (l as any).metadata || {};
        const sign = (m.delta_pct ?? 0) >= 0 ? '+' : '';
        sections.push(`- ${l.content}${m.delta_pct ? ` (${sign}${m.delta_pct}% en ${m.kpi_label || m.kpi_key})` : ''} [${m.correlation_type || '?'}]`);
      }
    }

    if (otherLearnings.length) {
      sections.push('\n## OTROS APRENDIZAJES');
      for (const l of otherLearnings.slice(0, 20)) {
        sections.push(`- [${l.type}] ${l.content}`);
      }
    }
  }

  // ── 6. Documents ───────────────────────────────────────────────
  if (documents.length) {
    const withText = documents.filter((d: any) => d.extracted_text);
    if (withText.length) {
      sections.push('\n## DOCUMENTOS DEL CLIENTE');
      for (const doc of withText.slice(0, 5)) {
        const text = (doc.extracted_text || '').slice(0, 2000);
        sections.push(`### ${doc.filename}\n${text}`);
      }
    }
  }

  // ── 7. Conversation history (last 60 days) ─────────────────────
  if (recentMsgs.length) {
    sections.push('\n## CONVERSACIONES RECIENTES (últimos 60 días)');
    let currentThread = '';
    for (const msg of recentMsgs.slice(-100)) { // cap at 100 most recent messages
      if (msg.thread_id !== currentThread) {
        currentThread = msg.thread_id;
        sections.push(`\n--- Thread ${msg.created_at.slice(0, 10)} ---`);
      }
      const role = msg.role === 'user' ? 'Cliente' : 'Advisor';
      // Truncate very long messages in history
      const content = msg.content.length > 500 ? msg.content.slice(0, 500) + '...' : msg.content;
      sections.push(`${role}: ${content}`);
    }
  }

  return sections.join('\n');
}
