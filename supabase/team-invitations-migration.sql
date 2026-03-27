-- team-invitations-migration.sql
-- Team invitations + member management policies
-- Run in Supabase SQL Editor

-- ── 1. invitations table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invitations (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  email           text        NOT NULL,
  token           uuid        UNIQUE DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('admin', 'scout', 'viewer')),
  invited_by      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- ── 2. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS invitations_token_idx ON invitations(token);
CREATE INDEX IF NOT EXISTS invitations_email_idx ON invitations(email);

-- ── 3. Enable RLS ────────────────────────────────────────────────────────────

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ── 4. Policies for invitations ──────────────────────────────────────────────

-- Admins see all invitations for their org
DROP POLICY IF EXISTS "invitations_select_admin" ON invitations;
CREATE POLICY "invitations_select_admin" ON invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_id = auth.uid()
        AND organization_id = invitations.organization_id
        AND role = 'admin'
    )
  );

-- Anyone can look up a pending, non-expired invitation by token (accept flow)
-- Security: token is a 128-bit UUID, not guessable
DROP POLICY IF EXISTS "invitations_select_pending" ON invitations;
CREATE POLICY "invitations_select_pending" ON invitations
  FOR SELECT USING (accepted_at IS NULL AND expires_at > now());

-- Admins can create invitations
DROP POLICY IF EXISTS "invitations_insert" ON invitations;
CREATE POLICY "invitations_insert" ON invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_id = auth.uid()
        AND organization_id = invitations.organization_id
        AND role = 'admin'
    )
  );

-- Admins can revoke (delete) invitations for their org
DROP POLICY IF EXISTS "invitations_delete" ON invitations;
CREATE POLICY "invitations_delete" ON invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_id = auth.uid()
        AND organization_id = invitations.organization_id
        AND role = 'admin'
    )
  );

-- Authenticated users can accept a pending, non-expired invitation
DROP POLICY IF EXISTS "invitations_update_accept" ON invitations;
CREATE POLICY "invitations_update_accept" ON invitations
  FOR UPDATE
  USING (accepted_at IS NULL AND expires_at > now())
  WITH CHECK (accepted_at IS NOT NULL);

-- ── 5. Additional policies for user_organizations ────────────────────────────
-- (needed for member list and member removal)
-- Uses profiles.organization_id to avoid self-referential recursion

-- All members of an org can see all other members in the same org
DROP POLICY IF EXISTS "user_org_select_same_org" ON user_organizations;
CREATE POLICY "user_org_select_same_org" ON user_organizations
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Any authenticated user can insert their own row (accept invitation flow)
DROP POLICY IF EXISTS "user_org_self_insert" ON user_organizations;
CREATE POLICY "user_org_self_insert" ON user_organizations
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can remove members from their org (but not themselves)
-- Uses profiles to check admin status — avoids self-referential recursion
DROP POLICY IF EXISTS "user_org_admin_delete" ON user_organizations;
CREATE POLICY "user_org_admin_delete" ON user_organizations
  FOR DELETE USING (
    user_id != auth.uid()
    AND organization_id = (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_organizations self_row
      WHERE self_row.user_id = auth.uid()
        AND self_row.role = 'admin'
        AND self_row.organization_id = user_organizations.organization_id
    )
  );
