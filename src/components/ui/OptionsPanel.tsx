"use client";

import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { Key } from "./Key";
import { useTheme } from "@/context/ThemeContext";

export interface OptionsPanelProps {
  onClose: () => void;
  onSelectInfo: () => void;
  optionsButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

const emptySubscribe = () => () => {};

/**
 * Painel de Opções flutuante:
 * Mesma geometria e elevação neumórfica do FilterPanel ("O Painel de Rádio").
 * Contém 3 teclas em uma única linha:
 * 1. Teste (sem efeito no momento)
 * 2. Informações (leva ao feed com obrigações, privacidade e termos)
 * 3. Alternador de modo claro / modo escuro (textual, sem ícones)
 */
export const OptionsPanel: React.FC<OptionsPanelProps> = ({
  onClose,
  onSelectInfo,
  optionsButtonRef,
}) => {
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
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {/* 1. Botão Teste (reservado para futuras funcionalidades) */}
        <div className="w-full animate-stagger-item" style={{ animationDelay: "25ms" }}>
          <Key
            type="button"
            onClick={() => {}}
            className="w-full px-1 text-[13px] sm:text-[13.5px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
            title="Botão de teste (sem ação no momento)"
            aria-label="Botão de teste"
          >
            Teste
          </Key>
        </div>

        {/* 2. Botão Informações */}
        <div className="w-full animate-stagger-item" style={{ animationDelay: "50ms" }}>
          <Key
            type="button"
            onClick={() => {
              onClose();
              onSelectInfo();
            }}
            className="w-full px-1 text-[13px] sm:text-[13.5px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
            title="Abrir informações, responsabilidades e termos"
            aria-label="Informações do site"
          >
            Informações
          </Key>
        </div>

        {/* 3. Alternador de Modo Claro / Modo Escuro (sem ícone) */}
        <div className="w-full animate-stagger-item" style={{ animationDelay: "75ms" }}>
          <Key
            type="button"
            onClick={toggleTheme}
            className="w-full px-1 text-[13px] sm:text-[13.5px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
            title={`Alternar para ${themeLabel}`}
            aria-label={`Alternar para ${themeLabel}`}
          >
            {themeLabel}
          </Key>
        </div>
      </div>
    </div>
  );
};
