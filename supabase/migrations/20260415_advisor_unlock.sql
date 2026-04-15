-- ═══════════════════════════════════════════════════════════════════════════
-- Advisor daily-cap unlock
--
-- When the client hits their daily Advisor cap they can purchase a 24h
-- unlock (pay-per-day top-up). The timestamp lives on client_usage so the
-- same checkBudget() flow can consult it without extra joins.
--
-- Monthly hard lock is removed from the code — only the daily cap
-- gates. unlock_until temporarily overrides the daily cap when set.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE client_usage
    ADD COLUMN IF NOT EXISTS unlock_until timestamptz;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

COMMENT ON COLUMN client_usage.unlock_until IS
  'When set to a future timestamp, the daily Advisor cap is temporarily '
  'bypassed for this client. Written by /api/advisor/unlock-day after a '
  'successful one-time payment. Cleared on month rollover (naturally, new row).';
