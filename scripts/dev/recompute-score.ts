/**
 * Recompute ONLY the score for a client's latest snapshot, using the
 * current benchmark profile logic. Does NOT re-crawl, does NOT re-fetch
 * SEO/GEO/social data, does NOT call the LLM. Reads pipeline_output
 * from the existing snapshot, runs runScore() on it, writes back.
 *
 * Use when you want to iterate on:
 *   - profile thresholds in src/lib/benchmarks/profiles.ts
 *   - pillar weights
 *   - scoring formulas in src/lib/audit/modules/score.ts
 *   - geo multipliers
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/dev/recompute-score.ts <clientId>
 *   node --env-file=.env --import tsx scripts/dev/recompute-score.ts kiko   # partial name match
 *
 * Prints before/after breakdown so you can see exactly what your change
 * did to the score without waiting for the pipeline.
 */

import { createClient } from '@supabase/supabase-js';
import { runScore } from '../../src/lib/audit/modules/score';
import { getClientOnboarding } from '../../src/lib/db';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: recompute-score.ts <clientId|name-substring>');
  process.exit(1);
}

// Resolve client (accept id or partial name)
let client: any;
if (arg.length === 36 && arg.includes('-')) {
  const { data } = await sb.from('clients').select('id, name, domain').eq('id', arg).single();
  client = data;
} else {
  const { data } = await sb.from('clients').select('id, name, domain').ilike('name', `%${arg}%`).limit(1);
  client = data?.[0];
}
if (!client) { console.error(`Client not found: ${arg}`); process.exit(1); }
console.log(`Client: ${client.name} (${client.domain}) — ${client.id}\n`);

// Load latest snapshot
const { data: snap } = await sb
  .from('snapshots')
  .select('id, date, score_total, score_seo, score_geo, score_web, score_conversion, score_reputation, pipeline_output')
  .eq('client_id', client.id)
  .order('date', { ascending: false })
  .limit(1)
  .single();
if (!snap) { console.error('No snapshot found'); process.exit(1); }

console.log(`Snapshot ${snap.id} (${snap.date})`);
console.log(`Before: total=${snap.score_total} seo=${snap.score_seo} geo=${snap.score_geo} web=${snap.score_web} conv=${snap.score_conversion} rep=${snap.score_reputation}\n`);

// Fetch onboarding for profile override
const onboarding = await getClientOnboarding(client.id);

// Run score module in isolation
const result = await runScore(snap.pipeline_output || {}, onboarding as any);
const breakdown = (result as any).breakdown || {};
const computation = (result as any).computation || {};

console.log(`After:  total=${result.total} seo=${breakdown.seo} geo=${breakdown.geo} web=${breakdown.web} conv=${breakdown.conversion} rep=${breakdown.reputation}`);
if (computation.profile) {
  console.log(`Profile: ${computation.profile.profile}/${computation.profile.geoScope} (${computation.profile.source}, conf ${computation.profile.confidence})`);
}
if (computation.reputation) {
  console.log(`\nReputation breakdown:`);
  for (const c of computation.reputation.components) console.log(`  ${c.label}: ${c.value} × ${c.weight}`);
}

// Write back: update pipeline_output.score + materialized columns
const newPipeline = { ...(snap.pipeline_output || {}), score: result };
const { error } = await sb.from('snapshots').update({
  pipeline_output: newPipeline,
  score_total: result.total,
  score_seo: breakdown.seo,
  score_geo: breakdown.geo,
  score_web: breakdown.web,
  score_conversion: breakdown.conversion,
  score_reputation: breakdown.reputation,
}).eq('id', snap.id);

if (error) { console.error('Save failed:', error.message); process.exit(1); }
console.log(`\n✅ Snapshot updated. Refresh the dashboard to see the new score.`);
