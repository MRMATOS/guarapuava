"use client";

import React, { useState, useRef, useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Dock } from "@/components/ui/Dock";
import { Key } from "@/components/ui/Key";
import { OptionsPanel } from "@/components/ui/OptionsPanel";
import { Presence } from "@/components/ui/Presence";
import { FilterIndicator } from "@/components/ui/FilterIndicator";
import { InfoFeed } from "@/components/InfoFeed";
import { BusScheduleFeed } from "@/components/bus/BusScheduleFeed";
import { BusFilterPanel } from "@/components/bus/BusFilterPanel";
import { useTheme } from "@/context/ThemeContext";
import rawBusData from "@/data/horarios-onibus.json";
import type { DadosHorariosOnibus } from "@/types/bus";

const busData = rawBusData as unknown as DadosHorariosOnibus;

const emptySubscribe = () => () => {};

export default function HorariosOnibusPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  // Estados de Filtros e Busca
  const [selectedBairroId, setSelectedBairroId] = useState<string | null>(null);
  const [selectedPontoId, setSelectedPontoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Estados Mobile
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isMobileInfoOpen, setIsMobileInfoOpen] = useState(false);

  // Estados Desktop
  const [isDesktopInfoOpen, setIsDesktopInfoOpen] = useState(false);

  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Suporte à tecla Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDesktopInfoOpen) {
          setIsDesktopInfoOpen(false);
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
  }, [isDesktopInfoOpen, isFilterOpen, isOptionsOpen, selectedPontoId, selectedBairroId, searchQuery, router]);

  const handleToggleFilter = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
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

  const handleSelectBairro = (bairroId: string | null) => {
    setSelectedBairroId(bairroId);
    setSelectedPontoId(null);
  };

  const handleSelectPonto = (bairroId: string, pontoId: string | null) => {
    setSelectedBairroId(bairroId);
    setSelectedPontoId(pontoId);
    setIsFilterOpen(false);
  };

  const handleClearFilters = () => {
    setSelectedBairroId(null);
    setSelectedPontoId(null);
    setSearchQuery("");
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
    return busData.linhas.filter((linha) => {
      if (selectedBairroId && linha.id !== selectedBairroId) return false;
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      const matchLinha =
        linha.bairro.toLowerCase().includes(query) ||
        linha.nomeExibicao.toLowerCase().includes(query) ||
        linha.codigo.includes(query);
      const matchPontos = linha.pontos.some((p) =>
        p.nome.toLowerCase().includes(query)
      );
      return matchLinha || matchPontos;
    }).length;
  }, [selectedBairroId, searchQuery]);

  const hasActiveFilters = Boolean(selectedBairroId) || Boolean(selectedPontoId) || Boolean(searchQuery.trim());

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
      {searchQuery.trim() && (
        <>
          Busca: &ldquo;<strong className="text-ink font-bold">{searchQuery.trim()}</strong>&rdquo;
          {" • "}
        </>
      )}
      <span>
        <strong className="text-ink font-bold">{filteredLinhasCount}</strong>{" "}
        {filteredLinhasCount === 1 ? "linha encontrada" : "linhas encontradas"}
      </span>
    </span>
  );

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink flex justify-center">
      {/* ==================================================================
          1. CASCA MOBILE (< 1024px) COM DOCK INFERIOR
         ================================================================== */}
      <div className="lg:hidden w-full flex justify-center py-6 px-4 select-text">
        {isMobileInfoOpen ? (
          <div className="w-full max-w-[430px]">
            <InfoFeed
              hideNav={true}
              onSelectNoticias={() => {
                setIsMobileInfoOpen(false);
                router.push("/");
              }}
              onSelectVagas={() => {
                setIsMobileInfoOpen(false);
                router.push("/#vagas");
              }}
            />
            <Dock align="between" aria-label="Navegação de retorno">
              <div className="grid grid-cols-1 w-full">
                <Key
                  type="button"
                  onClick={() => setIsMobileInfoOpen(false)}
                  className="w-full px-2 text-[14px] justify-center text-center font-medium"
                >
                  Voltar aos Horários de Ônibus
                </Key>
              </div>
            </Dock>
          </div>
        ) : (
          <div className="w-full max-w-[430px] flex flex-col gap-4 pb-32">
            {/* Cabeçalho sem "Guarapuava" */}
            <header className="flex flex-col gap-1 px-1 pt-1">
              <h1 className="text-[20px] font-bold text-ink tracking-tight">
                Horários de Ônibus
              </h1>

              <p className="text-[13.5px] text-ink-muted leading-relaxed">
                Consulte os horários por ponto de referência e itinerário completo de cada linha.
              </p>
            </header>

            {/* Feed de Rolagem Contínua dos Horários */}
            <BusScheduleFeed
              linhas={busData.linhas}
              selectedBairroId={selectedBairroId}
              selectedPontoId={selectedPontoId}
              searchQuery={searchQuery}
              onClearFilter={handleClearFilters}
            />

            {/* Dock Inferior Mobile com Filtro e Opções */}
            <Dock
              align="between"
              above={
                <div className="flex flex-col gap-2 w-full">
                  {/* Indicador de Filtros Ativos (Aparece no Mobile) */}
                  <Presence isVisible={hasActiveFilters} duration={180}>
                    <FilterIndicator
                      label={filterIndicatorLabel}
                      onClear={handleClearFilters}
                    />
                  </Presence>

                  <div className="grid grid-cols-1 grid-rows-1 items-end w-full [grid-template-areas:'stack']">
                    {/* Bloco de Filtros */}
                    <div className="w-full [grid-area:stack]">
                      <Presence isVisible={isFilterOpen} duration={180}>
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
                            setIsMobileInfoOpen(true);
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
              <div className="grid grid-cols-3 w-full gap-2">
                <Key
                  type="button"
                  onClick={() => router.push("/utilidades")}
                  className="w-full px-2 text-[14px] justify-center text-center font-medium"
                  aria-label="Voltar para a página de utilidades"
                >
                  Voltar
                </Key>

                <Key
                  ref={filterButtonRef}
                  type="button"
                  pressed={isFilterOpen}
                  onClick={handleToggleFilter}
                  aria-expanded={isFilterOpen}
                  className="w-full px-2 text-[14px] justify-center text-center font-medium"
                  aria-label={isFilterOpen ? "Fechar filtros" : "Abrir filtros de bairros"}
                >
                  Filtrar
                </Key>

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
              </div>
            </Dock>
          </div>
        )}
      </div>

      {/* ==================================================================
          2. PALCO DESKTOP (>= 1024px) COM PALCO 3D ESTACIONADO À ESQUERDA
         ================================================================== */}
      <div className="hidden lg:flex w-full justify-center">
        <div className="w-full h-[100dvh] max-h-[100dvh] overflow-hidden flex justify-center py-6 px-4 xl:px-8 select-text">
          <div className="flex items-start justify-center gap-4.5 max-w-[1300px] w-full h-full max-h-full">
            {/* Coluna Esquerda: Página de Utilidades estacionada em perspectiva 3D */}
            <aside
              aria-label="Página de utilidades estacionada"
              className="w-[430px] shrink-0 desktop-perspective-container h-full max-h-full pointer-events-auto"
            >
              <div
                onClick={() => router.push("/utilidades")}
                className="desktop-parked-panel w-full h-full flex flex-col group relative cursor-pointer pt-3"
                title="Voltar para a lista de utilidades"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    router.push("/utilidades");
                  }
                }}
              >
                <div className="surface-card w-full p-5 text-left flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[17px] font-bold text-ink tracking-tight">
                      Horários de Ônibus
                    </h2>
                    <span className="badge-inset text-[11px] px-2 py-0.5 font-semibold text-coral">
                      45 Linhas
                    </span>
                  </div>

                  <p className="text-[13.5px] text-ink-body leading-relaxed">
                    Consulte linhas urbanas e interbairros, horários de saída e pontos de passagem em cada bairro de Guarapuava.
                  </p>

                  <div className="flex items-center gap-2 pt-1 border-t border-rule/30 text-[12px] text-ink-muted font-medium">
                    <span>Pérola do Oeste</span>
                    <span>•</span>
                    <span>Itinerários por parada</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Coluna Central (Feed Principal de Horários) */}
            <main
              aria-label="Conteúdo de horários"
              className="w-[430px] shrink-0 h-full max-h-full flex flex-col relative"
            >
              {/* Cabeçalho com Notícias e Vagas */}
              <div className="w-full shrink-0 z-20 pb-2.5">
                <nav
                  aria-label="Navegação de abas"
                  className="grid grid-cols-2 gap-2 w-full h-[42px]"
                >
                  <Key
                    type="button"
                    onClick={() => router.push("/")}
                    className="w-full text-[14.5px] justify-center text-center font-semibold"
                    title="Ir para Notícias"
                  >
                    Notícias
                  </Key>

                  <Key
                    type="button"
                    onClick={() => router.push("/#vagas")}
                    className="w-full text-[14.5px] justify-center text-center font-semibold"
                    title="Ir para Vagas"
                  >
                    Vagas
                  </Key>
                </nav>
              </div>

              {/* Feed com Rolagem Suave */}
              <div
                id="desktop-center-scroller"
                className="w-[calc(100%+48px)] -mx-6 px-6 pt-3 pb-24 flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain [mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_calc(100%-36px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_calc(100%-36px),transparent_100%)]"
              >
                <div className="flex flex-col gap-4">
                  {/* Cabeçalho de Título sem "Guarapuava" */}
                  <header className="flex flex-col gap-1 px-1 pt-1">
                    <h1 className="text-[20px] font-bold text-ink tracking-tight">
                      Horários de Ônibus
                    </h1>

                    <p className="text-[13.5px] text-ink-muted leading-relaxed">
                      Consulte os horários por ponto de referência e itinerário completo de cada linha.
                    </p>
                  </header>

                  {/* Lista de Linhas e Horários (Sem indicador laranja no Desktop) */}
                  <BusScheduleFeed
                    linhas={busData.linhas}
                    selectedBairroId={selectedBairroId}
                    selectedPontoId={selectedPontoId}
                    searchQuery={searchQuery}
                    onClearFilter={handleClearFilters}
                  />
                </div>
              </div>
            </main>

            {/* Coluna Direita (Opções no Topo + Filtros Persistentes) */}
            <aside
              aria-label="Painel lateral de filtros e opções"
              className="w-[360px] shrink-0 h-full max-h-full flex flex-col"
            >
              {/* Linha dos Botões de Opções em Duas Linhas */}
              <div className="w-full shrink-0 z-20 pb-2.5 flex flex-col gap-2">
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

                <div
                  role="toolbar"
                  aria-label="Ferramentas e utilidades"
                  className="grid grid-cols-3 gap-2 w-full h-[42px]"
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

                  <Key
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="w-full px-1 text-[13px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap opacity-40 cursor-not-allowed"
                    title="Estatísticas (em breve)"
                  >
                    Estatísticas
                  </Key>
                </div>
              </div>

              {/* Corpo Dinâmico da Lateral: Informações ou Filtros Persistentes */}
              <div className="w-[calc(100%+32px)] -mx-4 px-4 py-3 flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
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
                  />
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
