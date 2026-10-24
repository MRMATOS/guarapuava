"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Key } from "@/components/ui/Key";
import { useTheme } from "@/context/ThemeContext";
import { useHandedness } from "@/context/HandednessContext";
import { normalizeText } from "@/lib/utils/search";

interface CommandItem {
  id: string;
  title: string;
  hint: string;
  keywords: string[];
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { isLeftHanded, toggleHandedness } = useHandedness();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const isDark = theme === "dark";

  // Lista canônica de comandos do portal
  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      {
        id: "vagas",
        title: "Vagas de Emprego",
        hint: "Vagas",
        keywords: ["vagas", "emprego", "trabalho", "servico", "curriculo", "oportunidade"],
        action: () => router.push("/#vagas"),
      },
      {
        id: "noticias",
        title: "Notícias e Fatos",
        hint: "Notícias",
        keywords: ["noticias", "fatos", "diario", "resumo", "jornal", "acontecimentos"],
        action: () => router.push("/"),
      },
      {
        id: "onibus",
        title: "Horários de Ônibus",
        hint: "Linhas",
        keywords: ["onibus", "horarios", "linhas", "itinerario", "paradas", "rota"],
        action: () => router.push("/utilidades/onibus"),
      },
      {
        id: "descarte",
        title: "Descarte Correto",
        hint: "Resíduos",
        keywords: ["descarte", "reciclagem", "lixo", "entulho", "pneus", "oleo", "remedios"],
        action: () => router.push("/utilidades/descarte"),
      },
      {
        id: "cidade-viva",
        title: "Cidade Viva",
        hint: "Mapa",
        keywords: ["cidade viva", "mapa", "zeladoria", "buraco", "asfalto", "iluminacao", "relato"],
        action: () => router.push("/cidade-viva/mapa"),
      },
      {
        id: "opcoes",
        title: "Opções e Acessibilidade",
        hint: "Ajustes",
        keywords: ["opcoes", "acessibilidade", "ajustes", "configuracoes", "termos", "sobre"],
        action: () => router.push("/opcoes"),
      },
      {
        id: "tema",
        title: isDark ? "Alternar para Modo Claro" : "Alternar para Modo Escuro",
        hint: isDark ? "Claro" : "Escuro",
        keywords: ["tema", "escuro", "claro", "dark", "light", "cores", "modo"],
        action: () => toggleTheme(),
      },
    ];

    // O modo destro/canhoto só se aplica no mobile com o dock inferior
    if (!isDesktop) {
      list.push({
        id: "canhoto",
        title: isLeftHanded ? "Alternar para Modo Destro" : "Alternar para Modo Canhoto",
        hint: isLeftHanded ? "Destro" : "Canhoto",
        keywords: ["canhoto", "destro", "mao", "inverter", "botoes", "acessibilidade"],
        action: () => toggleHandedness(),
      });
    }

    return list;
  }, [router, isDark, isLeftHanded, toggleTheme, toggleHandedness, isDesktop]);

  // Filtra itens com busca tolerante
  const filteredCommands = useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) return commands;

    return commands.filter((cmd) => {
      const matchTitle = normalizeText(cmd.title).includes(q);
      const matchHint = normalizeText(cmd.hint).includes(q);
      const matchKeywords = cmd.keywords.some((k) => normalizeText(k).includes(q));
      return matchTitle || matchHint || matchKeywords;
    });
  }, [commands, query]);

  // Reseta seleção ao alterar a busca
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    if (previousActiveElement.current) {
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, []);

  const handleOpen = useCallback(() => {
    if (typeof document !== "undefined") {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
    }
    setQuery("");
    setSelectedIndex(0);
    setIsOpen(true);
  }, []);

  const handleExecute = useCallback(
    (item: CommandItem) => {
      handleClose();
      item.action();
    },
    [handleClose]
  );

  // Escuta global de teclado
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Abre com Ctrl+K ou Cmd+K
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (isOpen) {
          handleClose();
        } else {
          handleOpen();
        }
        return;
      }

      // Atalhos internos quando aberto
      if (isOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          handleClose();
          return;
        }

        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0
          );
          return;
        }

        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            filteredCommands.length > 0
              ? (prev - 1 + filteredCommands.length) % filteredCommands.length
              : 0
          );
          return;
        }

        if (e.key === "Enter") {
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            handleExecute(filteredCommands[selectedIndex]);
          }
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, handleOpen, handleClose, handleExecute]);

  // Rola suavemente para o item ativo
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const selectedEl = listRef.current.querySelector(
      `[data-cmd-index="${selectedIndex}"]`
    ) as HTMLElement | null;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, isOpen]);

  // Foco no input ao abrir
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos e navegação rápida"
        className="bg-canvas border border-rule/70 dark:border-white/10 rounded-3xl shadow-none relative w-full max-w-[430px] p-5 sm:p-6 flex flex-col gap-3.5 max-h-[85vh]"
      >
        {/* Cabeçalho no padrão canônico do Painel de Rádio */}
        <div className="flex items-center justify-between px-1 shrink-0">
          <h2 className="font-semibold text-ink text-[15px] tracking-tight">
            Atalhos
          </h2>
          <span className="badge-inset">
            ⌘K / Ctrl+K
          </span>
        </div>

        {/* Campo de Busca em baixo-relevo (filter-input) */}
        <div className="relative w-full shrink-0">
          <span
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
            aria-hidden="true"
          >
            <Search className="w-4 h-4" strokeWidth={2.2} />
          </span>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar..."
            aria-label="Pesquisar comando ou página"
            aria-autocomplete="list"
            aria-controls="command-palette-list"
            aria-activedescendant={
              filteredCommands[selectedIndex]
                ? `cmd-item-${filteredCommands[selectedIndex].id}`
                : undefined
            }
            className="filter-input w-full h-[42px] pl-10 pr-4 text-[16px] placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-coral/40 transition-shadow"
          />
        </div>

        {/* Lista de Teclas com respiro lateral e vertical para que as sombras neumórficas não sofram corte */}
        <div
          id="command-palette-list"
          ref={listRef}
          role="listbox"
          aria-label="Comandos disponíveis"
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2.5 min-h-0 -mx-2 px-2 py-2"
        >
          {filteredCommands.length > 0 ? (
            filteredCommands.map((item, idx) => {
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  id={`cmd-item-${item.id}`}
                  data-cmd-index={idx}
                  role="option"
                  aria-selected={isSelected}
                  className="w-full shrink-0"
                >
                  <Key
                    type="button"
                    pressed={isSelected}
                    onClick={() => handleExecute(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className="w-full px-4 text-[13.5px] sm:text-[14px] justify-between text-left"
                  >
                    <span className="flex items-center gap-2 truncate">
                      {isSelected && (
                        <span
                          className="text-coral font-black text-[14px] leading-none shrink-0 select-none"
                          aria-hidden="true"
                        >
                          •
                        </span>
                      )}
                      <span className={`truncate ${isSelected ? "font-bold text-ink" : "font-medium text-ink-body"}`}>
                        {item.title}
                      </span>
                    </span>

                    <span className="text-[12px] text-ink-muted shrink-0 tabular-time ml-2">
                      {item.hint}
                    </span>
                  </Key>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-ink-muted text-[13px]">
              Nenhum comando encontrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
