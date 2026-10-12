-- Migração: Hardening de segurança pré-pen test
-- Data: 2026-10-12
-- Corrige: view SECURITY DEFINER gravável pelo anon, exposição de ip_hash,
-- RPC de rate limit pública, grants excessivos e listagem do bucket.

-- 1. View pública passa a respeitar RLS/grants de quem consulta
CREATE OR REPLACE VIEW public.cidade_viva_reports_public
WITH (security_invoker = true) AS
SELECT
  id,
  category_id,
  latitude,
  longitude,
  description,
  photo_url,
  address,
  city,
  state,
  status,
  created_at
FROM public.cidade_viva_reports
WHERE status <> 'resolvido';

-- 2. Zera privilégios dos papéis expostos e reabre apenas leitura
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

GRANT SELECT ON public.jobs, public.news_digests, public.cidade_viva_categories
  TO anon, authenticated;

-- Leitura por coluna: ip_hash nunca é exposto pela Data API
GRANT SELECT (id, category_id, latitude, longitude, description, photo_url,
              address, city, state, status, created_at)
  ON public.cidade_viva_reports TO anon, authenticated;

GRANT SELECT ON public.cidade_viva_reports_public TO anon, authenticated;

-- 3. Rate limit: validação de parâmetros e execução restrita ao service_role
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_window TIMESTAMPTZ;
  v_count  INTEGER;
BEGIN
  IF p_key IS NULL OR length(p_key) = 0 OR length(p_key) > 200 THEN
    RAISE EXCEPTION 'invalid rate limit key';
  END IF;
  IF p_max IS NULL OR p_max < 1 OR p_window_seconds IS NULL
     OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid rate limit parameters';
  END IF;

  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  DELETE FROM public.rate_limits
  WHERE window_start < now() - make_interval(secs => p_window_seconds * 2);

  INSERT INTO public.rate_limits (key, window_start, count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count > p_max; -- true = excedeu limite
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- 4. Objetos futuros nascem fechados (exigem GRANT explícito)
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, PUBLIC;

-- 5. Bucket público dispensa policy de SELECT; removê-la impede a listagem de arquivos
DROP POLICY IF EXISTS "Fotos de relatos sao publicas" ON storage.objects;
