import { parseDocxBuffer, parseDocText } from './parser';
import { syncJobs, listActiveJobs } from '@/lib/supabase/jobs';

export const DEFAULT_GOOGLE_DOCS_ID = '1IgkVpsOkQ-wCwk3YANQuvMINsmgj93g1VrxGz9ZhGFE';

export interface DocsSyncResult {
  success: boolean;
  documentId: string;
  totalParsed: number;
  insertedOrUpdated: number;
  activeTotalInDb: number;
  error?: string;
}

/**
 * Faz o download do documento do Google Docs exportado como DOCX,
 * processa e normaliza as vagas e executa o upsert no Supabase.
 */
export async function downloadAndSyncGoogleDoc(customDocId?: string): Promise<DocsSyncResult> {
  const docId = customDocId || process.env.GOOGLE_DOCS_ID || DEFAULT_GOOGLE_DOCS_ID;
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=docx`;

  console.log(`📥 Baixando Google Docs (ID: ${docId})...`);

  const response = await fetch(exportUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; GuarapuavaJobsBot/1.0)',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao baixar Google Docs (Status HTTP ${response.status}: ${response.statusText}). Verifique se o link possui permissão de leitura ("Qualquer pessoa com o link").`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  console.log(`📦 Documento baixado (${arrayBuffer.byteLength} bytes). Processando vagas...`);

  const jobs = await parseDocxBuffer(arrayBuffer);
  console.log(`✅ Total de vagas estruturadas e validadas: ${jobs.length}`);

  if (jobs.length === 0) {
    return {
      success: true,
      documentId: docId,
      totalParsed: 0,
      insertedOrUpdated: 0,
      activeTotalInDb: (await listActiveJobs(500)).length,
    };
  }

  // Sincroniza em lotes de 50 no Supabase para garantir estabilidade
  const CHUNK_SIZE = 50;
  let totalUpserted = 0;

  for (let i = 0; i < jobs.length; i += CHUNK_SIZE) {
    const chunk = jobs.slice(i, i + CHUNK_SIZE);
    const syncRes = await syncJobs(chunk, false); // false para manter histórico cumulativo
    totalUpserted += syncRes.total;
  }

  const activeInDb = await listActiveJobs(500);

  console.log(`🎉 Sincronização concluída com sucesso!`);
  console.log(`   - Vagas no documento: ${jobs.length}`);
  console.log(`   - Vagas processadas no Supabase: ${totalUpserted}`);
  console.log(`   - Total de vagas ativas no banco: ${activeInDb.length}`);

  return {
    success: true,
    documentId: docId,
    totalParsed: jobs.length,
    insertedOrUpdated: totalUpserted,
    activeTotalInDb: activeInDb.length,
  };
}

/**
 * Processa o texto puro enviado via webhook pelo Google Apps Script
 * e executa a sincronização diretamente no Supabase.
 */
export async function syncJobsFromText(content: string, documentId = 'google-apps-script'): Promise<DocsSyncResult> {
  console.log(`📥 Processando texto do documento recebido via webhook (${content.length} caracteres)...`);

  const jobs = parseDocText(content);
  console.log(`✅ Total de vagas estruturadas e validadas: ${jobs.length}`);

  if (jobs.length === 0) {
    return {
      success: true,
      documentId,
      totalParsed: 0,
      insertedOrUpdated: 0,
      activeTotalInDb: (await listActiveJobs(500)).length,
    };
  }

  const CHUNK_SIZE = 50;
  let totalUpserted = 0;

  for (let i = 0; i < jobs.length; i += CHUNK_SIZE) {
    const chunk = jobs.slice(i, i + CHUNK_SIZE);
    const syncRes = await syncJobs(chunk, false);
    totalUpserted += syncRes.total;
  }

  const activeInDb = await listActiveJobs(500);

  console.log(`🎉 Sincronização via Webhook concluída com sucesso!`);
  console.log(`   - Vagas no documento: ${jobs.length}`);
  console.log(`   - Vagas processadas no Supabase: ${totalUpserted}`);
  console.log(`   - Total de vagas ativas no banco: ${activeInDb.length}`);

  return {
    success: true,
    documentId,
    totalParsed: jobs.length,
    insertedOrUpdated: totalUpserted,
    activeTotalInDb: activeInDb.length,
  };
}

