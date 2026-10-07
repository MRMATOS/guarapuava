"use client";

import React, { useMemo, useRef } from "react";
import { DailyDigest } from "@/types/news";
import { MainNav } from "@/components/ui/MainNav";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { FilterIndicator } from "@/components/ui/FilterIndicator";
import { Key } from "@/components/ui/Key";
import { getTodayDateString, formatRelativeUpdateText } from "@/lib/utils/date";
import { filterNewsHighlights } from "@/lib/utils/search";

interface HomeFeedProps {
  digest: DailyDigest;
  onOpenDetails: () => void;
  onSelectVagas: () => void;
  onSelectInfo?: () => void;

  // Filtros de notícias
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  onCloseFilter: () => void;
  onResetFilters: () => void;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  digest,
  onOpenDetails,
  onSelectVagas,
  onSelectInfo,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  isFilterOpen,
  onToggleFilter,
  onCloseFilter,
  onResetFilters,
}) => {
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  const todayDisplay = useMemo(() => getTodayDateString(), []);
  const relativeUpdateDisplay = useMemo(
    () =>
      formatRelativeUpdateText({
        date: digest.date,
        time: digest.lastUpdatedTime,
      }),
    [digest.date, digest.lastUpdatedTime]
  );

  // Aplica filtro de pesquisa e categoria nas notícias
  const filteredHighlights = useMemo(() => {
    return filterNewsHighlights(
      digest.highlights,
      searchQuery,
      selectedCategory
    );
  }, [digest.highlights, searchQuery, selectedCategory]);

  const hasActiveFilters = Boolean(searchQuery.trim()) || selectedCategory !== null;

  return (
    <div className="page-shell">
      {/* Cartão-resumo do dia */}
      <article
        onClick={onOpenDetails}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenDetails();
          }
        }}
        aria-label="Abrir resumo detalhado das notícias de hoje"
        className="surface-card w-full pt-3.5 px-5 pb-6 sm:pt-4 sm:px-6 sm:pb-7 cursor-pointer transition-transform duration-150 active:scale-[0.992] touch-manipulation select-none"
      >
        {/* Metadados: data de hoje fixa à esquerda e horário de atualização relativo à direita */}
        <div className="flex items-center justify-between mb-5 tracking-tight tabular-time">
          <span className="font-semibold text-ink text-[15px]">
            {todayDisplay}
          </span>
          <span className="badge-inset">
            <span
              className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse"
              aria-hidden="true"
            />
            {relativeUpdateDisplay}
          </span>
        </div>

        {/* Manchete síntese do dia */}
        <h1 className="text-[20px] font-bold leading-[1.3] text-ink tracking-[-0.02em] text-balance mb-6">
          {digest.headline}
        </h1>

        {/* Tópicos filtrados ou Estado Vazio */}
        {filteredHighlights.length > 0 ? (
          <ul className="space-y-4 text-[14.5px] leading-[1.48] text-ink-body">
            {filteredHighlights.map((item) => (
              <li key={item.id} className="flex items-start">
                <span
                  className="mr-2 text-coral font-black text-[15px] leading-[1.1] select-none shrink-0"
                  aria-hidden="true"
                >
                  •
                </span>
                <p className="flex-1">
                  <strong className="font-bold text-ink">{item.title}:</strong>{" "}
                  <span>{item.text}</span>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-6 text-center text-ink-muted text-[14.5px]">
            <p className="font-semibold text-ink mb-1">
              Nenhuma notícia encontrada
            </p>
            <p className="text-[12.5px] text-ink-muted mb-4">
              Tente buscar por outras palavras-chave ou categorias.
            </p>
            <Key
              onClick={(e) => {
                e.stopPropagation();
                onResetFilters();
              }}
              className="mx-auto"
            >
              Limpar busca
            </Key>
          </div>
        )}
      </article>

      <MainNav
        active="noticias"
        onNoticias={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onVagas={onSelectVagas}
        onSelectInfo={onSelectInfo}
        isFilterOpen={isFilterOpen}
        onToggleFilter={onToggleFilter}
        onCloseFilter={onCloseFilter}
        filterButtonRef={filterButtonRef}
        above={
          <>
            {hasActiveFilters && (
              <FilterIndicator
                label={
                  <span>
                    Filtrando:{" "}
                    <strong className="text-ink font-bold">
                      {filteredHighlights.length}
                    </strong>{" "}
                    {filteredHighlights.length === 1
                      ? "tópico encontrado"
                      : "tópicos encontrados"}
                  </span>
                }
                onClear={onResetFilters}
              />
            )}
            {isFilterOpen && (
              <FilterPanel
                mode="noticias"
                onClose={onCloseFilter}
                filterButtonRef={filterButtonRef}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                selectedCategory={selectedCategory}
                onSelectCategory={onSelectCategory}
              />
            )}
          </>
        }
      />
    </div>
  );
};
