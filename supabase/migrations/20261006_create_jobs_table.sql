-- Migração: Criação da tabela de vagas (jobs) com chave composta e RLS
-- Data: 2026-10-06

CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL,      -- Slug composto: slug(title + company + source_url)
  
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  intermediary TEXT,                     -- Ex: "Agência do Trabalhador (SINE)", "VEHLOR"
  location TEXT DEFAULT 'Guarapuava - PR',
  work_model TEXT,                       -- "Presencial" | "Híbrido" | "Remoto" | "Externo/Campo"
  contract_type TEXT,                    -- "CLT" | "PJ/MEI" | "Estágio" | "Jovem Aprendiz" | "Temporário" | etc.
  
  vacancies_count INTEGER DEFAULT 1,
  is_pcd BOOLEAN DEFAULT false,
  is_pcd_exclusive BOOLEAN DEFAULT false,
  
  published_date TEXT NOT NULL,          -- Ex: "06/10/2026"
  registered_at TEXT,                    -- Data/hora de captura no agente
  application_deadline TEXT,             -- Prazo limite de inscrição (quando houver)
  compensation TEXT,                     -- Faixa salarial ou bolsa
  schedule TEXT,                         -- Jornada / Escala de trabalho
  
  source_url TEXT NOT NULL,              -- Link de origem da vaga
  application_instructions TEXT,         -- Endereço físico, e-mail ou WhatsApp
  
  description_items TEXT[] DEFAULT '{}',
  requirement_items TEXT[] DEFAULT '{}',
  benefit_items TEXT[] DEFAULT '{}',
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para consultas de alta performance
CREATE INDEX IF NOT EXISTS idx_jobs_active_created ON public.jobs (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_external_id ON public.jobs (external_id);

-- Ativar Row Level Security
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (anon e autenticados leem vagas ativas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'jobs' AND policyname = 'Vagas ativas sao publicas'
  ) THEN
    CREATE POLICY "Vagas ativas sao publicas" 
    ON public.jobs FOR SELECT 
    TO anon, authenticated 
    USING (is_active = true);
  END IF;
END $$;
