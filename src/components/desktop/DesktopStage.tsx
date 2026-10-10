"use client";

import React, { useSyncExternalStore } from "react";
import { Key } from "@/components/ui/Key";
import { useTheme } from "@/context/ThemeContext";

export interface DesktopStageProps {
  activeTab: "noticias" | "vagas";
  onSelectTab: (tab: "noticias" | "vagas") => void;
  isDetailOpen: boolean;
  onCloseDetail: () => void;
  isInfoOpen: boolean;
  onToggleInfo: () => void;
  onCloseInfo: () => void;
  slotLeft: React.ReactNode;
  slotLeftHeader?: React.ReactNode;
  slotCenter: React.ReactNode;
  slotRightFilter: React.ReactNode;
  slotRightInfo: React.ReactNode;
}

const emptySubscribe = () => () => {};

export const DesktopStage: React.FC<DesktopStageProps> = ({
  activeTab,
  onSelectTab,
  isDetailOpen,
  onCloseDetail,
  isInfoOpen,
  onToggleInfo,
  onCloseInfo,
  slotLeft,
  slotLeftHeader,
  slotCenter,
  slotRightFilter,
  slotRightInfo,
}) => {
  const { theme, toggleTheme } = useTheme();

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isDark = mounted && theme === "dark";
  const themeLabel = isDark ? "Modo claro" : "Modo escuro";

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] overflow-hidden flex justify-center py-6 px-4 xl:px-8 select-text">
      <div className="flex items-start justify-center gap-4.5 max-w-[1300px] w-full h-full max-h-full">
        {/* ==================================================================
            1. COLUNA ESQUERDA (Feed Navegável em Perspectiva 3D)
            Mantém largura fixa de 430px mesmo antes de abrir um detalhe,
            garantindo ancoragem estrita e scroll independente por coluna.
           ================================================================== */}
        <aside
          aria-label="Feed anterior navegável"
          className="w-[430px] shrink-0 desktop-perspective-container h-full max-h-full pointer-events-none"
        >
          {isDetailOpen ? (
            <div className="desktop-parked-panel w-full h-full flex flex-col group relative pointer-events-auto">
              {/* Cabeçalho fixo da coluna esquerda (ex: data e atualização em vagas) */}
              {slotLeftHeader ? (
                <div className="w-full shrink-0 z-20 pb-2.5">
                  {slotLeftHeader}
                </div>
              ) : null}

              {/* Feed navegável completo com rolagem independente e dissipação suave */}
              <div
                className={`w-[calc(100%+48px)] -mx-6 px-6 ${
                  slotLeftHeader
                    ? "pt-3 [mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_86%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_86%,transparent_100%)]"
                    : "pt-4 [mask-image:linear-gradient(to_bottom,black_86%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_86%,transparent_100%)]"
                } flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain pb-28`}
              >
                {slotLeft}
              </div>
            </div>
          ) : (
            <div className="w-full h-full" aria-hidden="true" />
          )}
        </aside>

        {/* ==================================================================
            2. COLUNA CENTRAL (Feed Principal ou Detalhe Ativo)
           ================================================================== */}
        <main
          aria-label="Conteúdo principal"
          onClick={() => {
            if (isInfoOpen) onCloseInfo();
          }}
          className="w-[430px] shrink-0 h-full max-h-full flex flex-col relative"
        >
          {/* Cabeçalho de 2 Botões (Notícias / Vagas) com alinhamento pixel-perfect ao feed */}
          <div className="w-full shrink-0 z-20 pb-2.5">
            <nav
              aria-label="Navegação de abas"
              className="grid grid-cols-2 gap-2 w-full h-[42px]"
            >
              <Key
                aria-current={activeTab === "noticias" ? "page" : undefined}
                pressed={activeTab === "noticias"}
                onClick={() => {
                  if (isInfoOpen) onCloseInfo();
                  onSelectTab("noticias");
                }}
                className="w-full text-[14.5px] justify-center text-center font-semibold"
              >
                Notícias
              </Key>

              <Key
                aria-current={activeTab === "vagas" ? "page" : undefined}
                pressed={activeTab === "vagas"}
                onClick={() => {
                  if (isInfoOpen) onCloseInfo();
                  onSelectTab("vagas");
                }}
                className="w-full text-[14.5px] justify-center text-center font-semibold"
              >
                Vagas
              </Key>
            </nav>
          </div>

          {/* Conteúdo Central com dissipação de sombras sem corte rígido no topo ou na base */}
          <div
            id="desktop-center-scroller"
            className="w-[calc(100%+48px)] -mx-6 px-6 pt-3 pb-24 flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain [mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_calc(100%-36px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_calc(100%-36px),transparent_100%)]"
          >
            {slotCenter}
          </div>
        </main>

        {/* ==================================================================
            3. COLUNA DIREITA (Opções + Filtros ou Informações)
           ================================================================== */}
        <aside
          aria-label="Painel lateral de filtros e opções"
          className="w-[360px] shrink-0 h-full max-h-full flex flex-col"
        >
          {/* Linha dos 3 Botões de Opções */}
          <div className="w-full shrink-0 z-20 pb-2.5">
            <div
              role="toolbar"
              aria-label="Opções e preferências"
              className="grid grid-cols-3 gap-2 w-full h-[42px]"
            >
              {/* 1. Botão Teste */}
              <Key
                type="button"
                onClick={() => {}}
                className="w-full px-1 text-[13px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
                title="Botão de teste (reservado)"
                aria-label="Botão de teste"
              >
                Teste
              </Key>

              {/* 2. Botão Informações */}
              <Key
                type="button"
                pressed={isInfoOpen}
                aria-expanded={isInfoOpen}
                onClick={onToggleInfo}
                className="w-full px-1 text-[13px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
                title="Abrir termos e diretrizes"
                aria-label="Informações do site"
              >
                Informações
              </Key>

              {/* 3. Alternador de Modo Claro / Escuro */}
              <Key
                type="button"
                onClick={toggleTheme}
                className="w-full px-1 text-[13px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
                title={`Alternar para ${themeLabel}`}
                aria-label={`Alternar para ${themeLabel}`}
              >
                {themeLabel}
              </Key>
            </div>
          </div>

          {/* Corpo Dinâmico da Lateral: Informações ou Filtros com sombra integral sem clipping */}
          <div className="w-[calc(100%+32px)] -mx-4 px-4 py-3 flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
            {isInfoOpen ? (
              <div
                role="region"
                aria-label="Informações do portal"
                className="desktop-sidebar-panel w-full p-4"
              >
                {slotRightInfo}
              </div>
            ) : (
              slotRightFilter
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
