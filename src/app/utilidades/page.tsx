"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dock } from "@/components/ui/Dock";
import { Key } from "@/components/ui/Key";
import { OptionsPanel } from "@/components/ui/OptionsPanel";
import { Presence } from "@/components/ui/Presence";
import { InfoFeed } from "@/components/InfoFeed";

export default function UtilidadesPage() {
  const router = useRouter();
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);

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
          <Dock align="between" aria-label="Navegação de retorno">
            <div className="grid grid-cols-1 w-full">
              <Key
                type="button"
                onClick={() => setIsInfoOpen(false)}
                className="w-full px-2 text-[14px] justify-center text-center"
              >
                Voltar às Utilidades
              </Key>
            </div>
          </Dock>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-6 px-4 select-text">
      <div className="w-full max-w-[430px] flex flex-col gap-5 pb-28">
        {/* Cabeçalho */}
        <header className="flex flex-col gap-1.5 px-1 pt-2">
          <div className="flex items-center justify-between">
            <h1 className="text-[20px] font-bold text-ink tracking-tight">
              Utilidades
            </h1>
            <span className="badge-inset text-[11px] px-2.5 py-0.5">
              Serviços Locais
            </span>
          </div>
          <p className="text-[14px] text-ink-muted leading-relaxed">
            Ferramentas práticas e informações essenciais do dia a dia de Guarapuava.
          </p>
        </header>

        {/* Grade de Cartões */}
        <div className="flex flex-col gap-3.5">
          {/* Card 1: Horários de Ônibus */}
          <button
            type="button"
            onClick={() => router.push("/utilidades/onibus")}
            className="surface-card w-full p-5 text-left flex flex-col gap-2.5 group transition-all duration-150 cursor-pointer active:scale-[0.99] hover:brightness-[1.01]"
            aria-label="Abrir Horários de Ônibus"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[17px] font-bold text-ink group-hover:text-coral transition-colors tracking-tight">
                Horários de Ônibus
              </h2>
              <span className="badge-inset text-[11px] px-2 py-0.5 font-semibold text-coral">
                45 Linhas
              </span>
            </div>

            <p className="text-[13.5px] text-ink-body leading-relaxed">
              Consulte linhas urbanas e interbairros, horários de saída e pontos de passagem em cada bairro de Guarapuava.
            </p>

            <div className="flex items-center gap-2 pt-1 border-t border-rule/30 text-[12px] text-ink-muted font-medium">
              <span>Pérola do Oeste</span>
              <span>•</span>
              <span>Itinerários por parada</span>
            </div>
          </button>
        </div>
      </div>

      {/* Dock Fixo */}
      <Dock
        align="between"
        above={
          <div className="w-full">
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
        }
        aria-label="Navegação de utilidades"
      >
        <div className="grid grid-cols-2 w-full gap-2">
          {/* 1. Botão Voltar */}
          <Key
            type="button"
            onClick={() => router.push("/")}
            className="w-full px-2 text-[14px] justify-center text-center font-medium"
            aria-label="Voltar para a página inicial"
          >
            Voltar
          </Key>

          {/* 2. Botão Mais */}
          <Key
            ref={optionsButtonRef}
            type="button"
            pressed={isOptionsOpen}
            onClick={() => setIsOptionsOpen((prev) => !prev)}
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
