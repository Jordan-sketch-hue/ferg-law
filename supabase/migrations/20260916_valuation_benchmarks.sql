-- valuation_benchmarks: real market data from Jamaican property listing sites
-- Populated by /api/cron/valuation-scraper (runs weekly via Vercel cron)
-- ValuationEstimatorClient reads this table; falls back to hardcoded rates when empty

CREATE TABLE IF NOT EXISTS valuation_benchmarks (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parish         text        NOT NULL,
  prop_type      text        NOT NULL CHECK (prop_type IN ('land', 'built')),
  rate_low       numeric     NOT NULL,
  rate_high      numeric     NOT NULL,
  median_per_sqft numeric   NOT NULL,
  sample_count   integer     NOT NULL DEFAULT 0,
  source         text        NOT NULL DEFAULT 'listing-scraper',
  scraped_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_valuation_parish_type UNIQUE (parish, prop_type)
);

-- Allow public reads (anon key) so ValuationEstimatorClient can fetch without auth
ALTER TABLE valuation_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read valuation_benchmarks"
  ON valuation_benchmarks FOR SELECT
  USING (true);

-- Service role can write (scraper uses admin client)
CREATE POLICY "service write valuation_benchmarks"
  ON valuation_benchmarks FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Index for fast client reads
CREATE INDEX IF NOT EXISTS idx_vb_parish_type ON valuation_benchmarks (parish, prop_type);