"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Key } from "@/components/ui/Key";

export interface DesktopStageProps {
  activeTab: "noticias" | "vagas";
  onSelectTab: (tab: "noticias" | "vagas") => void;
  isDetailOpen: boolean;
  onCloseDetail?: () => void;
  isOpcoesOpen?: boolean;
  onToggleOpcoes?: () => void;
  onCloseOpcoes?: () => void;
  isInfoOpen?: boolean;
  onCloseInfo?: () => void;
  slotLeft: React.ReactNode;
  slotLeftHeader?: React.ReactNode;
  slotCenter: React.ReactNode;
  slotRightFilter: React.ReactNode;
  slotRightOpcoes?: React.ReactNode;
}

export const DesktopStage: React.FC<DesktopStageProps> = ({
  activeTab,
  onSelectTab,
  isDetailOpen,
  isOpcoesOpen = false,
  onToggleOpcoes,
  onCloseOpcoes,
  isInfoOpen = false,
  onCloseInfo,
  slotLeft,
  slotLeftHeader,
  slotCenter,
  slotRightFilter,
  slotRightOpcoes,
}) => {
  const router = useRouter();

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
                id="desktop-left-scroller"
                className={`w-[calc(100%+80px)] -mx-10 px-10 ${
                  slotLeftHeader
                    ? "pt-2 [mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_86%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_86%,transparent_100%)]"
                    : "pt-1 [mask-image:linear-gradient(to_bottom,black_86%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_86%,transparent_100%)]"
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
            Espaço vertical otimizado: os botões de Notícias/Vagas foram
            movidos para a coluna direita, permitindo expansão completa do feed.
           ================================================================== */}
        <main
          aria-label="Conteúdo principal"
          className="w-[430px] shrink-0 h-full max-h-full flex flex-col relative"
        >
          {/* Conteúdo Central com dissipação de sombras sem corte rígido no topo ou na base */}
          <div
            id="desktop-center-scroller"
            className="w-[calc(100%+80px)] -mx-10 px-10 pt-1 pb-24 flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain [mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_calc(100%-36px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_calc(100%-36px),transparent_100%)]"
          >
            {slotCenter}
          </div>
        </main>

        {/* ==================================================================
            3. COLUNA DIREITA (Opções + Filtros ou Painéis)
            Estrutura em 2 linhas (4 botões no total / grid 2x2):
              Linha 1: Notícias e Vagas
              Linha 2: Utilidades e Opções
           ================================================================== */}
        <aside
          aria-label="Painel lateral de filtros e opções"
          className="w-[360px] shrink-0 h-full max-h-full flex flex-col"
        >
          {/* Linha dos Botões de Opções em Duas Linhas (Grid 2x2) */}
          <div className="w-full shrink-0 z-20 pb-2.5 flex flex-col gap-2">
            {/* Linha 1: Notícias e Vagas */}
            <div
              role="toolbar"
              aria-label="Navegação de abas"
              className="grid grid-cols-2 gap-2 w-full h-[42px]"
            >
              <Key
                type="button"
                aria-current={activeTab === "noticias" && !isInfoOpen ? "page" : undefined}
                pressed={activeTab === "noticias" && !isInfoOpen}
                onClick={() => {
                  if (isInfoOpen) onCloseInfo?.();
                  if (isOpcoesOpen) onCloseOpcoes?.();
                  onSelectTab("noticias");
                }}
                className="w-full px-1 text-[13px] justify-center text-center font-semibold overflow-hidden text-ellipsis whitespace-nowrap"
                title="Ir para Notícias"
              >
                Notícias
              </Key>

              <Key
                type="button"
                aria-current={activeTab === "vagas" && !isInfoOpen ? "page" : undefined}
                pressed={activeTab === "vagas" && !isInfoOpen}
                onClick={() => {
                  if (isInfoOpen) onCloseInfo?.();
                  if (isOpcoesOpen) onCloseOpcoes?.();
                  onSelectTab("vagas");
                }}
                className="w-full px-1 text-[13px] justify-center text-center font-semibold overflow-hidden text-ellipsis whitespace-nowrap"
                title="Ir para Vagas"
              >
                Vagas
              </Key>
            </div>

            {/* Linha 2: Utilidades e Opções */}
            <div
              role="toolbar"
              aria-label="Opções e preferências secundárias"
              className="grid grid-cols-2 gap-2 w-full h-[42px]"
            >
              {/* 1. Utilidades */}
              <Key
                type="button"
                onClick={() => {
                  router.push("/utilidades");
                }}
                className="w-full px-1 text-[13px] justify-center text-center font-semibold overflow-hidden text-ellipsis whitespace-nowrap"
                title="Abrir utilidades e horários"
                aria-label="Abrir Utilidades"
              >
                Utilidades
              </Key>

              {/* 2. Opções */}
              <Key
                type="button"
                pressed={isOpcoesOpen}
                aria-expanded={isOpcoesOpen}
                onClick={onToggleOpcoes}
                className="w-full px-1 text-[13px] justify-center text-center font-semibold overflow-hidden text-ellipsis whitespace-nowrap"
                title="Abrir opções, ajustes e acessibilidade"
                aria-label="Opções e acessibilidade"
              >
                Opções
              </Key>
            </div>
          </div>

          {/* Corpo Dinâmico da Lateral: Opções ou Filtros com sombra integral sem clipping */}
          <div
            className={`w-[calc(100%+64px)] -mx-8 px-8 py-5 flex-1 min-h-0 ${
              isOpcoesOpen
                ? "overflow-y-auto no-scrollbar overscroll-contain"
                : "overflow-visible"
            }`}
          >
            {isOpcoesOpen ? (
              <div
                role="region"
                aria-label="Painel de opções"
                className="desktop-sidebar-panel w-full p-2"
              >
                {slotRightOpcoes}
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
