import { supabase } from './client';
import { DailyDigest, DatabaseNewsDigestRow } from '@/types/news';

/**
 * Converte linha do banco (snake_case) para a interface DailyDigest do frontend
 */
export function mapRowToDigest(row: DatabaseNewsDigestRow): DailyDigest {
  return {
    id: row.id,
    date: row.date,
    dateIso: row.date_iso,
    lastUpdatedTime: row.last_updated_time,
    headline: row.headline,
    highlights: row.highlights || [],
    batches: row.batches || [],
    isActive: row.is_active,
  };
}

/**
 * Lista todos os resumos de notícias ativos no portal, ordenados pela data (mais recente primeiro).
 */
export async function listActiveNewsDigests(limit = 30): Promise<DailyDigest[]> {
  try {
    const { data, error } = await supabase
      .from('news_digests')
      .select('*')
      .eq('is_active', true)
      .order('date_iso', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar notícias ativas no Supabase:', error);
      return [];
    }

    return (data as DatabaseNewsDigestRow[]).map(mapRowToDigest);
  } catch (err) {
    console.error('Exceção ao consultar notícias no Supabase:', err);
    return [];
  }
}

/**
 * Busca um resumo de notícias por data (ex: "07/10/2026").
 */
export async function getNewsDigestByDate(date: string): Promise<DailyDigest | null> {
  try {
    const { data, error } = await supabase
      .from('news_digests')
      .select('*')
      .eq('date', date)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`Erro ao buscar notícia do dia ${date}:`, error);
      return null;
    }

    if (!data) return null;
    return mapRowToDigest(data as DatabaseNewsDigestRow);
  } catch (err) {
    console.error(`Exceção ao consultar notícia do dia ${date}:`, err);
    return null;
  }
}

