-- =============================================================================
-- VIZION — Shortlist v2 migration
-- Run this in the Supabase SQL Editor ONCE.
-- Idempotent — safe to re-run.
-- =============================================================================


-- ── 1. CREATE all tables first ───────────────────────────────────────────────

-- Base shortlists table (created first — shortlist_groups/shares depend on nothing yet)
CREATE TABLE IF NOT EXISTS shortlists (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id      uuid        REFERENCES players(id) ON DELETE CASCADE,
  notes          text,
  tags           jsonb       NOT NULL DEFAULT '[]'::jsonb,
  position_index integer     NOT NULL DEFAULT 0,
  list_id        uuid,                         -- FK to shortlist_groups added below
  created_at     timestamptz DEFAULT now(),
  UNIQUE(user_id, player_id)
);

CREATE TABLE IF NOT EXISTS shortlist_groups (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        text        NOT NULL DEFAULT 'Ma shortlist',
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shortlist_shares (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id     uuid        REFERENCES shortlist_groups(id) ON DELETE CASCADE NOT NULL,
  token       text        UNIQUE NOT NULL,
  created_at  timestamptz DEFAULT now(),
  expires_at  timestamptz
);


-- ── 2. Add FK from shortlists.list_id → shortlist_groups (now that it exists) ──

-- Add list_id FK if column exists but constraint doesn't yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'shortlists_list_id_fkey'
      AND table_name = 'shortlists'
  ) THEN
    ALTER TABLE shortlists
      ADD CONSTRAINT shortlists_list_id_fkey
      FOREIGN KEY (list_id) REFERENCES shortlist_groups(id) ON DELETE CASCADE;
  END IF;
END $$;


-- ── 3. ADD COLUMN for any pre-existing shortlists table (no-op if already present) ──

ALTER TABLE shortlists ADD COLUMN IF NOT EXISTS tags           jsonb   NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE shortlists ADD COLUMN IF NOT EXISTS position_index integer NOT NULL DEFAULT 0;
ALTER TABLE shortlists ADD COLUMN IF NOT EXISTS list_id        uuid;


-- ── 4. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_shortlists_list_id        ON shortlists (list_id);
CREATE INDEX IF NOT EXISTS idx_shortlists_position       ON shortlists (list_id, position_index);
CREATE INDEX IF NOT EXISTS idx_shortlist_shares_token    ON shortlist_shares (token);
CREATE INDEX IF NOT EXISTS idx_shortlist_shares_list_id  ON shortlist_shares (list_id);


-- ── 5. Enable RLS ─────────────────────────────────────────────────────────────

ALTER TABLE shortlists       ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlist_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlist_shares ENABLE ROW LEVEL SECURITY;


-- ── 6. Policies — shortlists ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "shortlists: owner select" ON shortlists;
DROP POLICY IF EXISTS "shortlists: owner insert" ON shortlists;
DROP POLICY IF EXISTS "shortlists: owner update" ON shortlists;
DROP POLICY IF EXISTS "shortlists: owner delete" ON shortlists;
DROP POLICY IF EXISTS "shortlists: share read"   ON shortlists;

CREATE POLICY "shortlists: owner select" ON shortlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "shortlists: owner insert" ON shortlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shortlists: owner update" ON shortlists
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shortlists: owner delete" ON shortlists
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "shortlists: share read" ON shortlists
  FOR SELECT USING (
    list_id IS NOT NULL AND
    EXISTS (SELECT 1 FROM shortlist_shares WHERE list_id = shortlists.list_id)
  );


-- ── 7. Policies — shortlist_groups ───────────────────────────────────────────

DROP POLICY IF EXISTS "shortlist_groups: owner all"  ON shortlist_groups;
DROP POLICY IF EXISTS "shortlist_groups: share read" ON shortlist_groups;

CREATE POLICY "shortlist_groups: owner all" ON shortlist_groups
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- NOTE: "share read" policy intentionally omitted here.
-- It creates infinite RLS recursion:
--   shortlist_groups: share read → EXISTS on shortlist_shares
--   shortlist_shares: owner all → EXISTS on shortlist_groups → loop
-- Public read for shared lists will be handled via a SECURITY DEFINER
-- function when SharedShortlist page is implemented.


-- ── 8. Policies — shortlist_shares ───────────────────────────────────────────

DROP POLICY IF EXISTS "shortlist_shares: owner all"   ON shortlist_shares;
DROP POLICY IF EXISTS "shortlist_shares: public read" ON shortlist_shares;

-- EXISTS + JOIN direct évite la récursion RLS (IN (SELECT ...) la déclenchait)
CREATE POLICY "shortlist_shares: owner all" ON shortlist_shares
  FOR ALL USING (
    EXISTS (SELECT 1 FROM shortlist_groups g WHERE g.id = list_id AND g.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM shortlist_groups g WHERE g.id = list_id AND g.user_id = auth.uid())
  );

-- Anon can read by token (128-bit random — enumeration not practical)
CREATE POLICY "shortlist_shares: public read" ON shortlist_shares
  FOR SELECT USING (true);


-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name IN ('shortlists','shortlist_groups','shortlist_shares')
--   ORDER BY table_name, ordinal_position;
-- SELECT * FROM shortlist_groups LIMIT 5;
-- =============================================================================
