import React from "react";

interface DockProps {
  children: React.ReactNode;
  /** Conteúdo flutuante acima do dock (ex.: indicador de filtro). Não altera a posição do dock. */
  above?: React.ReactNode;
  /** Alinhamento das teclas dentro do dock. */
  align?: "end" | "between";
  "aria-label"?: string;
}

/**
 * Dock — rodapé fixo idêntico em todas as telas.
 * Altura, distância da borda e respiro vêm de tokens (--dock-height, --dock-offset),
 * e `.page-shell` reserva exatamente esse espaço. Nunca posicione o rodapé fora deste componente.
 */
export const Dock: React.FC<DockProps> = ({
  children,
  above,
  align = "end",
  "aria-label": ariaLabel,
}) => (
  <div className="dock-shell">
    <div className="dock-stack">
      {above}
      <nav
        aria-label={ariaLabel}
        className={`dock ${align === "end" ? "justify-end" : "justify-between"}`}
      >
        {children}
      </nav>
    </div>
  </div>
);
