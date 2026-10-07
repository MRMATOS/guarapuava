# Gemini Spark Cloud MCP & Supabase Jobs Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar o Gemini Spark diretamente ao Supabase via endpoint Cloud MCP (`/api/mcp`) no Next.js para leitura e escrita bidirecional de vagas de Guarapuava, exibindo os dados no portal com fallback seguro.

**Architecture:** Servidor Cloud MCP no Next.js App Router utilizando transporte SSE e JSON-RPC autenticado com `@modelcontextprotocol/sdk`. Ferramentas MCP executam upsert de vagas com identificador composto (`externalId`) no PostgreSQL do Supabase via `@supabase/supabase-js`. O portal Next.js consome os dados ativos via SSR mantendo cards limpos na listagem e detalhes ricos no modal, com fallback para `mockJobs.ts`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, `@modelcontextprotocol/sdk`, `zod`, `@supabase/supabase-js`, PostgreSQL.

**Spec:** [docs/superpowers/specs/2026-10-06-gemini-spark-mcp-jobs-pipeline-design.md](file:///Users/rodrigomatos/Documents/guarapuava/docs/superpowers/specs/2026-10-06-gemini-spark-mcp-jobs-pipeline-design.md)

## Global Constraints
- `externalId` único composto por `slug(title + company + sourceUrl)` obrigatório para prevenir sobrescrita de vagas distintas do mesmo link.
- `desativarNaoListadas` DEVE ser `false` por padrão para suportar lotes incrementais horários sem apagar histórico cumulativo.
- Cards na listagem principal de vagas devem permanecer estritamente limpos (Título, Empresa e Data da publicação alinhada à direita, sem badges).
- Todos os campos ricos (benefícios, remuneração, escala, prazo, instruções) devem ser opcionais e renderizados apenas na visão detalhada da vaga.
- Fallback automático para `mockJobs.ts` quando o banco de dados estiver inacessível ou sem registros.

## Review Focus
1. Várias vagas com o mesmo link de notícia (SINE): o sistema não pode sobrescrever vagas com títulos diferentes vindas da mesma URL.
2. Lote incremental do Spark com 3 vagas: não pode desativar as dezenas de vagas salvas em lotes anteriores quando `desativarNaoListadas` for omitido.
3. Falha ou ausência de variáveis do Supabase em desenvolvimento local: a aplicação deve exibir as vagas mockadas sem lançar exceções não tratadas.
4. Requisição sem credenciais válidas ao `/api/mcp`: deve retornar status `401 Unauthorized` imediatamente antes de iniciar conexão SSE.
5. Vaga re-enviada com campos atualizados (ex: prazo de inscrição estendido): deve atualizar o registro existente no Supabase sem duplicar.

---

### Task 1: Migração SQL do Supabase (Schema e RLS)

**Files:**
- Create: `supabase/migrations/20261006_create_jobs_table.sql`

**Interfaces:**
- Produces: Tabela `public.jobs` no Supabase com chave única `external_id`, campos ricos, índices de performance e política RLS para leitura pública de vagas ativas.

- [ ] **Step 1: Escrever arquivo de migração SQL**
Criar `supabase/migrations/20261006_create_jobs_table.sql` com:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `external_id TEXT UNIQUE NOT NULL`
  - `title TEXT NOT NULL`, `company TEXT NOT NULL`, `intermediary TEXT`
  - `location TEXT DEFAULT 'Guarapuava - PR'`, `work_model TEXT`, `contract_type TEXT`
  - `vacancies_count INTEGER DEFAULT 1`, `is_pcd BOOLEAN DEFAULT false`, `is_pcd_exclusive BOOLEAN DEFAULT false`
  - `published_date TEXT NOT NULL`, `registered_at TEXT`, `application_deadline TEXT`, `compensation TEXT`, `schedule TEXT`
  - `source_url TEXT NOT NULL`, `application_instructions TEXT`
  - `description_items TEXT[] DEFAULT '{}'`, `requirement_items TEXT[] DEFAULT '{}'`, `benefit_items TEXT[] DEFAULT '{}'`
  - `is_active BOOLEAN NOT NULL DEFAULT true`
  - `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`
  - Índices em `(is_active, created_at DESC)` e `external_id`
  - RLS ativado com política de SELECT público para `is_active = true`

- [ ] **Step 2: Verificar sintaxe SQL**
Executar validação da sintaxe com PostgreSQL CLI ou supabase tool.

- [ ] **Step 3: Commit**
```bash
git add supabase/migrations/20261006_create_jobs_table.sql
git commit -m "feat(db): add jobs table migration with RLS and compound external_id"
```

---

### Task 2: Tipos TypeScript e Schema de Validação Zod

**Files:**
- Modify: `src/types/job.ts`
- Create: `src/lib/mcp/schema.ts`
- Test: `tests/mcp-schema.test.ts` (ou script de validação `scripts/test-schema.ts`)

**Interfaces:**
- Consumes: Definições do banco de dados da Task 1.
- Produces: `JobOpening` (interface enriquecida), `jobOpeningSchema` (Zod), `syncJobsInputSchema` (Zod) e função auxiliar `generateExternalId(title: string, company: string, sourceUrl: string): string`.

- [ ] **Step 1: Instalar dependência `zod`**
Run: `npm install zod`

- [ ] **Step 2: Escrever teste de validação do schema e externalId**
Criar `tests/mcp-schema.test.ts` testando:
  - Geração correta e normalizada de slug para `generateExternalId`
  - Validação de payload completo e payload com campos opcionais omitidos
  - Garantia de que `desativarNaoListadas` tem valor padrão `false` quando não fornecido

- [ ] **Step 3: Executar teste e verificar que falha**
Run: `npx tsx tests/mcp-schema.test.ts` (ou vitest/node runner)
Expected: FAIL (módulos ainda não implementados)

- [ ] **Step 4: Implementar `src/types/job.ts` e `src/lib/mcp/schema.ts`**
  - Atualizar `JobOpening` com todos os campos da especificação.
  - Implementar `generateExternalId`, normalizando acentos, espaços e caracteres especiais em lowercase slug.
  - Exportar schemas Zod para validação rigorosa dos inputs do MCP.

- [ ] **Step 5: Executar teste e verificar que passa**
Run: `npx tsx tests/mcp-schema.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add package.json package-lock.json src/types/job.ts src/lib/mcp/schema.ts tests/mcp-schema.test.ts
git commit -m "feat: enrich job types and add zod validation schemas with slug generation"
```

---

### Task 3: Camada de Serviço Supabase (`src/lib/supabase/jobs.ts`)

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/jobs.ts`
- Test: `tests/supabase-jobs.test.ts`

**Interfaces:**
- Consumes: `JobOpening` e schemas da Task 2.
- Produces:
  - `getSupabaseClient()`: cliente público anon para o frontend.
  - `getSupabaseAdminClient()`: cliente administrativo com `service_role` para o MCP.
  - `listActiveJobs(limit?: number): Promise<JobOpening[]>`
  - `syncJobs(vagas: JobOpeningInput[], deactivateUnlisted?: boolean): Promise<{ inserted: number; updated: number; deactivated: number; total: number }>`
  - `deactivateJob(externalId: string): Promise<boolean>`

- [ ] **Step 1: Escrever teste unitário para o serviço de jobs com mocks**
Criar `tests/supabase-jobs.test.ts` testando:
  - Upsert idempotente chamando o Supabase client.
  - Comportamento de não desativar vagas quando `deactivateUnlisted: false`.
  - Desativação seletiva quando `deactivateUnlisted: true`.
  - Tratamento de erro gracioso retornando array vazio caso falhe a conexão.

- [ ] **Step 2: Executar teste e verificar que falha**
Expected: FAIL (módulos inexistentes)

- [ ] **Step 3: Implementar `client.ts` e `jobs.ts`**
  - Configurar clientes Supabase com variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
  - Implementar métodos de mapeamento entre colunas snake_case do Postgres e propriedades camelCase de `JobOpening`.
  - Implementar lógica do `upsert` com `onConflict: 'external_id'`.

- [ ] **Step 4: Executar teste e verificar que passa**
Run: `npx tsx tests/supabase-jobs.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/lib/supabase/client.ts src/lib/supabase/jobs.ts tests/supabase-jobs.test.ts
git commit -m "feat: add supabase service layer with upsert and active jobs query"
```

---

### Task 4: Servidor Cloud MCP no Next.js (`/api/mcp`)

**Files:**
- Modify: `package.json`
- Create: `src/app/api/mcp/route.ts`
- Create: `src/lib/mcp/server.ts`
- Test: `tests/mcp-endpoint.test.ts`

**Interfaces:**
- Consumes: Camada Supabase da Task 3 e Schemas Zod da Task 2.
- Produces: Rota HTTP `/api/mcp` compatível com MCP Server (transporte SSE + JSON-RPC) registrando as ferramentas `listar_vagas_ativas`, `sincronizar_vagas` e `desativar_vaga`.

- [ ] **Step 1: Instalar `@modelcontextprotocol/sdk`**
Run: `npm install @modelcontextprotocol/sdk`

- [ ] **Step 2: Escrever teste automatizado para o endpoint MCP**
Criar `tests/mcp-endpoint.test.ts` testando:
  - Rejeição `401 Unauthorized` quando cabeçalho `Authorization` estiver ausente ou incorreto.
  - Resposta de sucesso `200` com `Content-Type: text/event-stream` no método `GET` quando autenticado.
  - Invocação da ferramenta `sincronizar_vagas` via requisição JSON-RPC `POST` chamando o serviço de jobs.

- [ ] **Step 3: Executar teste e verificar que falha**
Expected: FAIL

- [ ] **Step 4: Implementar `src/lib/mcp/server.ts` e `src/app/api/mcp/route.ts`**
  - Configurar instância do `McpServer` com as ferramentas declaradas.
  - Configurar autenticação baseada em `MCP_CLIENT_ID` e `MCP_CLIENT_SECRET`.
  - Configurar transporte SSE utilizando streaming do Next.js App Router (`ReadableStream`).

- [ ] **Step 5: Executar teste e verificar que passa**
Run: `npx tsx tests/mcp-endpoint.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add package.json package-lock.json src/lib/mcp/server.ts src/app/api/mcp/route.ts tests/mcp-endpoint.test.ts
git commit -m "feat(api): implement authenticated cloud mcp endpoint for gemini spark"
```

---

### Task 5: Integração com Frontend & Visualização Detalhada

**Files:**
- Modify: `src/app/page.tsx` (ou componente consumidor de vagas)
- Modify: `src/components/vagas/JobCard.tsx` (se aplicável, garantindo que cards fiquem limpos)
- Modify: `src/components/vagas/JobDetail.tsx` (ou componente equivalente de detalhe)

**Interfaces:**
- Consumes: `listActiveJobs()` da Task 3 e interface `JobOpening`.
- Produces: Interface de usuário conectada ao Supabase com fallback transparente para `mockJobs.ts`.

- [ ] **Step 1: Verificar o estado atual dos cards e detalhes**
Confirmar que os cards da listagem exibem estritamente:
  - Título
  - Empresa
  - "Data da publicação" alinhada à direita
  - Nenhuma badge minimalista na listagem principal.

- [ ] **Step 2: Atualizar a visualização de detalhe da vaga**
Adicionar suporte condicional para os campos ricos quando presentes:
  - Seção de Remuneração / Escala (se houver `compensation` ou `schedule`)
  - Seção de Prazo de Inscrição (`applicationDeadline`)
  - Seção de Benefícios (`benefitItems`)
  - Instruções de Candidatura (`applicationInstructions`)
  - Manter rodapé intacto: Botão laranja "Abrir site da vaga" (esquerda) e Botão "Voltar" (direita).

- [ ] **Step 3: Implementar fallback inteligente de dados**
No carregamento das vagas, buscar do Supabase:
  - Se retornar registros, exibe as vagas do banco.
  - Se retornar lista vazia ou erro (ex: banco sem setup), carregar `mockJobs`.

- [ ] **Step 4: Commit**
```bash
git add src/app/page.tsx src/components/
git commit -m "feat(ui): connect jobs view to supabase with rich details and mock fallback"
```

---

### Task 6: Validação de Ponta a Ponta com Browser Subagent

**Files:**
- Test: `scripts/simulate-spark-sync.ts`

**Interfaces:**
- Consumes: Todos os componentes integrados.
- Produces: Sessão de teste comprovando sincronização do MCP e renderização impecável na UI.

- [ ] **Step 1: Criar script de simulação do Spark (`scripts/simulate-spark-sync.ts`)**
Script que envia uma requisição MCP JSON-RPC autêntica com um lote de teste (incluindo uma vaga do Sicredi com benefícios e uma vaga do SINE com o mesmo link).

- [ ] **Step 2: Executar a simulação de sincronização**
Run: `npx tsx scripts/simulate-spark-sync.ts`
Expected: Resposta de sucesso do MCP com `{ inserted: 2, updated: 0, deactivated: 0 }`.

- [ ] **Step 3: Disparar o `browser_subagent` para validar a UI**
  - Navegar para `http://localhost:3000`
  - Acessar aba de Vagas
  - Confirmar que as novas vagas aparecem nos cards limpos
  - Clicar na vaga e verificar se os detalhes (benefícios, botões do rodapé) carregam com precisão
  - Capturar screenshot e relatório de validação.

- [ ] **Step 4: Commit final de fechamento**
```bash
git add scripts/simulate-spark-sync.ts
git commit -m "test: add e2e verification script for mcp sync and browser validation"
```
