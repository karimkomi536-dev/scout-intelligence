-- =============================================================================
-- VIZION — Contract & transfer alert columns
-- Generated: 2026-03-28
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================================

-- 1. Add contract_end and previous_club to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS contract_end  date;
ALTER TABLE players ADD COLUMN IF NOT EXISTS previous_club text;

-- 2. Extend notifications.type check constraint to include new alert types
--    Drop the old constraint (name comes from the original migration),
--    then re-add with the full set.
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'score_change',
    'new_player',
    'shortlist_update',
    'transfer',
    'contract_expiring'
  ));

-- [VERIFY]
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'players'
  AND column_name IN ('contract_end', 'previous_club');
