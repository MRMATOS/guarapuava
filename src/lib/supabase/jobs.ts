import { supabase, supabaseAdmin } from './client';
import { JobOpening } from '@/types/job';
import { JobOpeningInput } from '../mcp/schema';

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
export async function listActiveJobs(limit = 100): Promise<JobOpening[]> {
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

    return (data as DatabaseJobRow[]).map(mapRowToJob);
  } catch (err) {
    console.error('Exceção ao consultar Supabase:', err);
    return [];
  }
}

/**
 * Sincroniza em lote as vagas recebidas do Gemini Spark.
 * Realiza UPSERT com base em `external_id`.
 * Se `deactivateUnlisted` for true, marca vagas ativas ausentes como inativas.
 */
export async function syncJobs(
  vagas: JobOpeningInput[],
  deactivateUnlisted = false
): Promise<{ inserted: number; updated: number; deactivated: number; total: number }> {
  if (!vagas || vagas.length === 0) {
    return { inserted: 0, updated: 0, deactivated: 0, total: 0 };
  }

  const rowsToUpsert = vagas.map((v) => ({
    external_id: v.externalId,
    title: v.title,
    company: v.company,
    intermediary: v.intermediary ?? null,
    location: v.location,
    work_model: v.workModel ?? null,
    contract_type: v.contractType ?? null,
    vacancies_count: v.vacanciesCount ?? 1,
    is_pcd: v.isPcd ?? false,
    is_pcd_exclusive: v.isPcdExclusive ?? false,
    published_date: v.publishedDate,
    registered_at: v.registeredAt ?? null,
    application_deadline: v.applicationDeadline ?? null,
    compensation: v.compensation ?? null,
    schedule: v.schedule ?? null,
    source_url: v.sourceUrl,
    application_instructions: v.applicationInstructions ?? null,
    description_items: v.descriptionItems || [],
    requirement_items: v.requirementItems || [],
    benefit_items: v.benefitItems || [],
    is_active: true,
    updated_at: new Date().toISOString(),
  }));

  // Executa UPSERT no Supabase Admin
  const { data: upsertData, error: upsertError } = await supabaseAdmin
    .from('jobs')
    .upsert(rowsToUpsert, { onConflict: 'external_id' })
    .select('id, external_id');

  if (upsertError) {
    console.error('Erro ao executar upsert de vagas no Supabase:', upsertError);
    throw new Error(`Falha no upsert: ${upsertError.message}`);
  }

  let deactivatedCount = 0;

  // Desativação segura somente se explicitamente solicitada
  if (deactivateUnlisted) {
    const activeExternalIds = vagas.map((v) => v.externalId);
    const { data: deactivatedData, error: deactError } = await supabaseAdmin
      .from('jobs')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('is_active', true)
      .not('external_id', 'in', `(${activeExternalIds.map((id) => `"${id}"`).join(',')})`)
      .select('id');

    if (deactError) {
      console.warn('Aviso: erro ao desativar vagas ausentes:', deactError);
    } else if (deactivatedData) {
      deactivatedCount = deactivatedData.length;
    }
  }

  const totalAffected = upsertData ? upsertData.length : vagas.length;

  return {
    inserted: totalAffected,
    updated: 0,
    deactivated: deactivatedCount,
    total: totalAffected,
  };
}

/**
 * Desativa uma vaga pontualmente por external_id ou source_url.
 */
export async function deactivateJob(externalIdOrUrl: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('jobs')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .or(`external_id.eq.${externalIdOrUrl},source_url.eq.${externalIdOrUrl}`);

  if (error) {
    console.error('Erro ao desativar vaga:', error);
    return false;
  }

  return true;
}
