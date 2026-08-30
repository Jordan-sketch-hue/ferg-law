-- Analytics events table — tracks site actions with Vercel geo data
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name   text NOT NULL,
  site         text DEFAULT 'ferguson-law',
  page_path    text,
  referrer     text,
  country      text,
  city         text,
  device_type  text,
  properties   jsonb DEFAULT '{}',
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_event_name_idx  ON public.analytics_events (event_name);
CREATE INDEX IF NOT EXISTS analytics_events_country_idx     ON public.analytics_events (country);

-- ─── Admin RPCs (all gate on fl_is_admin) ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fl_get_analytics_summary(p_token text, p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.fl_is_admin(p_token) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT jsonb_build_object(
    'ebook_submits',       COUNT(*) FILTER (WHERE event_name = 'ebook_form_submit'),
    'pdf_downloads',       COUNT(*) FILTER (WHERE event_name = 'pdf_download'),
    'booking_clicks',      COUNT(*) FILTER (WHERE event_name = 'booking_click'),
    'get_started_clicks',  COUNT(*) FILTER (WHERE event_name = 'get_started_click'),
    'cost_estimator_uses', COUNT(*) FILTER (WHERE event_name = 'cost_estimator_use'),
    'page_views',          COUNT(*) FILTER (WHERE event_name = 'page_view'),
    'total_events',        COUNT(*)
  ) INTO v FROM analytics_events
  WHERE created_at >= now() - (p_days || ' days')::interval;
  RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.fl_get_analytics_events(p_token text, p_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid, event_name text, page_path text, referrer text,
  country text, city text, device_type text, properties jsonb, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.fl_is_admin(p_token) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN QUERY
    SELECT ae.id, ae.event_name, ae.page_path, ae.referrer,
           ae.country, ae.city, ae.device_type, ae.properties, ae.created_at
    FROM analytics_events ae ORDER BY ae.created_at DESC LIMIT p_limit;
END; $$;

CREATE OR REPLACE FUNCTION public.fl_get_analytics_referrers(p_token text, p_days int DEFAULT 30)
RETURNS TABLE (referrer text, cnt bigint)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.fl_is_admin(p_token) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN QUERY
    SELECT COALESCE(NULLIF(ae.referrer, ''), 'Direct') AS referrer, COUNT(*) AS cnt
    FROM analytics_events ae
    WHERE created_at >= now() - (p_days || ' days')::interval
    GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
END; $$;

CREATE OR REPLACE FUNCTION public.fl_get_analytics_countries(p_token text, p_days int DEFAULT 30)
RETURNS TABLE (country text, cnt bigint)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.fl_is_admin(p_token) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN QUERY
    SELECT COALESCE(NULLIF(ae.country, ''), 'Unknown') AS country, COUNT(*) AS cnt
    FROM analytics_events ae
    WHERE created_at >= now() - (p_days || ' days')::interval
    GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
END; $$;
