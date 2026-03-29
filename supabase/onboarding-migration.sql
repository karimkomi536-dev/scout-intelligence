-- ── Onboarding fields on profiles ────────────────────────────────────────────
-- Run in: Supabase → SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS role                 text,
  ADD COLUMN IF NOT EXISTS club                 text,
  ADD COLUMN IF NOT EXISTS onboarding_checklist jsonb DEFAULT '{"profile":false,"player":false,"shortlist":false,"pdf":false}'::jsonb;

-- Mark all existing users as already onboarded (they pre-date this feature)
UPDATE profiles
SET onboarding_completed = true,
    onboarding_checklist = '{"profile":true,"player":true,"shortlist":true,"pdf":false}'::jsonb
WHERE onboarding_completed IS NULL OR onboarding_completed = false;
-- New users created after this migration will have DEFAULT false → will go through onboarding.
