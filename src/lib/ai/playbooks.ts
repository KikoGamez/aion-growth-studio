/**
 * Business-type playbooks — injected into advisor/insights prompts
 * based on client's goal, sector, and business type.
 *
 * Each playbook adds domain-specific expertise so the advisor
 * gives relevant advice instead of generic digital marketing tips.
 */

interface ClientProfile {
  primaryGoal?: string;
  businessType?: string;    // b2b, b2c, ecommerce, b2c_local
  sector?: string;
  teamSize?: string;
  monthlyBudget?: string;
  geoScope?: string;
}

/** Build a context block tailored to this client's profile */
export function buildPlaybookContext(profile: ClientProfile): string {
  const blocks: string[] = [];

  // ── Business type playbook ─────────────────────────────────────
  const bt = detectBusinessType(profile);
  if (bt) blocks.push(bt);

  // ── Goal-specific priorities ───────────────────────────────────
  const goal = buildGoalContext(profile.primaryGoal);
  if (goal) blocks.push(goal);

  // ── Team/budget constraints ────────────────────────────────────
  const constraints = buildConstraints(profile.teamSize, profile.monthlyBudget);
  if (constraints) blocks.push(constraints);

  // ── Geo scope ──────────────────────────────────────────────────
  const geo = buildGeoContext(profile.geoScope);
  if (geo) blocks.push(geo);

  if (!blocks.length) return '';
  return '\n## PLAYBOOK ESPECÍFICO PARA ESTE CLIENTE\n\n' + blocks.join('\n\n');
}

function detectBusinessType(profile: ClientProfile): string | null {
  const bt = profile.businessType?.toLowerCase() || '';
  const sector = (profile.sector || '').toLowerCase();
  const goal = profile.primaryGoal || '';

  // E-commerce
  if (bt === 'ecommerce' || goal === 'sell_online' || sector.includes('ecommerce') || sector.includes('tienda')) {
    return `### E-COMMERCE
Prioridades clave:
- **Fichas de producto** optimizadas (título con keyword, descripción única, schema Product, imágenes con alt)
- **Google Shopping / Merchant Center**: feed de productos, reviews de producto, pricing competitivo
- **Trustpilot / reviews**: social proof es decisivo en conversión. Apuntar a >4.5★
- **Tasa de conversión**: benchmark ecommerce es 1.5-3%. Analizar funnel: landing → ficha → carrito → checkout
- **Recuperación de carrito abandonado**: email automation (3-email sequence)
- **Core Web Vitals**: LCP <2.5s es crítico para ecommerce mobile
- **SEO transaccional**: keywords con intención de compra ("comprar X", "mejor X", "X precio")
- **Competencia por precio es una carrera al fondo** → diferencia por servicio, contenido, experiencia
Métricas clave: revenue por visita, tasa de conversión, AOV, CAC, LTV, % carrito abandonado`;
  }

  // B2B / Lead generation
  if (bt === 'b2b' || goal === 'generate_leads' || sector.includes('b2b') || sector.includes('saas') || sector.includes('software')) {
    return `### B2B / GENERACIÓN DE LEADS
Prioridades clave:
- **LinkedIn** es el canal social principal — publicar casos de éxito, datos del sector, thought leadership
- **Contenido de autoridad**: whitepapers, guías detalladas, webinars → captura de email
- **SEO informacional**: el buyer B2B investiga 6-12 meses antes de comprar. Estar en esas búsquedas
- **Landing pages por caso de uso**: no una página genérica, sino una por perfil de buyer persona
- **Lead magnets**: calculadoras, auditorías gratuitas, demos. Cada pieza de contenido debe tener un CTA
- **Email nurturing**: secuencia de 5-7 emails post-descarga, no venta directa
- **Caso de éxito > feature list**: el B2B compra resultados, no funcionalidades
- **GEO/IA**: las respuestas de ChatGPT/Perplexity influyen cada vez más en la investigación B2B
Métricas clave: MQLs/mes, tasa de conversión landing, coste por lead, pipeline generado, tiempo de ciclo de venta`;
  }

  // Local business
  if (bt === 'b2c_local' || goal === 'local_traffic' || sector.includes('local') || sector.includes('restaura') || sector.includes('clínica')) {
    return `### NEGOCIO LOCAL
Prioridades clave:
- **Google Business Profile** es el activo #1 — fotos actualizadas, posts semanales, responder TODAS las reviews
- **Reviews en Google**: pedir activamente a cada cliente satisfecho. >4.5★ con >50 reviews es el objetivo
- **SEO local**: "keyword + ciudad" en titles, H1s, y contenido. Schema LocalBusiness obligatorio
- **NAP consistency**: mismo nombre, dirección y teléfono en todas las plataformas
- **Google Maps pack**: estar en los 3 primeros resultados del mapa
- **Instagram** funciona para negocios locales visuales (restaurantes, estética, fitness)
- **Directorios locales**: Yelp, TripAdvisor (hostelería), directorios sectoriales
- **La web tiene que convertir**: teléfono clickable, WhatsApp, formulario simple, mapa
Métricas clave: llamadas desde GBP, clicks a web desde Maps, reviews/mes, tráfico local orgánico`;
  }

  // B2C brand/media
  if (bt === 'b2c' || goal === 'brand_positioning') {
    return `### B2C / MARCA
Prioridades clave:
- **Contenido como producto**: el contenido ES la estrategia, no un complemento del SEO
- **Redes sociales**: Instagram y TikTok para awareness, el blog para SEO orgánico
- **Brand search**: que la gente busque tu marca por nombre es señal de éxito
- **E-E-A-T**: en B2C la confianza se construye con presencia en medios, expertos identificados, reviews
- **Newsletter**: canal propio que no depende de algoritmos. Construir lista desde día 1
- **PR digital**: menciones en medios online, colaboraciones con creadores
- **GEO/IA**: las marcas que aparecen en respuestas de IA ganan posición mental antes del click
- **Comunidad > seguidores**: engagement rate importa más que follower count
Métricas clave: brand search volume, share of voice, engagement rate, email subscribers, menciones en medios`;
  }

  return null;
}

function buildGoalContext(goal?: string): string | null {
  switch (goal) {
    case 'generate_leads':
      return `### OBJETIVO: GENERAR LEADS
Toda recomendación debe evaluarse contra: "¿esto genera más leads cualificados?"
- Priorizar SEO de keywords con intención comercial sobre informacional pura
- Cada página debe tener un CTA claro hacia formulario/demo/contacto
- Medir: leads/mes, coste por lead, tasa de conversión por fuente`;

    case 'sell_online':
      return `### OBJETIVO: VENDER ONLINE
Toda recomendación debe evaluarse contra: "¿esto genera más ventas o reduce fricción de compra?"
- Priorizar keywords transaccionales y fichas de producto
- PageSpeed y UX mobile impactan directamente en revenue
- Medir: revenue, conversión, AOV, CAC`;

    case 'brand_positioning':
      return `### OBJETIVO: POSICIONAMIENTO DE MARCA
Toda recomendación debe evaluarse contra: "¿esto aumenta el reconocimiento y autoridad de marca?"
- Priorizar contenido de autoridad y presencia en medios sobre tácticas de conversión
- Brand search volume es la métrica norte
- Medir: share of voice, brand searches, menciones, domain authority`;

    case 'local_traffic':
      return `### OBJETIVO: TRÁFICO LOCAL
Toda recomendación debe evaluarse contra: "¿esto trae más clientes físicos?"
- Google Business Profile es prioridad absoluta
- Reviews y presencia en maps > SEO orgánico tradicional
- Medir: llamadas, visitas al local, clicks desde Maps, reviews/mes`;

    default:
      return null;
  }
}

function buildConstraints(teamSize?: string, budget?: string): string | null {
  const parts: string[] = [];

  switch (teamSize) {
    case 'solo':
      parts.push('El cliente trabaja SOLO — recomienda acciones que una persona pueda ejecutar. Prioriza automatización y herramientas que ahorren tiempo. No recomiendes estrategias que requieran un equipo de contenido.');
      break;
    case '2-5':
      parts.push('Equipo pequeño (2-5 personas) — pueden abordar 2-3 iniciativas en paralelo. Recomienda priorizar por ICE score.');
      break;
    case '6-20':
      parts.push('Equipo mediano (6-20) — pueden ejecutar una estrategia completa con canales especializados.');
      break;
    case '>20':
      parts.push('Equipo grande (>20) — pueden abordar estrategias multi-canal complejas.');
      break;
  }

  switch (budget) {
    case '0':
      parts.push('Presupuesto CERO en marketing — NO recomiendes publicidad pagada ni herramientas de pago. Solo orgánico y gratuito.');
      break;
    case '<500':
      parts.push('Presupuesto limitado (<€500/mes) — priorizar orgánico. Paid solo para tests muy específicos con presupuesto controlado.');
      break;
    case '500-2000':
      parts.push('Presupuesto moderado (€500-2000/mes) — se puede combinar SEO orgánico con campañas paid de baja escala.');
      break;
    case '2000-5000':
      parts.push('Buen presupuesto (€2000-5000/mes) — estrategia completa orgánica + paid. Puede invertir en herramientas y contenido profesional.');
      break;
    case '>5000':
      parts.push('Presupuesto alto (>€5000/mes) — puede ejecutar estrategia agresiva multi-canal con equipo dedicado o agencia.');
      break;
  }

  if (!parts.length) return null;
  return '### RESTRICCIONES DEL CLIENTE\n' + parts.join('\n');
}

function buildGeoContext(geoScope?: string): string | null {
  switch (geoScope) {
    case 'local_city':
      return '### SCOPE GEOGRÁFICO: LOCAL\nEl negocio es local — SEO local, GBP y reviews son prioritarios sobre estrategias nacionales.';
    case 'national':
      return '### SCOPE GEOGRÁFICO: NACIONAL\nEl negocio opera a nivel nacional — SEO nacional, contenido en un idioma, sin necesidad de hreflang.';
    case 'multi_country':
      return '### SCOPE GEOGRÁFICO: MULTI-PAÍS\nEl negocio opera en varios países — considerar hreflang, subdirectorios por idioma, y estrategia de contenido localizada por mercado.';
    case 'global':
      return '### SCOPE GEOGRÁFICO: GLOBAL\nEl negocio es global — estrategia multi-idioma, hreflang, CDN, y adaptación cultural del contenido por mercado.';
    default:
      return null;
  }
}
