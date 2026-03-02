import type { GeoResult, GeoQuery, CrawlResult } from '../types';

const API_KEY = import.meta.env.OPENAI_API_KEY;

export async function runGEO(url: string, sector: string, crawl: CrawlResult): Promise<GeoResult> {
  if (!API_KEY) {
    return { skipped: true, reason: 'OPENAI_API_KEY not configured' };
  }

  const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  const brandName = crawl.title?.split(/[-|]/)[0]?.trim() || domain;
  const valueProposition = crawl.description?.slice(0, 100) || '';

  // 2 brand-focused queries (Spanish)
  const brandQueryList = [
    `¿Conoces la empresa "${brandName}"? ¿Qué sabes sobre ellos y sus servicios?`,
    `Busco información sobre ${domain} en el ámbito de ${sector}. ¿Puedes ayudarme?`,
  ];

  // 3 sector-focused queries (Spanish) — these will almost always return useful answers
  const sectorQueryList = [
    `¿Cuáles son las mejores empresas de ${sector} en España o Latinoamérica? Dame nombres concretos.`,
    `Necesito contratar servicios de ${sector}${valueProposition ? ` para ${valueProposition.slice(0, 60)}` : ''}. ¿Qué empresas o proveedores recomiendas?`,
    `¿Cómo busco un buen proveedor de ${sector}? ¿Qué marcas o plataformas son referentes?`,
  ];

  const allQueries = [...brandQueryList, ...sectorQueryList];

  try {
    const results = await Promise.all(
      allQueries.map(async (query, idx): Promise<GeoQuery & { isBrandQuery: boolean; hasSectorData: boolean }> => {
        const isBrandQuery = idx < 2;

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 300,
            messages: [
              {
                role: 'system',
                content:
                  'Eres un asistente experto. Responde en español de forma concisa. Menciona empresas o sitios web específicos cuando sea relevante.',
              },
              { role: 'user', content: query },
            ],
          }),
        });

        const data = await res.json();
        const answer: string = data?.choices?.[0]?.message?.content || '';
        const lowerAnswer = answer.toLowerCase();
        const lowerDomain = domain.toLowerCase();
        const lowerBrand = brandName.toLowerCase();

        // Check if brand is specifically mentioned
        const mentioned =
          lowerAnswer.includes(lowerDomain) ||
          (lowerBrand.length > 3 && lowerAnswer.includes(lowerBrand));

        // For sector queries: check if AI provided useful sector information
        const hasSectorData =
          answer.length > 120 &&
          (lowerAnswer.includes('empresa') ||
            lowerAnswer.includes('agencia') ||
            lowerAnswer.includes('servicio') ||
            lowerAnswer.includes('plataforma') ||
            lowerAnswer.includes('company') ||
            lowerAnswer.includes('provider'));

        return {
          query,
          mentioned,
          isBrandQuery,
          hasSectorData,
          context: mentioned ? answer.slice(0, 150) : undefined,
        };
      }),
    );

    const brandResults = results.slice(0, 2);
    const sectorResults = results.slice(2);

    // Brand score: 0-60 (30 pts per brand mention)
    const brandMentions = brandResults.filter((r) => r.mentioned).length;
    const brandScore = brandMentions * 30; // 0, 30, or 60

    // Sector score: 0-40 (based on how well the sector is covered by AI)
    const sectorDataCount = sectorResults.filter((r) => r.hasSectorData).length;
    const sectorScore = Math.round((sectorDataCount / 3) * 40); // 0, 13, 27, or 40

    const overallScore = brandScore + sectorScore;

    return {
      queries: results.map(({ query, mentioned, isBrandQuery, context }) => ({
        query,
        mentioned,
        isBrandQuery,
        context,
      })),
      overallScore,
      brandScore,
      sectorScore,
    };
  } catch (err: any) {
    return {
      queries: [],
      overallScore: 0,
      brandScore: 0,
      sectorScore: 0,
      error: err.message?.slice(0, 100),
    };
  }
}
