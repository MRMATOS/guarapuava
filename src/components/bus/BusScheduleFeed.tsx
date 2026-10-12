"use client";

import React, { useEffect, useRef } from "react";
import type { LinhaBairro, PontoItinerario } from "@/types/bus";

interface BusScheduleFeedProps {
  linhas: LinhaBairro[];
  selectedBairroId?: string | null;
  selectedPontoId?: string | null;
  searchQuery?: string;
  onClearFilter?: () => void;
}

export const BusScheduleFeed: React.FC<BusScheduleFeedProps> = ({
  linhas,
  selectedBairroId,
  selectedPontoId,
  searchQuery = "",
  onClearFilter,
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
      p.nome.toLowerCase().includes(query)
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
    <div className="flex flex-col gap-6 w-full select-text">
      {filteredLinhas.map((linha) => {
        // Se houver busca por ponto, filtra apenas os pontos relevantes se a linha não der match direto
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
          return ponto.nome.toLowerCase().includes(query);
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
                const isSelected = selectedPontoId === ponto.id;

                return (
                  <div
                    key={`${linha.id}-${ponto.id}-${index}`}
                    id={`ponto-${linha.codigo}-${ponto.id}`}
                    ref={isSelected ? selectedPontoRef : null}
                    className={`surface-card w-full p-4 flex flex-col gap-3 transition-all duration-200 ${
                      isSelected
                        ? "ring-2 ring-coral/40 shadow-md brightness-[1.02]"
                        : ""
                    }`}
                  >
                    {/* Cabeçalho do Ponto */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-rule/30 text-[10px] font-bold text-ink-muted flex items-center justify-center shrink-0">
                          {String(ponto.ordem).padStart(2, "0")}
                        </span>
                        <h3 className="text-[15px] font-semibold text-ink tracking-tight">
                          {ponto.nome}
                        </h3>
                      </div>
                      {isSelected && (
                        <span className="badge-inset text-[10.5px] font-semibold text-coral px-2 py-0.5">
                          Selecionado
                        </span>
                      )}
                    </div>

                    {/* Horários: Dias Úteis */}
                    {ponto.horariosUteis.length > 0 && (
                      <div className="flex flex-col gap-1.5 pt-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                          Dias Úteis
                        </span>
                        <div className="grid grid-cols-5 min-[370px]:grid-cols-6 gap-1.5 w-full">
                          {ponto.horariosUteis.map((hora, hIdx) => (
                            <span
                              key={`u-${hIdx}`}
                              className="badge-inset w-full text-[12px] font-mono font-medium py-1 px-0.5 justify-center text-center text-ink-body"
                            >
                              {hora}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Horários: Sábados */}
                    {ponto.horariosSabado.length > 0 && (
                      <div className="flex flex-col gap-1.5 pt-1 border-t border-rule/20">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                          Sábados
                        </span>
                        <div className="grid grid-cols-5 min-[370px]:grid-cols-6 gap-1.5 w-full">
                          {ponto.horariosSabado.map((hora, hIdx) => (
                            <span
                              key={`s-${hIdx}`}
                              className="badge-inset w-full text-[12px] font-mono font-medium py-1 px-0.5 justify-center text-center text-ink-body"
                            >
                              {hora}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Horários: Domingos e Feriados */}
                    {ponto.horariosDomingo.length > 0 && (
                      <div className="flex flex-col gap-1.5 pt-1 border-t border-rule/20">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                          Domingos e Feriados
                        </span>
                        <div className="grid grid-cols-5 min-[370px]:grid-cols-6 gap-1.5 w-full">
                          {ponto.horariosDomingo.map((hora, hIdx) => (
                            <span
                              key={`d-${hIdx}`}
                              className="badge-inset w-full text-[12px] font-mono font-medium py-1 px-0.5 justify-center text-center text-ink-body"
                            >
                              {hora}
                            </span>
                          ))}
                        </div>
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
