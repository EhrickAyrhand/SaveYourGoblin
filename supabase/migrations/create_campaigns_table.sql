-- Create campaigns and campaign_content tables for campaign builder
-- Run this migration in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own campaigns"
  ON campaigns
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns"
  ON campaigns
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
  ON campaigns
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
  ON campaigns
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

CREATE TABLE IF NOT EXISTS campaign_content (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  PRIMARY KEY (campaign_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_content_campaign_id
  ON campaign_content(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_content_content_id
  ON campaign_content(content_id);
CREATE INDEX IF NOT EXISTS idx_campaign_content_campaign_sequence
  ON campaign_content(campaign_id, sequence);

ALTER TABLE campaign_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own campaign content"
  ON campaign_content
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_content.campaign_id
      AND campaigns.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM generated_content
      WHERE generated_content.id = campaign_content.content_id
      AND generated_content.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own campaign content"
  ON campaign_content
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_content.campaign_id
      AND campaigns.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM generated_content
      WHERE generated_content.id = campaign_content.content_id
      AND generated_content.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own campaign content"
  ON campaign_content
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_content.campaign_id
      AND campaigns.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM generated_content
      WHERE generated_content.id = campaign_content.content_id
      AND generated_content.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_content.campaign_id
      AND campaigns.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM generated_content
      WHERE generated_content.id = campaign_content.content_id
      AND generated_content.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own campaign content"
  ON campaign_content
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_content.campaign_id
      AND campaigns.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM generated_content
      WHERE generated_content.id = campaign_content.content_id
      AND generated_content.user_id = auth.uid()
    )
  );
