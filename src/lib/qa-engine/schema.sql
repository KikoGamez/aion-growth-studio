-- ────────────────────────────────────────────────────────────────────
-- AION QA Engine — Supabase schema
-- Run this in Supabase SQL editor (once)
-- ────────────────────────────────────────────────────────────────────

-- Quality evaluations (Motor 2)
CREATE TABLE IF NOT EXISTS qa_quality_evaluations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain        TEXT NOT NULL,
  sector        TEXT,
  audit_score   INT,
  clarity       FLOAT,
  credibility   FLOAT,
  actionability FLOAT,
  urgency       FLOAT,
  willingness_to_pay FLOAT,
  overall       FLOAT,
  would_send_to_ceo   BOOLEAN,
  would_subscribe     BOOLEAN,
  ceo_reason          TEXT,
  subscribe_reason    TEXT,
  errors              JSONB DEFAULT '[]',
  not_interesting     JSONB DEFAULT '[]',
  best_part           TEXT,
  worst_part          TEXT,
  prompt_for_claude_code TEXT,
  raw_audit           JSONB,
  raw_report_text     TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Consistency domains (Motor 1, editable from admin)
CREATE TABLE IF NOT EXISTS qa_consistency_domains (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain               TEXT NOT NULL,
  sector               TEXT,
  expected_competitors TEXT[],
  excluded_competitors TEXT[],
  notes                TEXT,
  is_active            BOOLEAN DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- Seed Motor 1 domains
INSERT INTO qa_consistency_domains (domain, sector, expected_competitors, excluded_competitors)
VALUES
  ('andbank.com',    'banca_privada',          ARRAY['lombardodier.com','juliusbaer.com'],  ARRAY['bancosabadell.com','santander.com']),
  ('factorial.co',   'saas_b2b',               ARRAY['personio.com','sesame.co'],           ARRAY['workday.com','oracle.com']),
  ('promofarma.com', 'ecommerce',              ARRAY['mifarma.es','dosfarma.com'],           ARRAY['amazon.es']),
  ('auren.com',      'servicios_profesionales', ARRAY['mazars.es','bdo.es'],                ARRAY['deloitte.com','pwc.com']),
  ('hotelurban.com', 'hosteleria',             ARRAY['casacamper.com','hotelomm.es'],        ARRAY['melia.com','nh-hotels.com'])
ON CONFLICT DO NOTHING;

-- Consistency runs (Motor 1)
CREATE TABLE IF NOT EXISTS qa_consistency_runs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain                 TEXT NOT NULL,
  run_date               DATE DEFAULT CURRENT_DATE,
  total_runs             INT,
  is_consistent          BOOLEAN,
  metrics_summary        JSONB,
  competitor_issues      JSONB,
  opus_analysis          JSONB,
  prompt_for_claude_code TEXT,
  raw_results            JSONB,
  created_at             TIMESTAMPTZ DEFAULT now()
);

-- Open issues (both motors)
CREATE TABLE IF NOT EXISTS qa_issues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engine      TEXT NOT NULL,
  issue_type  TEXT NOT NULL,
  domain      TEXT,
  sector      TEXT,
  severity    TEXT,
  category    TEXT,
  description TEXT NOT NULL,
  occurrences INT DEFAULT 1,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at  TIMESTAMPTZ DEFAULT now(),
  status      TEXT DEFAULT 'open'
);

-- Learnings (pattern detector)
CREATE TABLE IF NOT EXISTS qa_learnings (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern                TEXT NOT NULL,
  evidence_count         INT DEFAULT 1,
  affected_sectors       TEXT[],
  confidence             FLOAT,
  fix_type               TEXT,
  fix_proposal           TEXT,
  prompt_for_claude_code TEXT,
  status                 TEXT DEFAULT 'detected',
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quality_evals_created  ON qa_quality_evaluations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_evals_overall  ON qa_quality_evaluations(overall);
CREATE INDEX IF NOT EXISTS idx_quality_evals_domain   ON qa_quality_evaluations(domain);
CREATE INDEX IF NOT EXISTS idx_consistency_runs_date  ON qa_consistency_runs(run_date DESC);
CREATE INDEX IF NOT EXISTS idx_qa_issues_open         ON qa_issues(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_qa_learnings_status    ON qa_learnings(status);
