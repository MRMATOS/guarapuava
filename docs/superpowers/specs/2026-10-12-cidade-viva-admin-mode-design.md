# Especificação Técnica: Modo Admin e Moderação do Cidade Viva

- **Data:** 12 de outubro de 2026
- **Status:** Proposto
- **Escopo:** Implementação da camada de autenticação com sessão em cookies (@supabase/ssr), painel administrativo dedicado em `/admin/cidade-viva` e moderação direta em campo no mapa interativo (`/cidade-viva/mapa`).

---

## 1. Visão Geral e Objetivos

O **Cidade Viva** recebe relatos comunitários sobre zeladoria urbana (asfalto, iluminação, vazamentos, semáforos, mato alto e dengue). Para manter a integridade, veracidade e resolução dessas ocorrências, é necessário equipar a plataforma com um subsistema de administração e moderação.

A referência direta do modo admin é a ferramenta homônima desenvolvida em `rodrigo-wtf`, que provê:
1. Painel de auditoria e moderação com filtros de status, cálculo de risco geoespacial e ações em lote ou individuais.
2. Controles de moderador diretamente na gaveta de relatos do mapa interativo.
3. Autenticação restrita e segura com Google OAuth, garantindo que somente o e-mail configurado em `ADMIN_EMAIL` tenha acesso aos privilégios.

No **Guarapuava Digital**, a interface deve ser **100% harmonizada com a linguagem visual de alabastro e relevo táteis (painel de rádio dos anos 60)**, descartando o visual neo-brutalista do projeto anterior e utilizando componentes canônicos como `Key`, `surface-card`, tipografia com números tabulares e suporte a temas claro e escuro.

---

## 2. Arquitetura de Autenticação & Sessão (SSR)

### 2.1 Dependência
- Adição do pacote `@supabase/ssr` para gestão de cookies de sessão compatíveis com o Next.js App Router (Next 16 / React 19).

### 2.2 Clientes Supabase
1. **`src/lib/supabase/server.ts`**:
   - `createSupabaseServer()`: Cria cliente conectado a `cookies()` de `next/headers` (lendo `getAll()` e escrevendo `setAll()`), permitindo validação segura de identidade em Server Components e Server Actions.
   - `createSupabaseAdmin()`: Cria cliente com privilégios elevados via `SUPABASE_SERVICE_ROLE_KEY` para leitura de relatos resolvidos, exclusão física e remoção de arquivos no bucket de Storage.
2. **`src/lib/supabase/client.ts`**:
   - `createBrowserClient`: Instância cliente utilizada para iniciar o fluxo OAuth no navegador.

### 2.3 Fluxo de Login e Callback OAuth
1. **`/admin/login`**:
   - Página minimalista e elegante em tela cheia com cartão neumórfico (`surface-card`).
   - Botão tátil `Key` ("Entrar com Google") que aciona `supabase.auth.signInWithOAuth` com redirecionamento para `${origin}/auth/callback`.
2. **`/auth/callback/route.ts`**:
   - Route Handler que recebe o parâmetro `code`.
   - Executa `exchangeCodeForSession(code)` no cliente de servidor (`createSupabaseServer()`).
   - **Regra de Autorização estrita**:
     - Verifica se `data.user?.email === process.env.ADMIN_EMAIL`.
     - Caso coincida: redireciona para `/admin/cidade-viva`.
     - Caso contrário: invoca imediatamente `supabase.auth.signOut()` e redireciona para `/admin/login?error=unauthorized`.
3. **`/auth/logout`**:
   - Ação de logout que encerra a sessão via `supabase.auth.signOut()` e redireciona para `/`.

---

## 3. Estrutura de Rotas e Layout Administrativo

### 3.1 Layout Guardião (`src/app/admin/layout.tsx`)
- Executado no servidor antes de renderizar qualquer sub-rota de `/admin/*`.
- Exceção para `/admin/login`.
- Valida se `user?.email === process.env.ADMIN_EMAIL`. Se ausente ou inválido, redireciona para `/admin/login`.
- Renderiza barra superior fixa e discreta com:
  - Marca "Guarapuava Digital" (link para `/`).
  - Navegação entre abas administrativas (`Cidade Viva`).
  - Botão de saída ("Sair").

### 3.2 Painel de Moderação (`src/app/admin/cidade-viva/page.tsx`)
- Server Component que carrega:
  - Todos os relatos de `cidade_viva_reports` (incluindo `status = 'resolvido'`), ordenados por data decrescente.
  - Todas as categorias urbanas ativas de `cidade_viva_categories`.
- Renderiza o componente cliente `AdminCidadeVivaView`.

---

## 4. Componente do Painel: `AdminCidadeVivaView`

### 4.1 Identidade Visual e Design System
- Fundo em alabastro (`bg-canvas`), textos de tinta (`text-ink`, `text-ink-body`).
- Cartões táteis `surface-card` com sombras macias neumórficas.
- Botões e seletores utilizando `Key` com suporte a estados em repouso (`raised-sm`) e afundado (`inset`).
- Suporte total aos modos claro e escuro.

### 4.2 Filtros e Contadores
1. **Filtro de Status**:
   - Opções: Todos, Sugestivos, Verificados in loco, Não Verificados, Resolvidos e Não Resolvidos.
   - Contadores numéricos em tempo real ao lado de cada opção.
2. **Filtro de Risco Geoespacial**:
   - Cálculo automático via `clusterReportsByCategory` (raio de 100m por categoria):
     - **Iniciais**: 1 a 2 relatos na mesma localidade.
     - **Baixa**: 3 a 5 relatos.
     - **Média**: 6 a 9 relatos.
     - **Alta**: 10 ou mais relatos.
3. **Filtro de Localidade**:
   - Seleção por bairro/cidade com contagem de ocorrências.

### 4.3 Lista de Ocorrências e Ações por Item
Para cada relato listado:
- **Metadados**: Data/hora formatada com `.tabular-time`, selo da categoria com cor temática, endereço e cidade.
- **Corpo**: Descrição relatada pelo cidadão.
- **Fotografia**: Miniatura clicável com modal de visualização ampliada (lightbox).
- **Auditoria de Origem**: IP com máscara LGPD (ex.: `187.23.***.***`).
- **Ações**:
  - **Abrir no Mapa**: Link direto para `/cidade-viva/mapa?id=[report.id]`.
  - **Opções (Modal)**:
    - *Alterar Status*: "Marcar como Verificado in loco", "Manter como Sugestivo", "Marcar como Resolvido".
    - *Excluir Ocorrência*: Confirmação de exclusão permanente com remoção da foto do bucket `cidade-viva-reports`.

---

## 5. Moderação Integrada no Mapa (`/cidade-viva/mapa`)

1. **Reconhecimento do Moderador**:
   - `src/app/cidade-viva/mapa/page.tsx` lê a sessão ativa via `createSupabaseServer()`.
   - Caso `user?.email === process.env.ADMIN_EMAIL`, passa `isAdmin={true}` ao `CidadeVivaContainer`.
2. **Gaveta de Detalhes (`ReportDrawer.tsx`)**:
   - Quando `isAdmin` é verdadeiro, exibe o botão **"Opções do Moderador"**.
   - Ao ser acionado, abre o modal que permite alterar o status (para verificado, resolvido ou sugestivo) ou excluir o relato.
   - A atualização reflete dinamicamente no estado local do mapa sem necessidade de recarregar a página.

---

## 6. Server Actions e Segurança de Dados

### 6.1 `src/app/cidade-viva/actions-admin.ts`
- Atualização da função `requireAdmin()` para utilizar `createSupabaseServer()` e validar cookies:
  ```ts
  async function requireAdmin() {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      throw new Error("Acesso não autorizado.");
    }
    return user;
  }
  ```
- **`updateReportStatusAction(reportId, newStatus)`**:
  - Atualiza status e `updated_at`.
  - Revalida caminhos: `/admin/cidade-viva`, `/cidade-viva` e `/cidade-viva/mapa`.
- **`deleteReportAction(reportId)`**:
  - Exclui o arquivo fotográfico associado no storage `cidade-viva-reports`.
  - Deleta o registro no banco de dados.
  - Revalida os mesmos caminhos.

---

## 7. Critérios de Teste e Validação

1. **Autenticação**:
   - Acesso não autenticado a `/admin/cidade-viva` redireciona para `/admin/login`.
   - Login com e-mail não autorizado é rejeitado e deslogado.
   - Login com e-mail autorizado (`ADMIN_EMAIL`) cria sessão com cookie e direciona a `/admin/cidade-viva`.
2. **Painel de Moderação**:
   - Listagem exibe corretamente relatos ativos e resolvidos.
   - Filtros de status, risco geoespacial e bairros filtram os cards com precisão.
   - Alteração de status e exclusão funcionam e atualizam o estado visual.
3. **Moderação no Mapa**:
   - Botão "Opções do Moderador" só aparece na gaveta quando o admin está logado.
   - Alterar status ou excluir pela gaveta atualiza os marcadores do mapa.
4. **Qualidade e Regressão**:
   - Compilação limpa sem erros de tipo (`npx tsc --noEmit`).
   - Lint sem erros nos arquivos criados.
   - Responsividade impecável em mobile e desktop com temas claro e escuro.
