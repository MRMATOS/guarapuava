"use client";

import React, { useState, useRef, useEffect } from "react";
import { Dock } from "./Dock";
import { Key } from "./Key";
import { OptionsPanel } from "./OptionsPanel";
import { Presence } from "./Presence";

export type Section = "noticias" | "vagas" | "info";

interface MainNavProps {
  active?: Section;
  onNoticias: () => void;
  onVagas: () => void;
  onSelectInfo?: () => void;
  isFilterOpen?: boolean;
  onToggleFilter?: () => void;
  onCloseFilter?: () => void;
  filterButtonRef?: React.RefObject<HTMLButtonElement | null>;
  isOptionsOpen?: boolean;
  onToggleOptions?: () => void;
  onCloseOptions?: () => void;
  optionsButtonRef?: React.RefObject<HTMLButtonElement | null>;
  above?: React.ReactNode;
  filterPanel?: React.ReactNode;
}

/**
 * Navegação principal do Painel de Rádio:
 * 4 botões textuais do mesmo tamanho:
 * 1. Opções (abre o bloco com Teste, Informações e Alternar Tema)
 * 2. Filtrar
 * 3. Notícias
 * 4. Vagas
 */
export const MainNav: React.FC<MainNavProps> = ({
  active,
  onNoticias,
  onVagas,
  onSelectInfo,
  isFilterOpen = false,
  onToggleFilter,
  onCloseFilter,
  filterButtonRef,
  isOptionsOpen,
  onToggleOptions,
  onCloseOptions,
  optionsButtonRef,
  above,
  filterPanel,
}) => {
  // Estado local para Opções caso não seja controlado externamente
  const [internalOptionsOpen, setInternalOptionsOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<"filter" | "options" | null>(null);
  const internalOptionsButtonRef = useRef<HTMLButtonElement>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentOptionsOpen =
    isOptionsOpen !== undefined ? isOptionsOpen : internalOptionsOpen;
  const actualOptionsButtonRef = optionsButtonRef || internalOptionsButtonRef;

  // Limpa timer pendente ao desmontar o componente
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const handleToggleOptions = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    if (onToggleOptions) {
      onToggleOptions();
      return;
    }

    // Se já está aberto ou agendado para abrir, fecha imediatamente
    if (internalOptionsOpen || pendingTarget === "options") {
      setPendingTarget(null);
      handleCloseOptions();
      return;
    }

    // Se o filtro está aberto, fecha o filtro primeiro e aguarda a descida completa (290ms) antes de subir as opções
    if (isFilterOpen) {
      onCloseFilter?.();
      setPendingTarget("options");
      transitionTimerRef.current = setTimeout(() => {
        setInternalOptionsOpen(true);
        setPendingTarget(null);
        transitionTimerRef.current = null;
      }, 290);
    } else {
      setPendingTarget(null);
      setInternalOptionsOpen(true);
    }
  };

  const handleCloseOptions = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    setPendingTarget(null);
    if (onCloseOptions) {
      onCloseOptions();
    } else {
      setInternalOptionsOpen(false);
    }
  };

  const handleToggleFilter = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    // Se o filtro já está aberto ou agendado para abrir, fecha imediatamente
    if (isFilterOpen || pendingTarget === "filter") {
      setPendingTarget(null);
      onCloseFilter?.();
      return;
    }

    // Se as opções estão abertas, fecha as opções primeiro e aguarda a descida antes de subir o filtro
    if (currentOptionsOpen) {
      handleCloseOptions();
      setPendingTarget("filter");
      transitionTimerRef.current = setTimeout(() => {
        onToggleFilter?.();
        setPendingTarget(null);
        transitionTimerRef.current = null;
      }, 250);
    } else {
      setPendingTarget(null);
      onToggleFilter?.();
    }
  };

  const handleSelectInfo = () => {
    handleCloseOptions();
    onSelectInfo?.();
  };

  const clearAllPending = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    setPendingTarget(null);
    handleCloseOptions();
    onCloseFilter?.();
  };

  return (
    <Dock
      align="between"
      above={
        <>
          {above}
          <div className="grid grid-cols-1 grid-rows-1 items-end w-full [grid-template-areas:'stack']">
            {filterPanel && (
              <div className="w-full [grid-area:stack]">
                {filterPanel}
              </div>
            )}
            <div className="w-full [grid-area:stack]">
              <Presence isVisible={currentOptionsOpen} duration={180}>
                <OptionsPanel
                  onClose={handleCloseOptions}
                  onSelectInfo={handleSelectInfo}
                  optionsButtonRef={actualOptionsButtonRef}
                />
              </Presence>
            </div>
          </div>
        </>
      }
      aria-label="Navegação principal"
    >
      <div className="grid grid-cols-4 w-full gap-1.5 sm:gap-2">
        {/* 1. Botão Opções */}
        <Key
          ref={actualOptionsButtonRef}
          pressed={currentOptionsOpen || pendingTarget === "options"}
          onClick={handleToggleOptions}
          aria-expanded={currentOptionsOpen || pendingTarget === "options"}
          aria-label={currentOptionsOpen ? "Fechar bloco de opções" : "Abrir bloco de opções"}
          className="w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
        >
          Opções
        </Key>

        {/* 2. Botão Filtrar */}
        <Key
          ref={filterButtonRef}
          pressed={isFilterOpen || pendingTarget === "filter"}
          onClick={handleToggleFilter}
          disabled={!onToggleFilter}
          aria-expanded={isFilterOpen || pendingTarget === "filter"}
          aria-label={isFilterOpen ? "Fechar bloco de filtros" : "Abrir bloco de filtros"}
          className={`w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap ${
            !onToggleFilter ? "opacity-35 cursor-not-allowed pointer-events-none" : ""
          }`}
        >
          Filtrar
        </Key>

        {/* 3. Botão Notícias */}
        <Key
          aria-current={active === "noticias" ? "page" : undefined}
          onClick={() => {
            clearAllPending();
            onNoticias();
          }}
          className="w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
        >
          Notícias
        </Key>

        {/* 4. Botão Vagas */}
        <Key
          aria-current={active === "vagas" ? "page" : undefined}
          onClick={() => {
            clearAllPending();
            onVagas();
          }}
          className="w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
        >
          Vagas
        </Key>
      </div>
    </Dock>
  );
};

