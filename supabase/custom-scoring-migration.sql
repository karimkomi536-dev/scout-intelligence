-- custom-scoring-migration.sql
-- Customizable scoring profiles per organization (Pro+ feature)
--
-- Run in Supabase SQL Editor after schema-multitenancy.sql

-- ── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scoring_profiles (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  position_group   text        NOT NULL CHECK (position_group IN ('GK', 'DEF', 'MID', 'ATT')),
  weights          jsonb       NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, position_group)
);

-- Auto-update updated_at on upsert
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scoring_profiles_updated_at ON scoring_profiles;
CREATE TRIGGER scoring_profiles_updated_at
  BEFORE UPDATE ON scoring_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS scoring_profiles_org_idx ON scoring_profiles (organization_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE scoring_profiles ENABLE ROW LEVEL SECURITY;

-- Members of the org can read their org's profiles
CREATE POLICY "org members can read scoring_profiles"
  ON scoring_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.organization_id = scoring_profiles.organization_id
    )
  );

-- Members of the org can upsert their org's profiles
CREATE POLICY "org members can upsert scoring_profiles"
  ON scoring_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.organization_id = scoring_profiles.organization_id
    )
  );

CREATE POLICY "org members can update scoring_profiles"
  ON scoring_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.organization_id = scoring_profiles.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.organization_id = scoring_profiles.organization_id
    )
  );
