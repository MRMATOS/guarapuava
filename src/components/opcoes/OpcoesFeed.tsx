"use client";

import React, { useState, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useHandedness } from "@/context/HandednessContext";
import { useTheme } from "@/context/ThemeContext";
import { Dock } from "@/components/ui/Dock";
import { Key } from "@/components/ui/Key";
import { OptionsPanel } from "@/components/ui/OptionsPanel";
import { Presence } from "@/components/ui/Presence";

export interface OpcoesFeedProps {
  onSelectNoticias?: () => void;
  onSelectVagas?: () => void;
  onSelectInfo?: () => void;
  hideNav?: boolean;
}

const emptySubscribe = () => () => {};

export const OpcoesFeed: React.FC<OpcoesFeedProps> = ({
  onSelectNoticias,
  onSelectVagas,
  onSelectInfo,
  hideNav = false,
}) => {
  const router = useRouter();
  const { isLeftHanded, toggleHandedness } = useHandedness();
  const { theme, toggleTheme } = useTheme();

  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isDark = mounted && theme === "dark";
  const themeCardTitle = isDark ? "Modo Claro" : "Modo Escuro";
  const handednessCardTitle = isLeftHanded ? "Modo Destro" : "Modo Canhoto";

  const handleOpenInfo = () => {
    if (onSelectInfo) {
      onSelectInfo();
    } else {
      router.push("/opcoes/informacoes");
    }
  };

  const handleGoNoticias = () => {
    if (onSelectNoticias) {
      onSelectNoticias();
    } else {
      router.push("/#noticias");
    }
  };

  const handleGoVagas = () => {
    if (onSelectVagas) {
      onSelectVagas();
    } else {
      router.push("/#vagas");
    }
  };

  return (
    <div className="page-shell">
      {/* Cabeçalho da Central de Opções (idêntico ao InfoFeed) */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h1 className="font-semibold text-ink text-[15px] tracking-tight">
          Opções
        </h1>
        <span className="badge-inset">
          Ajustes e acessibilidade
        </span>
      </div>

      {/* Lista de 3 Cards Clicáveis (Padrão 100% tátil, sem botões internos) */}
      <div className="flex flex-col gap-4">
          {/* Card 1: Alternador Destro / Canhoto */}
          <button
            type="button"
            onClick={toggleHandedness}
            className="surface-card w-full p-5 text-left flex flex-col gap-2.5 group transition-all duration-150 cursor-pointer active:scale-[0.99] hover:brightness-[1.01]"
            aria-label={`Alternar para ${handednessCardTitle}`}
          >
            <h2 className="text-[17px] font-bold text-ink group-hover:text-coral transition-colors tracking-tight">
              {handednessCardTitle}
            </h2>
            <p className="text-[13.5px] text-ink-body leading-relaxed">
              Alterne entre os modos destro e canhoto para que os botões fiquem ao alcance do seu conforto.
            </p>
          </button>

          {/* Card 2: Alternador Modo Claro / Escuro */}
          <button
            type="button"
            onClick={toggleTheme}
            className="surface-card w-full p-5 text-left flex flex-col gap-2.5 group transition-all duration-150 cursor-pointer active:scale-[0.99] hover:brightness-[1.01]"
            aria-label={`Alternar para ${themeCardTitle}`}
          >
            <h2 className="text-[17px] font-bold text-ink group-hover:text-coral transition-colors tracking-tight">
              {themeCardTitle}
            </h2>
            <p className="text-[13.5px] text-ink-body leading-relaxed">
              Alterne as cores do portal para descanso visual e economia de bateria.
            </p>
          </button>

          {/* Card 3: Informações */}
          <button
            type="button"
            onClick={handleOpenInfo}
            className="surface-card w-full p-5 text-left flex flex-col gap-2.5 group transition-all duration-150 cursor-pointer active:scale-[0.99] hover:brightness-[1.01]"
            aria-label="Abrir página de Informações"
          >
            <h2 className="text-[17px] font-bold text-ink group-hover:text-coral transition-colors tracking-tight">
              Informações
            </h2>
            <p className="text-[13.5px] text-ink-body leading-relaxed">
              Diretrizes editoriais, fontes públicas, transparência e termos de responsabilidade.
            </p>
          </button>
        </div>

      {/* Dock Inferior Mobile (Mais - Filtrar - Notícias - Vagas) */}
      {!hideNav && (
        <Dock
          align="between"
          above={
            <div className="w-full">
              <Presence isVisible={isOptionsOpen} duration={180}>
                <OptionsPanel
                  onClose={() => setIsOptionsOpen(false)}
                  onSelectOpcoes={() => setIsOptionsOpen(false)}
                  optionsButtonRef={optionsButtonRef}
                />
              </Presence>
            </div>
          }
          aria-label="Navegação da página de opções"
        >
          <div
            className={`grid grid-cols-4 w-full gap-1.5 sm:gap-2 ${
              isLeftHanded ? "[direction:rtl] [&>*]:[direction:ltr]" : ""
            }`}
          >
            {/* 1. Botão Mais */}
            <Key
              ref={optionsButtonRef}
              type="button"
              pressed={isOptionsOpen}
              onClick={() => setIsOptionsOpen((prev) => !prev)}
              aria-expanded={isOptionsOpen}
              className="w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
              aria-label={isOptionsOpen ? "Fechar menu mais" : "Abrir menu mais"}
            >
              Mais
            </Key>

            {/* 2. Botão Filtrar (Desativado nesta tela) */}
            <Key
              type="button"
              disabled
              className="w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap opacity-35 cursor-not-allowed pointer-events-none"
              aria-label="Filtros indisponíveis nesta página"
            >
              Filtrar
            </Key>

            {/* 3. Botão Notícias */}
            <Key
              type="button"
              onClick={handleGoNoticias}
              className="w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
              aria-label="Ir para Notícias"
            >
              Notícias
            </Key>

            {/* 4. Botão Vagas */}
            <Key
              type="button"
              onClick={handleGoVagas}
              className="w-full px-1 sm:px-2 text-[13px] sm:text-[14px] justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap"
              aria-label="Ir para Vagas"
            >
              Vagas
            </Key>
          </div>
        </Dock>
      )}
    </div>
  );
};
