/**
 * Regenerate the Growth Agent analysis (Sonnet draft + Opus QA) for a
 * client's latest snapshot using the existing pipeline_output — no
 * crawling, no DFS, no Apify, no GEO multi-sampling. Just the LLM steps.
 *
 * Use when you want to iterate on:
 *   - The system prompt in src/lib/ai/growth-agent.ts
 *   - The QA prompt in src/lib/ai/growth-agent-qa.ts
 *   - The PERFIL DE BENCHMARK context block injected into the draft
 *
 * Cost: ~€0.05 per run (Sonnet ~9K out + Opus ~3K out)
 * Time: ~4 min (Sonnet 180-220s + structural + Opus 60-90s)
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/dev/regenerate-agent.ts <clientId|name>
 */

import { createClient } from '@supabase/supabase-js';
import {
  getClientOnboarding, getClientById, getActionPlan, getCompletedActions,
  getRejectedRecommendations,
} from '../../src/lib/db';
import { runGrowthAgent, type IntegrationSummary } from '../../src/lib/ai/growth-agent';
import { getIntegration } from '../../src/lib/integrations';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

const arg = process.argv[2];
if (!arg) { console.error('Usage: regenerate-agent.ts <clientId|name>'); process.exit(1); }

// Resolve client
let client: any;
if (arg.length === 36 && arg.includes('-')) {
  const { data } = await sb.from('clients').select('*').eq('id', arg).single();
  client = data;
} else {
  const { data } = await sb.from('clients').select('*').ilike('name', `%${arg}%`).limit(1);
  client = data?.[0];
}
if (!client) { console.error(`Client not found: ${arg}`); process.exit(1); }
console.log(`Client: ${client.name} (${client.domain})\n`);

// Load latest snapshot
const { data: snap } = await sb
  .from('snapshots')
  .select('id, date, pipeline_output')
  .eq('client_id', client.id)
  .order('date', { ascending: false })
  .limit(1)
  .single();
if (!snap) { console.error('No snapshot found'); process.exit(1); }

const prevModel = snap.pipeline_output?.growth_analysis?.model;
console.log(`Snapshot ${snap.id} (${snap.date}) — prev model: ${prevModel || 'none'}\n`);

// Gather context (matches runRadarForClient / generate-briefing)
const [onboarding, inProgress, completed, rejected, googleIntegration] = await Promise.all([
  getClientOnboarding(client.id),
  getActionPlan(client.id).catch(() => []),
  getCompletedActions(client.id).catch(() => []),
  getRejectedRecommendations(client.id).catch(() => []),
  getIntegration(client.id, 'google_analytics').catch(() => null),
]);

const integrations: IntegrationSummary = {
  googleSearchConsole: !!googleIntegration && googleIntegration.status === 'connected',
  googleAnalytics: !!googleIntegration && googleIntegration.status === 'connected' && !!googleIntegration.property_id,
  ga4PropertyName: googleIntegration?.property_name,
  accountEmail: googleIntegration?.account_email,
};

console.log(`Running Sonnet draft + Opus QA (skipQA:false for end-to-end test)...`);
const t0 = Date.now();
const analysis = await runGrowthAgent({
  clientName: client.name,
  domain: client.domain,
  sector: client.sector,
  tier: client.tier,
  onboarding,
  pipelineOutput: snap.pipeline_output || {},
  priorityKeywords: onboarding?.priority_keywords,
  keywordStrategy: onboarding?.keyword_strategy,
  integrations,
  actionHistory: {
    completed: completed.map((a: any) => ({ title: a.title, impact: a.impact, completedAt: a.completed_at })),
    inProgress: inProgress.filter((a: any) => a.status === 'in_progress').map((a: any) => ({ title: a.title, impact: a.impact })),
    rejected: rejected.map((r: any) => ({ title: r.title, reason: r.rejected_reason })),
  },
});
console.log(`\nDone in ${Math.round((Date.now() - t0) / 1000)}s. Model: ${analysis.model}`);
console.log(`QA: ${analysis.qaPassed ? 'approved' : 'pending/failed'} — ${analysis.qaNotes?.join(' | ') || 'no notes'}`);
console.log(`\nHeadline: ${analysis.executiveSummary?.headline}`);
console.log(`\nSituation: ${analysis.executiveSummary?.situation}\n`);

// Save back
const newPipeline = { ...snap.pipeline_output, growth_analysis: analysis };
const { error } = await sb.from('snapshots').update({
  pipeline_output: newPipeline,
  has_growth_analysis: true,
}).eq('id', snap.id);

if (error) { console.error('Save failed:', error.message); process.exit(1); }
console.log(`✅ Snapshot updated. Refresh the dashboard.`);
