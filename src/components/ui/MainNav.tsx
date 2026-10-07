"use client";

import React, { useState, useRef } from "react";
import { Dock } from "./Dock";
import { Key } from "./Key";
import { OptionsPanel } from "./OptionsPanel";

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
}) => {
  // Estado local para Opções caso não seja controlado externamente
  const [internalOptionsOpen, setInternalOptionsOpen] = useState(false);
  const internalOptionsButtonRef = useRef<HTMLButtonElement>(null);

  const currentOptionsOpen =
    isOptionsOpen !== undefined ? isOptionsOpen : internalOptionsOpen;
  const actualOptionsButtonRef = optionsButtonRef || internalOptionsButtonRef;

  const handleToggleOptions = () => {
    if (onToggleOptions) {
      onToggleOptions();
    } else {
      if (!internalOptionsOpen && onCloseFilter) {
        onCloseFilter();
      }
      setInternalOptionsOpen((prev) => !prev);
    }
  };

  const handleCloseOptions = () => {
    if (onCloseOptions) {
      onCloseOptions();
    } else {
      setInternalOptionsOpen(false);
    }
  };

  const handleToggleFilter = () => {
    if (currentOptionsOpen) {
      handleCloseOptions();
    }
    onToggleFilter?.();
  };

  const handleSelectInfo = () => {
    handleCloseOptions();
    onSelectInfo?.();
  };

  return (
    <Dock
      align="between"
      above={
        <>
          {above}
          {currentOptionsOpen && (
            <OptionsPanel
              onClose={handleCloseOptions}
              onSelectInfo={handleSelectInfo}
              optionsButtonRef={actualOptionsButtonRef}
            />
          )}
        </>
      }
      aria-label="Navegação principal"
    >
      <div className="grid grid-cols-4 w-full gap-1.5 sm:gap-2">
        {/* 1. Botão Opções */}
        <Key
          ref={actualOptionsButtonRef}
          pressed={currentOptionsOpen}
          onClick={handleToggleOptions}
          aria-expanded={currentOptionsOpen}
          aria-label={currentOptionsOpen ? "Fechar bloco de opções" : "Abrir bloco de opções"}
          className="w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
        >
          Opções
        </Key>

        {/* 2. Botão Filtrar */}
        <Key
          ref={filterButtonRef}
          pressed={isFilterOpen}
          onClick={handleToggleFilter}
          disabled={!onToggleFilter}
          aria-expanded={isFilterOpen}
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
            handleCloseOptions();
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
            handleCloseOptions();
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

