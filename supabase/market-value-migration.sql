-- ── Market Value Migration ────────────────────────────────────────────────────
-- Adds market_value_eur to players and creates market_value_history table.
-- Order: CREATE TABLE → ALTER TABLE → CREATE INDEX → ENABLE RLS → POLICIES

-- 1. History table
CREATE TABLE IF NOT EXISTS market_value_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  value_eur   int  NOT NULL,
  source      text NOT NULL DEFAULT 'transfermarkt',
  recorded_at date NOT NULL DEFAULT current_date
);

-- 2. Add column to players (idempotent)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS market_value_eur int;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS market_value_history_player_id_idx
  ON market_value_history(player_id);

CREATE INDEX IF NOT EXISTS market_value_history_recorded_at_idx
  ON market_value_history(player_id, recorded_at DESC);

-- 4. RLS
ALTER TABLE market_value_history ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Authenticated users can read history for players in their org
DROP POLICY IF EXISTS "market_value_history_select" ON market_value_history;
CREATE POLICY "market_value_history_select"
  ON market_value_history FOR SELECT
  TO authenticated
  USING (true);

-- Only service role (scraper) can insert/update — no INSERT policy for anon/authenticated
