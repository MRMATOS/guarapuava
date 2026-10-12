// src/app/admin/cidade-viva/_components/AdminMap.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  Category,
  Report,
  UnifiedReportPoint,
  ReportFeatureCollection,
} from "@/app/cidade-viva/_lib/types";
import { clusterReportsByCategory } from "@/app/cidade-viva/_lib/clustering";
import { buildReportFeatureCollection } from "@/app/cidade-viva/_lib/geojson";

interface AdminMapProps {
  reports: Report[];
  categories: Category[];
  selectedPointId: string | null;
  onSelectPoint: (point: UnifiedReportPoint | null) => void;
  focusedReport: Report | null;
}

const DEFAULT_CENTER: [number, number] = [-51.4642, -25.3907];
const DEFAULT_ZOOM = 13;

export function AdminMap({
  reports,
  categories,
  selectedPointId,
  onSelectPoint,
  focusedReport,
}: AdminMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Agrupamento espacial por proximidade (100 metros)
  const unifiedPoints: UnifiedReportPoint[] = useMemo(() => {
    return clusterReportsByCategory(reports, categoryMap, 100);
  }, [reports, categoryMap]);

  const geojson: ReportFeatureCollection = useMemo(() => {
    return buildReportFeatureCollection(unifiedPoints, categoryMap);
  }, [unifiedPoints, categoryMap]);

  // Inicialização do MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

    const isDark = document.documentElement.classList.contains("dark");
    const styleUrl = isDark
      ? "https://tiles.openfreemap.org/styles/dark"
      : "https://tiles.openfreemap.org/styles/positron";

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitchWithRotate: false,
      dragRotate: false,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-left");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    const setupLayers = () => {
      if (!map.getSource("admin-reports-source")) {
        map.addSource("admin-reports-source", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
          cluster: false,
        });
      }

      // Anel de seleção em volta do ponto ativo
      if (!map.getLayer("admin-reports-selected-ring")) {
        map.addLayer({
          id: "admin-reports-selected-ring",
          type: "circle",
          source: "admin-reports-source",
          paint: {
            "circle-color": "transparent",
            "circle-radius": [
              "step",
              ["get", "report_count"],
              17,
              3, 19,
              6, 21,
              10, 24,
            ],
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ff4742",
            "circle-stroke-opacity": [
              "case",
              ["==", ["get", "id"], ""],
              0,
              1,
            ],
          },
        });
      }

      // Pontos principais com raio proporcional e cor da categoria
      if (!map.getLayer("admin-reports-points")) {
        map.addLayer({
          id: "admin-reports-points",
          type: "circle",
          source: "admin-reports-source",
          paint: {
            "circle-color": ["get", "color"],
            "circle-radius": [
              "step",
              ["get", "report_count"],
              11,
              3, 13,
              6, 15,
              10, 18,
            ],
            "circle-stroke-width": 2.5,
            "circle-stroke-color": "#ffffff",
          },
        });
      }

      // Contagem numérica no centro do cluster
      if (!map.getLayer("admin-reports-count-label")) {
        map.addLayer({
          id: "admin-reports-count-label",
          type: "symbol",
          source: "admin-reports-source",
          filter: [">", ["get", "report_count"], 1],
          layout: {
            "text-field": ["to-string", ["get", "report_count"]],
            "text-size": 11,
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          },
          paint: {
            "text-color": "#ffffff",
          },
        });
      }
    };

    map.on("load", () => {
      setupLayers();

      // Clique em um marcador
      map.on("click", "admin-reports-points", (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        const feature = e.features?.[0];
        if (!feature) return;

        const id = feature.properties?.id;
        if (id) {
          const pt = unifiedPoints.find((p) => p.id === id) || null;
          onSelectPoint(pt);

          const geom = feature.geometry as GeoJSON.Point;
          map.easeTo({
            center: geom.coordinates as [number, number],
            duration: 500,
          });
        }
      });

      // Clique fora de qualquer marcador desfaz a seleção
      map.on("click", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["admin-reports-points"],
        });
        if (features.length === 0) {
          onSelectPoint(null);
        }
      });

      map.on("mouseenter", "admin-reports-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "admin-reports-points", () => {
        map.getCanvas().style.cursor = "";
      });

      setMapLoaded(true);
      map.resize();
    });

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    const themeObserver = new MutationObserver(() => {
      const darkNow = document.documentElement.classList.contains("dark");
      const nextStyle = darkNow
        ? "https://tiles.openfreemap.org/styles/dark"
        : "https://tiles.openfreemap.org/styles/positron";
      map.setStyle(nextStyle);
      map.once("style.load", () => {
        setupLayers();
      });
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    mapRef.current = map;

    return () => {
      resizeObserver.disconnect();
      themeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [onSelectPoint, unifiedPoints]);

  // Atualiza os dados GeoJSON quando os filtros mudam
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource("admin-reports-source") as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(geojson as GeoJSON.FeatureCollection);
    }
  }, [geojson, mapLoaded]);

  // Atualiza o anel de destaque do ponto selecionado
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    if (mapRef.current.getLayer("admin-reports-selected-ring")) {
      mapRef.current.setPaintProperty(
        "admin-reports-selected-ring",
        "circle-stroke-opacity",
        [
          "case",
          ["==", ["get", "id"], selectedPointId || ""],
          1,
          0,
        ]
      );
    }
  }, [selectedPointId, mapLoaded]);

  // Centraliza o mapa quando o usuário clica em "No Mapa" num card
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !focusedReport) return;
    mapRef.current.easeTo({
      center: [focusedReport.longitude, focusedReport.latitude],
      zoom: 15.5,
      duration: 600,
    });
  }, [focusedReport, mapLoaded]);

  const handleResetView = () => {
    if (!mapRef.current) return;
    mapRef.current.easeTo({
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      duration: 500,
    });
    onSelectPoint(null);
  };

  return (
    <div className="relative w-full h-full min-h-[360px] bg-canvas select-none">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Indicador superior de ocorrências no mapa */}
      <div className="absolute top-3 left-3 z-20 pointer-events-none flex items-center gap-2">
        <div className="bg-canvas/90 backdrop-blur-md border border-rule/80 px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-2 text-xs font-semibold text-ink">
          <span className="w-2 h-2 rounded-full bg-coral animate-pulse" />
          <span>
            {unifiedPoints.length} {unifiedPoints.length === 1 ? "local mapeado" : "locais mapeados"}
          </span>
        </div>
      </div>

      {/* Botão de recentralizar */}
      <div className="absolute top-3 right-3 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={handleResetView}
          className="key px-3 py-1.5 text-xs font-semibold bg-canvas/90 backdrop-blur-md border border-rule/80 text-ink rounded-xl shadow-xs hover:border-coral transition-colors cursor-pointer"
          title="Recentralizar mapa em Guarapuava"
        >
          Recentralizar
        </button>
      </div>
    </div>
  );
}
