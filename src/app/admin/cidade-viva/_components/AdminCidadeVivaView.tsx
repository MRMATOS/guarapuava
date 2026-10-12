"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { Key } from "@/components/ui/Key";
import type { Report, Category, ReportStatus } from "@/app/cidade-viva/_lib/types";
import { clusterReportsByCategory } from "@/app/cidade-viva/_lib/clustering";
import { ReportItemActions } from "./ReportItemActions";
import { PhotoLightboxModal } from "./PhotoLightboxModal";

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

function maskIp(hashOrIp?: string | null): string {
  if (!hashOrIp) return "Não registrado";
  // Se for IP direto ou hash, mascara para preservar LGPD
  const parts = hashOrIp.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return hashOrIp.length > 8 ? `${hashOrIp.slice(0, 8)}...` : hashOrIp;
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

  // Filtragem
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

  const handleReportUpdated = useCallback((reportId: string, newStatus: ReportStatus) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
    );
  }, []);

  const handleReportDeleted = useCallback((reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Cabeçalho da Visão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Cidade Viva — Gestão e Moderação
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
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

      {/* Barra de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full">
        {/* 1. Status */}
        <CustomSelect
          value={statusFilter}
          onChange={(val) => setStatusFilter(val as StatusFilter)}
          defaultLabel={`Todos os Status (${statusCounts.todos})`}
          options={[
            { value: "todos", label: `Todos os Status (${statusCounts.todos})` },
            { value: "sugestivos", label: `Sugestivos (${statusCounts.sugestivos})` },
            { value: "verificados", label: `Verificados (${statusCounts.verificados})` },
            { value: "nao_verificados", label: `Não Verificados (${statusCounts.nao_verificados})` },
            { value: "resolvidos", label: `Resolvidos (${statusCounts.resolvidos})` },
            { value: "nao_resolvidos", label: `Não Resolvidos (${statusCounts.nao_resolvidos})` },
          ]}
        />

        {/* 2. Risco */}
        <CustomSelect
          value={riskFilter}
          onChange={(val) => setRiskFilter(val as RiskFilter)}
          defaultLabel="Todos os Riscos"
          options={[
            { value: "todos", label: "Todos os Riscos" },
            { value: "iniciais", label: `Iniciais (${riskCounts.iniciais})` },
            { value: "baixa", label: `Baixa (${riskCounts.baixa})` },
            { value: "media", label: `Média (${riskCounts.media})` },
            { value: "alta", label: `Alta (${riskCounts.alta})` },
          ]}
        />

        {/* 3. Cidade */}
        <CustomSelect
          value={cityFilter}
          onChange={(val) => setCityFilter(val)}
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

      {/* Lista de Relatos */}
      {filteredReports.length === 0 ? (
        <div className="surface-card p-10 text-center flex flex-col items-center justify-center gap-2">
          <p className="text-sm font-semibold text-ink">
            Nenhuma ocorrência encontrada com os filtros selecionados.
          </p>
          <p className="text-xs text-ink-muted">
            Tente redefinir os filtros acima para visualizar outros relatos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report) => {
            const cat = categoryMap.get(report.category_id);
            const riskInfo = reportRiskMap.get(report.id);

            return (
              <article
                key={report.id}
                className="surface-card p-5 flex flex-col justify-between gap-4 transition-all hover:border-coral/40"
              >
                <div className="flex flex-col gap-3">
                  {/* Linha Superior: Data, Categoria, Status e Risco */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule/40 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11.5px] font-semibold text-ink-muted tabular-time">
                        {formatDate(report.created_at)}
                      </span>

                      {cat && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                          style={{
                            backgroundColor: `${cat.color}15`,
                            color: cat.color,
                          }}
                        >
                          {cat.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Badge de Status */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                          report.status === "verificado_in_loco"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : report.status === "resolvido"
                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                            : "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
                        }`}
                      >
                        {report.status === "verificado_in_loco"
                          ? "Verificado"
                          : report.status === "resolvido"
                          ? "Resolvido"
                          : "Sugestivo"}
                      </span>

                      {/* Badge de Risco */}
                      {riskInfo && (
                        <span
                          className="px-2 py-0.5 rounded-md text-[10.5px] font-bold"
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

                  {/* Localização e Descrição */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
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
                        className="shrink-0 w-16 h-16 rounded-xl overflow-hidden cursor-pointer relative group border border-rule/60 hover:scale-105 transition-transform"
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
                </div>

                {/* Rodapé do Card: IP do autor e Ações */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-rule/40">
                  <span className="text-[11px] text-ink-muted">
                    IP: {maskIp(report.ip_hash)}
                  </span>

                  <ReportItemActions
                    report={report}
                    categoryName={cat?.name}
                    onReportUpdated={handleReportUpdated}
                    onReportDeleted={handleReportDeleted}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Lightbox */}
      <PhotoLightboxModal
        photoUrl={lightboxPhotoUrl}
        onClose={() => setLightboxPhotoUrl(null)}
      />
    </div>
  );
}
