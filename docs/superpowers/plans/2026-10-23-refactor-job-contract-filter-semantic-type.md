# Plano de Refatoração: Tipagem Semântica e Centralização do Filtro de Contratos de Vagas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar o filtro de contratos de vagas de índices numéricos mágicos (`0 | 1 | 2 | 3`) para o tipo semântico `JobContractFilter` (`"todos" | "clt" | "pj" | "estagio"`), centralizando as regras, transições de ciclo e rótulos oficiais em `src/lib/utils/search.ts`.

**Architecture:** O módulo `search.ts` passa a ser a única fonte da verdade para tipos, labels, próximo estado no ciclo (`NEXT_JOB_CONTRACT_FILTER`) e identificação de estágio (`isEstagioJob`). Os componentes de interface (`FilterPanel`, `JobsFeed`, `JobDetail` e `page.tsx`) consomem esses utilitários semânticos diretamente, eliminando operações com números mágicos e operadores de módulo aritmético espalhados.

**Tech Stack:** TypeScript, React 19, Next.js 16 (App Router), Node test runner / tsx.

**Spec / Referência:** Minor e Recomendação do code review da tarefa de filtro de contratos de vagas.

## Global Constraints

- **Respeito ao DESIGN.md e AGENTS.md:** Nenhuma alteração visual ou adição de novos botões; o visual do grid de 3 colunas e a microinteração do botão de Contrato devem permanecer idênticos.
- **Tipagem estrita:** Sem uso de `any` ou type casting não justificado.
- **Isolamento de Contratos:** Vagas identificadas como estágio (`isEstagioJob`) continuam mutuamente exclusivas e nunca podem vazar para os filtros "clt" ou "pj".

## Review Focus

1. **Ciclo de Estados:** A alternância deve cobrir exatamente `"todos"` $\rightarrow$ `"clt"` $\rightarrow$ `"pj"` $\rightarrow$ `"estagio"` $\rightarrow$ `"todos"`.
2. **Reset de Filtros:** O botão "Limpar todos os filtros" deve resetar `contractState` para `"todos"`.
3. **Indicador de Ativo:** O botão de contrato só deve marcar `pressed = true` quando `contractState !== "todos"`.
4. **Cache & Renderização Incremental:** O `resetKey` em `JobsFeed` e `JobDetail` deve usar o valor string semântico mantendo a invalidação precisa da paginação.
5. **Compatibilidade com Busca Textual:** A filtragem combinada (busca textual + contrato) deve manter exatamente o mesmo comportamento.

---

### Task 1: Definição dos Tipos Semânticos, Constantes e Atualização de `search.ts`

**Files:**
- Modify: `src/lib/utils/search.ts`
- Test: `tests/job-feed-logic.test.ts`

**Interfaces:**
- Produces:
  - `export type JobContractFilter = "todos" | "clt" | "pj" | "estagio"`
  - `export const NEXT_JOB_CONTRACT_FILTER: Record<JobContractFilter, JobContractFilter>`
  - `export const JOB_CONTRACT_FILTER_LABELS: Record<JobContractFilter, string>`
  - `export function isEstagioJob(job: Partial<JobOpening>): boolean`
  - `JobFilterOptions.contractState: JobContractFilter`

- [x] **Step 1: Atualizar o teste unitário com a nova tipagem semântica**
- [x] **Step 2: Executar o teste para verificar falha de compilação/execução**
- [x] **Step 3: Implementar `JobContractFilter`, constantes e atualizar `filterJobs` em `src/lib/utils/search.ts`**
- [x] **Step 4: Executar os testes para confirmar que passam**
- [x] **Step 5: Executar checagem de tipos inicial**

---

### Task 2: Atualização dos Componentes de UI (`FilterPanel`, `JobsFeed`, `JobDetail` e `page.tsx`)

**Files:**
- Modify: `src/components/ui/FilterPanel.tsx`
- Modify: `src/components/JobsFeed.tsx`
- Modify: `src/components/JobDetail.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes:
  - `JobContractFilter`, `NEXT_JOB_CONTRACT_FILTER`, `JOB_CONTRACT_FILTER_LABELS` de `@/lib/utils/search`

- [x] **Step 1: Atualizar `src/components/ui/FilterPanel.tsx`**
- [x] **Step 2: Atualizar `src/components/JobsFeed.tsx` e `src/components/JobDetail.tsx`**
- [x] **Step 3: Atualizar `src/app/page.tsx`**
- [x] **Step 4: Executar checagem de tipos do TypeScript**

---

### Task 3: Verificação Completa e Testes de Regressão

**Files:**
- Modify/Verify: `tests/job-feed-logic.test.ts`

- [x] **Step 1: Executar a suíte de testes de vagas**
- [x] **Step 2: Executar testes de outras áreas correlatas**
- [x] **Step 3: Executar linter nos arquivos tocados**
