"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Key } from "@/components/ui/Key";
import type { Report, ReportStatus } from "@/app/cidade-viva/_lib/types";
import {
  updateReportStatusAction,
  deleteReportAction,
} from "@/app/cidade-viva/actions-admin";

interface ReportItemActionsProps {
  report: Report;
  categoryName?: string;
  onReportUpdated?: (reportId: string, newStatus: ReportStatus) => void;
  onReportDeleted?: (reportId: string) => void;
}

type ConfirmActionType =
  | "verificado"
  | "sugestivo"
  | "resolvido"
  | "excluir"
  | null;

export function ReportItemActions({
  report,
  categoryName,
  onReportUpdated,
  onReportDeleted,
}: ReportItemActionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionType>(null);
  const [isPending, startTransition] = useTransition();

  const handleCloseModal = () => {
    if (isPending) return;
    setIsModalOpen(false);
    setConfirmAction(null);
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;

    if (confirmAction === "excluir") {
      startTransition(async () => {
        const res = await deleteReportAction(report.id);
        if (!res.success) {
          alert(`Erro ao excluir: ${res.error}`);
          return;
        }
        onReportDeleted?.(report.id);
        handleCloseModal();
      });
      return;
    }

    const newStatus: ReportStatus =
      confirmAction === "verificado"
        ? "verificado_in_loco"
        : confirmAction === "resolvido"
        ? "resolvido"
        : "sugestivo";

    startTransition(async () => {
      const res = await updateReportStatusAction(report.id, newStatus);
      if (!res.success) {
        alert(`Erro ao atualizar: ${res.error}`);
        return;
      }
      onReportUpdated?.(report.id, newStatus);
      handleCloseModal();
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Botão 1: Abrir no Mapa */}
        <Link
          href={`/cidade-viva/mapa?id=${report.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="key px-3 py-1.5 text-xs font-semibold hover:border-coral transition-colors whitespace-nowrap inline-flex items-center justify-center"
          title="Abrir ocorrência focalizada no mapa interativo"
        >
          Abrir no Mapa ↗
        </Link>

        {/* Botão 2: Opções de Moderação */}
        <Key
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
          title="Opções de moderação e status"
        >
          Opções
        </Key>
      </div>

      {/* Modal de Moderação */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-label="Opções do Moderador"
        >
          <div
            className="surface-card p-6 max-w-md w-full flex flex-col gap-4 text-left shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-3 border-b border-rule/50 pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">
                  Moderar Ocorrência
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {categoryName ? `${categoryName} • ` : ""}
                  {report.address || "Localização registrada"}
                </p>
              </div>

              <Key
                type="button"
                onClick={handleCloseModal}
                disabled={isPending}
                className="px-2.5 py-1 text-xs"
              >
                ✕
              </Key>
            </div>

            {/* Tela de Confirmação */}
            {confirmAction ? (
              <div className="flex flex-col gap-3 py-2">
                <p className="text-xs text-ink leading-relaxed font-medium">
                  {confirmAction === "excluir" &&
                    "Tem certeza que deseja excluir esta ocorrência permanentemente? A imagem será apagada do storage e a ação não pode ser desfeita."}
                  {confirmAction === "verificado" &&
                    "Deseja marcar este relato como 'Verificado in loco' pela equipe?"}
                  {confirmAction === "resolvido" &&
                    "Deseja encerrar e marcar este relato como 'Resolvido'?"}
                  {confirmAction === "sugestivo" &&
                    "Deseja alterar o status para 'Sugestivo'?"}
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Key
                    type="button"
                    onClick={() => setConfirmAction(null)}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs font-semibold"
                  >
                    Voltar
                  </Key>

                  <button
                    type="button"
                    onClick={handleConfirmAction}
                    disabled={isPending}
                    className={`key px-4 py-1.5 text-xs font-bold rounded-xl cursor-pointer ${
                      confirmAction === "excluir"
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "key--coral"
                    }`}
                  >
                    {isPending ? "Processando..." : "Confirmar"}
                  </button>
                </div>
              </div>
            ) : (
              /* Menu de Seleção de Ação */
              <div className="flex flex-col gap-2 py-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Alterar Status
                </span>

                {report.status !== "verificado_in_loco" && (
                  <button
                    type="button"
                    onClick={() => setConfirmAction("verificado")}
                    className="w-full text-left p-3 rounded-xl border border-rule/60 hover:border-emerald-500 bg-canvas transition-colors text-xs font-semibold text-ink flex items-center justify-between cursor-pointer"
                  >
                    <span>✓ Marcar como Verificado in loco</span>
                    <span className="text-[10px] text-emerald-600 font-bold">
                      Aprovado
                    </span>
                  </button>
                )}

                {report.status !== "resolvido" && (
                  <button
                    type="button"
                    onClick={() => setConfirmAction("resolvido")}
                    className="w-full text-left p-3 rounded-xl border border-rule/60 hover:border-blue-500 bg-canvas transition-colors text-xs font-semibold text-ink flex items-center justify-between cursor-pointer"
                  >
                    <span>✦ Marcar como Resolvido</span>
                    <span className="text-[10px] text-blue-600 font-bold">
                      Concluído
                    </span>
                  </button>
                )}

                {report.status !== "sugestivo" && (
                  <button
                    type="button"
                    onClick={() => setConfirmAction("sugestivo")}
                    className="w-full text-left p-3 rounded-xl border border-rule/60 hover:border-yellow-500 bg-canvas transition-colors text-xs font-semibold text-ink flex items-center justify-between cursor-pointer"
                  >
                    <span>● Manter como Sugestivo</span>
                    <span className="text-[10px] text-yellow-600 font-bold">
                      Pendente
                    </span>
                  </button>
                )}

                <div className="pt-2 border-t border-rule/50">
                  <button
                    type="button"
                    onClick={() => setConfirmAction("excluir")}
                    className="w-full text-left p-3 rounded-xl border border-red-500/30 hover:border-red-500 hover:bg-red-500/10 transition-colors text-xs font-bold text-red-600 flex items-center justify-between cursor-pointer"
                  >
                    <span>✕ Excluir Ocorrência</span>
                    <span className="text-[10px] uppercase font-bold">
                      Irreversível
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
