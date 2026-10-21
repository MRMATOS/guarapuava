// src/app/cidade-viva/_lib/types.ts

export type Severity = "alto" | "medio" | "baixo" | "assistencial";

export type ReportStatus =
  | "sugestivo"
  | "confirmado_comunidade"
  | "verificado_in_loco"
  | "resolvido";

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  sugestivo: "Não confirmado",
  confirmado_comunidade: "Confirmado pela comunidade",
  verificado_in_loco: "Verificado in loco",
  resolvido: "Resolvido",
};

export function formatReportStatus(status?: string | null): string {
  if (!status) return "";
  if (status in REPORT_STATUS_LABELS) {
    return REPORT_STATUS_LABELS[status as ReportStatus];
  }
  return status.replace(/_/g, " ");
}

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
  ip_hash?: string | null;
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
