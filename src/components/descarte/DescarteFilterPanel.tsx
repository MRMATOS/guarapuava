"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Key } from "@/components/ui/Key";
import { categoriaMatches } from "@/lib/descarte/filter";
import { matchesLoose } from "@/lib/descarte/search";

export interface DescarteFilterPanelProps {
  categorias: string[];
  locais: string[];
  searchQuery: string;
  selectedCategoria: string | null;
  selectedLocal: string | null;
  onSearchChange: (query: string) => void;
  onSelectCategoria: (categoria: string | null) => void;
  onSelectLocal: (local: string | null) => void;
  onClose: () => void;
  filterButtonRef?: React.RefObject<HTMLButtonElement | null>;
  persistent?: boolean;
}

type GridView = "locais" | "categorias" | null;

export const DescarteFilterPanel: React.FC<DescarteFilterPanelProps> = ({
  categorias,
  locais,
  searchQuery,
  selectedCategoria,
  selectedLocal,
  onSearchChange,
  onSelectCategoria,
  onSelectLocal,
  onClose,
  filterButtonRef,
  persistent = false,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [gridView, setGridView] = useState<GridView>(null);
  const localSearch = searchQuery;

  useEffect(() => {
    if (persistent) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
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
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, filterButtonRef, persistent]);

  const filteredCategorias = !localSearch.trim()
    ? categorias
    : categorias.filter((c) => categoriaMatches(c, localSearch));

  const filteredLocais = !localSearch.trim()
    ? locais
    : locais.filter((l) => matchesLoose(localSearch, l));

  const searchInputNode = (
    <div className="relative w-full">
      <div className="relative w-full">
        <span
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
          aria-hidden="true"
        >
          <Search className="w-4 h-4" strokeWidth={2.2} />
        </span>
        <input
          ref={searchInputRef}
          type="text"
          value={localSearch}
          onChange={(e) => {
            onSearchChange(e.target.value);
          }}
          placeholder="Buscar empresa, resíduo ou rua..."
          aria-label="Buscar empresa, resíduo ou rua"
          className="filter-input w-full h-[42px] pl-10 pr-9 text-[16px] placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-coral/40 transition-shadow truncate"
        />
        {localSearch ? (
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink active:scale-95 transition-transform touch-manipulation cursor-pointer"
            aria-label="Limpar pesquisa"
            title="Limpar pesquisa"
          >
            <X className="w-4 h-4" strokeWidth={2.2} />
          </button>
        ) : null}
      </div>
    </div>
  );

  const toggleButtonsNode = (
    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 w-full animate-stagger-item">
      <Key
        type="button"
        pressed={gridView === "locais"}
        onClick={() => setGridView((prev) => (prev === "locais" ? null : "locais"))}
        className="w-full px-1 sm:px-2 text-[12px] sm:text-[13px] justify-center text-center font-semibold transition-all"
        title={gridView === "locais" ? "Ocultar locais" : "Mostrar locais"}
      >
        <span className="truncate">Locais</span>
      </Key>
      <Key
        type="button"
        pressed={gridView === "categorias"}
        onClick={() => setGridView((prev) => (prev === "categorias" ? null : "categorias"))}
        className="w-full px-1 sm:px-2 text-[12px] sm:text-[13px] justify-center text-center font-semibold transition-all"
        title={gridView === "categorias" ? "Ocultar categorias" : "Mostrar categorias"}
      >
        <span className="truncate">Categorias</span>
      </Key>
    </div>
  );

  const gridNode = gridView ? (
    <div
      className={`${
        persistent
          ? "overflow-visible"
          : "max-h-[142px] min-h-[142px] overflow-y-auto no-scrollbar overscroll-contain"
      } pr-0.5`}
    >
      {gridView === "categorias" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {filteredCategorias.map((cat, idx) => (
            <div
              key={cat}
              className="w-full animate-stagger-item"
              style={{ animationDelay: `${Math.min(idx * 15, 120)}ms` }}
            >
              <Key
                type="button"
                pressed={selectedCategoria === cat}
                onClick={() => {
                  onSelectCategoria(selectedCategoria === cat ? null : cat);
                  if (!persistent) onClose();
                }}
                className="w-full px-2 text-[12.5px] sm:text-[14px] justify-start text-left truncate font-medium"
                title={cat}
              >
                <span className="truncate">{cat}</span>
              </Key>
            </div>
          ))}
          {filteredCategorias.length === 0 && (
            <p className="text-[12.5px] text-ink-muted py-4 text-center col-span-full">
              Nenhuma categoria com esse nome.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {filteredLocais.map((loc, idx) => (
            <div
              key={loc}
              className="w-full animate-stagger-item"
              style={{ animationDelay: `${Math.min(idx * 15, 120)}ms` }}
            >
              <Key
                type="button"
                pressed={selectedLocal === loc}
                onClick={() => {
                  onSelectLocal(selectedLocal === loc ? null : loc);
                  if (!persistent) onClose();
                }}
                className="w-full px-2 text-[12.5px] sm:text-[14px] justify-start text-left truncate font-medium"
                title={loc}
              >
                <span className="truncate">{loc}</span>
              </Key>
            </div>
          ))}
          {filteredLocais.length === 0 && (
            <p className="text-[12.5px] text-ink-muted py-4 text-center col-span-full">
              Nenhum local com esse nome.
            </p>
          )}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Painel de filtros de descarte"
      className={`${
        persistent ? "desktop-sidebar-panel" : "filter-panel"
      } w-full p-2.5 sm:p-3 flex flex-col gap-2.5 select-none relative`}
    >
      {persistent ? (
        <div className="flex flex-col gap-2 w-full shrink-0">
          {searchInputNode}
          {toggleButtonsNode}
        </div>
      ) : null}
      {gridNode && persistent ? <div className="pt-1">{gridNode}</div> : null}
      {!persistent && (
        <div className={`flex flex-col gap-2 w-full shrink-0 ${gridView ? "border-t border-rule/30 pt-2" : ""}`}>
          {gridView ? gridNode : null}
          {searchInputNode}
          {toggleButtonsNode}
        </div>
      )}
      {!gridView && persistent ? null : null}
    </div>
  );
};
