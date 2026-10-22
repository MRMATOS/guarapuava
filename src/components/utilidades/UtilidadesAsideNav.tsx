"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { getUtilidades } from "@/lib/utilidades/list";

export const UtilidadesAsideNav: React.FC<{ activeId: string }> = ({ activeId }) => {
  const router = useRouter();
  const utilidades = getUtilidades();

  return (
    <div className="desktop-parked-panel w-full h-full flex flex-col group relative pointer-events-auto">
      <div className="w-[calc(100%+80px)] -mx-10 px-10 pt-3 pb-8 flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
        <div className="flex flex-col gap-3.5" aria-label="Lista de utilidades">
      {utilidades.map((u) => {
        const isActive = u.id === activeId;
        return (
          <button
            key={u.id}
            type="button"
            onClick={() => {
              if (!isActive) router.push(u.href);
            }}
            aria-current={isActive ? "page" : undefined}
            aria-label={isActive ? `${u.titulo} (atual)` : `Abrir ${u.titulo}`}
            title={isActive ? `${u.titulo} (página atual)` : `Abrir ${u.titulo}`}
            className={`surface-card w-full p-5 text-left flex flex-col gap-2.5 transition-all duration-150 active:scale-[0.99] ${
              isActive
                ? "border border-coral/60 brightness-[1.02] cursor-default"
                : "group cursor-pointer hover:brightness-[1.01]"
            }`}
          >
            <h2
              className={`text-[15px] font-bold tracking-tight transition-colors ${
                isActive ? "text-ink" : "text-ink group-hover:text-coral"
              }`}
            >
              {u.titulo}
            </h2>
            <p className="text-[14.5px] text-ink-body leading-relaxed">{u.descricao}</p>
          </button>
        );
      })}
        </div>
      </div>
    </div>
  );
};
