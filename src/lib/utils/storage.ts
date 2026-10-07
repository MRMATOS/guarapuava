/**
 * Utilitários para persistência de vagas visualizadas e favoritas no navegador (localStorage).
 * Seguro para execução tanto no cliente quanto no servidor (SSR).
 */

export const STORAGE_KEYS = {
  VIEWED_JOBS: "guarapuava_viewed_jobs",
  FAVORITE_JOBS: "guarapuava_favorite_jobs",
} as const;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getViewedJobIds(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VIEWED_JOBS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveViewedJobId(jobId: string): string[] {
  if (!isBrowser() || !jobId) return [];
  try {
    const current = getViewedJobIds();
    if (!current.includes(jobId)) {
      const updated = [...current, jobId];
      localStorage.setItem(STORAGE_KEYS.VIEWED_JOBS, JSON.stringify(updated));
      return updated;
    }
    return current;
  } catch {
    return [];
  }
}

export function getFavoriteJobIds(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITE_JOBS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteJobId(jobId: string): string[] {
  if (!isBrowser() || !jobId) return [];
  try {
    const current = getFavoriteJobIds();
    const isFav = current.includes(jobId);
    const updated = isFav
      ? current.filter((id) => id !== jobId)
      : [...current, jobId];
    localStorage.setItem(STORAGE_KEYS.FAVORITE_JOBS, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
