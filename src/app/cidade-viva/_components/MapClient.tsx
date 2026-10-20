// src/app/cidade-viva/_components/MapClient.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  Category,
  Report,
  ReportStatus,
  SeverityFilter,
  UnifiedReportPoint,
  ReportFeatureCollection,
} from "../_lib/types";
import { clusterReportsByCategory } from "../_lib/clustering";
import { buildReportFeatureCollection } from "../_lib/geojson";
import { buildProximityTour } from "../_lib/proximity-tour";
import { useUserLocation } from "../_lib/use-user-location";
import { getSavedUserLocation, saveUserLocation } from "../_lib/location-storage";
import { FilterBar } from "./FilterBar";
import { ReportDrawer } from "./ReportDrawer";
import { ReportModal } from "./ReportModal";

interface MapClientProps {
  initialCategories: Category[];
  initialReports: Report[];
  isAdmin?: boolean;
}

// Centro de Guarapuava - PR
const DEFAULT_CENTER: [number, number] = [-51.4642, -25.3907];
const DEFAULT_ZOOM = 13;

export function MapClient({
  initialCategories,
  initialReports,
  isAdmin = false,
}: MapClientProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [categories] = useState<Category[]>(initialCategories);
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("id");
    }
    return null;
  });
  const [tourSeedId, setTourSeedId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("id");
    }
    return null;
  });
  const [currentFilter, setCurrentFilter] = useState<SeverityFilter>("todas");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWaitingLocation, setIsWaitingLocation] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const {
    isLocating,
    locateUser,
    syncUserLocationSilently,
    setUserMarkerPosition,
    cleanupMarker,
  } = useUserLocation(mapRef);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const allUnifiedPoints: UnifiedReportPoint[] = useMemo(() => {
    return clusterReportsByCategory(reports, categoryMap, 100);
  }, [reports, categoryMap]);

  const unifiedPoints: UnifiedReportPoint[] = useMemo(() => {
    if (currentFilter === "todas") return allUnifiedPoints;
    if (currentFilter === "iniciais") {
      return allUnifiedPoints.filter((p) => p.report_count <= 2);
    }
    if (currentFilter === "baixa") {
      return allUnifiedPoints.filter((p) => p.report_count >= 3 && p.report_count <= 5);
    }
    if (currentFilter === "media") {
      return allUnifiedPoints.filter((p) => p.report_count >= 6 && p.report_count <= 9);
    }
    if (currentFilter === "alta") {
      return allUnifiedPoints.filter((p) => p.report_count >= 10);
    }
    return allUnifiedPoints;
  }, [allUnifiedPoints, currentFilter]);

  const geojson: ReportFeatureCollection = useMemo(() => {
    return buildReportFeatureCollection(unifiedPoints, categoryMap);
  }, [unifiedPoints, categoryMap]);

  const selectedUnifiedPoint = useMemo(() => {
    if (!selectedPointId) return null;
    return (
      unifiedPoints.find(
        (p) =>
          p.id === selectedPointId ||
          p.reports.some((r) => r.id === selectedPointId)
      ) || null
    );
  }, [selectedPointId, unifiedPoints]);

  const proximityTour = useMemo(() => {
    const seed = tourSeedId || selectedPointId;
    if (!seed || unifiedPoints.length === 0) return [];
    return buildProximityTour(unifiedPoints, seed);
  }, [tourSeedId, selectedPointId, unifiedPoints]);

  const currentTourIndex = useMemo(() => {
    if (!selectedPointId || proximityTour.length === 0) return -1;
    return proximityTour.findIndex(
      (p) =>
        p.id === selectedPointId ||
        p.reports.some((r) => r.id === selectedPointId)
    );
  }, [selectedPointId, proximityTour]);

  const hasPrev = proximityTour.length > 1;
  const hasNext = proximityTour.length > 1;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

    const isDark = document.documentElement.classList.contains("dark");
    const styleUrl = isDark
      ? "https://tiles.openfreemap.org/styles/dark"
      : "https://tiles.openfreemap.org/styles/positron";

    const savedLocation = getSavedUserLocation();
    const hasInitialReport =
      typeof window !== "undefined" &&
      Boolean(new URLSearchParams(window.location.search).get("id"));

    const initialCenter: [number, number] =
      !hasInitialReport && savedLocation
        ? [savedLocation.lng, savedLocation.lat]
        : DEFAULT_CENTER;

    const initialZoom = !hasInitialReport && savedLocation ? 15 : DEFAULT_ZOOM;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: initialCenter,
      zoom: initialZoom,
      pitchWithRotate: false,
      dragRotate: false,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-left");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    const setupLayers = () => {
      if (!map.getSource("reports-source")) {
        map.addSource("reports-source", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
          cluster: false,
        });
      }

      if (!map.getLayer("reports-points")) {
        map.addLayer({
          id: "reports-points",
          type: "circle",
          source: "reports-source",
          paint: {
            "circle-color": ["get", "color"],
            "circle-radius": [
              "step",
              ["get", "report_count"],
              11,
              3,
              13,
              6,
              15,
              10,
              18,
            ],
            "circle-stroke-width": 2.5,
            "circle-stroke-color": "#ffffff",
          },
        });
      }

      if (!map.getLayer("reports-count-label")) {
        map.addLayer({
          id: "reports-count-label",
          type: "symbol",
          source: "reports-source",
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

      map.on("click", "reports-points", (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        const feature = e.features?.[0];
        if (!feature) return;

        const id = feature.properties?.id;
        if (id) {
          setSelectedPointId(id);
          setTourSeedId(id);
          const geom = feature.geometry as GeoJSON.Point;
          map.easeTo({
            center: geom.coordinates as [number, number],
            duration: 500,
          });
        }
      });

      map.on("mouseenter", "reports-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "reports-points", () => {
        map.getCanvas().style.cursor = "";
      });

      setMapLoaded(true);
      map.resize();

      if (savedLocation) {
        setUserMarkerPosition([savedLocation.lng, savedLocation.lat]);
      }

      syncUserLocationSilently((coords) => {
        if (!hasInitialReport) {
          map.easeTo({
            center: coords,
            duration: 800,
          });
        }
      });
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
      cleanupMarker();
      map.remove();
      mapRef.current = null;
    };
  }, [cleanupMarker, setUserMarkerPosition, syncUserLocationSilently]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource("reports-source") as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(geojson);
    }
  }, [geojson, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !selectedPointId) return;
    const target = unifiedPoints.find(
      (p) =>
        p.id === selectedPointId ||
        p.reports.some((r) => r.id === selectedPointId)
    );
    if (target) {
      mapRef.current?.flyTo({
        center: [target.longitude, target.latitude],
        zoom: 16,
        duration: 1200,
      });
    }
  }, [mapLoaded, selectedPointId, unifiedPoints]);

  const handleReportCreated = useCallback((newReport: Report) => {
    setReports((prev) => [newReport, ...prev]);
    setSelectedPointId(newReport.id);
    setTourSeedId(newReport.id);

    mapRef.current?.flyTo({
      center: [newReport.longitude, newReport.latitude],
      zoom: 16,
      duration: 1200,
    });
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedPointId(null);
    setTourSeedId(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("id")) {
        url.searchParams.delete("id");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, []);

  const handleNavigateNext = useCallback(() => {
    if (proximityTour.length <= 1) return;
    const nextIndex =
      currentTourIndex >= 0
        ? (currentTourIndex + 1) % proximityTour.length
        : 0;
    const target = proximityTour[nextIndex];
    setSelectedPointId(target.id);
    mapRef.current?.flyTo({
      center: [target.longitude, target.latitude],
      zoom: 16,
      duration: 700,
    });
  }, [currentTourIndex, proximityTour]);

  const handleNavigatePrev = useCallback(() => {
    if (proximityTour.length <= 1) return;
    const prevIndex =
      currentTourIndex >= 0
        ? (currentTourIndex - 1 + proximityTour.length) % proximityTour.length
        : proximityTour.length - 1;
    const target = proximityTour[prevIndex];
    setSelectedPointId(target.id);
    mapRef.current?.flyTo({
      center: [target.longitude, target.latitude],
      zoom: 16,
      duration: 700,
    });
  }, [currentTourIndex, proximityTour]);

  const handleShowClosestReport = useCallback(() => {
    if (unifiedPoints.length === 0) return;

    let refLat: number;
    let refLng: number;

    const saved = getSavedUserLocation();
    if (saved) {
      refLat = saved.lat;
      refLng = saved.lng;
    } else if (mapRef.current) {
      const center = mapRef.current.getCenter();
      refLat = center.lat;
      refLng = center.lng;
    } else {
      refLat = DEFAULT_CENTER[1];
      refLng = DEFAULT_CENTER[0];
    }

    let closest = unifiedPoints[0];
    let minDistance = Infinity;

    for (const point of unifiedPoints) {
      const d = Math.hypot(point.latitude - refLat, point.longitude - refLng);
      if (d < minDistance) {
        minDistance = d;
        closest = point;
      }
    }

    setSelectedPointId(closest.id);
    setTourSeedId(closest.id);

    mapRef.current?.flyTo({
      center: [closest.longitude, closest.latitude],
      zoom: 16,
      duration: 1200,
    });
  }, [unifiedPoints]);

  const handleOpenReportModal = useCallback(() => {
    if (getSavedUserLocation()) {
      setIsModalOpen(true);
      return;
    }

    if (!navigator.geolocation) {
      alert("Seu navegador não suporta geolocalização.");
      return;
    }

    setIsWaitingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveUserLocation(pos.coords.longitude, pos.coords.latitude);
        setIsWaitingLocation(false);
        setIsModalOpen(true);
      },
      () => {
        setIsWaitingLocation(false);
        alert(
          "Não foi possível obter sua localização. Por favor, ative a permissão de GPS no navegador para relatar ocorrências."
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  }, []);

  const handleReportStatusUpdated = useCallback(
    (reportId: string, newStatus: ReportStatus) => {
      if (newStatus === "resolvido") {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        if (
          selectedUnifiedPoint &&
          selectedUnifiedPoint.reports.length <= 1 &&
          selectedUnifiedPoint.reports.some((r) => r.id === reportId)
        ) {
          handleCloseDrawer();
        }
      } else {
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
        );
      }
    },
    [selectedUnifiedPoint, handleCloseDrawer]
  );

  const handleReportDeleted = useCallback(
    (reportId: string) => {
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      if (
        selectedUnifiedPoint &&
        selectedUnifiedPoint.reports.length <= 1 &&
        selectedUnifiedPoint.reports.some((r) => r.id === reportId)
      ) {
        handleCloseDrawer();
      }
    },
    [selectedUnifiedPoint, handleCloseDrawer]
  );

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-neutral-900 select-none">
      {/* Container Principal do Mapa */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Controles Flutuantes Alinhados no Canto Inferior Direito */}
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 pointer-events-auto flex flex-col items-end gap-2.5">
        {/* 1. Botão de Voltar */}
        <Link
          href="/cidade-viva"
          className="bg-neutral-900/90 text-white border border-neutral-700/80 dark:bg-white/95 dark:text-neutral-900 dark:border-black/10 backdrop-blur-xs px-3.5 py-2 text-xs font-bold rounded-xl shadow-md hover:border-coral transition-all active:scale-95"
          title="Voltar para a apresentação do Cidade Viva"
        >
          Voltar
        </Link>

        {/* 2. Informação dos Relatos Ativos */}
        <FilterBar
          currentFilter={currentFilter}
          onFilterChange={setCurrentFilter}
          reportCount={unifiedPoints.length}
          onClick={handleShowClosestReport}
        />

        {/* 3. Minha Localização */}
        <button
          type="button"
          onClick={locateUser}
          disabled={isLocating}
          className="bg-neutral-900/90 text-white border border-neutral-700/80 dark:bg-white/95 dark:text-neutral-900 dark:border-black/10 backdrop-blur-xs px-3.5 py-2 text-xs font-bold rounded-xl shadow-md hover:border-coral transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          {isLocating ? "Localizando..." : "Minha localização"}
        </button>

        {/* 4. Relatar Problema */}
        <button
          type="button"
          onClick={handleOpenReportModal}
          disabled={isWaitingLocation}
          className="px-5 py-3 sm:px-6 sm:py-3.5 bg-coral text-white font-bold text-xs sm:text-sm rounded-xl shadow-xl hover:opacity-95 transition-all active:scale-95 cursor-pointer"
        >
          {isWaitingLocation ? "Aguardando GPS..." : "Relatar Problema"}
        </button>
      </div>

      {/* Modal de Criação de Ocorrência */}
      <ReportModal
        isOpen={isModalOpen}
        categories={categories}
        onClose={() => setIsModalOpen(false)}
        onReportCreated={handleReportCreated}
      />

      {/* Gaveta de Detalhes da Ocorrência */}
      <ReportDrawer
        report={selectedUnifiedPoint?.latest_report || null}
        unifiedPoint={selectedUnifiedPoint}
        categories={categories}
        isAdmin={isAdmin}
        onReportStatusUpdated={handleReportStatusUpdated}
        onReportDeleted={handleReportDeleted}
        onClose={handleCloseDrawer}
        onNavigatePrev={handleNavigatePrev}
        onNavigateNext={handleNavigateNext}
        hasPrev={hasPrev}
        hasNext={hasNext}
        totalPointsCount={proximityTour.length}
      />
    </div>
  );
}
