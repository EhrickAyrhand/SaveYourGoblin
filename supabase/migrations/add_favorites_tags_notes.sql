-- Add favorites, tags, and notes columns to generated_content table
-- Run this migration in your Supabase SQL Editor

-- Add is_favorite column
ALTER TABLE generated_content 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Add tags column (array of text)
ALTER TABLE generated_content 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add notes column
ALTER TABLE generated_content 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Create index for favorites filter
CREATE INDEX IF NOT EXISTS idx_generated_content_is_favorite 
ON generated_content(user_id, is_favorite) 
WHERE is_favorite = true;

-- Create GIN index for tags array search
CREATE INDEX IF NOT EXISTS idx_generated_content_tags 
ON generated_content USING GIN(tags);

-- Add comment for documentation
COMMENT ON COLUMN generated_content.is_favorite IS 'Whether this content is marked as favorite by the user';
COMMENT ON COLUMN generated_content.tags IS 'Array of tags for organizing content';
COMMENT ON COLUMN generated_content.notes IS 'User notes and annotations for this content';
