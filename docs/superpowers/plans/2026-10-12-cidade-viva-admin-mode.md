# Cidade Viva Admin Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o Modo Admin e moderação completa para a ferramenta Cidade Viva, incluindo autenticação com cookies via `@supabase/ssr`, rotas protegidas em `/admin/*`, painel dedicado em `/admin/cidade-viva` no design system de alabastro e controles de moderador no mapa interativo (`/cidade-viva/mapa`).

**Architecture:** A camada de autenticação utiliza `@supabase/ssr` para sincronizar sessões com cookies HttpOnly no Next.js App Router (Next 16 / React 19). Rotas `/admin/*` são protegidas por um layout no servidor que verifica `user.email === process.env.ADMIN_EMAIL`. O painel `/admin/cidade-viva` carrega todos os relatos e oferece filtros dinâmicos de status, cálculo de risco geoespacial e ações de moderação (alterar status e excluir com remoção do Storage). No mapa público, a gaveta de relatos reconhece o moderador autenticado e exibe o botão "Opções do Moderador".

**Tech Stack:** Next.js 16 (App Router, Server Actions, Route Handlers), React 19, TypeScript, Tailwind CSS v4, `@supabase/ssr`, `@supabase/supabase-js`, Lucide React.

**Spec:** [docs/superpowers/specs/2026-10-12-cidade-viva-admin-mode-design.md](file:///Users/rodrigomatos/Documents/guarapuava/docs/superpowers/specs/2026-10-12-cidade-viva-admin-mode-design.md)

## Global Constraints
- **Design System Alabastro:** Todos os novos componentes de admin devem seguir a linguagem tátil do Guarapuava Digital (`surface-card`, botões `Key`, sombras neumórficas suaves, tokens semânticos, `tabular-time`). Rejeitar classes ou estética neobrutalista do repositório base.
- **Segurança e LGPD:** Acesso restrito a `ADMIN_EMAIL`. IPs exibidos aos moderadores devem ser truncados com máscara (ex: `187.23.***.***`). Ações administrativas protegidas contra chamadas não autorizadas.
- **Compatibilidade Next 16:** Utilizar `cookies()` de `next/headers` de forma assíncrona (`await cookies()`), em total conformidade com o Next.js 16.
- **Suporte a Temas:** Telas de login e painel administrativo devem oferecer contraste e legibilidade impecáveis nos modos claro e escuro.

## Review Focus
1. **Validação de e-mail não autorizado:** Se um usuário fizer login com conta Google cujo e-mail seja diferente de `ADMIN_EMAIL`, o sistema deve deslogá-lo imediatamente e redirecionar para `/admin/login?error=unauthorized`.
2. **Revalidação de cache cruzada:** Alterar o status ou excluir um relato em `/admin/cidade-viva` ou no mapa deve revalidar instantaneamente `/cidade-viva`, `/cidade-viva/mapa` e `/admin/cidade-viva`.
3. **Persistência de sessão em Server Actions:** As Server Actions devem ler os cookies da requisição e não falhar com "Acesso não autorizado" quando o admin estiver legitimamente logado.
4. **Remoção física no Storage:** A exclusão de relato deve expurgar a fotografia correspondente no bucket `cidade-viva-reports` sem quebras caso a URL seja nula ou inválida.
5. **Responsividade em telas pequenas:** O painel administrativo deve dispor os seletores de filtro e a lista de relatos com perfeita usabilidade em dispositivos móveis.

---

### Task 1: Instalação de `@supabase/ssr` e Utilitários de Servidor Supabase

**Files:**
- Modify: `package.json`
- Create: `src/lib/supabase/server.ts`
- Modify: `src/lib/supabase/client.ts`
- Test: `tests/supabase-server.test.ts`

**Interfaces:**
- Produz: `createSupabaseServer(): Promise<SupabaseClient>` e `createSupabaseAdmin(): SupabaseClient`.

- [ ] **Step 1: Instalar `@supabase/ssr`**
Run: `npm install @supabase/ssr`
Expected: Instalação concluída sem conflitos.

- [ ] **Step 2: Escrever teste unitário para os clientes em `tests/supabase-server.test.ts`**
Verifica se `createSupabaseServer` e `createSupabaseAdmin` exportam funções válidas e instanciam clientes com as variáveis de ambiente necessárias.

- [ ] **Step 3: Criar `src/lib/supabase/server.ts`**
Implementar `createSupabaseServer()` com `createServerClient` e `cookies()` assíncrono do `next/headers`, e `createSupabaseAdmin()` com `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 4: Atualizar `src/lib/supabase/client.ts`**
Garantir que o cliente do navegador suporte sessão e exponha `createBrowserClient` quando necessário.

- [ ] **Step 5: Executar teste e compilação de tipos**
Run: `npx tsx tests/supabase-server.test.ts && npx tsc --noEmit`
Expected: Teste passando e TypeScript sem erros.

- [ ] **Step 6: Commit**
```bash
git add package.json package-lock.json src/lib/supabase/ tests/supabase-server.test.ts
git commit -m "feat(supabase): setup @supabase/ssr and server client utilities"
```

---

### Task 2: Rotas de Autenticação e Layout Guardião Administrativo

**Files:**
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/app/auth/logout/route.ts`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/_components/LogoutButton.tsx`
- Test: `tests/admin-auth-guard.test.ts`

**Interfaces:**
- Consumes: `createSupabaseServer()` de `src/lib/supabase/server.ts`.
- Produz: Rotas `/admin/login`, `/auth/callback`, `/auth/logout` e casca de segurança `/admin/layout.tsx`.

- [ ] **Step 1: Escrever teste para o guardião e lógica de autorização em `tests/admin-auth-guard.test.ts`**
Testa a lógica de comparação de `ADMIN_EMAIL` e redirecionamento de usuários autorizados vs. não autorizados.

- [ ] **Step 2: Implementar página de login em `src/app/admin/login/page.tsx`**
Página com cartão neumórfico `surface-card`, título limpo "Admin", botão tátil `Key` para "Entrar com Google" acionando `signInWithOAuth`, e tratamento de mensagens de erro (`?error=unauthorized`).

- [ ] **Step 3: Implementar `src/app/auth/callback/route.ts`**
Route Handler que troca o `code` OAuth pela sessão, verifica `user.email === process.env.ADMIN_EMAIL`, realiza `signOut()` se for e-mail indevido e redireciona para `/admin/cidade-viva` quando autorizado.

- [ ] **Step 4: Implementar `src/app/auth/logout/route.ts` e `LogoutButton.tsx`**
Permite ao administrador encerrar a sessão limpando os cookies e retornando à tela inicial.

- [ ] **Step 5: Implementar `src/app/admin/layout.tsx`**
Server Component layout que verifica `user.email === process.env.ADMIN_EMAIL`. Se não autenticado, redireciona para `/admin/login`. Se autenticado, renderiza cabeçalho administrativo sóbrio e `children`.

- [ ] **Step 6: Executar verificação de tipos e testes**
Run: `npx tsx tests/admin-auth-guard.test.ts && npx tsc --noEmit`
Expected: Todos os testes passando.

- [ ] **Step 7: Commit**
```bash
git add src/app/admin/ src/app/auth/ tests/admin-auth-guard.test.ts
git commit -m "feat(admin): implement oauth login, auth callback and admin guard layout"
```

---

### Task 3: Proteção das Server Actions e Integração de Moderador no Mapa

**Files:**
- Modify: `src/app/cidade-viva/actions-admin.ts`
- Modify: `src/app/cidade-viva/mapa/page.tsx`
- Test: `tests/admin-actions-security.test.ts`

**Interfaces:**
- Consumes: `createSupabaseServer()` e `createSupabaseAdmin()` de `src/lib/supabase/server.ts`.
- Produz: `requireAdmin()`, `updateReportStatusAction`, `deleteReportAction` autenticados por cookie e flag `isAdmin` no mapa.

- [ ] **Step 1: Escrever teste de segurança para Server Actions em `tests/admin-actions-security.test.ts`**
Verifica que chamadas sem sessão ou com e-mail incorreto retornam erro de autorização.

- [ ] **Step 2: Atualizar `src/app/cidade-viva/actions-admin.ts`**
Substituir o cliente antigo por `createSupabaseServer()` em `requireAdmin()`. Garantir que `updateReportStatusAction` e `deleteReportAction` usem `createSupabaseAdmin()` e revalidem `/admin/cidade-viva`, `/cidade-viva` e `/cidade-viva/mapa`.

- [ ] **Step 3: Atualizar `src/app/cidade-viva/mapa/page.tsx`**
Utilizar `createSupabaseServer()` no Server Component para validar a sessão de admin e injetar `isAdmin={isAdmin}` no `CidadeVivaContainer`.

- [ ] **Step 4: Executar testes e checagem de tipos**
Run: `npx tsx tests/admin-actions-security.test.ts && npx tsc --noEmit`
Expected: PASS sem erros de tipo.

- [ ] **Step 5: Commit**
```bash
git add src/app/cidade-viva/actions-admin.ts src/app/cidade-viva/mapa/page.tsx tests/admin-actions-security.test.ts
git commit -m "feat(cidade-viva): secure server actions with ssr cookies and connect in-map moderator"
```

---

### Task 4: Painel Administrativo do Cidade Viva (`/admin/cidade-viva`)

**Files:**
- Create: `src/app/admin/cidade-viva/page.tsx`
- Create: `src/app/admin/cidade-viva/_components/AdminCidadeVivaView.tsx`
- Create: `src/app/admin/cidade-viva/_components/ReportItemActions.tsx`
- Create: `src/app/admin/cidade-viva/_components/PhotoLightboxModal.tsx`
- Test: `tests/admin-cidade-viva-clustering.test.ts`

**Interfaces:**
- Consumes: `clusterReportsByCategory` de `src/app/cidade-viva/_lib/clustering.ts`, `updateReportStatusAction` e `deleteReportAction`.
- Produz: Interface administrativa completa em `/admin/cidade-viva`.

- [ ] **Step 1: Escrever teste do cálculo de risco geoespacial em `tests/admin-cidade-viva-clustering.test.ts`**
Testa a lógica de classificação de risco (Iniciais, Baixa, Média, Alta) com clusters de 100m.

- [ ] **Step 2: Criar `ReportItemActions.tsx` e `PhotoLightboxModal.tsx`**
Componentes com visual do design system do Guarapuava Digital para disparar alterações de status, exclusão com confirmação e visualização ampliada de fotos.

- [ ] **Step 3: Criar `AdminCidadeVivaView.tsx`**
Implementar o painel completo: filtros de status com contadores, filtro de risco, filtro de bairros/cidades, lista de cards `surface-card`, máscara de IP e integração de ações em tempo real.

- [ ] **Step 4: Criar `src/app/admin/cidade-viva/page.tsx`**
Server Component que busca todos os relatos e categorias via `createSupabaseAdmin()` e renderiza `AdminCidadeVivaView`.

- [ ] **Step 5: Executar testes e compilação**
Run: `npx tsx tests/admin-cidade-viva-clustering.test.ts && npx tsc --noEmit`
Expected: PASS sem erros.

- [ ] **Step 6: Commit**
```bash
git add src/app/admin/cidade-viva/ tests/admin-cidade-viva-clustering.test.ts
git commit -m "feat(admin): build cidade viva management dashboard with alabaster design system"
```

---

### Task 5: Validação End-to-End, Responsividade e Testes de Regressão

**Files:**
- Modify: `src/app/cidade-viva/page.tsx` (atalho discreto para admin quando logado, se aplicável)
- Test: `tests/input-font-size.test.ts`

**Interfaces:**
- Produz: Validação completa da suíte de moderação e garantia de não-regressão.

- [ ] **Step 1: Testar fluxo completo de rotas e redirecionamento HTTP**
Testar requisições em `/admin/login`, `/admin/cidade-viva` (sem autenticação deve redirecionar) e `/cidade-viva/mapa`.

- [ ] **Step 2: Executar testes de proteção de fontes iOS**
Run: `npx tsx tests/input-font-size.test.ts`
Expected: Todos os inputs com font-size >= 16px.

- [ ] **Step 3: Executar ESLint e verificação de tipos**
Run: `npx tsc --noEmit && npx eslint src/app/admin src/app/cidade-viva`
Expected: 0 erros.

- [ ] **Step 4: Validar visualmente com Browser Subagent**
Capturar screenshots no modo claro e escuro, em resoluções mobile e desktop, confirmando a fidelidade estética e o comportamento dos modais e filtros.

- [ ] **Step 5: Commit final**
```bash
git add src/app/ tests/
git commit -m "feat(admin): complete cidade viva admin mode implementation and validations"
```
