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
    <div className="w-full min-h-[100dvh] flex justify-center py-6 px-4 xl:px-8 select-text">
      <div className="flex items-start justify-center gap-7 max-w-[1340px] w-full">
        {/* ==================================================================
            1. COLUNA ESQUERDA (Feed Estacionado em Perspectiva 3D)
            Mantém largura fixa de 430px mesmo antes de abrir um detalhe,
            garantindo que as colunas central e direita permaneçam perfeitamente ancoradas.
           ================================================================== */}
        <aside
          aria-label="Feed anterior recolhido"
          className="w-[430px] shrink-0 desktop-perspective-container pt-[58px]"
        >
          {isDetailOpen ? (
            <div
              onClick={() => {
                if (isInfoOpen) onCloseInfo();
                onCloseDetail();
              }}
              className="desktop-parked-panel w-full group relative animate-stagger-item"
              title="Clique para voltar a interagir com este feed"
            >
              {/* Selo tátil superior indicando o retorno ao centro */}
              <div className="flex items-center justify-between mb-3 px-1 pointer-events-none">
                <span className="badge-inset text-[12px] group-hover:border-coral/50 transition-colors">
                  <span className="text-coral font-bold mr-1">←</span>
                  Clique para voltar ao feed
                </span>
                <span className="text-[12px] text-ink-muted opacity-75">
                  Em espera
                </span>
              </div>

              {/* Pré-visualização do feed (interação desabilitada no modo rebatido) */}
              <div className="pointer-events-none select-none max-h-[calc(100vh-140px)] overflow-hidden rounded-[28px] opacity-90">
                {slotLeft}
              </div>
            </div>
          ) : (
            <div className="w-full h-1" aria-hidden="true" />
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
          className="w-[430px] shrink-0 flex flex-col gap-4"
        >
          {/* Cabeçalho de 2 Botões (Notícias / Vagas) */}
          <nav
            aria-label="Navegação de abas"
            className="grid grid-cols-2 gap-2 w-full h-[42px] sticky top-6 z-20"
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

          {/* Conteúdo Central (Feed da aba ou Detalhe) */}
          <div className="w-full">
            {slotCenter}
          </div>
        </main>

        {/* ==================================================================
            3. COLUNA DIREITA (Opções + Filtros ou Informações)
           ================================================================== */}
        <aside
          aria-label="Painel lateral de filtros e opções"
          className="w-[360px] shrink-0 flex flex-col gap-4 sticky top-6 z-20"
        >
          {/* Linha dos 3 Botões de Opções */}
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

          {/* Corpo Dinâmico da Lateral: Informações ou Filtros */}
          <div className="w-full">
            {isInfoOpen ? (
              <div
                role="region"
                aria-label="Informações do portal"
                className="desktop-sidebar-panel w-full p-4 max-h-[calc(100vh-100px)] overflow-y-auto no-scrollbar"
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
