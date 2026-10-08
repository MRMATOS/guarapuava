"use client";

import React from "react";

export const JobCardSkeleton: React.FC = () => {
  return (
    <article
      aria-label="Carregando vagas..."
      className="surface-card w-full pt-3.5 px-5 pb-5 sm:pt-4 sm:px-6 sm:pb-6 animate-pulse select-none"
    >
      {/* 1. Título do cargo */}
      <div className="h-5 w-3/4 rounded bg-ink/15 dark:bg-ink/20 mb-2.5" />

      {/* 2. Empresa / Contratante */}
      <div className="h-4 w-2/5 rounded bg-ink/10 dark:bg-ink/15 mb-4" />

      {/* 3. Rodapé: Data e selo */}
      <div className="mt-3 pt-1 flex items-center justify-between gap-2">
        <div className="h-3.5 w-28 rounded bg-ink/10 dark:bg-ink/15" />
        <div className="h-6 w-20 rounded-full bg-ink/5 dark:bg-ink/10" />
      </div>
    </article>
  );
};
