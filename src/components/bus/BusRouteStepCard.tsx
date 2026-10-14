"use client";

import React from "react";
import { Key } from "@/components/ui/Key";
import { normalizeText } from "@/lib/utils/search";
import type { LinhaBairro, PontoItinerario } from "@/types/bus";

function formatStopDisplayName(ponto: PontoItinerario, bairro?: string): string {
  let raw = ponto.nome;
  if (!raw || raw.startsWith("#")) {
    if (ponto.rua && ponto.referencia) {
      raw = `${ponto.rua} - ${ponto.referencia}`;
    } else if (ponto.rua) {
      raw = ponto.rua;
    } else if (ponto.referencia) {
      raw = ponto.referencia;
    } else {
      raw = `Parada ${ponto.ordem}`;
    }
  }

  if (bairro) {
    const normBairro = normalizeText(bairro);
    const normRaw = normalizeText(raw);
    if (!normRaw.includes(normBairro)) {
      raw = `${raw} - ${bairro}`;
    }
  }

  return raw;
}

export interface BusRouteStepCardProps {
  routeStep: "none" | "origin" | "destination" | "calculated";
  selectedOriginPonto?: { ponto: PontoItinerario; linha: LinhaBairro } | null;
  selectedDestinationPonto?: { ponto: PontoItinerario; linha: LinhaBairro } | null;
  onCancelRoute?: () => void;
  onClearOrigin?: () => void;
}

export const BusRouteStepCard: React.FC<BusRouteStepCardProps> = ({
  routeStep,
  selectedOriginPonto,
  onCancelRoute,
  onClearOrigin,
}) => {
  if (routeStep === "none" || routeStep === "calculated") {
    return null;
  }

  // PASSO 1: Escolha o Embarque
  if (routeStep === "origin" || !selectedOriginPonto) {
    return (
      <div className="surface-card w-full p-3 sm:p-3.5 border border-rule/50 shadow-raised-md flex items-center justify-between gap-3 animate-scale-in bg-canvas rounded-2xl text-left">
        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
          <span className="text-[11.5px] sm:text-[12px] font-bold text-coral uppercase tracking-wide">
            Passo 1 de 2 • Escolha o Embarque
          </span>
          <h3 className="text-[13px] sm:text-[13.5px] font-medium text-ink leading-snug break-words">
            Toque em uma parada ou use a busca para seu local de saída
          </h3>
        </div>
        <Key
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCancelRoute?.();
          }}
          className="px-3.5 h-[38px] text-[12.5px] sm:text-[13px] font-medium shrink-0 justify-center text-center"
          title="Cancelar criação de rota"
          aria-label="Cancelar criação de rota"
        >
          Cancelar
        </Key>
      </div>
    );
  }

  // PASSO 2: Escolha o Destino
  return (
    <div className="surface-card w-full p-3 sm:p-3.5 border border-coral/40 shadow-raised-md flex items-center justify-between gap-3 animate-scale-in bg-canvas rounded-2xl text-left">
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-coral shrink-0 animate-pulse" />
          <span className="text-[11.5px] sm:text-[12px] font-bold text-coral uppercase tracking-wide">
            Passo 2 de 2 • Escolha o Destino
          </span>
        </div>
        <div className="text-[13px] sm:text-[13.5px] text-ink-muted truncate">
          Embarque:{" "}
          <strong className="text-ink font-semibold">
            {formatStopDisplayName(selectedOriginPonto.ponto, selectedOriginPonto.linha.bairro)}
          </strong>
        </div>
      </div>
      <Key
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClearOrigin?.();
        }}
        className="px-3.5 h-[38px] text-[12.5px] sm:text-[13px] font-medium shrink-0 justify-center text-center"
        title="Trocar ponto de embarque"
        aria-label="Trocar ponto de embarque"
      >
        Trocar
      </Key>
    </div>
  );
};
