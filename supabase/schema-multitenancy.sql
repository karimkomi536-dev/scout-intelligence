-- =============================================================================
-- VIZION — Multi-tenancy Schema
-- =============================================================================
-- Exécuter dans : Supabase Dashboard → SQL Editor
--
-- Ordre d'exécution :
--   1. Tables de base (organizations, profiles, user_organizations)
--   2. Fonctions helpers RLS
--   3. ALTER TABLE players (si elle existe)
--   4. Indexes
--   5. RLS policies (organizations, profiles, user_organizations uniquement)
--   6. Trigger auto-création de profil à l'inscription
--
-- NOTE : shortlists et notes ne sont pas encore créées dans Supabase.
--        Leurs colonnes organization_id et policies seront ajoutées
--        dans un fichier séparé (schema-multitenancy-v2.sql).
--
-- Compatibilité : idempotent — sûr à re-exécuter (IF NOT EXISTS / IF EXISTS)
-- =============================================================================


-- =============================================================================
-- SECTION 1 — TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  slug       text        NOT NULL UNIQUE,
  plan       text        NOT NULL DEFAULT 'free'
               CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE organizations IS 'Entités clientes (clubs, agences). Unité d''isolation des données.';
COMMENT ON COLUMN organizations.slug IS 'Identifiant URL unique, ex: fc-barcelona. Utilisé dans les routes et l''API.';
COMMENT ON COLUMN organizations.plan IS 'Plan tarifaire : free (≤5 scouts), pro, enterprise.';


CREATE TABLE IF NOT EXISTS profiles (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       text,
  avatar_url      text,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'Profil utilisateur — extension de auth.users. 1-to-1.';
COMMENT ON COLUMN profiles.organization_id IS 'Organisation active affichée dans l''app. Peut être changée sans quitter l''autre org.';


CREATE TABLE IF NOT EXISTS user_organizations (
  user_id         uuid NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'scout'
                    CHECK (role IN ('admin', 'scout', 'viewer')),
  joined_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);

COMMENT ON TABLE user_organizations IS 'Appartenance et rôle d''un utilisateur dans une organisation.';
COMMENT ON COLUMN user_organizations.role IS 'admin: gère l''org | scout: lecture/écriture | viewer: lecture seule.';


-- =============================================================================
-- SECTION 2 — FONCTIONS HELPERS RLS
-- =============================================================================

CREATE OR REPLACE FUNCTION get_active_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT organization_id
  FROM profiles
  WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid()
      AND organization_id = org_id
  )
$$;

CREATE OR REPLACE FUNCTION is_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid()
      AND organization_id = org_id
      AND role = 'admin'
  )
$$;


-- =============================================================================
-- SECTION 3 — ALTER TABLE players (si elle existe)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'players'
  ) THEN
    ALTER TABLE players
      ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

    COMMENT ON COLUMN players.organization_id IS
      'NULL = joueur global (base publique). Non-NULL = joueur privé de l''org.';
  END IF;
END $$;


-- =============================================================================
-- SECTION 4 — INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_organizations_slug    ON organizations (slug);
CREATE INDEX IF NOT EXISTS idx_organizations_plan    ON organizations (plan);

CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles (organization_id);

CREATE INDEX IF NOT EXISTS idx_user_orgs_user        ON user_organizations (user_id);
CREATE INDEX IF NOT EXISTS idx_user_orgs_org         ON user_organizations (organization_id);
CREATE INDEX IF NOT EXISTS idx_user_orgs_role        ON user_organizations (organization_id, role);


-- =============================================================================
-- SECTION 5 — RLS POLICIES
-- =============================================================================

ALTER TABLE organizations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- ─── organizations ────────────────────────────────────────────────────────────

CREATE POLICY "orgs_select_member"
  ON organizations FOR SELECT TO authenticated
  USING (is_org_member(id));

CREATE POLICY "orgs_insert_authenticated"
  ON organizations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "orgs_update_admin"
  ON organizations FOR UPDATE TO authenticated
  USING (is_org_admin(id))
  WITH CHECK (is_org_admin(id));

CREATE POLICY "orgs_delete_admin"
  ON organizations FOR DELETE TO authenticated
  USING (is_org_admin(id));

-- ─── profiles ─────────────────────────────────────────────────────────────────

CREATE POLICY "profiles_select_own_or_org"
  ON profiles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_org_member(organization_id)
  );

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── user_organizations ───────────────────────────────────────────────────────

CREATE POLICY "user_orgs_select_member"
  ON user_organizations FOR SELECT TO authenticated
  USING (is_org_member(organization_id));

CREATE POLICY "user_orgs_insert_admin"
  ON user_organizations FOR INSERT TO authenticated
  WITH CHECK (is_org_admin(organization_id));

CREATE POLICY "user_orgs_update_admin"
  ON user_organizations FOR UPDATE TO authenticated
  USING (is_org_admin(organization_id))
  WITH CHECK (is_org_admin(organization_id));

CREATE POLICY "user_orgs_delete_admin_or_self"
  ON user_organizations FOR DELETE TO authenticated
  USING (is_org_admin(organization_id) OR user_id = auth.uid());


-- =============================================================================
-- SECTION 6 — TRIGGER : création automatique du profil à l'inscription
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE tablename IN ('organizations','profiles','user_organizations','players');
--
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE tablename IN ('organizations','profiles','user_organizations')
--   ORDER BY tablename, cmd;
-- =============================================================================
