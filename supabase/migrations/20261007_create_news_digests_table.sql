-- Migração: Criação da tabela de resumos diários de notícias (news_digests)
-- Data: 2026-10-07

CREATE TABLE IF NOT EXISTS public.news_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT UNIQUE NOT NULL,             -- Ex: "07/10/2026"
  date_iso DATE NOT NULL,                -- Ex: '2026-10-07' (para ordenação eficiente)
  last_updated_time TEXT NOT NULL,       -- Ex: "12:20"
  
  headline TEXT NOT NULL,                -- Manchete síntese do dia
  highlights JSONB DEFAULT '[]'::jsonb,  -- Array de NewsItem [{ id, category, title, text, source }]
  batches JSONB DEFAULT '[]'::jsonb,     -- Array de NewsBatch [{ id, date, time, items }]
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para consultas de alta performance
CREATE INDEX IF NOT EXISTS idx_news_digests_date_iso ON public.news_digests (date_iso DESC);
CREATE INDEX IF NOT EXISTS idx_news_digests_active_date ON public.news_digests (is_active, date_iso DESC);

-- Ativar Row Level Security
ALTER TABLE public.news_digests ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (anon e autenticados leem notícias ativas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'news_digests' AND policyname = 'Noticias ativas sao publicas'
  ) THEN
    CREATE POLICY "Noticias ativas sao publicas" 
    ON public.news_digests FOR SELECT 
    TO anon, authenticated 
    USING (is_active = true);
  END IF;
END $$;
