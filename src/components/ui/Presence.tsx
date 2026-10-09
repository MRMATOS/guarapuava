"use client";

import React, { useEffect, useState } from "react";

export interface UsePresenceResult {
  shouldRender: boolean;
  isExiting: boolean;
}

/**
 * usePresence — Hook leve para transição de montagem e desmontagem (exit animations).
 * Mantém o elemento montado no DOM durante o tempo de animação de saída.
 * Zero dependências externas, 100% nativo.
 */
export function usePresence(
  isVisible: boolean,
  durationMs: number = 180,
  onExitComplete?: () => void
): UsePresenceResult {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (isVisible) {
      setShouldRender(true);
      setIsExiting(false);
    } else if (shouldRender) {
      setIsExiting(true);
      timer = setTimeout(() => {
        setShouldRender(false);
        setIsExiting(false);
        onExitComplete?.();
      }, durationMs);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isVisible, durationMs, shouldRender, onExitComplete]);

  return { shouldRender, isExiting };
}

export interface PresenceProps {
  /** Se o componente deve estar visível */
  isVisible: boolean;
  /** Duração da animação de saída em milissegundos antes do unmount (padrão: 180ms) */
  duration?: number;
  /** Callback disparado quando a animação de saída termina e o elemento desmonta */
  onExitComplete?: () => void;
  /** Classes CSS adicionais do container */
  className?: string;
  /** Classe de animação de entrada */
  animateInClass?: string;
  /** Classe de animação de saída */
  animateOutClass?: string;
  children: React.ReactNode;
}

/**
 * Presence — Componente invólucro para animações elegantes de entrada e saída.
 * Ao fechar, aplica a classe de saída e `pointer-events-none`, aguarda o término
 * e remove o nó do DOM de forma limpa.
 */
export const Presence: React.FC<PresenceProps> = ({
  isVisible,
  duration = 180,
  onExitComplete,
  className = "w-full",
  animateInClass = "animate-panel-in",
  animateOutClass = "animate-panel-out",
  children,
}) => {
  const { shouldRender, isExiting } = usePresence(isVisible, duration, onExitComplete);

  if (!shouldRender) return null;

  return (
    <div
      data-state={isExiting ? "closed" : "open"}
      className={`${className} ${
        isExiting ? `${animateOutClass} pointer-events-none` : animateInClass
      }`.trim()}
    >
      {children}
    </div>
  );
};
