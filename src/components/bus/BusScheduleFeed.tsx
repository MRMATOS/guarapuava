"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore } from "react";
import { MapPin } from "lucide-react";
import { Key } from "@/components/ui/Key";
import type { LinhaBairro, PontoItinerario } from "@/types/bus";
import { calculateDistanceMeters, formatDistance } from "@/lib/geo/distance";
import { getSavedRoutes, subscribeSavedRoutes, deleteSavedRoute, type SavedBusRoute } from "@/lib/bus/saved-routes";
import { normalizeText, matchesFuzzyQuery } from "@/lib/utils/search";

const emptySavedRoutes: SavedBusRoute[] = [];
const getServerSavedRoutes = () => emptySavedRoutes;

export function formatStopDisplayName(
  ponto: PontoItinerario,
  fallbackBairro?: string
): string {
  let raw = (ponto.nome || ponto.rua || "").trim();

  // 1. Remove prefixo numérico de rota (ex: "365-R. Judite..." -> "R. Judite...")
  raw = raw.replace(/^\d+\s*-\s*/, "").trim();

  // 2. Remove os termos "Rua" e "R."
  raw = raw.replace(/\b(rua|r\.)\s+/gi, "").trim();

  // 3. Converte parênteses em traço (ex: "(Gastrocentro)" -> " - Gastrocentro")
  raw = raw.replace(/\s*\((.*?)\)\s*/g, " - $1").trim();

  // 4. Limpa traços duplicados ou soltos
  raw = raw.replace(/\s*-\s*-\s*/g, " - ").trim();
  raw = raw.replace(/^-\s*/, "").replace(/\s*-$/, "").trim();

  // 5. Adiciona bairro no final caso ainda não esteja presente
  const bairro = (ponto.bairro || fallbackBairro || "").trim();
  if (bairro) {
    const normBairro = normalizeText(bairro);
    const normRaw = normalizeText(raw);
    if (!normRaw.includes(normBairro)) {
      raw = `${raw} - ${bairro}`;
    }
  }

  return raw;
}

export function getGoogleMapsUrl(
  ponto: PontoItinerario,
  fallbackBairro?: string
): string {
  // 1. Se já tiver maps_url validada nos dados, usa diretamente
  if (ponto.maps_url) {
    return ponto.maps_url;
  }

  // 2. Constrói o link com o endereço exibido no card
  const cardAddress = formatStopDisplayName(ponto, fallbackBairro);
  if (cardAddress && cardAddress.length >= 6) {
    const query = cardAddress.toLowerCase().includes("guarapuava")
      ? cardAddress
      : `${cardAddress}, Guarapuava - PR`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  // 3. Fallback para coordenadas ou nome puro
  if (ponto.latitude && ponto.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${ponto.latitude},${ponto.longitude}`;
  }
  const cleanName = ponto.nome.replace(/\(.*?\)/g, "").trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${cleanName}, Guarapuava - PR`)}`;
}



/**
 * Calcula o horário mais próximo da hora atual (próxima saída).
 */
function getClosestDeparture(horarios: string[]): { closest: string | null; minutesDiff: number } {
  if (!horarios || !horarios.length) return { closest: null, minutesDiff: Infinity };
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let closest: string | null = null;
  let minDiff = Infinity;

  for (const h of horarios) {
    const parts = h.split(":").map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const timeMinutes = parts[0] * 60 + parts[1];
      if (timeMinutes >= currentMinutes) {
        const diff = timeMinutes - currentMinutes;
        if (diff < minDiff) {
          minDiff = diff;
          closest = h;
        }
      }
    }
  }

  // Se já passaram todas as saídas de hoje, sugere a primeira do dia seguinte
  if (!closest && horarios.length > 0) {
    closest = horarios[0];
  }

  return { closest, minutesDiff: minDiff };
}

function timeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  return null;
}

function getPontoActiveHorarios(ponto: PontoItinerario): string[] {
  const day = new Date().getDay();
  if (day === 6 && ponto.horariosSabado && ponto.horariosSabado.length > 0) {
    return ponto.horariosSabado;
  }
  if (day === 0 && ponto.horariosDomingo && ponto.horariosDomingo.length > 0) {
    return ponto.horariosDomingo;
  }
  if (ponto.horariosUteis && ponto.horariosUteis.length > 0) {
    return ponto.horariosUteis;
  }
  return ponto.horariosSabado?.length ? ponto.horariosSabado : (ponto.horariosDomingo || []);
}

function getEstimatedArrival(
  origem: PontoItinerario,
  destino: PontoItinerario,
  proximoHorarioOrigem: string | null,
  _stopsCount?: number
): string | null {
  if (!proximoHorarioOrigem) return null;

  const origMinutes = timeToMinutes(proximoHorarioOrigem);
  if (origMinutes === null) return null;

  const destinoHorarios = getPontoActiveHorarios(destino);

  // Procura na tabela de horários oficial do ponto de desembarque o primeiro horário >= horário de embarque
  if (destinoHorarios && destinoHorarios.length > 0) {
    const candidate = destinoHorarios.find((h) => {
      const m = timeToMinutes(h);
      return m !== null && m >= origMinutes;
    });

    if (candidate) return candidate;

    // Se já passou o último horário de hoje, pega o primeiro da tabela (dia seguinte)
    return destinoHorarios[0];
  }

  return null;
}

export interface RouteJourneyData {
  linha: LinhaBairro;
  origem: PontoItinerario;
  intermediarias: PontoItinerario[];
  destino: PontoItinerario;
  origDistanceMeters?: number | null;
}

export function computeRouteJourney(
  origemPonto: { ponto: PontoItinerario; linha: LinhaBairro; distanceMeters?: number | null },
  destinoPonto: { ponto: PontoItinerario; linha: LinhaBairro; distanceMeters?: number | null },
  linhas: LinhaBairro[],
  referenceCoords?: { lat: number; lon: number } | null
): RouteJourneyData {
  const origPontoId = origemPonto.ponto.id;
  const destPontoId = destinoPonto.ponto.id;

  const origDistanceMeters =
    (referenceCoords && origemPonto.ponto.latitude && origemPonto.ponto.longitude
      ? calculateDistanceMeters(
          referenceCoords.lat,
          referenceCoords.lon,
          origemPonto.ponto.latitude,
          origemPonto.ponto.longitude
        )
      : origemPonto.distanceMeters ?? null);

  // 1. Tenta achar linha comum direta
  let matchingLinha: LinhaBairro | null = null;
  let origIdx = -1;
  let destIdx = -1;

  for (const linha of linhas) {
    const idx1 = linha.pontos.findIndex((p) => p.id === origPontoId);
    const idx2 = linha.pontos.findIndex((p) => p.id === destPontoId);
    if (idx1 !== -1 && idx2 !== -1) {
      matchingLinha = linha;
      origIdx = idx1;
      destIdx = idx2;
      break;
    }
  }

  if (matchingLinha && origIdx !== -1 && destIdx !== -1) {
    const start = Math.min(origIdx, destIdx);
    const end = Math.max(origIdx, destIdx);
    const segment = matchingLinha.pontos.slice(start, end + 1);

    const isReversed = origIdx > destIdx;
    const orderedStops = isReversed ? [...segment].reverse() : segment;

    return {
      linha: matchingLinha,
      origem: orderedStops[0],
      intermediarias: orderedStops.slice(1, -1),
      destino: orderedStops[orderedStops.length - 1],
      origDistanceMeters,
    };
  }

  // Fallback: exibe origem e destino das linhas selecionadas
  return {
    linha: origemPonto.linha,
    origem: origemPonto.ponto,
    intermediarias: [],
    destino: destinoPonto.ponto,
    origDistanceMeters,
  };
}

function renderHorariosSection(
  ponto: PontoItinerario,
  highlightedHorario?: string | null,
  highlightColor: "coral" | "emerald" = "coral",
  customTitle?: string,
  isExpanded: boolean = false
) {
  const getBadgeClasses = (horario: string) => {
    if (highlightedHorario && horario === highlightedHorario) {
      if (highlightColor === "emerald") {
        return "bg-emerald-600 text-white font-bold shadow-xs";
      }
      return "bg-coral text-white font-bold shadow-xs";
    }
    return "bg-surface-inset text-ink border border-rule/40 shadow-xs";
  };

  const hasAnyHorarios =
    (ponto.horariosUteis && ponto.horariosUteis.length > 0) ||
    (ponto.horariosSabado && ponto.horariosSabado.length > 0) ||
    (ponto.horariosDomingo && ponto.horariosDomingo.length > 0);

  if (!hasAnyHorarios) {
    return (
      <div className="pt-0.5 text-[12.5px] text-ink-muted italic flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-ink-muted/50 shrink-0" />
        <span>Ponto de passagem do itinerário</span>
      </div>
    );
  }

  // Quando recolhido (estado inicial padrão de todos os cards):
  // Exibe o próximo horário em relação ao usuário e o segundo box com efeito de opacidade como dica tátil
  if (!isExpanded) {
    const dayOfWeek = new Date().getDay(); // 0 = Domingo, 6 = Sábado
    let activeList: string[] = [];
    let activeTitle = customTitle || "Dias Úteis";

    if (dayOfWeek === 6 && ponto.horariosSabado && ponto.horariosSabado.length > 0) {
      activeList = ponto.horariosSabado;
      if (!customTitle) activeTitle = "Sábados";
    } else if (dayOfWeek === 0 && ponto.horariosDomingo && ponto.horariosDomingo.length > 0) {
      activeList = ponto.horariosDomingo;
      if (!customTitle) activeTitle = "Domingos e Feriados";
    } else if (ponto.horariosUteis && ponto.horariosUteis.length > 0) {
      activeList = ponto.horariosUteis;
      if (!customTitle) activeTitle = "Dias Úteis";
    } else if (ponto.horariosSabado && ponto.horariosSabado.length > 0) {
      activeList = ponto.horariosSabado;
      if (!customTitle) activeTitle = "Sábados";
    } else if (ponto.horariosDomingo && ponto.horariosDomingo.length > 0) {
      activeList = ponto.horariosDomingo;
      if (!customTitle) activeTitle = "Domingos e Feriados";
    }

    if (activeList.length === 0) {
      return (
        <div className="pt-0.5 text-[12.5px] text-ink-muted italic flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-muted/50 shrink-0" />
          <span>Ponto de passagem do itinerário</span>
        </div>
      );
    }

    // Identifica o próximo horário (ou o horário destacado no caso de embarque/desembarque)
    const closest = highlightedHorario || getClosestDeparture(activeList).closest || activeList[0];
    const closestIdx = closest ? activeList.indexOf(closest) : -1;
    const validIdx = closestIdx !== -1 ? closestIdx : 0;

    const firstHorario = closest || activeList[0];
    const secondHorario =
      activeList.length > 1
        ? activeList[(validIdx + 1) % activeList.length]
        : null;

    return (
      <div className="flex flex-col gap-1.5 pt-1">
        <span className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-muted">
          {activeTitle}
        </span>
        <div
          className="flex items-center gap-1.5 overflow-hidden select-none pointer-events-none"
          style={{
            WebkitMaskImage: secondHorario
              ? "linear-gradient(to right, black 0px, black 60px, rgba(0,0,0,0.92) 68px, rgba(0,0,0,0.45) 96px, rgba(0,0,0,0.1) 116px, transparent 126px)"
              : undefined,
            maskImage: secondHorario
              ? "linear-gradient(to right, black 0px, black 60px, rgba(0,0,0,0.92) 68px, rgba(0,0,0,0.45) 96px, rgba(0,0,0,0.1) 116px, transparent 126px)"
              : undefined,
          }}
        >
          <span
            className={`font-mono text-[13px] font-semibold px-2.5 py-1 rounded-md transition-colors shrink-0 ${getBadgeClasses(
              firstHorario
            )}`}
          >
            {firstHorario}
          </span>
          {secondHorario && (
            <span
              className={`font-mono text-[13px] font-semibold px-2.5 py-1 rounded-md transition-colors shrink-0 ${getBadgeClasses(
                secondHorario
              )}`}
            >
              {secondHorario}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Quando expandido (ao toque do usuário): revela todos os horários completos
  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      {/* Horários: Dias Úteis */}
      {ponto.horariosUteis.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-muted">
            {customTitle || "Dias Úteis"}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {ponto.horariosUteis.map((horario, hIdx) => (
              <span
                key={hIdx}
                className={`font-mono text-[13px] font-semibold px-2.5 py-1 rounded-md transition-colors ${getBadgeClasses(
                  horario
                )}`}
              >
                {horario}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Horários: Sábados */}
      {ponto.horariosSabado.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1.5 border-t border-rule/20">
          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-muted">
            Sábados
          </span>
          <div className="flex flex-wrap gap-1.5">
            {ponto.horariosSabado.map((horario, hIdx) => (
              <span
                key={hIdx}
                className={`font-mono text-[13px] font-semibold px-2.5 py-1 rounded-md transition-colors ${getBadgeClasses(
                  horario
                )}`}
              >
                {horario}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Horários: Domingos e Feriados */}
      {ponto.horariosDomingo.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1.5 border-t border-rule/20">
          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-muted">
            Domingos e Feriados
          </span>
          <div className="flex flex-wrap gap-1.5">
            {ponto.horariosDomingo.map((horario, hIdx) => (
              <span
                key={hIdx}
                className={`font-mono text-[13px] font-semibold px-2.5 py-1 rounded-md transition-colors ${getBadgeClasses(
                  horario
                )}`}
              >
                {horario}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function renderJourneyView(
  journey: RouteJourneyData,
  showHeader: boolean = false,
  expandedCards?: Record<string, boolean>,
  toggleCardExpanded?: (key: string) => void
) {
  const activeHorariosOrigem = getPontoActiveHorarios(journey.origem);
  const { closest: proximoHorario } = getClosestDeparture(activeHorariosOrigem);
  const horarioChegada = getEstimatedArrival(
    journey.origem,
    journey.destino,
    proximoHorario,
    journey.intermediarias.length + 1
  );

  const destDistanceMeters =
    journey.origem.latitude &&
    journey.origem.longitude &&
    journey.destino.latitude &&
    journey.destino.longitude
      ? calculateDistanceMeters(
          journey.origem.latitude,
          journey.origem.longitude,
          journey.destino.latitude,
          journey.destino.longitude
        )
      : null;

  return (
    <div className="flex flex-col gap-4 w-full select-text animate-fade-in">
      {showHeader && (
        <div className="surface-card w-full px-5 py-3.5 sm:px-6 sm:py-4 flex flex-col gap-1.5 border border-rule/50 shadow-raised-sm">
          <h2 className="text-[15px] font-bold text-ink">
            {journey.linha.nomeExibicao}
          </h2>
          <p className="text-[12.5px] text-ink-muted">
            {journey.intermediarias.length + 2} paradas no percurso.
          </p>
        </div>
      )}

      {/* 1. CARD DE EMBARQUE */}
      {(() => {
        const origemKey = `journey-origem-${journey.origem.id}`;
        const isOrigemExpanded = Boolean(expandedCards?.[origemKey]);
        return (
          <div
            onClick={() => toggleCardExpanded?.(origemKey)}
            className="surface-card w-full p-4 flex flex-col gap-3 border border-coral/60 shadow-raised-sm cursor-pointer transition-all duration-200 active:scale-[0.995]"
          >
            {/* Linha, Distância e Mapa */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-semibold text-ink-muted truncate">
                {journey.linha.nomeExibicao}
              </span>

              <div className="flex items-center gap-1.5 shrink-0">
                {journey.origDistanceMeters !== null && journey.origDistanceMeters !== undefined && (
                  <span
                    className="px-2.5 py-0.5 rounded-full bg-coral/10 text-coral text-[12px] font-bold tracking-tight"
                    title={`Distância: ${journey.origDistanceMeters} metros`}
                  >
                    a {formatDistance(journey.origDistanceMeters)}
                  </span>
                )}

                <a
                  href={getGoogleMapsUrl(journey.origem, journey.linha.bairro)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="px-2.5 py-1 rounded-md border border-rule/40 hover:border-coral/50 bg-canvas hover:bg-coral/10 text-ink-body hover:text-coral transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs active:scale-95 text-[12px] font-semibold"
                  title="Ver localização no Google Maps"
                >
                  <MapPin className="w-3.5 h-3.5 text-coral" />
                  <span>Mapa</span>
                </a>
              </div>
            </div>

            {/* Nome do Ponto */}
            <div className="min-w-0 w-full">
              <h3
                className="text-[14.5px] sm:text-[15px] font-bold text-ink tracking-tight break-words leading-snug"
                title={formatStopDisplayName(journey.origem, journey.linha.bairro)}
              >
                {formatStopDisplayName(journey.origem, journey.linha.bairro)}
              </h3>
            </div>

            {/* Horários com o horário mais próximo destacado em coral */}
            {renderHorariosSection(journey.origem, proximoHorario, "coral", undefined, isOrigemExpanded)}

            {/* Badge de Embarque alinhada à esquerda abaixo dos horários */}
            <div className="pt-1 flex items-center justify-start">
              <span className="px-2.5 py-0.5 rounded-md bg-coral text-white text-[12px] font-bold shadow-xs">
                Embarque
              </span>
            </div>
          </div>
        );
      })()}

      {/* 2. PARADAS INTERMEDIÁRIAS */}
      {journey.intermediarias.length > 0 && (
        <div className="w-full pl-3 pr-1 py-1 flex flex-col gap-0 border-l-2 border-dashed border-rule/70 ml-4">
          <div className="text-[11.5px] font-semibold text-ink-muted uppercase tracking-wider py-1 pl-3">
            {journey.intermediarias.length} Paradas pelo caminho
          </div>
          {journey.intermediarias.map((p, idx) => (
            <div
              key={`${p.id}-${p.ordem ?? idx}`}
              className="relative pl-6 py-2 flex items-center justify-between group"
            >
              <span className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-rule border-2 border-canvas group-hover:bg-coral transition-colors" />

              <div className="min-w-0 pr-2 flex-1">
                <span className="text-[13px] font-medium text-ink-body break-words block leading-snug">
                  {formatStopDisplayName(p, journey.linha.bairro)}
                </span>
              </div>

              <a
                href={getGoogleMapsUrl(p, journey.linha.bairro)}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-ink-muted hover:text-coral shrink-0"
                title="Ver no mapa"
              >
                <MapPin className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}

      {/* 3. CARD DE CHEGADA / DESTINO */}
      {(() => {
        const destinoKey = `journey-destino-${journey.destino.id}`;
        const isDestinoExpanded = Boolean(expandedCards?.[destinoKey]);
        return (
          <div
            onClick={() => toggleCardExpanded?.(destinoKey)}
            className="surface-card w-full p-4 flex flex-col gap-3 border border-emerald-500/60 shadow-raised-sm cursor-pointer transition-all duration-200 active:scale-[0.995]"
          >
            {/* Linha, Distância e Mapa */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-semibold text-ink-muted truncate">
                {journey.linha.nomeExibicao}
              </span>

              <div className="flex items-center gap-1.5 shrink-0">
                {destDistanceMeters !== null && (
                  <span
                    className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[12px] font-bold tracking-tight"
                    title={`Distância do percurso: ${destDistanceMeters} metros`}
                  >
                    a {formatDistance(destDistanceMeters)}
                  </span>
                )}
                <a
                  href={getGoogleMapsUrl(journey.destino, journey.linha.bairro)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="px-2.5 py-1 rounded-md border border-rule/40 hover:border-emerald-500/50 bg-canvas hover:bg-emerald-500/10 text-ink-body hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs active:scale-95 text-[12px] font-semibold"
                  title="Ver localização no Google Maps"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Mapa</span>
                </a>
              </div>
            </div>

            {/* Nome do Ponto */}
            <div className="min-w-0 w-full">
              <h3
                className="text-[14.5px] sm:text-[15px] font-bold text-ink tracking-tight break-words leading-snug"
                title={formatStopDisplayName(journey.destino, journey.linha.bairro)}
              >
                {formatStopDisplayName(journey.destino, journey.linha.bairro)}
              </h3>
            </div>

            {/* Horários do Ponto de Desembarque (Previsão de Chegada) com destaque suave no horário previsto */}
            {renderHorariosSection(journey.destino, horarioChegada, "emerald", "Previsão de Chegada", isDestinoExpanded)}

            {/* Badge de Desembarque alinhada à esquerda abaixo dos horários */}
            <div className="pt-1 flex items-center justify-start">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-[12px] font-bold shadow-xs">
                Desembarque
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export interface BusScheduleFeedProps {
  linhas: LinhaBairro[];
  selectedBairroId?: string | null;
  selectedPontoId?: string | null;
  searchQuery?: string;
  onClearFilter?: () => void;
  // Propriedades do Planejador de Rotas
  routeStep?: "none" | "origin" | "destination" | "calculated";
  selectedOriginPonto?: { ponto: PontoItinerario; linha: LinhaBairro; distanceMeters?: number | null } | null;
  selectedDestinationPonto?: { ponto: PontoItinerario; linha: LinhaBairro; distanceMeters?: number | null } | null;
  userCoords?: { lat: number; lon: number } | null;
  targetSearchCoords?: { lat: number; lon: number; label?: string } | null;
  isShowingSavedRoutes?: boolean;
  onSelectOrigin?: (ponto: PontoItinerario, linha: LinhaBairro, distanceMeters?: number | null) => void;
  onSelectDestination?: (ponto: PontoItinerario, linha: LinhaBairro, distanceMeters?: number | null) => void;
  onCancelRoute?: () => void;
  onClearOrigin?: () => void;
  onClearDestination?: () => void;
}

export const BusScheduleFeed: React.FC<BusScheduleFeedProps> = ({
  linhas,
  selectedBairroId,
  selectedPontoId,
  searchQuery = "",
  onClearFilter,
  routeStep = "none",
  selectedOriginPonto,
  selectedDestinationPonto,
  userCoords,
  targetSearchCoords,
  isShowingSavedRoutes = false,
  onSelectOrigin,
  onSelectDestination,
  onCancelRoute,
  onClearOrigin,
  onClearDestination,
}) => {
  const selectedPontoRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para o ponto selecionado quando ele mudar
  useEffect(() => {
    if (selectedPontoId && selectedPontoRef.current) {
      selectedPontoRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [selectedPontoId]);

  const isRouteMode = routeStep !== "none";
  const isSelectingOrigin = routeStep === "origin";
  const isSelectingDestination = routeStep === "destination";
  const isCalculatedRoute = routeStep === "calculated";

  // Armazena estado expandido de cada card para revelar todos os horários ao toque
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [confirmingDeleteRouteId, setConfirmingDeleteRouteId] = useState<string | null>(null);

  const toggleCardExpanded = useCallback((cardKey: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  }, []);

  // Gerenciamento reativo de rotas salvas sem render cascata
  const savedRoutes = useSyncExternalStore(
    subscribeSavedRoutes,
    getSavedRoutes,
    getServerSavedRoutes
  );

  // Carga progressiva de linhas normais
  const filterKey = `${selectedBairroId || ""}-${searchQuery}-${routeStep}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  const [visibleLinesCount, setVisibleLinesCount] = useState(5);

  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setVisibleLinesCount(5);
  }

  // Coordenadas ativas de referência (endereço pesquisado tem precedência sobre GPS)
  const activeReferenceCoords = useMemo(() => {
    if (targetSearchCoords) {
      return {
        lat: targetSearchCoords.lat,
        lon: targetSearchCoords.lon,
        label: targetSearchCoords.label || "Endereço buscado",
        isSearch: true,
      };
    }
    if (userCoords) {
      return {
        lat: userCoords.lat,
        lon: userCoords.lon,
        label: "Sua localização",
        isSearch: false,
      };
    }
    return null;
  }, [targetSearchCoords, userCoords]);

  // Se a rota estiver calculada, traça o itinerário entre a origem e o destino
  const routeJourney = useMemo(() => {
    if (!isCalculatedRoute || !selectedOriginPonto || !selectedDestinationPonto) {
      return null;
    }
    return computeRouteJourney(selectedOriginPonto, selectedDestinationPonto, linhas, activeReferenceCoords);
  }, [isCalculatedRoute, selectedOriginPonto, selectedDestinationPonto, linhas, activeReferenceCoords]);

  // Carga progressiva de paradas na lista por proximidade
  const nearestKey = `${activeReferenceCoords?.lat || ""}-${activeReferenceCoords?.lon || ""}-${routeStep}`;
  const [prevNearestKey, setPrevNearestKey] = useState(nearestKey);
  const [visibleNearestCount, setVisibleNearestCount] = useState(20);

  if (prevNearestKey !== nearestKey) {
    setPrevNearestKey(nearestKey);
    setVisibleNearestCount(20);
  }

  // Lista de todas as paradas ordenadas estritamente por distância quando houver coordenadas ativas
  const nearestStops = useMemo(() => {
    if (!activeReferenceCoords) return [];

    const results: Array<{
      ponto: PontoItinerario;
      linha: LinhaBairro;
      distanceMeters: number;
    }> = [];

    const isSearchCoords = Boolean(activeReferenceCoords.isSearch);
    const query = isSearchCoords ? "" : normalizeText(searchQuery);

    for (const linha of linhas) {
      if (selectedBairroId && linha.id !== selectedBairroId) {
        continue;
      }

      const matchLinha =
        !searchQuery.trim() ||
        matchesFuzzyQuery(linha.bairro, searchQuery) ||
        matchesFuzzyQuery(linha.nomeExibicao, searchQuery) ||
        matchesFuzzyQuery(linha.codigo, searchQuery);

      for (const ponto of linha.pontos) {
        if (!ponto.latitude || !ponto.longitude) continue;

        const matchPonto =
          !searchQuery.trim() ||
          matchLinha ||
          matchesFuzzyQuery(ponto.nome, searchQuery) ||
          (ponto.rua ? matchesFuzzyQuery(ponto.rua, searchQuery) : false) ||
          (ponto.referencia ? matchesFuzzyQuery(ponto.referencia, searchQuery) : false) ||
          (ponto.bairro ? matchesFuzzyQuery(ponto.bairro, searchQuery) : false);

        if (!matchPonto) continue;

        const dist = calculateDistanceMeters(
          activeReferenceCoords.lat,
          activeReferenceCoords.lon,
          ponto.latitude,
          ponto.longitude
        );

        results.push({
          ponto,
          linha,
          distanceMeters: dist,
        });
      }
    }

    results.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return results;
  }, [activeReferenceCoords, linhas, selectedBairroId, searchQuery]);

  // 1. VISUALIZAÇÃO DE ROTAS SALVAS ("Minhas rotas")
  // Ordena as rotas salvas pela distância do usuário até o ponto de embarque (origem)
  const orderedSavedRoutes = useMemo(() => {
    if (!activeReferenceCoords) return savedRoutes;

    const getOriginCoords = (saved: SavedBusRoute) => {
      const lat = saved.origem.ponto.latitude ?? (saved.origem.ponto as unknown as { lat?: number }).lat;
      const lon = saved.origem.ponto.longitude ?? (saved.origem.ponto as unknown as { lon?: number }).lon;
      if (lat != null && lon != null) return { lat, lon };

      for (const linha of linhas) {
        const found = linha.pontos.find((p) => p.id === saved.origem.ponto.id);
        if (found?.latitude != null && found?.longitude != null) {
          return { lat: found.latitude, lon: found.longitude };
        }
      }
      return null;
    };

    return [...savedRoutes].sort((a, b) => {
      const coordsA = getOriginCoords(a);
      const coordsB = getOriginCoords(b);

      const distA = coordsA
        ? calculateDistanceMeters(
            activeReferenceCoords.lat,
            activeReferenceCoords.lon,
            coordsA.lat,
            coordsA.lon
          )
        : Infinity;

      const distB = coordsB
        ? calculateDistanceMeters(
            activeReferenceCoords.lat,
            activeReferenceCoords.lon,
            coordsB.lat,
            coordsB.lon
          )
        : Infinity;

      return distA - distB;
    });
  }, [savedRoutes, activeReferenceCoords, linhas]);

  if (isShowingSavedRoutes) {
    if (savedRoutes.length === 0) {
      return (
        <div className="surface-card w-full p-8 flex flex-col items-center justify-center text-center gap-2 animate-fade-in">
          <h3 className="text-[16px] font-bold text-ink">Nenhuma rota salva ainda</h3>
          <p className="text-[13px] text-ink-muted max-w-[300px]">
            Planeje um trajeto e toque em &ldquo;Salvar rota&rdquo; para guardá-lo e acessá-lo rapidamente a qualquer momento.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 w-full select-text animate-fade-in pb-12">
        {orderedSavedRoutes.map((saved, idx) => {
          const journey = computeRouteJourney(saved.origem, saved.destino, linhas, activeReferenceCoords);
          return (
            <div key={saved.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1 text-[12.5px] font-semibold text-ink-muted">
                <span>Rota {idx + 1}</span>
                <span className="truncate max-w-[240px]">
                  {saved.origem.ponto.bairro || saved.origem.linha.bairro} →{" "}
                  {saved.destino.ponto.bairro || saved.destino.linha.bairro}
                </span>
              </div>
              {renderJourneyView(journey, false, expandedCards, toggleCardExpanded)}

              {/* Botão Excluir Rota abaixo do card de desembarque com confirmação in-place */}
              <div className="pt-0.5">
                {(() => {
                  const isConfirming = confirmingDeleteRouteId === saved.id;
                  return (
                    <Key
                      type="button"
                      onClick={() => {
                        if (isConfirming) {
                          deleteSavedRoute(saved.id);
                          setConfirmingDeleteRouteId(null);
                        } else {
                          setConfirmingDeleteRouteId(saved.id);
                        }
                      }}
                      className={`w-full text-[13px] font-semibold justify-center text-center text-coral active:scale-[0.99] transition-all duration-150 ${
                        isConfirming ? "!border !border-coral !bg-coral/5 shadow-xs" : ""
                      }`}
                      title={isConfirming ? "Toque para confirmar a exclusão da rota" : "Excluir rota salva"}
                      aria-label={isConfirming ? `Confirmar exclusão da Rota ${idx + 1}` : `Excluir Rota ${idx + 1}`}
                    >
                      {isConfirming ? "Toque para confirmar a exclusão" : "Excluir Rota"}
                    </Key>
                  );
                })()}
              </div>

              {/* Linha divisória entre rotas salvas */}
              {idx < orderedSavedRoutes.length - 1 && (
                <div
                  className="my-3 border-b border-dotted border-rule/90"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // 2. VISUALIZAÇÃO DE ROTA CALCULADA
  if (isCalculatedRoute && routeJourney) {
    return (
      <div className="flex flex-col gap-4 w-full select-text animate-fade-in pb-12">
        {renderJourneyView(routeJourney, false, expandedCards, toggleCardExpanded)}
      </div>
    );
  }

  // 3. VISUALIZAÇÃO ORDENADA POR PROXIMIDADE (GPS do usuário ou Endereço pesquisado)
  if (activeReferenceCoords) {
    if (nearestStops.length === 0) {
      return (
        <div className="surface-card w-full p-6 flex flex-col items-center justify-center text-center gap-3">
          <h3 className="text-[16px] font-bold text-ink">Nenhuma parada encontrada</h3>
          <p className="text-[13.5px] text-ink-muted max-w-[280px]">
            Não encontramos paradas próximas aos critérios selecionados.
          </p>
          {onClearFilter && (
            <button
              type="button"
              onClick={onClearFilter}
              className="text-[13px] font-medium text-coral hover:underline pt-1 cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      );
    }

    const stopsToDisplay = nearestStops.slice(0, visibleNearestCount);
    const remainingStops = nearestStops.length - stopsToDisplay.length;

    return (
      <div className="flex flex-col gap-4 w-full select-text pb-12 animate-fade-in">

        {/* Banner Informativo de Ordenação por Proximidade */}
        <div className="surface-card w-full p-3.5 border border-rule/50 flex items-center shadow-raised-sm">
          <span className="text-[13px] font-medium text-ink truncate">
            {activeReferenceCoords.isSearch ? (
              <>
                Pontos mais próximos de:{" "}
                <strong className="font-bold text-coral">
                  {activeReferenceCoords.label}
                </strong>
              </>
            ) : (
              "Mostrando os pontos mais próximos"
            )}
          </span>
        </div>

        {/* Lista das paradas ordenadas */}
        <div className="flex flex-col gap-3 w-full">
          {stopsToDisplay.map(({ ponto, linha, distanceMeters }, index) => {
            const isSelectedByFilter = selectedPontoId === ponto.id;
            const isSelectedOrigin =
              selectedOriginPonto?.ponto.id === ponto.id &&
              selectedOriginPonto?.linha.id === linha.id;
            const isSelectedDest =
              selectedDestinationPonto?.ponto.id === ponto.id &&
              selectedDestinationPonto?.linha.id === linha.id;

            const cardKey = `near-${linha.id}-${ponto.id}-${index}`;
            const isExpanded = Boolean(expandedCards[cardKey]);
            const isOriginStop = selectedOriginPonto?.ponto.id === ponto.id;
            const isOriginDisabledInDestStep = isSelectingDestination && isOriginStop;

            const handleCardClick = () => {
              if (isSelectingOrigin && onSelectOrigin) {
                onSelectOrigin(ponto, linha, distanceMeters);
              } else if (isSelectingDestination && onSelectDestination) {
                if (isOriginStop) return;
                onSelectDestination(ponto, linha, distanceMeters);
              } else {
                toggleCardExpanded(cardKey);
              }
            };

            const destArrivalTime =
              isSelectedDest && selectedOriginPonto
                ? getEstimatedArrival(
                    selectedOriginPonto.ponto,
                    ponto,
                    getClosestDeparture(selectedOriginPonto.ponto.horariosUteis).closest,
                    Math.max(1, Math.abs(ponto.ordem - selectedOriginPonto.ponto.ordem))
                  )
                : null;

            return (
              <div
                key={`near-${linha.id}-${ponto.id}-${index}`}
                id={`ponto-${linha.codigo}-${ponto.id}`}
                ref={isSelectedByFilter ? selectedPontoRef : null}
                onClick={handleCardClick}
                title={
                  isOriginDisabledInDestStep
                    ? "Parada selecionada como local de embarque. Escolha outro destino."
                    : undefined
                }
                className={`surface-card w-full p-4 flex flex-col gap-3 transition-all duration-200 ${
                  isOriginDisabledInDestStep
                    ? "opacity-50 cursor-not-allowed border border-coral/40"
                    : isRouteMode
                    ? "cursor-pointer hover:border-coral/50 active:scale-[0.99]"
                    : "cursor-pointer active:scale-[0.995]"
                } ${
                  isSelectedOrigin
                    ? "border border-coral/60 shadow-raised-sm"
                    : isSelectedDest
                    ? "border border-emerald-500/60 shadow-raised-sm"
                    : isSelectedByFilter
                    ? "border border-coral/60 shadow-raised-sm brightness-[1.02]"
                    : ""
                }`}
              >
                {/* Linha, Distância e Mapa */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-ink-muted truncate">
                    {linha.nomeExibicao}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="px-2.5 py-0.5 rounded-full bg-coral/10 text-coral text-[12px] font-bold tracking-tight"
                      title={`Distância: ${distanceMeters} metros`}
                    >
                      a {formatDistance(distanceMeters)}
                    </span>

                    <a
                      href={getGoogleMapsUrl(ponto, linha.bairro)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Ver localização de ${ponto.nome} no Google Maps`}
                      title="Ver localização no Google Maps"
                      className="px-2.5 py-1 rounded-md border border-rule/40 hover:border-coral/50 bg-canvas hover:bg-coral/10 text-ink-body hover:text-coral transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs active:scale-95 text-[12px] font-semibold"
                    >
                      <MapPin className="w-3.5 h-3.5 text-coral" />
                      <span>Mapa</span>
                    </a>
                  </div>
                </div>

                {/* Nome do Ponto (sem # antes) */}
                <div className="min-w-0 w-full">
                  <h3
                    className="text-[14.5px] sm:text-[15px] font-bold text-ink tracking-tight break-words leading-snug"
                    title={formatStopDisplayName(ponto, linha.bairro)}
                  >
                    {formatStopDisplayName(ponto, linha.bairro)}
                  </h3>
                </div>

                {/* Horários */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCardExpanded(cardKey);
                  }}
                >
                  {renderHorariosSection(ponto, null, "coral", undefined, isExpanded)}
                </div>

                {/* Badges de Embarque ou Destino alinhadas à esquerda abaixo dos horários */}
                {(isSelectedOrigin || isSelectedDest) && (
                  <div className="pt-1 flex items-center justify-start gap-2">
                    {isSelectedOrigin && (
                      <span className="px-2.5 py-0.5 rounded-md bg-coral text-white text-[12px] font-bold shadow-xs">
                        Embarque
                      </span>
                    )}
                    {isSelectedDest && (
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-[12px] font-bold shadow-xs">
                          Desembarque
                        </span>
                        {destArrivalTime && (
                          <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Chegada prevista: <strong>{destArrivalTime}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Botão de Carga Progressiva */}
        {remainingStops > 0 && (
          <div className="w-full flex justify-center pt-2">
            <Key
              type="button"
              onClick={() => setVisibleNearestCount((prev) => prev + 20)}
              className="w-full justify-center text-center font-semibold text-[13.5px] sm:text-[14px]"
            >
              <span>Mostrar mais paradas ({remainingStops} restantes)</span>
            </Key>
          </div>
        )}
      </div>
    );
  }

  // 4. VISUALIZAÇÃO PADRÃO AGRUPADA POR LINHAS (SEM GPS OU BUSCA POR COORDENADAS)
  const filteredLinhas = linhas.filter((linha) => {
    if (selectedBairroId && linha.id !== selectedBairroId) {
      return false;
    }

    if (!searchQuery.trim()) return true;

    const matchLinha =
      matchesFuzzyQuery(linha.bairro, searchQuery) ||
      matchesFuzzyQuery(linha.nomeExibicao, searchQuery) ||
      matchesFuzzyQuery(linha.codigo, searchQuery);

    const matchPontos = linha.pontos.some((p) =>
      matchesFuzzyQuery(p.nome, searchQuery) ||
      (p.rua ? matchesFuzzyQuery(p.rua, searchQuery) : false) ||
      (p.referencia ? matchesFuzzyQuery(p.referencia, searchQuery) : false) ||
      (p.bairro ? matchesFuzzyQuery(p.bairro, searchQuery) : false)
    );

    return matchLinha || matchPontos;
  });

  if (filteredLinhas.length === 0) {
    return (
      <div className="surface-card w-full p-6 flex flex-col items-center justify-center text-center gap-3">
        <h3 className="text-[16px] font-bold text-ink">Nenhum horário encontrado</h3>
        <p className="text-[13.5px] text-ink-muted max-w-[280px]">
          Não encontramos linhas ou pontos correspondentes aos filtros aplicados.
        </p>
        {onClearFilter && (
          <button
            type="button"
            onClick={onClearFilter}
            className="text-[13px] font-medium text-coral hover:underline pt-1 cursor-pointer"
          >
            Limpar filtros e ver todas as linhas
          </button>
        )}
      </div>
    );
  }

  const hasFilterOrSearch = Boolean(selectedBairroId) || Boolean(searchQuery.trim()) || isRouteMode;
  const linhasParaExibir = hasFilterOrSearch
    ? filteredLinhas
    : filteredLinhas.slice(0, visibleLinesCount);
  const remainingLines = filteredLinhas.length - linhasParaExibir.length;

  return (
    <div className="flex flex-col gap-6 w-full select-text pb-12">

      {linhasParaExibir.map((linha) => {
        const pontosExibidos = linha.pontos.filter((ponto) => {
          if (!searchQuery.trim()) return true;
          if (
            matchesFuzzyQuery(linha.bairro, searchQuery) ||
            matchesFuzzyQuery(linha.nomeExibicao, searchQuery) ||
            matchesFuzzyQuery(linha.codigo, searchQuery)
          ) {
            return true;
          }
          return (
            matchesFuzzyQuery(ponto.nome, searchQuery) ||
            (ponto.rua ? matchesFuzzyQuery(ponto.rua, searchQuery) : false) ||
            (ponto.referencia ? matchesFuzzyQuery(ponto.referencia, searchQuery) : false) ||
            (ponto.bairro ? matchesFuzzyQuery(ponto.bairro, searchQuery) : false)
          );
        });

        return (
          <article
            key={linha.id}
            id={`linha-${linha.id}`}
            aria-label={`Horários da ${linha.nomeExibicao}`}
            className="flex flex-col gap-3.5 w-full"
          >
            {/* Cabeçalho da Linha */}
            <div className="flex items-center justify-between gap-2 px-1 border-b border-rule/30 pb-2">
              <h2 className="text-[15px] font-bold text-ink tracking-tight">
                {linha.nomeExibicao}
              </h2>
              <span className="text-[12px] uppercase tracking-wider font-semibold text-ink-muted">
                {linha.tipo === "interbairros" ? "Interbairros" : "Urbano"}
              </span>
            </div>

            {/* Lista Contínua de Pontos de Parada */}
            <div className="flex flex-col gap-3 w-full">
              {pontosExibidos.map((ponto, index) => {
                const isSelectedByFilter = selectedPontoId === ponto.id;
                const isSelectedOrigin =
                  selectedOriginPonto?.ponto.id === ponto.id &&
                  selectedOriginPonto?.linha.id === linha.id;
                const isSelectedDest =
                  selectedDestinationPonto?.ponto.id === ponto.id &&
                  selectedDestinationPonto?.linha.id === linha.id;

                const distanceMeters =
                  userCoords && ponto.latitude && ponto.longitude
                    ? calculateDistanceMeters(
                        userCoords.lat,
                        userCoords.lon,
                        ponto.latitude,
                        ponto.longitude
                      )
                    : null;

                const destArrivalTime =
                  isSelectedDest && selectedOriginPonto
                    ? getEstimatedArrival(
                        selectedOriginPonto.ponto,
                        ponto,
                        getClosestDeparture(selectedOriginPonto.ponto.horariosUteis).closest,
                        Math.max(1, Math.abs(ponto.ordem - selectedOriginPonto.ponto.ordem))
                      )
                    : null;

                const cardKey = `main-${linha.id}-${ponto.id}-${index}`;
                const isExpanded = Boolean(expandedCards[cardKey]);
                const isOriginStop = selectedOriginPonto?.ponto.id === ponto.id;
                const isOriginDisabledInDestStep = isSelectingDestination && isOriginStop;

                const handleCardClick = () => {
                  if (isSelectingOrigin && onSelectOrigin) {
                    onSelectOrigin(ponto, linha, distanceMeters);
                  } else if (isSelectingDestination && onSelectDestination) {
                    if (isOriginStop) return;
                    onSelectDestination(ponto, linha, distanceMeters);
                  } else {
                    toggleCardExpanded(cardKey);
                  }
                };

                return (
                  <div
                    key={`${linha.id}-${ponto.id}-${index}`}
                    id={`ponto-${linha.codigo}-${ponto.id}`}
                    ref={isSelectedByFilter ? selectedPontoRef : null}
                    onClick={handleCardClick}
                    title={
                      isOriginDisabledInDestStep
                        ? "Parada selecionada como local de embarque. Escolha outro destino."
                        : undefined
                    }
                    className={`surface-card w-full p-4 flex flex-col gap-3 transition-all duration-200 ${
                      isOriginDisabledInDestStep
                        ? "opacity-50 cursor-not-allowed border border-coral/40"
                        : isRouteMode
                        ? "cursor-pointer hover:border-coral/50 active:scale-[0.99]"
                        : "cursor-pointer active:scale-[0.995]"
                    } ${
                      isSelectedOrigin
                        ? "border border-coral/60 shadow-raised-sm"
                        : isSelectedDest
                        ? "border border-emerald-500/60 shadow-raised-sm"
                        : isSelectedByFilter
                        ? "border border-coral/60 shadow-raised-sm brightness-[1.02]"
                        : ""
                    }`}
                  >
                    {/* Linha, Distância e Mapa */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-semibold text-ink-muted truncate">
                        {linha.nomeExibicao}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {distanceMeters !== null && (
                          <span
                            className="px-2.5 py-0.5 rounded-full bg-coral/10 text-coral text-[12px] font-bold tracking-tight"
                            title={`Distância aproximada: ${distanceMeters} metros`}
                          >
                            a {formatDistance(distanceMeters)}
                          </span>
                        )}

                        <a
                          href={getGoogleMapsUrl(ponto, linha.bairro)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Ver localização de ${ponto.nome} no Google Maps`}
                          title="Ver localização no Google Maps"
                          className="px-2.5 py-1 rounded-md border border-rule/40 hover:border-coral/50 bg-canvas hover:bg-coral/10 text-ink-body hover:text-coral transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs active:scale-95 text-[12px] font-semibold"
                        >
                          <MapPin className="w-3.5 h-3.5 text-coral" />
                          <span>Mapa</span>
                        </a>
                      </div>
                    </div>

                    {/* Nome do Ponto (sem # antes) */}
                    <div className="min-w-0 w-full">
                      <h3
                        className="text-[14.5px] sm:text-[15px] font-bold text-ink tracking-tight break-words leading-snug"
                        title={formatStopDisplayName(ponto, linha.bairro)}
                      >
                        {formatStopDisplayName(ponto, linha.bairro)}
                      </h3>
                    </div>

                    {/* Horários */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCardExpanded(cardKey);
                      }}
                    >
                      {renderHorariosSection(ponto, null, "coral", undefined, isExpanded)}
                    </div>

                    {/* Badges de Embarque ou Destino alinhadas à esquerda abaixo dos horários */}
                    {(isSelectedOrigin || isSelectedDest) && (
                      <div className="pt-1 flex items-center justify-start gap-2">
                        {isSelectedOrigin && (
                          <span className="px-2.5 py-0.5 rounded-md bg-coral text-white text-[12px] font-bold shadow-xs">
                            Embarque
                          </span>
                        )}
                        {isSelectedDest && (
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-[12px] font-bold shadow-xs">
                              Desembarque
                            </span>
                            {destArrivalTime && (
                              <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                                Chegada prevista: <strong>{destArrivalTime}</strong>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}

      {/* Botão de Carga Progressiva de Linhas */}
      {!hasFilterOrSearch && remainingLines > 0 && (
        <div className="w-full flex justify-center pt-2">
          <Key
            type="button"
            onClick={() => setVisibleLinesCount((prev) => prev + 5)}
            className="w-full justify-center text-center font-semibold text-[13.5px] sm:text-[14px]"
          >
            <span>Mostrar mais linhas ({remainingLines} restantes)</span>
          </Key>
        </div>
      )}
    </div>
  );
};
