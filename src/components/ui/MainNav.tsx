"use client";

import React, { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Dock } from "./Dock";
import { Key } from "./Key";

export type Section = "noticias" | "vagas";

interface MainNavProps {
  active: Section;
  onNoticias: () => void;
  onVagas: () => void;
  isFilterOpen?: boolean;
  onToggleFilter?: () => void;
  above?: React.ReactNode;
  filterButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

const emptySubscribe = () => () => {};

/**
 * Navegação principal do Painel de Rádio:
 * - À esquerda: 1. Tecla de Tema (ícone apenas).
 * - À direita: 2. Filtrar, 3. Notícias e 4. Vagas (alinhados à direita).
 */
export const MainNav: React.FC<MainNavProps> = ({
  active,
  onNoticias,
  onVagas,
  isFilterOpen = false,
  onToggleFilter,
  above,
  filterButtonRef,
}) => {
  const { theme, toggleTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isDark = mounted && theme === "dark";

  return (
    <Dock align="between" above={above} aria-label="Navegação principal">
      {/* Grupo da esquerda: apenas o botão de alternar tema */}
      <div className="flex items-center">
        <Key
          variant="icon"
          onClick={toggleTheme}
          aria-label={isDark ? "Alternar para modo claro" : "Alternar para modo escuro"}
          title={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
        >
          {isDark ? (
            <Sun className="w-5 h-5" strokeWidth={2.2} />
          ) : (
            <Moon className="w-5 h-5" strokeWidth={2.2} />
          )}
        </Key>
      </div>

      {/* Grupo da direita: Filtrar, Notícias e Vagas */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Key
          ref={filterButtonRef}
          pressed={isFilterOpen}
          onClick={onToggleFilter}
          aria-expanded={isFilterOpen}
          aria-label={isFilterOpen ? "Fechar bloco de filtros" : "Abrir bloco de filtros"}
          className="px-2.5 sm:px-3.5 text-[14px]"
        >
          Filtrar
        </Key>
        <Key
          aria-current={active === "noticias" ? "page" : undefined}
          onClick={onNoticias}
          className="px-2.5 sm:px-3.5 text-[14px]"
        >
          Notícias
        </Key>
        <Key
          aria-current={active === "vagas" ? "page" : undefined}
          onClick={onVagas}
          className="px-2.5 sm:px-3.5 text-[14px]"
        >
          Vagas
        </Key>
      </div>
    </Dock>
  );
};
