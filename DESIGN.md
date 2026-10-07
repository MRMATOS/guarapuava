---
name: Guarapuava Hoje
description: Notícias e vagas de Guarapuava num painel tátil de alabastro.
colors:
  canvas: "#eff0f3"
  ink: "#191c1f"
  ink-body: "#34383d"
  ink-muted: "#585d62"
  coral: "#ff4742"
  coral-deep: "#d93833"
  rule: "#cbd0dc"
  highlight: "#ffffff"
typography:
  headline:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.48
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.015em"
  caption:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  key: "12px"
  dock: "16px"
  card: "32px"
  pill: "999px"
spacing:
  page: "16px"
  page-sm: "20px"
  dock-pad: "10px"
  dock-offset: "12px"
  dock-clearance: "24px"
  key-gap: "10px"
components:
  key:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-body}"
    typography: "{typography.label}"
    rounded: "{rounded.key}"
    padding: "0 20px"
    height: "42px"
  key-pressed:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
  key-icon:
    textColor: "{colors.ink}"
    padding: "0 16px"
    height: "42px"
  dock:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.dock}"
    padding: "10px"
    height: "64px"
  card:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.card}"
    padding: "24px"
  badge:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
---

# Design System: Guarapuava Hoje

## Overview

**Creative North Star: "O Painel de Rádio"**

A interface é um único objeto físico: uma placa de alabastro fosco, como o painel de um rádio Braun dos anos 60. Nada é colado por cima; tudo é moldado na mesma superfície. Conteúdo sobe em alto-relevo (o cartão), controles são teclas que afundam quando apertadas, e informação secundária fica gravada em baixo-relevo (selos de horário).

A densidade é de leitura: uma coluna estreita (máx. 430px), uma notícia por linha, nenhum ornamento que não carregue informação. A cor quase não existe. O coral é um sinal, como o LED de "ligado" de um aparelho: marca tópicos, pulsa no "ao vivo" e mostra o foco. Ele nunca preenche uma tecla.

Rejeitado explicitamente: ícones decorativos ao lado de títulos (a "cara de IA"), teclas preenchidas de cor para estado ativo, rodapés que mudam de posição entre telas.

**Key Characteristics:**
- Uma superfície, uma cor de fundo (`canvas`) para tudo.
- Profundidade só por sombra dupla (luz branca no canto superior esquerdo, sombra azulada no inferior direito).
- Estado é físico: ativo = afundado, não colorido.
- Coral restrito a sinais pequenos.
- Rodapé (dock) idêntico, no mesmo pixel, em todas as telas.

## Colors

Monocromático frio com um único sinal quente.

### Primary
- **Coral Sinal** (`coral`): marcadores de tópico (•), ponto pulsante "atualizado às", anel de foco do teclado, indicador de filtro ativo e seleção de texto. **Coral Profundo** (`coral-deep`) é o hover/pressão desses mesmos elementos de texto.

### Neutral
- **Alabastro** (`canvas`): fundo da página e de *todas* as superfícies (cartão, dock, teclas, selos). Diferenciação vem da sombra, nunca de outro tom de fundo.
- **Tinta** (`ink`): títulos, datas, termos em negrito, rótulo da tecla afundada.
- **Tinta de Leitura** (`ink-body`): corpo das notícias e rótulo das teclas em repouso.
- **Tinta Apagada** (`ink-muted`): horários, selos, textos de apoio. Contraste ≥ 5.9:1 sobre o alabastro.
- **Linha Pontilhada** (`rule`): separador entre blocos de atualização (pontilhado, 1px, 90% opacidade).
- **Luz** (`highlight`): metade clara de toda sombra e bordas de luz (1px a 80%).

### Named Rules
**The LED Rule.** Coral ocupa no máximo um ponto, um marcador ou um contorno por elemento. Se um botão inteiro ficou coral, está errado.

**The One Surface Rule.** Nenhuma superfície recebe um fundo diferente de `canvas`. Precisa separar? Use sombra, nunca uma linha branca avulsa.

## Typography

**Body Font:** fonte do sistema (`ui-sans-serif, system-ui`) — SF Pro no iPhone.

**Character:** neutra e muito legível em tela pequena; o peso faz a hierarquia, não o tamanho.

> Nota: `layout.tsx` carrega Geist, mas a fonte não está ligada ao `font-family` do body, então hoje renderiza a fonte do sistema. Decisão pendente: ligar Geist (via `--font-sans` no `@theme`) ou remover o carregamento.

### Hierarchy
- **Headline** (700, 20px / 21px ≥640px, 1.3, -0.02em, `text-balance`): manchete síntese do dia e título de seção. Uma por tela.
- **Title** (600, 15px): data no topo do cartão.
- **Body** (400, 14.5px / 15px ≥640px, 1.48): texto das notícias; o termo inicial em **700** + `ink` funciona como chapéu.
- **Label** (500, 14.5px, -0.015em): rótulo de tecla.
- **Caption** (500, 12.5px, números tabulares): selos de horário.

### Named Rules
**The Tabular Clock Rule.** Toda data e horário usa números tabulares (`.tabular-time`), para os blocos alinharem quando atualizam.

## Layout

Coluna única centralizada, `--shell-max` 430px, margem `--page-pad` (16px; 20px ≥640px).

O dock é fixo e sua geometria é 100% derivada de tokens:

| Token | Valor | Papel |
|---|---|---|
| `--key-height` | 42px | Altura de toda tecla |
| `--dock-pad` | 10px | Respiro interno do dock |
| `--dock-height` | 64px (calculado) | tecla + 2×respiro + borda |
| `--dock-offset` | `max(12px, safe-area)` | Distância do dock à borda inferior |
| `--dock-clearance` | 24px | Espaço mínimo entre o fim do conteúdo e o dock |

`.page-shell` reserva `offset + height + clearance` de padding inferior, então nenhum conteúdo termina encostado no dock. Acima do dock há um degradê de 24px do alabastro para transparente, para o conteúdo "entrar" sob ele ao rolar.

### Named Rules
**The Fixed Dock Rule.** O rodapé só existe através do componente `Dock`. Nunca crie um `<footer>` posicionado à mão. Mudar a posição do rodapé = mudar um token.

## Elevation & Depth

Sistema neumórfico: luz fixa vinda do canto superior esquerdo. Toda sombra é um par (branca para cima-esquerda, azul-acinzentada `rgba(163,177,198,…)` para baixo-direita), sempre com deslocamento e desfoque.

### Shadow Vocabulary
- **raised-lg** (`10px 10px 24px rgba(163,177,198,.45), -10px -10px 24px #fff`): cartão de conteúdo.
- **raised-md** (`6px 6px 18px rgba(163,177,198,.42), -6px -6px 18px #fff`): dock.
- **raised-sm** (`3px 3px 6px rgba(163,177,198,.35), -3px -3px 6px rgba(255,255,255,.85)`): tecla em repouso.
- **inset** (`inset 3px 3px 6px rgba(163,177,198,.62), inset -3px -3px 6px #fff`): tecla afundada (pressionando ou travada).
- **inset-sm** (`inset 2px 2px 5px rgba(163,177,198,.5), inset -2px -2px 5px #fff`): selos gravados.

### Named Rules
**The Press Rule.** Estado ativo é sempre `inset`. Alto-relevo = disponível; baixo-relevo = selecionado/atual.

## Shapes

Cantos generosos e concêntricos: quanto maior a peça, maior o raio. Tecla 12px, dock 16px, cartão 32px, selo em pílula. Toda superfície em relevo tem uma borda de luz de 1px (branco 80%) para fixar a aresta.

## Components

### Buttons (Tecla — `Key`)
Uma tecla de aparelho: firme, curta, afunda ao toque.
- **Shape:** cantos suaves (12px), altura fixa 42px, respiro lateral 20px (16px na variante ícone).
- **Repouso:** alabastro, `raised-sm`, rótulo `ink-body` 500.
- **Toque (`:active`):** `inset` + escala 0.97, 180ms `cubic-bezier(.22,1,.36,1)`.
- **Travada (`pressed` / `aria-current="page"`):** permanece `inset`, rótulo passa a `ink`. Tocar de novo destrava (filtros).
- **Foco:** contorno coral 2px, afastado 3px.
- **Ícone (`variant="icon"`):** só ícone Lucide 20px, traço 2.2; hover coral em dispositivos com mouse.

### Navigation (Dock + `MainNav`)
- **Dock:** moldura fixa de 64px, `raised-md`, raio 16px. Aceita `above` para indicadores flutuantes (ex.: "Filtrando por") sem mover o dock.
- **MainNav:** composição fixa de 4 controles divididos em dois lados (`justify-between`):
  - **À esquerda:**
    1. **Tecla de Tema:** 1º botão à esquerda, variante ícone (`42px × 42px`), sem texto. Alterna instantaneamente entre Modo Claro (Lua) e Modo Escuro (Sol).
    2. **Pesquisar:** 2º botão, textual ("Pesquisar"), sem ícone, posicionado ao lado do botão de tema. Presente no dock sem ação disparada no momento.
  - **À direita:**
    3. **Notícias:** 3º botão, textual ("Notícias"), sem ícone. Permanece afundado na tela inicial/notícias.
    4. **Vagas:** 4º botão, textual ("Vagas"), sem ícone. Permanece afundado na tela de vagas.
- **Dock de detalhe (Notícias):** carrossel de tags à esquerda (a 4ª tag fica cortada de propósito para sinalizar rolagem) e tecla Voltar à direita, sem divisória. O respiro entre a borda de corte das tags e a tecla Voltar é o mesmo do dock (10px), igual ao respiro entre a tecla e a borda direita.
- **Dock de detalhe (Vagas):** alinhamento dividido (`justify-between`), com tecla de ação externa em coral/laranja à esquerda (`Abrir site da vaga`) e tecla Voltar (`variant="icon"`) à direita. Mantém exatamente a mesma geometria de 64px e safe-area offsets dos demais rodapés.

### Vagas (Feed e Detalhe)
- **Cabeçalho de Vagas:** título da seção ("Vagas em Guarapuava") à esquerda e data ("06/10/2026") à direita na mesma linha, sem tags soltas acima.
- **Feed de Vagas (`JobsFeed`):** lista vertical rolável com múltiplos cartões menores de vagas. Cada cartão contém estritamente:
  1. Título da vaga (`15px`, `font-bold`, `text-ink`).
  2. Nome da empresa (`14px` / `14.5px`, `text-ink-muted`).
  3. Data da publicação alinhada à direita na parte inferior do cartão (`Data da publicação: 06/10/2026`).
  Ao toque, o cartão afunda suavemente e abre o detalhe daquela vaga.
- **Detalhe da Vaga (`JobDetail`):**
  - Inicia diretamente com o título da vaga em headline (`20px` / `21px`), sem linha de metadados ou tag "Vaga de emprego" no topo.
  - Metadados sem bullet points (apenas rótulos em negrito: Empresa, Localização, Data de Publicação). Data de registro omitida para clareza visual.
  - Divisórias pontilhadas sutis (`border-dotted border-rule/90`).
  - Seções de **Descrição da Vaga** e **Requisitos** estruturadas internamente com marcadores táteis (`•`).
  - Dock: botão laranja à esquerda (`Abrir site da vaga`) e tecla Voltar à direita.

### Dark Mode (Modo Escuro Neumórfico)
- **Canvas:** `#16181b` (ardósia/grafite escuro de alta pureza).
- **Ink / Tinta:** `#f0f2f5` (títulos e rótulos afundados), `#c8cbd0` (corpo de texto), `#828892` (metadados).
- **Luz Especular:** borda de 1px a 7% branco (`rgba(255, 255, 255, 0.07)`).
- **Sombras:** pares de luz fraca superior-esquerda (`rgba(255,255,255, 0.035-0.045)`) e sombra escura profunda inferior-direita (`rgba(0, 0, 0, 0.52-0.75)`).
- **Persistência:** sincronização instantânea em `localStorage`, detecção de preferência de sistema e script anti-flash no `<head>`.

### Cards / Containers
- **Corner Style:** 32px (cartão de leitura e detalhe) e 22-24px (cartões menores de lista de vagas).
- **Background:** `canvas`.
- **Shadow Strategy:** `raised-lg` (cartão principal) e `raised-md` / `raised-sm` (cartões menores).
- **Border:** luz 1px.
- **Internal Padding:** 24px (28px ≥640px) para leitura principal; 20px para lista de vagas.
- Um cartão por tela em telas de síntese; lista de cartões dedicados no feed de vagas.

### Badge (Selo gravado)
- Pílula `inset-sm`, texto `caption` em `ink-muted`. Para horário/status. Pode levar o ponto coral pulsante quando indica "ao vivo".

## Do's and Don'ts

### Do:
- **Do** usar `Key` para todo botão e `Dock` para todo rodapé.
- **Do** usar utilitários de token (`bg-canvas`, `text-ink-muted`, `border-rule`) em vez de hex.
- **Do** indicar seleção com `pressed` / `aria-current` (afundado).
- **Do** manter a mesma geometria de dock em todas as telas; ajuste só via tokens em `globals.css`.

### Don't:
- **Don't** preencher teclas com coral ou qualquer cor para indicar estado.
- **Don't** colocar ícones decorativos ao lado de títulos ou dentro de cartões.
- **Don't** criar superfícies com fundo diferente de `canvas`.
- **Don't** escrever hex soltos nos componentes; adicione um token primeiro.
- **Don't** posicionar rodapés manualmente (`fixed bottom-…`) fora do `Dock`.
