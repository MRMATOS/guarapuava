# Cidade Viva Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar a plataforma colaborativa de zeladoria urbana Cidade Viva no aplicativo Guarapuava Digital, renomeando "Opções" para "Mais", adicionando acesso pelo menu e cabeçalho desktop, atualizando os termos de privacidade para geolocalização e configurando o backend Supabase com tiles OpenFreeMap.

**Architecture:** A ferramenta rodará em rota dedicada `/cidade-viva` construída sobre Next.js App Router e Server Actions. O mapa usa MapLibre GL com tiles abertos do OpenFreeMap (`positron`/`dark`) sem custos ou chaves. O backend Supabase gerencia categorias urbanas locais, relatos públicos com geocodificação reversa do Nominatim, storage de fotos comprimidas em WebP e anonimização de IP conforme a LGPD.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, MapLibre GL 6.9, Supabase (PostgreSQL + Storage), Lucide React.

**Spec:** [docs/superpowers/specs/2026-10-11-cidade-viva-design.md](file:///Users/rodrigomatos/Documents/guarapuava/docs/superpowers/specs/2026-10-11-cidade-viva-design.md)

## Global Constraints
- Nenhuma dependência externa paga ou que exija cartão de crédito (OpenFreeMap e OpenStreetMap Nominatim são estritamente gratuitos).
- Centro padrão do mapa fixado em Guarapuava/PR: `[-51.4642, -25.3907]`.
- Respeito estrito à LGPD: IPs gravados apenas como hash SHA-256 com salt secreto (`HASH_SALT`), nunca expostos na view pública.
- A geolocalização deve ser solicitada estritamente sob demanda apenas na tela do Cidade Viva.
- O design deve respeitar a linguagem tátil do *Painel de Rádio* (elevações neumórficas, botões `Key`, sombras suaves), sem estilos neobrutalistas rígidos.

## Review Focus
1. **Fallback sem GPS:** Se o usuário recusar a permissão de localização no navegador, o mapa deve abrir graciosamente centralizado em Guarapuava sem quebrar a UI.
2. **Compressão de fotos:** Imagens tiradas da câmera do celular devem ser comprimidas no cliente antes do envio para não exceder o limite de 2MB do Supabase Storage.
3. **Modo Escuro / Claro Dinâmico:** Alternar o tema do app deve trocar o estilo do mapa OpenFreeMap sem recarregar a página.
4. **Resolução de Deep Link:** Ao acessar `/cidade-viva?id=...`, o relato indicado deve ser focalizado com a gaveta aberta.
5. **Rate-limit Antispam:** Submissões repetidas de um mesmo IP devem retornar aviso amigável de intervalo de 5 minutos.

---

### Task 1: Instalação do MapLibre GL e Configuração do Worker Script

**Files:**
- Modify: `package.json`
- Create: `scripts/copy-maplibre-worker.sh`
- Create: `public/maplibre/.gitkeep`

**Interfaces:**
- Produz: `public/maplibre/maplibre-gl-worker.mjs` e dependência `maplibre-gl` no projeto.

- [ ] **Step 1: Instalar dependência `maplibre-gl`**
Run: `npm install maplibre-gl@^6.9.0`
Expected: Instalação bem-sucedida sem quebrar dependências existentes.

- [ ] **Step 2: Criar o script de cópia do worker em `scripts/copy-maplibre-worker.sh`**
Criar script bash executável que copia `node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs` e `maplibre-gl-shared.mjs` para `public/maplibre/`.

- [ ] **Step 3: Adicionar hook de cópia no `package.json`**
Adicionar `"copy:maplibre": "bash scripts/copy-maplibre-worker.sh"` e incluir em `"postinstall"`.

- [ ] **Step 4: Executar o script e verificar arquivos gerados**
Run: `npm run copy:maplibre`
Expected: Arquivos `public/maplibre/maplibre-gl-worker.mjs` gerados com sucesso.

- [ ] **Step 5: Commit das configurações**
```bash
git add package.json package-lock.json scripts/copy-maplibre-worker.sh
git commit -m "chore: setup maplibre-gl and worker copy script"
```

---

### Task 2: Migration do Supabase e Criação do Storage Bucket

**Files:**
- Create: `supabase/migrations/20261011_create_cidade_viva_tables.sql`

**Interfaces:**
- Produz: Tabelas `cidade_viva_categories`, `cidade_viva_reports`, view `cidade_viva_reports_public`, bucket `cidade-viva-reports` e função `check_rate_limit`.

- [ ] **Step 1: Escrever a migration SQL completa**
Criar o arquivo `supabase/migrations/20261011_create_cidade_viva_tables.sql` contendo:
- Criação de `cidade_viva_categories` com categorias locais de Guarapuava.
- Criação de `cidade_viva_reports` com constraints de status e coordenadas.
- Criação de índices geoespaciais e de busca por IP/status.
- Criação da view segura `cidade_viva_reports_public` (sem coluna de IP e excluindo status resolvido).
- Criação da função RPC `check_rate_limit`.
- Políticas de RLS para leitura pública anônima.
- Instrução de criação do bucket `cidade-viva-reports` no Supabase Storage.

- [ ] **Step 2: Aplicar a migration no banco de dados Supabase de Guarapuava**
Executar a migration no projeto Supabase via Supabase MCP tool ou SQL runner.

- [ ] **Step 3: Commit da migration**
```bash
git add supabase/migrations/20261011_create_cidade_viva_tables.sql
git commit -m "feat(db): add cidade viva tables, view, and rate limit rpc"
```

---

### Task 3: Atualização dos Termos e Privacidade em `InfoFeed.tsx`

**Files:**
- Modify: `src/components/InfoFeed.tsx`

**Interfaces:**
- Consumes: Estrutura tátil existente do `InfoFeed`.
- Produz: Seção clara e detalhada sobre o uso opcional da geolocalização e anonimização de relatos urbanos.

- [ ] **Step 1: Adicionar bloco explicativo do Cidade Viva em `InfoFeed.tsx`**
Incluir tópicos específicos no artigo:
- "Cidade Viva e Geolocalização sob demanda": Informar que o GPS é 100% opcional e nunca é ativado fora da tela do mapa.
- "Anonimização e LGPD": Explicar que relatos não coletam nome nem telefone, e o IP é convertido em hash criptográfico irreversível para proteção contra abusos.
- "Colaboração Comunitária": Explicar a validação pública das ocorrências na cidade.

- [ ] **Step 2: Verificar visualmente e sintaticamente o componente**
Verificar ausência de erros de lint e formatação consistente com a linguagem do portal.

- [ ] **Step 3: Commit**
```bash
git add src/components/InfoFeed.tsx
git commit -m "docs(privacy): update terms for cidade viva location and anonymity"
```

---

### Task 4: Atualização da Navegação ("Opções" -> "Mais", "Teste" -> "Cidade Viva")

**Files:**
- Modify: `src/components/ui/MainNav.tsx`
- Modify: `src/components/ui/OptionsPanel.tsx`
- Modify: `src/components/desktop/DesktopStage.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produz: Botão "Mais" no Dock, botão "Cidade Viva" no painel de opções móvel e no cabeçalho desktop que redireciona para `/cidade-viva`.

- [ ] **Step 1: Atualizar rótulo no `MainNav.tsx`**
Modificar o texto do 1º botão de "Opções" para "Mais" e ajustar aria-labels.

- [ ] **Step 2: Atualizar botão no `OptionsPanel.tsx`**
Modificar a 1ª tecla tátil de "Teste" para "Cidade Viva" com redirecionamento ao clicar (`window.location.href = '/cidade-viva'` ou `router.push('/cidade-viva')`).

- [ ] **Step 3: Atualizar tecla de atalho no `DesktopStage.tsx`**
Modificar a primeira tecla de opções no cabeçalho superior direito do desktop de "Teste" para "Cidade Viva".

- [ ] **Step 4: Commit**
```bash
git add src/components/ui/MainNav.tsx src/components/ui/OptionsPanel.tsx src/components/desktop/DesktopStage.tsx
git commit -m "feat(nav): rename opcoes to mais and link cidade viva"
```

---

### Task 5: Implementação dos Módulos Utilitários e Server Actions do Cidade Viva

**Files:**
- Create: `src/app/cidade-viva/_lib/types.ts`
- Create: `src/app/cidade-viva/_lib/geocoding.ts`
- Create: `src/app/cidade-viva/_lib/clustering.ts`
- Create: `src/app/cidade-viva/_lib/geojson.ts`
- Create: `src/app/cidade-viva/_lib/image-compression.ts`
- Create: `src/app/cidade-viva/_lib/location-storage.ts`
- Create: `src/app/cidade-viva/_lib/use-user-location.ts`
- Create: `src/app/cidade-viva/_lib/proximity-tour.ts`
- Create: `src/app/cidade-viva/actions.ts`

**Interfaces:**
- Produz: Ações de busca (`getCategories`, `getReports`), submissão (`createReport`), geocodificação e manipulação geoespacial.

- [ ] **Step 1: Criar `types.ts` com tipos de categoria, relato, geojson e status**
Definir estruturas completas com TypeScript estrito.

- [ ] **Step 2: Criar utilitários de geolocalização e geocodificação reversa**
Implementar `geocoding.ts` com Nominatim OSM (timeout 1.5s) e mapeamento para Guarapuava.

- [ ] **Step 3: Criar utilitários de compressão e clusterização**
Implementar `image-compression.ts` (conversão para WebP em canvas) e `clustering.ts` (agrupamento espacial de 100m).

- [ ] **Step 4: Criar `actions.ts` com as Server Actions**
Implementar `getCategories`, `getReports` e `createReport` com verificação de rate-limit, hash de IP com `HASH_SALT` e upload para o Supabase Storage.

- [ ] **Step 5: Commit**
```bash
git add src/app/cidade-viva/_lib/ src/app/cidade-viva/actions.ts
git commit -m "feat(cidade-viva): add core geospatial utils and server actions"
```

---

### Task 6: Componentes de Interface Tátil do Cidade Viva

**Files:**
- Create: `src/app/cidade-viva/_components/CategoryIcons.tsx`
- Create: `src/app/cidade-viva/_components/FilterBar.tsx`
- Create: `src/app/cidade-viva/_components/ReportModal.tsx`
- Create: `src/app/cidade-viva/_components/ReportDrawer.tsx`
- Create: `src/app/cidade-viva/_components/MapClient.tsx`
- Create: `src/app/cidade-viva/_components/CidadeVivaContainer.tsx`

**Interfaces:**
- Consumes: Design system tátil (`Key`, relevo, sombras, tipografia, `ThemeContext`).
- Produz: Interface completa do mapa com suporte a navegação por pinos, drawer responsivo e modal de reporte.

- [ ] **Step 1: Criar `CategoryIcons.tsx` e `FilterBar.tsx`**
Implementar mapeamento de ícones do Lucide e barra de filtros com chips táteis e contadores.

- [ ] **Step 2: Criar `ReportModal.tsx` adaptado ao design system**
Formulário em 2 passos (seleção do problema -> foto e descrição) com prévia em tempo real, suporte à câmera e botões `Key`.

- [ ] **Step 3: Criar `ReportDrawer.tsx` com gaveta tátil e tour de proximidade**
Gaveta de detalhes do relato selecionado, galeria de fotos em lightbox, status de validação comunitária e botões anterior/próximo.

- [ ] **Step 4: Criar `MapClient.tsx` com MapLibre GL e tiles OpenFreeMap**
Inicializar mapa centralizado em Guarapuava (`[-51.4642, -25.3907]`), aplicar camadas de círculos com raio dinâmico por volume de relatos, alternar estilos `positron`/`dark` conforme o tema e gerenciar cliques em pinos.

- [ ] **Step 5: Criar `CidadeVivaContainer.tsx`**
Wrapper client-side com carregamento dinâmico (`next/dynamic` com `ssr: false`) e esqueleto de carregamento com estilo do painel.

- [ ] **Step 6: Commit**
```bash
git add src/app/cidade-viva/_components/
git commit -m "feat(cidade-viva): implement tactile ui components and maplibre container"
```

---

### Task 7: Página Principal `/cidade-viva`, Moderação e Integração Final

**Files:**
- Create: `src/app/cidade-viva/page.tsx`
- Create: `src/app/cidade-viva/actions-admin.ts`
- Modify: `README.md` ou documentação de variáveis de ambiente

**Interfaces:**
- Produz: Página pública `/cidade-viva` com metadata rica (OpenGraph), cabeçalho de retorno a Vagas/Notícias e rotinas de moderação para admin.

- [ ] **Step 1: Criar `src/app/cidade-viva/page.tsx`**
Carregar categorias e relatos no servidor (`Promise.all([getCategories(), getReports(), createSupabaseServer()])`) e renderizar o container com barra de topo contendo botão para voltar ao portal.

- [ ] **Step 2: Implementar ações de moderação em `actions-admin.ts`**
Criar `updateReportStatusAction` e `deleteReportAction` autorizadas exclusivamente para `ADMIN_EMAIL`.

- [ ] **Step 3: Testar compilação e tipagem completa**
Run: `npm run build`
Expected: Build do Next.js passa com 0 erros de compilação ou tipo.

- [ ] **Step 4: Commit**
```bash
git add src/app/cidade-viva/page.tsx src/app/cidade-viva/actions-admin.ts
git commit -m "feat(cidade-viva): main route and admin moderation actions"
```

---

### Task 8: Verificação Ponta a Ponta e Instruções de Deploy (Vercel)

- [ ] **Step 1: Validar funcionamento do mapa e alternador de temas localmente**
- [ ] **Step 2: Testar submissão simulada e geocodificação reversa**
- [ ] **Step 3: Documentar os secrets a adicionar no painel da Vercel (`HASH_SALT`, `ADMIN_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY`)**
