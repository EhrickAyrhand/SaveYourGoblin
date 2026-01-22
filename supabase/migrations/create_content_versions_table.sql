-- Create content_versions table for version history of generated content
-- Run this migration in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content_data JSONB NOT NULL,
  change_summary TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, version_number)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_content_versions_content_id ON content_versions(content_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_user_id ON content_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_created_at ON content_versions(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own content versions
CREATE POLICY "Users can view their own content versions"
  ON content_versions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own content versions
CREATE POLICY "Users can insert their own content versions"
  ON content_versions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own content versions
CREATE POLICY "Users can delete their own content versions"
  ON content_versions
  FOR DELETE
  USING (auth.uid() = user_id);
