-- =============================================================================
-- VIZION — Players table: add advanced stat columns
-- =============================================================================
-- Run BEFORE executing run_pipeline.py for the first time.
-- Idempotent — safe to re-execute (ADD COLUMN IF NOT EXISTS).
-- =============================================================================

-- Identity / profile
ALTER TABLE players ADD COLUMN IF NOT EXISTS nationality         text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS foot                text;

-- Playing time
ALTER TABLE players ADD COLUMN IF NOT EXISTS minutes_played      numeric DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS appearances         numeric DEFAULT 0;

-- Offensive stats
ALTER TABLE players ADD COLUMN IF NOT EXISTS goals               numeric DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS assists             numeric DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS xg                  numeric DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS xa                  numeric DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS shot_creating_actions numeric DEFAULT 0;

-- Defensive stats
ALTER TABLE players ADD COLUMN IF NOT EXISTS tackles             numeric DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS interceptions       numeric DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS blocks              numeric DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS clearances          numeric DEFAULT 0;

-- Pressing stats
ALTER TABLE players ADD COLUMN IF NOT EXISTS pressures           numeric DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS pressure_success_rate numeric DEFAULT 0;

-- Passing stats
ALTER TABLE players ADD COLUMN IF NOT EXISTS pass_completion_rate  numeric DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS progressive_passes    numeric DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS key_passes            numeric DEFAULT 0;

-- Radar chart data (JSON: technique, physical, pace, mental, tactical, potential)
ALTER TABLE players ADD COLUMN IF NOT EXISTS individual_stats    jsonb;

-- Useful indexes for filtering
CREATE INDEX IF NOT EXISTS idx_players_competition   ON players (competition);
CREATE INDEX IF NOT EXISTS idx_players_position      ON players (primary_position);
CREATE INDEX IF NOT EXISTS idx_players_scout_score   ON players (scout_score DESC);
CREATE INDEX IF NOT EXISTS idx_players_scout_label   ON players (scout_label);

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'players' ORDER BY ordinal_position;
-- =============================================================================
