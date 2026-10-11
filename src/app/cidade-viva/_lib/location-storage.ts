// src/app/cidade-viva/_lib/location-storage.ts

export const LOCATION_STORAGE_KEY = "cidade_viva_last_location";

export interface SavedLocation {
  lng: number;
  lat: number;
  timestamp: number;
}

/**
 * Valida se as coordenadas são números finitos dentro dos limites do globo.
 */
export function isValidCoordinate(lng: number, lat: number): boolean {
  return (
    typeof lng === "number" &&
    typeof lat === "number" &&
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

function resolveStorage(customStorage?: Storage): Storage | null {
  if (customStorage) return customStorage;
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

/**
 * Obtém a última localização salva do usuário, validando a integridade dos dados.
 */
export function getSavedUserLocation(customStorage?: Storage): SavedLocation | null {
  try {
    const storage = resolveStorage(customStorage);
    if (!storage) return null;

    const raw = storage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      isValidCoordinate(parsed.lng, parsed.lat)
    ) {
      return {
        lng: parsed.lng,
        lat: parsed.lat,
        timestamp: typeof parsed.timestamp === "number" ? parsed.timestamp : Date.now(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Salva a localização do usuário no localStorage com tratamento de erro.
 */
export function saveUserLocation(
  lng: number,
  lat: number,
  customStorage?: Storage
): void {
  try {
    if (!isValidCoordinate(lng, lat)) return;

    const storage = resolveStorage(customStorage);
    if (!storage) return;

    const payload: SavedLocation = {
      lng,
      lat,
      timestamp: Date.now(),
    };
    storage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Falha silenciosa em navegadores com modo anônimo restritivo
  }
}

/**
 * Limpa o registro de localização salvo.
 */
export function clearSavedUserLocation(customStorage?: Storage): void {
  try {
    const storage = resolveStorage(customStorage);
    if (!storage) return;
    storage.removeItem(LOCATION_STORAGE_KEY);
  } catch {
    // Falha silenciosa
  }
}
