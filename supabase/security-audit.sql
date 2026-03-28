-- =============================================================================
-- VIZION — RLS Security Audit
-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor (read-only queries — no mutations).
-- Sections:
--   A. RLS status per table
--   B. All policies with full definition
--   C. Tables with RLS disabled (DANGER)
--   D. Policies with potentially recursive sub-queries
--   E. Isolation test: simulate a lambda user accessing another org's data
-- =============================================================================


-- =============================================================================
-- A. RLS STATUS PER TABLE (public schema)
-- =============================================================================
-- rowsecurity = true  → RLS active
-- rowsecurity = false → DANGER — all rows visible to any authenticated user

SELECT
  schemaname                                              AS schema,
  tablename                                               AS "table",
  rowsecurity                                             AS rls_enabled,
  CASE WHEN rowsecurity THEN 'OK' ELSE '⚠️ DANGER — NO RLS' END AS status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity ASC, tablename;


-- =============================================================================
-- B. ALL POLICIES — FULL DEFINITION
-- =============================================================================

SELECT
  tablename                            AS "table",
  policyname                           AS policy,
  cmd                                  AS operation,
  roles::text                          AS roles,
  qual                                 AS using_expr,
  with_check                           AS check_expr,
  permissive                           AS permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;


-- =============================================================================
-- C. TABLES WITHOUT ANY POLICIES (RLS enabled but no policy = all blocked)
-- =============================================================================
-- If RLS is enabled and there are 0 policies, service_role still works but
-- ALL client requests return 0 rows (possibly silently). Flag for review.

SELECT
  t.tablename,
  t.rowsecurity                        AS rls_enabled,
  COUNT(p.policyname)                  AS policy_count,
  CASE
    WHEN t.rowsecurity AND COUNT(p.policyname) = 0 THEN '⚠️ RLS ON but 0 policies — all rows blocked'
    WHEN NOT t.rowsecurity              THEN '🔴 DANGER — RLS disabled'
    ELSE 'OK'
  END AS status
FROM pg_tables t
LEFT JOIN pg_policies p
  ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY policy_count ASC, t.tablename;


-- =============================================================================
-- D. POLICIES WITH POTENTIALLY RECURSIVE SUB-QUERIES
-- =============================================================================
-- A policy referencing another table whose policy references back creates a
-- recursive loop (PGRST301). This query surfaces policies whose USING / WITH
-- CHECK expression contains a reference to the same table (self-reference) or
-- to a known high-risk cross-reference pair.

SELECT
  tablename,
  policyname,
  cmd,
  qual AS using_expr,
  with_check AS check_expr,
  CASE
    WHEN qual ILIKE '%' || tablename || '%' THEN '⚠️ Self-referential USING'
    WHEN with_check ILIKE '%' || tablename || '%' THEN '⚠️ Self-referential WITH CHECK'
    ELSE 'Check manually'
  END AS risk_note
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    -- self-reference: policy on table T references table T in sub-query
    qual ILIKE '%' || tablename || '%'
    OR with_check ILIKE '%' || tablename || '%'
    -- known dangerous pairs
    OR (tablename = 'shortlists'       AND qual ILIKE '%shortlist_shares%')
    OR (tablename = 'shortlist_shares' AND qual ILIKE '%shortlist_groups%'
                                       AND qual ILIKE '%user_id%')
    OR (tablename = 'user_organizations' AND (
          qual ILIKE '%user_organizations%' OR with_check ILIKE '%user_organizations%'))
  )
ORDER BY tablename, policyname;


-- =============================================================================
-- E. ISOLATION TEST — Simulate a lambda user (no org) reading another org's data
-- =============================================================================
-- This block uses SET ROLE / SET LOCAL to impersonate an authenticated user
-- without any organization membership and verifies they cannot see restricted data.
--
-- HOW TO USE:
--   1. Replace 'lambda-user-uuid' with a real auth.users id that has NO org membership.
--   2. Run the block and verify every query returns 0 rows.
--
-- NOTE: This test requires a real user UUID. Replace the placeholder.
--       In Supabase, auth.uid() is set by the JWT — we simulate it with a temp config.

-- ── Test setup ────────────────────────────────────────────────────────────────
-- Replace with a real lambda user UUID for live testing:
-- SET request.jwt.claim.sub = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
-- SET ROLE authenticated;

-- ── Test 1: Can anon see players? (should return rows — this is currently PUBLIC) ──
-- Expected: rows returned (known issue — see SECURITY-AUDIT.md)
SELECT COUNT(*) AS anon_player_count,
       CASE WHEN COUNT(*) > 0 THEN '⚠️ Anon can read players' ELSE 'OK' END AS result
FROM players;

-- ── Test 2: Can anon see shortlists? (should return 0) ──
-- Expected: 0 rows for unauthenticated context
SELECT COUNT(*) AS anon_shortlist_count,
       CASE WHEN COUNT(*) > 0 THEN '⚠️ Anon can read shortlists' ELSE 'OK' END AS result
FROM shortlists;

-- ── Test 3: Can anon see organizations? (should return 0) ──
SELECT COUNT(*) AS anon_org_count,
       CASE WHEN COUNT(*) > 0 THEN '⚠️ Anon can read orgs' ELSE 'OK' END AS result
FROM organizations;

-- ── Test 4: Are all pending invitation emails visible without auth? ──
-- Expected: rows — this is a known HIGH issue (no TO authenticated restriction for anon)
SELECT COUNT(*) AS pending_invite_count,
       CASE WHEN COUNT(*) > 0 THEN '⚠️ Invitations visible without org check' ELSE 'OK' END AS result
FROM invitations
WHERE accepted_at IS NULL AND expires_at > now();

-- ── Test 5: Cross-org isolation — org members cannot read another org's data ──
-- This query checks that user_organizations policies correctly partition data.
-- Replace org_a and org_b with real UUIDs from your database.
/*
SELECT
  uo.organization_id,
  COUNT(*) AS member_count
FROM user_organizations uo
WHERE uo.organization_id NOT IN (
  -- Orgs the current user belongs to
  SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
)
GROUP BY uo.organization_id;
-- Expected: 0 rows (a user cannot see members of orgs they don't belong to)
*/

-- ── Test 6: Verify shortlist_shares exposes all tokens (known issue) ──
SELECT COUNT(*) AS total_share_tokens,
       CASE WHEN COUNT(*) > 0 THEN '⚠️ All share tokens readable by anyone' ELSE 'OK' END AS result
FROM shortlist_shares;


-- =============================================================================
-- F. SUMMARY COUNTS
-- =============================================================================

SELECT
  'Tables total'                   AS metric,
  COUNT(*)::text                   AS value
FROM pg_tables WHERE schemaname = 'public'

UNION ALL

SELECT
  'Tables with RLS enabled',
  COUNT(*)::text
FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true

UNION ALL

SELECT
  'Tables WITHOUT RLS (danger)',
  COUNT(*)::text
FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false

UNION ALL

SELECT
  'Total policies',
  COUNT(*)::text
FROM pg_policies WHERE schemaname = 'public'

UNION ALL

SELECT
  'Policies with USING (true) — open read',
  COUNT(*)::text
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd IN ('SELECT', 'ALL')
  AND trim(qual) = 'true';
