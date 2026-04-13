/**
 * Haiku-powered document summarization.
 * Extracts: summary, category, entities, key_facts from document text.
 * Cost: ~$0.001 per document.
 */

const ANTHROPIC_API_KEY = import.meta.env?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

export interface DocumentSummary {
  summary: string;
  category: 'strategy' | 'historical' | 'brand' | 'financial' | 'competitive' | 'other';
  entities: string[];
  key_facts: string[];
}

export async function summarizeDocument(
  text: string,
  filename: string,
): Promise<DocumentSummary> {
  if (!ANTHROPIC_API_KEY || !text.trim()) {
    return { summary: '', category: 'other', entities: [], key_facts: [] };
  }

  // Cap input to ~30K chars to stay within Haiku context
  const input = text.slice(0, 30_000);

  const prompt = `Analiza el siguiente documento empresarial y extrae un resumen estructurado.
El archivo se llama "${filename}".

DOCUMENTO:
${input}

Responde SOLO con JSON válido (sin markdown, sin \`\`\`):
{
  "summary": "Resumen del documento en máximo 500 palabras. Incluye los puntos principales, decisiones clave, datos cuantitativos relevantes y conclusiones. Escribe en tercera persona.",
  "category": "strategy|historical|brand|financial|competitive|other",
  "entities": ["Entidad 1", "Entidad 2"],
  "key_facts": ["Dato clave 1 con números concretos", "Dato clave 2"]
}

CATEGORÍAS:
- strategy: planes de negocio, roadmaps, objetivos, OKRs, presupuestos
- historical: informes de agencias anteriores, resultados pasados, históricos de campañas
- brand: guías de marca, tone of voice, manuales de estilo, identidad
- financial: cuentas, ventas por canal, P&L, unit economics
- competitive: análisis de competencia, benchmarks, estudios de mercado
- other: cualquier otro tipo

REGLAS:
- key_facts: máximo 10, cada uno con datos concretos (números, fechas, %). No generalidades.
- entities: personas, empresas, productos, mercados mencionados. Máximo 15.
- Si el documento tiene tablas o datos numéricos, los key_facts deben recoger los más importantes.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error(`[documents:summarize] Haiku error ${res.status}`);
      return { summary: '', category: 'other', entities: [], key_facts: [] };
    }

    const data = await res.json();
    const text = data?.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[documents:summarize] No JSON in Haiku response');
      return { summary: '', category: 'other', entities: [], key_facts: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (data.usage) {
      console.log(`[documents:summarize] Haiku tokens: in=${data.usage.input_tokens} out=${data.usage.output_tokens}`);
    }

    return {
      summary: (parsed.summary || '').slice(0, 3000),
      category: ['strategy', 'historical', 'brand', 'financial', 'competitive', 'other'].includes(parsed.category)
        ? parsed.category
        : 'other',
      entities: Array.isArray(parsed.entities) ? parsed.entities.slice(0, 15) : [],
      key_facts: Array.isArray(parsed.key_facts) ? parsed.key_facts.slice(0, 10) : [],
    };
  } catch (err) {
    console.error('[documents:summarize] Error:', (err as Error).message);
    return { summary: '', category: 'other', entities: [], key_facts: [] };
  }
}
