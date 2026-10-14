"use client";

import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Key } from "./Key";
import { useTheme } from "@/context/ThemeContext";

export interface OptionsPanelProps {
  onClose: () => void;
  onSelectInfo: () => void;
  optionsButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

const emptySubscribe = () => () => {};

export const OptionsPanel: React.FC<OptionsPanelProps> = ({
  onClose,
  onSelectInfo,
  optionsButtonRef,
}) => {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isDark = mounted && theme === "dark";

  // Fecha o bloco se clicar fora (exceto se for no botão Opções do rodapé)
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      // Se o clique for dentro do painel ou na área do dock, o dock gerencia a alternância
      if (
        panelRef.current?.contains(target as Node) ||
        target.closest?.(".dock-shell") ||
        target.closest?.(".dock") ||
        (optionsButtonRef?.current && optionsButtonRef.current.contains(target as Node))
      ) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, optionsButtonRef]);

  // Se estiver no modo escuro, o texto é "Modo claro"; se estiver no modo claro, "Modo escuro"
  const themeLabel = isDark ? "Modo claro" : "Modo escuro";

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Painel de opções"
      className="filter-panel w-full p-2.5 sm:p-3 flex flex-col gap-2.5 select-none"
    >
      {/* Linha Superior: 1º Informações, 2º Modo claro / escuro */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
        {/* 1. Botão Informações */}
        <div className="w-full animate-stagger-item" style={{ animationDelay: "20ms" }}>
          <Key
            type="button"
            onClick={() => {
              onClose();
              onSelectInfo();
            }}
            className="w-full px-1 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
            title="Abrir informações, responsabilidades e termos"
            aria-label="Informações do site"
          >
            Informações
          </Key>
        </div>

        {/* 2. Alternador de Modo Claro / Modo Escuro */}
        <div className="w-full animate-stagger-item" style={{ animationDelay: "40ms" }}>
          <Key
            type="button"
            onClick={toggleTheme}
            className="w-full px-1 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
            title={`Alternar para ${themeLabel}`}
            aria-label={`Alternar para ${themeLabel}`}
          >
            {themeLabel}
          </Key>
        </div>
      </div>

      {/* Linha Inferior: 1º Cidade Viva, 2º Utilidades */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
        {/* 1. Botão Cidade Viva (Mapa Colaborativo) */}
        <div className="w-full animate-stagger-item" style={{ animationDelay: "60ms" }}>
          <Key
            type="button"
            onClick={() => {
              onClose();
              router.push("/cidade-viva");
            }}
            className="w-full px-1 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
            title="Abrir mapa colaborativo Cidade Viva"
            aria-label="Abrir Cidade Viva"
          >
            Cidade Viva
          </Key>
        </div>

        {/* 2. Botão Utilidades */}
        <div className="w-full animate-stagger-item" style={{ animationDelay: "80ms" }}>
          <Key
            type="button"
            onClick={() => {
              onClose();
              router.push("/utilidades");
            }}
            className="w-full px-1 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
            title="Abrir utilidades e horários"
            aria-label="Abrir Utilidades"
          >
            Utilidades
          </Key>
        </div>
      </div>
    </div>
  );
};
