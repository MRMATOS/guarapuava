// src/app/cidade-viva/_lib/clustering.ts
import type { Report, Category, UnifiedReportPoint } from "./types";

/**
 * Calcula a distância em metros entre duas coordenadas geográficas (lat, lng) usando Haversine.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Raio da Terra em metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Define a cor do pino com base no número de relatos acumulados no local:
 * - 1 a 2 relatos: Cinza (#71717A)
 * - 3 a 5 relatos: Amarelo (#FACC15)
 * - 6 a 9 relatos: Laranja (#F97316)
 * - 10 ou mais relatos: Vermelho (#EF4444)
 */
export function getReportPinColor(count: number): string {
  if (count >= 10) return "#EF4444"; // Vermelho - Alerta Crítico
  if (count >= 6) return "#F97316"; // Laranja - Relevância Alta
  if (count >= 3) return "#FACC15"; // Amarelo - Confirmação Coletiva
  return "#71717A"; // Cinza - Ocorrência Inicial
}

/**
 * Unifica relatos da mesma categoria em um raio de até 100 metros.
 * Categorias diferentes no mesmo local permanecem com pinos separados.
 */
export function clusterReportsByCategory(
  reports: Report[],
  categoryMap: Map<string, Category>,
  radiusMeters: number = 100
): UnifiedReportPoint[] {
  // 1. Separa relatos por categoria
  const byCategory = new Map<string, Report[]>();
  for (const report of reports) {
    const list = byCategory.get(report.category_id) || [];
    list.push(report);
    byCategory.set(report.category_id, list);
  }

  const unifiedPoints: UnifiedReportPoint[] = [];

  // 2. Para cada categoria, agrupa relatos a até radiusMeters
  for (const [categoryId, categoryReports] of byCategory.entries()) {
    const visited = new Set<string>();

    for (let i = 0; i < categoryReports.length; i++) {
      const base = categoryReports[i];
      if (visited.has(base.id)) continue;

      const group: Report[] = [base];
      visited.add(base.id);

      for (let j = i + 1; j < categoryReports.length; j++) {
        const candidate = categoryReports[j];
        if (visited.has(candidate.id)) continue;

        const dist = calculateDistanceMeters(
          base.latitude,
          base.longitude,
          candidate.latitude,
          candidate.longitude
        );

        if (dist <= radiusMeters) {
          group.push(candidate);
          visited.add(candidate.id);
        }
      }

      // Ordena por data (mais recente primeiro)
      group.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const latest = group[0];
      const cat = categoryMap.get(categoryId);

      // Centróide geográfico do grupo
      const avgLat = group.reduce((sum, r) => sum + r.latitude, 0) / group.length;
      const avgLng = group.reduce((sum, r) => sum + r.longitude, 0) / group.length;

      unifiedPoints.push({
        id: group.length > 1 ? `unified-${latest.id}` : latest.id,
        category_id: categoryId,
        category_name: cat?.name || "Problema Urbano",
        latitude: avgLat,
        longitude: avgLng,
        report_count: group.length,
        color: getReportPinColor(group.length),
        reports: group,
        latest_report: latest,
      });
    }
  }

  return unifiedPoints;
}
