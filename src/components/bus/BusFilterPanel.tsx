"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import { Key } from "@/components/ui/Key";
import { normalizeText } from "@/lib/utils/search";
import { findNearestDestinationStop } from "@/lib/geo/distance";
import { formatStopDisplayName } from "@/components/bus/BusScheduleFeed";
import type { LinhaBairro, PontoItinerario } from "@/types/bus";
import type { GeoSuggestion } from "@/app/api/geo/autocomplete/route";

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

  // Propriedades do Planejador de Rotas
  routeStep: "none" | "origin" | "destination" | "calculated";
  selectedOriginPonto: { ponto: PontoItinerario; linha: LinhaBairro } | null;
  selectedDestinationPonto: { ponto: PontoItinerario; linha: LinhaBairro } | null;
  userCoords: { lat: number; lon: number } | null;
  isShowingSavedRoutes?: boolean;
  onToggleSavedRoutes?: () => void;
  onSaveRoute?: () => void;
  isRouteSaved?: boolean;
  onStartRoute?: () => void;
  /** Oculta o botão Criar/Cancelar rota (no mobile ele fica no Dock) */
  hideRouteAction?: boolean;
  onCancelRoute?: () => void;
  onConfirmOrigin?: () => void;
  onConfirmDestination?: () => void;
  onResetRoute?: () => void;
  onSelectOrigin?: (ponto: PontoItinerario, linha: LinhaBairro, distanceMeters?: number | null) => void;
  onSelectDestination?: (ponto: PontoItinerario, linha: LinhaBairro, distanceMeters?: number | null) => void;
  onRequestLocation: () => Promise<void>;
  onSelectSearchCoords?: (coords: { lat: number; lon: number; label: string } | null) => void;
  showLinesGrid?: boolean;
  onToggleLinesGrid?: () => void;
  onSearchTypingChange?: (isTyping: boolean) => void;
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
  showLinesGrid: propShowLinesGrid,
  onToggleLinesGrid: propToggleLinesGrid,
  onSearchTypingChange,

  routeStep = "origin",
  selectedOriginPonto,
  selectedDestinationPonto,
  userCoords,
  isShowingSavedRoutes = false,
  onToggleSavedRoutes,
  onSaveRoute,
  isRouteSaved = false,
  onStartRoute,
  hideRouteAction = false,
  onCancelRoute,
  onConfirmOrigin,
  onConfirmDestination,
  onResetRoute,
  onSelectOrigin,
  onSelectDestination,
  onRequestLocation,
  onSelectSearchCoords,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [localShowLinesGrid, setLocalShowLinesGrid] = useState(false);
  const showLinesGrid = propShowLinesGrid !== undefined ? propShowLinesGrid : localShowLinesGrid;
  const handleToggleLinesGrid = () => {
    if (propToggleLinesGrid) {
      propToggleLinesGrid();
    } else {
      setLocalShowLinesGrid((prev) => !prev);
    }
  };

  // Bairro atualmente em foco no painel para listar seus pontos
  const [activeBairro, setActiveBairro] = useState<LinhaBairro | null>(() => {
    if (selectedBairroId) {
      return linhas.find((l) => l.id === selectedBairroId) || null;
    }
    return null;
  });

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [hasPromptedLocation, setHasPromptedLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);

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

  // Quando o passo da rota muda (ex: avança de origin para destination), reseta foco do bairro e busca local
  useEffect(() => {
    if (routeStep === "origin" || routeStep === "destination") {
      setActiveBairro(null);
      setLocalSearch("");
      setSuggestions([]);
    }
  }, [routeStep]);

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
        if (showLocationModal) {
          setShowLocationModal(false);
          return;
        }
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, filterButtonRef, persistent, showLocationModal]);

  // Autocomplete com debounce de 250ms usando /api/geo/autocomplete (insensível a acentos)
  useEffect(() => {
    if (!localSearch.trim() || localSearch.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geo/autocomplete?q=${encodeURIComponent(localSearch.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
        }
      } catch {
        // Silencioso
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [localSearch]);

  const visibleSuggestions = localSearch.trim().length >= 2 ? suggestions : [];

  const handleInputClick = () => {
    if (!hasPromptedLocation && !userCoords) {
      setShowLocationModal(true);
    }
  };

  const handleAcceptLocation = async () => {
    setIsLocating(true);
    try {
      await onRequestLocation();
    } finally {
      setIsLocating(false);
      setHasPromptedLocation(true);
      setShowLocationModal(false);
    }
  };

  const handleDeclineLocation = () => {
    setHasPromptedLocation(true);
    setShowLocationModal(false);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleSelectSuggestion = (sug: GeoSuggestion) => {
    onSearchTypingChange?.(false);
    // =========================================================================
    // A. SE ESTAMOS NO PASSO 2: ESCOLHER DESTINO
    // =========================================================================
    if (routeStep === "destination") {
      // 1. Sugestão é uma Parada de ônibus específica
      if (sug.tipo === "ponto" && sug.linhaId && sug.pontoId) {
        const linha = linhas.find((l) => l.id === sug.linhaId);
        const ponto = linha?.pontos.find((p) => p.id === sug.pontoId);
        if (linha && ponto) {
          if (selectedOriginPonto && selectedOriginPonto.ponto.id === ponto.id) {
            return;
          }
          onSelectDestination?.(ponto, linha);
          setLocalSearch("");
          onSearchChange("");
          setSuggestions([]);
          if (!persistent) onClose();
          return;
        }
      }

      // 2. Sugestão é uma Linha de ônibus
      if (sug.tipo === "linha" && sug.linhaId) {
        const linha = linhas.find((l) => l.id === sug.linhaId);
        if (linha) {
          setActiveBairro(linha);
          setLocalSearch("");
          onSearchChange("");
          setSuggestions([]);
          return;
        }
      }

      // 3. Sugestão é um POI (Universidade, Shopping, etc.) ou Endereço geral
      const nearest = findNearestDestinationStop(sug.latitude, sug.longitude, linhas, selectedOriginPonto);
      if (nearest) {
        onSelectDestination?.(nearest.ponto, nearest.linha, nearest.distanceMeters);
        setLocalSearch("");
        onSearchChange("");
        setSuggestions([]);
        if (!persistent) onClose();
        return;
      }
    }

    // =========================================================================
    // B. SE ESTAMOS NO PASSO 1: ESCOLHER EMBARQUE (ORIGEM)
    // =========================================================================
    if (routeStep === "origin") {
      // 1. Sugestão é uma Parada de ônibus específica
      if (sug.tipo === "ponto" && sug.linhaId && sug.pontoId) {
        const linha = linhas.find((l) => l.id === sug.linhaId);
        const ponto = linha?.pontos.find((p) => p.id === sug.pontoId);
        if (linha && ponto) {
          onSelectOrigin?.(ponto, linha);
          setLocalSearch("");
          onSearchChange("");
          setSuggestions([]);
          return;
        }
      }

      // 2. Sugestão é uma Linha de ônibus
      if (sug.tipo === "linha" && sug.linhaId) {
        const linha = linhas.find((l) => l.id === sug.linhaId);
        if (linha) {
          setActiveBairro(linha);
          setLocalSearch("");
          onSearchChange("");
          setSuggestions([]);
          return;
        }
      }

      // 3. Sugestão é um POI ou Endereço geral
      const nearest = findNearestDestinationStop(sug.latitude, sug.longitude, linhas, null);
      if (nearest) {
        onSelectOrigin?.(nearest.ponto, nearest.linha, nearest.distanceMeters);
        setLocalSearch("");
        onSearchChange("");
        setSuggestions([]);
        return;
      }
    }

    // =========================================================================
    // C. MODO NORMAL (SEM CRIAÇÃO DE ROTA ATIVA: routeStep === "none")
    // =========================================================================
    // 1. Se for uma Linha de ônibus
    if (sug.tipo === "linha" && sug.linhaId) {
      const linha = linhas.find((l) => l.id === sug.linhaId);
      if (linha) {
        setActiveBairro(linha);
        onSelectBairro(linha.id);
        setLocalSearch("");
        onSearchChange("");
        setSuggestions([]);
        return;
      }
    }

    // 2. Se for uma Parada de ônibus específica
    if (sug.tipo === "ponto" && sug.linhaId && sug.pontoId) {
      const linha = linhas.find((l) => l.id === sug.linhaId);
      const ponto = linha?.pontos.find((p) => p.id === sug.pontoId);
      if (linha && ponto) {
        setActiveBairro(linha);
        onSelectPonto(linha.id, ponto.id);
        setLocalSearch("");
        onSearchChange("");
        setSuggestions([]);
        return;
      }
    }

    // 3. Se for um POI ou Endereço geral em modo normal
    onSelectSearchCoords?.({
      lat: sug.latitude,
      lon: sug.longitude,
      label: sug.label,
    });

    setLocalSearch(sug.label);
    onSearchChange("");
    setSuggestions([]);
  };

  // Bairros ordenados alfabeticamente e filtrados sem acento
  const sortedBairros = useMemo(() => {
    const list = [...linhas].sort((a, b) =>
      a.bairro.localeCompare(b.bairro, "pt-BR", { sensitivity: "base" })
    );

    if (!localSearch.trim()) return list;

    const query = normalizeText(localSearch);
    return list.filter(
      (l) =>
        normalizeText(l.bairro).includes(query) ||
        normalizeText(l.nomeExibicao).includes(query) ||
        normalizeText(l.codigo).includes(query)
    );
  }, [linhas, localSearch]);

  // Pontos do bairro ativo filtrados sem acento
  const filteredPontos = useMemo(() => {
    if (!activeBairro) return [];
    if (!localSearch.trim()) return activeBairro.pontos;

    const query = normalizeText(localSearch);
    return activeBairro.pontos.filter(
      (p) =>
        normalizeText(p.nome).includes(query) ||
        (p.rua ? normalizeText(p.rua).includes(query) : false) ||
        (p.referencia ? normalizeText(p.referencia).includes(query) : false)
    );
  }, [activeBairro, localSearch]);

  // Determina título e estado do botão de ação de rota
  const isRouteMode = routeStep !== "none";
  const isCalculatedStep = routeStep === "calculated";
  const isDestinationStep = routeStep === "destination";
  const isOriginStep = routeStep === "origin";

  const actionButtonText = isRouteMode ? "Cancelar rota" : "Criar rota";

  const handleActionClick = () => {
    if (isRouteMode) {
      if (onCancelRoute) {
        onCancelRoute();
      } else if (onResetRoute) {
        onResetRoute();
      }
    } else {
      if (!userCoords) {
        onRequestLocation?.();
      }
      onStartRoute?.();
    }
  };

  const inputPlaceholder = activeBairro
    ? isDestinationStep
      ? `Buscar parada de desembarque...`
      : isOriginStep
      ? `Buscar parada de embarque...`
      : "Buscar ponto neste bairro..."
    : isDestinationStep
    ? "Para onde você quer ir? (Buscar destino, faculdade, rua)"
    : isOriginStep
    ? "Onde você vai embarcar? (Buscar embarque, rua ou bairro)"
    : "Buscar rua, bairro ou linha...";


  // 1. NÓ DO INPUT DE BUSCA
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
          onClick={handleInputClick}
          onFocus={() => {
            if (localSearch.trim().length > 0) {
              onSearchTypingChange?.(true);
            }
          }}
          onBlur={() => {
            setTimeout(() => {
              onSearchTypingChange?.(false);
            }, 180);
          }}
          onChange={(e) => {
            const val = e.target.value;
            setLocalSearch(val);
            onSearchChange(val);
            if (val.trim().length > 0) {
              onSearchTypingChange?.(true);
            } else {
              onSearchTypingChange?.(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (visibleSuggestions.length > 0) {
                handleSelectSuggestion(visibleSuggestions[0]);
              }
            }
          }}
          placeholder={inputPlaceholder}
          aria-label={inputPlaceholder}
          className="filter-input w-full h-[42px] pl-10 pr-9 text-[16px] placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-coral/40 transition-shadow truncate"
        />

        {localSearch ? (
          <button
            type="button"
            onClick={() => {
              setLocalSearch("");
              onSearchChange("");
              setSuggestions([]);
              onSearchTypingChange?.(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink active:scale-95 transition-transform touch-manipulation cursor-pointer"
            aria-label="Limpar pesquisa"
            title="Limpar pesquisa"
          >
            <X className="w-4 h-4" strokeWidth={2.2} />
          </button>
        ) : null}
      </div>

      {/* Dropdown de sugestões do autocomplete de endereços e POIs */}
      {visibleSuggestions.length > 0 && (
        <div
          className={`absolute left-0 right-0 ${
            persistent ? "top-full mt-1.5" : "bottom-full mb-1.5"
          } bg-canvas/95 backdrop-blur-md rounded-xl border border-rule/40 shadow-raised-md overflow-hidden z-50 max-h-[220px] overflow-y-auto no-scrollbar`}
        >
          <div className="py-1 flex flex-col divide-y divide-rule/20">
            {visibleSuggestions.map((sug, index) => {
              const isPoi = sug.tipo === "poi";
              const isLinha = sug.tipo === "linha";
              const isPonto = sug.tipo === "ponto";

              return (
                <button
                  key={`${sug.id}-${index}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(sug)}
                  className="w-full px-3 py-2 text-left hover:bg-rule/20 active:bg-rule/30 transition-colors flex items-start cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-ink truncate flex items-center gap-1.5">
                      <span className="truncate">{sug.label}</span>
                      {isLinha && (
                        <span className="text-[12px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-coral/10 text-coral shrink-0">
                          Linha
                        </span>
                      )}
                      {isPoi && (
                        <span className="text-[12px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-coral/10 text-coral shrink-0">
                          Local
                        </span>
                      )}
                      {isPonto && (
                        <span className="text-[12px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                          Parada
                        </span>
                      )}
                    </div>
                    {sug.subtitulo && (
                      <div className="text-[11.5px] text-ink-muted truncate">
                        {sug.subtitulo}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // 2. NÓ DOS BOTÕES DE ROTA: Esquerda: Linhas/Ocultar | Centro: Minhas rotas (ou Salvar rota) | Direita: Ação
  const routeButtonsNode = (
    <div className={`grid ${hideRouteAction ? "grid-cols-2" : "grid-cols-3"} gap-1.5 sm:gap-2 w-full animate-stagger-item`}>
      {/* Botão 1 (Esquerda): Linhas (ou Ocultar) */}
      <Key
        type="button"
        pressed={showLinesGrid}
        onClick={handleToggleLinesGrid}
        className="w-full px-1 sm:px-2 text-[12px] sm:text-[13px] justify-center text-center font-semibold transition-all"
        title={showLinesGrid ? "Ocultar grade de linhas" : "Mostrar grade de linhas"}
      >
        <span className="truncate">{showLinesGrid ? "Ocultar" : "Linhas"}</span>
      </Key>

      {/* Botão 2 (Centro): Minhas rotas (ou Salvar rota) */}
      {isCalculatedStep ? (
        <Key
          type="button"
          pressed={isRouteSaved}
          onClick={onSaveRoute}
          className="w-full px-1 sm:px-2 text-[12px] sm:text-[13px] justify-center text-center font-semibold"
          title="Salvar esta rota para consultas futuras"
        >
          <span className="truncate">{isRouteSaved ? "Rota salva" : "Salvar rota"}</span>
        </Key>
      ) : (
        <Key
          type="button"
          pressed={isShowingSavedRoutes}
          onClick={onToggleSavedRoutes}
          className="w-full px-1 sm:px-2 text-[12px] sm:text-[13px] justify-center text-center font-semibold"
          title="Ver rotas salvas"
        >
          <span className="truncate">Minhas rotas</span>
        </Key>
      )}

      {/* Botão 3 (Direita): Criar rota ou Cancelar rota */}
      {!hideRouteAction && (
        <Key
          type="button"
          onClick={handleActionClick}
          className="w-full px-1 sm:px-2 text-[12px] sm:text-[13px] justify-center text-center font-semibold transition-all active:scale-95"
          title={actionButtonText}
        >
          <span className="truncate">{actionButtonText}</span>
        </Key>
      )}
    </div>
  );

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Painel de filtros de horários e rotas"
      className={`${
        persistent ? "desktop-sidebar-panel" : "filter-panel"
      } w-full p-2.5 sm:p-3 flex flex-col gap-2.5 select-none relative`}
    >

      {/* ==================================================================
          TRANSIÇÃO ENTRE BAIRROS E PONTOS (Apenas seta na 2ª camada)
         ================================================================== */}
      {showLinesGrid && activeBairro && (
        <div className="flex items-center justify-between gap-2 px-0.5 animate-stagger-item">
          <span className="text-[13px] font-bold text-ink truncate min-w-0 pl-1">
            {isDestinationStep ? `Desembarque: ${activeBairro.nomeExibicao}` : activeBairro.nomeExibicao}
          </span>
          <Key
            type="button"
            variant="icon"
            onClick={() => {
              setActiveBairro(null);
              if (routeStep === "none") {
                onSelectBairro(null);
              }
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
          MODO DESKTOP:
          1º: Botões de rotas ("Linhas", "Minhas rotas", "Criar/Cancelar rota")
          2º: Banner do passo atual (se rota em andamento)
          3º: Input de busca
          4º: Grade de linhas/bairros
         ================================================================== */}
      {persistent && (
        <div className="flex flex-col gap-2 w-full shrink-0">
          {routeButtonsNode}
          {searchInputNode}
        </div>
      )}

      {/* ==================================================================
          GRADE DE BAIRROS OU PONTOS
         ================================================================== */}
      {showLinesGrid && (
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
              {sortedBairros.length > 0 ? (
                sortedBairros.map((linha, idx) => {
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
                          if (routeStep === "none") {
                            onSelectBairro(linha.id);
                          }
                        }}
                        className="w-full px-2 text-[12.5px] sm:text-[14px] justify-start text-left truncate font-medium"
                        title={`${linha.codigo} - ${linha.bairro}`}
                      >
                        <span className="font-bold opacity-60 mr-1 text-[12px]">
                          {linha.codigo}
                        </span>
                        <span className="truncate">{linha.bairro}</span>
                      </Key>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 sm:col-span-3 py-6 px-3 flex flex-col items-center justify-center text-center gap-1.5 text-ink-muted">
                  <span className="text-[13px] font-medium text-ink">
                    Nenhuma linha direta com este nome
                  </span>
                  <span className="text-[12px] text-ink-muted leading-snug">
                    Selecione uma sugestão acima ou busque por faculdade, shopping ou endereço.
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Nível 2: Grade com todos os pontos de ônibus do bairro ativo */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {filteredPontos.map((ponto: PontoItinerario, idx: number) => {
                const isSelected = selectedPontoId === ponto.id;
                const isOriginStop = selectedOriginPonto?.ponto.id === ponto.id;
                const isOriginDisabledInDestStep = routeStep === "destination" && isOriginStop;

                return (
                  <div
                    key={`${ponto.id}-${idx}`}
                    className="w-full animate-stagger-item"
                    style={{ animationDelay: `${Math.min(idx * 15, 120)}ms` }}
                  >
                    <Key
                      type="button"
                        pressed={isSelected}
                        disabled={isOriginDisabledInDestStep}
                        onClick={() => {
                          if (isOriginDisabledInDestStep) return;
                          if (routeStep === "origin" && onSelectOrigin) {
                            onSelectOrigin(ponto, activeBairro);
                          } else if (routeStep === "destination" && onSelectDestination) {
                            onSelectDestination(ponto, activeBairro);
                            if (!persistent) {
                              onClose();
                            }
                          } else {
                            onSelectPonto(activeBairro.id, ponto.id);
                          }
                        }}
                        className={`w-full px-2 text-[12.5px] sm:text-[14px] justify-start text-left truncate font-medium ${
                          isOriginDisabledInDestStep ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        title={
                          isOriginDisabledInDestStep
                            ? `${ponto.nome} (Local de embarque selecionado)`
                            : ponto.nome
                        }
                      >
                      <span className="font-mono text-[12px] opacity-60 mr-1">
                        {String(ponto.ordem).padStart(2, "0")}.
                      </span>
                      <span className="truncate">
                        {ponto.nome
                          .replace(/\b(rua|r\.)\s+/gi, "")
                          .replace(/\s*\((.*?)\)\s*/g, " - $1")
                          .replace(/\s*-\s*-\s*/g, " - ")
                          .trim()}
                      </span>
                    </Key>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================
          MODO MOBILE:
          1º: Grade de bairros/pontos (acima se visível)
          2º: Input de busca
          3º: Botões de rotas na base ("Linhas", "Minhas rotas", "Criar/Cancelar rota")
         ================================================================== */}
      {!persistent && (
        <div className={`flex flex-col gap-2 w-full shrink-0 ${showLinesGrid ? "border-t border-rule/30 pt-2" : ""}`}>
          {searchInputNode}
          {routeButtonsNode}
        </div>
      )}

      {/* ==================================================================
          MODAL DE LOCALIZAÇÃO TÁTIL: "Usar localização?"
         ================================================================== */}
      {showLocationModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="loc-modal-title"
          className="absolute inset-0 bg-canvas/95 backdrop-blur-md z-40 rounded-dock p-4 flex flex-col justify-between border border-coral/30 shadow-raised-lg animate-scale-in"
        >
          <div className="flex flex-col gap-2">
            <div>
              <h4 id="loc-modal-title" className="text-[15px] font-bold text-ink">
                Usar localização?
              </h4>
            </div>
            <p className="text-[12.5px] text-ink-body leading-relaxed">
              Podemos usar a localização do seu aparelho para filtrar e listar instantaneamente as paradas de ônibus mais próximas de você em Guarapuava.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Key
              type="button"
              disabled={isLocating}
              onClick={handleDeclineLocation}
              className="w-full text-[13px] justify-center text-center font-medium"
            >
              Não
            </Key>
            <Key
              type="button"
              variant="coral"
              disabled={isLocating}
              onClick={handleAcceptLocation}
              className="w-full text-[13px] justify-center text-center font-bold"
            >
              {isLocating ? "Obtendo GPS..." : "Sim, usar"}
            </Key>
          </div>
        </div>
      )}
    </div>
  );
};
