# Especificação Técnica: Hub de Utilidades e Horários de Ônibus ("Painel de Rádio")

- **Data:** 11 de outubro de 2026
- **Status:** Em Revisão
- **Escopo:** Menu "Mais" (Mobile e Desktop), Rota `/utilidades`, Rota `/utilidades/onibus`, re-extração canônica de `horarios-onibus.json`

---

## 1. Visão Geral e Objetivos

Esta especificação define a implementação do novo ecossistema de **Utilidades** e da ferramenta completa de **Horários de Ônibus** de Guarapuava, além da reorganização do menu de opções ("Mais") do aplicativo, preservando integralmente os preceitos de design estipulados em `DESIGN.md` (o painel físico de alabastro tátil inspirado no design Braun).

### Objetivos Principais:
1. **Reestruturação do Menu "Mais" em Duas Linhas:**
   - Tanto no painel móvel (`OptionsPanel.tsx`) quanto no cabeçalho da barra lateral do desktop (`DesktopStage.tsx`), a barra de opções passa a conter duas linhas físicas táteis:
     - **Linha Superior (2 botões):** 1º `Informações`, 2º `Modo claro / escuro`.
     - **Linha Inferior (3 botões):** 1º `Cidade Viva`, 2º `Utilidades`, 3º `Estatísticas` (desabilitado temporariamente).
2. **Criação do Hub de Utilidades (`/utilidades`):**
   - Rota dedicada apresentando cartões táteis em alto-relevo de alabastro.
   - Inicialmente com 1 cartão ativo: **Horários de Ônibus** (navega para `/utilidades/onibus`).
   - Rodapé `Dock` padronizado com botão `Voltar` (retorna para `/`) e botão `Mais`.
3. **Re-extração Canônica e Estruturação de Dados (`horarios-onibus.json`):**
   - Atualização do extrator Swift (`scripts/extrair-horarios-onibus.swift`) para considerar a rotação visual de 90° dos PDFs e a grade bidimensional original das tabelas da Pérola do Oeste.
   - Vinculação de 100% de exatidão entre cada **Ponto de Ônibus** (ex: *Saída Fonte, Gelinski, Colégio Tupy, Campo do Batel, Viaduto Av. Cascavel...*) e os horários em que o ônibus passa naquele ponto em **Dias Úteis**, **Sábados** e **Domingos/Feriados**.
4. **Página de Horários de Ônibus (`/utilidades/onibus`):**
   - Listagem contínua de todos os bairros/linhas e pontos, permitindo exploração gradual por scroll.
   - Cada ponto exibe seus horários organizados em linhas contínuas (úteis, sábados e domingos juntos).
   - **Painel de Filtros Hierárquico no Dock:**
     - 3 linhas com rolagem vertical suave com os botões de **Bairros** em ordem alfabética.
     - 4ª linha com campo tátil de **Busca Textual**.
     - Ao tocar em um Bairro, as 3 linhas atualizam dinamicamente para os **Pontos de Ônibus** daquele bairro com botão `← Voltar aos Bairros`.
     - Ao selecionar um ponto, a tela rola suavemente até ele com destaque tátil.

---

## 2. Reestruturação do Menu "Mais"

### 2.1 Mobile (`src/components/ui/OptionsPanel.tsx`)
O painel que sobe a partir da tecla "Mais" do `Dock` passa a ter um layout em grade de duas linhas com classes de animação escalonada (`animate-stagger-item`):

```tsx
<div className="flex flex-col gap-2 select-none">
  {/* Linha Superior (2 colunas) */}
  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
    <Key onClick={onSelectInfo}>Informações</Key>
    <Key onClick={toggleTheme}>{themeLabel}</Key>
  </div>

  {/* Linha Inferior (3 colunas) */}
  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
    <Key onClick={() => router.push("/cidade-viva")}>Cidade Viva</Key>
    <Key onClick={() => router.push("/utilidades")}>Utilidades</Key>
    <Key disabled aria-disabled="true" className="opacity-40 cursor-not-allowed">Estatísticas</Key>
  </div>
</div>
```

### 2.2 Desktop (`src/components/desktop/DesktopStage.tsx`)
A barra lateral de preferências na coluna direita do desktop adota essa mesma composição de duas linhas no topo da barra lateral, mantendo paridade funcional e visual entre resoluções.

---

## 3. Modelo e Pipeline de Dados dos Ônibus

### 3.1 Correção da Extração (`scripts/extrair-horarios-onibus.swift`)
- O leitor PDF identifica `page.rotation == 90` e converte as coordenadas dos caracteres e palavras para coordenadas visuais ($V_x = b.y$, $V_y = \text{width} - b.x$).
- No topo da tabela visual, o extrator detecta a linha `PONTOS` e identifica as colunas de cada ponto de parada com seus nomes exatos (*Saída Fonte, Gelinski, Colégio Tupy, Campo do Batel, Viaduto Av. Cascavel, Igreja Verbo Divino, Loteamento Santa Regina, Igreja Santa Terezinha, Chegada Fonte*).
- Abaixo de cada cabeçalho de coluna, o extrator mapeia todos os horários correspondentes para as seções de **Dias Úteis**, **Sábados** e **Domingos/Feriados**.

### 3.2 Tipagem TypeScript (`src/types/bus.ts`)
```typescript
export interface PontoItinerario {
  id: string;             // ex: "campo-do-batel"
  nome: string;           // ex: "Campo do Batel"
  ordem: number;          // 4
  horariosUteis: string[]; // ["06:52", "07:22", "07:52", "08:22", ...]
  horariosSabado: string[];// ["07:52", "08:52", "09:52", ...]
  horariosDomingo: string[]; // [...]
}

export interface LinhaBairro {
  id: string;             // ex: "linha-02"
  codigo: string;         // ex: "02"
  bairro: string;         // ex: "Cascavel"
  nomeExibicao: string;   // ex: "Linha 02 - Cascavel"
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

---

## 4. Arquitetura de Componentes e Telas

### 4.1 Hub de Utilidades (`src/app/utilidades/page.tsx`)
- Renderiza dentro do layout padrão de página (`.page-shell` e container centralizado).
- **Cabeçalho:**
  - Título gravado: "Utilidades"
  - Subtítulo: "Serviços e ferramentas essenciais para o cotidiano de Guarapuava."
- **Grade de Cartões:**
  - Um único cartão ativo: **Horários de Ônibus**.
  - Superfície `card` de 32px de raio em alto-relevo de alabastro com padding de 24px.
  - Título com tipografia semiserifa sólida e selo em baixo-relevo `45 linhas • Pérola do Oeste`.
  - Ao interagir, direciona para `/utilidades/onibus`.
- **Dock:** Botão `Voltar` (para `/`) e botão `Mais` (com `OptionsPanel`).

### 4.2 Página de Horários de Ônibus (`src/app/utilidades/onibus/page.tsx`)
- Gerencia os estados de:
  - `bairroSelecionado`: `string | null`
  - `pontoSelecionado`: `string | null`
  - `buscaTexto`: `string`
  - `isFilterOpen`: `boolean`
  - `isOptionsOpen`: `boolean`
- **Componente de Exibição (`src/components/bus/BusScheduleFeed.tsx`):**
  - Lista todos os bairros/linhas em ordem sequencial.
  - Cada bairro exibe seus pontos com os respectivos horários em linhas organizadas.
  - Suporta scroll nativo suave e âncoras para quando o usuário clicar em um ponto no filtro.
- **Componente de Filtro (`src/components/bus/BusFilterPanel.tsx`):**
  - Montado acima do Dock quando `isFilterOpen` estiver ativo.
  - **Estrutura de 3 Linhas com Scroll:**
    - Se nenhum bairro selecionado: grade em 3 linhas com scroll vertical dos botões táteis de **Bairros** em ordem alfabética.
    - Se um bairro estiver selecionado: exibe a tecla `← Bairros` no topo e os botões dos **Pontos de Ônibus** daquele itinerário específico.
  - **4ª Linha (Busca):**
    - Campo de input tátil com debounce instantâneo para filtrar bairros ou pontos por texto.
- **Dock da Página de Ônibus:**
  - `[Voltar]` (leva de volta a `/utilidades`)
  - `[Filtrar]` (abre/fecha o painel de filtros)
  - `[Mais]` (abre o menu de opções)

---

## 5. Regras de Design e Fidelidade

1. **Superfície Única de Alabastro:** Todos os novos cartões e botões utilizam a cor de fundo canônica do token (`--canvas` / `#eff0f3` em claro, token escuro correspondente) e sombras duplas em alto-relevo.
2. **Interatividade Tátil:** Teclas afundam no clique através do componente `Key` (`key-pressed`).
3. **Sem Adornos Ruidosos:** Não são usados ícones decorativos ao lado dos títulos nem cores saturadas. O coral só é utilizado como indicador sutil ou foco.
4. **Respiro do Dock:** `.page-shell` garante que nenhum conteúdo seja encoberto pelo Dock fixo no rodapé.

---

## 6. Verificação e Critérios de Aceite

1. **Integridade de Compilação:** `npx tsc --noEmit` executa com zero erros de tipo.
2. **Re-extração Precisa:** O script extrai os dados com nomes reais de pontos (ex.: *Campo do Batel*, *Gelinski*) correlacionados aos horários exatos de cada coluna.
3. **Navegação do Menu "Mais":**
   - Linha superior possui 1º Informações, 2º Alternador de Tema.
   - Linha inferior possui 1º Cidade Viva, 2º Utilidades, 3º Estatísticas (desabilitado).
4. **Fluxo de Utilidades:** `/utilidades` exibe apenas o card ativo de Ônibus e o Dock com Voltar e Mais.
5. **Filtro de Ônibus:**
   - 3 linhas com scroll vertical para seleção de bairros em ordem alfabética.
   - 4ª linha com campo de busca.
   - Ao tocar num bairro, as 3 linhas mudam para os pontos de ônibus daquele bairro.
   - Ao tocar num ponto, a tela rola e destaca o ponto correspondente.
6. **Responsividade:** Funciona perfeitamente em mobile e no layout desktop.
