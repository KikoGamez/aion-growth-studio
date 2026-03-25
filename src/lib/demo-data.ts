// Demo data for "Soluciones Verdes" — used when IS_DEMO = true (no Supabase configured)

export type Tier = 'radar' | 'señales' | 'palancas';

export interface Client {
  id: string;
  name: string;
  domain: string;
  tier: Tier;
  sector: string;
}

export interface Snapshot {
  id: string;
  clientId: string;
  date: string; // "2026-03-01"
  month: string; // "marzo-2026"
  score: number;
  pipeline_output: Record<string, any>;
}

export interface Alert {
  id: string;
  clientId: string;
  type: 'seo' | 'geo' | 'competitor' | 'web' | 'paid';
  severity: 'critical' | 'warning' | 'positive';
  title: string;
  description: string;
  detail?: string;
  timestamp: string;
}

export interface ContextEntry {
  id: string;
  clientId: string;
  type: 'action' | 'insight';
  title: string;
  status?: 'done' | 'in_progress' | 'pending';
  impact?: 'high' | 'medium' | 'low';
  date: string;
}

export interface User {
  id: string;
  clientId: string;
  name: string;
  email: string;
  role: 'admin' | 'viewer';
}

// ─── Demo Client ───────────────────────────────────────────────────────────────

export const DEMO_CLIENT: Client = {
  id: 'demo-client-01',
  name: 'Soluciones Verdes',
  domain: 'solucionesverdes.es',
  tier: 'señales',
  sector: 'Sostenibilidad B2B',
};

// ─── Demo Snapshots ────────────────────────────────────────────────────────────

export const DEMO_SNAPSHOTS: Snapshot[] = [
  {
    id: 'snap-2026-01',
    clientId: 'demo-client-01',
    date: '2026-01-01',
    month: 'enero-2026',
    score: 62,
    pipeline_output: {
      seo: {
        keywordsTop10: 18,
        organicTrafficEstimate: 8200,
        paidKeywordsTotal: 0,
        topKeywords: [
          { keyword: 'soluciones sostenibles empresa', volume: 1200, position: 4, difficulty: 38 },
          { keyword: 'consultoría sostenibilidad B2B', volume: 880, position: 7, difficulty: 42 },
          { keyword: 'certificación ISO 14001', volume: 2100, position: 9, difficulty: 55 },
        ],
      },
      geo: { mentionRate: 12, mentions: 2, totalQueries: 15 },
      pagespeed: { mobile: { performance: 58 }, desktop: { performance: 82 } },
      competitors: {
        competitors: ['EcoSoluciones.com', 'SosteniblePlus.es', 'GreenBiz.es'],
      },
      competitor_traffic: {
        items: [
          { domain: 'EcoSoluciones.com', organicTrafficEstimate: 14500, keywordsTop10: 42 },
          { domain: 'SosteniblePlus.es', organicTrafficEstimate: 9800, keywordsTop10: 28 },
        ],
      },
      insights: {
        summary: 'Presencia digital por debajo del sector. Oportunidad clara en contenido B2B.',
        bullets: [
          'Optimizar Core Web Vitals en mobile',
          'Crear silos de contenido para SEO local',
          'Activar campaña Google Ads para captar demanda',
        ],
      },
      meta_ads: { skipped: true },
      keyword_gap: {
        items: [
          { keyword: 'gestión residuos empresa', volume: 1800, difficulty: 35, competitorRanks: ['EcoSoluciones.com'] },
          { keyword: 'huella carbono pymes', volume: 950, difficulty: 28, competitorRanks: ['SosteniblePlus.es'] },
        ],
      },
    },
  },
  {
    id: 'snap-2026-02',
    clientId: 'demo-client-01',
    date: '2026-02-01',
    month: 'febrero-2026',
    score: 68,
    pipeline_output: {
      seo: {
        keywordsTop10: 24,
        organicTrafficEstimate: 10800,
        paidKeywordsTotal: 0,
        topKeywords: [
          { keyword: 'soluciones sostenibles empresa', volume: 1200, position: 3, difficulty: 38 },
          { keyword: 'consultoría sostenibilidad B2B', volume: 880, position: 5, difficulty: 42 },
          { keyword: 'certificación ISO 14001', volume: 2100, position: 7, difficulty: 55 },
        ],
      },
      geo: { mentionRate: 18, mentions: 3, totalQueries: 15 },
      pagespeed: { mobile: { performance: 65 }, desktop: { performance: 87 } },
      competitors: {
        competitors: ['EcoSoluciones.com', 'SosteniblePlus.es', 'GreenBiz.es'],
      },
      competitor_traffic: {
        items: [
          { domain: 'EcoSoluciones.com', organicTrafficEstimate: 15200, keywordsTop10: 45 },
          { domain: 'SosteniblePlus.es', organicTrafficEstimate: 10100, keywordsTop10: 31 },
        ],
      },
      insights: {
        summary: 'Mejora sostenida en SEO orgánico. Oportunidad en GEO y paid.',
        bullets: [
          'Implementar Schema FAQ en páginas clave',
          'Activar Google Ads búsqueda',
          'Publicar 2 artículos de blog/mes',
        ],
      },
      meta_ads: { skipped: true },
      keyword_gap: {
        items: [
          { keyword: 'gestión residuos empresa', volume: 1800, difficulty: 35, competitorRanks: ['EcoSoluciones.com'] },
          { keyword: 'huella carbono pymes', volume: 950, difficulty: 28, competitorRanks: ['SosteniblePlus.es'] },
          { keyword: 'consultoría ambiental Madrid', volume: 720, difficulty: 22, competitorRanks: ['GreenBiz.es'] },
        ],
      },
    },
  },
  {
    id: 'snap-2026-03',
    clientId: 'demo-client-01',
    date: '2026-03-01',
    month: 'marzo-2026',
    score: 74,
    pipeline_output: {
      seo: {
        keywordsTop10: 31,
        organicTrafficEstimate: 12400,
        paidKeywordsTotal: 14,
        topKeywords: [
          { keyword: 'soluciones sostenibles empresa', volume: 1200, position: 2, difficulty: 38 },
          { keyword: 'consultoría sostenibilidad B2B', volume: 880, position: 4, difficulty: 42 },
          { keyword: 'certificación ISO 14001', volume: 2100, position: 6, difficulty: 55 },
          { keyword: 'gestión residuos empresa', volume: 1800, position: 8, difficulty: 35 },
        ],
      },
      geo: { mentionRate: 26, mentions: 4, totalQueries: 15 },
      pagespeed: { mobile: { performance: 72 }, desktop: { performance: 91 } },
      competitors: {
        competitors: ['EcoSoluciones.com', 'SosteniblePlus.es', 'GreenBiz.es'],
      },
      competitor_traffic: {
        items: [
          { domain: 'EcoSoluciones.com', organicTrafficEstimate: 16100, keywordsTop10: 48, mobilePerformance: 68 },
          { domain: 'SosteniblePlus.es', organicTrafficEstimate: 10900, keywordsTop10: 33, mobilePerformance: 71 },
          { domain: 'GreenBiz.es', organicTrafficEstimate: 6200, keywordsTop10: 19, mobilePerformance: 55 },
        ],
      },
      insights: {
        summary: 'Progreso notable este mes. El lanzamiento de Ads ha captado tráfico cualificado.',
        bullets: [
          'Creación de 5 silos de contenido SEO local (en progreso)',
          'Configurar seguimiento de conversiones offline',
          'Ampliar campaña Ads a palabras de competidores',
          'Mejorar landing de captación B2B',
        ],
      },
      meta_ads: {
        spend: 1240,
        clicks: 382,
        conversions: 8,
        cpa: 155,
        roas: 3.2,
        campaigns: ['Captación B2B General', 'Sostenibilidad Madrid'],
      },
      keyword_gap: {
        items: [
          { keyword: 'gestión residuos empresa', volume: 1800, difficulty: 35, position: 8, competitor: 'EcoSoluciones.com', impact: 'high', priority: 'quick-win' },
          { keyword: 'huella carbono pymes', volume: 950, difficulty: 28, position: null, competitor: 'SosteniblePlus.es', impact: 'high', priority: 'oportunidad' },
          { keyword: 'consultoría ambiental Madrid', volume: 720, difficulty: 22, position: null, competitor: 'GreenBiz.es', impact: 'medium', priority: 'quick-win' },
          { keyword: 'auditoría medioambiental empresa', volume: 590, difficulty: 31, position: null, competitor: 'EcoSoluciones.com', impact: 'medium', priority: 'oportunidad' },
          { keyword: 'certificación sostenibilidad pymes', volume: 480, difficulty: 19, position: null, competitor: null, impact: 'low', priority: 'oportunidad' },
        ],
      },
    },
  },
];

// ─── Demo Alerts ───────────────────────────────────────────────────────────────

export const DEMO_ALERTS: Alert[] = [
  {
    id: 'alert-01',
    clientId: 'demo-client-01',
    type: 'seo',
    severity: 'critical',
    title: 'Caída en CTR Orgánico',
    description: 'Keywords principales han bajado -12% de clics en 48h.',
    detail: 'Las keywords "soluciones sostenibles empresa" y "consultoría sostenibilidad" han perdido posición en las SERPs. Revisar cambios en la SERP y posibles actualizaciones de algoritmo.',
    timestamp: '2026-03-22T10:30:00Z',
  },
  {
    id: 'alert-02',
    clientId: 'demo-client-01',
    type: 'competitor',
    severity: 'warning',
    title: 'Nuevo competidor detectado',
    description: 'SosteniblePlus.es ha incrementado puja en tus keywords.',
    detail: 'SosteniblePlus.es ha comenzado a pujar por las keywords "certificación ISO 14001" y "gestión residuos empresa" con un CPC estimado de 2.40€.',
    timestamp: '2026-03-23T09:12:00Z',
  },
  {
    id: 'alert-03',
    clientId: 'demo-client-01',
    type: 'seo',
    severity: 'positive',
    title: 'Backlink de Alta Autoridad',
    description: 'ElDiario.es ha enlazado tu guía de sostenibilidad.',
    detail: 'El artículo "Guía definitiva de sostenibilidad para empresas" ha recibido un enlace desde ElDiario.es (DA 78). Esto reforzará la autoridad de dominio en las próximas semanas.',
    timestamp: '2026-03-21T18:45:00Z',
  },
  {
    id: 'alert-04',
    clientId: 'demo-client-01',
    type: 'web',
    severity: 'warning',
    title: 'Core Web Vitals — LCP elevado',
    description: 'El Largest Contentful Paint en mobile supera los 3.5s.',
    detail: 'La página principal tarda 3.7s en mostrar el contenido principal en mobile. Impacta negativamente al ranking y a la tasa de conversión. Comprimir imágenes hero y activar lazy loading.',
    timestamp: '2026-03-20T14:00:00Z',
  },
  {
    id: 'alert-05',
    clientId: 'demo-client-01',
    type: 'geo',
    severity: 'positive',
    title: 'Nueva mención en ChatGPT',
    description: 'Soluciones Verdes aparece en respuestas sobre "consultoría ambiental Madrid".',
    detail: 'ChatGPT menciona Soluciones Verdes en el 26% de las consultas sobre sostenibilidad B2B en Madrid. Arriba desde el 18% del mes pasado.',
    timestamp: '2026-03-19T11:20:00Z',
  },
];

// ─── Demo Context Entries ──────────────────────────────────────────────────────

export const DEMO_CONTEXT_ENTRIES: ContextEntry[] = [
  {
    id: 'ctx-01',
    clientId: 'demo-client-01',
    type: 'action',
    title: 'Optimización de Core Web Vitals (Mobile)',
    status: 'done',
    impact: 'high',
    date: '2026-02-15',
  },
  {
    id: 'ctx-02',
    clientId: 'demo-client-01',
    type: 'action',
    title: 'Creación de 5 Silos de Contenido para SEO Local',
    status: 'in_progress',
    impact: 'high',
    date: '2026-03-01',
  },
  {
    id: 'ctx-03',
    clientId: 'demo-client-01',
    type: 'insight',
    title: 'El sector sostenibilidad B2B crece un 34% en búsquedas locales este Q1',
    date: '2026-03-10',
  },
];

// ─── Demo Users ────────────────────────────────────────────────────────────────

export const DEMO_USERS: User[] = [
  {
    id: 'user-01',
    clientId: 'demo-client-01',
    name: 'María González',
    email: 'maria@solucionesverdes.es',
    role: 'admin',
  },
  {
    id: 'user-02',
    clientId: 'demo-client-01',
    name: 'Juan Pérez',
    email: 'juan@solucionesverdes.es',
    role: 'viewer',
  },
];
