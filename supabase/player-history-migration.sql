-- ── player_history migration ──────────────────────────────────────────────────
-- One row per player per day — stores the overall score + individual axis scores
-- Upsert strategy: unique index on (player_id, snapshot_date)

-- 1. Table
CREATE TABLE IF NOT EXISTS player_history (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id        uuid        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  overall_score    integer     NOT NULL,
  individual_stats jsonb,
  snapshot_date    date        NOT NULL DEFAULT CURRENT_DATE,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 2. Unique constraint — prevents duplicate snapshots on the same day
CREATE UNIQUE INDEX IF NOT EXISTS player_history_player_date_uidx
  ON player_history (player_id, snapshot_date);

-- 3. Query index — fast retrieval of history ordered by date
CREATE INDEX IF NOT EXISTS player_history_player_date_idx
  ON player_history (player_id, snapshot_date DESC);

-- 4. RLS
ALTER TABLE player_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can read player_history" ON player_history;
CREATE POLICY "authenticated can read player_history"
  ON player_history
  FOR SELECT
  TO authenticated
  USING (true);
