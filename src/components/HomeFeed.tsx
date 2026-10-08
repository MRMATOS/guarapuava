"use client";

import React, { useMemo, useRef } from "react";
import { DailyDigest } from "@/types/news";
import { MainNav } from "@/components/ui/MainNav";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { FilterIndicator } from "@/components/ui/FilterIndicator";
import { Key } from "@/components/ui/Key";
import { formatRelativeUpdateText } from "@/lib/utils/date";
import { filterNewsHighlights } from "@/lib/utils/search";

interface HomeFeedProps {
  digests: DailyDigest[];
  categories?: string[];
  onOpenDetails: (digest: DailyDigest) => void;
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
  digests,
  categories,
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

  const hasActiveFilters = Boolean(searchQuery.trim()) || selectedCategory !== null;

  // Total de tópicos encontrados somando todos os dias filtrados
  const totalFilteredCount = useMemo(() => {
    return digests.reduce((acc, d) => {
      return acc + filterNewsHighlights(d.highlights, searchQuery, selectedCategory).length;
    }, 0);
  }, [digests, searchQuery, selectedCategory]);

  return (
    <div className="page-shell">
      {/* Lista de cartões diários de resumo (Scroll por dias) */}
      <div className="w-full space-y-4">
        {digests.map((digest) => {
          const relativeUpdateDisplay = formatRelativeUpdateText({
            date: digest.date,
            time: digest.lastUpdatedTime,
          });

          // Aplica filtro de pesquisa e categoria nos destaques deste dia
          const filteredHighlights = filterNewsHighlights(
            digest.highlights,
            searchQuery,
            selectedCategory
          );

          // Se estiver filtrando e este dia não tiver nenhum destaque correspondente, pula o dia
          if (hasActiveFilters && filteredHighlights.length === 0) {
            return null;
          }

          return (
            <article
              key={digest.date}
              onClick={() => onOpenDetails(digest)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenDetails(digest);
                }
              }}
              aria-label={`Abrir resumo detalhado das notícias de ${digest.date}`}
              className="surface-card w-full pt-3.5 px-5 pb-6 sm:pt-4 sm:px-6 sm:pb-7 cursor-pointer transition-transform duration-150 active:scale-[0.992] touch-manipulation select-none"
            >
              {/* Metadados: data fixa à esquerda e horário de atualização relativo à direita */}
              <div className="flex items-center justify-between mb-5 tracking-tight tabular-time">
                <span className="font-semibold text-ink text-[15px]">
                  {digest.date}
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

              {/* Tópicos filtrados */}
              {filteredHighlights.length > 0 && (
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
              )}
            </article>
          );
        })}

        {/* Estado Vazio caso filtros não encontrem nada em nenhum dia */}
        {hasActiveFilters && totalFilteredCount === 0 && (
          <div className="surface-card w-full py-10 px-6 text-center text-ink-muted text-[14.5px]">
            <p className="font-semibold text-ink mb-1 text-[16px]">
              Nenhuma notícia encontrada
            </p>
            <p className="text-[13px] text-ink-muted mb-5">
              Tente buscar por outras palavras-chave ou categorias.
            </p>
            <Key onClick={onResetFilters} className="mx-auto">
              Limpar busca
            </Key>
          </div>
        )}
      </div>

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
                    {selectedCategory && (
                      <>
                        Categoria: <strong className="text-ink font-bold">{selectedCategory}</strong>
                        {" • "}
                      </>
                    )}
                    {searchQuery.trim() && (
                      <>
                        Busca: &ldquo;<strong className="text-ink font-bold">{searchQuery.trim()}</strong>&rdquo;
                        {" • "}
                      </>
                    )}
                    <span>
                      <strong className="text-ink font-bold">{totalFilteredCount}</strong>{" "}
                      {totalFilteredCount === 1
                        ? "tópico encontrado"
                        : "tópicos encontrados"}
                    </span>
                  </span>
                }
                onClear={onResetFilters}
              />
            )}
            {isFilterOpen && (
              <FilterPanel
                mode="noticias"
                categories={categories}
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
