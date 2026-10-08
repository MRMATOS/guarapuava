"use client";

import React from "react";

export const NewsCardSkeleton: React.FC = () => {
  return (
    <article
      aria-label="Carregando notícias..."
      className="surface-card w-full pt-3.5 px-5 pb-6 sm:pt-4 sm:px-6 sm:pb-7 animate-pulse select-none"
    >
      {/* Metadados: data à esquerda e horário de atualização à direita */}
      <div className="flex items-center justify-between mb-5">
        <div className="h-4 w-24 rounded bg-ink/10 dark:bg-ink/15" />
        <div className="badge-inset opacity-80">
          <span
            className="w-1.5 h-1.5 rounded-full bg-coral/40"
            aria-hidden="true"
          />
          <div className="h-3 w-24 rounded bg-ink/10 dark:bg-ink/15" />
        </div>
      </div>

      {/* Manchete síntese (placeholder de duas linhas) */}
      <div className="space-y-2.5 mb-6">
        <div className="h-6 w-11/12 rounded bg-ink/15 dark:bg-ink/20" />
        <div className="h-6 w-3/4 rounded bg-ink/15 dark:bg-ink/20" />
      </div>

      {/* Tópicos com marcadores corais suaves */}
      <ul className="space-y-4">
        {[92, 80, 88, 70].map((widthPct, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full bg-coral/40 mt-1.5 shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1 space-y-1.5">
              <div
                className="h-4 rounded bg-ink/10 dark:bg-ink/15"
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
};
