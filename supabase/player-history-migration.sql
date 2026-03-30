-- =============================================================================
-- VIZION — player_history : snapshots de progression par joueur + saison
-- =============================================================================
-- Upsert strategy : une ligne par (player_id, season)
-- Chaque run du pipeline met à jour le snapshot de la saison en cours.
-- =============================================================================

-- 1. Table
CREATE TABLE IF NOT EXISTS player_history (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id        uuid        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season           text        NOT NULL DEFAULT '2024-25',
  snapshot_date    date        NOT NULL DEFAULT CURRENT_DATE,
  overall_score    integer,
  goals            integer,
  assists          integer,
  xg               float,
  xa               float,
  minutes_played   integer,
  appearances      integer,
  market_value_eur integer,
  individual_stats jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 2. Colonnes ajoutées progressivement (idempotent)
ALTER TABLE player_history ADD COLUMN IF NOT EXISTS season           text    NOT NULL DEFAULT '2024-25';
ALTER TABLE player_history ADD COLUMN IF NOT EXISTS goals            integer;
ALTER TABLE player_history ADD COLUMN IF NOT EXISTS assists          integer;
ALTER TABLE player_history ADD COLUMN IF NOT EXISTS xg               float;
ALTER TABLE player_history ADD COLUMN IF NOT EXISTS xa               float;
ALTER TABLE player_history ADD COLUMN IF NOT EXISTS minutes_played   integer;
ALTER TABLE player_history ADD COLUMN IF NOT EXISTS appearances      integer;
ALTER TABLE player_history ADD COLUMN IF NOT EXISTS market_value_eur integer;

-- 3. Ancien index (player_id, snapshot_date) → remplacé par (player_id, season)
DROP INDEX IF EXISTS player_history_player_date_uidx;

-- 4. Nouvel index unique — upsert sur (player_id, season)
CREATE UNIQUE INDEX IF NOT EXISTS player_history_player_season_uidx
  ON player_history (player_id, season);

-- 5. Index de lecture rapide (player_id + snapshot_date DESC pour graphiques)
CREATE INDEX IF NOT EXISTS player_history_player_date_idx
  ON player_history (player_id, snapshot_date DESC);

-- 6. RLS
ALTER TABLE player_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can read player_history" ON player_history;
DROP POLICY IF EXISTS "ph_select" ON player_history;

CREATE POLICY "ph_select"
  ON player_history
  FOR SELECT
  USING (true);

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
-- SELECT player_id, season, overall_score, goals, assists, snapshot_date
-- FROM player_history
-- ORDER BY snapshot_date DESC
-- LIMIT 20;
-- =============================================================================
