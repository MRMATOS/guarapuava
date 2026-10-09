"use client";

import React, { useMemo, useRef } from "react";
import { Eye } from "lucide-react";
import { JobOpening } from "@/types/job";
import { MainNav } from "@/components/ui/MainNav";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { FilterIndicator } from "@/components/ui/FilterIndicator";
import { Presence } from "@/components/ui/Presence";
import { Key } from "@/components/ui/Key";
import {
  getTodayDateString,
  getLatestJobUpdateDate,
  formatRelativeUpdateText,
} from "@/lib/utils/date";
import { filterJobs } from "@/lib/utils/search";
import { JobCardSkeleton } from "@/components/ui/JobCardSkeleton";

interface JobsFeedProps {
  jobs: JobOpening[];
  isLoading?: boolean;
  onSelectJob: (job: JobOpening) => void;
  onSelectNoticias: () => void;
  onSelectInfo?: () => void;
  lastUpdated?: string;

  // Estados e manipuladores dos filtros
  searchQuery: string;
  onSearchChange: (query: string) => void;
  contractState: number;
  onCycleContract: () => void;
  pcdState: number;
  onCyclePcd: () => void;
  experienceState: number;
  onCycleExperience: () => void;
  favoritesOnly?: boolean;
  onToggleFavoritesOnly?: () => void;
  favoriteJobIds?: string[];
  viewedJobIds?: string[];
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  onCloseFilter: () => void;
  onResetFilters: () => void;
}

export const JobsFeed: React.FC<JobsFeedProps> = ({
  jobs,
  isLoading = false,
  onSelectJob,
  onSelectNoticias,
  onSelectInfo,
  lastUpdated,
  searchQuery,
  onSearchChange,
  contractState,
  onCycleContract,
  pcdState,
  onCyclePcd,
  experienceState,
  onCycleExperience,
  favoritesOnly = false,
  onToggleFavoritesOnly,
  favoriteJobIds = [],
  viewedJobIds = [],
  isFilterOpen,
  onToggleFilter,
  onCloseFilter,
  onResetFilters,
}) => {
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  const todayDisplay = useMemo(() => getTodayDateString(), []);

  const lastUpdatedDisplay = useMemo(() => {
    if (lastUpdated) {
      return formatRelativeUpdateText(lastUpdated);
    }
    const latestDate = getLatestJobUpdateDate(jobs);
    return formatRelativeUpdateText(latestDate);
  }, [jobs, lastUpdated]);

  // Aplica a busca universal e os botões combináveis
  const filteredJobs = useMemo(() => {
    return filterJobs(jobs, {
      query: searchQuery,
      contractState,
      pcdState,
      experienceState,
      favoritesOnly,
      favoriteJobIds,
    });
  }, [jobs, searchQuery, contractState, pcdState, experienceState, favoritesOnly, favoriteJobIds]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    contractState !== 0 ||
    pcdState !== 0 ||
    experienceState !== 0 ||
    Boolean(favoritesOnly);

  return (
    <div className="page-shell">
      {/* Título semântico para acessibilidade/SEO */}
      <h1 className="sr-only">Vagas em Guarapuava</h1>

      {/* Card compacto com data de hoje e status da última atualização */}
      <div className="surface-card w-full px-5 py-3.5 sm:px-6 sm:py-4 mb-4 flex items-center justify-between tracking-tight tabular-time">
        <span className="font-semibold text-ink text-[15px]">
          {todayDisplay}
        </span>
        <span className="badge-inset">
          <span
            className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse"
            aria-hidden="true"
          />
          {lastUpdatedDisplay}
        </span>
      </div>

      {/* Lista de cartões de vagas ou Estado Vazio */}
      {filteredJobs.length > 0 ? (
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const isViewed = Boolean(
              viewedJobIds &&
                ((job.id && viewedJobIds.includes(job.id)) ||
                  (job.externalId && viewedJobIds.includes(job.externalId)))
            );

            return (
              <article
                key={job.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectJob(job)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectJob(job);
                  }
                }}
                aria-label={`Ver detalhes da vaga: ${job.title}`}
                className="surface-card w-full p-5 sm:p-6 cursor-pointer transition-transform duration-150 active:scale-[0.99] touch-manipulation select-none"
              >
                {/* 1. Título da vaga */}
                <h2 className="text-[15px] font-bold text-ink leading-[1.35] tracking-[-0.015em] mb-2 text-balance">
                  {job.title}
                </h2>

                {/* 2. Nome da empresa */}
                <p className="text-[14px] sm:text-[14.5px] text-ink-muted leading-[1.4]">
                  <strong className="font-semibold text-ink-body">
                    Empresa:
                  </strong>{" "}
                  <span>{job.company}</span>
                </p>

                {/* 3. Data de publicação alinhada à esquerda e tag visualizada à direita */}
                <div className="mt-3 pt-1 flex items-center justify-between gap-2">
                  <p className="text-[14px] sm:text-[14.5px] text-ink-muted leading-[1.4]">
                    <strong className="font-semibold text-ink-body">
                      Publicada em:
                    </strong>{" "}
                    <span className="tabular-time">{job.publishedDate}</span>
                  </p>

                  {isViewed && (
                    <span className="badge-inset flex items-center gap-1.5 text-[12px] font-medium text-ink-body shrink-0">
                      <Eye
                        className="w-3.5 h-3.5 text-coral shrink-0"
                        strokeWidth={2.2}
                        aria-hidden="true"
                      />
                      <span>visualizada</span>
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : isLoading && jobs.length === 0 ? (
        <div className="w-full space-y-4">
          <JobCardSkeleton />
          <JobCardSkeleton />
          <JobCardSkeleton />
          <JobCardSkeleton />
        </div>
      ) : !hasActiveFilters && jobs.length === 0 ? (
        <div className="surface-card w-full py-12 px-6 text-center text-ink-muted text-[15px]">
          <p className="font-semibold text-ink mb-1.5">
            Nenhuma vaga disponível no momento
          </p>
          <p className="text-[12.5px] text-ink-muted mb-5 max-w-[280px] mx-auto leading-relaxed">
            Não encontramos vagas ativas no banco de dados agora. Tente recarregar.
          </p>
          <Key onClick={() => window.location.reload()} className="mx-auto">
            Recarregar página
          </Key>
        </div>
      ) : (
        <div className="surface-card w-full p-8 text-center text-ink-muted text-[15px]">
          <p className="font-semibold text-ink mb-1.5">
            Nenhuma vaga encontrada
          </p>
          <p className="text-[12.5px] text-ink-muted mb-5 max-w-[280px] mx-auto leading-relaxed">
            Nenhum resultado corresponde aos filtros selecionados. Tente
            modificar a palavra-chave ou os filtros acima.
          </p>
          <Key onClick={onResetFilters} className="mx-auto">
            Limpar todos os filtros
          </Key>
        </div>
      )}

      {/* Footer com navegação principal padrão e bloco de filtros flutuante */}
      <MainNav
        active="vagas"
        onNoticias={onSelectNoticias}
        onVagas={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onSelectInfo={onSelectInfo}
        isFilterOpen={isFilterOpen}
        onToggleFilter={onToggleFilter}
        onCloseFilter={onCloseFilter}
        filterButtonRef={filterButtonRef}
        above={
          <Presence isVisible={hasActiveFilters} duration={180}>
            <FilterIndicator
              label={
                <span>
                  Exibindo{" "}
                  <strong className="text-ink font-bold">
                    {filteredJobs.length}
                  </strong>{" "}
                  {filteredJobs.length === 1
                    ? "vaga encontrada"
                    : "vagas encontradas"}
                </span>
              }
              onClear={onResetFilters}
            />
          </Presence>
        }
        filterPanel={
          <Presence isVisible={isFilterOpen} duration={180}>
            <FilterPanel
              mode="vagas"
              onClose={onCloseFilter}
              filterButtonRef={filterButtonRef}
              contractState={contractState}
              onCycleContract={onCycleContract}
              pcdState={pcdState}
              onCyclePcd={onCyclePcd}
              experienceState={experienceState}
              onCycleExperience={onCycleExperience}
              favoritesOnly={favoritesOnly}
              onToggleFavoritesOnly={onToggleFavoritesOnly}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
            />
          </Presence>
        }
      />
    </div>
  );
};
