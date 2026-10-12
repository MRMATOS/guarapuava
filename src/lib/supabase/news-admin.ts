// src/lib/supabase/news-admin.ts
import { supabaseAdmin } from './admin';
import { DailyDigest } from '@/types/news';
import { parseDateToIso } from '../docs/news-parser';

/**
 * Sincroniza em lote os resumos diários de notícias.
 * Executa UPSERT atômico no Supabase com base na data (`date`).
 */
export async function syncNewsDigests(
  digests: DailyDigest[]
): Promise<{ upserted: number; total: number }> {
  if (!digests || digests.length === 0) {
    return { upserted: 0, total: 0 };
  }

  const rowsToUpsert = digests.map((d) => ({
    date: d.date,
    date_iso: d.dateIso || parseDateToIso(d.date),
    last_updated_time: d.lastUpdatedTime,
    headline: d.headline,
    highlights: d.highlights || [],
    batches: d.batches || [],
    is_active: true,
    updated_at: new Date().toISOString(),
  }));

  // Deduplica no mesmo lote por date para evitar conflitos no Postgres
  const uniqueMap = new Map<string, (typeof rowsToUpsert)[0]>();
  for (const row of rowsToUpsert) {
    uniqueMap.set(row.date, row);
  }
  const deduplicatedRows = Array.from(uniqueMap.values());

  const { data, error } = await supabaseAdmin
    .from('news_digests')
    .upsert(deduplicatedRows, { onConflict: 'date' })
    .select('id, date');

  if (error) {
    console.error('Erro ao executar upsert de notícias no Supabase:', error);
    throw new Error(`Falha no upsert de notícias: ${error.message}`);
  }

  const count = data ? data.length : deduplicatedRows.length;

  return {
    upserted: count,
    total: count,
  };
}
