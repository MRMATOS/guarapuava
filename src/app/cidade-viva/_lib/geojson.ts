// src/app/cidade-viva/_lib/geojson.ts
import type { Category, UnifiedReportPoint, ReportFeatureCollection } from "./types";

/**
 * Converte pontos unificados e mapa de categorias em um GeoJSON FeatureCollection
 * estruturado para consumo no MapLibre GL.
 */
export function buildReportFeatureCollection(
  unifiedPoints: UnifiedReportPoint[],
  categoryMap: Map<string, Category>
): ReportFeatureCollection {
  return {
    type: "FeatureCollection",
    features: unifiedPoints.map((point) => {
      const cat = categoryMap.get(point.category_id);
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [point.longitude, point.latitude],
        },
        properties: {
          id: point.id,
          category_id: point.category_id,
          category_name: point.category_name,
          severity: cat?.severity || "medio",
          color: point.color,
          icon: cat?.icon || "AlertTriangle",
          photo_url: point.latest_report.photo_url,
          status: point.latest_report.status,
          address: point.latest_report.address,
          city: point.latest_report.city,
          state: point.latest_report.state,
          description: point.latest_report.description,
          created_at: point.latest_report.created_at,
          report_count: point.report_count,
        },
      };
    }),
  };
}
