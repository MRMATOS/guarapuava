// src/app/cidade-viva/_components/ReportDrawer.tsx
"use client";

import React, { useState, useTransition } from "react";
import type { Report, Category, UnifiedReportPoint, ReportStatus } from "../_lib/types";
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
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

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

  const handleUpdateStatus = (newStatus: ReportStatus) => {
    if (!primaryReport) return;
    startTransition(async () => {
      const res = await updateReportStatusAction(primaryReport.id, newStatus);
      if (!res.success) {
        alert(`Erro ao atualizar status: ${res.error}`);
        return;
      }
      onReportStatusUpdated?.(primaryReport.id, newStatus);
      setIsModeratorModalOpen(false);
    });
  };

  const handleDelete = () => {
    if (!primaryReport) return;
    const confirm = window.confirm(
      "Tem certeza que deseja excluir permanentemente esta ocorrência e sua foto?"
    );
    if (!confirm) return;

    startTransition(async () => {
      const res = await deleteReportAction(primaryReport.id);
      if (!res.success) {
        alert(`Erro ao excluir: ${res.error}`);
        return;
      }
      onReportDeleted?.(primaryReport.id);
      setIsModeratorModalOpen(false);
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
            aria-label="Fechar painel"
            className="w-7 h-7 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-bold text-sm shrink-0 cursor-pointer"
          >
            ✕
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
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-surface border border-rule text-ink">
                      {item.status.replace(/_/g, " ")}
                    </span>
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
            <button
              type="button"
              onClick={() => setIsModeratorModalOpen(true)}
              className="w-full py-2 px-3 text-xs font-bold rounded-lg border border-coral text-coral hover:bg-coral/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Opções do Moderador</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            {hasPrev && (
              <button
                type="button"
                onClick={onNavigatePrev}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-rule bg-surface text-ink hover:border-coral/50 transition-colors cursor-pointer"
                title="Ir para ocorrência anterior"
              >
                ← Anterior
              </button>
            )}

            <button
              type="button"
              onClick={handleShare}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                copied
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-surface border-rule text-ink hover:border-coral"
              }`}
            >
              <span>{copied ? "Link Copiado!" : "Compartilhar"}</span>
            </button>

            {hasNext && (
              <button
                type="button"
                onClick={onNavigateNext}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-rule bg-surface text-ink hover:border-coral/50 transition-colors cursor-pointer"
                title="Ir para próxima ocorrência"
              >
                Próxima →
              </button>
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
            <h3 className="font-bold text-ink text-sm">Moderação de Relato</h3>
            <p className="text-xs text-ink-muted">
              Altere o status ou exclua permanentemente a ocorrência:
            </p>
            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleUpdateStatus("confirmado_comunidade")}
                className="w-full py-2 text-xs font-semibold rounded-lg border border-rule text-ink hover:border-coral text-left px-3 cursor-pointer"
              >
                Confirmado pela Comunidade
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus("verificado_in_loco")}
                className="w-full py-2 text-xs font-semibold rounded-lg border border-rule text-ink hover:border-coral text-left px-3 cursor-pointer"
              >
                Verificado in loco
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus("resolvido")}
                className="w-full py-2 text-xs font-semibold rounded-lg border border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-left px-3 cursor-pointer"
              >
                Marcar como Resolvido
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="w-full py-2 text-xs font-bold rounded-lg border border-red-500 text-red-600 hover:bg-red-50 text-left px-3 cursor-pointer mt-2"
              >
                Excluir Relato e Foto
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsModeratorModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
