// Keyword Opportunities Engine
//
// Combines 3 sources of candidate keywords and scores them by real probability
// of reaching the TOP 10, not by vanity metrics (pure volume).
//
//   score = feasibility × usefulVolume × businessAlignment
//
// - feasibility: how likely this client can realistically rank top 10
//     (domain rank vs keyword difficulty; distance from current position)
// - usefulVolume: search volume weighted by commercial intent
//     (transactional > commercial > informational)
// - businessAlignment: semantic match with business description / growth service
//
// Inputs come from pipeline_output (snapshot) + client_onboarding
// Outputs a ranked list of candidate PriorityKeyword objects.

import type { PriorityKeyword, KeywordStrategy, ClientOnboarding } from '../db';

interface SourceKeyword {
  keyword: string;
  volume?: number;
  position?: number;
  difficulty?: number;
  source: 'current' | 'gap' | 'generated';
}

interface ScoringContext {
  businessDescription?: string;
  growthService?: string;
  demandType?: KeywordStrategy['demandType'];
  focus?: KeywordStrategy['focus'];
  geoDetail?: string;
}

// ─── Intent detection ────────────────────────────────────────────────────
const TRANSACTIONAL_MARKERS = [
  'precio', 'precios', 'comprar', 'contratar', 'cotización', 'presupuesto',
  'tarifa', 'tarifas', 'descuento', 'oferta', 'barato', 'mejor precio',
  'software', 'app', 'herramienta', 'plataforma', 'servicio',
];
const COMMERCIAL_MARKERS = [
  'mejor', 'mejores', 'comparativa', 'vs', 'alternativa', 'alternativas',
  'review', 'reseña', 'opinión', 'opiniones', 'ranking', 'top',
];

function detectIntent(keyword: string): PriorityKeyword['intent'] {
  const k = keyword.toLowerCase();
  if (TRANSACTIONAL_MARKERS.some(m => k.includes(m))) return 'transactional';
  if (COMMERCIAL_MARKERS.some(m => k.includes(m))) return 'commercial';
  return 'informational';
}

// ─── Feasibility scoring ─────────────────────────────────────────────────
// Returns a multiplier 0.2 – 1.5:
//   >1.0  easy wins (already close to top 10, low difficulty)
//   ~1.0  balanced (reachable with normal effort)
//   <0.7  stretch goals (high difficulty keywords)
function feasibility(
  position: number | undefined,
  difficulty: number | undefined,
): { score: number; label: 'high' | 'medium' | 'low' } {
  // Position leverage — fruit on the branch
  let positionMult = 1.0;
  if (position != null) {
    if (position <= 10) positionMult = 1.1;       // defend top 10
    else if (position <= 20) positionMult = 1.5;  // quickest wins
    else if (position <= 30) positionMult = 1.3;  // close enough
    else if (position <= 50) positionMult = 0.9;  // harder
    else positionMult = 0.5;                      // stretch
  }

  // Difficulty-only multiplier (we don't measure domain authority)
  let diffMult = 1.0;
  if (difficulty != null) {
    if (difficulty <= 30) diffMult = 1.2;
    else if (difficulty <= 50) diffMult = 1.0;
    else if (difficulty <= 70) diffMult = 0.7;
    else diffMult = 0.4;
  }

  const score = Math.max(0.2, Math.min(1.5, positionMult * diffMult));
  const label: 'high' | 'medium' | 'low' =
    score >= 1.1 ? 'high' : score >= 0.75 ? 'medium' : 'low';
  return { score, label };
}

// ─── Useful volume — weighted by intent + focus ──────────────────────────
function usefulVolume(
  volume: number | undefined,
  intent: PriorityKeyword['intent'],
  focus: KeywordStrategy['focus'] | undefined,
): number {
  const v = volume ?? 0;
  if (v === 0) return 0;

  const intentWeight =
    intent === 'transactional' ? 1.5 :
    intent === 'commercial' ? 1.2 :
    0.8;

  // Focus on quality → penalize raw volume, boost transactional
  // Focus on volume → reward high-volume keywords regardless of intent
  const focusWeight =
    focus === 'quality' && intent === 'transactional' ? 1.3 :
    focus === 'quality' && intent === 'informational' ? 0.6 :
    focus === 'volume' ? 1.0 :
    1.0;

  // Log-dampen so a 10k keyword doesn't crush a 500 one by 20x
  return Math.log10(v + 1) * intentWeight * focusWeight;
}

// ─── Business alignment (semantic heuristic) ─────────────────────────────
function alignment(keyword: string, context: ScoringContext): number {
  const k = keyword.toLowerCase();
  const desc = (context.businessDescription || '').toLowerCase();
  const growth = (context.growthService || '').toLowerCase();
  const geo = (context.geoDetail || '').toLowerCase();

  let score = 0.5; // baseline — keyword already passed the source filter

  // Token overlap with business description
  const descTokens = desc.split(/\W+/).filter(t => t.length > 3);
  const kwTokens = k.split(/\W+/).filter(t => t.length > 3);
  const overlap = kwTokens.filter(t => descTokens.includes(t)).length;
  if (overlap > 0) score += Math.min(0.4, overlap * 0.2);

  // Growth service match (strongest signal)
  if (growth && k.includes(growth)) score += 0.5;
  else {
    const growthTokens = growth.split(/\W+/).filter(t => t.length > 3);
    const growthOverlap = kwTokens.filter(t => growthTokens.includes(t)).length;
    if (growthOverlap > 0) score += Math.min(0.3, growthOverlap * 0.15);
  }

  // Geographic match (local queries for local businesses)
  if (geo && k.includes(geo)) score += 0.2;

  return Math.min(1.5, score);
}

// ─── Rationale generator ─────────────────────────────────────────────────
function buildRationale(
  kw: SourceKeyword,
  intent: PriorityKeyword['intent'],
  feas: ReturnType<typeof feasibility>,
): string {
  const parts: string[] = [];

  // Source context
  if (kw.source === 'current' && kw.position != null) {
    if (kw.position <= 10) parts.push(`Ya estás en top 10 (pos ${kw.position}) — defender posición`);
    else if (kw.position <= 20) parts.push(`A un empujón del top 10 (pos ${kw.position})`);
    else if (kw.position <= 30) parts.push(`Posición ${kw.position}: reachable con contenido optimizado`);
    else parts.push(`Posición actual ${kw.position}: requiere más trabajo`);
  } else if (kw.source === 'gap') {
    parts.push('Tu competencia rankea y tú no — oportunidad clara');
  } else if (kw.source === 'generated') {
    parts.push('Sugerida por análisis semántico de tu negocio');
  }

  // Intent
  if (intent === 'transactional') parts.push('intención de compra directa');
  else if (intent === 'commercial') parts.push('intención comparativa');

  // Feasibility summary
  if (feas.label === 'high') parts.push('viabilidad alta');
  else if (feas.label === 'low') parts.push('requiere autoridad extra');

  return parts.join(' · ');
}

// ─── Main scoring function ───────────────────────────────────────────────
function scoreKeyword(
  kw: SourceKeyword,
  context: ScoringContext,
): PriorityKeyword {
  const intent = detectIntent(kw.keyword);
  const feas = feasibility(kw.position, kw.difficulty);
  const uv = usefulVolume(kw.volume, intent, context.focus);
  const align = alignment(kw.keyword, context);

  // If client wants to capture existing demand, boost low-funnel;
  // if they want to create demand, slightly boost informational.
  let demandMultiplier = 1.0;
  if (context.demandType === 'existing' && intent !== 'informational') demandMultiplier = 1.15;
  if (context.demandType === 'create' && intent === 'informational') demandMultiplier = 1.2;

  const opportunityScore = Math.round(feas.score * uv * align * demandMultiplier * 20);

  return {
    keyword: kw.keyword,
    volume: kw.volume,
    currentPosition: kw.position,
    difficulty: kw.difficulty,
    feasibility: feas.label,
    intent,
    rationale: buildRationale(kw, intent, feas),
    source: kw.source,
    opportunityScore,
  };
}

// ─── Candidate collection from pipeline output ───────────────────────────
function collectCandidates(pipelineOutput: Record<string, any>): SourceKeyword[] {
  const candidates: SourceKeyword[] = [];
  const seen = new Set<string>();

  const add = (kw: SourceKeyword) => {
    const key = kw.keyword.toLowerCase().trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    candidates.push(kw);
  };

  // Source 1: current keywords (already ranking)
  const topKeywords = (pipelineOutput?.seo?.topKeywords || []) as Array<any>;
  for (const k of topKeywords) {
    if (!k.keyword) continue;
    add({
      keyword: k.keyword,
      volume: k.volume,
      position: k.position,
      difficulty: k.difficulty,
      source: 'current',
    });
  }

  // Source 2: competitor gap
  const gapItems = (pipelineOutput?.keyword_gap?.items || []) as Array<any>;
  for (const k of gapItems) {
    if (!k.keyword) continue;
    add({
      keyword: k.keyword,
      volume: k.volume,
      position: k.position,   // competitor position, used only for context
      difficulty: k.difficulty,
      source: 'gap',
    });
  }

  // Source 3: GSC queries (queries that Google already shows you for)
  const gscQueries = (pipelineOutput?.analytics?.gsc?.topQueries || []) as Array<any>;
  for (const q of gscQueries) {
    if (!q.query) continue;
    add({
      keyword: q.query,
      volume: q.impressions,
      position: Math.round(q.position || 50),
      source: 'current',
    });
  }

  return candidates;
}

// ─── AI-generated candidates (stub — can be replaced with Claude call) ───
// For now, derive from business description tokens + known sector patterns.
// This is a conservative fallback; a production version would call Claude
// with the business description + competitor data to brainstorm net-new queries.
function generateFromBusiness(
  description: string,
  geoDetail: string | undefined,
): SourceKeyword[] {
  if (!description) return [];
  const generated: SourceKeyword[] = [];
  const desc = description.toLowerCase();

  // Extract the main "thing" and "audience" from the description
  // Heuristic: look for noun phrases around the first 10 meaningful tokens
  const tokens = desc.split(/\W+/).filter(t => t.length > 3 && !STOP_WORDS.has(t));
  const head = tokens.slice(0, 6);

  if (head.length === 0) return [];

  // Build a few generic candidate patterns
  const base = head.slice(0, 3).join(' ');
  const patterns = [
    `mejor ${base}`,
    `${base} para pymes`,
    `comparativa ${base}`,
  ];
  if (geoDetail) {
    patterns.push(`${base} ${geoDetail.toLowerCase()}`);
    patterns.push(`${head[0]} en ${geoDetail.toLowerCase()}`);
  }

  for (const p of patterns) {
    generated.push({
      keyword: p,
      volume: undefined,        // unknown until you query DataForSEO
      difficulty: undefined,
      source: 'generated',
    });
  }

  return generated;
}

const STOP_WORDS = new Set([
  'para', 'como', 'con', 'sin', 'por', 'del', 'los', 'las', 'una', 'uno',
  'que', 'más', 'son', 'este', 'esta', 'estos', 'estas', 'empresa', 'pyme',
  'pymes', 'negocio', 'servicio', 'servicios',
]);

// ─── Public API ──────────────────────────────────────────────────────────
export interface KeywordOpportunityInput {
  pipelineOutput: Record<string, any>;
  onboarding: ClientOnboarding | null;
  strategy?: KeywordStrategy;
  limit?: number;
}

export function computeKeywordOpportunities(
  input: KeywordOpportunityInput,
): PriorityKeyword[] {
  const { pipelineOutput, onboarding, strategy, limit = 15 } = input;

  const context: ScoringContext = {
    businessDescription: onboarding?.business_description,
    growthService: strategy?.growthService,
    demandType: strategy?.demandType,
    focus: strategy?.focus,
    geoDetail: onboarding?.geo_detail,
  };

  // Collect from 3 sources
  const candidates = collectCandidates(pipelineOutput);
  const generated = generateFromBusiness(
    onboarding?.business_description || '',
    onboarding?.geo_detail,
  );
  for (const g of generated) {
    const key = g.keyword.toLowerCase().trim();
    if (!candidates.some(c => c.keyword.toLowerCase() === key)) {
      candidates.push(g);
    }
  }

  // Score and sort
  const scored = candidates
    .map(c => scoreKeyword(c, context))
    .sort((a, b) => (b.opportunityScore || 0) - (a.opportunityScore || 0));

  return scored.slice(0, limit);
}

// ─── Auto-select sensible defaults ───────────────────────────────────────
// Pick the top-N keywords that form a balanced portfolio:
// - Prefer "easy wins" (current top 11-30 or high feasibility)
// - Mix intents (not all transactional, not all informational)
// - Respect growth service if defined
export function autoSelectPriorities(
  opportunities: PriorityKeyword[],
  count = 8,
): PriorityKeyword[] {
  // 1. Take all "high feasibility" ones first (up to count)
  const high = opportunities.filter(o => o.feasibility === 'high');
  if (high.length >= count) return high.slice(0, count);

  // 2. Fill with medium
  const medium = opportunities.filter(o => o.feasibility === 'medium');
  const combined = [...high, ...medium];
  if (combined.length >= count) return combined.slice(0, count);

  // 3. Fill with whatever is left
  return opportunities.slice(0, count);
}
