"use client";

import React, { useState, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Dock } from "@/components/ui/Dock";
import { Key } from "@/components/ui/Key";
import { OptionsPanel } from "@/components/ui/OptionsPanel";
import { Presence } from "@/components/ui/Presence";
import { InfoFeed } from "@/components/InfoFeed";
import { useTheme } from "@/context/ThemeContext";

const emptySubscribe = () => () => {};

export default function UtilidadesPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  // Estados Mobile
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);

  // Estados Desktop
  const [isDesktopInfoOpen, setIsDesktopInfoOpen] = useState(false);

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isDark = mounted && theme === "dark";
  const themeLabel = isDark ? "Modo claro" : "Modo escuro";

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink flex justify-center">
      {/* ==================================================================
          1. CASCA MOBILE (< 1024px) COM DOCK NO PADRÃO CANÔNICO
         ================================================================== */}
      <div className="lg:hidden w-full flex justify-center py-6 px-4 select-text">
        <div className="w-full max-w-[430px] flex flex-col min-h-[calc(100dvh-3rem)] pb-28 pt-1">
          {/* Cabeçalho de Utilidades (mesmo padrão do InfoFeed) */}
          <div className="flex items-center justify-between mb-4 px-1 shrink-0">
            <h1 className="font-semibold text-ink text-[15px] tracking-tight">
              Utilidades
            </h1>
            <span className="badge-inset">
              Ferramentas acessíveis
            </span>
          </div>

          {/* Lista de Utilidades alinhada de baixo para cima */}
          <div className="flex-1 flex flex-col justify-end gap-3.5">
            <button
              type="button"
              onClick={() => router.push("/utilidades/onibus")}
              className="surface-card w-full p-5 text-left flex flex-col gap-2.5 group transition-all duration-150 cursor-pointer active:scale-[0.99] hover:brightness-[1.01]"
              aria-label="Abrir Horários de Ônibus"
            >
              <h2 className="text-[17px] font-bold text-ink group-hover:text-coral transition-colors tracking-tight">
                Horários de Ônibus
              </h2>

              <p className="text-[13.5px] text-ink-body leading-relaxed">
                Consulte linhas urbanas e interbairros, horários de saída e pontos de passagem em cada bairro de Guarapuava.
              </p>
            </button>
          </div>

          {/* Dock Fixo Mobile no Padrão Canônico: Mais - Filtrar - Notícias - Vagas */}
          <Dock
            align="between"
            above={
              <div className="w-full">
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
            }
            aria-label="Navegação principal de utilidades"
          >
            <div className="grid grid-cols-4 w-full gap-1.5 sm:gap-2">
              <Key
                ref={optionsButtonRef}
                type="button"
                pressed={isOptionsOpen}
                onClick={() => setIsOptionsOpen((prev) => !prev)}
                aria-expanded={isOptionsOpen}
                className="w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
                aria-label={isOptionsOpen ? "Fechar menu mais" : "Abrir menu mais"}
              >
                Mais
              </Key>

              <Key
                type="button"
                disabled
                className="w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap opacity-35 cursor-not-allowed pointer-events-none"
                aria-label="Filtros indisponíveis nesta página"
              >
                Filtrar
              </Key>

              <Key
                type="button"
                onClick={() => router.push("/")}
                className="w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
                aria-label="Ir para Notícias"
              >
                Notícias
              </Key>

              <Key
                type="button"
                onClick={() => router.push("/#vagas")}
                className="w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
                aria-label="Ir para Vagas"
              >
                Vagas
              </Key>
            </div>
          </Dock>
        </div>
      </div>

      {/* ==================================================================
          2. PALCO DESKTOP (>= 1024px) COM HEADER NOTÍCIAS/VAGAS
         ================================================================== */}
      <div className="hidden lg:flex w-full justify-center">
        <div className="w-full h-[100dvh] max-h-[100dvh] overflow-hidden flex justify-center py-6 px-4 xl:px-8 select-text">
          <div className="flex items-start justify-center gap-4.5 max-w-[1300px] w-full h-full max-h-full">
            {/* Coluna Esquerda (Equilíbrio Espacial) */}
            <aside
              aria-label="Espaço de perspectiva"
              className="w-[430px] shrink-0 desktop-perspective-container h-full max-h-full pointer-events-none"
            >
              <div className="w-full h-full" aria-hidden="true" />
            </aside>

            {/* Coluna Central (Conteúdo das Utilidades) */}
            <main
              aria-label="Central de utilidades"
              className="w-[430px] shrink-0 h-full max-h-full flex flex-col relative"
            >
              {/* Conteúdo: Cartão limpo de Horários de Ônibus alinhado ao topo */}
              <div
                id="desktop-center-scroller"
                className="w-[calc(100%+48px)] -mx-6 px-6 pt-1 pb-24 flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain flex flex-col justify-start [mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_calc(100%-36px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_calc(100%-36px),transparent_100%)]"
              >
                {/* Cabeçalho de Utilidades (mesmo padrão do InfoFeed) */}
                <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                  <h1 className="font-semibold text-ink text-[15px] tracking-tight">
                    Utilidades
                  </h1>
                  <span className="badge-inset">
                    Ferramentas acessíveis
                  </span>
                </div>

                {/* Lista de Utilidades alinhada ao topo no desktop */}
                <div className="flex flex-col justify-start gap-3.5">
                  <button
                    type="button"
                    onClick={() => router.push("/utilidades/onibus")}
                    className="surface-card w-full p-5 text-left flex flex-col gap-2.5 group transition-all duration-150 cursor-pointer active:scale-[0.99] hover:brightness-[1.01]"
                    aria-label="Abrir Horários de Ônibus"
                  >
                    <h2 className="text-[17px] font-bold text-ink group-hover:text-coral transition-colors tracking-tight">
                      Horários de Ônibus
                    </h2>

                    <p className="text-[13.5px] text-ink-body leading-relaxed">
                      Consulte linhas urbanas e interbairros, horários de saída e pontos de passagem em cada bairro de Guarapuava.
                    </p>
                  </button>
                </div>
              </div>
            </main>

            {/* Coluna Direita (Opções e Ferramentas em 3 Linhas / 6 Botões) */}
            <aside
              aria-label="Painel lateral de opções"
              className="w-[360px] shrink-0 h-full max-h-full flex flex-col"
            >
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
                    title="Utilidades e serviços"
                  >
                    Utilidades
                  </Key>
                </div>
              </div>

              {/* Corpo Lateral */}
              <div className="w-[calc(100%+32px)] -mx-4 px-4 py-3 flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
                {isDesktopInfoOpen && (
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
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
