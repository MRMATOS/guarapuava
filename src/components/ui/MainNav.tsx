"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Dock } from "./Dock";
import { Key } from "./Key";

export type Section = "noticias" | "vagas";

interface MainNavProps {
  active: Section;
  onNoticias: () => void;
  onVagas: () => void;
  onPesquisar?: () => void;
}

/**
 * Navegação principal do Painel de Rádio:
 * - À esquerda: 1. Tecla de Tema (ícone apenas) e 2. Pesquisar (textual).
 * - À direita: 3. Notícias (textual) e 4. Vagas (textual).
 * Dois botões de um lado e dois do outro.
 */
export const MainNav: React.FC<MainNavProps> = ({
  active,
  onNoticias,
  onVagas,
  onPesquisar,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && theme === "dark";

  return (
    <Dock align="between" aria-label="Navegação principal">
      {/* Grupo da esquerda: Tema e Pesquisar */}
      <div className="flex items-center gap-1.5 sm:gap-2">
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
        <Key
          onClick={onPesquisar}
          className="px-2.5 sm:px-4 text-[14.5px]"
        >
          Pesquisar
        </Key>
      </div>

      {/* Grupo da direita: Notícias e Vagas */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Key
          aria-current={active === "noticias" ? "page" : undefined}
          onClick={onNoticias}
          className="px-2.5 sm:px-4 text-[14.5px]"
        >
          Notícias
        </Key>
        <Key
          aria-current={active === "vagas" ? "page" : undefined}
          onClick={onVagas}
          className="px-2.5 sm:px-4 text-[14.5px]"
        >
          Vagas
        </Key>
      </div>
    </Dock>
  );
};
