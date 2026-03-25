-- ── notifications migration ───────────────────────────────────────────────────
-- Stores per-user notifications. Inserted by the Python snapshot script
-- (service_role bypasses RLS). Read/updated by the authenticated user.
-- No cross-table RLS references → no recursion risk.

-- 1. Table
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text        NOT NULL CHECK (type IN ('score_change', 'new_player', 'shortlist_update')),
  title      text        NOT NULL,
  message    text        NOT NULL,
  player_id  uuid        REFERENCES players(id) ON DELETE SET NULL,
  read       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS notifications_user_feed_idx
  ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON notifications (user_id, read)
  WHERE read = false;

-- 3. RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications: owner select" ON notifications;
DROP POLICY IF EXISTS "notifications: owner update" ON notifications;
DROP POLICY IF EXISTS "notifications: owner delete" ON notifications;

-- User sees only their own notifications
CREATE POLICY "notifications: owner select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- User can mark their own notifications as read
CREATE POLICY "notifications: owner update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User can delete their own notifications
CREATE POLICY "notifications: owner delete" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Note: INSERT is service_role only (Python script). No client INSERT policy needed.
