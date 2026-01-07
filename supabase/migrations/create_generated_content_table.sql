-- Create generated_content table for storing AI-generated RPG content
-- Run this migration in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('character', 'environment', 'mission')),
  scenario_input TEXT NOT NULL,
  content_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_content_user_id ON generated_content(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_type ON generated_content(type);
CREATE INDEX IF NOT EXISTS idx_generated_content_created_at ON generated_content(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own content
CREATE POLICY "Users can view their own generated content"
  ON generated_content
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own content
CREATE POLICY "Users can insert their own generated content"
  ON generated_content
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own content
CREATE POLICY "Users can update their own generated content"
  ON generated_content
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own content
CREATE POLICY "Users can delete their own generated content"
  ON generated_content
  FOR DELETE
  USING (auth.uid() = user_id);

-- Optional: Admin policy for moderation (uncomment if needed)
-- CREATE POLICY "Admins can view all content"
--   ON generated_content
--   FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM auth.users
--       WHERE auth.users.id = auth.uid()
--       AND auth.users.raw_user_meta_data->>'role' = 'admin'
--     )
--   );





