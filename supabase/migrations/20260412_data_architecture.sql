-- ═══════════════════════════════════════════════════════════════════════════
-- Data architecture improvements — April 2026
--
-- 5 changes for cross-client analytics, feedback loop, and AI observability:
--
-- 1. kpi_series          — time-series KPIs extracted from snapshot JSONB
-- 2. action_outcomes     — measured impact of completed actions on KPIs
-- 3. ai_generation_log   — observability for all LLM calls (Growth Agent, Chat, GEO)
-- 4. pillar column       — on recommendations + action_plan (was buried in JSONB data)
-- 5. materialized cols   — on snapshots (score breakdown + key metrics for fast queries)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. KPI TIME SERIES ──────────────────────────────────────────────────
-- One row per KPI per snapshot. Enables cross-client benchmarks, trend
-- queries, and sector analysis without deserializing pipeline_output JSONB.
-- Populated by createSnapshotFromAudit() extracting ~20 KPIs per snapshot.

CREATE TABLE IF NOT EXISTS kpi_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  snapshot_id uuid,
  date date NOT NULL,
  kpi_key text NOT NULL,              -- e.g. 'seo.keywordsTop10', 'gsc.totalClicks', 'web.mobile'
  value numeric,                       -- numeric value of the KPI
  source text,                         -- 'dfs', 'gsc', 'ga4', 'pipeline', 'score'
  created_at timestamptz DEFAULT now()
);

-- Primary query: "show me this KPI for this client over time"
CREATE INDEX IF NOT EXISTS idx_kpi_series_client_kpi
  ON kpi_series (client_id, kpi_key, date);

-- Cross-client query: "average of this KPI across all clients in last 30 days"
CREATE INDEX IF NOT EXISTS idx_kpi_series_kpi_date
  ON kpi_series (kpi_key, date);

-- Prevent duplicate entries for same client + date + kpi_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_kpi_series_unique
  ON kpi_series (client_id, date, kpi_key);

COMMENT ON TABLE kpi_series IS
  'Time-series storage of KPIs extracted from each weekly snapshot. '
  'Enables SQL-level cross-client analytics, sector benchmarks, and '
  'trend queries without deserializing pipeline_output JSONB blobs.';

-- ─── 2. ACTION OUTCOMES ──────────────────────────────────────────────────
-- Structured feedback loop: which actions had which measured impact on
-- which KPIs. Populated by the diff-engine when it detects correlations
-- between completed actions and KPI changes in subsequent snapshots.
-- This is the foundation for empirical recommendation prioritization:
-- "clients in sector X who implemented Schema FAQ saw +15% keywords on average".

CREATE TABLE IF NOT EXISTS action_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  action_id uuid,                      -- FK to action_plan (nullable if action was deleted)
  recommendation_id uuid,              -- FK to recommendations (nullable)
  pillar text,                         -- 'seo', 'geo', 'web', 'conversion', 'content', 'reputation'
  action_title text NOT NULL,
  action_completed_at date,
  -- Measured KPI impact
  kpi_key text NOT NULL,               -- which KPI changed
  kpi_before numeric,                  -- value N days before action completion
  kpi_after numeric,                   -- value N days after
  delta_abs numeric,                   -- kpi_after - kpi_before
  delta_pct numeric,                   -- % change
  -- Evaluation
  correlation_type text,               -- 'probable_cause', 'possible_cause', 'coincidence'
  confidence numeric,                  -- 0.0 to 1.0
  days_measured int,                   -- how many days after completion was this measured
  sector text,                         -- client's sector at time of measurement (for cross-sector analysis)
  created_at timestamptz DEFAULT now()
);

-- "What type of action moves Keywords Top 10 the most?"
CREATE INDEX IF NOT EXISTS idx_action_outcomes_kpi
  ON action_outcomes (kpi_key, correlation_type);

-- "What's the average impact of actions in pillar X?"
CREATE INDEX IF NOT EXISTS idx_action_outcomes_pillar
  ON action_outcomes (pillar, kpi_key);

-- Per-client history
CREATE INDEX IF NOT EXISTS idx_action_outcomes_client
  ON action_outcomes (client_id, created_at DESC);

COMMENT ON TABLE action_outcomes IS
  'Structured feedback loop linking completed actions to measured KPI changes. '
  'Populated by the diff-engine during weekly Radar runs. Enables empirical '
  'recommendation prioritization: "this type of action had X% impact on Y KPI '
  'across Z clients in sector W".';

-- ─── 3. AI GENERATION LOG ────────────────────────────────────────────────
-- Observability for every LLM call across the platform. Tracks success
-- rate, cost, latency, token usage, QA corrections, and failure modes.
-- Critical for: cost budgeting, fallback rate monitoring, Opus QA ROI.

CREATE TABLE IF NOT EXISTS ai_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,                      -- nullable (some calls are anonymous, e.g. audit pipeline)
  agent text NOT NULL,                 -- 'growth_agent', 'growth_agent_qa', 'advisor_chat', 'geo_probe', 'sector', 'content', 'conversion', 'competitors'
  model text NOT NULL,                 -- 'claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5', 'gpt-4o-mini', 'gemini-2.0-flash', etc.
  layer int DEFAULT 1,                 -- 1=primary, 2=retry, 3=micro_fallback, 4=template_fallback
  success boolean NOT NULL,
  -- Token usage
  input_tokens int,
  output_tokens int,
  cache_read_tokens int,
  cache_write_tokens int,
  cost_cents numeric,                  -- estimated cost in USD cents
  latency_ms int,
  -- Quality metrics (Growth Agent specific)
  qa_corrections int DEFAULT 0,        -- number of corrections Opus QA applied
  structural_errors text[],             -- validation errors (if any)
  stop_reason text,                     -- 'end_turn', 'max_tokens', 'timeout', etc.
  error_message text,                   -- if failed, what went wrong
  created_at timestamptz DEFAULT now()
);

-- "What's our fallback rate this week?"
CREATE INDEX IF NOT EXISTS idx_ai_log_agent_date
  ON ai_generation_log (agent, created_at DESC);

-- "How much is client X costing in AI?"
CREATE INDEX IF NOT EXISTS idx_ai_log_client
  ON ai_generation_log (client_id, created_at DESC);

-- "Which model has the highest failure rate?"
CREATE INDEX IF NOT EXISTS idx_ai_log_model_success
  ON ai_generation_log (model, success);

COMMENT ON TABLE ai_generation_log IS
  'Observability table for all LLM API calls across AION. Tracks cost, '
  'latency, success rate, token usage, QA corrections, and failure modes. '
  'Enables cost budgeting per client, fallback rate monitoring, and '
  'evaluating whether Opus QA is worth its ~$0.25/call overhead.';

-- ─── 4. PILLAR COLUMN ON RECOMMENDATIONS + ACTION_PLAN ───────────────────
-- Currently pillar is buried in the JSONB `data` column. Extracting it
-- enables SQL-level filtering (getRecommendationsByPillar) without
-- deserializing JSON on every query.

-- Note: the table might be called 'recommendations' or 'recommendations_log'
-- depending on migration history. We handle both defensively.
DO $$ BEGIN
  ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS pillar text;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE recommendations_log ADD COLUMN IF NOT EXISTS pillar text;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE action_plan ADD COLUMN IF NOT EXISTS pillar text;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Indexes for filtered queries
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_recommendations_pillar
    ON recommendations (client_id, pillar, status);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_action_plan_pillar
    ON action_plan (client_id, pillar, status);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── 5. MATERIALIZED COLUMNS ON SNAPSHOTS ────────────────────────────────
-- Key metrics extracted to top-level columns for fast cross-client queries
-- without deserializing the pipeline_output JSONB blob.

DO $$ BEGIN
  ALTER TABLE snapshots
    ADD COLUMN IF NOT EXISTS score_total int,
    ADD COLUMN IF NOT EXISTS score_seo int,
    ADD COLUMN IF NOT EXISTS score_geo int,
    ADD COLUMN IF NOT EXISTS score_web int,
    ADD COLUMN IF NOT EXISTS score_conversion int,
    ADD COLUMN IF NOT EXISTS score_reputation int,
    ADD COLUMN IF NOT EXISTS keywords_top10 int,
    ADD COLUMN IF NOT EXISTS organic_traffic int,
    ADD COLUMN IF NOT EXISTS mention_rate numeric,
    ADD COLUMN IF NOT EXISTS pagespeed_mobile int,
    ADD COLUMN IF NOT EXISTS has_growth_analysis boolean DEFAULT false;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Fast client ranking queries
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_snapshots_scores
    ON snapshots (client_id, date, score_total);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE kpi_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "KPI series access via client"
  ON kpi_series FOR ALL
  USING (client_id IN (
    SELECT client_id FROM client_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Action outcomes access via client"
  ON action_outcomes FOR ALL
  USING (client_id IN (
    SELECT client_id FROM client_users WHERE user_id = auth.uid()
  ));

-- AI log is admin-only (service key access); no user-facing RLS policy.
-- If needed later, add a policy for admin role.
CREATE POLICY "AI log read for authenticated"
  ON ai_generation_log FOR SELECT
  USING (auth.role() = 'authenticated');
