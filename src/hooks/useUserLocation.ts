"use client";

import { useState, useCallback } from "react";

export interface UserCoordinates {
  lat: number;
  lon: number;
  accuracy?: number;
}

export function useUserLocation() {
  const [coords, setCoords] = useState<UserCoordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionAsked, setPermissionAsked] = useState(false);

  const requestLocation = useCallback(async (): Promise<UserCoordinates | null> => {
    setPermissionAsked(true);

    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Geolocalização não é suportada pelo seu navegador.");
      return null;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords: UserCoordinates = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setCoords(newCoords);
          setIsLoading(false);
          resolve(newCoords);
        },
        (err) => {
          let msg = "Não foi possível obter sua localização.";
          if (err.code === err.PERMISSION_DENIED) {
            msg = "Permissão de localização negada.";
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = "Sinal de GPS indisponível.";
          } else if (err.code === err.TIMEOUT) {
            msg = "Tempo limite para obter localização excedido.";
          }
          setError(msg);
          setIsLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, []);

  const clearLocation = useCallback(() => {
    setCoords(null);
    setError(null);
  }, []);

  return {
    coords,
    isLoading,
    error,
    permissionAsked,
    requestLocation,
    clearLocation,
  };
}
