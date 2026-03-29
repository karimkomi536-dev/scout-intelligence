-- =============================================================================
-- VIZION — Add Understat xG columns to players table
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent — safe to re-execute (ADD COLUMN IF NOT EXISTS)
-- =============================================================================

ALTER TABLE players ADD COLUMN IF NOT EXISTS xg_understat float;
ALTER TABLE players ADD COLUMN IF NOT EXISTS xa_understat float;
ALTER TABLE players ADD COLUMN IF NOT EXISTS np_xg        float;

-- Optional index for analytics queries on xG data quality
CREATE INDEX IF NOT EXISTS idx_players_xg_understat ON players (xg_understat DESC NULLS LAST);

-- =============================================================================
-- VERIFICATION
--   SELECT name, team, xg, xg_understat, xa, xa_understat, np_xg
--   FROM players
--   WHERE xg_understat IS NOT NULL
--   ORDER BY xg_understat DESC
--   LIMIT 20;
-- =============================================================================
