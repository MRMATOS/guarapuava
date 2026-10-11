// src/app/cidade-viva/_lib/use-user-location.ts
import { useState, useCallback, useRef } from "react";
import type * as maplibregl from "maplibre-gl";
import { updateUserMarker } from "./map-markers";
import { saveUserLocation, getSavedUserLocation } from "./location-storage";

/**
 * Hook para gerenciar geolocalização do usuário e seu marcador visual no MapLibre.
 */
export function useUserLocation(mapRef: React.RefObject<maplibregl.Map | null>) {
  const [isLocating, setIsLocating] = useState(false);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  /**
   * Posiciona imediatamente o marcador visual nas coordenadas fornecidas.
   */
  const setUserMarkerPosition = useCallback(
    (coords: [number, number]) => {
      if (mapRef.current) {
        updateUserMarker(mapRef.current, userMarkerRef, coords);
      }
    },
    [mapRef]
  );

  /**
   * Ação manual acionada pelo botão "Minha localização".
   */
  const locateUser = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Seu navegador não possui suporte a geolocalização.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lng = pos.coords.longitude;
        const lat = pos.coords.latitude;

        saveUserLocation(lng, lat);

        if (mapRef.current) {
          updateUserMarker(mapRef.current, userMarkerRef, [lng, lat]);
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 16,
            duration: 1200,
          });
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn("Falha ao obter localização:", err);
        alert("Não foi possível obter sua localização. Verifique as permissões do navegador.");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
    );
  }, [mapRef]);

  /**
   * Sincronização em segundo plano:
   * Checa se a permissão já foi concedida e atualiza sem popups forçados.
   */
  const syncUserLocationSilently = useCallback(
    async (onPositionUpdated?: (coords: [number, number]) => void) => {
      if (typeof window === "undefined" || !navigator.geolocation) return;

      if (navigator.permissions && navigator.permissions.query) {
        try {
          const status = await navigator.permissions.query({
            name: "geolocation" as PermissionName,
          });
          if (status.state === "denied") return;
          if (status.state === "prompt" && !getSavedUserLocation()) return;
        } catch {
          if (!getSavedUserLocation()) return;
        }
      } else {
        if (!getSavedUserLocation()) return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lng = pos.coords.longitude;
          const lat = pos.coords.latitude;

          saveUserLocation(lng, lat);

          if (mapRef.current) {
            updateUserMarker(mapRef.current, userMarkerRef, [lng, lat]);
          }

          if (onPositionUpdated) {
            onPositionUpdated([lng, lat]);
          }
        },
        () => {
          // Falha silenciosa em background
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    },
    [mapRef]
  );

  const cleanupMarker = useCallback(() => {
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, []);

  return {
    isLocating,
    locateUser,
    syncUserLocationSilently,
    setUserMarkerPosition,
    cleanupMarker,
  };
}
