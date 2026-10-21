"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Dock } from "@/components/ui/Dock";
import { Key } from "@/components/ui/Key";
import { OptionsPanel } from "@/components/ui/OptionsPanel";
import { Presence } from "@/components/ui/Presence";
import { FilterIndicator } from "@/components/ui/FilterIndicator";
import { InfoFeed } from "@/components/InfoFeed";
import { BusScheduleFeed, computeRouteJourney } from "@/components/bus/BusScheduleFeed";
import { UtilidadesAsideNav } from "@/components/utilidades/UtilidadesAsideNav";
import { BusFilterPanel } from "@/components/bus/BusFilterPanel";
import { BusRouteStepCard } from "@/components/bus/BusRouteStepCard";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useTheme } from "@/context/ThemeContext";
import { saveRoute, isRouteSaved } from "@/lib/bus/saved-routes";
import { normalizeText } from "@/lib/utils/search";
import rawBusData from "@/data/horarios-onibus.json";
import type { DadosHorariosOnibus, LinhaBairro, PontoItinerario } from "@/types/bus";

const busData = rawBusData as unknown as DadosHorariosOnibus;

const emptySubscribe = () => () => {};

export default function HorariosOnibusPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  // Estados de Filtros e Busca
  const [selectedBairroId, setSelectedBairroId] = useState<string | null>(null);
  const [selectedPontoId, setSelectedPontoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Estados de Rota
  const [routeStep, setRouteStep] = useState<"none" | "origin" | "destination" | "calculated">("none");
  const [selectedOriginPonto, setSelectedOriginPonto] = useState<{ ponto: PontoItinerario; linha: LinhaBairro; distanceMeters?: number | null } | null>(null);
  const [selectedDestinationPonto, setSelectedDestinationPonto] = useState<{ ponto: PontoItinerario; linha: LinhaBairro; distanceMeters?: number | null } | null>(null);
  const [targetSearchCoords, setTargetSearchCoords] = useState<{ lat: number; lon: number; label?: string } | null>(null);
  const [isShowingSavedRoutes, setIsShowingSavedRoutes] = useState(false);
  const [savedRoutesVersion, setSavedRoutesVersion] = useState(0);

  // Estados Mobile
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  // Estados de UX para Criação de Rota (Overlay do Passo 1, Foco do Passo 2 e Ocultação na Busca)
  const [isStep1OverlayOpen, setIsStep1OverlayOpen] = useState(false);
  const [isStep1AnimatingDown, setIsStep1AnimatingDown] = useState(false);
  const [isStep2FocusActive, setIsStep2FocusActive] = useState(false);
  const [isSearchTyping, setIsSearchTyping] = useState(false);

  // Controle de visibilidade da grade de linhas no painel de filtros
  const [showLinesGrid, setShowLinesGrid] = useState(false);

  const handleToggleLinesGrid = useCallback(() => {
    setShowLinesGrid((prev) => !prev);
  }, []);

  // Estados Desktop
  const [isDesktopInfoOpen, setIsDesktopInfoOpen] = useState(false);

  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { coords, requestLocation } = useUserLocation();

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isDark = mounted && theme === "dark";
  const themeLabel = isDark ? "Modo claro" : "Modo escuro";

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedBairroId(null);
    setSelectedPontoId(null);
    setSearchQuery("");
    setTargetSearchCoords(null);
  }, []);

  const handleResetRoute = useCallback(() => {
    setRouteStep("none");
    setSelectedOriginPonto(null);
    setSelectedDestinationPonto(null);
    setTargetSearchCoords(null);
    setIsShowingSavedRoutes(false);
    setIsStep1OverlayOpen(false);
    setIsStep1AnimatingDown(false);
    setIsStep2FocusActive(false);
  }, []);

  // Suporte à tecla Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isStep1OverlayOpen) {
          setIsStep1AnimatingDown(true);
          setTimeout(() => {
            setIsStep1OverlayOpen(false);
            setIsStep1AnimatingDown(false);
          }, 320);
          return;
        }
        if (isStep2FocusActive) {
          setIsStep2FocusActive(false);
          return;
        }
        if (isDesktopInfoOpen) {
          setIsDesktopInfoOpen(false);
          return;
        }
        if (isShowingSavedRoutes) {
          setIsShowingSavedRoutes(false);
          return;
        }
        if (isFilterOpen) {
          setIsFilterOpen(false);
          return;
        }
        if (isOptionsOpen) {
          setIsOptionsOpen(false);
          return;
        }
        if (routeStep !== "none") {
          handleResetRoute();
          return;
        }
        if (selectedPontoId) {
          setSelectedPontoId(null);
          return;
        }
        if (selectedBairroId || searchQuery) {
          handleClearFilters();
          return;
        }
        router.push("/utilidades");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isDesktopInfoOpen,
    isShowingSavedRoutes,
    isFilterOpen,
    isOptionsOpen,
    routeStep,
    selectedPontoId,
    selectedBairroId,
    searchQuery,
    router,
    handleClearFilters,
    handleResetRoute,
  ]);

  const handleToggleFilter = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    if (isStep1OverlayOpen) {
      setIsStep1OverlayOpen(false);
      setIsStep1AnimatingDown(false);
    }

    if (isFilterOpen) {
      setIsFilterOpen(false);
      return;
    }

    if (isOptionsOpen) {
      setIsOptionsOpen(false);
      transitionTimerRef.current = setTimeout(() => {
        setIsFilterOpen(true);
        transitionTimerRef.current = null;
      }, 200);
    } else {
      setIsFilterOpen(true);
    }
  };

  const handleToggleOptions = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    if (isStep1OverlayOpen) {
      setIsStep1OverlayOpen(false);
      setIsStep1AnimatingDown(false);
    }

    if (isOptionsOpen) {
      setIsOptionsOpen(false);
      return;
    }

    if (isFilterOpen) {
      setIsFilterOpen(false);
      transitionTimerRef.current = setTimeout(() => {
        setIsOptionsOpen(true);
        transitionTimerRef.current = null;
      }, 200);
    } else {
      setIsOptionsOpen(true);
    }
  };

  const handleSelectSearchCoords = useCallback(
    (coordsObj: { lat: number; lon: number; label: string } | null) => {
      setTargetSearchCoords(coordsObj);
      if (coordsObj && isShowingSavedRoutes) {
        setIsShowingSavedRoutes(false);
      }
    },
    [isShowingSavedRoutes]
  );

  const handleToggleSavedRoutes = useCallback(() => {
    setIsShowingSavedRoutes((prev) => !prev);
  }, []);

  const handleSaveRoute = useCallback(() => {
    if (selectedOriginPonto && selectedDestinationPonto) {
      saveRoute(selectedOriginPonto, selectedDestinationPonto);
      setSavedRoutesVersion((v) => v + 1);
    }
  }, [selectedOriginPonto, selectedDestinationPonto]);

  const isCurrentRouteSaved = useMemo(() => {
    if (!selectedOriginPonto || !selectedDestinationPonto) return false;
    if (savedRoutesVersion < 0) return false;
    return isRouteSaved(
      selectedOriginPonto.ponto.id,
      selectedDestinationPonto.ponto.id
    );
  }, [selectedOriginPonto, selectedDestinationPonto, savedRoutesVersion]);

  // Rota calculada para exibir detalhes no card inferior
  const routeJourney = useMemo(() => {
    if (routeStep !== "calculated" || !selectedOriginPonto || !selectedDestinationPonto) {
      return null;
    }
    const activeRefCoords = targetSearchCoords || coords;
    return computeRouteJourney(selectedOriginPonto, selectedDestinationPonto, busData.linhas, activeRefCoords);
  }, [routeStep, selectedOriginPonto, selectedDestinationPonto, targetSearchCoords, coords]);

  // Deslizar overlay do passo 1 para a base
  const handleDismissStep1Intro = useCallback(() => {
    if (isStep1AnimatingDown) return;
    setIsStep1AnimatingDown(true);
    setTimeout(() => {
      setIsStep1OverlayOpen(false);
      setIsStep1AnimatingDown(false);
    }, 320);
  }, [isStep1AnimatingDown]);

  // Iniciar criação de rota a partir do botão 'Criar rota'
  const handleStartRoute = useCallback(() => {
    setRouteStep("origin");
    setSelectedOriginPonto(null);
    setSelectedDestinationPonto(null);
    setTargetSearchCoords(null);
    setSelectedBairroId(null);
    setSelectedPontoId(null);
    setSearchQuery("");
    setIsShowingSavedRoutes(false);
    setIsFilterOpen(false); // Fecha o painel no mobile para o usuário escolher o embarque no feed
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsStep1OverlayOpen(false);
      setIsStep1AnimatingDown(false);
    } else {
      setIsStep1OverlayOpen(true);
      setIsStep1AnimatingDown(false);
    }
    setIsStep2FocusActive(false);

    // Solicita localização do usuário imediatamente para ordenar as paradas mais próximas de embarque
    requestLocation();
  }, [requestLocation]);

  // Cancelar criação de rota
  const handleCancelRoute = useCallback(() => {
    setRouteStep("none");
    setSelectedOriginPonto(null);
    setSelectedDestinationPonto(null);
    setTargetSearchCoords(null);
    setSelectedBairroId(null);
    setSelectedPontoId(null);
    setSearchQuery("");
    setIsStep1OverlayOpen(false);
    setIsStep1AnimatingDown(false);
    setIsStep2FocusActive(false);
  }, []);

  // Escolha de ponto de origem no feed ou painel
  const handleSelectOrigin = useCallback(
    (ponto: PontoItinerario, linha: LinhaBairro, distanceMeters?: number | null) => {
      setSelectedOriginPonto({ ponto, linha, distanceMeters });
      setRouteStep("destination");
      setIsStep2FocusActive(true); // Foco nos cards com suave desfoque
      setTargetSearchCoords(null);
      setSelectedBairroId(null);
      setSelectedPontoId(null);
      setSearchQuery("");

      // Rolar automaticamente para o topo ao selecionar o embarque (passo 1)
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        const desktopScroller = document.getElementById("desktop-center-scroller");
        if (desktopScroller) {
          desktopScroller.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    },
    []
  );

  // Escolha de ponto de destino no feed ou painel
  const handleSelectDestination = useCallback(
    (ponto: PontoItinerario, linha: LinhaBairro, distanceMeters?: number | null) => {
      // Impedir selecionar o mesmo local de embarque como destino
      if (selectedOriginPonto && selectedOriginPonto.ponto.id === ponto.id) {
        return;
      }

      setSelectedDestinationPonto({ ponto, linha, distanceMeters });
      setRouteStep("calculated");
      setIsStep2FocusActive(false);
      setTargetSearchCoords(null);
      setSelectedBairroId(null);
      setSelectedPontoId(null);
      setSearchQuery("");
      setIsFilterOpen(false); // Fecha o painel e exibe a rota calculada no feed

      // Rolar para o topo ao exibir o resultado da rota
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        const desktopScroller = document.getElementById("desktop-center-scroller");
        if (desktopScroller) {
          desktopScroller.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    },
    [selectedOriginPonto]
  );

  // Confirmação manual de avanço (caso o usuário clique no botão Avançar)
  const handleConfirmOrigin = useCallback(() => {
    if (selectedOriginPonto) {
      setRouteStep("destination");
      setIsStep2FocusActive(true);
      setTargetSearchCoords(null);
      setSelectedBairroId(null);
      setSelectedPontoId(null);
      setSearchQuery("");

      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        const desktopScroller = document.getElementById("desktop-center-scroller");
        if (desktopScroller) {
          desktopScroller.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    }
  }, [selectedOriginPonto]);

  const handleConfirmDestination = useCallback(() => {
    if (selectedDestinationPonto) {
      setRouteStep("calculated");
      setTargetSearchCoords(null);
      setSelectedBairroId(null);
      setSelectedPontoId(null);
      setSearchQuery("");
      setIsFilterOpen(false);
    }
  }, [selectedDestinationPonto]);

  const handleClearOrigin = useCallback(() => {
    setSelectedOriginPonto(null);
    setSelectedDestinationPonto(null);
    setRouteStep("origin");
    setTargetSearchCoords(null);
    setSelectedBairroId(null);
    setSelectedPontoId(null);
    setSearchQuery("");
  }, []);

  const handleClearDestination = useCallback(() => {
    setSelectedDestinationPonto(null);
    setRouteStep("destination");
    setTargetSearchCoords(null);
    setSelectedBairroId(null);
    setSelectedPontoId(null);
    setSearchQuery("");
  }, []);

  const handleSelectBairro = (bairroId: string | null) => {
    setSelectedBairroId(bairroId);
    setSelectedPontoId(null);
  };

  const handleSelectPonto = (bairroId: string, pontoId: string | null) => {
    setSelectedBairroId(bairroId);
    setSelectedPontoId(pontoId);
    setIsFilterOpen(false);
  };

  // Cálculo de dados para exibição do filtro ativo
  const activeBairroObj = selectedBairroId
    ? busData.linhas.find((l) => l.id === selectedBairroId)
    : null;

  const activePontoObj =
    activeBairroObj && selectedPontoId
      ? activeBairroObj.pontos.find((p) => p.id === selectedPontoId)
      : null;

  const filteredLinhasCount = useMemo(() => {
    if (targetSearchCoords) {
      // Linhas com paradas próximas ao local buscado (raio aproximado de 2.5km)
      return busData.linhas.filter((linha) => {
        return linha.pontos.some((p) => {
          if (!p.latitude || !p.longitude) return false;
          const dLat = p.latitude - targetSearchCoords.lat;
          const dLon = p.longitude - targetSearchCoords.lon;
          return Math.sqrt(dLat * dLat + dLon * dLon) <= 0.025;
        });
      }).length;
    }

    return busData.linhas.filter((linha) => {
      if (selectedBairroId && linha.id !== selectedBairroId) return false;
      if (!searchQuery.trim()) return true;
      const query = normalizeText(searchQuery);
      const matchLinha =
        normalizeText(linha.bairro).includes(query) ||
        normalizeText(linha.nomeExibicao).includes(query) ||
        normalizeText(linha.codigo).includes(query);
      const matchPontos = linha.pontos.some((p) =>
        normalizeText(p.nome).includes(query) ||
        (p.rua ? normalizeText(p.rua).includes(query) : false) ||
        (p.bairro ? normalizeText(p.bairro).includes(query) : false)
      );
      return matchLinha || matchPontos;
    }).length;
  }, [selectedBairroId, searchQuery, targetSearchCoords]);

  const hasActiveFilters = Boolean(selectedBairroId) || Boolean(selectedPontoId) || Boolean(searchQuery.trim()) || Boolean(targetSearchCoords);

  // Rótulo unificado para o modo mobile
  const filterIndicatorLabel = (
    <span>
      {activeBairroObj && (
        <>
          Bairro: <strong className="text-ink font-bold">{activeBairroObj.bairro}</strong>
          {" • "}
        </>
      )}
      {activePontoObj && (
        <>
          Ponto: <strong className="text-ink font-bold">{activePontoObj.nome}</strong>
          {" • "}
        </>
      )}
      {targetSearchCoords && (
        <>
          Local: &ldquo;<strong className="text-ink font-bold">{targetSearchCoords.label || "Endereço buscado"}</strong>&rdquo;
          {" • "}
        </>
      )}
      {!targetSearchCoords && searchQuery.trim() && (
        <>
          Busca: &ldquo;<strong className="text-ink font-bold">{searchQuery.trim()}</strong>&rdquo;
          {" • "}
        </>
      )}
      <span>
        <strong className="text-ink font-bold">{filteredLinhasCount}</strong>{" "}
        {filteredLinhasCount === 1 ? (targetSearchCoords ? "linha próxima" : "linha encontrada") : (targetSearchCoords ? "linhas próximas" : "linhas encontradas")}
      </span>
    </span>
  );

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink flex justify-center">
      {/* ==================================================================
          1. CASCA MOBILE (< 1024px) COM DOCK INFERIOR
         ================================================================== */}
      <div className="lg:hidden w-full flex justify-center py-6 px-4 select-text">
        <div className="w-full max-w-[430px] flex flex-col gap-4 pb-32">
            {/* Cabeçalho limpo */}
            <header className="flex flex-col gap-1 px-1 pt-1">
              <h1 className="text-[20px] font-bold text-ink tracking-tight">
                Horários de Ônibus
              </h1>
            </header>

            {/* Feed de Rolagem Contínua dos Horários */}
            <div
              className={`transition-all duration-300 ${
                isStep1OverlayOpen && !isStep1AnimatingDown
                  ? "opacity-0 pointer-events-none scale-[0.98]"
                  : "opacity-100 scale-100"
              }`}
            >
              <BusScheduleFeed
                linhas={busData.linhas}
                selectedBairroId={selectedBairroId}
                selectedPontoId={selectedPontoId}
                searchQuery={searchQuery}
                onClearFilter={handleClearFilters}
                routeStep={routeStep}
                selectedOriginPonto={selectedOriginPonto}
                selectedDestinationPonto={selectedDestinationPonto}
                userCoords={coords}
                targetSearchCoords={targetSearchCoords}
                isShowingSavedRoutes={isShowingSavedRoutes}
                onSelectOrigin={handleSelectOrigin}
                onSelectDestination={handleSelectDestination}
                onCancelRoute={handleCancelRoute}
                onClearOrigin={handleClearOrigin}
                onClearDestination={handleClearDestination}
              />
            </div>

            {/* Dock Inferior Mobile: Mais - Filtrar - Criar rota - Voltar */}
            <Dock
              align="between"
              above={
                <div className="flex flex-col gap-2 w-full">
                  {/* Indicador de Filtros Ativos (oculto quando digitando na busca para desobstruir sugestões) */}
                  <Presence
                    isVisible={hasActiveFilters && !isShowingSavedRoutes && routeStep !== "calculated" && !isSearchTyping}
                    duration={180}
                  >
                    <FilterIndicator
                      label={filterIndicatorLabel}
                      onClear={handleClearFilters}
                    />
                  </Presence>

                  {/* Painel de passos da criação de rota na base (mesmo componente BusRouteStepCard) */}
                  {/* Card de rota: inicia centralizado e desliza suavemente até a base */}
                  {(routeStep === "origin" || routeStep === "destination" || routeStep === "calculated") && !isSearchTyping && (
                    <div
                      style={{
                        transform:
                          routeStep === "origin" && isStep1OverlayOpen && !isStep1AnimatingDown
                            ? "translateY(calc(-50dvh + var(--dock-offset, 12px) + 112px))"
                            : "translateY(0px)",
                        transition: isStep1AnimatingDown
                          ? "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)"
                          : "none",
                        willChange: isStep1OverlayOpen ? "transform" : "auto",
                        zIndex: isStep1OverlayOpen ? 50 : 10,
                      }}
                      className="w-full relative"
                      onClick={isStep1OverlayOpen ? handleDismissStep1Intro : undefined}
                    >
                      <BusRouteStepCard
                        routeStep={routeStep}
                        selectedOriginPonto={selectedOriginPonto}
                        selectedDestinationPonto={selectedDestinationPonto}
                        routeJourney={routeJourney}
                        onCancelRoute={handleCancelRoute}
                        onClearOrigin={handleClearOrigin}
                        onClearDestination={handleClearDestination}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 grid-rows-1 items-end w-full [grid-template-areas:'stack']">
                    {/* Bloco de Filtros & Rotas - acessível a qualquer momento, inclusive durante criação de rota */}
                    <div className="w-full [grid-area:stack]">
                      <Presence isVisible={isFilterOpen} duration={isStep1OverlayOpen ? 0 : 180}>
                        <BusFilterPanel
                          linhas={busData.linhas}
                          selectedBairroId={selectedBairroId}
                          selectedPontoId={selectedPontoId}
                          searchQuery={searchQuery}
                          onSelectBairro={handleSelectBairro}
                          onSelectPonto={handleSelectPonto}
                          onSearchChange={(q) => setSearchQuery(q)}
                          onClose={() => setIsFilterOpen(false)}
                          filterButtonRef={filterButtonRef}
                          showLinesGrid={showLinesGrid}
                          onToggleLinesGrid={handleToggleLinesGrid}
                          routeStep={routeStep}
                          selectedOriginPonto={selectedOriginPonto}
                          selectedDestinationPonto={selectedDestinationPonto}
                          userCoords={coords}
                          isShowingSavedRoutes={isShowingSavedRoutes}
                          onToggleSavedRoutes={handleToggleSavedRoutes}
                          onSaveRoute={handleSaveRoute}
                          isRouteSaved={isCurrentRouteSaved}
                          onStartRoute={handleStartRoute}
                          hideRouteAction
                          onCancelRoute={handleCancelRoute}
                          onConfirmOrigin={handleConfirmOrigin}
                          onConfirmDestination={handleConfirmDestination}
                          onResetRoute={handleResetRoute}
                          onSelectOrigin={handleSelectOrigin}
                          onSelectDestination={handleSelectDestination}
                          onRequestLocation={async () => {
                            await requestLocation();
                          }}
                          onSelectSearchCoords={handleSelectSearchCoords}
                          onSearchTypingChange={setIsSearchTyping}
                        />
                      </Presence>
                    </div>

                    {/* Bloco de Opções */}
                    <div className="w-full [grid-area:stack]">
                      <Presence isVisible={isOptionsOpen} duration={180}>
                        <OptionsPanel
                          onClose={() => setIsOptionsOpen(false)}
                          onSelectInfo={() => {
                            setIsOptionsOpen(false);
                            router.push("/#informacoes");
                          }}
                          optionsButtonRef={optionsButtonRef}
                        />
                      </Presence>
                    </div>
                  </div>
                </div>
              }
              aria-label="Navegação da tela de horários"
            >
              <div className="grid grid-cols-4 w-full gap-1.5 sm:gap-2">
                {/* 1. Mais */}
                <Key
                  ref={optionsButtonRef}
                  type="button"
                  pressed={isOptionsOpen}
                  onClick={handleToggleOptions}
                  aria-expanded={isOptionsOpen}
                  className="w-full px-2 text-[14px] justify-center text-center font-medium"
                  aria-label={isOptionsOpen ? "Fechar menu mais" : "Abrir menu mais"}
                >
                  Mais
                </Key>

                {/* 2. Filtrar */}
                <Key
                  ref={filterButtonRef}
                  type="button"
                  pressed={isFilterOpen}
                  onClick={handleToggleFilter}
                  aria-expanded={isFilterOpen}
                  className="w-full px-2 text-[14px] justify-center text-center font-medium"
                  aria-label={isFilterOpen ? "Fechar filtros" : "Abrir filtros de bairros e rotas"}
                >
                  Filtrar
                </Key>

                {/* 3. Criar rota / Cancelar */}
                <Key
                  type="button"
                  pressed={routeStep !== "none"}
                  onClick={routeStep !== "none" ? handleCancelRoute : handleStartRoute}
                  className="w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center font-medium overflow-hidden text-ellipsis whitespace-nowrap"
                  aria-label={routeStep !== "none" ? "Cancelar criação de rota" : "Criar rota"}
                >
                  {routeStep !== "none" ? "Cancelar" : "Criar rota"}
                </Key>

                {/* 4. Voltar */}
                <Key
                  type="button"
                  onClick={() => router.push("/utilidades")}
                  className="w-full px-2 text-[14px] justify-center text-center font-medium"
                  aria-label="Voltar para a lista de utilidades"
                  title="Voltar para a página de utilidades"
                >
                  Voltar
                </Key>
              </div>
            </Dock>
          </div>
      </div>

      {/* ==================================================================
          2. PALCO DESKTOP (>= 1024px) COM PALCO 3D ESTACIONADO À ESQUERDA
         ================================================================== */}
      <div className="hidden lg:flex w-full justify-center">
        <div className="w-full h-[100dvh] max-h-[100dvh] overflow-hidden flex justify-center py-6 px-4 xl:px-8 select-text">
          <div className="flex items-start justify-center gap-4.5 max-w-[1300px] w-full h-full max-h-full">
            {/* Coluna Esquerda: Lista de utilidades em perspectiva 3D (alterna entre ferramentas) */}
            <aside
              aria-label="Lista de utilidades"
              className="w-[430px] shrink-0 desktop-perspective-container h-full max-h-full pointer-events-none"
            >
              <UtilidadesAsideNav activeId="onibus" />
            </aside>

            {/* Coluna Central (Feed Principal de Horários) */}
            <main
              aria-label="Conteúdo de horários"
              className="w-[430px] shrink-0 h-full max-h-full flex flex-col relative"
            >
              {/* Cabeçalho Fixo Desktop (Título + Card de Criação de Rota) */}
              <div className="w-full shrink-0 z-40 pb-3 flex flex-col gap-3">
                <header className="flex flex-col gap-1 px-1 pt-1">
                  <h1 className="text-[20px] font-bold text-ink tracking-tight">
                    Horários de Ônibus
                  </h1>
                </header>

                {/* Step Card Fixo no Topo do Desktop durante criação de rota */}
                {routeStep !== "none" && (
                  <div className="w-full">
                    <BusRouteStepCard
                      routeStep={routeStep}
                      selectedOriginPonto={selectedOriginPonto}
                      selectedDestinationPonto={selectedDestinationPonto}
                      routeJourney={routeJourney}
                      onCancelRoute={handleCancelRoute}
                      onClearOrigin={handleClearOrigin}
                      onClearDestination={handleClearDestination}
                    />
                  </div>
                )}
              </div>

              {/* Feed com Rolagem Suave */}
              <div
                id="desktop-center-scroller"
                className="w-[calc(100%+80px)] -mx-10 px-10 pt-1 pb-24 flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain [mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_calc(100%-36px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_calc(100%-36px),transparent_100%)]"
              >
                <div className="flex flex-col gap-4">
                  <BusScheduleFeed
                    linhas={busData.linhas}
                    selectedBairroId={selectedBairroId}
                    selectedPontoId={selectedPontoId}
                    searchQuery={searchQuery}
                    onClearFilter={handleClearFilters}
                    routeStep={routeStep}
                    selectedOriginPonto={selectedOriginPonto}
                    selectedDestinationPonto={selectedDestinationPonto}
                    userCoords={coords}
                    targetSearchCoords={targetSearchCoords}
                    isShowingSavedRoutes={isShowingSavedRoutes}
                    onSelectOrigin={handleSelectOrigin}
                    onSelectDestination={handleSelectDestination}
                    onCancelRoute={handleCancelRoute}
                    onClearOrigin={handleClearOrigin}
                    onClearDestination={handleClearDestination}
                  />
                </div>
              </div>
            </main>

            {/* Coluna Direita (Opções no Topo + Filtros e Rotas Unificados em 3 Linhas / 6 Botões) */}
            <aside
              aria-label="Painel lateral de filtros e opções"
              className="w-[360px] shrink-0 h-full max-h-full flex flex-col"
            >
              {/* Linha dos Botões de Opções em Três Linhas */}
              <div className="w-full shrink-0 z-20 pb-2.5 flex flex-col gap-2">
                {/* Linha 1: Informações e Modo Claro/Escuro */}
                <div
                  role="toolbar"
                  aria-label="Opções primárias"
                  className="grid grid-cols-2 gap-2 w-full h-[42px]"
                >
                  <Key
                    type="button"
                    pressed={isDesktopInfoOpen}
                    onClick={() => setIsDesktopInfoOpen((prev) => !prev)}
                    className="w-full px-1 text-[13px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
                    title="Abrir termos e diretrizes"
                  >
                    Informações
                  </Key>

                  <Key
                    type="button"
                    onClick={toggleTheme}
                    className="w-full px-1 text-[13px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
                    title={`Alternar para ${themeLabel}`}
                  >
                    {themeLabel}
                  </Key>
                </div>

                {/* Linha 2: Notícias e Vagas */}
                <div
                  role="toolbar"
                  aria-label="Navegação de abas"
                  className="grid grid-cols-2 gap-2 w-full h-[42px]"
                >
                  <Key
                    type="button"
                    onClick={() => router.push("/")}
                    className="w-full px-1 text-[13px] justify-center text-center font-semibold overflow-hidden text-ellipsis whitespace-nowrap"
                    title="Ir para Notícias"
                  >
                    Notícias
                  </Key>

                  <Key
                    type="button"
                    onClick={() => router.push("/#vagas")}
                    className="w-full px-1 text-[13px] justify-center text-center font-semibold overflow-hidden text-ellipsis whitespace-nowrap"
                    title="Ir para Vagas"
                  >
                    Vagas
                  </Key>
                </div>

                {/* Linha 3: Cidade Viva e Utilidades */}
                <div
                  role="toolbar"
                  aria-label="Ferramentas e utilidades"
                  className="grid grid-cols-2 gap-2 w-full h-[42px]"
                >
                  <Key
                    type="button"
                    onClick={() => router.push("/cidade-viva")}
                    className="w-full px-1 text-[13px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
                    title="Abrir mapa colaborativo Cidade Viva"
                  >
                    Cidade Viva
                  </Key>

                  <Key
                    type="button"
                    pressed={true}
                    aria-current="page"
                    onClick={() => router.push("/utilidades")}
                    className="w-full px-1 text-[13px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
                    title="Utilidades e horários"
                  >
                    Utilidades
                  </Key>
                </div>
              </div>

              <div
                className={`w-[calc(100%+64px)] -mx-8 px-8 py-5 flex-1 min-h-0 ${
                  isDesktopInfoOpen
                    ? "overflow-y-auto no-scrollbar overscroll-contain"
                    : "overflow-visible"
                }`}
              >
                {isDesktopInfoOpen ? (
                  <div
                    role="region"
                    aria-label="Informações do portal"
                    className="desktop-sidebar-panel w-full p-4"
                  >
                    <InfoFeed
                      hideNav
                      onSelectNoticias={() => router.push("/")}
                      onSelectVagas={() => router.push("/#vagas")}
                    />
                  </div>
                ) : (
                  <BusFilterPanel
                    persistent={true}
                    linhas={busData.linhas}
                    selectedBairroId={selectedBairroId}
                    selectedPontoId={selectedPontoId}
                    searchQuery={searchQuery}
                    onSelectBairro={handleSelectBairro}
                    onSelectPonto={handleSelectPonto}
                    onSearchChange={(q) => setSearchQuery(q)}
                    onClose={() => {}}
                    showLinesGrid={showLinesGrid}
                    onToggleLinesGrid={handleToggleLinesGrid}
                    routeStep={routeStep}
                    selectedOriginPonto={selectedOriginPonto}
                    selectedDestinationPonto={selectedDestinationPonto}
                    userCoords={coords}
                    isShowingSavedRoutes={isShowingSavedRoutes}
                    onToggleSavedRoutes={handleToggleSavedRoutes}
                    onSaveRoute={handleSaveRoute}
                    isRouteSaved={isCurrentRouteSaved}
                    onStartRoute={handleStartRoute}
                    onCancelRoute={handleCancelRoute}
                    onConfirmOrigin={handleConfirmOrigin}
                    onConfirmDestination={handleConfirmDestination}
                    onResetRoute={handleResetRoute}
                    onSelectOrigin={handleSelectOrigin}
                    onSelectDestination={handleSelectDestination}
                    onRequestLocation={async () => {
                      await requestLocation();
                    }}
                    onSelectSearchCoords={handleSelectSearchCoords}
                    onSearchTypingChange={setIsSearchTyping}
                  />
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* ==================================================================
          OVERLAY ISOLADO: PASSO 1 (ESCOLHA O EMBARQUE)
          Utiliza exatamente o mesmo componente BusRouteStepCard.
          Sem botões e sem textos extras no estado centralizado.
          Ao tocar no card ou na tela, o card desliza visivelmente do centro
          até a posição de descanso na base, e apenas ao aterrissar o botão Cancelar surge.
         ================================================================== */}
      {/* ==================================================================
          PASSO 1: BACKDROP CENTRALIZADO
          Posicionado em z-[35], atrás do dock (z-40) e à frente do feed.
          Mantém o dock e seus 3 botões 100% visíveis desde o primeiro instante.
          O card de passo desliza suavemente do centro diretamente no .dock-stack.
         ================================================================== */}
      {isStep1OverlayOpen && (
        <div
          role="presentation"
          aria-hidden="true"
          onClick={handleDismissStep1Intro}
          className={`lg:hidden fixed inset-0 z-[35] bg-canvas/75 backdrop-blur-sm transition-opacity duration-320 ease-out cursor-pointer ${
            isStep1AnimatingDown ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        />
      )}


      {/* ==================================================================
          OVERLAY DE FOCO: PASSO 2 (ESCOLHA O DESEMBARQUE)
          Efeito suave de desfoque de fundo focado nos horários.
          Ao tocar na tela, remove o desfoque para permitir a seleção do destino.
         ================================================================== */}
      {isStep2FocusActive && routeStep === "destination" && (
        <div
          role="presentation"
          aria-hidden="true"
          onClick={() => setIsStep2FocusActive(false)}
          onTouchStart={() => setIsStep2FocusActive(false)}
          className="fixed inset-0 z-30 bg-canvas/30 backdrop-blur-[2.5px] animate-fade-in cursor-pointer transition-opacity duration-300"
        />
      )}
    </div>
  );
}
