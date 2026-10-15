"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const INCREMENTAL_PAGE_SIZE = 10;

/**
 * Lista incremental (infinite scroll): expõe os N primeiros itens e
 * carrega +pageSize sempre que o sentinela entra na viewport.
 * Funciona no scroll da janela (mobile) e no #desktop-center-scroller (desktop),
 * pois o IntersectionObserver com root null observa a viewport em ambos.
 */
export function useIncrementalList(
  total: number,
  resetKey: string,
  pageSize: number = INCREMENTAL_PAGE_SIZE
) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reseta para a primeira página quando os filtros ou a lista mudam.
  // Ajuste durante a renderização (padrão recomendado pelo React),
  // não dentro de effect, para evitar cascata de renders.
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setVisibleCount(pageSize);
  }

  // Garante que um índice específico (ex: vaga aberta no detalhe) esteja visível.
  const ensureIndexVisible = useCallback(
    (index: number) => {
      if (index < 0) return;
      setVisibleCount((prev) => Math.max(prev, Math.min(total, index + 1)));
    },
    [total]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (visibleCount >= total) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((prev) => Math.min(total, prev + pageSize));
        }
      },
      { root: null, rootMargin: "800px 0px", threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, total, pageSize]);

  return {
    visibleCount: Math.min(visibleCount, Math.max(total, 0)),
    hasMore: visibleCount < total,
    sentinelRef,
    ensureIndexVisible,
  };
}
