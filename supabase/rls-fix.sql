-- =============================================================================
-- VIZION — RLS Fix Script
-- Generated: 2026-03-28
-- =============================================================================
-- Apply fixes in order. Each section is idempotent (DROP IF EXISTS before CREATE).
-- Run in Supabase Dashboard → SQL Editor.
--
-- Sections:
--   1. [P0] Fix invitation PII leak + email verification
--   2. [P0] Fix user_org_self_insert role escalation
--   3. [P1] Restrict players to authenticated users
--   4. [P1] Fix user_org_admin_delete self-referential policy
--   5. [P1] Restrict shortlist_shares enumeration
--   6. [P2] Add notes UPDATE policy
--   7. [P2] Add profiles DELETE policy
--   8. [P2] Add scoring_profiles DELETE policy
--   9. [VERIFY] Isolation test queries
-- =============================================================================


-- =============================================================================
-- 1. [P0] invitations — Fix PII leak + email verification
-- =============================================================================
-- BEFORE: Any authenticated user can see ALL pending invitations (email leak).
--         Any authenticated user can accept any invitation (no email check).
-- AFTER:  Only the invited email address can see and accept their own invitation.

DROP POLICY IF EXISTS "invitations_select_pending" ON invitations;
DROP POLICY IF EXISTS "invitations_update_accept"  ON invitations;

-- Users can only look up an invitation addressed to their own email
CREATE POLICY "invitations_select_pending" ON invitations
  FOR SELECT
  USING (
    accepted_at IS NULL
    AND expires_at > now()
    AND auth.email() = email            -- ← email match: only the invitee can see it
  );

-- Users can only accept an invitation addressed to their own email
CREATE POLICY "invitations_update_accept" ON invitations
  FOR UPDATE
  USING (
    accepted_at IS NULL
    AND expires_at > now()
    AND auth.email() = email            -- ← must be the intended recipient
  )
  WITH CHECK (
    accepted_at IS NOT NULL
    AND auth.email() = email            -- ← cannot change the email on accept
  );


-- =============================================================================
-- 2. [P0] user_organizations — Remove role-escalation INSERT policy
-- =============================================================================
-- BEFORE: user_org_self_insert allows ANY authenticated user to insert themselves
--         into ANY organization with ANY role, bypassing admin gating.
-- AFTER:  Only the SECURITY DEFINER function accept_invitation() or an admin
--         (via user_orgs_insert_admin) can add rows.

DROP POLICY IF EXISTS "user_org_self_insert" ON user_organizations;

-- Keep user_orgs_insert_admin (admin-gated) from schema-multitenancy.sql.
-- For the invitation-accept flow, create a SECURITY DEFINER function that
-- inserts the row with a fixed role, bypassing RLS safely:

CREATE OR REPLACE FUNCTION accept_org_invitation(p_token uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv invitations%ROWTYPE;
BEGIN
  -- Fetch and validate the invitation
  SELECT * INTO inv
  FROM invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > now()
    AND email = auth.email();           -- must match caller's email

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid, expired, or mismatched invitation token';
  END IF;

  -- Insert into user_organizations (bypasses RLS via SECURITY DEFINER)
  INSERT INTO user_organizations (user_id, organization_id, role)
  VALUES (auth.uid(), inv.organization_id, inv.role)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  -- Mark invitation as accepted
  UPDATE invitations
  SET accepted_at = now()
  WHERE id = inv.id;

  -- Set as active org if the user has no active org yet
  UPDATE profiles
  SET organization_id = inv.organization_id
  WHERE user_id = auth.uid()
    AND organization_id IS NULL;
END;
$$;

COMMENT ON FUNCTION accept_org_invitation(uuid) IS
  'Validates invitation token against caller email, inserts user_organizations row, marks invitation accepted. SECURITY DEFINER bypasses RLS safely.';


-- =============================================================================
-- 3. [P1] players — Restrict public SELECT to authenticated users only
-- =============================================================================
-- BEFORE: TO public (anon users can read all players including org-specific ones)
-- AFTER:  TO authenticated (must be logged in to read players)
--
-- NOTE: If you want truly public player profiles (no org), add a separate
-- policy: FOR SELECT TO public USING (organization_id IS NULL)

DROP POLICY IF EXISTS "players_select_public" ON players;

CREATE POLICY "players_select_authenticated"
  ON players
  FOR SELECT
  TO authenticated
  USING (
    -- Global players (no org): visible to all authenticated users
    organization_id IS NULL
    OR
    -- Org-specific players: visible only to members of that org
    is_org_member(organization_id)
  );


-- =============================================================================
-- 4. [P1] user_organizations — Fix self-referential DELETE policy
-- =============================================================================
-- BEFORE: Inner EXISTS query references user_organizations from within a policy
--         on user_organizations — risk of PGRST301 recursion.
-- AFTER:  Use is_org_admin() SECURITY DEFINER function (no recursion).

DROP POLICY IF EXISTS "user_org_admin_delete" ON user_organizations;

CREATE POLICY "user_org_admin_delete" ON user_organizations
  FOR DELETE
  USING (
    -- Cannot remove yourself
    user_id != auth.uid()
    -- Must be in the same org (uses profiles — no recursion)
    AND organization_id = (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
    -- Must be an admin of that org (SECURITY DEFINER — no recursion)
    AND is_org_admin(organization_id)
  );


-- =============================================================================
-- 5. [P1] shortlist_shares — Restrict token enumeration
-- =============================================================================
-- BEFORE: USING (true) exposes ALL tokens to anyone (full enumeration possible)
-- AFTER:  Keep public read (needed for share link feature) but filter expired shares

DROP POLICY IF EXISTS "shortlist_shares: public read" ON shortlist_shares;

CREATE POLICY "shortlist_shares: public read" ON shortlist_shares
  FOR SELECT
  USING (
    expires_at IS NULL OR expires_at > now()   -- only valid (non-expired) shares
  );


-- =============================================================================
-- 6. [P2] notes — Add missing UPDATE policy
-- =============================================================================

DROP POLICY IF EXISTS "notes_update_owner" ON notes;
DROP POLICY IF EXISTS "notes_update" ON notes;

CREATE POLICY "notes_update_owner" ON notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- =============================================================================
-- 7. [P2] profiles — Add missing DELETE policy
-- =============================================================================

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;

CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- =============================================================================
-- 8. [P2] scoring_profiles — Add missing DELETE policy
-- =============================================================================

DROP POLICY IF EXISTS "scoring_profiles_delete_member" ON scoring_profiles;

CREATE POLICY "scoring_profiles_delete_member"
  ON scoring_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.organization_id = scoring_profiles.organization_id
    )
  );


-- =============================================================================
-- 9. [VERIFY] Post-fix isolation tests
-- =============================================================================
-- Run these after applying fixes to confirm expected behaviour.

-- Test A: Players — anon users should now see 0 rows (no authenticated context)
-- Expected: 0 (previously returned all rows)
SELECT COUNT(*) AS players_visible_to_anon
FROM players;
-- NOTE: Run this as anon role to get a meaningful result.
-- In SQL Editor (service_role), this will still return rows.

-- Test B: Invitations — only own invitations visible
-- Expected: only rows where email = your email
SELECT id, email, organization_id, role, expires_at
FROM invitations
WHERE accepted_at IS NULL AND expires_at > now()
LIMIT 5;

-- Test C: Policy list after fixes
SELECT
  tablename,
  policyname,
  cmd,
  qual AS using_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'players', 'invitations', 'user_organizations',
    'shortlist_shares', 'notes', 'profiles', 'scoring_profiles'
  )
ORDER BY tablename, cmd;

-- Test D: Confirm accept_org_invitation function exists
SELECT
  routine_name,
  security_type,
  routine_definition IS NOT NULL AS has_body
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'accept_org_invitation';
-- Expected: 1 row, security_type = 'DEFINER'
