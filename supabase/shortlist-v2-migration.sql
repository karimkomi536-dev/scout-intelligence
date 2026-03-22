-- =============================================================================
-- VIZION — Shortlist v2 migration
-- Run this in the Supabase SQL Editor ONCE.
-- Idempotent — safe to re-run.
-- =============================================================================

-- ── 1. Named shortlist groups ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shortlist_groups (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        text        NOT NULL DEFAULT 'Ma shortlist',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE shortlist_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shortlist_groups: owner all"  ON shortlist_groups;
DROP POLICY IF EXISTS "shortlist_groups: share read"  ON shortlist_groups;

CREATE POLICY "shortlist_groups: owner all" ON shortlist_groups
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Public read when a share token exists for this group
CREATE POLICY "shortlist_groups: share read" ON shortlist_groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM shortlist_shares WHERE list_id = shortlist_groups.id)
  );


-- ── 2. Add columns to existing shortlists table ──────────────────────────────

ALTER TABLE shortlists ADD COLUMN IF NOT EXISTS list_id        uuid    REFERENCES shortlist_groups(id) ON DELETE CASCADE;
ALTER TABLE shortlists ADD COLUMN IF NOT EXISTS tags           jsonb   NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE shortlists ADD COLUMN IF NOT EXISTS position_index integer NOT NULL DEFAULT 0;

-- UPDATE policy (needed for tags + reorder — might not exist yet)
DROP POLICY IF EXISTS "shortlists: owner update" ON shortlists;
CREATE POLICY "shortlists: owner update" ON shortlists
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Public read for shared lists
DROP POLICY IF EXISTS "shortlists: share read" ON shortlists;
CREATE POLICY "shortlists: share read" ON shortlists
  FOR SELECT USING (
    list_id IS NOT NULL AND
    EXISTS (SELECT 1 FROM shortlist_shares WHERE list_id = shortlists.list_id)
  );

CREATE INDEX IF NOT EXISTS idx_shortlists_list_id       ON shortlists (list_id);
CREATE INDEX IF NOT EXISTS idx_shortlists_position      ON shortlists (list_id, position_index);


-- ── 3. Share tokens ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shortlist_shares (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id     uuid        REFERENCES shortlist_groups(id) ON DELETE CASCADE NOT NULL,
  token       text        UNIQUE NOT NULL,
  created_at  timestamptz DEFAULT now(),
  expires_at  timestamptz
);

ALTER TABLE shortlist_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shortlist_shares: owner all" ON shortlist_shares;
DROP POLICY IF EXISTS "shortlist_shares: public read" ON shortlist_shares;

-- Owner can manage their shares
CREATE POLICY "shortlist_shares: owner all" ON shortlist_shares
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM shortlist_groups WHERE id = list_id)
  ) WITH CHECK (
    auth.uid() IN (SELECT user_id FROM shortlist_groups WHERE id = list_id)
  );

-- Anon can read by token (tokens = 128-bit random — enumeration not practical)
CREATE POLICY "shortlist_shares: public read" ON shortlist_shares
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_shortlist_shares_token   ON shortlist_shares (token);
CREATE INDEX IF NOT EXISTS idx_shortlist_shares_list_id ON shortlist_shares (list_id);


-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
-- SELECT * FROM shortlist_groups LIMIT 5;
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name IN ('shortlists','shortlist_groups','shortlist_shares')
--   ORDER BY table_name, ordinal_position;
-- =============================================================================
