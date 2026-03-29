-- =============================================================================
-- VIZION — Cron infrastructure tables
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent — safe to re-execute
-- =============================================================================

-- ── cron_logs ─────────────────────────────────────────────────────────────────
-- Records every nightly cron execution for admin monitoring

CREATE TABLE IF NOT EXISTS cron_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type            text        NOT NULL,           -- 'update-players' | 'update-fixtures'
  status          text        NOT NULL CHECK (status IN ('success', 'error')),
  message         text,
  players_updated int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_logs_created_at ON cron_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_logs_type       ON cron_logs (type);

-- Allow authenticated users to read logs (internal admin tool)
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read cron_logs" ON cron_logs;
CREATE POLICY "Authenticated users can read cron_logs"
  ON cron_logs FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT policy from the client — logs are written server-side via service_role key

-- ── fixtures ──────────────────────────────────────────────────────────────────
-- Stores upcoming & past match fixtures for tracked players

CREATE TABLE IF NOT EXISTS fixtures (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_fixture_id  int         UNIQUE NOT NULL,    -- API-Football fixture ID
  player_id       uuid        REFERENCES players(id) ON DELETE SET NULL,
  date            timestamptz,
  home_team       text        NOT NULL,
  away_team       text        NOT NULL,
  competition     text        NOT NULL,
  status          text        NOT NULL DEFAULT 'NS', -- NS=Not Started, FT=Full Time, etc.
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fixtures_date      ON fixtures (date DESC);
CREATE INDEX IF NOT EXISTS idx_fixtures_player_id ON fixtures (player_id);

ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read fixtures" ON fixtures;
CREATE POLICY "Authenticated users can read fixtures"
  ON fixtures FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- VERIFICATION
--   SELECT type, status, message, players_updated, created_at
--   FROM cron_logs ORDER BY created_at DESC LIMIT 10;
-- =============================================================================
