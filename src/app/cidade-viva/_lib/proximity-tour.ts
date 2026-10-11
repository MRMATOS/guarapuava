// src/app/cidade-viva/_lib/proximity-tour.ts
import { calculateDistanceMeters } from "./clustering";
import type { UnifiedReportPoint } from "./types";

/**
 * Constrói um itinerário sequencial (tour) de pontos ordenados pelo vizinho mais próximo
 * (Nearest Neighbor), iniciando a partir de `startPointId`.
 */
export function buildProximityTour(
  points: UnifiedReportPoint[],
  startPointId: string
): UnifiedReportPoint[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [...points];

  const remaining = [...points];
  let currentIndex = remaining.findIndex((p) => p.id === startPointId);
  if (currentIndex === -1) {
    currentIndex = 0;
  }

  const tour: UnifiedReportPoint[] = [];
  let current = remaining.splice(currentIndex, 1)[0];
  tour.push(current);

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let minDistance = calculateDistanceMeters(
      current.latitude,
      current.longitude,
      remaining[0].latitude,
      remaining[0].longitude
    );

    for (let i = 1; i < remaining.length; i++) {
      const dist = calculateDistanceMeters(
        current.latitude,
        current.longitude,
        remaining[i].latitude,
        remaining[i].longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }

    current = remaining.splice(nearestIndex, 1)[0];
    tour.push(current);
  }

  return tour;
}
