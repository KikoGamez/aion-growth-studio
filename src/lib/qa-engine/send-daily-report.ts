import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import type { QualityEvaluation } from './types';

const REPORT_TO   = process.env.QA_REPORT_EMAIL   || 'kiko@aiongrowth.studio';
const ADMIN_URL   = process.env.PUBLIC_SITE_URL    || 'https://aiongrowth.studio';

export async function sendDailyReport(): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error('RESEND_API_KEY not set');
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase env vars missing');
  }

  const resend   = new Resend(resendKey);
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // Last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await supabase
    .from('qa_quality_evaluations')
    .select('*')
    .gte('created_at', since)
    .order('overall', { ascending: false });

  if (error) throw new Error(`Supabase fetch error: ${error.message}`);
  if (!rows || rows.length === 0) {
    console.log('[QA:email] No evaluations today — skipping email.');
    return;
  }

  const evals = rows as QualityEvaluation[];
  const date  = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

  const avgOverall = avg(evals.map(e => e.scores?.overall ?? 0));
  const ceoCount   = evals.filter(e => e.would_send_to_ceo).length;
  const subCount   = evals.filter(e => e.would_subscribe).length;

  // Top 3 best / worst
  const sorted   = [...evals].sort((a, b) => (b.scores?.overall ?? 0) - (a.scores?.overall ?? 0));
  const top3     = sorted.slice(0, 3);
  const bottom3  = sorted.slice(-3).reverse();

  // Frequent issues
  const errorCounts: Record<string, number>  = {};
  const notInterestCounts: Record<string, number> = {};
  evals.forEach(e => {
    (e.errors || []).forEach((err: any) => {
      const key = categorize(err.issue);
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    (e.not_interesting || []).forEach((ni: any) => {
      const key = categorize(ni.issue);
      notInterestCounts[key] = (notInterestCounts[key] || 0) + 1;
    });
  });
  const topErrors = topN(errorCounts, 4);
  const topNI     = topN(notInterestCounts, 3);

  const html = buildHtml({
    date, evals, avgOverall, ceoCount, subCount,
    top3, bottom3, topErrors, topNI, adminUrl: ADMIN_URL,
  });

  const { error: sendErr } = await resend.emails.send({
    from:    'AION QA <qa@aiongrowth.studio>',
    to:      REPORT_TO,
    subject: `AION QA — ${date} — ${evals.length} tests (avg ${avgOverall.toFixed(1)}/10)`,
    html,
  });

  if (sendErr) throw new Error(`Resend error: ${JSON.stringify(sendErr)}`);
  console.log(`[QA:email] ✓ Sent to ${REPORT_TO}`);
}

// ── Helpers ───────────────────────────────────────────────────────

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function topN(counts: Record<string, number>, n: number) {
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n);
}

function categorize(issue: string): string {
  const s = issue.toLowerCase();
  if (s.includes('competidor') || s.includes('competitor')) return 'competitor_wrong';
  if (s.includes('gap') && s.includes('keyword')) return 'keyword_gap_incoherent';
  if (s.includes('backlink')) return 'backlinks_mentioned';
  if (s.includes('veredicto') || s.includes('genérico') || s.includes('generico')) return 'verdict_generic';
  if (s.includes('lcp') || s.includes('cls') || s.includes('schema') || s.includes('técnico') || s.includes('tecnico')) return 'technical_jargon';
  if (s.includes('recomienda') && s.includes('contradict')) return 'recommendation_contradicts';
  if (s.includes('prensa') || s.includes('noticia')) return 'irrelevant_news';
  return issue.slice(0, 40);
}

// ── Email HTML ─────────────────────────────────────────────────────

function buildHtml(p: {
  date: string;
  evals: QualityEvaluation[];
  avgOverall: number;
  ceoCount: number;
  subCount: number;
  top3: QualityEvaluation[];
  bottom3: QualityEvaluation[];
  topErrors: [string, number][];
  topNI: [string, number][];
  adminUrl: string;
}) {
  const scoreColor = (s: number) => s >= 7 ? '#1d9e75' : s >= 5 ? '#ba7517' : '#e24b4a';
  const pct = (n: number, total: number) => Math.round((n / total) * 100);

  const domainRow = (e: QualityEvaluation, rank: number) => {
    const s = e.scores?.overall ?? 0;
    const hasErrors  = (e.errors || []).length > 0;
    const errorBadge = hasErrors ? `<span style="color:#e24b4a;font-size:11px"> ${e.errors.length} error(s)</span>` : '';
    return `
    <tr>
      <td style="padding:6px 8px;font-size:12px;color:#555">${rank}.</td>
      <td style="padding:6px 8px;font-size:13px;font-weight:600">${e.domain}</td>
      <td style="padding:6px 8px;font-size:11px;color:#888">${e.sector}</td>
      <td style="padding:6px 8px;font-weight:700;color:${scoreColor(s)}">${s.toFixed(1)}</td>
      <td style="padding:6px 8px;font-size:12px">${e.would_send_to_ceo ? '✓' : '✗'}${errorBadge}</td>
    </tr>`;
  };

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#1a1a2e;background:#f8f9fb">

<div style="background:#1a4b8c;color:#fff;border-radius:12px;padding:20px 24px;margin-bottom:24px">
  <div style="font-size:12px;opacity:.7;margin-bottom:4px">AION QA ENGINE</div>
  <div style="font-size:22px;font-weight:700">${p.date}</div>
  <div style="font-size:14px;opacity:.85;margin-top:4px">${p.evals.length} diagnósticos evaluados</div>
</div>

<!-- Summary stats -->
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px">
  <div style="background:#fff;border-radius:8px;padding:16px;text-align:center">
    <div style="font-size:28px;font-weight:800;color:${scoreColor(p.avgOverall)}">${p.avgOverall.toFixed(1)}</div>
    <div style="font-size:11px;color:#888;margin-top:4px">Score medio</div>
  </div>
  <div style="background:#fff;border-radius:8px;padding:16px;text-align:center">
    <div style="font-size:28px;font-weight:800;color:#1a4b8c">${p.ceoCount}/${p.evals.length}</div>
    <div style="font-size:11px;color:#888;margin-top:4px">Enviaría al CEO</div>
  </div>
  <div style="background:#fff;border-radius:8px;padding:16px;text-align:center">
    <div style="font-size:28px;font-weight:800;color:#1d9e75">${p.subCount}/${p.evals.length}</div>
    <div style="font-size:11px;color:#888;margin-top:4px">Pagaría</div>
  </div>
</div>

<!-- Best / worst table -->
<div style="background:#fff;border-radius:8px;padding:16px;margin-bottom:20px">
  <div style="font-size:12px;font-weight:700;color:#1a4b8c;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">Top 3 mejores</div>
  <table style="width:100%;border-collapse:collapse">
    ${p.top3.map((e, i) => domainRow(e, i + 1)).join('')}
  </table>
</div>

<div style="background:#fff;border-radius:8px;padding:16px;margin-bottom:20px">
  <div style="font-size:12px;font-weight:700;color:#e24b4a;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">Top 3 peores</div>
  <table style="width:100%;border-collapse:collapse">
    ${p.bottom3.map((e, i) => domainRow(e, i + 1)).join('')}
  </table>
</div>

<!-- Frequent issues -->
${p.topErrors.length ? `
<div style="background:#fff;border-radius:8px;padding:16px;margin-bottom:20px">
  <div style="font-size:12px;font-weight:700;color:#e24b4a;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">Errores más frecuentes (ERRÓNEO)</div>
  ${p.topErrors.map(([cat, count]) => {
    const pctVal = pct(count, p.evals.length);
    return `<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px">
        <span>${cat}</span><span style="color:#e24b4a;font-weight:700">${count}/${p.evals.length} (${pctVal}%)</span>
      </div>
      <div style="background:#f0f0f0;height:4px;border-radius:2px"><div style="background:#e24b4a;width:${pctVal}%;height:4px;border-radius:2px"></div></div>
    </div>`;
  }).join('')}
</div>` : ''}

${p.topNI.length ? `
<div style="background:#fff;border-radius:8px;padding:16px;margin-bottom:20px">
  <div style="font-size:12px;font-weight:700;color:#ba7517;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">Más frecuente (NO INTERESA)</div>
  ${p.topNI.map(([cat, count]) => {
    const pctVal = pct(count, p.evals.length);
    return `<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px">
        <span>${cat}</span><span style="color:#ba7517;font-weight:700">${count}/${p.evals.length} (${pctVal}%)</span>
      </div>
      <div style="background:#f0f0f0;height:4px;border-radius:2px"><div style="background:#ba7517;width:${pctVal}%;height:4px;border-radius:2px"></div></div>
    </div>`;
  }).join('')}
</div>` : ''}

<!-- CTA -->
<div style="text-align:center;padding:16px">
  <a href="${p.adminUrl}/admin/qa" style="background:#1a4b8c;color:#fff;border-radius:8px;padding:12px 28px;font-weight:700;text-decoration:none;font-size:14px">
    Ver detalles en /admin/qa →
  </a>
</div>

</body></html>`;
}
