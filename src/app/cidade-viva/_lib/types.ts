// src/app/cidade-viva/_lib/types.ts

export type Severity = "alto" | "medio" | "baixo" | "assistencial";

export type ReportStatus =
  | "sugestivo"
  | "confirmado_comunidade"
  | "verificado_in_loco"
  | "resolvido";

export interface Category {
  id: string;
  name: string;
  severity: Severity;
  icon: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

export interface Report {
  id: string;
  category_id: string;
  latitude: number;
  longitude: number;
  description: string | null;
  photo_url: string;
  address: string | null;
  city: string | null;
  state: string | null;
  status: ReportStatus;
  created_at: string;
}

export type SeverityFilter =
  | "todas"
  | "alta"
  | "media"
  | "baixa"
  | "iniciais";

export interface UnifiedReportPoint {
  id: string;
  category_id: string;
  category_name: string;
  latitude: number;
  longitude: number;
  report_count: number;
  color: string;
  reports: Report[];
  latest_report: Report;
}

export interface ReportGeoProperties {
  id: string;
  category_id: string;
  category_name: string;
  severity: Severity;
  color: string;
  icon: string;
  photo_url: string;
  status: ReportStatus;
  address: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
  created_at: string;
  report_count: number;
}

export type ReportFeature = GeoJSON.Feature<GeoJSON.Point, ReportGeoProperties>;
export type ReportFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Point, ReportGeoProperties>;

export interface CreateReportResult {
  success: boolean;
  report?: Report;
  error?: string;
}
