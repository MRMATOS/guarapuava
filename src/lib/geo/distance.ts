/**
 * Utilitários de cálculo de distância geográfica e ordenação de paradas.
 * Utiliza a fórmula de Haversine para precisão métrica.
 */

import type { PontoItinerario } from "@/types/bus";

/**
 * Calcula a distância em metros entre dois pontos geográficos (Haversine).
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Raio da Terra em metros
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Formata distância para exibição amigável ao usuário.
 * Ex: "80 m", "650 m", "1.2 km"
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export interface PontoComDistancia {
  ponto: PontoItinerario;
  distanciaMetros: number;
  linhaId: string;
  linhaNome: string;
  linhaCodigo: string;
  bairroNome: string;
}

/**
 * Ordena e filtra paradas com base na proximidade das coordenadas de referência.
 */
export function findNearestStops(
  refLat: number,
  refLon: number,
  linhas: Array<{
    id: string;
    codigo: string;
    bairro: string;
    nomeExibicao: string;
    pontos: PontoItinerario[];
  }>,
  maxResults: number = 20
): PontoComDistancia[] {
  const results: PontoComDistancia[] = [];
  const seenPontoIds = new Set<string>();

  for (const linha of linhas) {
    for (const ponto of linha.pontos) {
      if (typeof ponto.latitude === "number" && typeof ponto.longitude === "number") {
        const key = `${ponto.id}-${linha.id}`;
        if (!seenPontoIds.has(key)) {
          seenPontoIds.add(key);
          const dist = calculateDistanceMeters(
            refLat,
            refLon,
            ponto.latitude,
            ponto.longitude
          );
          results.push({
            ponto,
            distanciaMetros: dist,
            linhaId: linha.id,
            linhaNome: linha.nomeExibicao,
            linhaCodigo: linha.codigo,
            bairroNome: linha.bairro,
          });
        }
      }
    }
  }

  // Ordena pelo mais próximo
  results.sort((a, b) => a.distanciaMetros - b.distanciaMetros);

  return results.slice(0, maxResults);
}
