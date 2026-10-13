# Plano de Implementação: Rotas de Ônibus por Proximidade e Rotas Salvas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar ordenação estrita de paradas por proximidade geográfica (GPS e endereço pesquisado), remoção do card de instrução, fluxo de seleção de partida/destino filtrado pelo endereço no feed, e sistema de persistência de rotas salvas com visualização em "Minhas Rotas".

**Architecture:** 
- `src/lib/bus/saved-routes.ts`: Gerenciamento e persistência das rotas salvas em `localStorage`.
- `src/components/bus/BusScheduleFeed.tsx`: Remoção do banner de instrução, suporte à listagem plana ordenada por menor distância métrica (`referenceCoords`), e renderização de múltiplas rotas salvas roláveis em sequência.
- `src/components/bus/BusRoutePlannerPanel.tsx`: Integração da busca de endereço para alimentar coordenadas de referência do feed, botão de "Minhas Rotas" ao lado do botão de partida, e botões lado a lado de "Salvar Rota" e "Nova Rota" no traçado final.
- `src/app/utilidades/onibus/page.tsx`: Orquestração dos estados de rota, coordenadas de referência de busca, modo "Minhas Rotas" e sincronização com o feed.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, LocalStorage, Lucide Icons.

---

## Global Constraints

- Seguir estritamente o design system alabastro (Dieter Rams / Braun) documentado em `DESIGN.md`.
- Não utilizar bibliotecas externas adicionais além do que já está no projeto.
- Preservar todas as convenções neumórficas (`surface-card`, `Key`, `Dock`, `badge-inset`, etc.).
- Conforme solicitado pelo usuário: **Não implementar tela de edição nem exclusão de rotas neste momento.**

## Review Focus

1. **Ordenação por Distância Real:** Parada a 50m do usuário ou do endereço pesquisado deve ser categoricamente o primeiro card do feed, sem agrupamento estático por linha que a esconda no final.
2. **Atualização do Feed na Seleção de Endereço:** Ao selecionar um endereço sugerido no input de busca, o feed deve filtrar e exibir as paradas ao redor daquele endereço imediatamente.
3. **Persistência de Rotas:** Ao clicar em "Salvar Rota", a rota deve ser gravada no `localStorage` e refletir imediatamente no botão e na lista de "Minhas Rotas".
4. **Resgate em "Minhas Rotas":** Ao clicar no botão "Minhas rotas", as rotas salvas devem ser renderizadas uma abaixo da outra com o mesmo layout de itinerário completo, roláveis na tela.
5. **Transição de Passos:** Ao confirmar a partida, o filtro de endereço anterior deve ser limpo e o feed deve voltar a exibir as opções para o destino.

---

### Task 1: Remover o card educativo de instrução do topo do feed

**Files:**
- Modify: `src/components/bus/BusScheduleFeed.tsx:411-423`

- [ ] **Step 1: Remover o banner de instrução de toque**
Remover o bloco condicional `isRouteMode && !isCalculatedRoute && (...)` que exibia a mensagem *"Toque em um card para selecionar a parada de partida | Passo 1 de 2"*.

- [ ] **Step 2: Verificar compilação**
Executar `npx tsc --noEmit`.

---

### Task 2: Criar utilitário de persistência para Rotas Salvas

**Files:**
- Create: `src/lib/bus/saved-routes.ts`

**Interfaces:**
- Produces:
  - `export interface SavedBusRoute`: Objeto contendo `id`, `createdAt`, `origem: { ponto: PontoItinerario; linha: LinhaBairro }`, `destino: { ponto: PontoItinerario; linha: LinhaBairro }`.
  - `export function getSavedRoutes(): SavedBusRoute[]`
  - `export function saveRoute(origem: { ponto: PontoItinerario; linha: LinhaBairro }, destino: { ponto: PontoItinerario; linha: LinhaBairro }): SavedBusRoute`
  - `export function isRouteSaved(origemPontoId: string, destinoPontoId: string): boolean`

- [ ] **Step 1: Implementar `src/lib/bus/saved-routes.ts` com validação de SSR (`window !== "undefined"`) e salvamento em `guarapuava_saved_bus_routes`**
- [ ] **Step 2: Verificar compilação**
Executar `npx tsc --noEmit`.

---

### Task 3: Ordenação do feed por proximidade (GPS do usuário ou coordenadas de endereço pesquisado)

**Files:**
- Modify: `src/components/bus/BusScheduleFeed.tsx`
- Modify: `src/lib/geo/distance.ts`

**Interfaces:**
- Consumes:
  - `referenceCoords?: { lat: number; lon: number; label?: string } | null`
  - `isRouteMode: boolean`
  - `linhas: LinhaBairro[]`

- [ ] **Step 1: Adicionar suporte à listagem plana ordenada por proximidade**
Quando `referenceCoords` estiver definido (seja pelo GPS `userCoords` ou pelas coordenadas do endereço pesquisado) e estiver no modo de rotas (`isRouteMode`):
- Mapear todos os pontos válidos de todas as linhas com coordenadas.
- Calcular a distância exata em metros para cada parada.
- Ordenar estritamente de forma ascendente pela distância (`distA - distB`).
- Renderizar os cards ordenados com o ponto mais próximo no topo absoluto (#1).
- Cada card exibe:
  - Código e nome da linha em baixo-relevo (`Linha 01 - Boqueirão`).
  - Distância formatada em destaque (`a 80 m`, `a 1.2 km`).
  - Endereço completo, número, bairro e referência.
  - Horários e botão Google Maps.
  - Seleção tátil ao toque para Origem ou Destino.

- [ ] **Step 2: Manter visualização padrão por linhas agrupadas apenas quando NÃO houver coordenadas de referência nem modo de rota ativo.**

---

### Task 4: Fluxo de busca de endereço direcionando o feed

**Files:**
- Modify: `src/components/bus/BusRoutePlannerPanel.tsx`
- Modify: `src/app/utilidades/onibus/page.tsx`

- [ ] **Step 1: Conectar seleção de sugestão do autocomplete às coordenadas de referência do feed**
Quando o usuário seleciona um endereço sugerido no input de busca:
- Em vez de escolher uma parada oculta no background, disparar `onSelectSearchCoords({ lat: sug.latitude, lon: sug.longitude, label: sug.label })`.
- O input de busca preenche com o nome do endereço pesquisado.
- O feed é imediatamente reordenado trazendo as paradas mais próximas daquele endereço para o topo.
- O usuário toca no card que preferir no feed.

- [ ] **Step 2: Ao confirmar a Partida ("Confirmar Partida"):**
- Registrar o ponto de partida selecionado.
- Limpar `searchCoords` e input de busca para que a lista volte a mostrar as paradas por proximidade do usuário.
- Avançar para `routeStep = "destination"`.

- [ ] **Step 3: No Passo 2 ("Destino"):**
- Permitir pesquisar o endereço de destino.
- Ao selecionar a sugestão, filtrar e ordenar o feed pelas paradas mais próximas do destino.
- Ao tocar na parada de destino e clicar em "Confirmar Destino", calcular a rota.

---

### Task 5: Botões no Painel de Rotas ("Minhas rotas", "Salvar Rota" e "Nova Rota")

**Files:**
- Modify: `src/components/bus/BusRoutePlannerPanel.tsx`

- [ ] **Step 1: Adicionar botão "Minhas rotas" no Passo 1 (Partida)**
Na linha superior do painel, renderizar dois botões lado a lado:
- Esquerda: `<Key pressed={isShowingSavedRoutes} onClick={onToggleSavedRoutes}>Minhas rotas</Key>`
- Direita: `<Key variant={isConfirmEnabled ? "coral" : "label"}>Selecione o ponto de partida / Confirmar Partida</Key>`

- [ ] **Step 2: Adicionar botões "Salvar Rota" e "Nova Rota" no passo calculado**
Quando a rota estiver calculada (`routeStep === "calculated"`):
- Esquerda: `<Key variant={isSaved ? "label" : "coral"} onClick={handleSaveRoute}>{isSaved ? "Rota Salva" : "Salvar Rota"}</Key>`
- Direita: `<Key onClick={onResetRoute}>Nova Rota</Key>`

---

### Task 6: Visualização das Rotas Salvas no Feed

**Files:**
- Modify: `src/components/bus/BusScheduleFeed.tsx`
- Modify: `src/app/utilidades/onibus/page.tsx`

- [ ] **Step 1: Componentizar o card de itinerário de rota**
Extrair a renderização do itinerário da rota (Origem com horários, paradas intermediárias e Destino) para que possa renderizar tanto a rota recém-calculada quanto rotas salvas.

- [ ] **Step 2: Renderizar lista de rotas salvas quando `isShowingSavedRoutes === true`**
- Mapear a lista de rotas salvas no feed, exibindo uma rota abaixo da outra em sequência vertical.
- Permitir que o usuário role verticalmente para visualizar todas as suas rotas salvas.
- Exibir estado vazio caso o usuário não tenha nenhuma rota salva ("Nenhuma rota salva ainda").

---

### Task 7: Verificação, Detecção Mecânica e Validação Visual

- [ ] **Step 1: Executar `npx tsc --noEmit` para validação de tipos TypeScript.**
- [ ] **Step 2: Executar `.agent/skills/impeccable/scripts/impeccable detect --json` para confirmar 0 erros de design e conformidade com `DESIGN.md`.**
- [ ] **Step 3: Testar os fluxos no navegador via browser subagent:**
  - Fluxo 1: Verificação da ausência do banner de instrução.
  - Fluxo 2: Verificação da ordenação por proximidade ao liberar GPS (ponto mais próximo no topo #1).
  - Fluxo 3: Busca de endereço, filtragem do feed para o endereço pesquisado, seleção de partida e destino.
  - Fluxo 4: Botão "Salvar Rota" e acesso via botão "Minhas rotas", com listagem sequencial das rotas salvas.
