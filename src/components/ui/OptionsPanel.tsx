"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Key } from "./Key";
import { useHandedness } from "@/context/HandednessContext";

export interface OptionsPanelProps {
  onClose: () => void;
  onSelectOpcoes?: () => void;
  onSelectInfo?: () => void; // Compatibilidade com chamadas existentes
  optionsButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

export const OptionsPanel: React.FC<OptionsPanelProps> = ({
  onClose,
  onSelectOpcoes,
  optionsButtonRef,
}) => {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const { isLeftHanded } = useHandedness();

  // Fecha o bloco se clicar fora (exceto se for no botão Mais do rodapé)
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
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

  const handleOpenOpcoes = () => {
    onClose();
    if (onSelectOpcoes) {
      onSelectOpcoes();
    } else {
      router.push("/opcoes");
    }
  };

  const handleOpenUtilidades = () => {
    onClose();
    router.push("/utilidades");
  };

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Painel de mais opções"
      className="filter-panel w-full p-2.5 sm:p-3 flex flex-col gap-2.5 select-none"
    >
      {/* 2 Botões: Opções e Utilidades (Invertidos no modo canhoto) */}
      <div
        className={`grid grid-cols-2 gap-1.5 sm:gap-2 ${
          isLeftHanded ? "[direction:rtl] [&>*]:[direction:ltr]" : ""
        }`}
      >
        {/* 1. Botão Opções */}
        <div className="w-full animate-stagger-item" style={{ animationDelay: "20ms" }}>
          <Key
            type="button"
            onClick={handleOpenOpcoes}
            className="w-full px-1 text-[13px] sm:text-[14px] font-semibold justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
            title="Abrir opções, ajustes e acessibilidade"
            aria-label="Opções e acessibilidade"
          >
            Opções
          </Key>
        </div>

        {/* 2. Botão Utilidades */}
        <div className="w-full animate-stagger-item" style={{ animationDelay: "40ms" }}>
          <Key
            type="button"
            onClick={handleOpenUtilidades}
            className="w-full px-1 text-[13px] sm:text-[14px] font-semibold justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
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
