"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dock } from "@/components/ui/Dock";
import { Key } from "@/components/ui/Key";
import { OptionsPanel } from "@/components/ui/OptionsPanel";
import { Presence } from "@/components/ui/Presence";
import { InfoFeed } from "@/components/InfoFeed";
import { BusScheduleFeed } from "@/components/bus/BusScheduleFeed";
import { BusFilterPanel } from "@/components/bus/BusFilterPanel";
import rawBusData from "@/data/horarios-onibus.json";
import type { DadosHorariosOnibus, LinhaBairro } from "@/types/bus";

const busData = rawBusData as unknown as DadosHorariosOnibus;

export default function HorariosOnibusPage() {
  const router = useRouter();

  // Estados de Filtros e Busca
  const [selectedBairroId, setSelectedBairroId] = useState<string | null>(null);
  const [selectedPontoId, setSelectedPontoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Estados de Painéis Táteis
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const handleToggleFilter = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    if (isFilterOpen) {
      setIsFilterOpen(false);
      return;
    }

    if (isOptionsOpen) {
      setIsOptionsOpen(false);
      transitionTimerRef.current = setTimeout(() => {
        setIsFilterOpen(true);
        transitionTimerRef.current = null;
      }, 200);
    } else {
      setIsFilterOpen(true);
    }
  };

  const handleToggleOptions = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    if (isOptionsOpen) {
      setIsOptionsOpen(false);
      return;
    }

    if (isFilterOpen) {
      setIsFilterOpen(false);
      transitionTimerRef.current = setTimeout(() => {
        setIsOptionsOpen(true);
        transitionTimerRef.current = null;
      }, 200);
    } else {
      setIsOptionsOpen(true);
    }
  };

  const handleSelectBairro = (bairroId: string | null) => {
    setSelectedBairroId(bairroId);
    setSelectedPontoId(null);
  };

  const handleSelectPonto = (bairroId: string, pontoId: string | null) => {
    setSelectedBairroId(bairroId);
    setSelectedPontoId(pontoId);
    setIsFilterOpen(false);
  };

  const handleClearFilters = () => {
    setSelectedBairroId(null);
    setSelectedPontoId(null);
    setSearchQuery("");
  };

  // Se o usuário abriu Informações
  if (isInfoOpen) {
    return (
      <div className="w-full flex justify-center py-6 px-4 select-text">
        <div className="w-full max-w-[430px]">
          <InfoFeed
            hideNav={true}
            onSelectNoticias={() => {
              setIsInfoOpen(false);
              router.push("/");
            }}
            onSelectVagas={() => {
              setIsInfoOpen(false);
              router.push("/#vagas");
            }}
          />
          <Dock standalone={true} align="between" aria-label="Navegação de retorno">
            <div className="grid grid-cols-1 w-full">
              <Key
                type="button"
                onClick={() => setIsInfoOpen(false)}
                className="w-full px-2 text-[14px] justify-center text-center font-medium"
              >
                Voltar aos Horários de Ônibus
              </Key>
            </div>
          </Dock>
        </div>
      </div>
    );
  }

  // Nome do Bairro ativo para exibição de tag de filtro
  const activeBairroObj = selectedBairroId
    ? busData.linhas.find((l) => l.id === selectedBairroId)
    : null;

  return (
    <div className="w-full flex justify-center py-6 px-4 select-text">
      <div className="w-full max-w-[430px] flex flex-col gap-5 pb-32">
        {/* Cabeçalho Fixo */}
        <header className="flex flex-col gap-1.5 px-1 pt-2">
          <div className="flex items-center justify-between">
            <h1 className="text-[20px] font-bold text-ink tracking-tight">
              Horários de Ônibus
            </h1>
            <span className="badge-inset text-[11px] px-2.5 py-0.5 font-bold text-ink">
              Guarapuava
            </span>
          </div>

          <p className="text-[13.5px] text-ink-muted leading-relaxed">
            Consulte os horários por ponto de referência e itinerário completo de cada linha.
          </p>

          {/* Tag de Filtro Ativo */}
          {(selectedBairroId || searchQuery) && (
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {activeBairroObj && (
                <span className="badge-inset text-[12px] font-semibold text-coral px-2.5 py-1 flex items-center gap-1.5">
                  <span>{activeBairroObj.bairro}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedBairroId(null)}
                    className="hover:opacity-75 cursor-pointer ml-0.5"
                    title="Remover filtro de bairro"
                  >
                    ×
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="badge-inset text-[12px] font-semibold text-coral px-2.5 py-1 flex items-center gap-1.5">
                  <span>Busca: "{searchQuery}"</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="hover:opacity-75 cursor-pointer ml-0.5"
                    title="Remover termo de busca"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-[12px] text-ink-muted hover:text-coral font-medium underline cursor-pointer ml-1"
              >
                Limpar todos
              </button>
            </div>
          )}
        </header>

        {/* Feed de Rolagem Contínua dos Horários */}
        <BusScheduleFeed
          linhas={busData.linhas}
          selectedBairroId={selectedBairroId}
          selectedPontoId={selectedPontoId}
          searchQuery={searchQuery}
          onClearFilter={handleClearFilters}
        />
      </div>

      {/* Dock do Ônibus com Suporte a Filtro e Opções */}
      <Dock
        standalone={true}
        align="between"
        above={
          <div className="grid grid-cols-1 grid-rows-1 items-end w-full [grid-template-areas:'stack']">
            {/* Bloco de Filtros */}
            <div className="w-full [grid-area:stack]">
              <Presence isVisible={isFilterOpen} duration={180}>
                <BusFilterPanel
                  linhas={busData.linhas}
                  selectedBairroId={selectedBairroId}
                  selectedPontoId={selectedPontoId}
                  searchQuery={searchQuery}
                  onSelectBairro={handleSelectBairro}
                  onSelectPonto={handleSelectPonto}
                  onSearchChange={(q) => setSearchQuery(q)}
                  onClose={() => setIsFilterOpen(false)}
                  filterButtonRef={filterButtonRef}
                />
              </Presence>
            </div>

            {/* Bloco de Opções */}
            <div className="w-full [grid-area:stack]">
              <Presence isVisible={isOptionsOpen} duration={180}>
                <OptionsPanel
                  onClose={() => setIsOptionsOpen(false)}
                  onSelectInfo={() => {
                    setIsOptionsOpen(false);
                    setIsInfoOpen(true);
                  }}
                  optionsButtonRef={optionsButtonRef}
                />
              </Presence>
            </div>
          </div>
        }
        aria-label="Navegação da tela de horários"
      >
        <div className="grid grid-cols-3 w-full gap-2">
          {/* 1. Botão Voltar */}
          <Key
            type="button"
            onClick={() => router.push("/utilidades")}
            className="w-full px-2 text-[14px] justify-center text-center font-medium"
            aria-label="Voltar para a página de utilidades"
          >
            Voltar
          </Key>

          {/* 2. Botão Filtrar */}
          <Key
            ref={filterButtonRef}
            type="button"
            pressed={isFilterOpen}
            onClick={handleToggleFilter}
            aria-expanded={isFilterOpen}
            className="w-full px-2 text-[14px] justify-center text-center font-medium"
            aria-label={isFilterOpen ? "Fechar filtros" : "Abrir filtros de bairros"}
          >
            Filtrar
          </Key>

          {/* 3. Botão Mais */}
          <Key
            ref={optionsButtonRef}
            type="button"
            pressed={isOptionsOpen}
            onClick={handleToggleOptions}
            aria-expanded={isOptionsOpen}
            className="w-full px-2 text-[14px] justify-center text-center font-medium"
            aria-label={isOptionsOpen ? "Fechar menu mais" : "Abrir menu mais"}
          >
            Mais
          </Key>
        </div>
      </Dock>
    </div>
  );
}
