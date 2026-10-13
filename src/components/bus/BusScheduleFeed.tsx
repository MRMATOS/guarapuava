"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { MapPin, Navigation, ArrowRight, Clock, CheckCircle2, ChevronDown } from "lucide-react";
import type { LinhaBairro, PontoItinerario } from "@/types/bus";
import { calculateDistanceMeters, formatDistance } from "@/lib/geo/distance";

function getGoogleMapsUrl(ponto: PontoItinerario): string {
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

export interface BusScheduleFeedProps {
  linhas: LinhaBairro[];
  selectedBairroId?: string | null;
  selectedPontoId?: string | null;
  searchQuery?: string;
  onClearFilter?: () => void;
  // Propriedades do Planejador de Rotas
  routeStep?: "none" | "origin" | "destination" | "calculated";
  selectedOriginPonto?: { ponto: PontoItinerario; linha: LinhaBairro } | null;
  selectedDestinationPonto?: { ponto: PontoItinerario; linha: LinhaBairro } | null;
  userCoords?: { lat: number; lon: number } | null;
  onSelectOrigin?: (ponto: PontoItinerario, linha: LinhaBairro) => void;
  onSelectDestination?: (ponto: PontoItinerario, linha: LinhaBairro) => void;
  onResetRoute?: () => void;
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
  onSelectOrigin,
  onSelectDestination,
  onResetRoute,
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

  // Se a rota estiver calculada, traça o itinerário entre a origem e o destino
  const routeJourney = useMemo(() => {
    if (!isCalculatedRoute || !selectedOriginPonto || !selectedDestinationPonto) {
      return null;
    }

    const origPontoId = selectedOriginPonto.ponto.id;
    const destPontoId = selectedDestinationPonto.ponto.id;

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
      };
    }

    // Fallback: exibe origem e destino das linhas selecionadas
    return {
      linha: selectedOriginPonto.linha,
      origem: selectedOriginPonto.ponto,
      intermediarias: [],
      destino: selectedDestinationPonto.ponto,
    };
  }, [isCalculatedRoute, selectedOriginPonto, selectedDestinationPonto, linhas]);

  // Se estiver calculada a rota, renderiza a visualização da viagem completa
  if (isCalculatedRoute && routeJourney) {
    const { closest: proximoHorario } = getClosestDeparture(
      routeJourney.origem.horariosUteis
    );

    return (
      <div className="flex flex-col gap-4 w-full select-text animate-fade-in pb-12">
        {/* Banner do Itinerário da Rota */}
        <div className="surface-card w-full p-4 flex flex-col gap-2.5 border-l-4 border-l-coral bg-coral/5">
          <div className="flex items-center justify-between gap-2">
            <span className="badge-inset text-[11px] font-bold px-2 py-0.5 text-ink">
              {routeJourney.linha.codigo}
            </span>
            <span className="text-[12px] font-bold text-coral flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              Rota Traçada
            </span>
          </div>
          <h2 className="text-[17px] font-bold text-ink">
            {routeJourney.linha.nomeExibicao}
          </h2>
          <p className="text-[12.5px] text-ink-muted">
            {routeJourney.intermediarias.length + 2} paradas no percurso.
          </p>
        </div>

        {/* 1. CARD DE PARTIDA (DESTAQUE MÁXIMO) */}
        <div className="surface-card w-full p-4.5 flex flex-col gap-3.5 border-2 border-coral/80 shadow-md ring-2 ring-coral/20">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-coral uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Ponto de Partida
            </span>
            <a
              href={getGoogleMapsUrl(routeJourney.origem)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-md border border-coral/40 bg-coral/10 hover:bg-coral/20 text-coral text-[11.5px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <MapPin className="w-3 h-3" />
              <span>Ver no Maps</span>
            </a>
          </div>

          <div>
            <h3 className="text-[17px] font-bold text-ink tracking-tight">
              {routeJourney.origem.nome}
            </h3>
            {routeJourney.origem.rua && (
              <p className="text-[13px] text-ink-muted mt-0.5">
                {routeJourney.origem.rua}
                {routeJourney.origem.numero ? `, ${routeJourney.origem.numero}` : ""}
                {routeJourney.origem.referencia ? ` (${routeJourney.origem.referencia})` : ""}
                {routeJourney.origem.bairro ? ` • ${routeJourney.origem.bairro}` : ""}
              </p>
            )}
            {routeJourney.origem.cep && (
              <span className="text-[11px] text-ink-muted/80 font-mono">
                CEP: {routeJourney.origem.cep}
              </span>
            )}
          </div>

          {/* Destaque do Horário Mais Próximo da Partida */}
          <div className="bg-canvas/70 rounded-xl p-3 border border-rule/40 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-ink flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-coral" />
                Próxima Saída Estimada
              </span>
              {proximoHorario && (
                <span className="px-2.5 py-0.5 rounded-full bg-coral text-white font-mono font-bold text-[13px] animate-pulse">
                  {proximoHorario}
                </span>
              )}
            </div>

            {routeJourney.origem.horariosUteis.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {routeJourney.origem.horariosUteis.map((h, i) => {
                  const isCurrent = h === proximoHorario;
                  return (
                    <span
                      key={i}
                      className={`font-mono text-[11.5px] px-2 py-0.5 rounded-md ${
                        isCurrent
                          ? "bg-coral text-white font-bold ring-2 ring-coral/40"
                          : "bg-surface-inset text-ink border border-rule/30"
                      }`}
                    >
                      {h}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 2. PARADAS INTERMEDIÁRIAS (TIMELINE SUTIL) */}
        {routeJourney.intermediarias.length > 0 && (
          <div className="w-full pl-3 pr-1 py-1 flex flex-col gap-0 border-l-2 border-dashed border-rule/70 ml-4">
            <div className="text-[11.5px] font-semibold text-ink-muted uppercase tracking-wider py-1 pl-3">
              {routeJourney.intermediarias.length} Paradas pelo caminho
            </div>
            {routeJourney.intermediarias.map((p, idx) => (
              <div
                key={p.id}
                className="relative pl-6 py-2 flex items-center justify-between group"
              >
                {/* Marcador na linha do tempo */}
                <span className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-rule border-2 border-canvas group-hover:bg-coral transition-colors" />

                <div className="min-w-0 pr-2">
                  <span className="text-[13px] font-medium text-ink-body truncate block">
                    {p.nome}
                  </span>
                  {p.rua && (
                    <span className="text-[11px] text-ink-muted truncate block">
                      {p.rua}
                    </span>
                  )}
                </div>

                <a
                  href={getGoogleMapsUrl(p)}
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
        <div className="surface-card w-full p-4.5 flex flex-col gap-3 border-2 border-emerald-500/60 shadow-md bg-emerald-500/5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Ponto de Destino
            </span>
            <a
              href={getGoogleMapsUrl(routeJourney.destino)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11.5px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <MapPin className="w-3 h-3" />
              <span>Ver no Maps</span>
            </a>
          </div>

          <div>
            <h3 className="text-[17px] font-bold text-ink tracking-tight">
              {routeJourney.destino.nome}
            </h3>
            {routeJourney.destino.rua && (
              <p className="text-[13px] text-ink-muted mt-0.5">
                {routeJourney.destino.rua}
                {routeJourney.destino.numero ? `, ${routeJourney.destino.numero}` : ""}
                {routeJourney.destino.referencia ? ` (${routeJourney.destino.referencia})` : ""}
                {routeJourney.destino.bairro ? ` • ${routeJourney.destino.bairro}` : ""}
              </p>
            )}
            {routeJourney.destino.cep && (
              <span className="text-[11px] text-ink-muted/80 font-mono">
                CEP: {routeJourney.destino.cep}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Filtra as linhas conforme busca e seleção
  const filteredLinhas = linhas.filter((linha) => {
    if (selectedBairroId && linha.id !== selectedBairroId) {
      return false;
    }

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    const matchLinha =
      linha.bairro.toLowerCase().includes(query) ||
      linha.nomeExibicao.toLowerCase().includes(query) ||
      linha.codigo.includes(query);

    const matchPontos = linha.pontos.some((p) =>
      p.nome.toLowerCase().includes(query) ||
      p.rua?.toLowerCase().includes(query) ||
      p.referencia?.toLowerCase().includes(query) ||
      p.bairro?.toLowerCase().includes(query)
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

  return (
    <div className="flex flex-col gap-6 w-full select-text pb-12">
      {/* Se estiver escolhendo o Destino: Card da Partida fixo no Topo */}
      {isSelectingDestination && selectedOriginPonto && (
        <div className="sticky top-2 z-20 surface-card w-full p-3.5 border-2 border-coral bg-coral/10 shadow-raised-md flex flex-col gap-1.5 animate-scale-in backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-coral uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Ponto de Partida Fixo
            </span>
            <span className="badge-inset text-[10.5px] font-mono font-bold px-2 py-0.5 text-ink">
              Linha {selectedOriginPonto.linha.codigo}
            </span>
          </div>
          <h3 className="text-[15px] font-bold text-ink truncate">
            {selectedOriginPonto.ponto.nome}
          </h3>
          {selectedOriginPonto.ponto.rua && (
            <p className="text-[12px] text-ink-muted truncate">
              {selectedOriginPonto.ponto.rua}
              {selectedOriginPonto.ponto.bairro ? ` • ${selectedOriginPonto.ponto.bairro}` : ""}
            </p>
          )}
        </div>
      )}

      {/* Banner de Instrução em Modo Rota */}
      {isRouteMode && !isCalculatedRoute && (
        <div className="surface-card w-full px-3.5 py-2.5 border-l-4 border-l-coral bg-canvas flex items-center justify-between text-[12.5px] text-ink-muted">
          <span>
            {isSelectingOrigin
              ? "Toque em um card para selecionar a parada de partida"
              : "Toque em um card para selecionar a parada de destino"}
          </span>
          <span className="text-coral font-bold text-[11px] uppercase tracking-wider">
            {isSelectingOrigin ? "Passo 1 de 2" : "Passo 2 de 2"}
          </span>
        </div>
      )}

      {filteredLinhas.map((linha) => {
        const query = searchQuery.toLowerCase().trim();
        const pontosExibidos = linha.pontos.filter((ponto) => {
          if (!query) return true;
          if (
            linha.bairro.toLowerCase().includes(query) ||
            linha.nomeExibicao.toLowerCase().includes(query) ||
            linha.codigo.includes(query)
          ) {
            return true;
          }
          return (
            ponto.nome.toLowerCase().includes(query) ||
            ponto.rua?.toLowerCase().includes(query) ||
            ponto.referencia?.toLowerCase().includes(query) ||
            ponto.bairro?.toLowerCase().includes(query)
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
              <div className="flex items-center gap-2">
                <span className="badge-inset text-[11px] font-bold px-2 py-0.5 text-ink">
                  {linha.codigo}
                </span>
                <h2 className="text-[17px] font-bold text-ink tracking-tight">
                  {linha.nomeExibicao}
                </h2>
              </div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted">
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

                // Distância até o usuário se houver GPS
                const distanceMeters =
                  userCoords && ponto.latitude && ponto.longitude
                    ? calculateDistanceMeters(
                        userCoords.lat,
                        userCoords.lon,
                        ponto.latitude,
                        ponto.longitude
                      )
                    : null;

                const handleCardClick = () => {
                  if (isSelectingOrigin && onSelectOrigin) {
                    onSelectOrigin(ponto, linha);
                  } else if (isSelectingDestination && onSelectDestination) {
                    onSelectDestination(ponto, linha);
                  }
                };

                return (
                  <div
                    key={`${linha.id}-${ponto.id}-${index}`}
                    id={`ponto-${linha.codigo}-${ponto.id}`}
                    ref={isSelectedByFilter ? selectedPontoRef : null}
                    onClick={isRouteMode ? handleCardClick : undefined}
                    className={`surface-card w-full p-4 flex flex-col gap-3 transition-all duration-200 ${
                      isRouteMode ? "cursor-pointer hover:border-coral/50 active:scale-[0.99]" : ""
                    } ${
                      isSelectedOrigin
                        ? "border-2 border-coral shadow-md bg-coral/5 ring-2 ring-coral/30"
                        : isSelectedDest
                        ? "border-2 border-emerald-500 shadow-md bg-emerald-500/5 ring-2 ring-emerald-500/30"
                        : isSelectedByFilter
                        ? "ring-2 ring-coral/40 shadow-md brightness-[1.02]"
                        : ""
                    }`}
                  >
                    {/* Cabeçalho do Ponto */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-rule/30 text-[10px] font-bold text-ink-muted flex items-center justify-center shrink-0">
                          {String(ponto.ordem).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <h3
                            className="text-[15px] font-semibold text-ink tracking-tight truncate"
                            title={ponto.nome}
                          >
                            {ponto.nome}
                          </h3>
                          {ponto.rua && (
                            <p className="text-[11.5px] text-ink-muted truncate">
                              {ponto.rua}
                              {ponto.numero ? `, ${ponto.numero}` : ""}
                              {ponto.bairro ? ` • ${ponto.bairro}` : ""}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Distância ao usuário (se disponível) */}
                        {distanceMeters !== null && (
                          <span
                            className="px-2 py-0.5 rounded-full bg-coral/10 text-coral text-[11px] font-bold tracking-tight"
                            title={`Distância aproximada: ${distanceMeters} metros`}
                          >
                            a {formatDistance(distanceMeters)}
                          </span>
                        )}

                        {/* Badges de Seleção em Modo Rota */}
                        {isSelectedOrigin && (
                          <span className="px-2 py-0.5 rounded-md bg-coral text-white text-[11px] font-bold shadow-xs">
                            Partida
                          </span>
                        )}
                        {isSelectedDest && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold shadow-xs">
                            Destino
                          </span>
                        )}

                        {/* Botão de Localização Google Maps */}
                        <a
                          href={getGoogleMapsUrl(ponto)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Ver localização de ${ponto.nome} no Google Maps`}
                          title="Ver localização no Google Maps"
                          className="px-2 py-1 rounded-md border border-rule/30 hover:border-coral/50 bg-canvas/40 hover:bg-coral/10 text-ink-muted hover:text-coral transition-all duration-150 flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs active:scale-95 text-[11px] font-medium"
                        >
                          <MapPin className="w-3.5 h-3.5 text-coral" />
                          <span>Mapa</span>
                        </a>
                      </div>
                    </div>

                    {/* Horários: Dias Úteis */}
                    {ponto.horariosUteis.length > 0 && (
                      <div className="flex flex-col gap-1.5 pt-0.5">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-ink-muted/90 flex items-center gap-1">
                          Dias Úteis
                          <span className="text-[10px] font-normal text-ink-muted/70">
                            ({ponto.horariosUteis.length} saídas)
                          </span>
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {ponto.horariosUteis.map((horario, hIdx) => (
                            <span
                              key={hIdx}
                              className="font-mono text-[12px] px-2 py-0.5 rounded-md bg-surface-inset text-ink border border-rule/30 shadow-xs"
                            >
                              {horario}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Horários: Sábados */}
                    {ponto.horariosSabado.length > 0 && (
                      <div className="flex flex-col gap-1.5 pt-1 border-t border-rule/20">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-ink-muted/90 flex items-center gap-1">
                          Sábados
                          <span className="text-[10px] font-normal text-ink-muted/70">
                            ({ponto.horariosSabado.length} saídas)
                          </span>
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {ponto.horariosSabado.map((horario, hIdx) => (
                            <span
                              key={hIdx}
                              className="font-mono text-[12px] px-2 py-0.5 rounded-md bg-surface-inset text-ink border border-rule/30 shadow-xs"
                            >
                              {horario}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Horários: Domingos e Feriados */}
                    {ponto.horariosDomingo.length > 0 && (
                      <div className="flex flex-col gap-1.5 pt-1 border-t border-rule/20">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-ink-muted/90 flex items-center gap-1">
                          Domingos e Feriados
                          <span className="text-[10px] font-normal text-ink-muted/70">
                            ({ponto.horariosDomingo.length} saídas)
                          </span>
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {ponto.horariosDomingo.map((horario, hIdx) => (
                            <span
                              key={hIdx}
                              className="font-mono text-[12px] px-2 py-0.5 rounded-md bg-surface-inset text-ink border border-rule/30 shadow-xs"
                            >
                              {horario}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Caso sem horários específicos */}
                    {ponto.horariosUteis.length === 0 &&
                      ponto.horariosSabado.length === 0 &&
                      ponto.horariosDomingo.length === 0 && (
                        <div className="pt-0.5 text-[12px] text-ink-muted/80 italic flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-ink-muted/40 shrink-0" />
                          <span>Ponto de passagem do itinerário</span>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
};
