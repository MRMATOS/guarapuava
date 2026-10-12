// src/lib/supabase/jobs-admin.ts
import { supabaseAdmin } from './admin';
import { JobOpeningInput } from '../mcp/schema';

/**
 * Sincroniza em lote as vagas recebidas do Gemini Spark ou Google Docs.
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

  // Deduplica itens no mesmo lote por external_id para evitar conflito 21000 no PostgreSQL
  const uniqueRowsMap = new Map<string, (typeof rowsToUpsert)[0]>();
  for (const row of rowsToUpsert) {
    uniqueRowsMap.set(row.external_id, row);
  }
  const deduplicatedRows = Array.from(uniqueRowsMap.values());

  // Executa UPSERT no Supabase Admin
  const { data: upsertData, error: upsertError } = await supabaseAdmin
    .from('jobs')
    .upsert(deduplicatedRows, { onConflict: 'external_id' })
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
