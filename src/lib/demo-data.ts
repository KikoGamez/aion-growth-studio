// Demo data for "TechSolutions Barcelona" — used when IS_DEMO = true (no Supabase configured)

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
  date: string;
  month: string;
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
  name: 'TechSolutions Barcelona',
  domain: 'techsolutions.es',
  tier: 'señales',
  sector: 'Software B2B',
};

// ─── Demo Onboarding ──────────────────────────────────────────────────────────

export const DEMO_ONBOARDING = {
  client_id: 'demo-client-01',
  business_description: 'Software de gestión de RRHH para pymes de 10 a 200 empleados en España',
  primary_goal: 'generate_leads',
  goal_detail: 'Captar directores de RRHH de pymes en Barcelona y área metropolitana',
  geo_scope: 'local_city',
  geo_detail: 'Barcelona',
  url_architecture: 'single_url',
  monthly_budget: '500-2000',
  team_size: '2-5',
  competitors: [
    { url: 'https://devify.io', name: 'Devify' },
    { url: 'https://softcatala.tech', name: 'SoftCatalà' },
    { url: 'https://bcncode.es', name: 'BCN Code' },
  ],
  completed_at: '2026-02-15T10:00:00Z',
};

// ─── Demo Snapshots (8 semanas) ───────────────────────────────────────────────

const COMPETITORS = ['devify.io', 'softcatala.tech', 'bcncode.es'];

export const DEMO_SNAPSHOTS: Snapshot[] = [
  // ── Semana 1: feb-17 ──
  {
    id: 'snap-w01',
    clientId: 'demo-client-01',
    date: '2026-02-17',
    month: 'febrero-2026',
    score: 28,
    pipeline_output: {
      seo: {
        keywordsTop10: 8,
        organicTrafficEstimate: 3200,
        domainRank: 18200,
        paidKeywordsTotal: 0,
        topKeywords: [
          { keyword: 'software rrhh pymes', volume: 1400, position: 14, difficulty: 45 },
          { keyword: 'gestión personal barcelona', volume: 720, position: 18, difficulty: 32 },
          { keyword: 'programa nóminas pymes', volume: 980, position: 22, difficulty: 51 },
        ],
      },
      geo: { mentionRate: 7, mentions: 1, totalQueries: 15 },
      pagespeed: {
        mobile: { performance: 52, lcp: 3800, cls: 0.18, fcp: 2100, ttfb: 890 },
        desktop: { performance: 74, lcp: 1800, cls: 0.05, fcp: 900, ttfb: 420 },
      },
      conversion: { funnelScore: 35, hasContactForm: true, formCount: 1, ctaCount: 2, hasLeadMagnet: false },
      content_cadence: { totalPosts: 4, lastPostDate: '2025-12-10', daysSinceLastPost: 69, postsLast90Days: 1, cadenceLevel: 'inactive' },
      reputation: { gbpRating: null, totalReviews: 0, trustpilotRating: null, newsCount: 0 },
      competitors: { competitors: COMPETITORS },
      competitor_traffic: {
        items: [
          { domain: 'devify.io', organicTrafficEstimate: 12400, keywordsTop10: 45, domainRank: 8900, mobilePerformance: 78 },
          { domain: 'softcatala.tech', organicTrafficEstimate: 8900, keywordsTop10: 32, domainRank: 11200, mobilePerformance: 71 },
          { domain: 'bcncode.es', organicTrafficEstimate: 5100, keywordsTop10: 18, domainRank: 15600, mobilePerformance: 65 },
        ],
      },
      insights: {
        summary: 'TechSolutions tiene presencia digital básica. La web es lenta en mobile, no hay blog activo, y la visibilidad frente a competidores es baja. Hay oportunidad clara en SEO local para Barcelona.',
        bullets: [
          'Activar HTTPS con redirección 301',
          'Configurar Google Business Profile Barcelona',
          'Optimizar PageSpeed mobile (actualmente 52/100)',
        ],
      },
      instagram: { found: true, handle: 'techsolutions.bcn', followers: 620, posts: 32, engagementRate: 0.8, avgLikes: 5, avgComments: 1, postsLast90Days: 0, postsLast7Days: 0, lastPostDate: '2025-11-20' },
      linkedin: { found: true, name: 'TechSolutions Barcelona', followers: 890, employees: '11-50', industry: 'Software Development' },
      meta_ads: { skipped: true },
      keyword_gap: {
        items: [
          { keyword: 'software recursos humanos', volume: 2400, difficulty: 48, position: null, competitor: 'devify.io', impact: 'high', priority: 'oportunidad' },
          { keyword: 'app control horario', volume: 1900, difficulty: 35, position: null, competitor: 'softcatala.tech', impact: 'high', priority: 'quick-win' },
        ],
      },
      briefing: {
        summary: 'TechSolutions Barcelona parte de un score 28/100 — por debajo de la media del sector software B2B. Tu competidor principal Devify te supera en 17 puntos de SEO. La prioridad inmediata es establecer las bases: activar HTTPS, configurar GBP Barcelona y mejorar la velocidad mobile.',
        priorities: [
          { title: 'Activar HTTPS con redirección 301', description: 'Tu web no tiene SSL activo. Esto penaliza SEO y genera desconfianza.', impact: 'high' },
          { title: 'Configurar Google Business Profile', description: 'No tienes ficha de negocio en Google. Como empresa local en Barcelona, esto es crítico para captar leads.', impact: 'high' },
          { title: 'Optimizar LCP mobile (actualmente 3.8s)', description: 'El Largest Contentful Paint penaliza tu posicionamiento mobile. Objetivo: <2.5s.', impact: 'high' },
        ],
        quickWins: [
          'Comprimir imágenes hero (ahorrará ~40% de peso)',
          'Añadir meta descriptions a las 5 páginas principales',
          'Crear perfil en Google Business Profile (30 min)',
        ],
        warnings: [
          'Sin blog activo desde diciembre — perdiendo oportunidades de indexación',
          'Devify te supera en tráfico orgánico 4x — la brecha crece cada mes',
        ],
        generatedAt: '2026-02-17T06:00:00Z',
      },
    },
  },
  // ── Semana 2: feb-24 ──
  {
    id: 'snap-w02',
    clientId: 'demo-client-01',
    date: '2026-02-24',
    month: 'febrero-2026',
    score: 29,
    pipeline_output: {
      seo: { keywordsTop10: 9, organicTrafficEstimate: 3350, domainRank: 17800, paidKeywordsTotal: 0, topKeywords: [
        { keyword: 'software rrhh pymes', volume: 1400, position: 13, difficulty: 45 },
        { keyword: 'gestión personal barcelona', volume: 720, position: 16, difficulty: 32 },
      ]},
      geo: { mentionRate: 7, mentions: 1, totalQueries: 15 },
      pagespeed: { mobile: { performance: 54, lcp: 3600, cls: 0.15, fcp: 2000, ttfb: 850 }, desktop: { performance: 76, lcp: 1700, cls: 0.04, fcp: 870, ttfb: 400 } },
      conversion: { funnelScore: 35, hasContactForm: true, formCount: 1, ctaCount: 2, hasLeadMagnet: false },
      content_cadence: { totalPosts: 4, lastPostDate: '2025-12-10', daysSinceLastPost: 76, postsLast90Days: 0, cadenceLevel: 'inactive' },
      reputation: { gbpRating: null, totalReviews: 0, trustpilotRating: null, newsCount: 0 },
      competitors: { competitors: COMPETITORS },
      competitor_traffic: {
        items: [
          { domain: 'devify.io', organicTrafficEstimate: 12600, keywordsTop10: 46, domainRank: 8800, mobilePerformance: 79 },
          { domain: 'softcatala.tech', organicTrafficEstimate: 9000, keywordsTop10: 33, domainRank: 11100, mobilePerformance: 72 },
          { domain: 'bcncode.es', organicTrafficEstimate: 5200, keywordsTop10: 19, domainRank: 15400, mobilePerformance: 65 },
        ],
      },
      insights: { summary: 'Ligera mejora en posiciones SEO. La web sigue sin SSL ni GBP.', bullets: ['Activar HTTPS urgente', 'Crear GBP', 'Empezar a publicar en blog'] },
      instagram: { found: true, handle: 'techsolutions.bcn', followers: 625, posts: 32, engagementRate: 0.8, avgLikes: 5, avgComments: 1, postsLast90Days: 0, postsLast7Days: 0, lastPostDate: '2025-11-20' },
      linkedin: { found: true, name: 'TechSolutions Barcelona', followers: 900, employees: '11-50', industry: 'Software Development' },
      meta_ads: { skipped: true },
      keyword_gap: { items: [
        { keyword: 'software recursos humanos', volume: 2400, difficulty: 48, position: null, competitor: 'devify.io', impact: 'high', priority: 'oportunidad' },
      ]},
      briefing: {
        summary: 'Score 29 (+1 vs semana anterior). Sin cambios estructurales aún — las mejoras son orgánicas por fluctuación de SERPs. Las acciones prioritarias de la semana pasada (HTTPS, GBP) siguen pendientes.',
        priorities: [
          { title: 'Activar HTTPS con redirección 301', description: 'Sigue siendo la acción más urgente. Penaliza SEO y conversión.', impact: 'high' },
          { title: 'Configurar Google Business Profile', description: 'Cada semana sin GBP es tráfico local que va a Devify.', impact: 'high' },
          { title: 'Publicar primer artículo de blog', description: 'Romper la inactividad de contenido. Tema sugerido: "Cómo elegir software RRHH para tu pyme".', impact: 'medium' },
        ],
        quickWins: ['Activar SSL en el hosting (1 hora)', 'Escribir meta description para la home'],
        warnings: ['78 días sin publicar contenido', 'Sin SSL — Chrome marca tu web como "No segura"'],
        generatedAt: '2026-02-24T06:00:00Z',
      },
    },
  },
  // ── Semana 3: mar-03 (HTTPS activado) ──
  {
    id: 'snap-w03',
    clientId: 'demo-client-01',
    date: '2026-03-03',
    month: 'marzo-2026',
    score: 31,
    pipeline_output: {
      seo: { keywordsTop10: 10, organicTrafficEstimate: 3500, domainRank: 17200, paidKeywordsTotal: 0, topKeywords: [
        { keyword: 'software rrhh pymes', volume: 1400, position: 12, difficulty: 45 },
        { keyword: 'gestión personal barcelona', volume: 720, position: 14, difficulty: 32 },
        { keyword: 'programa nóminas pymes', volume: 980, position: 19, difficulty: 51 },
      ]},
      geo: { mentionRate: 13, mentions: 2, totalQueries: 15 },
      pagespeed: { mobile: { performance: 58, lcp: 3200, cls: 0.12, fcp: 1800, ttfb: 780 }, desktop: { performance: 80, lcp: 1500, cls: 0.03, fcp: 800, ttfb: 380 } },
      conversion: { funnelScore: 38, hasContactForm: true, formCount: 1, ctaCount: 3, hasLeadMagnet: false },
      content_cadence: { totalPosts: 5, lastPostDate: '2026-03-01', daysSinceLastPost: 2, postsLast90Days: 1, cadenceLevel: 'low' },
      reputation: { gbpRating: 4.2, totalReviews: 3, trustpilotRating: null, newsCount: 0 },
      competitors: { competitors: COMPETITORS },
      competitor_traffic: {
        items: [
          { domain: 'devify.io', organicTrafficEstimate: 12800, keywordsTop10: 47, domainRank: 8700, mobilePerformance: 79 },
          { domain: 'softcatala.tech', organicTrafficEstimate: 9100, keywordsTop10: 33, domainRank: 11000, mobilePerformance: 72 },
          { domain: 'bcncode.es', organicTrafficEstimate: 5300, keywordsTop10: 19, domainRank: 15300, mobilePerformance: 66 },
        ],
      },
      insights: { summary: 'Semana de avances: HTTPS activado, GBP creado con 3 reseñas iniciales, primer post publicado.', bullets: ['HTTPS activo — impacto SEO en 2-3 semanas', 'GBP Barcelona con 3 reseñas (objetivo: 10)', 'Seguir publicando en blog'] },
      instagram: { found: true, handle: 'techsolutions.bcn', followers: 640, posts: 33, engagementRate: 1.1, avgLikes: 7, avgComments: 1, postsLast90Days: 1, postsLast7Days: 1, lastPostDate: '2026-03-02' },
      linkedin: { found: true, name: 'TechSolutions Barcelona', followers: 920, employees: '11-50', industry: 'Software Development' },
      meta_ads: { skipped: true },
      keyword_gap: { items: [
        { keyword: 'software recursos humanos', volume: 2400, difficulty: 48, position: null, competitor: 'devify.io', impact: 'high', priority: 'oportunidad' },
        { keyword: 'app control horario', volume: 1900, difficulty: 35, position: null, competitor: 'softcatala.tech', impact: 'high', priority: 'quick-win' },
      ]},
      briefing: {
        summary: 'Score 31 (+2). HTTPS activado y GBP creado esta semana — buen progreso. El primer post de blog rompe 85 días de inactividad. Ahora toca consolidar: más reseñas en GBP y seguir publicando.',
        priorities: [
          { title: 'Conseguir 7 reseñas más en GBP', description: 'Tienes 3/10 objetivo. Pide a clientes actuales que dejen reseña.', impact: 'high' },
          { title: 'Publicar segundo artículo de blog', description: 'Mantener cadencia quincenal. Tema: "5 señales de que tu gestión de nóminas necesita automatizarse".', impact: 'medium' },
          { title: 'Optimizar LCP mobile', description: 'Bajó de 3.8s a 3.2s pero sigue por encima del umbral de 2.5s.', impact: 'high' },
        ],
        quickWins: ['Enviar email a 5 clientes pidiendo reseña en Google', 'Comprimir las 3 imágenes más pesadas de la home'],
        warnings: ['LCP mobile sigue en 3.2s — penalización activa de Google'],
        generatedAt: '2026-03-03T06:00:00Z',
      },
    },
  },
  // ── Semana 4: mar-10 ──
  {
    id: 'snap-w04',
    clientId: 'demo-client-01',
    date: '2026-03-10',
    month: 'marzo-2026',
    score: 31,
    pipeline_output: {
      seo: { keywordsTop10: 11, organicTrafficEstimate: 3600, domainRank: 16800, paidKeywordsTotal: 0, topKeywords: [
        { keyword: 'software rrhh pymes', volume: 1400, position: 11, difficulty: 45 },
        { keyword: 'gestión personal barcelona', volume: 720, position: 13, difficulty: 32 },
      ]},
      geo: { mentionRate: 13, mentions: 2, totalQueries: 15 },
      pagespeed: { mobile: { performance: 60, lcp: 3000, cls: 0.10, fcp: 1700, ttfb: 720 }, desktop: { performance: 82, lcp: 1400, cls: 0.03, fcp: 780, ttfb: 360 } },
      conversion: { funnelScore: 38, hasContactForm: true, formCount: 1, ctaCount: 3, hasLeadMagnet: false },
      content_cadence: { totalPosts: 5, lastPostDate: '2026-03-01', daysSinceLastPost: 9, postsLast90Days: 1, cadenceLevel: 'low' },
      reputation: { gbpRating: 4.3, totalReviews: 6, trustpilotRating: null, newsCount: 0 },
      competitors: { competitors: COMPETITORS },
      competitor_traffic: {
        items: [
          { domain: 'devify.io', organicTrafficEstimate: 13000, keywordsTop10: 48, domainRank: 8600, mobilePerformance: 80 },
          { domain: 'softcatala.tech', organicTrafficEstimate: 9200, keywordsTop10: 34, domainRank: 10900, mobilePerformance: 73 },
          { domain: 'bcncode.es', organicTrafficEstimate: 5400, keywordsTop10: 20, domainRank: 15200, mobilePerformance: 66 },
        ],
      },
      insights: { summary: 'Semana de consolidación. GBP crece a 6 reseñas. PageSpeed mobile mejora a 60.', bullets: ['Seguir con reseñas GBP', 'Publicar segundo artículo', 'Considerar lead magnet'] },
      instagram: { found: true, handle: 'techsolutions.bcn', followers: 660, posts: 34, engagementRate: 1.2, avgLikes: 8, avgComments: 1, postsLast90Days: 2, postsLast7Days: 1, lastPostDate: '2026-03-09' },
      linkedin: { found: true, name: 'TechSolutions Barcelona', followers: 950, employees: '11-50', industry: 'Software Development' },
      meta_ads: { skipped: true },
      keyword_gap: { items: [
        { keyword: 'software recursos humanos', volume: 2400, difficulty: 48, position: null, competitor: 'devify.io', impact: 'high', priority: 'oportunidad' },
      ]},
      briefing: {
        summary: 'Score estable en 31. El efecto del HTTPS y GBP aún no se refleja completamente en rankings — es normal, Google tarda 2-4 semanas. Las reseñas van bien (6/10). Falta publicar el segundo post.',
        priorities: [
          { title: 'Crear landing específica por servicio', description: 'Una landing para "software RRHH pymes" y otra para "control horario". Mejorará conversión y SEO.', impact: 'high' },
          { title: 'Publicar segundo post del blog', description: 'Llevas 9 días desde el último. Objetivo: mínimo 2 posts/mes.', impact: 'medium' },
          { title: 'Implementar schema markup Organization', description: 'Google necesita entender tu negocio. Schema ayuda en GEO y rich snippets.', impact: 'medium' },
        ],
        quickWins: ['Añadir CTA de demo gratuita en la home', 'Pedir 4 reseñas más para llegar a 10'],
        warnings: ['Devify ha publicado 3 artículos esta semana — están acelerando contenido'],
        generatedAt: '2026-03-10T06:00:00Z',
      },
    },
  },
  // ── Semana 5: mar-17 ──
  {
    id: 'snap-w05',
    clientId: 'demo-client-01',
    date: '2026-03-17',
    month: 'marzo-2026',
    score: 33,
    pipeline_output: {
      seo: { keywordsTop10: 13, organicTrafficEstimate: 3900, domainRank: 16100, paidKeywordsTotal: 0, topKeywords: [
        { keyword: 'software rrhh pymes', volume: 1400, position: 9, difficulty: 45 },
        { keyword: 'gestión personal barcelona', volume: 720, position: 11, difficulty: 32 },
        { keyword: 'programa nóminas pymes', volume: 980, position: 16, difficulty: 51 },
      ]},
      geo: { mentionRate: 13, mentions: 2, totalQueries: 15 },
      pagespeed: { mobile: { performance: 62, lcp: 2800, cls: 0.08, fcp: 1600, ttfb: 680 }, desktop: { performance: 84, lcp: 1300, cls: 0.02, fcp: 720, ttfb: 340 } },
      conversion: { funnelScore: 40, hasContactForm: true, formCount: 2, ctaCount: 4, hasLeadMagnet: false },
      content_cadence: { totalPosts: 6, lastPostDate: '2026-03-14', daysSinceLastPost: 3, postsLast90Days: 2, cadenceLevel: 'low' },
      reputation: { gbpRating: 4.4, totalReviews: 9, trustpilotRating: null, newsCount: 0 },
      competitors: { competitors: COMPETITORS },
      competitor_traffic: {
        items: [
          { domain: 'devify.io', organicTrafficEstimate: 13200, keywordsTop10: 49, domainRank: 8500, mobilePerformance: 80 },
          { domain: 'softcatala.tech', organicTrafficEstimate: 9300, keywordsTop10: 34, domainRank: 10800, mobilePerformance: 73 },
          { domain: 'bcncode.es', organicTrafficEstimate: 5500, keywordsTop10: 20, domainRank: 15100, mobilePerformance: 67 },
        ],
      },
      insights: { summary: 'El efecto HTTPS empieza a notarse: +2 score, keywords top10 suben a 13. Segunda landing creada.', bullets: ['Lanzar lead magnet', 'Seguir con blog quincenal', 'Mejorar LCP'] },
      instagram: { found: true, handle: 'techsolutions.bcn', followers: 700, posts: 36, engagementRate: 1.4, avgLikes: 9, avgComments: 2, postsLast90Days: 3, postsLast7Days: 1, lastPostDate: '2026-03-15' },
      linkedin: { found: true, name: 'TechSolutions Barcelona', followers: 1020, employees: '11-50', industry: 'Software Development' },
      meta_ads: { skipped: true },
      keyword_gap: { items: [
        { keyword: 'software recursos humanos', volume: 2400, difficulty: 48, position: null, competitor: 'devify.io', impact: 'high', priority: 'oportunidad' },
        { keyword: 'app control horario', volume: 1900, difficulty: 35, position: null, competitor: 'softcatala.tech', impact: 'high', priority: 'quick-win' },
      ]},
      briefing: {
        summary: 'Score 33 (+2). El HTTPS está generando impacto: keywords mejorando posiciones, tráfico +8% semanal. GBP cerca de 10 reseñas. Toca crear landing por servicio y preparar un lead magnet para convertir el tráfico creciente.',
        priorities: [
          { title: 'Crear landing por servicio para captar leads', description: 'El tráfico crece pero no se convierte. Necesitas landings específicas con formulario.', impact: 'high' },
          { title: 'Crear lead magnet descargable', description: 'Ej: "Guía: 10 errores en gestión de RRHH que cuestan dinero a tu pyme". Captura emails.', impact: 'high' },
          { title: 'Optimizar LCP mobile a <2.5s', description: 'Actualmente 2.8s. Comprimir imágenes y lazy-load bajo el fold.', impact: 'medium' },
        ],
        quickWins: ['Añadir schema Organization + LocalBusiness', 'Activar lazy loading en imágenes below-the-fold'],
        warnings: ['El tráfico crece pero la tasa de conversión sigue baja (no hay lead magnet)'],
        generatedAt: '2026-03-17T06:00:00Z',
      },
    },
  },
  // ── Semana 6: mar-24 ──
  {
    id: 'snap-w06',
    clientId: 'demo-client-01',
    date: '2026-03-24',
    month: 'marzo-2026',
    score: 34,
    pipeline_output: {
      seo: { keywordsTop10: 15, organicTrafficEstimate: 4200, domainRank: 15400, paidKeywordsTotal: 0, topKeywords: [
        { keyword: 'software rrhh pymes', volume: 1400, position: 8, difficulty: 45 },
        { keyword: 'gestión personal barcelona', volume: 720, position: 9, difficulty: 32 },
        { keyword: 'programa nóminas pymes', volume: 980, position: 14, difficulty: 51 },
        { keyword: 'app control horario', volume: 1900, position: 19, difficulty: 35 },
      ]},
      geo: { mentionRate: 20, mentions: 3, totalQueries: 15 },
      pagespeed: { mobile: { performance: 65, lcp: 2600, cls: 0.06, fcp: 1500, ttfb: 640 }, desktop: { performance: 87, lcp: 1200, cls: 0.02, fcp: 680, ttfb: 320 } },
      conversion: { funnelScore: 42, hasContactForm: true, formCount: 2, ctaCount: 5, hasLeadMagnet: true },
      content_cadence: { totalPosts: 7, lastPostDate: '2026-03-22', daysSinceLastPost: 2, postsLast90Days: 3, cadenceLevel: 'moderate' },
      reputation: { gbpRating: 4.5, totalReviews: 12, trustpilotRating: null, newsCount: 1, newsHeadlines: ['TechSolutions lanza guía gratuita de RRHH para pymes'] },
      competitors: { competitors: COMPETITORS },
      competitor_traffic: {
        items: [
          { domain: 'devify.io', organicTrafficEstimate: 13400, keywordsTop10: 50, domainRank: 8400, mobilePerformance: 81 },
          { domain: 'softcatala.tech', organicTrafficEstimate: 9400, keywordsTop10: 35, domainRank: 10700, mobilePerformance: 73 },
          { domain: 'bcncode.es', organicTrafficEstimate: 5600, keywordsTop10: 21, domainRank: 15000, mobilePerformance: 67 },
        ],
      },
      insights: { summary: 'Lead magnet publicado y GBP superó 10 reseñas. Primera mención GEO adicional detectada.', bullets: ['Lead magnet activo', 'GBP con 12 reseñas (4.5★)', 'GEO subió a 3 menciones'] },
      instagram: { found: true, handle: 'techsolutions.bcn', followers: 760, posts: 39, engagementRate: 1.6, avgLikes: 11, avgComments: 2, postsLast90Days: 3, postsLast7Days: 1, lastPostDate: '2026-03-23' },
      linkedin: { found: true, name: 'TechSolutions Barcelona', followers: 1100, employees: '11-50', industry: 'Software Development' },
      meta_ads: { skipped: true },
      keyword_gap: { items: [
        { keyword: 'software recursos humanos', volume: 2400, difficulty: 48, position: null, competitor: 'devify.io', impact: 'high', priority: 'oportunidad' },
      ]},
      briefing: {
        summary: 'Score 34 (+1). La estrategia de contenido empieza a dar frutos: lead magnet activo, 3 posts en 90 días, GBP con 12 reseñas. GEO subió a 3 menciones. Devify sigue lejos pero la brecha se reduce.',
        priorities: [
          { title: 'Crear landing por servicio para captar leads', description: 'El lead magnet capta emails pero falta landing de conversión directa para demo.', impact: 'high' },
          { title: 'Implementar schema markup Organization', description: 'Mejorar datos estructurados para rich snippets y visibilidad GEO.', impact: 'medium' },
          { title: 'Publicar artículo sobre control horario', description: 'La keyword "app control horario" (1900 búsquedas/mes) entra en top 20. Un artículo dedicado puede empujarla a top 10.', impact: 'medium' },
        ],
        quickWins: ['Añadir formulario de demo en footer de todas las páginas', 'Responder a las 12 reseñas de GBP'],
        warnings: ['Devify ha lanzado un ebook competidor — están invirtiendo en contenido'],
        generatedAt: '2026-03-24T06:00:00Z',
      },
    },
  },
  // ── Semana 7: mar-31 (bajón temporal) ──
  {
    id: 'snap-w07',
    clientId: 'demo-client-01',
    date: '2026-03-31',
    month: 'marzo-2026',
    score: 33,
    pipeline_output: {
      seo: { keywordsTop10: 14, organicTrafficEstimate: 4100, domainRank: 15200, paidKeywordsTotal: 0, topKeywords: [
        { keyword: 'software rrhh pymes', volume: 1400, position: 9, difficulty: 45 },
        { keyword: 'gestión personal barcelona', volume: 720, position: 10, difficulty: 32 },
        { keyword: 'programa nóminas pymes', volume: 980, position: 15, difficulty: 51 },
      ]},
      geo: {
        mentionRate: 20, mentions: 3, totalQueries: 15,
        overallScore: 22, brandScore: 33, sectorScore: 0,
        mentionRangeLow: 6, mentionRangeHigh: 40,
        funnelBreakdown: {
          tofu: { mentioned: 0, total: 3 },
          mofu: { mentioned: 1, total: 6 },
          bofu: { mentioned: 2, total: 6 },
        },
        categoryBreakdown: {
          sector: { mentioned: 0, total: 3 },
          problema: { mentioned: 1, total: 3 },
          comparativa: { mentioned: 0, total: 3 },
          decision: { mentioned: 1, total: 3 },
          recomendacion: { mentioned: 1, total: 2 },
          marca: { mentioned: 0, total: 1 },
        },
        crossModel: [
          { name: 'ChatGPT', mentioned: 1, total: 15 },
          { name: 'Perplexity', mentioned: 2, total: 15 },
          { name: 'Claude', mentioned: 1, total: 15 },
          { name: 'Gemini', mentioned: 0, total: 15 },
          { name: 'DeepSeek', mentioned: 0, total: 15 },
        ],
        competitorMentions: [
          { name: 'Devify', domain: 'devify.io', mentions: 8, total: 15, mentionRate: 53 },
          { name: 'SoftCatalà', domain: 'softcatala.tech', mentions: 5, total: 15, mentionRate: 33 },
          { name: 'BCN Code', domain: 'bcncode.es', mentions: 2, total: 15, mentionRate: 13 },
        ],
        executiveNarrative: 'TechSolutions aparece en solo el 20% de las consultas a IAs sobre software RRHH en Barcelona — Devify domina con un 53%. Las IAs te reconocen en consultas de decisión de compra pero te ignoran en descubrimiento de sector. Hay una oportunidad clara en optimizar contenido para que los modelos de IA te asocien con "software RRHH pymes Barcelona".',
        queries: [
          { query: 'mejores empresas de software RRHH en Barcelona', mentioned: false, stage: 'tofu', category: 'sector', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'software de gestión de personal para pymes', mentioned: false, stage: 'tofu', category: 'sector', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'herramientas digitales RRHH España', mentioned: false, stage: 'tofu', category: 'sector', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'cómo automatizar la gestión de nóminas en una pyme', mentioned: false, stage: 'mofu', category: 'problema', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'problemas comunes en gestión de turnos empleados', mentioned: true, stage: 'mofu', category: 'problema', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: true }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'soluciones para control horario obligatorio España', mentioned: false, stage: 'mofu', category: 'problema', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'comparativa software RRHH pymes España 2026', mentioned: false, stage: 'mofu', category: 'comparativa', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'alternativas a Factorial para gestión RRHH', mentioned: false, stage: 'mofu', category: 'comparativa', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'Devify vs otras opciones de software RRHH Barcelona', mentioned: false, stage: 'mofu', category: 'comparativa', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'contratar software gestión personal Barcelona esta semana', mentioned: true, stage: 'bofu', category: 'decision', engines: [{ name: 'ChatGPT', mentioned: true }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'mejor software RRHH calidad-precio para pyme 50 empleados', mentioned: false, stage: 'bofu', category: 'decision', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'presupuesto software RRHH pyme Barcelona', mentioned: false, stage: 'bofu', category: 'decision', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'recomiéndame un proveedor de software RRHH en Barcelona', mentioned: true, stage: 'bofu', category: 'recomendacion', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: true }, { name: 'Claude', mentioned: true }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'qué software de nóminas recomendarías para una pyme', mentioned: false, stage: 'bofu', category: 'recomendacion', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'qué sabes de TechSolutions Barcelona', mentioned: false, stage: 'bofu', category: 'marca', isBrandQuery: true, engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
        ],
      },
      pagespeed: { mobile: { performance: 63, lcp: 2700, cls: 0.07, fcp: 1550, ttfb: 660 }, desktop: { performance: 86, lcp: 1250, cls: 0.02, fcp: 700, ttfb: 330 } },
      conversion: { funnelScore: 41, hasContactForm: true, formCount: 2, ctaCount: 5, hasLeadMagnet: true },
      content_cadence: { totalPosts: 7, lastPostDate: '2026-03-22', daysSinceLastPost: 9, postsLast90Days: 3, cadenceLevel: 'moderate' },
      reputation: { gbpRating: 4.5, totalReviews: 14, trustpilotRating: null, newsCount: 1 },
      competitors: { competitors: COMPETITORS },
      competitor_traffic: {
        items: [
          { domain: 'devify.io', organicTrafficEstimate: 14200, keywordsTop10: 52, domainRank: 8200, mobilePerformance: 82 },
          { domain: 'softcatala.tech', organicTrafficEstimate: 9500, keywordsTop10: 35, domainRank: 10600, mobilePerformance: 74 },
          { domain: 'bcncode.es', organicTrafficEstimate: 5700, keywordsTop10: 21, domainRank: 14900, mobilePerformance: 67 },
        ],
      },
      insights: { summary: 'Ligero retroceso esta semana: -1 punto. Devify rediseñó su web y ganó velocidad. Normal, no preocupante.', bullets: ['Mantener publicación de contenido', 'Vigilar movimiento de Devify', 'Considerar ads'] },
      instagram: { found: true, handle: 'techsolutions.bcn', followers: 790, posts: 41, engagementRate: 1.5, avgLikes: 11, avgComments: 2, postsLast90Days: 4, postsLast7Days: 0, lastPostDate: '2026-03-23' },
      linkedin: { found: true, name: 'TechSolutions Barcelona', followers: 1180, employees: '11-50', industry: 'Software Development' },
      meta_ads: { skipped: true },
      keyword_gap: { items: [
        { keyword: 'software recursos humanos', volume: 2400, difficulty: 48, position: null, competitor: 'devify.io', impact: 'high', priority: 'oportunidad' },
      ]},
      briefing: {
        summary: 'Score 33 (-1). Retroceso menor causado por fluctuación normal de SERPs y el rediseño de Devify que mejoró su velocidad. Tu tendencia de 8 semanas sigue siendo positiva (+5 puntos). No cambies la estrategia, solo acelera la cadencia de contenido.',
        priorities: [
          { title: 'Crear landing por servicio para captar leads', description: 'Tercera semana como prioridad. El tráfico crece pero la conversión no. Impacto estimado: +8 puntos en pilar Conversión.', impact: 'high' },
          { title: 'Publicar artículo sobre control horario', description: 'La keyword sigue en posición 15. Con contenido dedicado podría entrar en top 10 en 2-3 semanas.', impact: 'medium' },
          { title: 'Implementar schema markup Organization + FAQ', description: 'Datos estructurados para mejorar CTR y visibilidad en IA.', impact: 'medium' },
        ],
        quickWins: ['Publicar un post esta semana para no romper la cadencia', 'Revisar velocidad mobile (subió 0.1s respecto a la semana pasada)'],
        warnings: ['Devify rediseñó su web — su PageSpeed mobile subió a 82 (tú estás en 63)'],
        generatedAt: '2026-03-31T06:00:00Z',
      },
    },
  },
  // ── Semana 8: abr-07 (actual) ──
  {
    id: 'snap-w08',
    clientId: 'demo-client-01',
    date: '2026-04-07',
    month: 'abril-2026',
    score: 36,
    pipeline_output: {
      seo: { keywordsTop10: 18, organicTrafficEstimate: 4800, domainRank: 14500, paidKeywordsTotal: 0, topKeywords: [
        { keyword: 'software rrhh pymes', volume: 1400, position: 7, difficulty: 45 },
        { keyword: 'gestión personal barcelona', volume: 720, position: 8, difficulty: 32 },
        { keyword: 'programa nóminas pymes', volume: 980, position: 13, difficulty: 51 },
        { keyword: 'app control horario', volume: 1900, position: 15, difficulty: 35 },
      ]},
      geo: {
        mentionRate: 27, mentions: 4, totalQueries: 15,
        overallScore: 30, brandScore: 50, sectorScore: 0,
        mentionRangeLow: 10, mentionRangeHigh: 50,
        funnelBreakdown: {
          tofu: { mentioned: 0, total: 3 },
          mofu: { mentioned: 1, total: 6 },
          bofu: { mentioned: 3, total: 6 },
        },
        categoryBreakdown: {
          sector: { mentioned: 0, total: 3 },
          problema: { mentioned: 1, total: 3 },
          comparativa: { mentioned: 0, total: 3 },
          decision: { mentioned: 1, total: 3 },
          recomendacion: { mentioned: 2, total: 2 },
          marca: { mentioned: 0, total: 1 },
        },
        crossModel: [
          { name: 'ChatGPT', mentioned: 2, total: 15 },
          { name: 'Perplexity', mentioned: 3, total: 15 },
          { name: 'Claude', mentioned: 2, total: 15 },
          { name: 'Gemini', mentioned: 1, total: 15 },
          { name: 'DeepSeek', mentioned: 0, total: 15 },
        ],
        competitorMentions: [
          { name: 'Devify', domain: 'devify.io', mentions: 9, total: 15, mentionRate: 60 },
          { name: 'SoftCatalà', domain: 'softcatala.tech', mentions: 6, total: 15, mentionRate: 40 },
          { name: 'BCN Code', domain: 'bcncode.es', mentions: 3, total: 15, mentionRate: 20 },
        ],
        executiveNarrative: 'TechSolutions ha mejorado su visibilidad IA al 27% (+7pp vs semana anterior), apareciendo ya en consultas de recomendación directa. Sin embargo, Devify domina con un 60% de share of voice — te triplica en menciones. La buena noticia: las IAs te citan cuando alguien pide específicamente una recomendación de proveedor, lo que indica que tu marca empieza a tener peso en el momento de decisión de compra.',
        queries: [
          { query: 'mejores empresas de software RRHH en Barcelona', mentioned: false, stage: 'tofu', category: 'sector', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'software de gestión de personal para pymes', mentioned: false, stage: 'tofu', category: 'sector', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'herramientas digitales RRHH España', mentioned: false, stage: 'tofu', category: 'sector', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'cómo automatizar la gestión de nóminas en una pyme', mentioned: false, stage: 'mofu', category: 'problema', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'problemas comunes en gestión de turnos empleados', mentioned: true, stage: 'mofu', category: 'problema', engines: [{ name: 'ChatGPT', mentioned: true }, { name: 'Perplexity', mentioned: true }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'soluciones para control horario obligatorio España', mentioned: false, stage: 'mofu', category: 'problema', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'comparativa software RRHH pymes España 2026', mentioned: false, stage: 'mofu', category: 'comparativa', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'alternativas a Factorial para gestión RRHH', mentioned: false, stage: 'mofu', category: 'comparativa', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'Devify vs otras opciones de software RRHH Barcelona', mentioned: false, stage: 'mofu', category: 'comparativa', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'contratar software gestión personal Barcelona esta semana', mentioned: true, stage: 'bofu', category: 'decision', engines: [{ name: 'ChatGPT', mentioned: true }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: true }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'mejor software RRHH calidad-precio para pyme 50 empleados', mentioned: false, stage: 'bofu', category: 'decision', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'presupuesto software RRHH pyme Barcelona', mentioned: false, stage: 'bofu', category: 'decision', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'recomiéndame un proveedor de software RRHH en Barcelona', mentioned: true, stage: 'bofu', category: 'recomendacion', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: true }, { name: 'Claude', mentioned: true }, { name: 'Gemini', mentioned: true }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'qué software de nóminas recomendarías para una pyme', mentioned: true, stage: 'bofu', category: 'recomendacion', engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: true }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
          { query: 'qué sabes de TechSolutions Barcelona', mentioned: false, stage: 'bofu', category: 'marca', isBrandQuery: true, engines: [{ name: 'ChatGPT', mentioned: false }, { name: 'Perplexity', mentioned: false }, { name: 'Claude', mentioned: false }, { name: 'Gemini', mentioned: false }, { name: 'DeepSeek', mentioned: false }] },
        ],
      },
      pagespeed: { mobile: { performance: 68, lcp: 2400, cls: 0.05, fcp: 1400, ttfb: 600 }, desktop: { performance: 89, lcp: 1100, cls: 0.02, fcp: 650, ttfb: 300 } },
      conversion: { funnelScore: 45, hasContactForm: true, formCount: 3, ctaCount: 6, hasLeadMagnet: true },
      content_cadence: { totalPosts: 9, lastPostDate: '2026-04-04', daysSinceLastPost: 3, postsLast90Days: 5, cadenceLevel: 'moderate' },
      reputation: { gbpRating: 4.6, totalReviews: 18, trustpilotRating: null, newsCount: 1 },
      competitors: { competitors: COMPETITORS },
      competitor_traffic: {
        items: [
          { domain: 'devify.io', organicTrafficEstimate: 14500, keywordsTop10: 53, domainRank: 8100, mobilePerformance: 82 },
          { domain: 'softcatala.tech', organicTrafficEstimate: 9600, keywordsTop10: 36, domainRank: 10500, mobilePerformance: 74 },
          { domain: 'bcncode.es', organicTrafficEstimate: 5800, keywordsTop10: 22, domainRank: 14800, mobilePerformance: 68 },
        ],
      },
      instagram: {
        found: true,
        handle: 'techsolutions.bcn',
        url: 'https://instagram.com/techsolutions.bcn',
        followers: 840,
        following: 320,
        posts: 45,
        bio: 'Software RRHH para pymes | Barcelona',
        isBusinessAccount: true,
        businessCategory: 'Software',
        engagementRate: 1.8,
        avgLikes: 12,
        avgComments: 2,
        postsLast90Days: 4,
        postsLast7Days: 0,
        lastPostDate: '2026-03-28',
      },
      linkedin: {
        found: true,
        url: 'https://linkedin.com/company/techsolutions-barcelona',
        name: 'TechSolutions Barcelona',
        followers: 1250,
        employees: '11-50',
        description: 'Software de gestión de RRHH para pymes',
        industry: 'Software Development',
        headquarters: 'Barcelona, Spain',
      },
      insights: { summary: 'Mejor semana hasta ahora: score 36 (+3), tráfico supera las 4800 visitas, LCP por fin bajo 2.5s. GEO sube a 4 menciones.', bullets: ['LCP mobile cumple umbral Google', 'Crear landings de conversión', 'Ampliar estrategia de contenido'] },
      meta_ads: { skipped: true },
      keyword_gap: { items: [
        { keyword: 'software recursos humanos', volume: 2400, difficulty: 48, position: null, competitor: 'devify.io', impact: 'high', priority: 'oportunidad' },
        { keyword: 'app control horario', volume: 1900, difficulty: 35, position: 15, competitor: 'softcatala.tech', impact: 'high', priority: 'quick-win' },
        { keyword: 'gestión turnos empleados', volume: 1100, difficulty: 29, position: null, competitor: 'devify.io', impact: 'medium', priority: 'oportunidad' },
      ]},
      briefing: {
        summary: 'Score 36 (+3) — tu mejor semana. El LCP mobile bajó a 2.4s (por fin cumple el umbral de Google), el tráfico creció un 17% semanal y ya tienes 18 reseñas en GBP. Las IAs te mencionan en 4 de 15 consultas sobre software RRHH en Barcelona. Devify sigue por delante pero la brecha se ha reducido de 4x a 3x en tráfico.',
        priorities: [
          { title: 'Crear landing por servicio para captar leads', description: 'Tienes tráfico creciente pero solo 1 formulario de contacto genérico. Landings específicas pueden duplicar la tasa de conversión. Impacto estimado: +8 puntos en Conversión.', impact: 'high' },
          { title: 'Implementar schema markup Organization + FAQ', description: 'Mejorar datos estructurados para rich snippets. Las IAs usan datos estructurados para decidir qué mencionar. Impacto en GEO.', impact: 'medium' },
          { title: 'Crear artículo pilar sobre "control horario pymes"', description: 'La keyword "app control horario" (1900 búsquedas) está en posición 15. Un artículo largo (2000+ palabras) puede empujarla a top 10.', impact: 'high' },
        ],
        quickWins: [
          'Añadir schema FAQ en la página de preguntas frecuentes',
          'Crear una landing /demo con formulario de solicitud',
          'Publicar caso de éxito de un cliente actual',
        ],
        warnings: [
          'Solo 1 formulario genérico — desperdicias el tráfico creciente sin landings de conversión',
        ],
        generatedAt: '2026-04-07T06:00:00Z',
      },
      growth_analysis: {
        version: 1,
        generatedAt: '2026-04-07T06:00:00Z',
        model: 'claude-sonnet-4-6',
        executiveSummary: {
          headline: 'TechSolutions Barcelona está en su mejor momento del trimestre, pero sigue perdiendo leads por no capitalizar el tráfico creciente con páginas de conversión.',
          situation: 'Con 4.800 visitas orgánicas semanales (+17% vs semana anterior) y 18 keywords en top 10, la visibilidad está en trayectoria correcta — el LCP mobile por fin baja de 2.5s y Google deja de penalizarte. El problema está al final del embudo: con solo 3 formularios y un tráfico que triplica el de hace 8 semanas, cada día pierdes decenas de leads potenciales por no tener páginas de servicio con CTA claro. Devify sigue por delante (60% SoV en IAs vs tu 27%), pero la brecha de tráfico orgánico se ha reducido de 4x a 3x.',
          strengths: [
            'LCP mobile bajó a 2.4s cumpliendo el umbral de Core Web Vitals — Google deja de penalizarte',
            '18 keywords en top 10 (+10 en 8 semanas) con 3 que rankean para términos locales de Barcelona',
            '18 reseñas en GBP con rating 4.6★ — señal de confianza para buscadores y clientes finales',
          ],
          criticalGaps: [
            'Solo 3 formularios para 4.800 visitas/semana — la conversión es el cuello de botella que limita leads cualificados',
            'Sin presencia en IAs para consultas de descubrimiento (TOFU 0/3) — Devify captura a los clientes antes de que lleguen a ti',
            'Tres keywords con 1.900-2.400 búsquedas/mes atascadas en posición 13-22 — un empujón las mete en top 10',
          ],
          upsidePotential: {
            metric: 'leads orgánicos cualificados',
            current: '~8-12 leads/mes estimados',
            potential: '25-40 leads/mes',
            timeframe: '3-4 meses',
            dependency: 'ejecutando las 3 primeras acciones del plan (landings de conversión + artículo pilar + schema FAQ)',
          },
        },
        pillarAnalysis: {
          seo: {
            assessment: 'SEO en clara trayectoria ascendente: 18 keywords top 10 (vs 8 hace 8 semanas), tráfico orgánico en 4.800/semana y Domain Rank mejorando (18.200 → 14.500). El cuello de botella ahora es la conversión de ese tráfico, no la visibilidad. Hay 3 keywords estratégicas (software RRHH pymes pos 7, gestión personal Barcelona pos 8, app control horario pos 15) donde pequeños empujones dan grandes retornos.',
            keyFinding: '"App control horario" (1.900 búsquedas/mes) está en posición 15 — un artículo pilar de 2.000 palabras puede meterla en top 10 en 4-6 semanas.',
          },
          geo: {
            assessment: 'Visibilidad en IAs al 27% (+7pp), con presencia concentrada en consultas de decisión/recomendación y cero en descubrimiento. Las menciones en consultas donde preguntan por "TechSolutions" no cuentan como ventaja competitiva — son reconocimiento de entidad. La brecha real con Devify (60% SoV) está en que ellos aparecen cuando los usuarios aún no conocen a nadie del sector.',
            keyFinding: 'Estás ausente del TOFU completo (0 menciones en consultas de descubrimiento) — ahí es donde Devify captura a los usuarios antes de que tú entres en la conversación.',
          },
          web: {
            assessment: 'El performance mobile cumple por primera vez los Core Web Vitals (LCP 2.4s, CLS 0.05), resultado de la compresión de imágenes y lazy loading. El TTFB sigue alto (600ms) por el hosting compartido, pero ya no es bloqueante. Desktop en 89/100 es sólido.',
            keyFinding: 'Performance ya no es un lastre SEO — el esfuerzo marginal aquí rinde poco, mejor invertir los recursos técnicos en conversión.',
          },
          conversion: {
            assessment: 'Funnel score 45/100 — el punto más débil del dashboard. Con 4.800 visitas semanales solo tienes 3 formularios genéricos, sin landings específicas por servicio ni lead magnet más allá del que acabas de añadir. Cada página de servicio es una oportunidad perdida de captar leads cualificados con intención de compra.',
            keyFinding: 'El cuello de botella del negocio NO es la visibilidad — es que el tráfico creciente no se convierte por falta de páginas específicas por servicio con CTAs claros.',
          },
          content: {
            assessment: 'Blog activo con cadencia moderada (5 posts en 90 días) pero centrado en temas genéricos de RRHH, no en las keywords estratégicas donde sí puedes rankear. Faltan artículos pilar largos (>2.000 palabras) que ataquen directamente las 3 keywords atascadas en posición 13-22.',
            keyFinding: 'Tienes cadencia pero no estrategia — el contenido debe atacar keywords específicas con intención comercial, no temas generales.',
          },
          reputation: {
            assessment: 'GBP configurado con 18 reseñas y rating 4.6★ — por encima del promedio del sector. LinkedIn activo, Instagram con engagement bajo (1,8%). La reputación no es un problema, pero tampoco es un diferenciador frente a Devify (47 reseñas).',
            keyFinding: 'La reputación es sólida pero insuficiente para diferenciar — pedir reseñas a clientes actuales (tienes 18, Devify 47) es una ganancia rápida.',
          },
        },
        prioritizedActions: [
          {
            rank: 1,
            pillar: 'conversion',
            title: 'Crear una landing de conversión para "software RRHH pymes Barcelona" con formulario y caso de éxito',
            description: 'Tu funnel score es 45/100 y tienes 4.800 visitas semanales con solo 3 formularios genéricos. Una landing específica con CTA claro puede duplicar la conversión del tráfico que ya tienes — es la palanca más grande a corto plazo.',
            detail: '1. Crea la URL /software-rrhh-pymes-barcelona con copy específico para tu ICP (directores RRHH de pymes 10-200 empleados).\n2. Estructura: hero con propuesta de valor concreta → 3 puntos de dolor resueltos → caso de éxito con cifras (ROI, tiempo implementación) → formulario corto (nombre, email, empresa, tamaño).\n3. CTA: "Solicitar demo de 20 minutos" (más específico que "Contactar").\n4. Añade tracking de conversión y medir leads/semana durante 30 días.\n5. Enlaza desde tu home y desde el blog post pilar que crearás en la acción #2.',
            businessImpact: 'high',
            expectedOutcome: 'Pasar de ~8-12 a 20-30 leads orgánicos cualificados al mes en 6-8 semanas',
            effort: 'medium',
            timeframe: '2 semanas',
            rationale: 'Ataca directamente el criticalGap #1 del executive summary — 3 formularios para 4.800 visitas es el cuello de botella principal del negocio. El tráfico ya existe, solo falta capturarlo.',
            linkedGap: 'Solo 3 formularios para 4.800 visitas/semana — la conversión es el cuello de botella que limita leads cualificados',
          },
          {
            rank: 2,
            pillar: 'content',
            title: 'Publicar un artículo pilar de 2.000+ palabras optimizado para "app control horario"',
            description: 'La keyword "app control horario" tiene 1.900 búsquedas/mes y estás en posición 15. Un artículo largo y exhaustivo puede empujarla a top 10 en 4-6 semanas, multiplicando tráfico directo de esa query por 5-8x.',
            detail: '1. Estructura el artículo: qué es el control horario obligatorio, qué dice la ley, comparativa de 3 soluciones, cómo elegir (con tu producto como una de las opciones honestas).\n2. Incluye schema FAQ con 5-7 preguntas frecuentes reales del sector ("¿es obligatorio?", "¿cuánto cuesta?", "¿integración con nóminas?").\n3. Añade 2 imágenes con alt text optimizado y 1 infografía.\n4. Enlaza internamente desde home y desde la landing de conversión de la acción #1.\n5. Promociona en LinkedIn y 2 grupos de RRHH para pymes.',
            businessImpact: 'high',
            expectedOutcome: 'Pasar de posición 15 a top 10 en "app control horario" en 6 semanas — 250-400 visitas/mes adicionales',
            effort: 'medium',
            timeframe: '3 semanas (redacción + publicación + enlaces)',
            rationale: 'Ataca el criticalGap #3 (keywords atascadas en pos 13-22) y aprovecha el momento positivo del SEO. Es la acción de mayor ROI del plan de contenido.',
            linkedGap: 'Tres keywords con 1.900-2.400 búsquedas/mes atascadas en posición 13-22 — un empujón las mete en top 10',
          },
          {
            rank: 3,
            pillar: 'geo',
            title: 'Publicar 1 guía en un medio sectorial reconocido respondiendo "mejores empresas software RRHH Barcelona"',
            description: 'Las IAs no te mencionan en ninguna consulta de descubrimiento (0/3 TOFU). Mientras Devify aparece en el 60% de las búsquedas, tú solo apareces cuando alguien pregunta por ti por nombre — eso no es ventaja competitiva. Necesitas contenido en fuentes que las IAs citan.',
            detail: '1. Identifica 2-3 medios sectoriales españoles que las IAs usan como fuente (pregunta a Perplexity "¿qué fuentes consultas sobre software RRHH España?" y observa sus citas).\n2. Escribe un artículo de autor invitado de 1.800-2.200 palabras con tu nombre y enlace a tu web.\n3. Asegúrate de que el artículo incluye datos concretos (cifras, ejemplos, casos) que las IAs puedan citar como evidencia.\n4. En paralelo, crea/completa tus perfiles en Crunchbase y G2 con descripción estandarizada.\n5. Monitoriza en 3-4 semanas si empiezan a mencionarte en consultas TOFU.',
            businessImpact: 'high',
            expectedOutcome: 'Aparecer en al menos 1 de cada 3 consultas TOFU (pasar de 0% a 33%) en 2 meses',
            effort: 'medium',
            timeframe: '4-6 semanas',
            rationale: 'Ataca el criticalGap #2 del executive summary — sin presencia en descubrimiento, el pipeline de leads IA se seca en el origen.',
            linkedGap: 'Sin presencia en IAs para consultas de descubrimiento (TOFU 0/3) — Devify captura a los clientes antes de que lleguen a ti',
          },
          {
            rank: 4,
            pillar: 'seo',
            title: 'Añadir schema FAQ con 5 preguntas frecuentes en tu página principal y en la landing de la acción #1',
            description: 'No tienes schema FAQ implementado. Las IAs y Google usan datos estructurados para decidir qué contenido mostrar en rich snippets y qué citar. Es la ganancia rápida más barata del plan.',
            detail: '1. Lista las 5 preguntas más frecuentes que te hacen tus clientes actuales en la primera llamada.\n2. Escribe respuestas concretas de 40-80 palabras cada una.\n3. Genera el JSON-LD de FAQ schema (puedes usar https://technicalseo.com/tools/schema-markup-generator/).\n4. Pégalo en el <head> de la home y de la landing de software RRHH.\n5. Valida con https://validator.schema.org.',
            businessImpact: 'medium',
            expectedOutcome: 'Aumentar CTR en Google en +15-25% por rich snippets y mejorar citación en IAs',
            effort: 'low',
            timeframe: '1 semana',
            rationale: 'Ganancia rápida (< 2 horas de trabajo) que potencia las acciones #2 y #3 — el schema FAQ hace que tu contenido nuevo sea más citable desde el primer día.',
          },
          {
            rank: 5,
            pillar: 'reputation',
            title: 'Pedir reseña en Google Business Profile a 5 clientes actuales esta semana',
            description: 'Tienes 18 reseñas con 4.6★ mientras Devify tiene 47. Más reseñas mejoran tu posicionamiento local y dan señales de confianza a buscadores y a las IAs. Es la acción más barata del plan.',
            detail: '1. Selecciona 5 clientes con los que tengas buena relación reciente.\n2. Envía un email personalizado (no masivo) con el enlace directo a dejar reseña en Google.\n3. Sugiere 2-3 puntos clave a mencionar: servicio concreto, resultado, trato recibido.\n4. Follow-up por WhatsApp/teléfono a los que no respondan en 3 días.\n5. Responde a cada reseña nueva con mensaje personalizado de agradecimiento en menos de 48 horas.',
            businessImpact: 'medium',
            expectedOutcome: 'Pasar de 18 a 23+ reseñas en 2 semanas, acercándote al rango de tu competencia',
            effort: 'low',
            timeframe: '2 semanas',
            rationale: 'Cierra la brecha con Devify en señales de reputación con el menor esfuerzo del plan. Complementa la estrategia local sin requerir presupuesto ni tiempo técnico.',
          },
          {
            rank: 6,
            pillar: 'web',
            title: 'Mover scripts de analytics y chat al final del body con defer para reducir FCP',
            description: 'Tu LCP ya está bajo 2.5s pero el FCP sigue en 1.4s. Diferir scripts de terceros no críticos puede bajar el FCP otros 200-300ms sin tocar código de tu web.',
            detail: '1. Identifica los scripts en el <head> que no son críticos (analytics, chat widget, pixels).\n2. Muévelos justo antes de </body> y añade atributo defer.\n3. Si usas Google Tag Manager, carga con el snippet asíncrono oficial.\n4. Verifica que analytics sigue registrando visitas correctamente.\n5. Mide FCP antes y después con Lighthouse.',
            businessImpact: 'low',
            expectedOutcome: 'Reducir FCP de 1.400ms a ~1.100ms — mejor experiencia percibida sin cambios visuales',
            effort: 'low',
            timeframe: '2 horas',
            rationale: 'Optimización menor pero de esfuerzo mínimo. Va al final porque el performance ya no es un problema crítico — las palancas de conversión y contenido tienen mucho más ROI.',
          },
        ],
      },
    },
  },
];

// ─── Demo Recommendations ─────────────────────────────────────────────────────

export interface DemoRecommendation {
  id: string;
  client_id: string;
  source: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  status: string;
  pillar: string;
  effort?: string;
  data?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  feedback?: string;
}

export const DEMO_RECOMMENDATIONS: DemoRecommendation[] = [
  // ── done: completadas por el cliente ──
  {
    id: 'rec-01',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Activar HTTPS con redirección 301',
    description: 'Tu web servía sin SSL. Implementar HTTPS mejora SEO, seguridad y confianza del usuario. Ya implementado en semana 3.',
    impact: 'high',
    status: 'done',
    pillar: 'web',
    effort: 'low',
    created_at: '2026-02-17T06:00:00Z',
    updated_at: '2026-03-03T10:00:00Z',
  },
  {
    id: 'rec-02',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Configurar Google Business Profile Barcelona',
    description: 'Sin ficha GBP, pierdes visibilidad local. Creada en semana 3, ahora con 18 reseñas y 4.6★.',
    impact: 'high',
    status: 'done',
    pillar: 'reputación',
    effort: 'low',
    created_at: '2026-02-17T06:00:00Z',
    updated_at: '2026-03-03T11:00:00Z',
  },
  // ── in_progress: en el plan estratégico y en ejecución ──
  {
    id: 'rec-03',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Crear blog con 2 posts/mes sobre software RRHH',
    description: 'Blog inactivo 85 días. Cadencia de 2 posts/mes en temas de RRHH para pymes para mejorar indexación y captar tráfico long-tail. En progreso: 5 posts publicados en 5 semanas.',
    impact: 'high',
    status: 'in_progress',
    pillar: 'contenido',
    effort: 'medium',
    created_at: '2026-02-24T06:00:00Z',
    updated_at: '2026-04-04T10:00:00Z',
  },
  // ── accepted: en el plan estratégico pero no empezada ──
  {
    id: 'rec-04',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Crear landing por servicio para captar leads',
    description: 'Tienes tráfico creciente (4800 visitas/sem) pero solo 1 formulario genérico. Landings específicas para "software RRHH" y "control horario" pueden duplicar conversión. Impacto estimado: +8 puntos en pilar Conversión.',
    impact: 'high',
    status: 'accepted',
    pillar: 'conversión',
    effort: 'medium',
    created_at: '2026-03-17T06:00:00Z',
    updated_at: '2026-03-20T09:00:00Z',
  },
  // ── pending: sugerencias de AION sin revisar ──
  {
    id: 'rec-05',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Implementar schema markup Organization + FAQ',
    description: 'Datos estructurados mejoran rich snippets y visibilidad en IAs. Las IAs usan schema para decidir qué mencionar. Impacto en pilar GEO.',
    impact: 'medium',
    status: 'pending',
    pillar: 'seo',
    effort: 'low',
    created_at: '2026-03-10T06:00:00Z',
  },
  {
    id: 'rec-06',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Crear artículo pilar sobre "control horario pymes"',
    description: 'Keyword "app control horario" tiene 1900 búsquedas/mes y estás en posición 15. Un artículo largo (2000+ palabras) con caso práctico puede empujar a top 10 en 2-3 semanas.',
    impact: 'high',
    status: 'pending',
    pillar: 'contenido',
    effort: 'medium',
    created_at: '2026-04-07T06:00:00Z',
  },
  // ── rejected: descartada por el cliente ──
  {
    id: 'rec-07',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Lanzar campaña Google Ads búsqueda',
    description: 'Con presupuesto de 500-2000€/mes podrías captar leads cualificados por "software rrhh pymes" y "gestión personal barcelona".',
    impact: 'high',
    status: 'rejected',
    pillar: 'seo',
    effort: 'high',
    created_at: '2026-02-24T06:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
    feedback: 'Preferimos invertir el presupuesto en contenido orgánico por ahora',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PENDING — al menos 2 por pilar, todas acciones concretas ejecutables
  // ══════════════════════════════════════════════════════════════════════════

  // ── GEO (Visibilidad IA) ──
  {
    id: 'rec-geo-01',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Publicar una guía de 2.000+ palabras respondiendo "mejores empresas de software RRHH en Barcelona"',
    description: 'No apareces en ninguna consulta de descubrimiento (0/3). Que te mencionen cuando alguien pregunta tu nombre no es ventaja — tus competidores también aparecerían. La visibilidad real está en consultas genéricas donde el usuario aún no te conoce.',
    impact: 'high',
    status: 'pending',
    pillar: 'geo',
    effort: 'medium',
    data: {
      detail: '1. Elige la consulta TOFU donde no apareces: "mejores empresas de software RRHH en Barcelona".\n2. Escribe un artículo de >2.000 palabras que responda exactamente esa pregunta con datos, fuentes citables y ejemplos concretos.\n3. Incluye schema FAQ y HowTo en el artículo para facilitar indexado por modelos de IA.\n4. Comparte en LinkedIn y en 2 comunidades de tu sector (foros RRHH, grupos de pymes).\n5. En 2-3 semanas, repite la consulta en ChatGPT y Perplexity para verificar si empiezan a citarte.',
    },
    created_at: '2026-04-07T06:00:00Z',
  },
  {
    id: 'rec-geo-02',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Crear perfiles en Crunchbase y G2 con descripción estandarizada de tu actividad',
    description: 'Gemini y DeepSeek no te mencionan en ninguna consulta. Cada motor IA indexa fuentes distintas — estar en directorios profesionales multiplica tus puntos de entrada.',
    impact: 'medium',
    status: 'pending',
    pillar: 'geo',
    effort: 'low',
    data: {
      detail: '1. Crea tu perfil en Crunchbase (gratuito): descripción, sector, web, ubicación, fundadores.\n2. Regístrate en G2 y completa tu perfil de producto con capturas de pantalla y descripción detallada.\n3. Actualiza tu perfil de LinkedIn con la misma descripción y keywords que en tu web.\n4. Verifica que tu web tiene meta descriptions claras: "TechSolutions — software RRHH para pymes — Barcelona".\n5. Añade schema Organization con foundingDate, description, areaServed en tu web.',
    },
    created_at: '2026-04-07T06:00:00Z',
  },
  {
    id: 'rec-geo-03',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Crear una página "TechSolutions vs Devify" comparando servicios punto por punto',
    description: 'No apareces en ninguna consulta comparativa (0/3). Cuando alguien pide "alternativas a Devify" las IAs recomiendan a otros — tú no existes en esa conversación.',
    impact: 'high',
    status: 'pending',
    pillar: 'geo',
    effort: 'medium',
    data: {
      detail: '1. Crea una página en tu web con título "TechSolutions vs Devify: comparativa honesta 2026".\n2. Estructura con tabla: funcionalidades, precios, soporte, especialización, casos de éxito.\n3. Sé transparente — las IAs penalizan contenido puramente promocional.\n4. Repite con SoftCatalà y BCN Code si tienes tiempo.\n5. Busca que 1 medio sectorial o blog enlace tu comparativa.',
    },
    created_at: '2026-04-07T06:00:00Z',
  },

  // ── SEO (falta 1 más, ya tiene rec-05) ──
  {
    id: 'rec-seo-01',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Reescribir meta title y description de las 5 páginas con más tráfico incluyendo keyword primaria',
    description: 'Tus páginas principales tienen meta titles genéricos que no incluyen tus keywords objetivo. Corregirlo mejora CTR en buscadores y ayuda a las IAs a clasificar tu contenido.',
    impact: 'medium',
    status: 'pending',
    pillar: 'seo',
    effort: 'low',
    data: {
      detail: '1. Identifica tus 5 páginas con más tráfico en Google Search Console.\n2. Para cada una, escribe un meta title de 50-60 caracteres que incluya la keyword principal al inicio (ej: "Software RRHH para pymes | TechSolutions Barcelona").\n3. Escribe una meta description de 140-155 caracteres con la keyword + propuesta de valor + CTA.\n4. Verifica con una herramienta de preview SERP que no se cortan.\n5. Despliega los cambios y monitoriza CTR en Search Console durante 2 semanas.',
    },
    created_at: '2026-04-07T06:00:00Z',
  },

  // ── Web (Performance) ──
  {
    id: 'rec-web-01',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Comprimir y convertir a WebP las 10 imágenes más pesadas de la web',
    description: 'Tu LCP mobile es 2.7s y las imágenes son el principal cuello de botella. Convertir a WebP con lazy loading puede bajar el LCP 300-500ms.',
    impact: 'high',
    status: 'pending',
    pillar: 'web',
    effort: 'low',
    data: {
      detail: '1. Usa PageSpeed Insights para identificar las 10 imágenes que más pesan en tu web.\n2. Conviértelas a WebP con herramientas como Squoosh o TinyPNG (objetivo: <100KB por imagen).\n3. Añade atributos width y height explícitos para evitar layout shifts (CLS).\n4. Activa lazy loading con loading="lazy" en todas las imágenes que no estén en el viewport inicial.\n5. Sube las imágenes optimizadas y verifica con Lighthouse que el LCP ha bajado.',
    },
    created_at: '2026-04-07T06:00:00Z',
  },
  {
    id: 'rec-web-02',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Mover los scripts de analytics y chat al final del body con defer',
    description: 'Tu FCP es 1.550ms porque scripts de terceros bloquean el renderizado. Diferir su carga puede reducir FCP en 200-400ms.',
    impact: 'medium',
    status: 'pending',
    pillar: 'web',
    effort: 'low',
    data: {
      detail: '1. Abre tu HTML principal e identifica todos los <script> en el <head> que no son críticos (analytics, chat, pixels).\n2. Muévelos justo antes de </body> y añade el atributo defer.\n3. Si usas Google Tag Manager, cárgalo con el snippet asíncrono oficial.\n4. Verifica que analytics sigue registrando visitas correctamente tras el cambio.\n5. Mide FCP antes y después con Lighthouse para confirmar la mejora.',
    },
    created_at: '2026-04-07T06:00:00Z',
  },

  // ── Conversión ──
  {
    id: 'rec-conv-01',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Añadir un formulario de contacto específico en cada página de servicio',
    description: 'Tienes 4.800 visitas/semana pero solo 1 formulario genérico. Cada página de servicio debería tener su propio CTA contextual para captar leads cualificados.',
    impact: 'high',
    status: 'pending',
    pillar: 'conversión',
    effort: 'medium',
    data: {
      detail: '1. Lista tus páginas de servicio principales (software RRHH, control horario, gestión nóminas).\n2. Crea un formulario corto (nombre, email, empresa) con CTA específico: "Solicitar demo de Control Horario" en vez de "Contactar".\n3. Coloca el formulario después del primer bloque de contenido (above the fold si es posible).\n4. Añade tracking de conversión para medir cuántos leads genera cada página.\n5. A/B testea el CTA durante 2 semanas: "Solicitar demo" vs "Ver precios" vs "Hablar con un experto".',
    },
    created_at: '2026-04-07T06:00:00Z',
  },
  {
    id: 'rec-conv-02',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Añadir un lead magnet descargable (checklist o guía PDF) en la página de software RRHH',
    description: 'Tu tasa de conversión estimada es baja. Un lead magnet captura emails de visitantes que aún no están listos para pedir demo pero sí interesados en tu contenido.',
    impact: 'medium',
    status: 'pending',
    pillar: 'conversión',
    effort: 'medium',
    data: {
      detail: '1. Crea un PDF de 3-5 páginas: "Checklist: 10 señales de que tu pyme necesita digitalizar RRHH".\n2. Diseña un banner o popup en tu página de software RRHH con CTA "Descarga gratis".\n3. Pide solo email a cambio de la descarga (reducir fricción = más conversiones).\n4. Configura un email automático de bienvenida con el PDF adjunto + enlace a pedir demo.\n5. Mide tasa de descarga y cuántos de esos leads acaban pidiendo demo en 30 días.',
    },
    created_at: '2026-04-07T06:00:00Z',
  },

  // ── Contenido (falta 1 más, ya tiene rec-06) ──
  {
    id: 'rec-cont-01',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Publicar 1 caso de éxito con datos concretos (ROI, plazos, resultados) de un cliente actual',
    description: 'No tienes casos de éxito publicados. Las IAs y los buscadores priorizan contenido con evidencia concreta. Un caso bien estructurado mejora conversión y visibilidad.',
    impact: 'high',
    status: 'pending',
    pillar: 'contenido',
    effort: 'medium',
    data: {
      detail: '1. Elige un cliente con resultados medibles y pídele permiso para publicar su caso.\n2. Estructura: problema → solución → resultado (con cifras: "ROI del 340% en 6 meses", "reducción del 50% en tiempo de gestión").\n3. Incluye testimonial con nombre, cargo y empresa del cliente.\n4. Publícalo en tu blog con schema Article y enlázalo desde tu página principal.\n5. Compártelo en LinkedIn mencionando al cliente para amplificar alcance.',
    },
    created_at: '2026-04-07T06:00:00Z',
  },

  // ── Reputación ──
  {
    id: 'rec-rep-01',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Pedir a 5 clientes actuales que dejen una reseña en Google Business Profile esta semana',
    description: 'Tienes 18 reseñas con 4.6★ pero Devify tiene 47 reseñas. Más reseñas mejoran tu posicionamiento local y dan señales de confianza a las IAs.',
    impact: 'medium',
    status: 'pending',
    pillar: 'reputación',
    effort: 'low',
    data: {
      detail: '1. Selecciona 5 clientes satisfechos con los que tengas buena relación.\n2. Envía un email personalizado (no masivo) con el enlace directo a dejar reseña en Google.\n3. Incluye 2-3 puntos clave que les sugieran mencionar: servicio concreto, resultado, trato.\n4. Haz follow-up por WhatsApp/teléfono a los que no respondan en 3 días.\n5. Responde a cada reseña nueva con un mensaje personalizado de agradecimiento.',
    },
    created_at: '2026-04-07T06:00:00Z',
  },
  {
    id: 'rec-rep-02',
    client_id: 'demo-client-01',
    source: 'radar',
    title: 'Responder a todas las reseñas existentes en Google con mensaje personalizado',
    description: 'Tienes reseñas sin responder. Google y las IAs valoran la actividad del negocio. Responder mejora tu perfil y muestra profesionalidad a potenciales clientes.',
    impact: 'low',
    status: 'pending',
    pillar: 'reputación',
    effort: 'low',
    data: {
      detail: '1. Entra en tu Google Business Profile y revisa todas las reseñas.\n2. Responde a cada una con un mensaje personalizado (no copiar-pegar el mismo texto).\n3. En reseñas positivas: agradece, menciona el servicio y ofrece ayuda futura.\n4. En reseñas negativas (si hay): reconoce el problema, ofrece solución, invita a contactar directamente.\n5. Establece rutina: responder a cada nueva reseña en menos de 48 horas.',
    },
    created_at: '2026-04-07T06:00:00Z',
  },
];

// ─── Demo Alerts ───────────────────────────────────────────────────────────────

export const DEMO_ALERTS: Alert[] = [
  {
    id: 'alert-01',
    clientId: 'demo-client-01',
    type: 'competitor',
    severity: 'warning',
    title: 'Devify rediseñó su web',
    description: 'Devify.io ha mejorado su PageSpeed mobile de 79 a 82 tras un rediseño completo.',
    detail: 'El rediseño de Devify incluye nueva arquitectura de página, compresión de imágenes y lazy loading. Su LCP bajó a 1.8s. Tu LCP actual es 2.4s.',
    timestamp: '2026-03-31T09:00:00Z',
  },
  {
    id: 'alert-02',
    clientId: 'demo-client-01',
    type: 'seo',
    severity: 'positive',
    title: 'Keywords en top 10 suben a 18',
    description: 'Has ganado 4 posiciones en top 10 esta semana. El efecto de HTTPS y contenido regular se consolida.',
    detail: 'Keywords que entraron en top 10: "software rrhh pymes" (pos 7), "gestión personal barcelona" (pos 8). Tu domain rank mejoró de 15200 a 14500.',
    timestamp: '2026-04-07T06:30:00Z',
  },
  {
    id: 'alert-03',
    clientId: 'demo-client-01',
    type: 'web',
    severity: 'positive',
    title: 'LCP mobile cumple umbral de Google',
    description: 'Tu LCP bajó a 2.4s — por debajo del umbral de 2.5s. Google dejará de penalizarte en mobile.',
    detail: 'Evolución LCP: 3.8s → 3.6s → 3.2s → 3.0s → 2.8s → 2.6s → 2.7s → 2.4s. La compresión de imágenes y lazy loading han dado resultado.',
    timestamp: '2026-04-07T06:15:00Z',
  },
  {
    id: 'alert-04',
    clientId: 'demo-client-01',
    type: 'geo',
    severity: 'positive',
    title: 'Nueva mención en IAs: 4/15 consultas',
    description: 'ChatGPT y Perplexity mencionan TechSolutions en el 27% de consultas sobre software RRHH Barcelona.',
    detail: 'Semana anterior: 3/15 (20%). Esta semana: 4/15 (27%). Las nuevas menciones son en consultas de "mejor software nóminas pymes" y "gestión personal Barcelona".',
    timestamp: '2026-04-07T06:20:00Z',
  },
  {
    id: 'alert-05',
    clientId: 'demo-client-01',
    type: 'competitor',
    severity: 'warning',
    title: 'SoftCatalà publica ebook competidor',
    description: 'SoftCatalà.tech ha publicado una "Guía de digitalización RRHH 2026" como lead magnet.',
    detail: 'El ebook compite directamente con tu lead magnet. Monitorizar si captan posiciones en keywords de contenido RRHH. Tu ventaja: estás más enfocado en Barcelona.',
    timestamp: '2026-04-05T14:00:00Z',
  },
];

// ─── Demo Context Entries ──────────────────────────────────────────────────────

export const DEMO_CONTEXT_ENTRIES: ContextEntry[] = [
  {
    id: 'ctx-01',
    clientId: 'demo-client-01',
    type: 'action',
    title: 'HTTPS activado con redirección 301',
    status: 'done',
    impact: 'high',
    date: '2026-03-03',
  },
  {
    id: 'ctx-02',
    clientId: 'demo-client-01',
    type: 'action',
    title: 'Google Business Profile Barcelona creado',
    status: 'done',
    impact: 'high',
    date: '2026-03-03',
  },
  {
    id: 'ctx-03',
    clientId: 'demo-client-01',
    type: 'action',
    title: 'Blog reactivado — publicando 2 posts/mes',
    status: 'in_progress',
    impact: 'high',
    date: '2026-03-01',
  },
  {
    id: 'ctx-04',
    clientId: 'demo-client-01',
    type: 'insight',
    title: 'Devify rediseñó su web — su PageSpeed subió a 82',
    date: '2026-03-31',
  },
  {
    id: 'ctx-05',
    clientId: 'demo-client-01',
    type: 'action',
    title: 'Lead magnet publicado: "10 errores RRHH en pymes"',
    status: 'done',
    impact: 'medium',
    date: '2026-03-22',
  },
  {
    id: 'ctx-06',
    clientId: 'demo-client-01',
    type: 'insight',
    title: 'LCP mobile cumple umbral 2.5s de Google por primera vez',
    date: '2026-04-07',
  },
];

// ─── Demo Users ────────────────────────────────────────────────────────────────

export const DEMO_USERS: User[] = [
  {
    id: 'user-01',
    clientId: 'demo-client-01',
    name: 'Marc Puig',
    email: 'marc@techsolutions.es',
    role: 'admin',
  },
  {
    id: 'user-02',
    clientId: 'demo-client-01',
    name: 'Laura Vidal',
    email: 'laura@techsolutions.es',
    role: 'viewer',
  },
];
