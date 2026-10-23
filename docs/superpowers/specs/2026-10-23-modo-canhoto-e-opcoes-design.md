# Especificação de Design: Modo Canhoto/Destro, Central de Opções e Reestruturação Desktop

**Data:** 23 de Outubro de 2026  
**Status:** Em Revisão  
**Objetivo:** Introduzir a funcionalidade de acessibilidade para alternar entre os modos Destro e Canhoto, criar a tela dedicada de Opções (ajustes e acessibilidade), reestruturar o fluxo da tela de Informações e modernizar o Dock e a exibição das seções no Desktop.

---

## 1. Visão Geral e Motivação

Atualmente, a interface móvel do portal foi concebida primariamente para o alcance do polegar direito (modo destro). Para usuários canhotos, alcançar botões críticos de navegação (como "Mais", "Filtrar" ou "Voltar") e controles flutuantes no mapa exige esforço desnecessário.

Além disso, as configurações do portal (troca de tema, termos, créditos) estavam dispersas ou embutidas de forma limitada no menu "Mais".

Esta especificação define:
1. **Preferência Global Destro / Canhoto (`HandednessContext`)**: Inversão ergonômica da ordem dos botões em todas as barras de navegação (docks), filtros de vagas e controles de mapa.
2. **Página de Opções (`/opcoes`)**: Espaço centralizado de ajustes e acessibilidade, acessado pelo botão "Mais" (substituindo o antigo atalho de Informações), com cards táteis e clicáveis no padrão de Utilidades (sem botões aninhados).
3. **Página de Informações sob nova hierarquia (`/opcoes/informacoes`)**: Acessada a partir do card "Informações" em Opções, dotada de dock com botão "Voltar" que retorna à página de Opções.
4. **Reestruturação no Desktop**:
   - O dock de controle lateral direito passa a ter 2 linhas de 2 botões:
     - Linha 1: `[Notícias]` `[Vagas]`
     - Linha 2: `[Utilidades]` `[Opções]`
   - A tela de **Opções** abre na coluna lateral direita (abaixo do dock).
   - A tela de **Informações** abre na **coluna central** (área principal de leitura), mantendo a coluna lateral direita livre para o usuário alternar abas, filtros ou opções.

---

## 2. Arquitetura de Estado: `HandednessContext`

### 2.1. Definição do Tipo e Armazenamento
- **Chave de armazenamento**: `localStorage.getItem("guarapuava:handedness")`
- **Valores possíveis**: `'right'` (Destro - padrão) | `'left'` (Canhoto)
- **Interface**:
  ```ts
  export type Handedness = 'right' | 'left';

  export interface HandednessContextType {
    handedness: Handedness;
    isLeftHanded: boolean;
    toggleHandedness: () => void;
    setHandedness: (mode: Handedness) => void;
  }
  ```
- **Inicialização segura**: Uso de `useSyncExternalStore` ou leitura em `useEffect` para evitar qualquer discrepância de hidratação SSR no Next.js.
- **Provider**: Inserido no `layout.tsx` envolvendo a aplicação, ao lado do `ThemeProvider`.

---

## 3. Comportamento do Modo Canhoto em Cada Componente

### 3.1. Docks e Barras de Navegação Inferiores (Mobile)
A inversão de ordem dos 4 botões ocorre em todas as telas:

| Tela | Ordem no Modo Destro | Ordem no Modo Canhoto |
| :--- | :--- | :--- |
| **HomeFeed / VagasFeed** | `[Mais]` `[Filtrar]` `[Notícias]` `[Vagas]` | `[Vagas]` `[Notícias]` `[Filtrar]` `[Mais]` |
| **Página de Opções** | `[Mais]` `[Filtrar]` `[Notícias]` `[Vagas]` | `[Vagas]` `[Notícias]` `[Filtrar]` `[Mais]` |
| **Página de Informações** | `[Mais]` `[Notícias]` `[Vagas]` `[Voltar]` | `[Voltar]` `[Vagas]` `[Notícias]` `[Mais]` |
| **Detalhes da Notícia** | `[Mais]` `[Filtrar]` `[Vagas]` `[Voltar]` | `[Voltar]` `[Vagas]` `[Filtrar]` `[Mais]` |
| **Detalhes da Vaga** | `[Mais]` `[Filtrar]` `[Notícias]` `[Voltar]` | `[Voltar]` `[Notícias]` `[Filtrar]` `[Mais]` |
| **Utilidades (Raiz)** | `[Mais]` `[Filtrar (desativado)]` `[Notícias]` `[Vagas]` | `[Vagas]` `[Notícias]` `[Filtrar (desativado)]` `[Mais]` |

> **Nota técnica de implementação:**  
> A inversão é realizada de forma robusta e declarativa aplicando `[direction:rtl] [&>*]:[direction:ltr]` no container do grid quando `isLeftHanded === true`, garantindo que o primeiro botão do JSX vá para a extrema direita (alcance do polegar esquerdo no lado esquerdo) e o texto interno de cada botão permaneça na leitura padrão da esquerda para a direita.

### 3.2. Painel Popup "Mais" (`OptionsPanel`)
- Reduzido de 3 para **2 botões**:
  - Modo Destro: `[Opções]` `[Utilidades]`
  - Modo Canhoto: `[Utilidades]` `[Opções]`
- O botão de tema claro/escuro é removido daqui, pois passa a ter seu card dedicado na página de Opções.

### 3.3. Painel de Filtros de Vagas
- **Linha 1 (Contratos e Requisitos)**:
  - Destro: `[Contrato]` `[PCD]` `[Experiência]`
  - Canhoto: `[Experiência]` `[PCD]` `[Contrato]`
- **Linha 2 (Busca e Favoritas)**:
  - Destro: `[Pesquisar... (2 cols)]` `[Favoritas (1 col)]`
  - Canhoto: `[Favoritas (1 col)]` `[Pesquisar... (2 cols)]`

### 3.4. Painel de Filtros de Notícias
- **Sem alteração**: Mantém rigorosamente os 12 botões canônicos fixos em ordem alfabética (`Clima` a `Outros`), conforme especificado pelo usuário.

### 3.5. Mapa do Cidade Viva (`MapClient`)
- A pilha de botões flutuantes ("Voltar", "FilterBar", "Minha localização", "Relatar Problema") muda de posicionamento:
  - Destro: `bottom-4 right-4 sm:bottom-6 sm:right-6 items-end`
  - Canhoto: `bottom-4 left-4 sm:bottom-6 sm:left-6 items-start`

---

## 4. Estrutura da Página de Opções (`/opcoes`)

### 4.1. Cabeçalho
- Esquerda: **`Opções`** (título `text-[17px] font-bold text-ink`)
- Direita: **`Ajustes e acessibilidade`** (metadado `text-[13px] text-ink-muted`)

### 4.2. Lista de Cards Clicáveis (Sem Botões Internos)
Seguindo a diretriz visual do `DESIGN.md` e o modelo de `/utilidades`:

1. **Card 1: Modo Destro / Canhoto**
   - **Título**: Dinâmico indicando a ação de destino.
     - Se o usuário estiver no modo Destro: exibe **"Modo Canhoto"**
     - Se o usuário estiver no modo Canhoto: exibe **"Modo Destro"**
   - **Descrição**: *"Alterne entre os modos destro e canhoto para que os botões fiquem ao alcance do seu conforto"*
   - **Ação**: Alterna o modo e inverte instantaneamente a disposição dos botões.

2. **Card 2: Modo Claro / Modo Escuro**
   - **Título**: Dinâmico indicando o destino.
     - Se estiver no modo claro: exibe **"Modo Escuro"**
     - Se estiver no modo escuro: exibe **"Modo Claro"**
   - **Descrição**: *"Alterne as cores do portal para descanso visual e economia de bateria"*
   - **Ação**: Alterna o tema da aplicação via `ThemeContext`.

3. **Card 3: Informações**
   - **Título**: **"Informações"**
   - **Descrição**: *"Diretrizes editoriais, fontes públicas, transparência e termos de responsabilidade"*
   - **Ação**: Navega para a página de informações (`/opcoes/informacoes` ou view `"info"`).

### 4.3. Dock da Página de Opções
- `[Mais]` `[Filtrar]` `[Notícias]` `[Vagas]` (com `Filtrar` desativado nesta tela).

---

## 5. Estrutura da Página de Informações (`/opcoes/informacoes`)

- Conteúdo: Mantém os blocos consolidados do `InfoFeed` (propósito, utilidades públicas, compromisso editorial e termos).
- **Dock**:
  - Destro: `[Mais]` `[Notícias]` `[Vagas]` `[Voltar]`
  - Canhoto: `[Voltar]` `[Vagas]` `[Notícias]` `[Mais]`
- **Comportamento do botão "Voltar"**:
  - Retorna diretamente para a página de **Opções** (`/opcoes`).
- **Compatibilidade de URLs**:
  - Redirecionamento transparente de links antigos (`#informacoes` ou `/informacoes`) para `/opcoes/informacoes`.

---

## 6. Arquitetura no Modo Desktop (`DesktopStage`)

### 6.1. Dock Lateral Direito
Reestruturado em duas linhas de 2 colunas:
```
+-------------------+-------------------+
|     Notícias      |       Vagas       |
+-------------------+-------------------+
|    Utilidades     |      Opções       |
+-------------------+-------------------+
```

### 6.2. Distribuição das Áreas na Tela
- **Quando Opções estiver ativa**:
  - O painel com os cards de Opções abre na **coluna lateral direita** (abaixo do dock).
  - O feed principal (Notícias ou Vagas) permanece visível no centro.
- **Quando Informações estiver ativa**:
  - O conteúdo de Informações abre na **coluna central** (`slotCenter`), substituindo temporariamente o feed para proporcionar uma leitura confortável e com largura ideal.
  - A **coluna lateral direita permanece livre e funcional**, exibindo o dock (Notícias, Vagas, Utilidades, Opções) e os filtros correspondentes.

---

## 7. Estratégia de Testes e Validação

1. **Testes Unitários**:
   - `tests/handedness.test.ts`: Verificar inversão correta da lista de botões em cada modo, persistência de chave no storage e alternância de títulos nos cards.
2. **Validação de Responsividade e Acessibilidade**:
   - Verificar no mobile (360px a 430px) se os botões invertem perfeitamente sem quebras de layout.
   - Verificar navegação de volta: Informações -> Opções -> Tela anterior.
   - Verificar no desktop se Informações abre no centro e Opções abre na direita.
