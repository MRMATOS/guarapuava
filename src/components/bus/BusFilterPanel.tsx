"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
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
  persistent?: boolean;
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
  persistent = false,
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

  // Sincroniza busca externa
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Sincroniza bairro ativo caso selectedBairroId mude externamente
  useEffect(() => {
    if (selectedBairroId) {
      const found = linhas.find((l) => l.id === selectedBairroId);
      if (found) setActiveBairro(found);
    }
  }, [selectedBairroId, linhas]);

  // Fecha o bloco se clicar fora (exceto no botão Filtrar do rodapé ou modo persistente)
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

  const searchInputNode = (
    <div className={`relative w-full ${persistent ? "pb-0.5" : "pt-1 border-t border-rule/30"}`}>
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
          const val = e.target.value;
          setLocalSearch(val);
          onSearchChange(val);
        }}
        placeholder={
          activeBairro
            ? "Buscar ponto neste bairro..."
            : "Buscar bairro ou linha..."
        }
        aria-label="Buscar bairro ou linha de ônibus"
        className="filter-input w-full h-[42px] pl-10 pr-9 text-[16px] placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-coral/40 transition-shadow"
      />

      {localSearch ? (
        <button
          type="button"
          onClick={() => {
            setLocalSearch("");
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
  );

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Painel de filtros de horários e bairros"
      className={`${persistent ? "desktop-sidebar-panel" : "filter-panel"} w-full p-2.5 sm:p-3 flex flex-col gap-2.5 select-none`}
    >
      {/* ==================================================================
          1. TRANSIÇÃO ENTRE BAIRROS E PONTOS (Apenas seta na 2ª camada)
         ================================================================== */}
      {activeBairro && (
        <div className="flex items-center justify-between gap-2 px-0.5 animate-stagger-item">
          <span className="text-[13px] font-bold text-ink truncate min-w-0 pl-1">
            {activeBairro.nomeExibicao}
          </span>
          <Key
            type="button"
            variant="icon"
            onClick={() => {
              setActiveBairro(null);
              onSelectBairro(null);
            }}
            className="w-[36px] h-[36px] min-w-[36px] p-0 flex items-center justify-center shrink-0"
            title="Voltar aos bairros"
            aria-label="Voltar para todos os bairros"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.2} />
          </Key>
        </div>
      )}

      {/* ==================================================================
          2. NO MODO DESKTOP: Campo de busca fica ACIMA dos botões
         ================================================================== */}
      {persistent && searchInputNode}

      {/* ==================================================================
          3. GRADE DE BAIRROS OU PONTOS
          - No desktop: exibe todos sem corte de altura ou scroll interno
          - No mobile: usa scroll interno compacto acima do dock
         ================================================================== */}
      <div
        className={`${
          persistent
            ? "overflow-visible"
            : "max-h-[142px] min-h-[142px] overflow-y-auto no-scrollbar overscroll-contain"
        } pr-0.5`}
      >
        {!activeBairro ? (
          /* Nível 1: Grade com todos os bairros */
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
          /* Nível 2: Grade com todos os pontos de ônibus do bairro ativo */
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
                      if (!persistent) {
                        onClose();
                      }
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
          4. NO MODO MOBILE: Campo de busca fica na base
         ================================================================== */}
      {!persistent && searchInputNode}
    </div>
  );
};
