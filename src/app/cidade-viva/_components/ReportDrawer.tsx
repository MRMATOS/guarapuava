// src/app/cidade-viva/_components/ReportDrawer.tsx
"use client";

import React, { useState, useTransition } from "react";
import type { Report, Category, UnifiedReportPoint, ReportStatus } from "../_lib/types";
import { formatReportStatus } from "../_lib/types";
import { Key } from "@/components/ui/Key";
import { updateReportStatusAction, deleteReportAction } from "../actions-admin";

interface ReportDrawerProps {
  report: Report | null;
  unifiedPoint?: UnifiedReportPoint | null;
  categories: Category[];
  onClose: () => void;
  isAdmin?: boolean;
  onReportStatusUpdated?: (reportId: string, newStatus: ReportStatus) => void;
  onReportDeleted?: (reportId: string) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  totalPointsCount?: number;
}

function formatReportDate(isoString: string): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function ReportDrawer({
  report: initialReport,
  unifiedPoint,
  categories,
  onClose,
  isAdmin = false,
  onReportStatusUpdated,
  onReportDeleted,
  onNavigatePrev,
  onNavigateNext,
  hasPrev = false,
  hasNext = false,
}: ReportDrawerProps) {
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState<string | null>(null);
  const [isModeratorModalOpen, setIsModeratorModalOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const reportList = unifiedPoint?.reports || (initialReport ? [initialReport] : []);
  const primaryReport = reportList[0] || initialReport;

  if (!primaryReport) return null;

  const category = categories.find((c) => c.id === primaryReport.category_id) || {
    id: primaryReport.category_id,
    name: unifiedPoint?.category_name || "Problema Urbano",
    severity: "medio" as const,
    color: "#71717A",
    icon: "AlertTriangle",
    is_active: true,
    sort_order: 0,
  };

  const count = unifiedPoint?.report_count || reportList.length || 1;
  const pinColor =
    unifiedPoint?.color ||
    (count >= 10
      ? "#EF4444"
      : count >= 6
      ? "#F97316"
      : count >= 3
      ? "#FACC15"
      : "#71717A");

  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("id", primaryReport.id);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenModerator = () => {
    setModalError(null);
    setIsConfirmingDelete(false);
    setIsModeratorModalOpen(true);
  };

  const handleCloseModeratorModal = () => {
    if (isPending) return;
    setIsModeratorModalOpen(false);
    setIsConfirmingDelete(false);
    setModalError(null);
  };

  const handleUpdateStatus = (newStatus: ReportStatus) => {
    if (!primaryReport) return;
    setModalError(null);
    startTransition(async () => {
      const res = await updateReportStatusAction(primaryReport.id, newStatus);
      if (!res.success) {
        setModalError(`Erro ao atualizar status: ${res.error}`);
        return;
      }
      onReportStatusUpdated?.(primaryReport.id, newStatus);
      handleCloseModeratorModal();
    });
  };

  const handleExecuteDelete = () => {
    if (!primaryReport) return;
    setModalError(null);
    startTransition(async () => {
      const res = await deleteReportAction(primaryReport.id);
      if (!res.success) {
        setModalError(`Erro ao excluir: ${res.error}`);
        return;
      }
      onReportDeleted?.(primaryReport.id);
      handleCloseModeratorModal();
    });
  };

  return (
    <>
      {/* Overlay translúcido no mobile */}
      <div
        className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Painel Tátil / Gaveta */}
      <aside
        className={`
          z-40 bg-canvas border border-rule/70 dark:border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-xl
          fixed bottom-3 left-3 right-3 max-h-[82dvh]
          md:fixed md:left-6 md:bottom-6 md:right-auto md:w-[380px] md:max-h-[calc(100%-3rem)]
        `}
      >
        {/* Cabeçalho */}
        <div className="p-4 border-b border-rule/50 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 mt-1 shadow-xs"
              style={{ backgroundColor: pinColor }}
            />
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-ink leading-tight truncate">
                {category.name}
              </h2>
              <span className="text-[11px] font-medium text-ink-muted block mt-0.5">
                {count === 1
                  ? "1 relato registrado no local"
                  : `${count} relatos comunitários unificados`}
              </span>
              <p className="text-xs text-ink-body font-medium mt-1 leading-snug truncate">
                {primaryReport.address || "Localização registrada via GPS"}
              </p>
              {(primaryReport.city || primaryReport.state) && (
                <p className="text-[10.5px] text-ink-muted truncate">
                  {[primaryReport.city, primaryReport.state].filter(Boolean).join(" - ")}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors shrink-0"
          >
            Fechar
          </button>
        </div>

        {/* Lista de Relatos */}
        <div className="overflow-y-auto flex-1 min-h-0 p-3.5 space-y-2.5">
          {reportList.map((item, index) => {
            const dateStr = formatReportDate(item.created_at);
            return (
              <div
                key={item.id || index}
                className="p-3 rounded-xl border border-rule/60 bg-surface/80 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-ink-muted">
                  <span>{dateStr || `Relato #${index + 1}`}</span>
                  {item.status && (
                    <span>{formatReportStatus(item.status)}</span>
                  )}
                </div>

                <div className="flex items-start gap-2.5">
                  <p className="text-xs text-ink-body leading-relaxed whitespace-pre-wrap flex-1 min-w-0">
                    {item.description || "Sem observações adicionais."}
                  </p>

                  {item.photo_url && (
                    <button
                      type="button"
                      onClick={() => setLightboxPhotoUrl(item.photo_url)}
                      className="shrink-0 w-14 h-14 rounded-lg overflow-hidden cursor-pointer relative group border border-rule bg-neutral-900"
                      title="Clique para ampliar a foto"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.photo_url}
                        alt="Foto da ocorrência"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé Fixo */}
        <div className="p-3 border-t border-rule/50 flex flex-col gap-2 shrink-0 bg-background/50">
          {isAdmin && (
            <Key
              variant="coral"
              onClick={handleOpenModerator}
              className="w-full !h-10 text-xs font-bold justify-center"
            >
              Opções do Moderador
            </Key>
          )}

          <div className="flex items-center gap-2">
            <Key
              type="button"
              onClick={handleShare}
              className="flex-1 !h-10 text-xs font-semibold justify-center truncate"
            >
              {copied ? "Link Copiado!" : "Compartilhar"}
            </Key>

            {hasPrev && (
              <Key
                type="button"
                onClick={onNavigatePrev}
                className="!h-10 px-3 text-xs font-semibold shrink-0"
                title="Ir para ocorrência anterior"
              >
                ← Anterior
              </Key>
            )}

            {hasNext && (
              <Key
                type="button"
                onClick={onNavigateNext}
                className="!h-10 px-3 text-xs font-semibold shrink-0"
                title="Ir para próxima ocorrência"
              >
                Próximo →
              </Key>
            )}
          </div>
        </div>
      </aside>

      {/* Lightbox da Foto */}
      {lightboxPhotoUrl && (
        <div
          className="fixed inset-0 z-[180] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxPhotoUrl(null)}
        >
          <div className="relative max-w-lg max-h-[85vh] overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxPhotoUrl}
              alt="Foto ampliada da ocorrência"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Modal de Moderação Admin */}
      {isModeratorModalOpen && (
        <div className="fixed inset-0 z-[190] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-canvas border border-rule/70 dark:border-white/10 rounded-2xl shadow-none max-w-sm w-full p-5 flex flex-col gap-3">
            {isConfirmingDelete ? (
              /* Confirmação de Exclusão no Design System */
              <div className="flex flex-col gap-3">
                <h3 className="font-bold text-ink text-sm">
                  Excluir relato permanentemente?
                </h3>
                <p className="text-xs text-ink-body leading-relaxed">
                  Esta ocorrência e sua fotografia serão removidas em definitivo do banco de dados e do mapa. Esta ação não pode ser desfeita.
                </p>

                {modalError && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium">
                    {modalError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-rule/40">
                  <Key
                    type="button"
                    onClick={() => {
                      setIsConfirmingDelete(false);
                      setModalError(null);
                    }}
                    disabled={isPending}
                    className="!h-8 px-3 text-xs font-semibold disabled:opacity-50"
                  >
                    Voltar
                  </Key>
                  <button
                    type="button"
                    onClick={handleExecuteDelete}
                    disabled={isPending}
                    className="key key--coral !h-8 px-3.5 text-xs font-bold !bg-red-600 hover:!bg-red-700 !text-white cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? "Excluindo..." : "Confirmar Exclusão"}
                  </button>
                </div>
              </div>
            ) : (
              /* Menu Principal de Opções de Moderação */
              <>
                <h3 className="font-bold text-ink text-sm">Moderação de Relato</h3>
                <p className="text-xs text-ink-muted">
                  Altere o status ou exclua permanentemente a ocorrência:
                </p>

                {modalError && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium">
                    {modalError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 pt-1">
                  {primaryReport.status !== "sugestivo" && (
                    <Key
                      type="button"
                      disabled={isPending}
                      onClick={() => handleUpdateStatus("sugestivo")}
                      className="w-full !h-9 text-xs font-semibold !justify-start text-left px-3 disabled:opacity-50"
                    >
                      Manter como Não confirmado
                    </Key>
                  )}
                  <Key
                    type="button"
                    disabled={isPending}
                    onClick={() => handleUpdateStatus("confirmado_comunidade")}
                    className="w-full !h-9 text-xs font-semibold !justify-start text-left px-3 disabled:opacity-50"
                  >
                    Confirmado pela Comunidade
                  </Key>
                  <Key
                    type="button"
                    disabled={isPending}
                    onClick={() => handleUpdateStatus("verificado_in_loco")}
                    className="w-full !h-9 text-xs font-semibold !justify-start text-left px-3 disabled:opacity-50"
                  >
                    Verificado in loco
                  </Key>
                  <Key
                    type="button"
                    disabled={isPending}
                    onClick={() => handleUpdateStatus("resolvido")}
                    className="w-full !h-9 text-xs font-semibold !justify-start text-left px-3 !text-emerald-600 dark:!text-emerald-400 disabled:opacity-50"
                  >
                    Marcar como Resolvido
                  </Key>
                  <Key
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setModalError(null);
                      setIsConfirmingDelete(true);
                    }}
                    className="w-full !h-9 text-xs font-bold !justify-start text-left px-3 !text-red-600 dark:!text-red-400 mt-1 disabled:opacity-50"
                  >
                    Excluir Relato e Foto
                  </Key>
                </div>
                <div className="flex justify-end pt-2">
                  <Key
                    type="button"
                    onClick={handleCloseModeratorModal}
                    disabled={isPending}
                    className="!h-8 px-3 text-xs font-semibold disabled:opacity-50"
                  >
                    Cancelar
                  </Key>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
