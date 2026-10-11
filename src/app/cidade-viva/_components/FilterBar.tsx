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
      className="bg-canvas/95 backdrop-blur-xs border border-rule/80 dark:border-white/10 rounded-xl shadow-xs flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-ink transition-transform active:scale-95 cursor-pointer select-none"
      title="Ocorrências ativas no mapa"
    >
      <span className="w-2 h-2 rounded-full bg-coral animate-pulse" />
      <span className="font-bold text-ink">{reportCount}</span>
      <span className="text-[11px] text-ink-muted">relatos ativos</span>
    </button>
  );
}
