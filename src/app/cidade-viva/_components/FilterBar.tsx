// src/app/cidade-viva/_components/FilterBar.tsx
"use client";

import React from "react";
import type { SeverityFilter } from "../_lib/types";

interface FilterBarProps {
  currentFilter?: SeverityFilter;
  onFilterChange?: (filter: SeverityFilter) => void;
  reportCount: number;
  onClick?: () => void;
}

export function FilterBar({
  reportCount,
  onClick,
}: FilterBarProps) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className="bg-neutral-900/90 text-white border border-neutral-700/80 dark:bg-white/95 dark:text-neutral-900 dark:border-black/10 backdrop-blur-xs rounded-xl shadow-md flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold hover:border-coral transition-all active:scale-95 cursor-pointer select-none"
      title="Ocorrências ativas no mapa"
    >
      <span className="font-bold text-white dark:text-neutral-900">{reportCount}</span>
      <span className="text-[11px] text-white/70 dark:text-neutral-600">relatos ativos</span>
    </button>
  );
}
