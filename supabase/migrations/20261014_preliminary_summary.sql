-- Add preliminary_summary column to fl_client_matters
ALTER TABLE fl_client_matters
  ADD COLUMN IF NOT EXISTS preliminary_summary jsonb DEFAULT NULL;

COMMENT ON COLUMN fl_client_matters.preliminary_summary IS
  'Optional post-consultation Preliminary Summary document. JSONB with keys: objective, recommendation, how_we_assist, expected_timing, what_happens_next, created_at.';