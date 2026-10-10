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
      <div className="flex items-start justify-center gap-7 max-w-[1340px] w-full h-full max-h-full">
        {/* ==================================================================
            1. COLUNA ESQUERDA (Feed Navegável em Perspectiva 3D)
            Mantém largura fixa de 430px mesmo antes de abrir um detalhe,
            garantindo ancoragem estrita e scroll independente por coluna.
           ================================================================== */}
        <aside
          aria-label="Feed anterior navegável"
          className="w-[430px] shrink-0 desktop-perspective-container h-full max-h-full"
        >
          {isDetailOpen ? (
            <div className="desktop-parked-panel w-full h-full flex flex-col group relative">
              {/* Feed navegável completo com rolagem independente e respiro para sombras neumórficas */}
              <div className="w-full h-full overflow-y-auto no-scrollbar overscroll-contain -mx-8 px-8 -my-4 py-4">
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
          className="w-[430px] shrink-0 h-full max-h-full flex flex-col"
        >
          {/* Cabeçalho de 2 Botões (Notícias / Vagas) com fundo canvas sólido para isolar o scroll */}
          <div className="w-full shrink-0 z-20 pb-4 bg-canvas">
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

          {/* Conteúdo Central com scroll independente e respiro lateral para sombras */}
          <div className="w-full flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain -mx-8 px-8 py-2">
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
          {/* Linha dos 3 Botões de Opções com fundo canvas sólido */}
          <div className="w-full shrink-0 z-20 pb-4 bg-canvas">
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

          {/* Corpo Dinâmico da Lateral: Informações ou Filtros */}
          <div className="w-full flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
            {isInfoOpen ? (
              <div
                role="region"
                aria-label="Informações do portal"
                className="desktop-sidebar-panel w-full p-4"
              >
                {slotRightInfo}
              </div>
            ) : (
              <div
                role="region"
                aria-label="Filtros da página ativa"
                className="desktop-sidebar-panel w-full p-2.5 sm:p-3"
              >
                {slotRightFilter}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
