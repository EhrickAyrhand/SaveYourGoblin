-- Create session_notes table for session logging
-- Run this migration in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  linked_content_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_notes_user_id
  ON session_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_campaign_id
  ON session_notes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_session_date
  ON session_notes(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_session_notes_created_at
  ON session_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_notes_linked_content_ids
  ON session_notes USING GIN(linked_content_ids);

ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own session notes"
  ON session_notes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own session notes"
  ON session_notes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      campaign_id IS NULL
      OR EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = session_notes.campaign_id
        AND campaigns.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own session notes"
  ON session_notes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      campaign_id IS NULL
      OR EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = session_notes.campaign_id
        AND campaigns.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their own session notes"
  ON session_notes
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_session_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_session_notes_updated_at ON session_notes;
CREATE TRIGGER update_session_notes_updated_at
  BEFORE UPDATE ON session_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_session_notes_updated_at();
