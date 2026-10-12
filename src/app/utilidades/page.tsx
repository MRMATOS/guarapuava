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
  const [isMobileInfoOpen, setIsMobileInfoOpen] = useState(false);
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
                  Voltar às Utilidades
                </Key>
              </div>
            </Dock>
          </div>
        ) : (
          <div className="w-full max-w-[430px] flex flex-col gap-5 pb-28">
            {/* Cabeçalho */}
            <header className="flex flex-col gap-1.5 px-1 pt-2">
              <div className="flex items-center justify-between">
                <h1 className="text-[20px] font-bold text-ink tracking-tight">
                  Utilidades
                </h1>
                <span className="badge-inset text-[11px] px-2.5 py-0.5">
                  Serviços Locais
                </span>
              </div>
              <p className="text-[14px] text-ink-muted leading-relaxed">
                Ferramentas práticas e informações essenciais do dia a dia de Guarapuava.
              </p>
            </header>

            {/* Grade de Cartões */}
            <div className="flex flex-col gap-3.5">
              <button
                type="button"
                onClick={() => router.push("/utilidades/onibus")}
                className="surface-card w-full p-5 text-left flex flex-col gap-2.5 group transition-all duration-150 cursor-pointer active:scale-[0.99] hover:brightness-[1.01]"
                aria-label="Abrir Horários de Ônibus"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[17px] font-bold text-ink group-hover:text-coral transition-colors tracking-tight">
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
              </button>
            </div>

            {/* Dock Fixo Mobile */}
            <Dock
              align="between"
              above={
                <div className="w-full">
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
              }
              aria-label="Navegação de utilidades"
            >
              <div className="grid grid-cols-2 w-full gap-2">
                <Key
                  type="button"
                  onClick={() => router.push("/")}
                  className="w-full px-2 text-[14px] justify-center text-center font-medium"
                  aria-label="Voltar para a página inicial"
                >
                  Voltar
                </Key>

                <Key
                  ref={optionsButtonRef}
                  type="button"
                  pressed={isOptionsOpen}
                  onClick={() => setIsOptionsOpen((prev) => !prev)}
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
          2. PALCO DESKTOP (>= 1024px) SEM DOCK E COM ALINHAMENTO CONSISTENTE
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
              {/* Cabeçalho de Navegação Superior */}
              <div className="w-full shrink-0 z-20 pb-2.5">
                <nav
                  aria-label="Navegação superior"
                  className="grid grid-cols-1 gap-2 w-full h-[42px]"
                >
                  <Key
                    type="button"
                    onClick={() => router.push("/")}
                    className="w-full text-[14.5px] justify-center text-center font-semibold"
                    title="Voltar para a página inicial"
                  >
                    ← Voltar ao Início
                  </Key>
                </nav>
              </div>

              {/* Conteúdo com Rolagem Suave */}
              <div
                id="desktop-center-scroller"
                className="w-[calc(100%+48px)] -mx-6 px-6 pt-3 pb-24 flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain [mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_calc(100%-36px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_calc(100%-36px),transparent_100%)]"
              >
                <div className="flex flex-col gap-5">
                  <header className="flex flex-col gap-1.5 px-1 pt-1">
                    <div className="flex items-center justify-between">
                      <h1 className="text-[20px] font-bold text-ink tracking-tight">
                        Utilidades
                      </h1>
                      <span className="badge-inset text-[11px] px-2.5 py-0.5">
                        Serviços Locais
                      </span>
                    </div>
                    <p className="text-[14px] text-ink-muted leading-relaxed">
                      Ferramentas práticas e informações essenciais do dia a dia de Guarapuava.
                    </p>
                  </header>

                  <div className="flex flex-col gap-3.5">
                    <button
                      type="button"
                      onClick={() => router.push("/utilidades/onibus")}
                      className="surface-card w-full p-5 text-left flex flex-col gap-2.5 group transition-all duration-150 cursor-pointer active:scale-[0.99] hover:brightness-[1.01]"
                      aria-label="Abrir Horários de Ônibus"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-[17px] font-bold text-ink group-hover:text-coral transition-colors tracking-tight">
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
                    </button>
                  </div>
                </div>
              </div>
            </main>

            {/* Coluna Direita (Opções e Ferramentas) */}
            <aside
              aria-label="Painel lateral de opções"
              className="w-[360px] shrink-0 h-full max-h-full flex flex-col"
            >
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
                    title="Utilidades e serviços"
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

              {/* Corpo Lateral */}
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
                  <div className="desktop-sidebar-panel w-full p-5 flex flex-col gap-3">
                    <span className="badge-inset text-[11.5px] px-2.5 py-0.5 font-semibold text-coral self-start">
                      Serviços de Guarapuava
                    </span>
                    <h3 className="text-[15px] font-bold text-ink tracking-tight">
                      Central de Utilidades
                    </h3>
                    <p className="text-[13px] text-ink-body leading-relaxed">
                      Acesse horários de ônibus, itinerários e ferramentas cívicas essenciais de forma direta e sem ruído visual.
                    </p>
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
