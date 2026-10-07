# Especificação de Design: Pipeline de Notícias via Google Docs & Supabase

**Data:** 07/10/2026  
**Status:** Aprovado para Planejamento  
**Autor:** Antigravity & Time de Produto  

---

## 1. Visão Geral e Objetivos

Este documento especifica a arquitetura e implementação da sincronização automatizada de notícias entre o documento privado do Google Docs ("Radar Guarapuava - Notícias, Atos e Eventos"), o banco de dados **Supabase (PostgreSQL)** e a interface do portal **Next.js**.

### Objetivos Principais
1. **Google Apps Script no Documento Restrito:** Manter o documento do Google Docs seguro e privado, utilizando um script embutido no Google Apps Script (`sincronizarNoticiasComServidor`) que envia as atualizações via webhook autenticado com Bearer Token.
2. **Parser Robusto de Notícias:** Processar os blocos a partir de `06/10/2026 às 15:40` em diante, onde a estrutura adota o padrão:
   - `DELTA FEED - [HH:MM]`: Lista de notícias inéditas da rodada no formato `[Categoria] Notícia nova: <texto> Fonte: <fonte>`.
   - `Card Principal do Dia`: Manchete compilada do dia e lista de destaques por categoria.
3. **Persistência Consolidada no Supabase (`news_digests`):** Armazenar cada dia de forma atômica (`onConflict: 'date'`), contendo a manchete consolidada, os destaques e o histórico acumulado de lotes horários ordenados do mais recente para o mais antigo.
4. **Experiência Visual na Página Inicial (Scroll por Dias):** Na tela inicial (`HomeFeed`), o usuário visualiza cards dos dias disponíveis (hoje, ontem, etc.). Ao rolar, ele navega pelos resumos diários.
5. **Experiência Visual no Feed Detalhado (Scroll por Horários):** Ao clicar em um dia específico, o usuário acessa o feed detalhado (`DetailedFeed`) exibindo a linha do tempo completa daquele dia (12:20 ➔ 11:45 ➔ 10:30...), com separadores pontilhados e filtros por categoria.
6. **Fallback Resiliente:** Caso o banco esteja temporariamente inacessível ou sem registros, manter o fallback seguro para `initialDigest`.

---

## 2. Arquitetura do Sistema

```
┌────────────────────────────────────────────────────────┐
│               Google Docs Restrito                     │
│    "Radar Guarapuava - Notícias, Atos e Eventos"       │
│                                                        │
│  [Google Apps Script: sincronizarNoticiasComServidor]  │
└───────────────────────────┬────────────────────────────┘
                            │ POST /api/webhooks/news-docs-sync
                            │ Headers: Authorization: Bearer <secret>
                            │ Payload: { conteudo, documento, dataAtualizacao }
                            ▼
┌────────────────────────────────────────────────────────┐
│            Next.js Route Handler                       │
│       (/api/webhooks/news-docs-sync)                   │
│   - Validação de segurança (DOCS_WEBHOOK_SECRET)       │
│   - Parser de texto puro / parágrafos                  │
└───────────────────────────┬────────────────────────────┘
                            │ Dados estruturados DailyDigest[]
                            ▼
┌────────────────────────────────────────────────────────┐
│             Parser de Notícias                         │
│         (src/lib/docs/news-parser.ts)                  │
│   - Identifica rodadas "Atualização em ... às ..."     │
│   - Extrai itens do DELTA FEED                         │
│   - Extrai Manchete e Destaques do Card Principal      │
│   - Agrupa lotes por data (mais recente no topo)       │
└───────────────────────────┬────────────────────────────┘
                            │ UPSERT onConflict('date')
                            ▼
┌────────────────────────────────────────────────────────┐
│             Supabase Postgres                          │
│          Tabela: news_digests                          │
│   - id, date, date_iso, last_updated_time              │
│   - headline, highlights (JSONB), batches (JSONB)      │
│   - RLS: Leitura pública anon                          │
└───────────────────────────┬────────────────────────────┘
                            │ Consulta: listActiveNewsDigests()
                            ▼
┌────────────────────────────────────────────────────────┐
│           Portal Web Guarapuava (Next.js)              │
│  - HomeFeed: Lista de cards diários (scroll por dias)  │
│  - DetailedFeed: Linha do tempo horária do dia         │
│    selecionado (scroll do mais recente ao antigo)      │
└────────────────────────────────────────────────────────┘
```

Também é suportada a execução via script CLI local (`scripts/run-news-docs-sync.ts`) que pode baixar o documento quando configurado com ID público/autorizado ou ler o arquivo local `.docx`.

---

## 3. Modelo de Dados (Supabase Migration)

Arquivo: `supabase/migrations/20261007_create_news_digests_table.sql`

```sql
CREATE TABLE IF NOT EXISTS public.news_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT UNIQUE NOT NULL,             -- Ex: "07/10/2026"
  date_iso DATE NOT NULL,                -- Ex: '2026-10-07'
  last_updated_time TEXT NOT NULL,       -- Ex: "12:20"
  headline TEXT NOT NULL,                -- Manchete síntese do dia
  highlights JSONB DEFAULT '[]'::jsonb,  -- Array de NewsItem: [{ id, category, title, text }]
  batches JSONB DEFAULT '[]'::jsonb,     -- Array de NewsBatch: [{ id, date, time, items }]
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_news_digests_date_iso ON public.news_digests (date_iso DESC);
CREATE INDEX IF NOT EXISTS idx_news_digests_active ON public.news_digests (is_active, date_iso DESC);

ALTER TABLE public.news_digests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'news_digests' AND policyname = 'Noticias ativas sao publicas'
  ) THEN
    CREATE POLICY "Noticias ativas sao publicas" 
    ON public.news_digests FOR SELECT 
    TO anon, authenticated 
    USING (is_active = true);
  END IF;
END $$;
```

---

## 4. Parser de Notícias (`src/lib/docs/news-parser.ts`)

### Padrões Reconhecidos:
1. **Cabeçalho de Atualização:**
   - Expressão: `/Atualização em (\d{2}\/\d{2}\/\d{4}) às (\d{2}:\d{2})/i`
   - Define o dia corrente (`07/10/2026`) e o horário do lote (`12:20`).
2. **Delta Feed:**
   - Marcador: `/DELTA FEED\s*-\s*\[?(\d{2}:\d{2})\]?/i`
   - Itens de novidade: `/^\[([^\]]+)\]\s*(?:Notícia nova:\s*)?(.*?)(?:\s*Fonte:\s*(.*))?$/i`
   - Mapeia para `NewsItem`:
     - `id`: slug único (`item-0710-1220-1`)
     - `category`: categoria limpa (ex: "Saúde", "Política", "Prazos", "Cultura", "Educação")
     - `title`: categoria ou primeiro segmento descritivo
     - `text`: descrição da notícia com a fonte incorporada.
3. **Card Principal do Dia:**
   - Manchete: `/^Manchete:\s*(.+)$/i`
   - Destaques: Linhas seguintes como `Saúde e Gestão: ...`, `Atos Oficiais: ...`, `Cultura e Lazer: ...` mapeadas para itens com `title` e `text`.
4. **Agrupamento e Ordenação:**
   - Todos os lotes horários (`batches`) pertencentes a um mesmo dia são consolidados em ordem horária reversa (`12:20`, `11:45`, `10:30`, etc.).
   - Se o mesmo lote horário for reenviado, é atualizado sem duplicar.
   - A `headline` e os `highlights` do dia correspondem à rodada mais recente daquele dia.
   - Os dias são ordenados cronologicamente reversos (`date_iso DESC`).

---

## 5. Google Apps Script para o Documento

Código para adicionar em **Extensões > Apps Script** no documento de notícias:

```javascript
/**
 * Sincroniza o conteúdo do documento de notícias com a API do portal Guarapuava.
 * Lê parágrafos e itens de lista preservando o texto e links de fonte.
 */
function sincronizarNoticiasComServidor() {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  
  const numChildren = body.getNumChildren();
  const linhas = [];

  for (let i = 0; i < numChildren; i++) {
    const child = body.getChild(i);
    const type = child.getType();

    if (type === DocumentApp.ElementType.PARAGRAPH || type === DocumentApp.ElementType.LIST_ITEM) {
      const container = type === DocumentApp.ElementType.PARAGRAPH ? child.asParagraph() : child.asListItem();
      const text = container.getText().trim();
      if (!text) continue;

      linhas.push(text);
    }
  }

  const conteudoCompleto = linhas.join("\n");
  const endpoint = "https://guarapuava-chi.vercel.app/api/webhooks/news-docs-sync";
  const tokenSecreto = "spk_sec_guarapuava_2026_mcp"; 

  const payload = {
    documento: doc.getName(),
    documentId: doc.getId(),
    conteudo: conteudoCompleto,
    dataAtualizacao: new Date().toISOString()
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Bearer " + tokenSecreto
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(endpoint, options);
    const statusCode = response.getResponseCode();
    Logger.log("Sincronização de notícias concluída. Status HTTP: " + statusCode);
    Logger.log("Resposta: " + response.getContentText());
  } catch (erro) {
    Logger.log("Erro ao enviar: " + erro.toString());
  }
}
```

---

## 6. Endpoints de Webhook e Cron

1. **`POST /api/webhooks/news-docs-sync`**:
   - Valida `Authorization: Bearer <secret>` contra `DOCS_WEBHOOK_SECRET` / `MCP_CLIENT_SECRET`.
   - Recebe `{ conteudo, documento, documentId }`.
   - Invoca `syncNewsFromText(conteudo)`.
   - Retorna JSON `{ status: 'success', syncedDays: number, digests: [...] }`.
2. **`GET/POST /api/cron/sync-news`**:
   - Permite acionamento via Vercel Cron ou runner externo.
   - Baixa e processa o documento caso o link de exportação esteja habilitado.

---

## 7. Frontend e Experiência do Usuário

1. **`src/lib/supabase/news.ts`**:
   - Fornece `listActiveNewsDigests()` para buscar todos os dias com `is_active = true` ordenados por `date_iso DESC`.
   - Fornece `syncNewsDigests(digests: DailyDigest[])` para upsert seguro no Supabase.
2. **`src/app/page.tsx`**:
   - Carrega `digests` via `listActiveNewsDigests()` no mount. Se vazio, usa `[initialDigest]`.
   - Gerencia o estado de dia selecionado (`selectedDigest`), passando-o para o `DetailedFeed`.
3. **`HomeFeed.tsx`**:
   - Suporta múltiplos dias: renderiza uma lista vertical de cartões de resumo diários.
   - Ao rolar a página inicial, o usuário rola pelos dias.
   - Cada cartão exibe sua data, horário relativo da última atualização, manchete e tópicos filtráveis.
   - O clique em qualquer cartão abre a visualização detalhada daquele dia específico.
4. **`DetailedFeed.tsx`**:
   - Recebe o `digest` do dia selecionado.
   - Exibe a linha do tempo com os `batches` do mais recente ao mais antigo (ex: 12:20 ➔ 11:45 ➔ 10:30...).
   - Mantém filtros por tag/categoria e botão de retorno para a lista de dias.

---

## 8. Estratégia de Testes e Validação

1. **Teste Unitário do Parser:**
   - Validar a extração dos blocos a partir de `Radar Guarapuava - Noticias, Atos e Eventos.docx` e conferir se extrai corretamente os dias `07/10/2026` e `06/10/2026` com seus respectivos lotes e manchetes.
2. **Teste de Execução do Script CLI:**
   - Executar `npx tsx scripts/run-news-docs-sync.ts` para validar o pipeline ponta a ponta.
3. **Teste de Webhook Local:**
   - Testar requisição `POST` em `/api/webhooks/news-docs-sync` com payload de teste.
4. **Validação Visual no Navegador:**
   - Acessar a aplicação localmente (`http://localhost:3000`) e conferir o scroll por dias no Home e a timeline cronológica reversa nos detalhes.
