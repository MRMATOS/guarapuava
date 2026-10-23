/**
 * Gerenciamento de rotas salvas de ônibus (persistência local).
 */

import type { LinhaBairro, PontoItinerario } from "@/types/bus";

export interface SavedBusRoute {
  id: string;
  createdAt: string;
  origem: {
    ponto: PontoItinerario;
    linha: LinhaBairro;
  };
  destino: {
    ponto: PontoItinerario;
    linha: LinhaBairro;
  };
}

const STORAGE_KEY = "guarapuava_saved_bus_routes";

let cachedRoutes: SavedBusRoute[] | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeSavedRoutes(callback: () => void): () => void {
  listeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cachedRoutes = null;
      callback();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

export function getSavedRoutes(): SavedBusRoute[] {
  if (typeof window === "undefined") return [];
  if (cachedRoutes !== null) return cachedRoutes;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedRoutes = [];
      return cachedRoutes;
    }
    const parsed = JSON.parse(raw);
    cachedRoutes = Array.isArray(parsed) ? parsed : [];
    return cachedRoutes;
  } catch (error) {
    console.error("Erro ao carregar rotas salvas:", error);
    cachedRoutes = [];
    return cachedRoutes;
  }
}

export function saveRoute(
  origem: { ponto: PontoItinerario; linha: LinhaBairro },
  destino: { ponto: PontoItinerario; linha: LinhaBairro }
): SavedBusRoute {
  if (typeof window === "undefined") {
    return {
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      origem,
      destino,
    };
  }

  const existing = getSavedRoutes();

  // Verifica se já existe rota idêntica com mesma origem e destino
  const alreadySaved = existing.find(
    (r) =>
      r.origem.ponto.id === origem.ponto.id &&
      r.destino.ponto.id === destino.ponto.id &&
      r.origem.linha.id === origem.linha.id &&
      r.destino.linha.id === destino.linha.id
  );

  if (alreadySaved) {
    return alreadySaved;
  }

  const newRoute: SavedBusRoute = {
    id: `route_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    origem,
    destino,
  };

  const updated = [newRoute, ...existing];
  cachedRoutes = updated;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("saved-bus-routes-changed"));
    notify();
  } catch (error) {
    console.error("Erro ao salvar rota:", error);
  }

  return newRoute;
}

export function isRouteSaved(origemPontoId?: string, destinoPontoId?: string): boolean {
  if (!origemPontoId || !destinoPontoId || typeof window === "undefined") return false;
  const list = getSavedRoutes();
  return list.some(
    (r) => r.origem.ponto.id === origemPontoId && r.destino.ponto.id === destinoPontoId
  );
}

export function deleteSavedRoute(routeId: string): void {
  if (typeof window === "undefined") return;
  const existing = getSavedRoutes();
  const updated = existing.filter((r) => r.id !== routeId);
  cachedRoutes = updated;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("saved-bus-routes-changed"));
    notify();
  } catch (error) {
    console.error("Erro ao excluir rota salva:", error);
  }
}
