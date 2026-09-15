-- ─────────────────────────────────────────────────────────────────────────────
-- Site Content CMS — Ferguson Law
-- Pages + per-block text/image registry.
-- Public reads via anon key; writes via service-role API route.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fl_site_pages (
  slug        TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fl_site_blocks (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug    TEXT    NOT NULL REFERENCES public.fl_site_pages(slug) ON DELETE CASCADE,
  block_key    TEXT    NOT NULL,
  content_type TEXT    NOT NULL CHECK (content_type IN ('text','richtext','image','list','url','boolean')),
  value        TEXT,
  label        TEXT,
  sort_order   INTEGER DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_by   TEXT,
  UNIQUE (page_slug, block_key)
);

CREATE INDEX IF NOT EXISTS fl_site_blocks_page_idx ON public.fl_site_blocks(page_slug);

-- Seed pages
INSERT INTO public.fl_site_pages (slug, title) VALUES
  ('home',           'Home Page'),
  ('about',          'About Page'),
  ('services',       'Services Page'),
  ('cost-estimator', 'Cost Estimator'),
  ('booking',        'Booking Page'),
  ('faq',            'FAQ Page'),
  ('value-estimator','Property Value Estimator'),
  ('global',         'Global / Shared')
ON CONFLICT (slug) DO NOTHING;

-- Seed default blocks
INSERT INTO public.fl_site_blocks (page_slug, block_key, content_type, label, value, sort_order) VALUES
  ('home','hero_headline',    'text',     'Hero Headline',       'Trusted Legal Counsel in Jamaica',                    1),
  ('home','hero_subheadline', 'text',     'Hero Sub-headline',   'Property transactions, wills, corporate law & more.', 2),
  ('home','hero_cta',         'text',     'Hero CTA Button',     'Book a Consultation',                                 3),
  ('home','hero_image',       'image',    'Hero Background',     '',                                                    4),
  ('home','about_headline',   'text',     'About Headline',      'Your Trusted Partner in Jamaican Law',                5),
  ('home','about_body',       'richtext', 'About Body',          'Ferguson Law is a full-service Jamaican law firm specialising in property conveyancing, wills, corporate compliance and dispute resolution.', 6),
  ('home','services_intro',   'text',     'Services Intro',      'Comprehensive legal services tailored to your needs.',7),
  ('home','stats_1_value',    'text',     'Stat 1 Value',        '500+',                                                8),
  ('home','stats_1_label',    'text',     'Stat 1 Label',        'Clients Served',                                      9),
  ('home','stats_2_value',    'text',     'Stat 2 Value',        '15+',                                                10),
  ('home','stats_2_label',    'text',     'Stat 2 Label',        'Years Experience',                                   11),
  ('global','phone_display',  'text',     'Phone (display)',     '(876) 320-0235',                                      1),
  ('global','email_display',  'text',     'Email Address',       'contact@fergusonlawja.com',                           2),
  ('global','footer_tagline', 'text',     'Footer Tagline',      'Counsel · Compliance · Care',                         3),
  ('about','headline',        'text',     'Page Headline',       'About Ferguson Law',                                  1),
  ('about','founder_bio',     'richtext', 'Founder Bio',         'Owen K. Ferguson, JP is the founder and principal attorney-at-law at Ferguson Law.',2),
  ('about','founder_image',   'image',    'Founder Photo',       '',                                                    3),
  ('booking','headline',      'text',     'Booking Headline',    'Book a Consultation',                                 1),
  ('booking','body',          'richtext', 'Booking Body',        'Schedule a 20-minute consultation with our team.',    2),
  ('value-estimator','intro', 'text',     'Estimator Intro',     'Enter your property details for a free indicative valuation.', 1)
ON CONFLICT (page_slug, block_key) DO NOTHING;

-- RLS: public can read
ALTER TABLE public.fl_site_pages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_site_blocks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='fl_site_pages_public_read'  AND tablename='fl_site_pages')  THEN
    EXECUTE 'CREATE POLICY fl_site_pages_public_read  ON public.fl_site_pages  FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='fl_site_blocks_public_read' AND tablename='fl_site_blocks') THEN
    EXECUTE 'CREATE POLICY fl_site_blocks_public_read ON public.fl_site_blocks FOR SELECT USING (true)';
  END IF;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.fl_site_blocks;
