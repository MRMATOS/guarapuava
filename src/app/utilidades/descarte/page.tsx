"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Dock } from "@/components/ui/Dock";
import { Key } from "@/components/ui/Key";
import { OptionsPanel } from "@/components/ui/OptionsPanel";
import { Presence } from "@/components/ui/Presence";
import { FilterIndicator } from "@/components/ui/FilterIndicator";
import { OpcoesFeed } from "@/components/opcoes/OpcoesFeed";
import { DescarteFeed } from "@/components/descarte/DescarteFeed";
import { UtilidadesAsideNav } from "@/components/utilidades/UtilidadesAsideNav";
import { DescarteFilterPanel } from "@/components/descarte/DescarteFilterPanel";
import { useTheme } from "@/context/ThemeContext";
import { useHandedness } from "@/context/HandednessContext";
import { filterDescarte, getCategorias, getLocais } from "@/lib/descarte/filter";
import { withDisplayNames } from "@/lib/descarte/names";
import { applyRenames } from "@/lib/descarte/renames";
import rawDescarteData from "@/data/descarte-correto.json";
import type { DescarteItem } from "@/types/descarte";

const descarteItems = applyRenames(
  withDisplayNames(rawDescarteData as unknown as DescarteItem[])
);

const emptySubscribe = () => () => {};

export default function DescarteCorretoPage() {
  const router = useRouter();
  const { isLeftHanded } = useHandedness();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null);
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isDesktopOpcoesOpen, setIsDesktopOpcoesOpen] = useState(false);

  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedCategoria(null);
    setSelectedLocal(null);
    setSearchQuery("");
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDesktopOpcoesOpen) {
          setIsDesktopOpcoesOpen(false);
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
        if (selectedCategoria || selectedLocal || searchQuery) {
          handleClearFilters();
          return;
        }
        router.push("/utilidades");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDesktopOpcoesOpen, isFilterOpen, isOptionsOpen, selectedCategoria, selectedLocal, searchQuery, router, handleClearFilters]);

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

  const categorias = useMemo(() => getCategorias(descarteItems), []);
  const locais = useMemo(() => getLocais(descarteItems), []);

  const filteredItems = useMemo(
    () => filterDescarte(descarteItems, { query: searchQuery, categoria: selectedCategoria, local: selectedLocal }),
    [searchQuery, selectedCategoria, selectedLocal]
  );

  const hasActiveFilters = Boolean(selectedCategoria) || Boolean(selectedLocal) || Boolean(searchQuery.trim());

  const filterIndicatorLabel = (
    <span>
      {selectedCategoria && (
        <>
          Categoria: <strong className="text-ink font-bold">{selectedCategoria}</strong>
          {" • "}
        </>
      )}
      {selectedLocal && (
        <>
          Local: <strong className="text-ink font-bold">{selectedLocal}</strong>
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
        <strong className="text-ink font-bold">{filteredItems.length}</strong>{" "}
        {filteredItems.length === 1 ? "local encontrado" : "locais encontrados"}
      </span>
    </span>
  );

  return (
    <div id="main-content" tabIndex={-1} className="min-h-[100dvh] bg-canvas text-ink flex justify-center outline-none">
      <div className="lg:hidden w-full flex justify-center py-6 px-4 select-text">
        <div className="w-full max-w-[430px] flex flex-col gap-4 pb-32">
          <header className="flex flex-col gap-1 px-1 pt-1">
            <h1 className="text-[20px] font-bold text-ink tracking-tight">Descarte correto</h1>
          </header>

          <DescarteFeed items={filteredItems} onClearFilter={handleClearFilters} />

          <Dock
            align="between"
            above={
              <div className="flex flex-col gap-2 w-full">
                <Presence isVisible={hasActiveFilters} duration={180}>
                  <FilterIndicator label={filterIndicatorLabel} onClear={handleClearFilters} />
                </Presence>
                <div className="grid grid-cols-1 grid-rows-1 items-end w-full [grid-template-areas:'stack']">
                  <div className="w-full [grid-area:stack]">
                    <Presence isVisible={isFilterOpen} duration={180}>
                      <DescarteFilterPanel
                        categorias={categorias}
                        locais={locais}
                        searchQuery={searchQuery}
                        selectedCategoria={selectedCategoria}
                        selectedLocal={selectedLocal}
                        onSearchChange={setSearchQuery}
                        onSelectCategoria={setSelectedCategoria}
                        onSelectLocal={setSelectedLocal}
                        onClose={() => setIsFilterOpen(false)}
                        filterButtonRef={filterButtonRef}
                      />
                    </Presence>
                  </div>
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
            aria-label="Navegação da tela de descarte"
          >
            <div className={`grid grid-cols-3 w-full gap-1.5 sm:gap-2 ${isLeftHanded ? "[direction:rtl] [&>*]:[direction:ltr]" : ""}`}>
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
              <Key
                ref={filterButtonRef}
                type="button"
                pressed={isFilterOpen}
                onClick={handleToggleFilter}
                aria-expanded={isFilterOpen}
                className="w-full px-2 text-[14px] justify-center text-center font-medium"
                aria-label={isFilterOpen ? "Fechar filtros" : "Abrir filtros de locais e categorias"}
              >
                Filtrar
              </Key>
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

      <div className="hidden lg:flex w-full justify-center">
        <div className="w-full h-[100dvh] max-h-[100dvh] overflow-hidden flex justify-center py-6 px-4 xl:px-8 select-text">
          <div className="flex items-start justify-center gap-4.5 max-w-[1300px] w-full h-full max-h-full">
            <aside
              aria-label="Lista de utilidades"
              className="w-[430px] shrink-0 desktop-perspective-container h-full max-h-full pointer-events-none"
            >
              <UtilidadesAsideNav activeId="descarte" />
            </aside>

            <main aria-label="Conteúdo de descarte" className="w-[430px] shrink-0 h-full max-h-full flex flex-col relative">
              <div className="w-full shrink-0 z-40 pb-3 flex flex-col gap-3">
                <header className="flex flex-col gap-1 px-1 pt-1">
                  <h1 className="text-[20px] font-bold text-ink tracking-tight">Descarte correto</h1>
                </header>
              </div>
              <div
                id="desktop-center-scroller"
                className="w-[calc(100%+80px)] -mx-10 px-10 pt-1 pb-24 flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain [mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_calc(100%-36px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_calc(100%-36px),transparent_100%)]"
              >
                <div className="flex flex-col gap-4">
                  <DescarteFeed items={filteredItems} onClearFilter={handleClearFilters} />
                </div>
              </div>
            </main>

            <aside aria-label="Painel lateral de filtros e opções" className="w-[360px] shrink-0 h-full max-h-full flex flex-col">
              <div className="w-full shrink-0 z-20 pb-2.5 flex flex-col gap-2">
                {/* Linha 1: Notícias e Vagas */}
                <div role="toolbar" aria-label="Navegação de abas" className="grid grid-cols-2 gap-2 w-full h-[42px]">
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

                {/* Linha 2: Utilidades e Opções */}
                <div role="toolbar" aria-label="Opções e preferências secundárias" className="grid grid-cols-2 gap-2 w-full h-[42px]">
                  {/* 1. Utilidades */}
                  <Key
                    type="button"
                    pressed={!isDesktopOpcoesOpen}
                    aria-current="page"
                    onClick={() => {
                      if (isDesktopOpcoesOpen) setIsDesktopOpcoesOpen(false);
                      router.push("/utilidades");
                    }}
                    className="w-full px-1 text-[13px] justify-center text-center font-semibold overflow-hidden text-ellipsis whitespace-nowrap"
                    title="Utilidades e serviços"
                    aria-label="Utilidades"
                  >
                    Utilidades
                  </Key>

                  {/* 2. Opções */}
                  <Key
                    type="button"
                    pressed={isDesktopOpcoesOpen}
                    aria-expanded={isDesktopOpcoesOpen}
                    onClick={() => setIsDesktopOpcoesOpen((prev) => !prev)}
                    className="w-full px-1 text-[13px] justify-center text-center font-semibold overflow-hidden text-ellipsis whitespace-nowrap"
                    title="Abrir opções, ajustes e acessibilidade"
                    aria-label="Opções e acessibilidade"
                  >
                    Opções
                  </Key>
                </div>
              </div>
              <div
                className={`w-[calc(100%+64px)] -mx-8 px-8 py-5 flex-1 min-h-0 ${
                  isDesktopOpcoesOpen
                    ? "overflow-y-auto no-scrollbar overscroll-contain"
                    : "overflow-visible"
                }`}
              >
                {isDesktopOpcoesOpen ? (
                  <div role="region" aria-label="Painel de opções" className="desktop-sidebar-panel w-full p-2">
                    <OpcoesFeed
                      hideNav
                      onSelectNoticias={() => router.push("/")}
                      onSelectVagas={() => router.push("/#vagas")}
                      onSelectInfo={() => {
                        setIsDesktopOpcoesOpen(false);
                        router.push("/#informacoes");
                      }}
                    />
                  </div>
                ) : (
                  <DescarteFilterPanel
                    persistent={true}
                    categorias={categorias}
                    locais={locais}
                    searchQuery={searchQuery}
                    selectedCategoria={selectedCategoria}
                    selectedLocal={selectedLocal}
                    onSearchChange={setSearchQuery}
                    onSelectCategoria={setSelectedCategoria}
                    onSelectLocal={setSelectedLocal}
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
