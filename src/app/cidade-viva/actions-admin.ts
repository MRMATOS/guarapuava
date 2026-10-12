// src/app/cidade-viva/actions-admin.ts
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import type { ReportStatus, Report } from "./_lib/types";

/**
 * Garante que a requisição partiu do administrador autorizado (ADMIN_EMAIL).
 */
async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const authorizedEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const userEmail = user?.email?.trim().toLowerCase();

  if (!user || !userEmail || !authorizedEmail || userEmail !== authorizedEmail) {
    throw new Error(
      "Acesso não autorizado. Apenas o administrador pode executar esta ação."
    );
  }

  return user;
}

/**
 * Atualiza o status de um relato (ex: 'verificado_in_loco', 'resolvido', 'sugestivo').
 */
export async function updateReportStatusAction(
  reportId: string,
  newStatus: ReportStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    const admin = createSupabaseAdmin();
    const { error } = await admin
      .from("cidade_viva_reports")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", reportId);

    if (error) {
      console.error("Erro ao atualizar status do relato:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/cidade-viva");
    revalidatePath("/cidade-viva");
    revalidatePath("/cidade-viva/mapa");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { success: false, error: msg };
  }
}

/**
 * Exclui um relato e remove sua foto do Storage.
 */
export async function deleteReportAction(
  reportId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    const admin = createSupabaseAdmin();

    // 1. Busca URL da foto para deletar do storage
    const { data: report, error: fetchError } = await admin
      .from("cidade_viva_reports")
      .select("photo_url")
      .eq("id", reportId)
      .single();

    if (fetchError || !report) {
      return { success: false, error: "Relato não encontrado para exclusão." };
    }

    // 2. Remove imagem do Storage se aplicável
    if (report.photo_url) {
      const match = report.photo_url.match(/cidade-viva-reports\/(.+)$/);
      if (match && match[1]) {
        const storagePath = decodeURIComponent(match[1]);
        if (!storagePath.includes("..")) {
          await admin.storage
            .from("cidade-viva-reports")
            .remove([storagePath]);
        }
      }
    }

    // 3. Deleta o registro no banco
    const { error: deleteError } = await admin
      .from("cidade_viva_reports")
      .delete()
      .eq("id", reportId);

    if (deleteError) {
      console.error("Erro ao excluir relato do banco:", deleteError);
      return { success: false, error: deleteError.message };
    }

    revalidatePath("/admin/cidade-viva");
    revalidatePath("/cidade-viva");
    revalidatePath("/cidade-viva/mapa");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { success: false, error: msg };
  }
}

/**
 * Retorna todos os relatos para moderação de admin (inclui resolvidos).
 */
export async function getAdminReports(
  statusFilter?: string
): Promise<Report[]> {
  try {
    await requireAdmin();

    const admin = createSupabaseAdmin();
    let query = admin
      .from("cidade_viva_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter && statusFilter !== "todos") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro ao buscar relatos para o admin:", error);
      return [];
    }

    return (data as Report[]) || [];
  } catch (error) {
    console.error(
      "Falha de autorização ou erro desconhecido em getAdminReports:",
      error
    );
    return [];
  }
}
