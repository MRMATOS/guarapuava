-- Migração: Criação do subsistema Cidade Viva (Categorias, Relatos, Rate Limit e View Pública)
-- Data: 2026-10-11
-- Projeto: Guarapuava Digital

-- 1. Tabela de Categorias
CREATE TABLE IF NOT EXISTS public.cidade_viva_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('alto', 'medio', 'baixo', 'assistencial')),
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.cidade_viva_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cidade_viva_categories' AND policyname = 'Categorias ativas sao publicas'
  ) THEN
    CREATE POLICY "Categorias ativas sao publicas" 
    ON public.cidade_viva_categories FOR SELECT 
    TO anon, authenticated 
    USING (is_active = true);
  END IF;
END $$;

-- 2. Tabela de Relatos / Ocorrências
CREATE TABLE IF NOT EXISTS public.cidade_viva_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL REFERENCES public.cidade_viva_categories(id),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  description TEXT,
  photo_url TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  ip_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sugestivo' CHECK (status IN ('sugestivo', 'confirmado_comunidade', 'verificado_in_loco', 'resolvido')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cv_reports_coords ON public.cidade_viva_reports (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_cv_reports_ip_hash ON public.cidade_viva_reports (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cv_reports_status ON public.cidade_viva_reports (status, created_at DESC);

ALTER TABLE public.cidade_viva_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cidade_viva_reports' AND policyname = 'Relatos nao resolvidos sao publicos'
  ) THEN
    CREATE POLICY "Relatos nao resolvidos sao publicos" 
    ON public.cidade_viva_reports FOR SELECT 
    TO anon, authenticated 
    USING (status <> 'resolvido');
  END IF;
END $$;

-- 3. View Pública Segura (oculta ip_hash e omite resolvidos)
CREATE OR REPLACE VIEW public.cidade_viva_reports_public AS
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

GRANT SELECT ON public.cidade_viva_reports_public TO anon, authenticated, service_role;

-- 4. Tabela de Rate Limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.rate_limits IS 'Estado interno de rate limit (gerenciado via RPC security definer)';

-- 5. Função RPC check_rate_limit
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
  -- Janela alinhada por p_window_seconds
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  
  -- Limpeza de janelas antigas
  DELETE FROM public.rate_limits
  WHERE window_start < now() - make_interval(secs => p_window_seconds * 2);
  
  -- Upsert incremental
  INSERT INTO public.rate_limits (key, window_start, count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;
  
  RETURN v_count > p_max; -- true = excedeu limite
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- 6. Seeds das Categorias em Guarapuava
INSERT INTO public.cidade_viva_categories (id, name, severity, icon, color, is_active, sort_order) VALUES
('buraco-pista', 'Asfalto / Buracos', 'alto', 'TrafficCone', '#EF4444', true, 1),
('vazamento-agua', 'Água / Esgoto', 'alto', 'Droplets', '#0EA5E9', true, 2),
('risco-eletrico', 'Iluminação / Risco Elétrico', 'alto', 'Zap', '#F59E0B', true, 3),
('falha-semaforo', 'Semáforo / Sinalização', 'alto', 'AlertTriangle', '#F97316', true, 4),
('acumulo-lixo', 'Lixo / Entulho', 'medio', 'Trash2', '#84CC16', true, 5),
('arvore-queda', 'Vegetação / Mato Alto', 'medio', 'TreePine', '#10B981', true, 6),
('calcada-danificada', 'Calçada / Acessibilidade', 'baixo', 'Footprints', '#6366F1', true, 7),
('foco-dengue', 'Foco de Dengue', 'alto', 'AlertTriangle', '#EC4899', true, 8),
('alagamento', 'Alagamento / Drenagem', 'alto', 'CloudRain', '#3B82F6', true, 9),
('perturbacao-sossego', 'Perturbação de Sossego', 'baixo', 'VolumeX', '#A855F7', true, 10)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  severity = EXCLUDED.severity,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order;

-- 7. Criação do Bucket de Storage cidade-viva-reports (se a extensão storage existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cidade-viva-reports',
  'cidade-viva-reports',
  true,
  2097152, -- 2MB
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Fotos de relatos sao publicas'
  ) THEN
    CREATE POLICY "Fotos de relatos sao publicas"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'cidade-viva-reports');
  END IF;
END $$;
