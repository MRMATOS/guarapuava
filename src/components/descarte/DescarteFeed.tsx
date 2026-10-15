"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MapPin } from "lucide-react";
import { Key } from "@/components/ui/Key";
import { groupDescarteByCategoria } from "@/lib/descarte/filter";
import { OBSERVACAO_COLETA_INCERTA } from "@/lib/descarte/renames";
import type { DescarteItem } from "@/types/descarte";

export interface DescarteFeedProps {
  items: DescarteItem[];
  onClearFilter?: () => void;
}

export const DescarteFeed: React.FC<DescarteFeedProps> = ({ items, onClearFilter }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async (key: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
    } catch {
      // silencioso: ainda mostra feedback
    }
    setCopiedKey(key);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  const groups = useMemo(() => groupDescarteByCategoria(items), [items]);

  if (items.length === 0) {
    return (
      <div className="surface-card w-full p-6 flex flex-col items-center justify-center text-center gap-3">
        <h3 className="text-[16px] font-bold text-ink">Nenhum local encontrado</h3>
        <p className="text-[13.5px] text-ink-muted max-w-[280px]">
          Não encontramos empresas ou categorias com os filtros aplicados.
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

  return (
    <div className="flex flex-col gap-6 w-full select-text pb-12">
      {groups.map((group) => (
        <article key={group.categoria} aria-label={`Locais para ${group.categoria}`} className="flex flex-col gap-3.5 w-full">
          <div className="flex items-center justify-between gap-2 px-1 border-b border-rule/30 pb-2">
            <h2 className="text-[15px] font-bold text-ink tracking-tight">
              {group.categoria}
            </h2>
            <span className="text-[12px] uppercase tracking-wider font-semibold text-ink-muted">
              {group.items.length === 1 ? "1 local" : `${group.items.length} locais`}
            </span>
          </div>

          <div className="flex flex-col gap-3 w-full">
            {group.items.map((item) => {
        const isExpanded = expandedId === item.id;
        const displayName = item.nomeExibicao || item.empresa;
        const addressText = `${displayName}, ${item.endereco}, Guarapuava - PR`;
        return (
          <div
            key={item.id}
            onClick={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
            className={`surface-card w-full p-4 flex flex-col gap-3 cursor-pointer transition-all duration-200 active:scale-[0.995] ${
              isExpanded ? "border border-coral/60 shadow-raised-sm" : ""
            }${item.coletaIncerta ? " opacity-80" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-semibold text-ink-muted truncate">
                {item.categoria}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={item.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Ver localização de ${displayName} no Google Maps`}
                  title="Ver localização no Google Maps"
                  className="px-2.5 py-1 rounded-md border border-rule/40 hover:border-coral/50 bg-canvas hover:bg-coral/10 text-ink-body hover:text-coral transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs active:scale-95 text-[12px] font-semibold"
                >
                  <MapPin className="w-3.5 h-3.5 text-coral" />
                  <span>Mapa</span>
                </a>
              </div>
            </div>

            <div className="min-w-0 w-full">
              <h3
                className="text-[14.5px] sm:text-[15px] font-bold text-ink tracking-tight break-words leading-snug"
                title={displayName}
              >
                {displayName}
              </h3>
              {item.nomeAntigo && (
                <p className="text-[12.5px] text-ink-muted leading-snug pt-0.5">
                  ({item.nomeAntigo})
                </p>
              )}
            </div>

            {item.telefone && (
              <p className="text-[13px] text-ink-body tabular-time">{item.telefone}</p>
            )}

            {item.coletaIncerta && (
              <p className="text-[12.5px] text-ink-muted leading-snug">
                {OBSERVACAO_COLETA_INCERTA}
              </p>
            )}

            {isExpanded && (
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 w-full pt-1 animate-fade-in">
                <Key
                  type="button"
                  onClick={(e) => handleCopy(`${item.id}-tel`, item.telefone || "", e)}
                  disabled={!item.telefone}
                  className="w-full px-1 sm:px-2 text-[12px] sm:text-[13px] justify-center text-center font-semibold disabled:opacity-40"
                  title={item.telefone ? `Copiar ${item.telefone}` : "Telefone indisponível"}
                >
                  <span className="truncate">
                    {copiedKey === `${item.id}-tel` ? "Copiado!" : "Copiar telefone"}
                  </span>
                </Key>
                <Key
                  type="button"
                  onClick={(e) => handleCopy(`${item.id}-addr`, addressText, e)}
                  className="w-full px-1 sm:px-2 text-[12px] sm:text-[13px] justify-center text-center font-semibold"
                  title={`Copiar ${addressText}`}
                >
                  <span className="truncate">
                    {copiedKey === `${item.id}-addr` ? "Copiado!" : "Copiar endereço"}
                  </span>
                </Key>
              </div>
            )}
          </div>
        );
      })}
          </div>
        </article>
      ))}
    </div>
  );
};
