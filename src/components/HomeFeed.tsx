"use client";

import React, { useMemo } from "react";
import { DailyDigest } from "@/types/news";
import { MainNav } from "@/components/ui/MainNav";
import { getTodayDateString, formatRelativeUpdateText } from "@/lib/utils/date";

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
  const todayDisplay = useMemo(() => getTodayDateString(), []);
  const relativeUpdateDisplay = useMemo(
    () => formatRelativeUpdateText({ date: digest.date, time: digest.lastUpdatedTime }),
    [digest.date, digest.lastUpdatedTime]
  );

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
        className="surface-card w-full pt-3.5 px-5 pb-6 sm:pt-4 sm:px-6 sm:pb-7 cursor-pointer transition-transform duration-150 active:scale-[0.992] touch-manipulation select-none"
      >
        {/* Metadados: data de hoje fixa à esquerda e horário de atualização relativo à direita */}
        <div className="flex items-center justify-between mb-5 tracking-tight tabular-time">
          <span className="font-semibold text-ink text-[15px]">
            {todayDisplay}
          </span>
          <span className="badge-inset">
            <span
              className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse"
              aria-hidden="true"
            />
            {relativeUpdateDisplay}
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
