// src/app/admin/cidade-viva/_components/AdminCidadeVivaView.tsx
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import nextDynamic from "next/dynamic";
import type {
  Report,
  Category,
  ReportStatus,
  UnifiedReportPoint,
} from "@/app/cidade-viva/_lib/types";
import { clusterReportsByCategory } from "@/app/cidade-viva/_lib/clustering";
import { ReportItemActions } from "./ReportItemActions";
import { PhotoLightboxModal } from "./PhotoLightboxModal";

// Importação dinâmica do mapa para evitar erros de SSR no MapLibre GL
const AdminMap = nextDynamic(
  () => import("./AdminMap").then((mod) => mod.AdminMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[360px] flex flex-col items-center justify-center bg-canvas gap-2">
        <div className="w-6 h-6 rounded-full border-2 border-coral border-t-transparent animate-spin" />
        <span className="text-xs font-semibold text-ink-muted">
          Carregando mapa...
        </span>
      </div>
    ),
  }
);

interface AdminCidadeVivaViewProps {
  initialReports: Report[];
  categories: Category[];
}

type StatusFilter =
  | "todos"
  | "sugestivos"
  | "verificados"
  | "nao_verificados"
  | "resolvidos"
  | "nao_resolvidos";

type RiskFilter = "todos" | "iniciais" | "baixa" | "media" | "alta";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: CustomSelectOption[];
  defaultLabel: string;
}

function CustomSelect({
  value,
  onChange,
  options,
  defaultLabel,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);
  const isDefault =
    !selectedOption || selectedOption.value === "todos" || selectedOption.value === "todas";

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`key w-full px-3 py-2 text-xs font-semibold flex items-center justify-between gap-1.5 cursor-pointer truncate ${
          !isDefault ? "border-coral font-bold" : ""
        }`}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : defaultLabel}</span>
        <span className="text-[10px] opacity-60 ml-1">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 z-50 bg-canvas border border-rule/80 rounded-xl shadow-xl py-1 max-h-60 overflow-y-auto w-full min-w-[180px]">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs font-medium cursor-pointer flex items-center justify-between gap-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors ${
                  isSelected ? "font-bold text-coral" : "text-ink"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <span className="text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminCidadeVivaView({
  initialReports,
  categories,
}: AdminCidadeVivaViewProps) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("todos");
  const [cityFilter, setCityFilter] = useState<string>("todas");
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState<string | null>(null);

  // Ponto selecionado no mapa para filtrar a lista da direita
  const [selectedPoint, setSelectedPoint] = useState<UnifiedReportPoint | null>(null);

  // Relato focalizado a partir do botão "No Mapa" de um card
  const [focusedReport, setFocusedReport] = useState<Report | null>(null);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Agrupamento de risco por proximidade (100m por categoria)
  const reportRiskMap = useMemo(() => {
    const map = new Map<
      string,
      {
        risk: "iniciais" | "baixa" | "media" | "alta";
        count: number;
        color: string;
        label: string;
      }
    >();

    const clusters = clusterReportsByCategory(reports, categoryMap, 100);

    for (const cluster of clusters) {
      const count = cluster.report_count;
      let risk: "iniciais" | "baixa" | "media" | "alta" = "iniciais";
      let label = "Iniciais";

      if (count >= 10) {
        risk = "alta";
        label = "Alta";
      } else if (count >= 6) {
        risk = "media";
        label = "Média";
      } else if (count >= 3) {
        risk = "baixa";
        label = "Baixa";
      }

      for (const r of cluster.reports) {
        map.set(r.id, {
          risk,
          count,
          color: cluster.color,
          label,
        });
      }
    }

    return map;
  }, [reports, categoryMap]);

  // Cidades únicas
  const cities = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      const c = r.city?.trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [reports]);

  // Contadores de status
  const statusCounts = useMemo(() => {
    return {
      todos: reports.length,
      sugestivos: reports.filter((r) => r.status === "sugestivo").length,
      verificados: reports.filter((r) => r.status === "verificado_in_loco").length,
      nao_verificados: reports.filter((r) => r.status !== "verificado_in_loco").length,
      resolvidos: reports.filter((r) => r.status === "resolvido").length,
      nao_resolvidos: reports.filter((r) => r.status !== "resolvido").length,
    };
  }, [reports]);

  // Contadores de risco
  const riskCounts = useMemo(() => {
    let iniciais = 0;
    let baixa = 0;
    let media = 0;
    let alta = 0;

    reports.forEach((r) => {
      const info = reportRiskMap.get(r.id);
      if (!info || info.risk === "iniciais") iniciais++;
      else if (info.risk === "baixa") baixa++;
      else if (info.risk === "media") media++;
      else if (info.risk === "alta") alta++;
    });

    return { iniciais, baixa, media, alta };
  }, [reports, reportRiskMap]);

  // Filtragem geral pelos selects
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter === "sugestivos" && r.status !== "sugestivo") return false;
      if (statusFilter === "verificados" && r.status !== "verificado_in_loco") return false;
      if (statusFilter === "nao_verificados" && r.status === "verificado_in_loco") return false;
      if (statusFilter === "resolvidos" && r.status !== "resolvido") return false;
      if (statusFilter === "nao_resolvidos" && r.status === "resolvido") return false;

      if (riskFilter !== "todos") {
        const info = reportRiskMap.get(r.id);
        const rRisk = info?.risk || "iniciais";
        if (rRisk !== riskFilter) return false;
      }

      if (cityFilter !== "todas") {
        if (r.city?.trim().toLowerCase() !== cityFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [reports, statusFilter, riskFilter, cityFilter, reportRiskMap]);

  // Se houver um ponto selecionado no mapa, exibe apenas os relatos desse ponto
  const displayedReports = useMemo(() => {
    if (!selectedPoint) {
      return filteredReports;
    }
    const pointReportIds = new Set(selectedPoint.reports.map((r) => r.id));
    return filteredReports.filter((r) => pointReportIds.has(r.id));
  }, [filteredReports, selectedPoint]);

  const handleReportUpdated = useCallback((reportId: string, newStatus: ReportStatus) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
    );
  }, []);

  const handleReportDeleted = useCallback((reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    if (selectedPoint && selectedPoint.reports.some((r) => r.id === reportId)) {
      setSelectedPoint((prev) =>
        prev
          ? {
              ...prev,
              reports: prev.reports.filter((r) => r.id !== reportId),
              report_count: prev.report_count - 1,
            }
          : null
      );
    }
  }, [selectedPoint]);

  const handleFocusMap = useCallback((report: Report) => {
    setFocusedReport(report);
    // Também seleciona o ponto correspondente
    setSelectedPoint({
      id: report.id,
      category_id: report.category_id,
      category_name: categoryMap.get(report.category_id)?.name || "",
      latitude: report.latitude,
      longitude: report.longitude,
      report_count: 1,
      color: categoryMap.get(report.category_id)?.color || "#ff4742",
      reports: [report],
      latest_report: report,
    });
  }, [categoryMap]);

  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full h-full">
      {/* Cabeçalho da Visão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Cidade Viva — Gestão e Moderação
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
            Auditoria, confirmação in loco e resolução de ocorrências comunitárias.
          </p>
        </div>

        <Link
          href="/cidade-viva/mapa"
          target="_blank"
          className="key px-4 py-2 text-xs font-bold hover:border-coral transition-colors self-start sm:self-auto inline-flex items-center gap-1.5"
        >
          <span>Abrir Mapa Público</span>
          <span>↗</span>
        </Link>
      </div>

      {/* Barra de Filtros — Alinhada com a largura do mapa (2 selects) e dos cards (1 select) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3 w-full shrink-0">
        {/* Esquerda: 2 Selects com a mesma largura do mapa */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {/* 1. Status */}
          <CustomSelect
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val as StatusFilter);
              setSelectedPoint(null);
            }}
            defaultLabel={`Todos os Status (${statusCounts.todos})`}
            options={[
              { value: "todos", label: `Todos os Status (${statusCounts.todos})` },
              { value: "sugestivos", label: `Não Confirmados (${statusCounts.sugestivos})` },
              { value: "verificados", label: `Verificados (${statusCounts.verificados})` },
              { value: "nao_verificados", label: `Não Verificados (${statusCounts.nao_verificados})` },
              { value: "resolvidos", label: `Resolvidos (${statusCounts.resolvidos})` },
              { value: "nao_resolvidos", label: `Não Resolvidos (${statusCounts.nao_resolvidos})` },
            ]}
          />

          {/* 2. Risco */}
          <CustomSelect
            value={riskFilter}
            onChange={(val) => {
              setRiskFilter(val as RiskFilter);
              setSelectedPoint(null);
            }}
            defaultLabel="Todos os Riscos"
            options={[
              { value: "todos", label: "Todos os Riscos" },
              { value: "iniciais", label: `Iniciais (${riskCounts.iniciais})` },
              { value: "baixa", label: `Baixa (${riskCounts.baixa})` },
              { value: "media", label: `Média (${riskCounts.media})` },
              { value: "alta", label: `Alta (${riskCounts.alta})` },
            ]}
          />
        </div>

        {/* Direita: 1 Select com a mesma largura da coluna de cards */}
        <div className="lg:col-span-1">
          {/* 3. Cidade */}
          <CustomSelect
            value={cityFilter}
            onChange={(val) => {
              setCityFilter(val);
              setSelectedPoint(null);
            }}
            defaultLabel="Todas as Cidades"
            options={[
              { value: "todas", label: "Todas as Cidades" },
              ...cities.map((city) => ({
                value: city,
                label: `${city} (${reports.filter((r) => r.city?.trim().toLowerCase() === city.toLowerCase()).length})`,
              })),
            ]}
          />
        </div>
      </div>

      {/* Conteúdo Principal: Mapa à esquerda (2 colunas) e Cards à direita (1 coluna com scroll próprio) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 w-full flex-1 min-h-0">
        {/* Lado Esquerdo: Mapa Interativo do Admin */}
        <div className="lg:col-span-2 h-[340px] sm:h-[420px] lg:h-[calc(100vh-230px)] min-h-[360px] rounded-2xl overflow-hidden surface-card border border-rule/70 relative">
          <AdminMap
            reports={filteredReports}
            categories={categories}
            selectedPointId={selectedPoint?.id || null}
            onSelectPoint={setSelectedPoint}
            focusedReport={focusedReport}
          />
        </div>

        {/* Lado Direito: Coluna de Reports com Scroll Independente */}
        <div className="lg:col-span-1 flex flex-col h-[480px] lg:h-[calc(100vh-230px)] min-h-0 overflow-hidden">
          {/* Barra de Status da Seleção */}
          <div className="flex items-center justify-between gap-2 pb-2.5 shrink-0 border-b border-rule/40 mb-3">
            <span className="text-xs font-bold text-ink">
              {selectedPoint
                ? `Ponto no Mapa (${displayedReports.length} ${displayedReports.length === 1 ? "ocorrência" : "ocorrências"})`
                : `Ocorrências (${displayedReports.length})`}
            </span>

            {selectedPoint && (
              <button
                type="button"
                onClick={() => setSelectedPoint(null)}
                className="text-[11px] font-bold text-coral hover:underline cursor-pointer"
              >
                Ver todas
              </button>
            )}
          </div>

          {/* Lista com scroll independente apenas nesta coluna */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3.5">
            {displayedReports.length === 0 ? (
              <div className="surface-card p-8 text-center flex flex-col items-center justify-center gap-2">
                <p className="text-xs font-semibold text-ink">
                  Nenhuma ocorrência encontrada.
                </p>
                <p className="text-[11px] text-ink-muted">
                  Tente alterar os filtros ou clique no mapa para ver outros locais.
                </p>
                {selectedPoint && (
                  <button
                    type="button"
                    onClick={() => setSelectedPoint(null)}
                    className="key px-3 py-1 text-xs font-semibold mt-2 cursor-pointer"
                  >
                    Limpar seleção do mapa
                  </button>
                )}
              </div>
            ) : (
              displayedReports.map((report) => {
                const cat = categoryMap.get(report.category_id);
                const riskInfo = reportRiskMap.get(report.id);
                const isPointSelected = selectedPoint?.id === report.id || selectedPoint?.reports.some((r) => r.id === report.id);

                return (
                  <article
                    key={report.id}
                    className={`surface-card p-4 sm:p-4.5 flex flex-col gap-3 transition-all hover:border-coral/50 ${
                      isPointSelected ? "border-coral ring-1 ring-coral/40" : ""
                    }`}
                  >
                    {/* Linha Superior: Data (esquerda) | Status e Risco (direita) */}
                    <div className="flex items-center justify-between gap-2 border-b border-rule/30 pb-2">
                      <span className="text-[11px] font-semibold text-ink-muted tabular-time">
                        {formatDate(report.created_at)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* Badge de Status */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            report.status === "verificado_in_loco"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : report.status === "resolvido"
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              : report.status === "confirmado_comunidade"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
                          }`}
                        >
                          {report.status === "verificado_in_loco"
                            ? "Verificado"
                            : report.status === "resolvido"
                            ? "Resolvido"
                            : report.status === "confirmado_comunidade"
                            ? "Comunidade"
                            : "Não confirmado"}
                        </span>

                        {/* Badge de Risco */}
                        {riskInfo && (
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                            style={{
                              backgroundColor: `${riskInfo.color}15`,
                              color: riskInfo.color,
                            }}
                            title={`Concentração: ${riskInfo.count} relato(s) nesta área`}
                          >
                            Risco: {riskInfo.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Categoria: abaixo da linha divisória e acima do endereço */}
                    {cat && (
                      <div>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-block truncate max-w-[220px]"
                          style={{
                            backgroundColor: `${cat.color}15`,
                            color: cat.color,
                          }}
                        >
                          {cat.name}
                        </span>
                      </div>
                    )}

                    {/* Localização e Descrição */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <p className="text-xs font-bold text-ink truncate">
                          {report.address || "Endereço não identificado"}
                          {report.city ? ` — ${report.city}` : ""}
                        </p>

                        <p className="text-xs text-ink-body leading-relaxed whitespace-pre-wrap">
                          {report.description || "Sem descrição adicional informada."}
                        </p>
                      </div>

                      {/* Miniatura da Foto com Lightbox */}
                      {report.photo_url && (
                        <button
                          type="button"
                          onClick={() => setLightboxPhotoUrl(report.photo_url)}
                          className="shrink-0 w-14 h-14 rounded-xl overflow-hidden cursor-pointer relative group border border-rule/60 hover:scale-105 transition-transform"
                          title="Clique para ampliar a fotografia"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={report.photo_url}
                            alt="Foto da ocorrência"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      )}
                    </div>

                    {/* Rodapé do Card: Botões de Ação ocupando a linha inteira e Moderação */}
                    <ReportItemActions
                      report={report}
                      onReportUpdated={handleReportUpdated}
                      onReportDeleted={handleReportDeleted}
                      onFocusMap={handleFocusMap}
                    />
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal Lightbox de Fotografias */}
      <PhotoLightboxModal
        photoUrl={lightboxPhotoUrl}
        onClose={() => setLightboxPhotoUrl(null)}
      />
    </div>
  );
}
