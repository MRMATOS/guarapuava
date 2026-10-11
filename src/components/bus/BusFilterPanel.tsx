"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Key } from "@/components/ui/Key";
import type { LinhaBairro, PontoItinerario } from "@/types/bus";

export interface BusFilterPanelProps {
  linhas: LinhaBairro[];
  selectedBairroId?: string | null;
  selectedPontoId?: string | null;
  searchQuery?: string;
  onSelectBairro: (bairroId: string | null) => void;
  onSelectPonto: (bairroId: string, pontoId: string | null) => void;
  onSearchChange: (query: string) => void;
  onClose: () => void;
  filterButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

export const BusFilterPanel: React.FC<BusFilterPanelProps> = ({
  linhas,
  selectedBairroId,
  selectedPontoId,
  searchQuery = "",
  onSelectBairro,
  onSelectPonto,
  onSearchChange,
  onClose,
  filterButtonRef,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Bairro atualmente em foco no painel para listar seus pontos
  const [activeBairro, setActiveBairro] = useState<LinhaBairro | null>(() => {
    if (selectedBairroId) {
      return linhas.find((l) => l.id === selectedBairroId) || null;
    }
    return null;
  });

  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sincroniza bairro ativo caso selectedBairroId mude externamente
  useEffect(() => {
    if (selectedBairroId) {
      const found = linhas.find((l) => l.id === selectedBairroId);
      if (found) setActiveBairro(found);
    }
  }, [selectedBairroId, linhas]);

  // Fecha o bloco se clicar fora (exceto no botão Filtrar do rodapé)
  useEffect(() => {
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
  }, [onClose, filterButtonRef]);

  // Bairros ordenados alfabeticamente
  const sortedBairros = useMemo(() => {
    const list = [...linhas].sort((a, b) =>
      a.bairro.localeCompare(b.bairro, "pt-BR", { sensitivity: "base" })
    );

    if (!localSearch.trim()) return list;

    const query = localSearch.toLowerCase().trim();
    return list.filter(
      (l) =>
        l.bairro.toLowerCase().includes(query) ||
        l.nomeExibicao.toLowerCase().includes(query) ||
        l.codigo.includes(query)
    );
  }, [linhas, localSearch]);

  // Pontos do bairro ativo
  const filteredPontos = useMemo(() => {
    if (!activeBairro) return [];
    if (!localSearch.trim()) return activeBairro.pontos;

    const query = localSearch.toLowerCase().trim();
    return activeBairro.pontos.filter((p) =>
      p.nome.toLowerCase().includes(query)
    );
  }, [activeBairro, localSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(localSearch);
    onClose();
  };

  const handleClearAll = () => {
    setLocalSearch("");
    onSearchChange("");
    setActiveBairro(null);
    onSelectBairro(null);
    onClose();
  };

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Painel de filtros de horários e bairros"
      className="filter-panel w-full p-2.5 sm:p-3 flex flex-col gap-2.5 select-none"
    >
      {/* ==================================================================
          1. CABEÇALHO DO MODO / TRANSIÇÃO ENTRE BAIRROS E PONTOS
         ================================================================== */}
      {activeBairro ? (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <Key
            type="button"
            onClick={() => {
              setActiveBairro(null);
              onSelectBairro(null);
            }}
            className="px-2.5 py-1 text-[12.5px] font-semibold"
            title="Voltar à lista de bairros"
          >
            ← Todos os Bairros
          </Key>
          <span className="text-[12.5px] font-bold text-ink truncate max-w-[190px]">
            {activeBairro.nomeExibicao}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">
            Selecione o Bairro ou Linha
          </span>
          <span className="text-[11px] font-semibold text-ink-muted">
            {sortedBairros.length} disponíveis
          </span>
        </div>
      )}

      {/* ==================================================================
          2. AS 3 LINHAS COM SCROLL VERTICAL (Bairros ou Pontos)
         ================================================================== */}
      <div className="max-h-[142px] min-h-[142px] overflow-y-auto no-scrollbar overscroll-contain pr-0.5">
        {!activeBairro ? (
          /* Nível 1: Grade de Bairros em 3 Linhas com Scroll */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {sortedBairros.map((linha, idx) => {
              const isSelected = selectedBairroId === linha.id;
              return (
                <div
                  key={linha.id}
                  className="w-full animate-stagger-item"
                  style={{ animationDelay: `${Math.min(idx * 15, 120)}ms` }}
                >
                  <Key
                    type="button"
                    pressed={isSelected}
                    onClick={() => {
                      setActiveBairro(linha);
                      onSelectBairro(linha.id);
                    }}
                    className="w-full px-2 text-[12.5px] sm:text-[13px] justify-start text-left truncate font-medium"
                    title={`${linha.codigo} - ${linha.bairro}`}
                  >
                    <span className="font-bold opacity-60 mr-1 text-[11px]">
                      {linha.codigo}
                    </span>
                    <span className="truncate">{linha.bairro}</span>
                  </Key>
                </div>
              );
            })}
          </div>
        ) : (
          /* Nível 2: Grade de Pontos de Ônibus do Bairro Ativo */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {filteredPontos.map((ponto: PontoItinerario, idx: number) => {
              const isSelected = selectedPontoId === ponto.id;
              return (
                <div
                  key={`${ponto.id}-${idx}`}
                  className="w-full animate-stagger-item"
                  style={{ animationDelay: `${Math.min(idx * 15, 120)}ms` }}
                >
                  <Key
                    type="button"
                    pressed={isSelected}
                    onClick={() => {
                      onSelectPonto(activeBairro.id, ponto.id);
                      onClose();
                    }}
                    className="w-full px-2 text-[12.5px] sm:text-[13px] justify-start text-left truncate font-medium"
                    title={ponto.nome}
                  >
                    <span className="font-mono text-[10.5px] opacity-60 mr-1">
                      {String(ponto.ordem).padStart(2, "0")}.
                    </span>
                    <span className="truncate">{ponto.nome}</span>
                  </Key>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================================================================
          3. 4ª LINHA: CAMPO DE BUSCA TEXTUAL TÁTIL E BOTÕES DE AÇÃO
         ================================================================== */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex items-center gap-1.5 w-full pt-1 border-t border-rule/30"
      >
        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            type="search"
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              onSearchChange(e.target.value);
            }}
            placeholder={
              activeBairro
                ? "Buscar ponto neste bairro..."
                : "Buscar bairro, linha ou rua..."
            }
            className="w-full h-[40px] px-3 text-[13px] rounded-[10px] bg-canvas border border-rule/50 text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-coral transition-colors"
          />
        </div>

        {/* Botão Buscar */}
        <Key
          type="submit"
          className="px-3 h-[40px] text-[13px] font-semibold shrink-0"
          title="Aplicar busca"
        >
          Buscar
        </Key>

        {/* Botão Limpar se houver filtro ativo */}
        {(selectedBairroId || selectedPontoId || localSearch) && (
          <Key
            type="button"
            onClick={handleClearAll}
            className="px-2.5 h-[40px] text-[12.5px] text-ink-muted hover:text-coral shrink-0"
            title="Limpar todos os filtros"
          >
            Limpar
          </Key>
        )}
      </form>
    </div>
  );
};
