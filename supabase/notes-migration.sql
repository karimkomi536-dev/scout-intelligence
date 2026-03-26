-- notes-migration.sql
-- Scout notes per player per user
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS notes (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id  uuid        REFERENCES players(id)     ON DELETE CASCADE,
  user_id    uuid        REFERENCES auth.users(id)  ON DELETE CASCADE,
  content    text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select" ON notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notes_insert" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_delete" ON notes
  FOR DELETE USING (auth.uid() = user_id);
