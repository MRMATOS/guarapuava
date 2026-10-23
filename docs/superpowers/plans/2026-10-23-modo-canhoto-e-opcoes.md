# Modo Canhoto/Destro, Central de Opções e Reestruturação Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar acessibilidade para alternar entre os modos Destro e Canhoto (invertendo a ordem dos botões em todas as páginas, filtros de vagas e controles do mapa), criar a central de Opções com 3 cards clicáveis no padrão Utilidades, reestruturar a página de Informações com dock de retorno (`/opcoes/informacoes`) e reconfigurar o layout do Desktop para exibir Informações no centro e Opções na lateral direita.

**Architecture:** Criar o `HandednessContext` para persistência reativa da preferência ('right' | 'left') no `localStorage`. Aplicar inversão direcional nos Docks, painel de filtros de vagas e mapa. Modularizar a tela de Opções como componente `OpcoesFeed` e rota `/opcoes`, ajustar o popup "Mais" para 2 botões e remodelar o `DesktopStage` com dock 2x2 e Informações no `slotCenter`.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, Node test runner (`node:assert`).

**Spec:** [`docs/superpowers/specs/2026-10-23-modo-canhoto-e-opcoes-design.md`](file:///Users/rodrigomatos/Documents/guarapuava/docs/superpowers/specs/2026-10-23-modo-canhoto-e-opcoes-design.md)

## Global Constraints

- Nunca inventar elementos visuais quando já existir padrão estabelecido no `DESIGN.md`.
- Cards de Opções não devem conter botões internos aninhados: 100% da área do card deve ser clicável.
- Respeitar rigorosamente a ordem dos 12 botões canônicos fixos de notícias sem inverter no modo canhoto.
- Em modo canhoto, inverter a ordem dos botões de rodapé (docks), filtros de vagas e posicionar os botões do mapa à esquerda.
- Preservar compatibilidade de hidratação SSR (sem flash ou erro de hidratação de tema ou canhoto).

## Review Focus

- Alternância instantânea de Destro para Canhoto sem reload da página mantendo o estado dos filtros ativos.
- O botão "Voltar" em Informações deve levar para a página de Opções (`/opcoes`).
- O dock no desktop deve conter exatamente 4 botões distribuídos em 2 linhas (Linha 1: Notícias, Vagas; Linha 2: Utilidades, Opções).
- No desktop, clicar em Informações deve renderizar o conteúdo na coluna central (`slotCenter`), não na lateral direita.
- No mapa do Cidade Viva, a pilha de botões flutuantes deve ancorar no canto inferior esquerdo no modo canhoto.

---

### Task 1: Contexto e Estado Global Destro/Canhoto (`HandednessContext`)

**Files:**
- Create: `src/context/HandednessContext.tsx`
- Modify: `src/app/layout.tsx:1-50`
- Test: `tests/handedness.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Handedness = 'right' | 'left';
  export interface HandednessContextType {
    handedness: Handedness;
    isLeftHanded: boolean;
    toggleHandedness: () => void;
    setHandedness: (mode: Handedness) => void;
  }
  export function useHandedness(): HandednessContextType;
  export function HandednessProvider({ children }: { children: React.ReactNode }): React.ReactElement;
  ```

- [ ] **Step 1: Escrever teste de unidade para lógica de preferência de mão**

```ts
// tests/handedness.test.ts
import assert from 'node:assert/strict';

function toggleMode(current: 'right' | 'left'): 'right' | 'left' {
  return current === 'left' ? 'right' : 'left';
}

function getCardTitle(current: 'right' | 'left'): string {
  return current === 'left' ? 'Modo Destro' : 'Modo Canhoto';
}

function reverseDockOrder<T>(items: T[], isLeftHanded: boolean): T[] {
  return isLeftHanded ? [...items].reverse() : items;
}

assert.equal(toggleMode('right'), 'left');
assert.equal(toggleMode('left'), 'right');
assert.equal(getCardTitle('right'), 'Modo Canhoto');
assert.equal(getCardTitle('left'), 'Modo Destro');

const normalDock = ['mais', 'noticias', 'vagas', 'voltar'];
assert.deepEqual(reverseDockOrder(normalDock, false), ['mais', 'noticias', 'vagas', 'voltar']);
assert.deepEqual(reverseDockOrder(normalDock, true), ['voltar', 'vagas', 'noticias', 'mais']);

console.log('✅ Handedness logic tests passed');
```

- [ ] **Step 2: Executar teste para validar lógica**

Run: `npx tsx tests/handedness.test.ts`  
Expected: PASS

- [ ] **Step 3: Implementar `src/context/HandednessContext.tsx`**

Criar o provider com leitura de `localStorage.getItem("guarapuava:handedness")`, fallback seguro para hidratação (`useSyncExternalStore` ou montagem no cliente) e exportar o hook `useHandedness()`.

- [ ] **Step 4: Registrar `HandednessProvider` em `src/app/layout.tsx`**

Envolver os children com `HandednessProvider` dentro de `ThemeProvider`.

- [ ] **Step 5: Executar typecheck e commit**

```bash
npx tsc --noEmit
git add src/context/HandednessContext.tsx src/app/layout.tsx tests/handedness.test.ts
git commit -m "feat(acessibilidade): implementa HandednessContext para modo destro e canhoto"
```

---

### Task 2: Redução do Popup "Mais" (`OptionsPanel`) para 2 Botões

**Files:**
- Modify: `src/components/ui/OptionsPanel.tsx:1-120`

**Interfaces:**
- Consumes: `useHandedness()` de `@/context/HandednessContext`
- Modifies: `OptionsPanel` para exibir apenas os botões `Opções` e `Utilidades`. Em modo canhoto, inverte a ordem para `[Utilidades]` `[Opções]`.

- [ ] **Step 1: Atualizar `OptionsPanel.tsx`**

Remover o botão de alternar tema do `OptionsPanel`. Incluir o botão `Opções` (que navega para `/opcoes` ou invoca `onSelectOpcoes`) e o botão `Utilidades` (que navega para `/utilidades`). Respeitar `isLeftHanded` invertendo os 2 botões na grade.

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/OptionsPanel.tsx
git commit -m "refactor(ui): simplifica painel Mais com 2 botoes e suporte a canhoto"
```

---

### Task 3: Criação da Central de Opções (`OpcoesFeed` e `/opcoes`)

**Files:**
- Create: `src/components/opcoes/OpcoesFeed.tsx`
- Create: `src/app/opcoes/page.tsx`

**Interfaces:**
- Consumes: `useHandedness()`, `useTheme()`, `useRouter()`
- Produces:
  ```ts
  export interface OpcoesFeedProps {
    onSelectNoticias?: () => void;
    onSelectVagas?: () => void;
    onSelectInfo?: () => void;
    hideNav?: boolean;
  }
  ```

- [ ] **Step 1: Criar o componente `src/components/opcoes/OpcoesFeed.tsx`**

Implementar:
- Cabeçalho: Esquerda `Opções`, Direita `Ajustes e acessibilidade`.
- Card 1: Destro/Canhoto (Título dinâmico: "Modo Canhoto" se Destro, "Modo Destro" se Canhoto; Texto: *"Alterne entre os modos destro e canhoto para que os botões fiquem ao alcance do seu conforto"*). Sem botão interno; card 100% clicável com feedback tátil.
- Card 2: Modo Claro/Escuro (Título dinâmico: "Modo Escuro" se claro, "Modo Claro" se escuro; Texto: *"Alterne as cores do portal para descanso visual e economia de bateria"*). 100% clicável.
- Card 3: Informações (Título: "Informações"; Texto: *"Diretrizes editoriais, fontes públicas, transparência e termos de responsabilidade"*). Ao clicar, navega para `/opcoes/informacoes` ou invoca `onSelectInfo`.
- Dock: `[Mais]` `[Filtrar]` `[Notícias]` `[Vagas]` (com `Filtrar` desabilitado, e invertido se `isLeftHanded`).

- [ ] **Step 2: Criar a página `src/app/opcoes/page.tsx`**

Página Next.js que renderiza `OpcoesFeed` com título e meta descrições semânticas.

- [ ] **Step 3: Testar compilação**

Run: `npx tsc --noEmit`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/opcoes/OpcoesFeed.tsx src/app/opcoes/page.tsx
git commit -m "feat(opcoes): implementa tela de opcoes e acessibilidade com cards clicaveis"
```

---

### Task 4: Página de Informações sob `/opcoes/informacoes` com Dock de Retorno

**Files:**
- Create: `src/app/opcoes/informacoes/page.tsx`
- Modify: `src/components/InfoFeed.tsx:470-499`

**Interfaces:**
- Consumes: `useHandedness()`, `useRouter()`
- Modifies: `InfoFeed.tsx` para garantir que o dock mobile tenha:
  - Destro: `[Mais]` `[Notícias]` `[Vagas]` `[Voltar]`
  - Canhoto: `[Voltar]` `[Vagas]` `[Notícias]` `[Mais]`
  - O botão `Voltar` direciona de volta para `/opcoes`.

- [ ] **Step 1: Atualizar dock do `InfoFeed.tsx`**

Em `InfoFeed.tsx`, quando exibido no mobile ou com navegação ativa, configurar o dock com os 4 botões: Mais, Notícias, Vagas e Voltar. No modo canhoto, inverter a ordem. Conectar o clique do botão "Voltar" para navegar de volta a `/opcoes`.

- [ ] **Step 2: Criar `src/app/opcoes/informacoes/page.tsx`**

Renderizar `InfoFeed` com suporte à rota canônica `/opcoes/informacoes`.

- [ ] **Step 3: Verificar compilação**

Run: `npx tsc --noEmit`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/InfoFeed.tsx src/app/opcoes/informacoes/page.tsx
git commit -m "feat(informacoes): estrutura rota /opcoes/informacoes com dock e botao voltar"
```

---

### Task 5: Inversão dos Docks e Filtros no Modo Canhoto

**Files:**
- Modify: `src/components/ui/MainNav.tsx:160-240`
- Modify: `src/components/DetailedFeed.tsx:410-465`
- Modify: `src/components/JobDetail.tsx:590-640`
- Modify: `src/components/ui/FilterPanel.tsx:100-240`

**Interfaces:**
- Consumes: `useHandedness()` de `@/context/HandednessContext`

- [ ] **Step 1: Atualizar `MainNav.tsx`**

Adicionar suporte ao `isLeftHanded`: inverter a ordem visual dos 4 botões (`[Vagas] [Notícias] [Filtrar] [Mais]`) utilizando ordenação ou inversão direcional.

- [ ] **Step 2: Atualizar `DetailedFeed.tsx` e `JobDetail.tsx`**

Inverter a ordem visual dos 4 botões nos docks quando `isLeftHanded === true`:
- DetailedFeed: `[Voltar] [Vagas] [Filtrar] [Mais]`
- JobDetail: `[Voltar] [Notícias] [Filtrar] [Mais]`

- [ ] **Step 3: Atualizar `FilterPanel.tsx` no modo Vagas**

No modo Vagas, quando `isLeftHanded === true`:
- Linha 1 de botões: inverter para `[Experiência]` `[PCD]` `[Contrato]`.
- Linha 2: inverter para `[Favoritas]` na coluna esquerda e o input de busca nas duas colunas à direita.
- Manter o painel de filtro de notícias com seus 12 botões canônicos fixos inalterados.

- [ ] **Step 4: Verificar compilação**

Run: `npx tsc --noEmit`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/MainNav.tsx src/components/DetailedFeed.tsx src/components/JobDetail.tsx src/components/ui/FilterPanel.tsx
git commit -m "feat(acessibilidade): inverte docks e filtros de vagas no modo canhoto"
```

---

### Task 6: Adaptação dos Botões Flutuantes no Mapa do Cidade Viva

**Files:**
- Modify: `src/app/cidade-viva/_components/MapClient.tsx:485-525`

**Interfaces:**
- Consumes: `useHandedness()` de `@/context/HandednessContext`

- [ ] **Step 1: Atualizar ancoragem no `MapClient.tsx`**

Substituir a classe fixa `bottom-4 right-4 sm:bottom-6 sm:right-6 items-end` por classe dinâmica baseada em `isLeftHanded`:
- Destro: `bottom-4 right-4 sm:bottom-6 sm:right-6 items-end`
- Canhoto: `bottom-4 left-4 sm:bottom-6 sm:left-6 items-start`

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/cidade-viva/_components/MapClient.tsx
git commit -m "feat(cidade-viva): move controles do mapa para o lado esquerdo no modo canhoto"
```

---

### Task 7: Reestruturação do Modo Desktop (`DesktopStage` e `page.tsx`)

**Files:**
- Modify: `src/components/desktop/DesktopStage.tsx:120-225`
- Modify: `src/app/page.tsx:550-743`

**Interfaces:**
- Consumes: `isLeftHanded`, `view`, `desktopActiveTab`

- [ ] **Step 1: Atualizar o dock do Desktop em `DesktopStage.tsx`**

Reconfigurar a área de botões superiores em 2 linhas de 2 colunas:
- Linha 1: `[Notícias]` `[Vagas]`
- Linha 2: `[Utilidades]` `[Opções]`
Remover o alternador de tema e o botão solto de informações daqui.

- [ ] **Step 2: Atualizar slots no `page.tsx` para Desktop**

- Quando o usuário clica em `Opções`: exibe `OpcoesFeed` no `slotRight` (painel lateral abaixo do dock).
- Quando o usuário clica em `Informações`: exibe `InfoFeed` na coluna central (`slotCenter`), permitindo que a coluna lateral direita continue ativa com o dock e opções.

- [ ] **Step 3: Suportar hash `#opcoes` e `#informacoes` no histórico do navegador**

Atualizar o roteador e `handlePopState` em `page.tsx` para sincronizar `"opcoes"` e `"info"`.

- [ ] **Step 4: Executar build e typecheck**

Run: `npx tsc --noEmit`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/desktop/DesktopStage.tsx src/app/page.tsx
git commit -m "feat(desktop): reestrutura dock 2x2, opcoes no painel lateral e informacoes no centro"
```

---

### Task 8: Verificação de Ponta a Ponta e Validação Final

**Files:**
- Test: `tests/handedness.test.ts`
- Test: `tests/news-categories.test.ts`
- Test: `tests/filter-bar.test.ts`

- [ ] **Step 1: Executar todos os testes automatizados da suíte**

Run: `npx tsx tests/handedness.test.ts && npx tsx tests/news-categories.test.ts && npx tsx tests/filter-bar.test.ts`  
Expected: All tests PASS

- [ ] **Step 2: Executar verificação de tipos do TypeScript em todo o projeto**

Run: `npx tsc --noEmit`  
Expected: 0 errors

- [ ] **Step 3: Testar build de produção**

Run: `npm run build`  
Expected: Build concluído com sucesso sem erros de página ou rota.

- [ ] **Step 4: Commit de finalização**

```bash
git commit --allow-empty -m "chore: validacao e integracao completa do modo canhoto e opcoes"
```
