-- =============================================================================
-- VIZION — Fix organizations + user_organizations RLS
-- Generated: 2026-03-28
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================================

-- RLS sur organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select" ON organizations;
CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.organization_id = organizations.id
        AND uo.user_id = auth.uid()
    )
  );

-- RLS sur user_organizations
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uo_select" ON user_organizations;
CREATE POLICY "uo_select" ON user_organizations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "uo_insert" ON user_organizations;
CREATE POLICY "uo_insert" ON user_organizations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- [VERIFY] Confirm policies were created
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'user_organizations')
ORDER BY tablename, cmd;
