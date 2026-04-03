-- profiles-rls-v2.sql
-- Reset complet des policies RLS sur la table profiles
-- À exécuter dans Supabase SQL Editor

-- ── Étape 1 : supprimer TOUTES les policies existantes ────────────────────────
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
  END LOOP;
END $$;

-- Sécurité : drops nommés en cas de rollback partiel
DROP POLICY IF EXISTS "profiles_select_own"           ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"           ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"           ON profiles;
DROP POLICY IF EXISTS "profiles_select"               ON profiles;
DROP POLICY IF EXISTS "profiles_insert"               ON profiles;
DROP POLICY IF EXISTS "profiles_update"               ON profiles;
DROP POLICY IF EXISTS "Users can view own profile"    ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"  ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile"  ON profiles;

-- ── Étape 2 : activer RLS + recréer 3 policies simples ───────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Étape 3 : s'assurer que le profil Karim existe ───────────────────────────
INSERT INTO profiles (user_id, full_name, updated_at)
VALUES ('4f64f274-e2ae-4def-ba06-74a43b6347cb', 'Karim', now())
ON CONFLICT (user_id) DO UPDATE SET updated_at = now();

-- ── Vérification ─────────────────────────────────────────────────────────────
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';
