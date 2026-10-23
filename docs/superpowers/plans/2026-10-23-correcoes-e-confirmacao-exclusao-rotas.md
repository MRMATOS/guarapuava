# Plano de Implementação: Correções do Review e Confirmação de Exclusão de Rotas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar confirmação in-place com contorno no botão de exclusão de rotas salvas, resolver a discrepância de hidratação no `HandednessContext`, limpar propriedades não utilizadas no `DesktopStage` e adicionar testes unitários para a busca tolerante (`matchesFuzzyQuery`) e rotas salvas.

**Architecture:** 
1. Em `BusScheduleFeed.tsx`, introduzir estado local `confirmingDeleteRouteId: string | null` para alternar o botão para `"Toque para confirmar a exclusão"` com `border border-coral` sem modais.
2. Em `HandednessContext.tsx`, inicializar o estado com `"right"` no SSR e sincronizar com o `localStorage` no `useEffect` inicial do cliente para garantir correspondência exata de hidratação.
3. Em `DesktopStage.tsx` e `src/app/page.tsx`, limpar propriedades residuais de `onToggleInfo` e `onCloseDetail`.
4. Em `tests/`, criar `fuzzy-search.test.ts` e `saved-routes.test.ts` usando `node:assert/strict`.

**Tech Stack:** Next.js 16 (Turbopack), React 19, TypeScript 5, Tailwind CSS 4, Node.js assert test runner via `tsx`.

**Spec:** [docs/superpowers/specs/2026-10-23-modo-canhoto-e-opcoes-design.md](file:///Users/rodrigomatos/Documents/guarapuava/docs/superpowers/specs/2026-10-23-modo-canhoto-e-opcoes-design.md) e diretrizes em [AGENTS.md](file:///Users/rodrigomatos/Documents/guarapuava/AGENTS.md).

---

## Global Constraints
- Sem modais extras para confirmação de exclusão: tudo in-place no mesmo botão.
- O contorno do botão em confirmação deve usar a mesma cor do texto (`border border-coral text-coral`).
- Manter equivalência estrita dos cards de percurso conforme [AGENTS.md](file:///Users/rodrigomatos/Documents/guarapuava/AGENTS.md).
- Respeitar suporte a SSR sem discrepâncias de hidratação no React 19.

---

### Task 1: Confirmação In-Place de Exclusão de Rota Salva

**Files:**
- Modify: `src/components/bus/BusScheduleFeed.tsx:855-875`
- Test: manual via browser / render verification

**Interfaces:**
- Consumes: `deleteSavedRoute(id: string)` de `@/lib/bus/saved-routes`
- Produces: UI de exclusão com estado de confirmação em 2 toques

- [ ] **Step 1: Adicionar estado local de confirmação no `BusScheduleFeed`**
  No início do componente `BusScheduleFeed`:
  ```tsx
  const [confirmingDeleteRouteId, setConfirmingDeleteRouteId] = useState<string | null>(null);
  ```

- [ ] **Step 2: Atualizar o botão de exclusão na visualização de rotas salvas**
  No loop `orderedSavedRoutes.map((saved, idx) => ...)`:
  ```tsx
  const isConfirming = confirmingDeleteRouteId === saved.id;
  ```
  Renderizar o botão `Key`:
  - Se `isConfirming` for falso:
    - Texto: `"Excluir Rota"`
    - Estilo: `text-coral active:scale-[0.99]` (sem borda adicional)
    - Clique: `setConfirmingDeleteRouteId(saved.id)`
  - Se `isConfirming` for verdadeiro:
    - Texto: `"Toque para confirmar a exclusão"`
    - Estilo: `border border-coral text-coral bg-coral/5 active:scale-[0.99]`
    - Clique: `deleteSavedRoute(saved.id)` seguido de `setConfirmingDeleteRouteId(null)`
    - `aria-label`: `Confirmar exclusão da Rota ${idx + 1}`

- [ ] **Step 3: Verificar visualmente e validar ausência de regressão**
  Executar typecheck: `npx tsc --noEmit`

- [ ] **Step 4: Commit**
  ```bash
  git commit -m "fix(bus): implementa confirmacao in-place com contorno para exclusao de rotas salvas"
  ```

---

### Task 2: Eliminar Discrepância de Hidratação SSR no `HandednessContext`

**Files:**
- Modify: `src/context/HandednessContext.tsx`
- Test: `tests/handedness.test.ts`

**Interfaces:**
- Produces: `useHandedness()` seguro para SSR e Client Hydration

- [ ] **Step 1: Modificar a inicialização de `HandednessProvider`**
  Em `src/context/HandednessContext.tsx`:
  - Definir `useState<Handedness>("right")`.
  - Adicionar `useEffect` de montagem inicial do cliente que lê `localStorage.getItem("guarapuava:handedness")` e, caso seja `"left"`, chama `setHandednessState("left")`.
  - Manter o `useEffect` de sincronização que atualiza o `data-handedness` no DOM e persiste no `localStorage` quando o modo é alterado pelo usuário.

- [ ] **Step 2: Executar testes existentes de handedness**
  Run: `npx tsx tests/handedness.test.ts`
  Expected: PASS

- [ ] **Step 3: Executar build para garantir que a compilação estática não sofre divergências**
  Run: `npm run build`
  Expected: Compiled successfully

- [ ] **Step 4: Commit**
  ```bash
  git commit -m "fix(acessibilidade): sincroniza handedness no client mount para evitar hydration mismatch"
  ```

---

### Task 3: Limpeza de Propriedades Mortas em `DesktopStage` e `OptionsPanel`

**Files:**
- Modify: `src/components/desktop/DesktopStage.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/ui/OptionsPanel.tsx`

**Interfaces:**
- Consumes/Produces: `DesktopStageProps` e `OptionsPanelProps` limpos e concisos

- [ ] **Step 1: Limpar props em `DesktopStage.tsx`**
  - Remover `onToggleInfo` e `onCloseDetail` de `DesktopStageProps` e da desestruturação do componente.

- [ ] **Step 2: Atualizar chamada em `src/app/page.tsx`**
  - Remover a passagem de `onToggleInfo` e `onCloseDetail` para o `<DesktopStage />`.

- [ ] **Step 3: Limpar comentário em `OptionsPanel.tsx`**
  - Marcar `onSelectInfo` como opcional legado documentado.

- [ ] **Step 4: Typecheck e verificação**
  Run: `npx tsc --noEmit`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git commit -m "refactor(desktop): remove propriedades nao utilizadas em DesktopStage"
  ```

---

### Task 4: Adicionar Testes Unitários para `matchesFuzzyQuery` e `saved-routes`

**Files:**
- Create: `tests/fuzzy-search.test.ts`
- Create: `tests/saved-routes.test.ts`

**Interfaces:**
- Consumes: `matchesFuzzyQuery`, `fuzzyNormalize` de `@/lib/utils/search`
- Consumes: `saveRoute`, `deleteSavedRoute`, `getSavedRoutes`, `isRouteSaved` de `@/lib/bus/saved-routes`

- [ ] **Step 1: Criar `tests/fuzzy-search.test.ts`**
  Cobrir:
  - `fuzzyNormalize`: colapso de letras duplicadas ("anna" -> "ana", "bassara" -> "basara").
  - `matchesFuzzyQuery`:
    - Letras dobradas: `"colegio anna vanda"` encontra `"Colégio Estadual Professora Ana Vanda Bassara"`.
    - Insensibilidade a acentos: `"colegio"` encontra `"Colégio"`.
    - Múltiplos tokens: `"visconde centro"` encontra `"Colégio Estadual Visconde de Guarapuava - Centro"`.
    - String vazia retorna `true`.
    - Termo inexistente retorna `false`.

- [ ] **Step 2: Executar teste de busca tolerante**
  Run: `npx tsx tests/fuzzy-search.test.ts`
  Expected: PASS

- [ ] **Step 3: Criar `tests/saved-routes.test.ts`**
  Cobrir:
  - Mock de `localStorage` em ambiente Node.
  - Salvamento de rota com `saveRoute`.
  - Verificação com `isRouteSaved`.
  - Não duplicação de rotas idênticas.
  - Exclusão correta com `deleteSavedRoute`.

- [ ] **Step 4: Executar teste de rotas salvas**
  Run: `npx tsx tests/saved-routes.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git commit -m "test(bus): adiciona testes unitarios para busca tolerante e rotas salvas"
  ```

---

### Task 5: Validação Completa da Suíte de Testes e Build

**Files:**
- Todas as suítes em `tests/*.test.ts`

- [ ] **Step 1: Rodar todas as suítes de testes do repositório**
  Run: `npx tsx tests/fuzzy-search.test.ts && npx tsx tests/saved-routes.test.ts && npx tsx tests/handedness.test.ts && npx tsx tests/filter-bar.test.ts && npx tsx tests/news-categories.test.ts && npx tsx tests/descarte-search.test.ts && npx tsx tests/input-font-size.test.ts`
  Expected: Todos os testes aprovados com sucesso.

- [ ] **Step 2: Executar build de produção do Next.js**
  Run: `npm run build`
  Expected: 0 erros, todas as 24 rotas geradas.

- [ ] **Step 3: Verificação com git status e git diff**
  Verificar que o working tree está limpo e cada tarefa foi commitada individualmente.
