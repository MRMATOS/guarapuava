# Google Docs News Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an automated news ingestion and presentation pipeline that receives updates from a private Google Docs document via Google Apps Script (and DOCX export), parses daily digests with hourly delta feeds, persists them in Supabase (`news_digests`), and renders multiple day cards on the Home feed with full chronological timeline feeds on detail view.

**Architecture:** A lightweight pipeline mirroring the jobs implementation: Google Apps Script sends text via authenticated webhook to `/api/webhooks/news-docs-sync` (or CLI downloads DOCX), `news-parser.ts` extracts batches and daily consolidations, `src/lib/supabase/news.ts` executes atomic upsert on `news_digests`, and Next.js frontend renders multi-day scrollable home cards and reverse-chronological batch timelines.

**Tech Stack:** Next.js 16 (App Router), TypeScript 5, React 19, Supabase (@supabase/supabase-js), JSZip, Node.js assertions (`node:assert/strict`).

**Spec:** [`docs/superpowers/specs/2026-10-07-google-docs-news-sync-design.md`](file:///Users/rodrigomatos/Documents/guarapuava/docs/superpowers/specs/2026-10-07-google-docs-news-sync-design.md)

## Global Constraints

- Must match existing patterns established by jobs (`src/lib/docs/sync.ts`, `src/lib/supabase/jobs.ts`, `src/app/api/webhooks/docs-sync/route.ts`).
- No external packages beyond existing dependencies (`jszip`, `@supabase/supabase-js`, `zod`, `lucide-react`).
- RLS enabled on PostgreSQL table `news_digests`, allowing public anonymous read and authenticated/service-role upsert.
- Graceful UI fallback: If database is empty or unreachable, fallback to `initialDigest` without throwing errors or breaking SSR.
- Preserve document links, dates (`DD/MM/AAAA`), and times (`HH:MM`).

## Review Focus

1. **Mixed Legacy & New Document Formats:** Old document updates (before line 1270) lack `DELTA FEED` and `Card Principal do Dia`; the parser must ignore those gracefully and only ingest valid updates.
2. **Multiple Updates in the Same Day:** When updates at 11:45 and 12:20 happen on `07/10/2026`, the batches must be merged in reverse chronological order (newest time first), and the day's headline must reflect the latest update.
3. **Idempotent Webhook Deliveries:** Retrying or repeatedly sending the same document content must not duplicate batches or crash the database.
4. **Missing or Malformed News Categories:** Lines in delta feed with variations (e.g. missing brackets or different case) must not throw uncaught exceptions.
5. **Mobile View & Navigation Popstate:** Navigating from the day list to the day's detailed timeline must preserve browser history state (`#noticias` / `#noticia-DDMM`) and native back gesture.

---

### Task 1: Supabase Database Migration & TypeScript Schema

**Files:**
- Create: `supabase/migrations/20261007_create_news_digests_table.sql`
- Modify: `src/types/news.ts:1-22`
- Test: `tests/supabase-news-schema.test.ts`

**Interfaces:**
- Consumes: Nothing
- Produces: `DatabaseNewsDigestRow` in `src/types/news.ts` and table `public.news_digests` in Supabase.

- [ ] **Step 1: Write the failing type/schema test**

Create `tests/supabase-news-schema.test.ts`:
```typescript
import assert from 'node:assert/strict';
import { DatabaseNewsDigestRow, NewsItem, NewsBatch, DailyDigest } from '../src/types/news';

function testSchemaTypes() {
  const mockRow: DatabaseNewsDigestRow = {
    id: 'test-uuid-1',
    date: '07/10/2026',
    date_iso: '2026-10-07',
    last_updated_time: '12:20',
    headline: 'Manchete de Teste',
    highlights: [{ id: 'h1', category: 'Saúde', title: 'Saúde', text: 'Descrição' }],
    batches: [{ id: 'b1', date: '07/10/2026', time: '12:20', items: [] }],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  assert.equal(mockRow.date, '07/10/2026');
  assert.equal(mockRow.date_iso, '2026-10-07');
  console.log('✅ Task 1 schema types verified');
}

testSchemaTypes();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/supabase-news-schema.test.ts`
Expected: FAIL with `Module '"../src/types/news"' has no exported member 'DatabaseNewsDigestRow'`.

- [ ] **Step 3: Update `src/types/news.ts` and create SQL migration**

1. In `src/types/news.ts`: add `source?: string` to `NewsItem` and export `DatabaseNewsDigestRow`:
```typescript
export interface NewsItem {
  id: string;
  category: string;
  title: string;
  text: string;
  source?: string;
}

export interface NewsBatch {
  id: string;
  date: string;
  time: string;
  items: NewsItem[];
}

export interface DailyDigest {
  id?: string;
  date: string;
  dateIso?: string;
  lastUpdatedTime: string;
  headline: string;
  highlights: NewsItem[];
  batches: NewsBatch[];
  isActive?: boolean;
}

export interface DatabaseNewsDigestRow {
  id: string;
  date: string;
  date_iso: string;
  last_updated_time: string;
  headline: string;
  highlights: NewsItem[];
  batches: NewsBatch[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

2. In `supabase/migrations/20261007_create_news_digests_table.sql`: write table creation, indices, RLS, and policy as defined in spec.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx tests/supabase-news-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Apply migration to live Supabase database via Supabase client/query**

Run migration script or query via `supabaseAdmin` to ensure `news_digests` table is created in PostgreSQL.
Verify with: `npx tsx tests/supabase-news-schema.test.ts`

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261007_create_news_digests_table.sql src/types/news.ts tests/supabase-news-schema.test.ts
git commit -m "feat(news): add news_digests database migration and TypeScript interfaces"
```

---

### Task 2: Google Docs News Parser (`src/lib/docs/news-parser.ts`)

**Files:**
- Create: `src/lib/docs/news-parser.ts`
- Test: `tests/news-parser.test.ts`

**Interfaces:**
- Consumes: `DailyDigest`, `NewsBatch`, `NewsItem` from `src/types/news.ts`
- Produces:
  - `parseNewsDocText(content: string): DailyDigest[]`
  - `parseNewsDocxBuffer(buffer: ArrayBuffer | Buffer): Promise<DailyDigest[]>`
  - `parseNewsParagraphs(paragraphs: { text: string; links: string[] }[]): DailyDigest[]`

- [ ] **Step 1: Write the failing unit tests for parser**

Create `tests/news-parser.test.ts`:
```typescript
import assert from 'node:assert/strict';
import { parseNewsDocText } from '../src/lib/docs/news-parser';

const sampleNewsText = `
Atualização em 07/10/2026 às 12:20
Seção 1: Atos Oficiais
Texto aleatório de notícias antigas...
Seção 4: Bloco Delta Feed
DELTA FEED - [12:20]
(Alimentação de novidades do site - apenas fatos inéditos desta rodada)
[Saúde] Notícia nova: Unimed Guarapuava convoca assembleia para 22 de outubro. Fonte: Portal RSN
[Política] Notícia nova: Prefeitura publica Boletim Oficial 3510. Fonte: Prefeitura de Guarapuava
Card Principal do Dia
Manchete: Unimed Guarapuava convoca cooperados para criar Diretoria de Saúde.
Saúde e Gestão: Unimed propõe ampliação da Diretoria Executiva para 4 membros.
Atos Oficiais: Boletim Oficial nº 3510 detalha dispensas de servidores.
`;

function testParser() {
  const digests = parseNewsDocText(sampleNewsText);
  assert.equal(digests.length, 1, 'Deve extrair 1 dia consolidado');
  const d = digests[0];
  assert.equal(d.date, '07/10/2026');
  assert.equal(d.lastUpdatedTime, '12:20');
  assert.equal(d.headline, 'Unimed Guarapuava convoca cooperados para criar Diretoria de Saúde.');
  assert.equal(d.highlights.length, 2);
  assert.equal(d.batches.length, 1);
  assert.equal(d.batches[0].items.length, 2);
  assert.equal(d.batches[0].items[0].category, 'Saúde');
  assert.equal(d.batches[0].items[1].category, 'Política');
  console.log('✅ Task 2 parser unit test passed');
}

testParser();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/news-parser.test.ts`
Expected: FAIL with `Cannot find module '../src/lib/docs/news-parser'`.

- [ ] **Step 3: Implement `src/lib/docs/news-parser.ts`**

Implement:
- `parseNewsDocText(content: string)`: maps lines to `{ text, links }` paragraphs.
- `parseNewsDocxBuffer(buffer: ArrayBuffer | Buffer)`: extracts `{ text, links }` via `JSZip` mirroring `src/lib/docs/parser.ts`.
- `parseNewsParagraphs(paragraphs)`:
  - Iterates through paragraphs.
  - Recognizes `Atualização em (DD/MM/AAAA) às (HH:MM)`.
  - Captures `DELTA FEED - [HH:MM]` and parses lines with `[Categoria] Notícia nova: <texto> Fonte: <fonte>`.
  - Captures `Card Principal do Dia` with `Manchete: <texto>` and category highlights.
  - Groups by date, merges batches without duplicating identical times, sorts batches newest-to-oldest, and formats `dateIso`.

- [ ] **Step 4: Run unit test and full docx extraction test**

Run: `npx tsx tests/news-parser.test.ts`
Expected: PASS.

Add second test in `tests/news-parser.test.ts` testing extraction against real `Radar Guarapuava - Noticias, Atos e Eventos.docx` in the root:
```typescript
import fs from 'node:fs';
import { parseNewsDocxBuffer } from '../src/lib/docs/news-parser';

async function testRealDocx() {
  if (fs.existsSync('Radar Guarapuava - Noticias, Atos e Eventos.docx')) {
    const buf = fs.readFileSync('Radar Guarapuava - Noticias, Atos e Eventos.docx');
    const digests = await parseNewsDocxBuffer(buf);
    assert.ok(digests.length >= 1, 'Deve extrair ao menos 1 dia do documento real');
    console.log(`✅ Extraídos ${digests.length} dias do docx real. Dias:`, digests.map(d => d.date));
  }
}
testRealDocx();
```
Run: `npx tsx tests/news-parser.test.ts`
Expected: PASS with 07/10/2026 and 06/10/2026 extracted.

- [ ] **Step 5: Commit**

```bash
git add src/lib/docs/news-parser.ts tests/news-parser.test.ts
git commit -m "feat(docs): implement Google Docs news parser with delta feed and daily digest extraction"
```

---

### Task 3: Supabase News Repository Layer (`src/lib/supabase/news.ts`)

**Files:**
- Create: `src/lib/supabase/news.ts`
- Test: `tests/supabase-news.test.ts`

**Interfaces:**
- Consumes: `supabase`, `supabaseAdmin` from `src/lib/supabase/client`, `DailyDigest` from `src/types/news.ts`
- Produces:
  - `listActiveNewsDigests(limit?: number): Promise<DailyDigest[]>`
  - `getNewsDigestByDate(date: string): Promise<DailyDigest | null>`
  - `syncNewsDigests(digests: DailyDigest[]): Promise<{ upserted: number; total: number }>`

- [ ] **Step 1: Write the integration test**

Create `tests/supabase-news.test.ts`:
```typescript
import assert from 'node:assert/strict';
import { syncNewsDigests, listActiveNewsDigests, getNewsDigestByDate } from '../src/lib/supabase/news';
import { DailyDigest } from '../src/types/news';

const testDigest: DailyDigest = {
  date: '99/99/9999',
  dateIso: '9999-99-99',
  lastUpdatedTime: '23:59',
  headline: 'Manchete de Teste Integração Supabase',
  highlights: [{ id: 'h-test', category: 'Geral', title: 'Geral', text: 'Texto de teste' }],
  batches: [{
    id: 'batch-test',
    date: '99/99/9999',
    time: '23:59',
    items: [{ id: 'item-test', category: 'Geral', title: 'Item Teste', text: 'Descrição teste' }]
  }],
};

async function runRepoTests() {
  const syncResult = await syncNewsDigests([testDigest]);
  assert.equal(syncResult.upserted, 1);

  const found = await getNewsDigestByDate('99/99/9999');
  assert.ok(found);
  assert.equal(found?.headline, testDigest.headline);

  console.log('✅ Task 3 Supabase repository integration tests passed');
}

runRepoTests();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx --env-file=.env.local tsx tests/supabase-news.test.ts`
Expected: FAIL with `Cannot find module '../src/lib/supabase/news'`.

- [ ] **Step 3: Implement `src/lib/supabase/news.ts`**

Implement:
- `mapRowToDigest(row: DatabaseNewsDigestRow): DailyDigest`
- `listActiveNewsDigests(limit = 30)`: queries `news_digests`, filtered by `is_active = true`, ordered by `date_iso DESC`.
- `getNewsDigestByDate(date: string)`: queries single row by `date`.
- `syncNewsDigests(digests: DailyDigest[])`: maps to snake_case rows, deduplicates by `date`, performs `supabaseAdmin.from('news_digests').upsert(rows, { onConflict: 'date' })`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx --env-file=.env.local tsx tests/supabase-news.test.ts`
Expected: PASS.
(Also clean up the test row with `date = '99/99/9999'` at the end of the test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/news.ts tests/supabase-news.test.ts
git commit -m "feat(supabase): implement news digests repository with atomic upsert and querying"
```

---

### Task 4: Sync Pipeline Service and CLI Script (`src/lib/docs/news-sync.ts` & `scripts/run-news-docs-sync.ts`)

**Files:**
- Create: `src/lib/docs/news-sync.ts`
- Create: `scripts/run-news-docs-sync.ts`
- Modify: `package.json` (add script `"sync:news"`)
- Modify: `.env.local` (ensure `GOOGLE_DOCS_NEWS_ID=1OAa9XYR7ZT3WNuF3jtQsWC03ODXSocPBm83hGeinKkc`)

**Interfaces:**
- Consumes: `parseNewsDocxBuffer`, `parseNewsDocText` from `news-parser.ts`, `syncNewsDigests` from `news.ts`
- Produces:
  - `downloadAndSyncGoogleDocsNews(customDocId?: string): Promise<NewsSyncResult>`
  - `syncNewsFromLocalDocx(filePath: string): Promise<NewsSyncResult>`
  - `syncNewsFromText(content: string, documentId?: string): Promise<NewsSyncResult>`

- [ ] **Step 1: Implement `src/lib/docs/news-sync.ts`**

Follow the exact pattern of `src/lib/docs/sync.ts`:
- Define `DEFAULT_GOOGLE_DOCS_NEWS_ID = '1OAa9XYR7ZT3WNuF3jtQsWC03ODXSocPBm83hGeinKkc'`.
- Implement `downloadAndSyncGoogleDocsNews()`: fetches DOCX export URL from Google Docs, parses buffer, upserts in Supabase.
- Implement `syncNewsFromLocalDocx(filePath)`: reads local buffer (e.g. root file `Radar Guarapuava - Noticias, Atos e Eventos.docx`), parses, upserts in Supabase.
- Implement `syncNewsFromText(content, documentId)`: parses text via `parseNewsDocText`, upserts in Supabase.
- Return structured `NewsSyncResult { success, totalDaysParsed, insertedOrUpdated, daysInDb }`.

- [ ] **Step 2: Implement `scripts/run-news-docs-sync.ts` and update `package.json`**

1. Create `scripts/run-news-docs-sync.ts`:
```typescript
import { downloadAndSyncGoogleDocsNews, syncNewsFromLocalDocx } from '../src/lib/docs/news-sync';

async function main() {
  console.log('=====================================================');
  console.log('📰 SINCRONIZADOR GOOGLE DOCS ➡️ SUPABASE (NOTÍCIAS)');
  console.log('=====================================================\n');

  const isLocal = process.argv.includes('--local');
  const startTime = Date.now();

  try {
    const result = isLocal
      ? await syncNewsFromLocalDocx('Radar Guarapuava - Noticias, Atos e Eventos.docx')
      : await downloadAndSyncGoogleDocsNews();

    console.log('\n---------------- RESULTADO DA SINCRONIZAÇÃO ----------------');
    console.log(`📄 ID/Origem: ${result.documentId}`);
    console.log(`🔍 Dias extraídos: ${result.totalDaysParsed}`);
    console.log(`💾 Registros processados no Supabase: ${result.insertedOrUpdated}`);
    console.log(`🎉 Total de dias ativos no banco: ${result.daysInDb}`);
    console.log(`⏱️ Tempo decorrido: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log('=====================================================\n');
  } catch (err: any) {
    console.error('\n❌ Falha na sincronização:', err?.message || err);
    process.exit(1);
  }
}

main();
```

2. Add script in `package.json`:
`"sync:news": "tsx --env-file=.env.local scripts/run-news-docs-sync.ts"`

- [ ] **Step 3: Run synchronization script on real data**

Run: `npm run sync:news -- --local`
Verify: Output displays successful extraction and upsert of `07/10/2026` and `06/10/2026`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/docs/news-sync.ts scripts/run-news-docs-sync.ts package.json .env.local
git commit -m "feat(sync): add news sync service and run-news-docs-sync script"
```

---

### Task 5: Webhook & Cron Handlers (`/api/webhooks/news-docs-sync` & `/api/cron/sync-news`)

**Files:**
- Create: `src/app/api/webhooks/news-docs-sync/route.ts`
- Create: `src/app/api/cron/sync-news/route.ts`
- Test: `tests/news-webhook.test.ts`

**Interfaces:**
- Consumes: `syncNewsFromText`, `downloadAndSyncGoogleDocsNews` from `news-sync.ts`
- Produces: HTTP endpoints for Google Apps Script and Vercel Cron.

- [ ] **Step 1: Write endpoint test**

Create `tests/news-webhook.test.ts`:
```typescript
import assert from 'node:assert/strict';

// Test endpoint logic with valid auth and payload
async function runWebhookTest() {
  const payload = {
    conteudo: `
Atualização em 07/10/2026 às 12:20
Seção 4: Bloco Delta Feed
DELTA FEED - [12:20]
[Saúde] Notícia nova: Teste webhook com sucesso. Fonte: Portal Webhook
Card Principal do Dia
Manchete: Teste de Webhook em Execução.
Saúde e Gestão: Teste ativo no portal.
`,
    documento: 'Radar Guarapuava Teste',
  };

  // Import handler directly to test without running server
  const { POST } = await import('../src/app/api/webhooks/news-docs-sync/route');
  
  // Test Unauthorized
  const unauthorizedReq = new Request('http://localhost:3000/api/webhooks/news-docs-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer wrong-secret' },
    body: JSON.stringify(payload),
  });
  const unauthRes = await POST(unauthorizedReq);
  assert.equal(unauthRes.status, 401);

  // Test Authorized
  const validSecret = process.env.DOCS_WEBHOOK_SECRET || 'spk_sec_guarapuava_2026_mcp';
  const authorizedReq = new Request('http://localhost:3000/api/webhooks/news-docs-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${validSecret}` },
    body: JSON.stringify(payload),
  });
  const authRes = await POST(authorizedReq);
  assert.equal(authRes.status, 200);
  const data = await authRes.json();
  assert.equal(data.status, 'success');

  console.log('✅ Task 5 webhook authentication and handler tests passed');
}

runWebhookTest();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx --env-file=.env.local tsx tests/news-webhook.test.ts`
Expected: FAIL with `Cannot find module '../src/app/api/webhooks/news-docs-sync/route'`.

- [ ] **Step 3: Implement Webhook and Cron routes**

1. Create `src/app/api/webhooks/news-docs-sync/route.ts` matching `src/app/api/webhooks/docs-sync/route.ts`.
2. Create `src/app/api/cron/sync-news/route.ts` matching `src/app/api/cron/sync-jobs/route.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx --env-file=.env.local tsx tests/news-webhook.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/webhooks/news-docs-sync/route.ts src/app/api/cron/sync-news/route.ts tests/news-webhook.test.ts
git commit -m "feat(api): add news docs webhook and cron synchronization endpoints"
```

---

### Task 6: Frontend Integration - Multi-Day Home Feed & Timeline Navigation

**Files:**
- Modify: `src/components/HomeFeed.tsx:1-186`
- Modify: `src/components/DetailedFeed.tsx:1-141`
- Modify: `src/app/page.tsx:1-319`

**Interfaces:**
- Consumes: `listActiveNewsDigests` from `src/lib/supabase/news.ts`, `DailyDigest` from `src/types/news.ts`
- Produces: Dynamic multi-day feed on Home, chronological detail view for the clicked day.

- [ ] **Step 1: Update `src/components/HomeFeed.tsx` to support list of daily digests**

- Change `digest: DailyDigest` prop to `digests: DailyDigest[]`.
- Keep backwards-compatible: if `digests` is empty or only 1, render cleanly.
- Map through `digests`: each day renders an `<article className="surface-card ...">` with:
  - Header: Date (`d.date`) and relative time badge (`formatRelativeUpdateText({ date: d.date, time: d.lastUpdatedTime })`).
  - Headline: `d.headline`.
  - Filtered highlights: mapped to bullet points.
  - Clicking a card triggers `onOpenDetails(d)`.
- Cards separated by clean vertical spacing (`space-y-4`).

- [ ] **Step 2: Update `src/components/DetailedFeed.tsx` for selected day timeline**

- Ensure `DetailedFeed` displays `digest.batches` ordered from newest time to oldest time (`12:20`, `11:45`, etc.).
- Ensure `onBack` restores view to home.

- [ ] **Step 3: Update `src/app/page.tsx`**

- Add state `newsDigests: DailyDigest[]` initialized with `[initialDigest]`.
- Add state `selectedDigest: DailyDigest` initialized with `initialDigest`.
- In `useEffect`, call `listActiveNewsDigests()`. If rows exist, `setNewsDigests(liveDigests)` and set `selectedDigest(liveDigests[0])`.
- In `navigateTo("details", undefined, digest)` or `handleOpenDigest(digest)`:
  - Update `selectedDigest`.
  - Navigate to `"details"`.
  - Update hash `#noticias` or `#noticia-${digest.date.replace(/\//g, '')}`.
- Pass `digests={newsDigests}` to `<HomeFeed ... />`.
- Pass `digest={selectedDigest}` to `<DetailedFeed ... />`.

- [ ] **Step 4: Verify build and test locally**

Run: `npm run build`
Expected: Build succeeds with 0 type errors and 0 lint errors.

- [ ] **Step 5: Visual verification via browser subagent**

- Start local dev server if not running.
- Use `browser_subagent` to navigate to `http://localhost:3000`.
- Verify: Home feed displays day cards with headlines and highlights.
- Click on the day card and verify detailed timeline with hourly batches and dotted dividers.
- Click back button and verify return to home.

- [ ] **Step 6: Commit**

```bash
git add src/components/HomeFeed.tsx src/components/DetailedFeed.tsx src/app/page.tsx
git commit -m "feat(ui): display multiple day digests on home feed and dynamic detailed timelines"
```

---

### Task 7: Google Apps Script Ready-to-Use Artifact & Verification

**Files:**
- Create: `scripts/google-apps-script-noticias.js`
- Create: `docs/GOOGLE_APPS_SCRIPT_NOTICIAS.md`

**Interfaces:**
- Produces: Production-ready Apps Script file with copy-paste instructions for the user's private Google Docs document.

- [ ] **Step 1: Create `scripts/google-apps-script-noticias.js`**

Include the complete function `sincronizarNoticiasComServidor()` pointing to `https://guarapuava-chi.vercel.app/api/webhooks/news-docs-sync` with token `spk_sec_guarapuava_2026_mcp`.

- [ ] **Step 2: Create `docs/GOOGLE_APPS_SCRIPT_NOTICIAS.md`**

Step-by-step documentation explaining:
1. Open the Google Docs document ("Radar Guarapuava - Notícias, Atos e Eventos").
2. Click **Extensões ➔ Apps Script**.
3. Paste the code from `scripts/google-apps-script-noticias.js`.
4. Click **Salvar** e **Executar** para o primeiro teste.
5. (Opcional) Configurar acionador (Triggers) para executar automaticamente a cada 15 minutos ou ao editar.

- [ ] **Step 3: Commit**

```bash
git add scripts/google-apps-script-noticias.js docs/GOOGLE_APPS_SCRIPT_NOTICIAS.md
git commit -m "docs: add Google Apps Script snippet and setup guide for news sync"
```
