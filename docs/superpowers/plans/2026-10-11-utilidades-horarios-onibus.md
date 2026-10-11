# Hub de Utilidades e Horários de Ônibus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o menu "Mais" em 2 linhas, a rota `/utilidades` com o card de Horários de Ônibus, a re-extração canônica de `horarios-onibus.json` com pontos de itinerário e horários correlacionados, e a página `/utilidades/onibus` com listagem contínua e filtro hierárquico em 3 linhas + busca.

**Architecture:** A aplicação consome o arquivo JSON estruturado em memória via TypeScript Server e Client Components no Next.js App Router. O menu "Mais" é reestruturado em duas linhas no mobile e desktop; a rota `/utilidades` atua como hub tátil de alabastro; e `/utilidades/onibus` provê exploração contínua por scroll com filtro hierárquico em 3 linhas com transição para pontos e busca instantânea.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, TailwindCSS (tokens do design system alabastro `DESIGN.md`), Swift (PDFKit para processamento 2D com coordenadas dos horários).

**Spec:** `docs/superpowers/specs/2026-10-11-utilidades-horarios-onibus-design.md`

## Global Constraints

- **Design System Alabastro:** Todos os novos cartões e teclas utilizam os tokens canônicos (`--canvas` / `#eff0f3`, tecla `Key` com afundamento `key-pressed`, sombras duplas de alto-relevo sem emojis decorativos).
- **Sem Quebra do Dock:** `.page-shell` e `Dock` reservam o espaço exato de rodapé em todas as rotas.
- **TypeScript Estrito:** Zero erros no compilador (`npx tsc --noEmit`).
- **Resoluções:** Total paridade e sincronia entre mobile (< 1024px) e desktop (>= 1024px).

## Review Focus

1. **Vínculo Ponto-Horário nos PDFs Rotacionados:** A transformação de 90° deve mapear cada nome de ponto real (ex: *Campo do Batel*) com exatidão aos horários daquela coluna.
2. **Navegação do Menu "Mais":** A linha superior deve renderizar 1º Informações e 2º Modo Claro/Escuro; a inferior deve conter 1º Cidade Viva, 2º Utilidades e 3º Estatísticas (desabilitado).
3. **Comportamento do Filtro Hierárquico de Ônibus:** 3 linhas de altura com scroll vertical para bairros em ordem alfabética; ao tocar em um bairro, as 3 linhas mudam para os pontos daquela rota e exibem a tecla `← Voltar aos Bairros`.
4. **Scroll e Destaque do Ponto Selecionado:** Ao clicar em um ponto no filtro, a visualização contínua deve rolar suavemente e destacar o bloco correspondente.
5. **Navegação de Retorno no Dock:** O Dock em `/utilidades` deve ter botão `Voltar` que retorna para `/`; o Dock em `/utilidades/onibus` deve ter botão `Voltar` que retorna para `/utilidades`.

---

### Task 1: Tipagem TypeScript e Re-extração Canônica de `horarios-onibus.json`

**Files:**
- Modify: `src/types/bus.ts`
- Modify: `scripts/extrair-horarios-onibus.swift`
- Output: `src/data/horarios-onibus.json`

**Interfaces:**
- Produces: `PontoItinerario`, `LinhaBairro`, `DadosHorariosOnibus` em `src/types/bus.ts` e o arquivo JSON estruturado consumível em `src/data/horarios-onibus.json`.

- [ ] **Step 1: Atualizar interfaces TypeScript em `src/types/bus.ts`**

Adicionar as novas tipagens canônicas:
```typescript
export interface PontoItinerario {
  id: string;              // ex: "campo-do-batel"
  nome: string;            // ex: "Campo do Batel"
  ordem: number;           // 1, 2, 3...
  horariosUteis: string[]; // ["06:52", "07:22", "07:52", ...]
  horariosSabado: string[];// ["07:52", "08:52", "09:52", ...]
  horariosDomingo: string[]; // [...]
}

export interface LinhaBairro {
  id: string;              // ex: "linha-02"
  codigo: string;          // ex: "02"
  bairro: string;          // ex: "Cascavel"
  nomeExibicao: string;    // ex: "Linha 02 - Cascavel"
  tipo: "regular" | "interbairros";
  pontos: PontoItinerario[];
  observacoes?: string[];
}

export interface DadosHorariosOnibus {
  dataExtracao: string;
  totalLinhas: number;
  linhas: LinhaBairro[];
}
```

- [ ] **Step 2: Atualizar o extrator Swift com compensação de rotação e mapeamento de colunas**

Modificar `scripts/extrair-horarios-onibus.swift` para:
- Detectar `page.rotation` e converter coordenadas de texto para coordenadas visuais ($V_x$, $V_y$).
- Localizar a linha de cabeçalho `PONTOS` e extrair os nomes das colunas de paradas (*ex: Saída Fonte, Gelinski, Colégio Tupy, Campo do Batel...*).
- Agrupar e associar as colunas aos horários de Úteis, Sábados e Domingos.
- Salvar o resultado final formatado em `src/data/horarios-onibus.json` e `public/data/horarios-onibus.json`.

- [ ] **Step 3: Executar a extração dos dados**

Run: `swift scripts/extrair-horarios-onibus.swift`
Expected: Conclusão com sucesso, arquivo `src/data/horarios-onibus.json` gerado com as linhas e pontos reais.

- [ ] **Step 4: Validar dados e compilação de tipos**

Run: `node -e 'const d = require("./src/data/horarios-onibus.json"); console.log("Linhas:", d.linhas.length); const l = d.linhas.find(x => x.codigo === "02"); console.log("Cascavel pontos:", l?.pontos?.map(p => p.nome));'`
Expected: Linhas identificadas com pontos reais como "Campo do Batel" e horários associados.
Run: `npx tsc --noEmit`
Expected: PASS com 0 erros.

- [ ] **Step 5: Commit**

```bash
git add src/types/bus.ts scripts/extrair-horarios-onibus.swift src/data/horarios-onibus.json public/data/horarios-onibus.json
git commit -m "feat(bus): extract canonical bus schedule points and update typescript types"
```

---

### Task 2: Reestruturação do Menu "Mais" em Duas Linhas (Mobile & Desktop)

**Files:**
- Modify: `src/components/ui/OptionsPanel.tsx`
- Modify: `src/components/desktop/DesktopStage.tsx`

**Interfaces:**
- Consumes: `useTheme` de `@/context/ThemeContext`, `Key` de `@/components/ui/Key`, `useRouter` de `next/navigation`.
- Produces: Layout em 2 linhas físicas: Superior (`Informações`, `Modo claro/escuro`), Inferior (`Cidade Viva`, `Utilidades`, `Estatísticas`).

- [ ] **Step 1: Atualizar `OptionsPanel.tsx`**

Alterar o layout interno do painel móvel para renderizar duas grades separadas:
- Linha Superior: `grid grid-cols-2 gap-1.5 sm:gap-2` contendo:
  1. `<Key onClick={onSelectInfo}>Informações</Key>`
  2. `<Key onClick={toggleTheme}>{themeLabel}</Key>`
- Linha Inferior: `grid grid-cols-3 gap-1.5 sm:gap-2` contendo:
  1. `<Key onClick={() => { onClose(); router.push("/cidade-viva"); }}>Cidade Viva</Key>`
  2. `<Key onClick={() => { onClose(); router.push("/utilidades"); }}>Utilidades</Key>`
  3. `<Key disabled aria-disabled="true" className="opacity-40 cursor-not-allowed">Estatísticas</Key>`

- [ ] **Step 2: Atualizar `DesktopStage.tsx`**

Atualizar o bloco `role="toolbar"` na coluna direita do desktop para seguir a mesma organização de 2 linhas, ajustando a altura do container de 42px para atender as duas linhas elegantes com respiro.

- [ ] **Step 3: Validar visual e compilação**

Run: `npx tsc --noEmit`
Expected: PASS sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/OptionsPanel.tsx src/components/desktop/DesktopStage.tsx
git commit -m "feat(nav): reorganize more options panel into two rows on mobile and desktop"
```

---

### Task 3: Rota do Hub de Utilidades (`/utilidades`)

**Files:**
- Create: `src/app/utilidades/page.tsx`

**Interfaces:**
- Consumes: `Dock` de `@/components/ui/Dock`, `Key` de `@/components/ui/Key`, `OptionsPanel` de `@/components/ui/OptionsPanel`, `Presence` de `@/components/ui/Presence`.
- Produces: Rota pública `/utilidades` com o cartão de Horários de Ônibus e rodapé Dock com navegação.

- [ ] **Step 1: Criar `src/app/utilidades/page.tsx`**

Implementar o hub de utilidades:
- Container `.page-shell` com max-width de leitura (430px) no padrão de alabastro.
- Cabeçalho minimalista com título "Utilidades" e descrição.
- Cartão único tátil em alto-relevo (`card` com 32px de border-radius):
  - Título: **Horários de Ônibus**
  - Descrição: Linhas urbanas e interbairros de Guarapuava, itinerários detalhados e horários por ponto de referência.
  - Selo tátil: `45 linhas • Pérola do Oeste`.
  - Clique navega para `/utilidades/onibus`.
- Dock inferior fixo com:
  - Tecla `Voltar` (retorna para `/`).
  - Tecla `Mais` (abre `OptionsPanel` com Cidade Viva, Informações, etc.).

- [ ] **Step 2: Testar rota e navegação**

Run: `npx tsc --noEmit`
Expected: PASS.
Verificar via browser se a rota `/utilidades` renderiza com estética idêntica às outras páginas e botão voltar funciona.

- [ ] **Step 3: Commit**

```bash
git add src/app/utilidades/page.tsx
git commit -m "feat(utilities): create utilities hub page with bus schedules card"
```

---

### Task 4: Componentes de Exibição e Filtro dos Horários de Ônibus

**Files:**
- Create: `src/components/bus/BusScheduleFeed.tsx`
- Create: `src/components/bus/BusFilterPanel.tsx`

**Interfaces:**
- Consumes: `LinhaBairro`, `PontoItinerario` de `@/types/bus`, `Key` de `@/components/ui/Key`.
- Produces:
  - `BusScheduleFeed`: feed de rolagem contínua dos bairros, pontos e horários por categoria de dia (úteis, sábados, domingos).
  - `BusFilterPanel`: painel com 3 linhas de scroll vertical de bairros em ordem alfabética + 4ª linha de busca textual, com transição dinâmica para pontos e tecla `← Voltar aos Bairros`.

- [ ] **Step 1: Implementar `BusScheduleFeed.tsx`**

Componente que renderiza:
- Lista contínua de linhas/bairros ordenados alfabeticamente.
- Cada linha apresenta seus Pontos de Ônibus em blocos de alabastro com identificadores de âncora (`id={`ponto-${linha.codigo}-${ponto.id}`}`).
- Em cada ponto, horários contínuos:
  - Seção Dias Úteis com horários formatados como chips/badges gravados.
  - Seção Sábados (quando houver).
  - Seção Domingos e Feriados (quando houver).
- Destaque com borda/relevo quando `pontoSelecionado` corresponder àquele ponto.

- [ ] **Step 2: Implementar `BusFilterPanel.tsx`**

Componente tátil com altura definida:
- **Estado Interno:** `selectedBairro: LinhaBairro | null`.
- **Modo 1 (Seleção de Bairro):**
  - Contém um container com **exatamente 3 linhas visíveis** com scroll vertical suave (`max-h-[140px] overflow-y-auto no-scrollbar`) contendo os botões `Key` de todos os bairros em ordem alfabética.
  - 4ª linha fixa abaixo: Campo de input de busca tátil estilizado com suporte a limpar busca.
- **Modo 2 (Seleção de Pontos do Bairro):**
  - Ao clicar em um bairro, a área de 3 linhas exibe:
    - Botão superior `← Voltar aos Bairros` para restaurar o Modo 1.
    - Grade com os botões `Key` dos pontos de ônibus daquele bairro.
    - Ao clicar em um ponto, dispara `onSelectPonto(bairro, ponto)` e fecha o filtro.

- [ ] **Step 3: Validar compilação**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/bus/BusScheduleFeed.tsx src/components/bus/BusFilterPanel.tsx
git commit -m "feat(bus): create continuous schedule feed and hierarchical 3-row filter panel"
```

---

### Task 5: Rota Completa dos Horários de Ônibus (`/utilidades/onibus`) e Integração

**Files:**
- Create: `src/app/utilidades/onibus/page.tsx`

**Interfaces:**
- Consumes: `BusScheduleFeed`, `BusFilterPanel`, `Dock`, `Key`, `OptionsPanel`, `Presence`, dados de `@/data/horarios-onibus.json`.
- Produces: Rota `/utilidades/onibus` totalmente funcional com integração de filtros, scroll suave e Dock.

- [ ] **Step 1: Criar `src/app/utilidades/onibus/page.tsx`**

Integrar:
- Carregamento dos dados de `horarios-onibus.json`.
- Gerenciamento de estado de busca e filtro.
- Renderização do `BusScheduleFeed`.
- Renderização do `BusFilterPanel` montado sobre o Dock com transição `Presence`.
- Dock com 3 teclas táteis:
  1. `Voltar` (retorna para `/utilidades`).
  2. `Filtrar` (abre e fecha `BusFilterPanel`).
  3. `Mais` (abre `OptionsPanel`).
- Rolagem suave até o ponto selecionado quando o usuário escolhe um ponto no filtro.

- [ ] **Step 2: Validação de Tipos e Build Completo**

Run: `npx tsc --noEmit`
Expected: PASS com 0 erros.
Run: `npm run build`
Expected: Build do Next.js concluído com sucesso e novas rotas geradas.

- [ ] **Step 3: Teste ponta a ponta no Browser**

Verificar no navegador:
1. Abrir `/`, clicar em `Mais`. Conferir que a linha superior tem `Informações` e `Modo claro/escuro`, e a inferior tem `Cidade Viva`, `Utilidades` e `Estatísticas` desabilitado.
2. Clicar em `Utilidades`. Verificar página `/utilidades` com o card de ônibus.
3. Clicar em `Horários de Ônibus`. Verificar `/utilidades/onibus` com os pontos reais e horários.
4. Clicar em `Filtrar`. Testar as 3 linhas de bairros, clicar em um bairro (ex: *Cascavel*), verificar a transição para os pontos (*Campo do Batel*), clicar no ponto e conferir o scroll e destaque na tela.
5. Testar os botões de retorno do Dock.

- [ ] **Step 4: Commit Final**

```bash
git add src/app/utilidades/onibus/page.tsx
git commit -m "feat(bus): implement /utilidades/onibus page with responsive dock and filtering"
```
