// src/app/cidade-viva/_components/CidadeVivaContainer.tsx
"use client";

import React from "react";
import nextDynamic from "next/dynamic";
import type { Category, Report } from "../_lib/types";

const MapClient = nextDynamic(
  () => import("./MapClient").then((mod) => mod.MapClient),
  {
    ssr: false,
    loading: () => (
      <div className="relative w-full h-[100dvh] flex flex-col items-center justify-center bg-surface gap-3">
        <div className="w-8 h-8 rounded-full border-3 border-coral border-t-transparent animate-spin" />
        <span className="text-xs font-bold text-ink uppercase tracking-wider">
          Carregando Cidade Viva...
        </span>
      </div>
    ),
  }
);

export function CidadeVivaContainer({
  initialCategories,
  initialReports,
  isAdmin = false,
}: {
  initialCategories: Category[];
  initialReports: Report[];
  isAdmin?: boolean;
}) {
  return (
    <MapClient
      initialCategories={initialCategories}
      initialReports={initialReports}
      isAdmin={isAdmin}
    />
  );
}
