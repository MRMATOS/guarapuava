# Especificação Técnica: Redesign do Modo Desktop Multi-Colunas ("Painel de Rádio")

- **Data:** 10 de outubro de 2026
- **Status:** Aprovado
- **Escopo:** Interface Desktop ($\ge 1024\text{px}$) do aplicativo Guarapuava Hoje

---

## 1. Visão Geral e Objetivos

Atualmente, o aplicativo apresenta uma interface em coluna única com o rodapé fixo (`Dock`) tanto no ambiente móvel quanto em telas desktop.
O objetivo desta especificação é aproveitar a amplitude espacial das telas desktop ($\ge 1024\text{px}$) com uma arquitetura tátil de até 3 colunas, preservando rigorosamente a identidade visual neumórfica do *Painel de Rádio*:

1. **Cabeçalho Superior Unificado (Header):** Substitui o rodapé `Dock` no desktop.
   - Sobre a coluna central: 2 teclas táteis principais (**Notícias** e **Vagas**).
   - Sobre a coluna lateral direita: 3 teclas táteis secundárias (**Teste**, **Informações** e **Modo claro / escuro**).
2. **Coluna Central:** Exibe o feed principal ativo (Notícias ou Vagas) ou o detalhe selecionado (resumo diário ou detalhe da vaga).
3. **Coluna Esquerda com Perspectiva 3D ("Slot Estacionado"):**
   - Ao abrir um item no feed, o feed principal desliza fluidamente para a esquerda e adota uma inclinação tridimensional para trás (`perspective: 1200px`, `rotateY(-8deg)` com origem à direita), exatamente como um painel físico rebatido.
   - Clicar em qualquer ponto desse painel da esquerda fecha o detalhe e o traz de volta ao centro.
4. **Coluna Direita Reativa (Filtros e Informações):**
   - No estado padrão, exibe os filtros correspondentes à coluna central (tags de categorias + busca para notícias; critérios contratuais + busca para vagas).
   - Ao clicar na tecla **Informações**, o painel de filtros é substituído pelo conteúdo de Informações (termos, privacidade e editorial). Clicar no centro ou na esquerda fecha as Informações e restaura os filtros.
5. **Isolamento Mobile:** Dispositivos móveis e tablets ($< 1024\text{px}$) continuam utilizando a casca de coluna única com o `Dock` inferior de 4 botões sem nenhuma alteração.

---

## 2. Arquitetura de Componentes

### 2.1 Novo Componente: `DesktopStage.tsx`
Localização: `src/components/desktop/DesktopStage.tsx`

Responsabilidades:
- Renderizar exclusivamente em viewports desktop (`min-width: 1024px`).
- Controlar a grade e animação das colunas:
  - `Slot Left`: Visível apenas quando há um item de detalhe aberto. Renderiza o feed anterior com a classe CSS de perspectiva 3D (`transform: perspective(1200px) rotateY(-8deg) scale(0.96)`).
  - `Slot Center`: Contém o cabeçalho de 2 abas (Notícias / Vagas) e o conteúdo principal (Feed da aba ativa ou Detalhe do item aberto).
  - `Slot Right`: Contém as 3 teclas de opções no topo e o corpo dinâmico (Filtros da tela ativa ou visualização de Informações).
- Interceptar cliques no `Slot Left` para restaurar o feed ao centro.
- Interceptar cliques no `Slot Center` e `Slot Left` quando Informações estiver aberta para restaurar os Filtros.

### 2.2 Integração em `src/app/page.tsx`
- Em `page.tsx`, o layout adapta-se de acordo com o breakpoint:
  - Em `< 1024px`, renderiza a composição mobile com `HomeFeed`, `DetailedFeed`, `JobsFeed`, `JobDetail`, `InfoFeed` e seus respectivos `MainNav` / `Dock`.
  - Em `\ge 1024px`, renderiza o `DesktopStage`, repassando os mesmos estados e callbacks de dados e filtros (`digests`, `jobs`, estados de busca, filtros de vaga e categoria).
- O histórico do navegador (`hash` para notícias `#noticia-...` e vagas `#vaga-...`) continua sincronizado de forma transparente.

---

## 3. Estados e Regras de Transição

| Estado da Aplicação | Coluna Esquerda | Coluna Central | Coluna Direita |
| :--- | :--- | :--- | :--- |
| **Notícias (Início)** | Vazia / Oculta | Header (Notícias ativo) + Feed Notícias | Topo (3 teclas) + Filtros de Notícias |
| **Vagas (Início)** | Vazia / Oculta | Header (Vagas ativo) + Feed Vagas | Topo (3 teclas) + Filtros de Vagas |
| **Detalhe de Notícia** | Feed Notícias rebatido em 3D | Header (Notícias ativo) + Resumo do Dia | Topo (3 teclas) + Filtros de Notícias do Dia |
| **Detalhe de Vaga** | Feed Vagas rebatido em 3D | Header (Vagas ativo) + Detalhe da Vaga | Topo (3 teclas) + Filtros de Vagas |
| **Informações Aberta** | Permanece no estado atual (oculta ou rebatida) | Permanece no estado atual (feed ou detalhe) | Topo (3 teclas com "Info" afundada) + Painel de Informações |

### Transições de Retorno:
1. **Clique no Slot Esquerdo:**
   - Fecha o detalhe ativo na coluna central.
   - Anima o feed da esquerda de volta ao centro (`rotateY(0deg) scale(1) translateX(0)`).
   - Atualiza a URL removendo o hash de detalhe.
2. **Clique na tecla Voltar ou Tecla `Escape`:**
   - Se Informações estiver aberta: fecha Informações e restaura os filtros na coluna direita.
   - Se um detalhe estiver aberto: devolve o feed da esquerda ao centro.
3. **Clique na Coluna Central ou Esquerda com Informações Aberta:**
   - Fecha a visualização de Informações e restaura o bloco de filtros na coluna direita.

---

## 4. Design Físico e Tokens (Neumorfismo / "O Painel de Rádio")

- **Cores:** Todas as superfícies utilizam `var(--color-canvas)` tanto em modo claro (`#eff0f3`) quanto em modo escuro (`#16181b`).
- **Sombras:**
  - Cartões centrais e lateral: `shadow-raised-lg` e `shadow-raised-md`.
  - Teclas de cabeçalho: `shadow-raised-sm` quando em repouso, `shadow-inset` quando ativas/pressionadas.
- **Perspectiva 3D do Slot Esquerdo:**
  - `perspective: 1200px`
  - `transform-origin: right center`
  - `transform: rotateY(-8deg) scale(0.96) translateZ(-16px)`
  - `transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease`
  - Opacidade de repouso: `0.85`, com realce ao passar o mouse (`hover:opacity-100 hover:rotateY(-4deg)`).
  - Cursor: `cursor-pointer`.

---

## 5. Estratégia de Testes e Validação

1. **Navegação e Alternância de Abas:**
   - Clicar em "Notícias" e "Vagas" no cabeçalho central alterna os feeds e os respectivos filtros da coluna direita sem criar coluna esquerda.
2. **Abertura e Fechamento de Detalhes:**
   - Clicar em um dia de notícias move o feed para a esquerda com inclinação 3D e renderiza o detalhe no centro.
   - Clicar na coluna esquerda traz o feed de volta ao centro.
   - Repetir o mesmo teste para vagas de emprego.
3. **Comportamento de Informações:**
   - Clicar em "Informações" no topo direito substitui o painel de filtros pelo conteúdo de informações.
   - Clicar na coluna central fecha as informações e restaura os filtros.
4. **Preservação do Modo Mobile:**
   - Reduzir a viewport para largura inferior a 1024px garante a ativação instantânea do layout de coluna única e do rodapé `Dock`.
