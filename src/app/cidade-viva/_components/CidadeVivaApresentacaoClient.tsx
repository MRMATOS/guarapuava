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

export function CidadeVivaApresentacaoClient() {
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
          1. CASCA MOBILE (< 1024px) COM DOCK NO PADRÃO CANÔNICO
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
                  Voltar ao Cidade Viva
                </Key>
              </div>
            </Dock>
          </div>
        ) : (
          <div className="w-full max-w-[430px] flex flex-col gap-3.5 pb-28 pt-1">
            {/* Cartão de Apresentação do Cidade Viva */}
            <article className="surface-card w-full p-6 text-left flex flex-col gap-3.5">
              <h1 className="text-[19px] sm:text-[20px] font-bold text-ink tracking-tight">
                Cidade Viva
              </h1>

              <p className="text-[14.5px] sm:text-[15px] text-ink-body leading-relaxed">
                O <strong>Cidade Viva</strong> é uma ferramenta colaborativa para acompanhar e registrar ocorrências de zeladoria urbana em Guarapuava. Pelo mapa, você visualiza em tempo real demandas como asfalto danificado, iluminação pública apagada, vazamentos de água, semáforos, terrenos com mato alto e focos de dengue.
              </p>

              <p className="text-[14.5px] sm:text-[15px] text-ink-body leading-relaxed">
                A plataforma é anônima e aberta a toda a comunidade, sem necessidade de cadastro burocrático. A sua localização só é consultada sob demanda caso você decida conferir o que há no seu bairro ou apontar um novo relato no mapa.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => router.push("/cidade-viva/mapa")}
                  className="key key--coral w-full py-3 h-[44px] inline-flex items-center justify-center font-bold text-[14.5px] rounded-xl cursor-pointer"
                  aria-label="Abrir mapa colaborativo do Cidade Viva"
                >
                  Abrir Mapa
                </button>
              </div>
            </article>

            {/* Dock Fixo Mobile no Padrão Canônico: Mais - Filtrar (desab.) - Notícias - Vagas */}
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
              aria-label="Navegação principal do Cidade Viva"
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
        )}
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

            {/* Coluna Central (Conteúdo da Apresentação) */}
            <main
              aria-label="Apresentação do Cidade Viva"
              className="w-[430px] shrink-0 h-full max-h-full flex flex-col relative"
            >
              {/* Cabeçalho de Notícias e Vagas mantido estritamente */}
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

              {/* Conteúdo: Cartão da Apresentação */}
              <div
                id="desktop-center-scroller"
                className="w-[calc(100%+48px)] -mx-6 px-6 pt-3 pb-24 flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain [mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_calc(100%-36px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_calc(100%-36px),transparent_100%)]"
              >
                <div className="flex flex-col gap-3.5">
                  <article className="surface-card w-full p-6 text-left flex flex-col gap-3.5">
                    <h1 className="text-[19px] sm:text-[20px] font-bold text-ink tracking-tight">
                      Cidade Viva
                    </h1>

                    <p className="text-[14.5px] sm:text-[15px] text-ink-body leading-relaxed">
                      O <strong>Cidade Viva</strong> é uma ferramenta colaborativa para acompanhar e registrar ocorrências de zeladoria urbana em Guarapuava. Pelo mapa, você visualiza em tempo real demandas como asfalto danificado, iluminação pública apagada, vazamentos de água, semáforos, terrenos com mato alto e focos de dengue.
                    </p>

                    <p className="text-[14.5px] sm:text-[15px] text-ink-body leading-relaxed">
                      A plataforma é anônima e aberta a toda a comunidade, sem necessidade de cadastro burocrático. A sua localização só é consultada sob demanda caso você decida conferir o que há no seu bairro ou apontar um novo relato no mapa.
                    </p>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => router.push("/cidade-viva/mapa")}
                        className="key key--coral w-full py-3 h-[44px] inline-flex items-center justify-center font-bold text-[14.5px] rounded-xl cursor-pointer"
                        aria-label="Abrir mapa colaborativo do Cidade Viva"
                      >
                        Abrir Mapa
                      </button>
                    </div>
                  </article>
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
                    pressed={true}
                    aria-current="page"
                    className="w-full px-1 text-[13px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
                    title="Cidade Viva — Mapeamento colaborativo"
                  >
                    Cidade Viva
                  </Key>

                  <Key
                    type="button"
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
