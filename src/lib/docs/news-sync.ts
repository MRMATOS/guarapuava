import fs from 'node:fs';
import { parseNewsDocxBuffer, parseNewsDocText } from './news-parser';
import { syncNewsDigests, listActiveNewsDigests } from '@/lib/supabase/news';

export const DEFAULT_GOOGLE_DOCS_NEWS_ID = '1OAa9XYR7ZT3WNuF3jtQsWC03ODXSocPBm83hGeinKkc';

export interface NewsDocsSyncResult {
  success: boolean;
  documentId: string;
  totalDaysParsed: number;
  totalBatchesParsed: number;
  insertedOrUpdated: number;
  daysInDb: number;
  error?: string;
}

/**
 * Faz o download do documento de notícias do Google Docs exportado como DOCX,
 * processa os lotes horários e executa o upsert atômico no Supabase.
 */
export async function downloadAndSyncGoogleDocsNews(customDocId?: string): Promise<NewsDocsSyncResult> {
  const docId = customDocId || process.env.GOOGLE_DOCS_NEWS_ID || DEFAULT_GOOGLE_DOCS_NEWS_ID;
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=docx`;

  console.log(`📥 Baixando Google Docs de Notícias (ID: ${docId})...`);

  const response = await fetch(exportUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; GuarapuavaNewsBot/1.0)',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao baixar Google Docs (Status HTTP ${response.status}: ${response.statusText}). Se o documento for restrito, use o Google Apps Script para sincronizar via Webhook.`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  console.log(`📦 Documento baixado (${arrayBuffer.byteLength} bytes). Processando notícias...`);

  return processAndSyncBuffer(arrayBuffer, docId);
}

/**
 * Lê um arquivo DOCX local (útil para desenvolvimento e testes locais com o arquivo raiz).
 */
export async function syncNewsFromLocalDocx(filePath: string): Promise<NewsDocsSyncResult> {
  console.log(`📂 Lendo arquivo local: ${filePath}...`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }

  const buffer = fs.readFileSync(filePath);
  console.log(`📦 Arquivo lido (${buffer.length} bytes). Processando notícias...`);

  return processAndSyncBuffer(buffer, filePath);
}

/**
 * Processa o texto puro enviado via webhook pelo Google Apps Script
 * e executa a sincronização diretamente no Supabase.
 */
export async function syncNewsFromText(
  content: string,
  documentId = 'google-apps-script'
): Promise<NewsDocsSyncResult> {
  console.log(`📥 Processando texto de notícias recebido via webhook (${content.length} caracteres)...`);

  const digests = parseNewsDocText(content);
  return finishNewsSync(digests, documentId);
}

async function processAndSyncBuffer(buffer: ArrayBuffer | Buffer, documentId: string): Promise<NewsDocsSyncResult> {
  const digests = await parseNewsDocxBuffer(buffer);
  return finishNewsSync(digests, documentId);
}

async function finishNewsSync(digests: ReturnType<typeof parseNewsDocText>, documentId: string): Promise<NewsDocsSyncResult> {
  const totalBatches = digests.reduce((acc, d) => acc + d.batches.length, 0);
  console.log(`✅ Total de dias estruturados: ${digests.length} (${totalBatches} lotes horários)`);

  if (digests.length === 0) {
    const currentInDb = await listActiveNewsDigests(50);
    return {
      success: true,
      documentId,
      totalDaysParsed: 0,
      totalBatchesParsed: 0,
      insertedOrUpdated: 0,
      daysInDb: currentInDb.length,
    };
  }

  const syncRes = await syncNewsDigests(digests);
  const activeInDb = await listActiveNewsDigests(50);

  console.log(`🎉 Sincronização de notícias concluída com sucesso!`);
  console.log(`   - Dias processados: ${digests.length}`);
  console.log(`   - Lotes horários no documento: ${totalBatches}`);
  console.log(`   - Registros persistidos no Supabase: ${syncRes.upserted}`);
  console.log(`   - Total de dias ativos no banco: ${activeInDb.length}`);

  return {
    success: true,
    documentId,
    totalDaysParsed: digests.length,
    totalBatchesParsed: totalBatches,
    insertedOrUpdated: syncRes.upserted,
    daysInDb: activeInDb.length,
  };
}
