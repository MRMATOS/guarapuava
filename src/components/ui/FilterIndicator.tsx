"use client";

import React from "react";

interface FilterIndicatorProps {
  /** Informação descritiva do filtro exibida à esquerda */
  label: React.ReactNode;
  /** Função disparada ao clicar no botão Limpar à direita */
  onClear: () => void;
  /** Rótulo do botão de limpar (padrão: "Limpar") */
  clearLabel?: string;
  className?: string;
}

/**
 * FilterIndicator — barra translúcida em baixo-relevo (estilo glass)
 * que exibe os filtros ativos e botão de limpar, posicionada acima do rodapé ou do painel de filtros.
 */
export const FilterIndicator: React.FC<FilterIndicatorProps> = ({
  label,
  onClear,
  clearLabel = "Limpar",
  className = "",
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`filter-indicator w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[12px] text-coral select-none transition-all duration-200 ${className}`.trim()}
    >
      <div className="flex items-center gap-1 min-w-0 truncate">
        {label}
      </div>

      <button
        type="button"
        onClick={onClear}
        className="shrink-0 text-coral hover:text-coral-deep font-bold cursor-pointer underline underline-offset-2 ml-2 touch-manipulation focus:outline-none focus-visible:ring-1 focus-visible:ring-coral"
      >
        {clearLabel}
      </button>
    </div>
  );
};
