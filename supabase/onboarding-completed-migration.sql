-- Ensure onboarding_completed column exists (idempotent)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Mark existing user as completed (run once if you have already completed onboarding)
-- UPDATE profiles
-- SET onboarding_completed = true
-- WHERE user_id = '4f64f274-e2ae-4def-ba06-74a43b6347cb';
