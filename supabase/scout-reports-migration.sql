-- =============================================================================
-- VIZION — Scout Reports table
-- Generated: 2026-03-28
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================================

CREATE TABLE IF NOT EXISTS scout_reports (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       uuid        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid        REFERENCES organizations(id) ON DELETE SET NULL,

  -- 1-5 ratings per criterion
  technique       int         NOT NULL CHECK (technique  BETWEEN 1 AND 5),
  tactique        int         NOT NULL CHECK (tactique   BETWEEN 1 AND 5),
  mental          int         NOT NULL CHECK (mental     BETWEEN 1 AND 5),
  physique        int         NOT NULL CHECK (physique   BETWEEN 1 AND 5),
  potentiel       int         NOT NULL CHECK (potentiel  BETWEEN 1 AND 5),

  -- Match context
  match_date      date        NOT NULL,
  competition     text        NOT NULL DEFAULT '',
  venue           text        NOT NULL DEFAULT '',

  -- Scouting opinion
  summary         text        NOT NULL DEFAULT '' CHECK (char_length(summary) <= 500),
  recommendation  text        NOT NULL CHECK (recommendation IN ('signer', 'suivre', 'écarter')),

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scout_reports_player_idx ON scout_reports (player_id);
CREATE INDEX IF NOT EXISTS scout_reports_user_idx   ON scout_reports (user_id);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE scout_reports ENABLE ROW LEVEL SECURITY;

-- Scout can read reports for players in their org or their own reports
DROP POLICY IF EXISTS "scout_reports_select" ON scout_reports;
CREATE POLICY "scout_reports_select" ON scout_reports
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Any authenticated user can insert their own reports
DROP POLICY IF EXISTS "scout_reports_insert" ON scout_reports;
CREATE POLICY "scout_reports_insert" ON scout_reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Only the author can update or delete their own reports
DROP POLICY IF EXISTS "scout_reports_update" ON scout_reports;
CREATE POLICY "scout_reports_update" ON scout_reports
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "scout_reports_delete" ON scout_reports;
CREATE POLICY "scout_reports_delete" ON scout_reports
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- [VERIFY]
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'scout_reports'
ORDER BY cmd;
