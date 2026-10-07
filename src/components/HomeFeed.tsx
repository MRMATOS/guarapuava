"use client";

import React from "react";
import { DailyDigest } from "@/types/news";
import { MainNav } from "@/components/ui/MainNav";

interface HomeFeedProps {
  digest: DailyDigest;
  onOpenDetails: () => void;
  onSelectVagas: () => void;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  digest,
  onOpenDetails,
  onSelectVagas,
}) => {
  return (
    <div className="page-shell">
      {/* Cartão-resumo do dia */}
      <article
        onClick={onOpenDetails}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenDetails();
          }
        }}
        aria-label="Abrir resumo detalhado das notícias de hoje"
        className="surface-card w-full p-6 sm:p-7 cursor-pointer transition-transform duration-150 active:scale-[0.992] touch-manipulation select-none"
      >
        {/* Metadados: data e horário */}
        <div className="flex items-center justify-between mb-5 tracking-tight tabular-time">
          <span className="font-semibold text-ink text-[15px]">
            {digest.date}
          </span>
          <span className="badge-inset">
            <span
              className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse"
              aria-hidden="true"
            />
            atualizado às {digest.lastUpdatedTime}
          </span>
        </div>

        {/* Manchete síntese do dia */}
        <h1 className="text-[20px] sm:text-[21px] font-bold leading-[1.3] text-ink tracking-[-0.02em] text-balance mb-6">
          {digest.headline}
        </h1>

        {/* Tópicos */}
        <ul className="space-y-4 text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
          {digest.highlights.map((item) => (
            <li key={item.id} className="flex items-start">
              <span
                className="mr-2 text-coral font-black text-[17px] leading-[1.1] select-none shrink-0"
                aria-hidden="true"
              >
                •
              </span>
              <p className="flex-1">
                <strong className="font-bold text-ink">{item.title}:</strong>{" "}
                <span>{item.text}</span>
              </p>
            </li>
          ))}
        </ul>
      </article>

      <MainNav
        active="noticias"
        onNoticias={onOpenDetails}
        onVagas={onSelectVagas}
      />
    </div>
  );
};
