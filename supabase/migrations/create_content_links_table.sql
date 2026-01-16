-- Create content_links table for linking related content items
-- Run this migration in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS content_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_content_id UUID NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
  target_content_id UUID NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('related', 'part_of', 'uses', 'located_in', 'involves')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_content_id, target_content_id, link_type)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_content_links_user_id ON content_links(user_id);
CREATE INDEX IF NOT EXISTS idx_content_links_source ON content_links(source_content_id);
CREATE INDEX IF NOT EXISTS idx_content_links_target ON content_links(target_content_id);
CREATE INDEX IF NOT EXISTS idx_content_links_type ON content_links(link_type);

-- Enable Row Level Security (RLS)
ALTER TABLE content_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own content links
CREATE POLICY "Users can view their own content links"
  ON content_links
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own content links
CREATE POLICY "Users can insert their own content links"
  ON content_links
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own content links
CREATE POLICY "Users can delete their own content links"
  ON content_links
  FOR DELETE
  USING (auth.uid() = user_id);
