# Especificação de Design: Pipeline de Vagas via Gemini Spark Cloud MCP & Supabase

**Data:** 06/10/2026  
**Status:** Aprovado para Planejamento  
**Autor:** Antigravity & Time de Produto  

---

## 1. Visão Geral e Objetivos

Este documento especifica a arquitetura e implementação da integração direta entre o **Gemini Spark** (agente autônomo de busca de vagas), o banco de dados **Supabase (PostgreSQL)** e o portal **Next.js**.

### Objetivos Principais
1. **Conexão Direta via Model Context Protocol (Cloud MCP):** Eliminar a necessidade de armazenar vagas em documentos de texto intermediários (como Google Docs), evitando parsers frágeis baseados em regex.
2. **Bidirecionalidade (Leitura e Escrita):** Permitir que o Gemini Spark consulte as vagas ativas antes de inserir novos lotes para evitar duplicações.
3. **Schema Rico e Robusto:** Suportar todas as nuances identificadas nas vagas de Guarapuava (benefícios, prazos, salários, tipos de contrato, PcD), garantindo unicidade por chave composta (`externalId`) para evitar colisões entre vagas com o mesmo link de origem.
4. **Inserções Incrementais Seguras:** Tratar lotes horários como adições cumulativas (`desativarNaoListadas: false` por padrão).
5. **Apresentação Visual Fiel:** Manter os cards da listagem principal estritamente simples (Título, Empresa e Data alinhada à direita), expandindo as informações ricas apenas na visualização detalhada da vaga.
6. **Resiliência:** Garantir fallback automático para dados mockados caso o banco esteja vazio ou em configuração inicial.

---

## 2. Arquitetura do Sistema

```
┌────────────────────────────────────────┐
│             Gemini Spark               │
│  (Agente de Monitoramento de Vagas)   │
└───────────────────┬────────────────────┘
                    │ Chamadas Cloud MCP (SSE + JSON-RPC)
                    │ Autenticação: Client ID + Secret
                    ▼
┌────────────────────────────────────────┐
│        Next.js Route Handler           │
│           (/api/mcp)                   │
│   - Validação de Credenciais           │
│   - Handler SSE e Protocolo MCP        │
│   - Ferramentas: listar / sincronizar  │
└───────────────────┬────────────────────┘
                    │ Operações SQL / Upsert
                    │ Chave: SUPABASE_SERVICE_ROLE_KEY
                    ▼
┌────────────────────────────────────────┐
│           Supabase Postgres            │
│             Tabela: jobs               │
│   - RLS: Leitura pública anon          │
│   - Índices em external_id e is_active │
└───────────────────┬────────────────────┘
                    │ Leitura Server-Side (SSR)
                    │ Cache / Revalidação
                    ▼
┌────────────────────────────────────────┐
│         Portal Web Guarapuava          │
│  - Listagem: Cards limpos sem badges   │
│  - Detalhe: Modal com requisitos,      │
│    benefícios, prazos e link oficial   │
└────────────────────────────────────────┘
```

---

## 3. Modelo de Dados (Supabase PostgreSQL)

### 3.1 Definição da Tabela `jobs`
```sql
CREATE TABLE public.jobs (
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
  
  source_url TEXT NOT NULL,              -- Link de origem
  application_instructions TEXT,         -- Endereço físico, e-mail ou WhatsApp
  
  description_items TEXT[] DEFAULT '{}',
  requirement_items TEXT[] DEFAULT '{}',
  benefit_items TEXT[] DEFAULT '{}',
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de Alta Performance
CREATE INDEX idx_jobs_active_created ON public.jobs (is_active, created_at DESC);
CREATE INDEX idx_jobs_external_id ON public.jobs (external_id);
```

### 3.2 Segurança (Row Level Security - RLS)
```sql
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Leitura pública para visitantes do portal
CREATE POLICY "Vagas ativas são públicas" 
ON public.jobs FOR SELECT 
TO anon, authenticated 
USING (is_active = true);
```
*Operações de inserção/atualização são realizadas exclusivamente pelo endpoint MCP usando a `SUPABASE_SERVICE_ROLE_KEY`.*

---

## 4. Servidor Cloud MCP no Next.js (`/api/mcp`)

### 4.1 Protocolo e Transporte
- Implementado via `@modelcontextprotocol/sdk` com `SSEServerTransport`.
- Responde a:
  - `GET /api/mcp`: Estabelece a conexão SSE com o Gemini Spark.
  - `POST /api/mcp`: Recebe chamadas de listagem e execução de ferramentas JSON-RPC 2.0.

### 4.2 Autenticação
- O endpoint valida as credenciais enviadas pelo Gemini Spark no cabeçalho `Authorization: Bearer <secret>` ou credenciais `Client ID` / `Client Secret`.
- Variáveis no ambiente:
  - `MCP_CLIENT_ID`: Identificador registrado no Gemini.
  - `MCP_CLIENT_SECRET`: Segredo criptográfico compartilhado.

---

## 5. Ferramentas MCP (Tools)

### 5.1 `listar_vagas_ativas`
- **Finalidade:** Retorna as vagas ativas para que o Gemini Spark faça checagem prévia.
- **Entrada:** `{ limite?: number }` (opcional, padrão 100).
- **Retorno:**
  ```json
  [
    {
      "externalId": "coordenador-vendas-sine-gmais",
      "title": "Coordenador(a) de Vendas",
      "company": "Comércio e Serviços / SINE",
      "publishedDate": "06/10/2026",
      "sourceUrl": "https://gmaisnoticias.com/..."
    }
  ]
  ```

### 5.2 `sincronizar_vagas`
- **Finalidade:** Ingestão em lote de novas vagas e atualização das existentes.
- **Schema dos Parâmetros:**
  - `vagas`: Array de objetos de vaga completos:
    - `externalId` (string obrigatória)
    - `title` (string obrigatória)
    - `company` (string obrigatória)
    - `intermediary` (string opcional)
    - `location` (string opcional, padrão "Guarapuava - PR")
    - `workModel` (string opcional)
    - `contractType` (string opcional)
    - `vacanciesCount` (number opcional)
    - `isPcd` (boolean opcional)
    - `isPcdExclusive` (boolean opcional)
    - `publishedDate` (string obrigatória)
    - `registeredAt` (string opcional)
    - `applicationDeadline` (string opcional)
    - `compensation` (string opcional)
    - `schedule` (string opcional)
    - `sourceUrl` (string obrigatória)
    - `applicationInstructions` (string opcional)
    - `descriptionItems` (string[] obrigatório)
    - `requirementItems` (string[] obrigatório)
    - `benefitItems` (string[] opcional)
  - `desativarNaoListadas`: `boolean` (opcional, **default: false** para respeitar inserções incrementais cumulativas).
- **Comportamento do Upsert:**
  - Executa `INSERT ... ON CONFLICT (external_id) DO UPDATE`.
  - Se a vaga já existir, atualiza seus dados, marca `is_active = true` e atualiza `updated_at`.
  - Se `desativarNaoListadas` for explicitamente `true`, inativa as vagas ativas ausentes na lista.

### 5.3 `desativar_vaga`
- **Finalidade:** Permite ao agente inativar uma vaga pontual que foi preenchida ou expirou.
- **Entrada:** `{ externalId: string }` ou `{ sourceUrl: string }`.

---

## 6. Integração com o Frontend

### 6.1 Atualização de Tipos (`src/types/job.ts`)
A interface `JobOpening` é expandida para conter todos os campos do modelo do banco de dados, mantendo total compatibilidade retroativa.

### 6.2 Componente de Card (`JobCard`)
Conforme solicitado pelo usuário, **a exibição dos cards permanece exatamente como está**, sem badges adicionais:
- Título da vaga.
- Nome da empresa.
- Data da publicação alinhada à direita.

### 6.3 Visualização de Detalhes (`JobDetail`)
Apresenta as informações ricas quando disponíveis:
- Título, empresa, modalidade e localização.
- Salário/Remuneração e Escala (se houver).
- Prazo de inscrição e orientações de candidatura.
- Tópicos de Responsabilidades/Descrição.
- Tópicos de Requisitos.
- Tópicos de Benefícios.
- Rodapé: Botão "Abrir site da vaga" (laranja, esquerda) e botão "Voltar" (direita).

### 6.4 Camada de Dados e Fallback
- Criado cliente de serviço `src/lib/supabase/jobs.ts` para consultas rápidas.
- Caso o Supabase não retorne registros ou não esteja configurado localmente, a UI carrega o conteúdo de `src/data/mockJobs.ts`.

---

## 7. Verificação e Testes

1. **Testes Unitários do Schema / Zod:**
   - Validar parsing de objetos com e sem campos opcionais.
   - Validar geração automática de `externalId` consistente caso o agente omita o slug.
2. **Teste de Integração do Endpoint MCP:**
   - Teste de requisição `GET` para verificar handshake SSE.
   - Teste de requisição `POST` com JSON-RPC chamando `tools/list` e `tools/call`.
   - Teste de proteção com credenciais inválidas (`401 Unauthorized`).
3. **Teste de Banco (Supabase):**
   - Inserção de lote com conflito de `external_id` (verificar idempotência do upsert).
   - Teste com `desativarNaoListadas = false` garantindo que vagas antigas não são afetadas.
4. **Teste Visual do Frontend:**
   - Navegação na aba Vagas, abertura de detalhe e retorno.
