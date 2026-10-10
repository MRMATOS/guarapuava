"use client";

import React, { useEffect, useRef } from "react";
import { X, Search } from "lucide-react";
import { Key } from "./Key";
import { normalizeText } from "@/lib/utils/search";

export interface FilterPanelProps {
  mode: "vagas" | "noticias";
  onClose: () => void;
  filterButtonRef?: React.RefObject<HTMLButtonElement | null>;
  persistent?: boolean;

  // Vagas filter states
  contractState?: number; // 0: Contrato, 1: CLT, 2: PJ
  onCycleContract?: () => void;
  pcdState?: number; // 0: PCD, 1: Somente PCD, 2: Aceita PCD
  onCyclePcd?: () => void;
  experienceState?: number; // 0: Experiência, 1: Com experiência, 2: Sem experiência
  onCycleExperience?: () => void;
  favoritesOnly?: boolean;
  onToggleFavoritesOnly?: () => void;

  // Search input
  searchQuery: string;
  onSearchChange: (value: string) => void;

  // Noticias filter states
  categories?: string[];
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  mode,
  onClose,
  filterButtonRef,
  persistent = false,
  contractState = 0,
  onCycleContract,
  pcdState = 0,
  onCyclePcd,
  experienceState = 0,
  onCycleExperience,
  favoritesOnly = false,
  onToggleFavoritesOnly,
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory = null,
  onSelectCategory,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Fecha o bloco se clicar fora (exceto se for no botão Filtrar do rodapé ou modo persistente)
  useEffect(() => {
    if (persistent) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      // Se o clique for dentro do painel ou na área do dock, o dock gerencia a alternância
      if (
        panelRef.current?.contains(target as Node) ||
        target.closest?.(".dock-shell") ||
        target.closest?.(".dock") ||
        (filterButtonRef?.current && filterButtonRef.current.contains(target as Node))
      ) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, filterButtonRef, persistent]);

  // Labels dinâmicos para os botões de Vagas
  const contractLabel =
    contractState === 1 ? "CLT" : contractState === 2 ? "PJ" : "Contrato";

  const pcdLabel =
    pcdState === 1 ? "Somente PCD" : pcdState === 2 ? "Aceita PCD" : "PCD";

  const experienceLabel =
    experienceState === 1
      ? "Com experiência"
      : experienceState === 2
      ? "Sem experiência"
      : "Experiência";

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Painel de filtros"
      className="filter-panel w-full p-2.5 sm:p-3 flex flex-col gap-2.5 select-none"
    >
      {/* Linha 1: 3 Botões Dinâmicos */}
      {mode === "vagas" ? (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {/* 1. Botão Contrato (Contrato -> CLT -> PJ -> Contrato) */}
          <div className="w-full animate-stagger-item" style={{ animationDelay: "25ms" }}>
            <Key
              pressed={contractState !== 0}
              onClick={onCycleContract}
              className="w-full px-1 text-[12.5px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
              title={`Filtro de Contrato: ${contractLabel} (clique para alternar)`}
              aria-label={`Filtrar por contrato: ${contractLabel}`}
            >
              {contractLabel}
            </Key>
          </div>

          {/* 2. Botão PCD (PCD -> Somente PCD -> Aceita PCD -> PCD) */}
          <div className="w-full animate-stagger-item" style={{ animationDelay: "50ms" }}>
            <Key
              pressed={pcdState !== 0}
              onClick={onCyclePcd}
              className="w-full px-1 text-[12.5px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
              title={`Filtro PCD: ${pcdLabel} (clique para alternar)`}
              aria-label={`Filtrar PCD: ${pcdLabel}`}
            >
              {pcdLabel}
            </Key>
          </div>

          {/* 3. Botão Experiência (Experiência -> Com experiência -> Sem experiência -> Experiência) */}
          <div className="w-full animate-stagger-item" style={{ animationDelay: "75ms" }}>
            <Key
              pressed={experienceState !== 0}
              onClick={onCycleExperience}
              className="w-full px-1 text-[12.5px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
              title={`Filtro Experiência: ${experienceLabel} (clique para alternar)`}
              aria-label={`Filtrar experiência: ${experienceLabel}`}
            >
              {experienceLabel}
            </Key>
          </div>
        </div>
      ) : (
        /* Linha 1 para Notícias: categorias dinâmicas em carrossel horizontal */
        <div
          role="toolbar"
          aria-label="Filtro de categorias de notícias"
          className="w-full overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-2 py-1 px-0.5"
        >
          {(categories && categories.length > 0 ? categories : ["Política", "Saúde", "Clima"]).map((cat, idx) => {
            const isPressed =
              selectedCategory !== null &&
              normalizeText(selectedCategory) === normalizeText(cat);
            return (
              <div
                key={cat}
                className="shrink-0 animate-stagger-item"
                style={{ animationDelay: `${25 + idx * 25}ms` }}
              >
                <Key
                  pressed={isPressed}
                  onClick={() =>
                    onSelectCategory?.(isPressed ? null : cat)
                  }
                  title={
                    isPressed
                      ? `Remover filtro ${cat}`
                      : `Filtrar apenas por ${cat}`
                  }
                  className="shrink-0 text-[12.5px] px-2.5"
                  aria-label={`Filtrar notícias por ${cat}`}
                >
                  {cat}
                </Key>
              </div>
            );
          })}
        </div>
      )}

      {/* Linha 2: Barra de Pesquisa e Botão Favoritas (em vagas) */}
      {mode === "vagas" ? (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {/* Input de busca ocupando as 2 primeiras colunas (até o fim do botão PCD) */}
          <div
            className="col-span-2 relative w-full animate-stagger-item"
            style={{ animationDelay: "100ms" }}
          >
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
              aria-hidden="true"
            >
              <Search className="w-4 h-4" strokeWidth={2.2} />
            </span>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                // Garante que a tecla Enter não feche nem recarregue a página
                if (e.key === "Enter") {
                  e.preventDefault();
                }
              }}
              placeholder="Pesquisar..."
              aria-label="Pesquisar por vaga, empresa, salário, requisitos ou palavras-chave"
              className="filter-input w-full h-[42px] pl-10 pr-9 text-[14.5px] placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-coral/40 transition-shadow"
            />

            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink active:scale-95 transition-transform touch-manipulation cursor-pointer"
                aria-label="Limpar texto da pesquisa"
                title="Limpar pesquisa"
              >
                <X className="w-4 h-4" strokeWidth={2.2} />
              </button>
            ) : null}
          </div>

          {/* Botão Favoritas na 3ª coluna (abaixo do botão de Experiência) */}
          <div
            className="col-span-1 animate-stagger-item"
            style={{ animationDelay: "125ms" }}
          >
            <Key
              pressed={favoritesOnly}
              onClick={onToggleFavoritesOnly}
              className="w-full px-1 text-[12.5px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
              title={
                favoritesOnly
                  ? "Mostrar todas as vagas"
                  : "Filtrar apenas vagas favoritas"
              }
              aria-label="Filtrar por vagas favoritas"
            >
              Favoritas
            </Key>
          </div>
        </div>
      ) : (
        /* Linha 2 para notícias: input largura cheia */
        <div
          className="relative w-full animate-stagger-item"
          style={{ animationDelay: "100ms" }}
        >
          <span
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
            aria-hidden="true"
          >
            <Search className="w-4 h-4" strokeWidth={2.2} />
          </span>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
              }
            }}
            placeholder="Pesquisar..."
            aria-label="Pesquisar notícias por manchete, assunto ou palavra-chave"
            className="filter-input w-full h-[42px] pl-10 pr-9 text-[14.5px] placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-coral/40 transition-shadow"
          />

          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink active:scale-95 transition-transform touch-manipulation cursor-pointer"
              aria-label="Limpar texto da pesquisa"
              title="Limpar pesquisa"
            >
              <X className="w-4 h-4" strokeWidth={2.2} />
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};
