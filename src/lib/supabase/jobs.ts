import { supabase } from './client';
import { JobOpening } from '@/types/job';
import { sortJobsByPublishedDate } from '../utils/date';

// Interface do modelo no PostgreSQL (snake_case)
export interface DatabaseJobRow {
  id: string;
  external_id: string;
  title: string;
  company: string;
  intermediary?: string | null;
  location: string;
  work_model?: string | null;
  contract_type?: string | null;
  vacancies_count: number;
  is_pcd: boolean;
  is_pcd_exclusive: boolean;
  published_date: string;
  registered_at?: string | null;
  application_deadline?: string | null;
  compensation?: string | null;
  schedule?: string | null;
  source_url: string;
  application_instructions?: string | null;
  description_items: string[];
  requirement_items: string[];
  benefit_items: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Converte linha do banco (snake_case) para interface TypeScript do frontend (camelCase)
 */
export function mapRowToJob(row: DatabaseJobRow): JobOpening {
  return {
    id: row.id,
    externalId: row.external_id,
    title: row.title,
    company: row.company,
    intermediary: row.intermediary ?? undefined,
    location: row.location,
    workModel: (row.work_model as JobOpening['workModel']) ?? undefined,
    contractType: row.contract_type ?? undefined,
    vacanciesCount: row.vacancies_count,
    isPcd: row.is_pcd,
    isPcdExclusive: row.is_pcd_exclusive,
    publishedDate: row.published_date,
    registeredAt: row.registered_at ?? undefined,
    applicationDeadline: row.application_deadline ?? undefined,
    compensation: row.compensation ?? undefined,
    schedule: row.schedule ?? undefined,
    sourceUrl: row.source_url,
    link: row.source_url, // compatibilidade
    applicationInstructions: row.application_instructions ?? undefined,
    descriptionItems: row.description_items || [],
    requirementItems: row.requirement_items || [],
    benefitItems: row.benefit_items || [],
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Lista todas as vagas ativas no portal, ordenadas pela data de criação.
 */
export async function listActiveJobs(limit = 1000): Promise<JobOpening[]> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar vagas ativas no Supabase:', error);
      return [];
    }

    const mapped = (data as DatabaseJobRow[]).map(mapRowToJob);
    return sortJobsByPublishedDate(mapped);
  } catch (err) {
    console.error('Exceção ao consultar Supabase:', err);
    return [];
  }
}

