"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, MapPin, Navigation, ArrowRight, RotateCcw, Compass } from "lucide-react";
import { Key } from "@/components/ui/Key";
import type { LinhaBairro, PontoItinerario } from "@/types/bus";
import type { GeoSuggestion } from "@/app/api/geo/autocomplete/route";

export interface BusRoutePlannerPanelProps {
  linhas: LinhaBairro[];
  routeStep: "none" | "origin" | "destination" | "calculated";
  selectedOriginPonto: { ponto: PontoItinerario; linha: LinhaBairro } | null;
  selectedDestinationPonto: { ponto: PontoItinerario; linha: LinhaBairro } | null;
  userCoords: { lat: number; lon: number } | null;
  onConfirmOrigin: () => void;
  onConfirmDestination: () => void;
  onResetRoute: () => void;
  onClose: () => void;
  onSelectOrigin: (ponto: PontoItinerario, linha: LinhaBairro) => void;
  onSelectDestination: (ponto: PontoItinerario, linha: LinhaBairro) => void;
  onRequestLocation: () => Promise<void>;
  routeButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

export const BusRoutePlannerPanel: React.FC<BusRoutePlannerPanelProps> = ({
  linhas,
  routeStep,
  selectedOriginPonto,
  selectedDestinationPonto,
  userCoords,
  onConfirmOrigin,
  onConfirmDestination,
  onResetRoute,
  onClose,
  onSelectOrigin,
  onSelectDestination,
  onRequestLocation,
  routeButtonRef,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [hasPromptedLocation, setHasPromptedLocation] = useState(false);
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fecha o bloco se clicar fora (exceto no botão Rotas do dock)
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      if (
        panelRef.current?.contains(target as Node) ||
        target.closest?.(".dock-shell") ||
        target.closest?.(".dock") ||
        (routeButtonRef?.current && routeButtonRef.current.contains(target as Node))
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
  }, [onClose, routeButtonRef, showLocationModal]);

  // Autocomplete com debounce de 250ms
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/geo/autocomplete?q=${encodeURIComponent(searchQuery.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
        }
      } catch {
        // Silencioso
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleInputClick = () => {
    if (!hasPromptedLocation && !userCoords) {
      setShowLocationModal(true);
    }
  };

  const handleAcceptLocation = async () => {
    setHasPromptedLocation(true);
    setShowLocationModal(false);
    await onRequestLocation();
  };

  const handleDeclineLocation = () => {
    setHasPromptedLocation(true);
    setShowLocationModal(false);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleSelectSuggestion = (sug: GeoSuggestion) => {
    // Procura o ponto mais próximo da sugestão em todas as linhas
    let bestPonto: PontoItinerario | null = null;
    let bestLinha: LinhaBairro | null = null;
    let bestDist = Infinity;

    for (const linha of linhas) {
      for (const ponto of linha.pontos) {
        if (ponto.latitude && ponto.longitude) {
          const d =
            Math.pow(ponto.latitude - sug.latitude, 2) +
            Math.pow(ponto.longitude - sug.longitude, 2);
          if (d < bestDist) {
            bestDist = d;
            bestPonto = ponto;
            bestLinha = linha;
          }
        }
      }
    }

    if (bestPonto && bestLinha) {
      if (routeStep === "origin") {
        onSelectOrigin(bestPonto, bestLinha);
      } else if (routeStep === "destination") {
        onSelectDestination(bestPonto, bestLinha);
      }
    }

    setSearchQuery("");
    setSuggestions([]);
  };

  // Determina título e estado do botão de ação
  const isOriginStep = routeStep === "origin";
  const isDestinationStep = routeStep === "destination";
  const isCalculatedStep = routeStep === "calculated";

  const isConfirmEnabled =
    (isOriginStep && Boolean(selectedOriginPonto)) ||
    (isDestinationStep && Boolean(selectedDestinationPonto));

  const actionButtonText = isOriginStep
    ? selectedOriginPonto
      ? "Confirmar Partida"
      : "Selecione o ponto de partida"
    : isDestinationStep
    ? selectedDestinationPonto
      ? "Confirmar Destino"
      : "Selecione o ponto de chegada"
    : "Nova Rota";

  const inputPlaceholder = isOriginStep
    ? "Para onde você quer sair? (Buscar rua, bairro ou ponto)"
    : "Para onde você quer ir? (Buscar destino, rua ou bairro)";

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Planejador de rotas de ônibus"
      className="filter-panel w-full p-2.5 sm:p-3 flex flex-col gap-2.5 select-none relative"
    >
      {/* ==================================================================
          1. LINHA SUPERIOR: Botão de Ação / Confirmar
         ================================================================== */}
      <div className="grid grid-cols-1 w-full animate-stagger-item">
        {isCalculatedStep ? (
          <div className="flex items-center gap-2">
            <Key
              type="button"
              variant="coral"
              onClick={onResetRoute}
              className="flex-1 px-3 text-[13.5px] justify-center text-center font-semibold flex items-center gap-2"
              title="Planejar outra rota"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Nova Rota</span>
            </Key>
          </div>
        ) : (
          <Key
            type="button"
            variant={isConfirmEnabled ? "coral" : "label"}
            disabled={!isConfirmEnabled}
            onClick={() => {
              if (isOriginStep) onConfirmOrigin();
              else if (isDestinationStep) onConfirmDestination();
            }}
            className={`w-full px-3 text-[13.5px] justify-center text-center font-semibold transition-all ${
              !isConfirmEnabled ? "opacity-50 cursor-not-allowed" : "shadow-md active:scale-95"
            }`}
            title={actionButtonText}
          >
            <div className="flex items-center justify-center gap-2">
              <span>{actionButtonText}</span>
              {isConfirmEnabled && <ArrowRight className="w-4 h-4" />}
            </div>
          </Key>
        )}
      </div>

      {/* ==================================================================
          2. LINHA INFERIOR: Input de Busca com gatilho para Localização
         ================================================================== */}
      {!isCalculatedStep && (
        <div className="relative w-full pt-1 border-t border-rule/30">
          <div className="relative w-full">
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
              aria-hidden="true"
            >
              {userCoords ? (
                <Compass className="w-4 h-4 text-coral animate-pulse" />
              ) : (
                <Search className="w-4 h-4" strokeWidth={2.2} />
              )}
            </span>

            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onClick={handleInputClick}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={inputPlaceholder}
              aria-label={inputPlaceholder}
              className="filter-input w-full h-[42px] pl-10 pr-9 text-[15px] sm:text-[16px] placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-coral/40 transition-shadow truncate"
            />

            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSuggestions([]);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink active:scale-95 transition-transform touch-manipulation cursor-pointer"
                aria-label="Limpar pesquisa"
                title="Limpar pesquisa"
              >
                <X className="w-4 h-4" strokeWidth={2.2} />
              </button>
            ) : null}
          </div>

          {/* Dropdown de sugestões do autocomplete */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 bottom-full mb-1.5 bg-canvas/95 backdrop-blur-md rounded-xl border border-rule/40 shadow-raised-md overflow-hidden z-50 max-h-[190px] overflow-y-auto no-scrollbar">
              <div className="py-1 flex flex-col divide-y divide-rule/20">
                {suggestions.map((sug) => (
                  <button
                    key={sug.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(sug)}
                    className="w-full px-3 py-2 text-left hover:bg-rule/20 active:bg-rule/30 transition-colors flex items-start gap-2.5 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-coral shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-ink truncate">
                        {sug.label}
                      </div>
                      {sug.cep && (
                        <div className="text-[11px] text-ink-muted">
                          CEP: {sug.cep}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================
          3. MODAL DE LOCALIZAÇÃO TÁTIL: "Usar localização?"
         ================================================================== */}
      {showLocationModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="loc-modal-title"
          className="absolute inset-0 bg-canvas/95 backdrop-blur-md z-40 rounded-dock p-4 flex flex-col justify-between border border-coral/30 shadow-raised-lg animate-scale-in"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-coral">
              <Navigation className="w-5 h-5 animate-bounce" />
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
              onClick={handleDeclineLocation}
              className="w-full text-[13px] justify-center text-center font-medium"
            >
              Não
            </Key>
            <Key
              type="button"
              variant="coral"
              onClick={handleAcceptLocation}
              className="w-full text-[13px] justify-center text-center font-bold"
            >
              Sim, usar
            </Key>
          </div>
        </div>
      )}
    </div>
  );
};
