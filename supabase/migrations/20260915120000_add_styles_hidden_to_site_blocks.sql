-- Add styles (JSONB for CSS properties) and hidden (boolean) to fl_site_blocks
ALTER TABLE fl_site_blocks 
  ADD COLUMN IF NOT EXISTS styles jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN fl_site_blocks.styles IS 'CSS properties stored as JSON for visual editor (fontSize, color, fontWeight, etc.)';
COMMENT ON COLUMN fl_site_blocks.hidden IS 'When true, the CmsText block renders nothing on the frontend';