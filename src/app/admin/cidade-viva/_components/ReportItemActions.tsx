// src/app/admin/cidade-viva/_components/ReportItemActions.tsx
"use client";

import React, { useState, useTransition } from "react";
import { Key } from "@/components/ui/Key";
import type { Report, ReportStatus, Category } from "@/app/cidade-viva/_lib/types";
import {
  updateReportStatusAction,
  deleteReportAction,
} from "@/app/cidade-viva/actions-admin";

interface ReportItemActionsProps {
  report: Report;
  category?: Category;
  onReportUpdated?: (reportId: string, newStatus: ReportStatus) => void;
  onReportDeleted?: (reportId: string) => void;
  onFocusMap?: (report: Report) => void;
}

type ConfirmActionType =
  | "verificado"
  | "sugestivo"
  | "resolvido"
  | "excluir"
  | null;

export function ReportItemActions({
  report,
  category,
  onReportUpdated,
  onReportDeleted,
  onFocusMap,
}: ReportItemActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionType>(null);
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    if (isPending) return;
    setIsOpen(false);
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
        handleClose();
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
      handleClose();
    });
  };

  return (
    <div className="w-full flex flex-col gap-3 pt-2.5 border-t border-rule/40">
      {/* Linha dos Botões e Categoria (ocupando toda a largura do rodapé do card) */}
      <div className="flex items-center justify-between gap-2 w-full">
        {/* Categoria na linha de baixo, à esquerda */}
        <div className="min-w-0">
          {category && (
            <span
              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-block truncate max-w-[150px] sm:max-w-[180px]"
              style={{
                backgroundColor: `${category.color}15`,
                color: category.color,
              }}
            >
              {category.name}
            </span>
          )}
        </div>

        {/* Botões à direita */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onFocusMap?.(report)}
            className="key px-3 py-1.5 text-xs font-semibold hover:border-coral transition-colors whitespace-nowrap cursor-pointer"
            title="Focalizar ocorrência no mapa"
          >
            No Mapa
          </button>

          <Key
            type="button"
            onClick={() => {
              setIsOpen((prev) => !prev);
              setConfirmAction(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer ${
              isOpen ? "border-coral font-bold" : ""
            }`}
            title="Abrir opções de moderação"
          >
            {isOpen ? "Fechar" : "Opções"}
          </Key>
        </div>
      </div>

      {/* Painel de Moderação em Largura Total (w-full) abaixo de toda a linha */}
      {isOpen && (
        <div className="w-full pt-3 border-t border-rule/40 flex flex-col gap-2.5">
          {/* Cabeçalho do Painel */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Moderar Ocorrência
            </span>
          </div>

          {/* Tela de Confirmação Inline */}
          {confirmAction ? (
            <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-canvas border border-rule/60 w-full">
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

              <div className="flex items-center justify-end gap-2 pt-1">
                <Key
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  disabled={isPending}
                  className="px-3 py-1 text-xs font-semibold"
                >
                  Voltar
                </Key>

                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={isPending}
                  className={`key px-3.5 py-1 text-xs font-bold rounded-xl cursor-pointer ${
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
            /* Lista de Opções Sem Ícones com Largura Total */
            <div className="flex flex-col gap-1.5 w-full">
              {report.status !== "verificado_in_loco" && (
                <button
                  type="button"
                  onClick={() => setConfirmAction("verificado")}
                  className="w-full text-left p-2.5 rounded-xl border border-rule/60 hover:border-emerald-500 bg-canvas transition-colors text-xs font-semibold text-ink flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="truncate">Marcar como Verificado in loco</span>
                  <span className="text-[10px] text-emerald-600 font-bold shrink-0">
                    Aprovado
                  </span>
                </button>
              )}

              {report.status !== "resolvido" && (
                <button
                  type="button"
                  onClick={() => setConfirmAction("resolvido")}
                  className="w-full text-left p-2.5 rounded-xl border border-rule/60 hover:border-blue-500 bg-canvas transition-colors text-xs font-semibold text-ink flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="truncate">Marcar como Resolvido</span>
                  <span className="text-[10px] text-blue-600 font-bold shrink-0">
                    Concluído
                  </span>
                </button>
              )}

              {report.status !== "sugestivo" && (
                <button
                  type="button"
                  onClick={() => setConfirmAction("sugestivo")}
                  className="w-full text-left p-2.5 rounded-xl border border-rule/60 hover:border-yellow-500 bg-canvas transition-colors text-xs font-semibold text-ink flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="truncate">Manter como Sugestivo</span>
                  <span className="text-[10px] text-yellow-600 font-bold shrink-0">
                    Pendente
                  </span>
                </button>
              )}

              <div className="pt-1.5 border-t border-rule/40 mt-0.5">
                <button
                  type="button"
                  onClick={() => setConfirmAction("excluir")}
                  className="w-full text-left p-2.5 rounded-xl border border-red-500/30 hover:border-red-500 hover:bg-red-500/10 transition-colors text-xs font-bold text-red-600 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="truncate">Excluir Ocorrência</span>
                  <span className="text-[10px] uppercase font-bold shrink-0">
                    Irreversível
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
