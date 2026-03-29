-- ── Fix profiles RLS policies ──────────────────────────────────────────────────
-- Drops all existing policies on profiles and recreates them cleanly.
-- Run in: Supabase → SQL Editor

-- Step 1: Drop all existing policies on profiles
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
  END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Recreate clean policies (no cross-table references → no recursion)

-- A user can read their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

-- A user can create their own profile
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- A user can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Verify ────────────────────────────────────────────────────────────────────
-- After running the above, verify the profile exists:
--
-- SELECT * FROM profiles WHERE user_id = '4f64f274-e2ae-4def-ba06-74a43b6347cb';
--
-- If 0 rows, insert it:
-- INSERT INTO profiles (user_id, full_name, updated_at)
-- VALUES ('4f64f274-e2ae-4def-ba06-74a43b6347cb', 'Karim', now())
-- ON CONFLICT (user_id) DO NOTHING;
