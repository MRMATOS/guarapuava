"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { DailyDigest, NewsBatch } from "@/types/news";
import { ExternalLink, Search, X } from "lucide-react";
import { Dock } from "@/components/ui/Dock";
import { Key } from "@/components/ui/Key";
import { FilterIndicator } from "@/components/ui/FilterIndicator";
import { OptionsPanel } from "@/components/ui/OptionsPanel";
import { Presence } from "@/components/ui/Presence";
import { formatRelativeUpdateText } from "@/lib/utils/date";
import { normalizeText, normalizeCategory, matchesQuery } from "@/lib/utils/search";
import { useHandedness } from "@/context/HandednessContext";

interface DetailedFeedProps {
  digest: DailyDigest;
  tags: string[];
  onBack: () => void;
  onSelectVagas?: () => void;
  onSelectInfo?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
  onResetFilters?: () => void;
}

export const DetailedFeed: React.FC<DetailedFeedProps> = ({
  digest,
  tags,
  onBack,
  onSelectVagas,
  onSelectInfo,
  searchQuery: controlledSearchQuery,
  onSearchChange,
  selectedCategory: controlledCategory,
  onSelectCategory,
  onResetFilters,
}) => {
  const { isLeftHanded } = useHandedness();
  const [internalTag, setInternalTag] = useState<string | null>(null);
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isControlledCategory = controlledCategory !== undefined;
  const isControlledSearch = controlledSearchQuery !== undefined;

  const activeTag = isControlledCategory ? controlledCategory : internalTag;
  const searchQuery = isControlledSearch ? controlledSearchQuery : internalSearchQuery;

  // Garante tags canônicas, únicas e ordenadas
  const normalizedTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of tags) {
      if (t) set.add(normalizeCategory(t));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [tags]);

  // Fecha os painéis se clicar fora ou pressionar Escape
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        (!filterButtonRef.current || !filterButtonRef.current.contains(target)) &&
        (!optionsButtonRef.current || !optionsButtonRef.current.contains(target))
      ) {
        setIsFilterOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
        setIsOptionsOpen(false);
      }
    };

    if (isFilterOpen || isOptionsOpen) {
      document.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilterOpen, isOptionsOpen]);

  const handleToggleOptions = () => {
    if (isFilterOpen) {
      setIsFilterOpen(false);
    }
    setIsOptionsOpen((prev) => !prev);
  };

  const handleCloseOptions = () => {
    setIsOptionsOpen(false);
  };

  const handleToggleFilter = () => {
    if (isOptionsOpen) {
      setIsOptionsOpen(false);
    }
    setIsFilterOpen((prev) => !prev);
  };

  const handleCloseFilter = () => {
    setIsFilterOpen(false);
  };

  const handleSelectInfo = () => {
    setIsOptionsOpen(false);
    onSelectInfo?.();
  };

  const handleSelectVagas = () => {
    setIsOptionsOpen(false);
    setIsFilterOpen(false);
    onSelectVagas?.();
  };

  const handleBack = () => {
    setIsOptionsOpen(false);
    setIsFilterOpen(false);
    onBack();
  };

  // Toggle do filtro de categoria: clicar na mesma tag limpa o filtro
  const handleTagClick = (tag: string) => {
    if (isControlledCategory) {
      onSelectCategory?.(
        activeTag !== null && normalizeText(activeTag) === normalizeText(tag) ? null : tag
      );
    } else {
      setInternalTag((prev) =>
        prev !== null && normalizeText(prev) === normalizeText(tag) ? null : tag
      );
    }
  };

  const handleResetFilters = () => {
    if (onResetFilters) {
      onResetFilters();
    }
    setInternalTag(null);
    setInternalSearchQuery("");
  };

  const handleSearchChange = (query: string) => {
    if (isControlledSearch) {
      onSearchChange?.(query);
    } else {
      setInternalSearchQuery(query);
    }
  };

  // Filtragem flexível por categoria e busca textual
  const filteredBatches: NewsBatch[] = useMemo(() => {
    return digest.batches
      .map((batch) => {
        const filteredItems = batch.items.filter((item) => {
          // Filtro por categoria (tag) — comparação estrita pela categoria
          // canônica para não misturar categorias (ex: Polícia no filtro Social).
          if (activeTag) {
            if (normalizeCategory(item.category) !== normalizeCategory(activeTag)) {
              return false;
            }
          }

          // Filtro por texto de pesquisa (título, texto ou categoria)
          if (searchQuery.trim()) {
            const textCorpus = `${item.title} ${item.text} ${item.category}`;
            if (!matchesQuery(textCorpus, searchQuery)) return false;
          }

          return true;
        });

        return {
          ...batch,
          items: filteredItems,
        };
      })
      .filter((batch) => batch.items.length > 0);
  }, [digest.batches, activeTag, searchQuery]);

  const totalItemsCount = useMemo(() => {
    return filteredBatches.reduce((acc, b) => acc + b.items.length, 0);
  }, [filteredBatches]);

  const hasActiveFilters = Boolean(activeTag) || Boolean(searchQuery.trim());

  const filterIndicator = hasActiveFilters ? (
    <FilterIndicator
      label={
        <span>
          {activeTag && (
            <>
              Categoria: <strong className="text-ink font-bold">{activeTag}</strong>
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
            <strong className="text-ink font-bold">{totalItemsCount}</strong>{" "}
            {totalItemsCount === 1 ? "notícia encontrada" : "notícias encontradas"}
          </span>
        </span>
      }
      onClear={handleResetFilters}
    />
  ) : null;

  return (
    <div className="page-shell">
      {/* Cartão do feed de atualizações */}
      <main className="surface-card w-full pt-3.5 px-5 pb-6 sm:pt-4 sm:px-6 sm:pb-7">
        {filteredBatches.length > 0 ? (
          filteredBatches.map((batch, batchIndex) => (
            <section key={batch.id} aria-label={`Atualização das ${batch.time}`}>
              {/* Metadados do bloco */}
              <div className="flex items-center justify-between mb-4 tracking-tight tabular-time">
                <span className="font-semibold text-ink text-[15px]">
                  {batch.date}
                </span>
                <span className="badge-inset">
                  {formatRelativeUpdateText({ date: batch.date, time: batch.time })}
                </span>
              </div>

              {/* Lista de notícias do bloco */}
              <ul className="space-y-4 text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
                {batch.items.map((item) => {
                  const hasLink = Boolean(item.url);

                  return (
                    <li key={item.id} className="flex items-start">
                      <span
                        className="mr-2 text-coral font-black text-[15px] leading-[1.1] select-none shrink-0"
                        aria-hidden="true"
                      >
                        •
                      </span>
                      {hasLink ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex-1 rounded-md -mx-1.5 -my-1 px-1.5 py-1 transition-all duration-150 hover:bg-coral/[0.04] active:bg-coral/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40"
                          title="Acessar notícia completa no site de origem"
                          aria-label={`${item.title}: ${item.text}. Acessar notícia completa no site original.`}
                        >
                          <p className="inline">
                            <strong className="font-bold text-ink group-hover:text-coral transition-colors duration-150">
                              {item.title}:
                            </strong>{" "}
                            <span>{item.text}</span>
                            <span className="inline-flex items-center ml-1.5 align-baseline text-coral/80 group-hover:text-coral transition-colors select-none">
                              <ExternalLink
                                className="w-3.5 h-3.5 inline shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                                strokeWidth={2.2}
                                aria-hidden="true"
                              />
                              <span className="sr-only"> (abre notícia completa em nova aba)</span>
                            </span>
                          </p>
                        </a>
                      ) : (
                        <p className="flex-1">
                          <strong className="font-bold text-ink">{item.title}:</strong>{" "}
                          <span>{item.text}</span>
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Separador pontilhado entre blocos */}
              {batchIndex < filteredBatches.length - 1 && (
                <div
                  className="my-6 border-b border-dotted border-rule/90"
                  aria-hidden="true"
                />
              )}
            </section>
          ))
        ) : (
          <div className="py-14 text-center text-ink-muted text-[15px]">
            <p className="font-semibold text-ink mb-1.5 text-[15px]">
              Nenhuma notícia encontrada
            </p>
            <p className="text-[13px] text-ink-muted mb-5 max-w-[280px] mx-auto leading-relaxed">
              {activeTag
                ? `Nenhuma notícia na categoria "${activeTag}" corresponde aos filtros aplicados.`
                : "Nenhum resultado corresponde à palavra-chave pesquisada."}
            </p>
            <Key onClick={handleResetFilters} className="mx-auto gap-1.5">
              <X className="w-4 h-4" strokeWidth={2.2} />
              Limpar filtros
            </Key>
          </div>
        )}
      </main>

      {/* Footer com navegação principal: Mais, Filtrar, Vagas, Voltar */}
      <Dock
        align="between"
        above={
          <>
            <Presence isVisible={hasActiveFilters} duration={180}>
              {filterIndicator}
            </Presence>

            <div className="grid grid-cols-1 grid-rows-1 items-end w-full [grid-template-areas:'stack']">
              <div className="w-full [grid-area:stack]">
                <Presence isVisible={isFilterOpen} duration={180}>
                  <div
                    ref={panelRef}
                    role="region"
                    aria-label="Painel de filtros de notícias"
                    className="filter-panel w-full p-2.5 sm:p-3 flex flex-col gap-2.5 select-none"
                  >
                    {/* Linha 1 (superior): carrossel com scroll horizontal de categorias */}
                    <div
                      role="toolbar"
                      aria-label="Filtro de categorias"
                      className="w-full overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-2 py-1 px-0.5"
                    >
                      {normalizedTags.map((tag) => {
                        const isPressed =
                          activeTag !== null &&
                          normalizeText(activeTag) === normalizeText(tag);
                        return (
                          <Key
                            key={tag}
                            pressed={isPressed}
                            onClick={() => handleTagClick(tag)}
                            title={
                              isPressed
                                ? `Remover filtro ${tag}`
                                : `Filtrar apenas por ${tag}`
                            }
                            className="shrink-0 text-[12.5px] px-2.5"
                          >
                            {tag}
                          </Key>
                        );
                      })}
                    </div>

                    {/* Linha 2 (inferior): input de busca de notícias em largura cheia */}
                    <div className="relative w-full">
                      <span
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                        aria-hidden="true"
                      >
                        <Search className="w-4 h-4" strokeWidth={2.2} />
                      </span>

                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                          }
                        }}
                        placeholder="Pesquisar..."
                        aria-label="Pesquisar notícias do dia por assunto ou palavra-chave"
                        className="filter-input w-full h-[42px] pl-10 pr-9 text-[16px] placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-coral/40 transition-shadow"
                      />

                      {searchQuery ? (
                        <button
                          type="button"
                          onClick={() => handleSearchChange("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink active:scale-95 transition-transform touch-manipulation cursor-pointer"
                          aria-label="Limpar texto da pesquisa"
                          title="Limpar pesquisa"
                        >
                          <X className="w-4 h-4" strokeWidth={2.2} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </Presence>
              </div>

              <div className="w-full [grid-area:stack]">
                <Presence isVisible={isOptionsOpen} duration={180}>
                  <OptionsPanel
                    onClose={handleCloseOptions}
                    onSelectInfo={handleSelectInfo}
                    optionsButtonRef={optionsButtonRef}
                  />
                </Presence>
              </div>
            </div>
          </>
        }
        aria-label="Navegação e filtros da notícia"
      >
        <div
          className={`grid grid-cols-4 w-full gap-1.5 sm:gap-2 ${
            isLeftHanded ? "[direction:rtl] [&>*]:[direction:ltr]" : ""
          }`}
        >
          {/* 1. Botão Mais */}
          <Key
            ref={optionsButtonRef}
            pressed={isOptionsOpen}
            onClick={handleToggleOptions}
            aria-expanded={isOptionsOpen}
            aria-label={isOptionsOpen ? "Fechar menu mais" : "Abrir menu mais"}
            className="w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
          >
            Mais
          </Key>

          {/* 2. Botão Filtrar */}
          <Key
            ref={filterButtonRef}
            pressed={isFilterOpen}
            onClick={handleToggleFilter}
            aria-expanded={isFilterOpen}
            aria-label={
              isFilterOpen
                ? "Fechar bloco de filtros"
                : "Abrir bloco de filtros"
            }
            className="w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
          >
            Filtrar
          </Key>

          {/* 3. Botão Vagas */}
          <Key
            onClick={handleSelectVagas}
            className="w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
          >
            Vagas
          </Key>

          {/* 4. Botão Voltar */}
          <Key
            onClick={handleBack}
            aria-label="Voltar para a página inicial"
            className="w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
          >
            Voltar
          </Key>
        </div>
      </Dock>
    </div>
  );
};
