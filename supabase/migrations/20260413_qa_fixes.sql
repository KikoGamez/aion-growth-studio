-- QA Fix tracking: link evaluations to applied fixes and measure impact
CREATE TABLE IF NOT EXISTS qa_fixes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id   UUID NOT NULL REFERENCES qa_quality_evaluations(id),
  domain          TEXT NOT NULL,
  prompt          TEXT NOT NULL,           -- the Claude Code prompt that was applied
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | applied | verified | failed
  applied_at      TIMESTAMPTZ,
  commit_sha      TEXT,                    -- optional: git commit reference
  -- Before/after scores (filled when re-evaluated)
  score_before    FLOAT,                   -- overall score of the original evaluation
  score_after     FLOAT,                   -- overall score of the re-evaluation
  delta           FLOAT,                   -- score_after - score_before
  verify_eval_id  UUID REFERENCES qa_quality_evaluations(id),  -- the re-evaluation
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qa_fixes_status ON qa_fixes(status);
CREATE INDEX IF NOT EXISTS idx_qa_fixes_domain ON qa_fixes(domain);
