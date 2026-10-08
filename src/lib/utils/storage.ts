/**
 * Utilitários para persistência de vagas visualizadas e favoritas no navegador (localStorage).
 * Seguro para execução tanto no cliente quanto no servidor (SSR).
 */

import { DailyDigest } from "@/types/news";
import { JobOpening } from "@/types/job";

export const STORAGE_KEYS = {
  VIEWED_JOBS: "guarapuava_viewed_jobs",
  FAVORITE_JOBS: "guarapuava_favorite_jobs",
  NEWS_DIGESTS_CACHE: "guarapuava_news_digests_cache",
  JOBS_CACHE: "guarapuava_jobs_cache",
} as const;

function isBrowser(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.localStorage !== "undefined" &&
      typeof window.localStorage.getItem === "function"
    );
  } catch {
    return false;
  }
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

export function getCachedNewsDigests(): DailyDigest[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NEWS_DIGESTS_CACHE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCachedNewsDigests(digests: DailyDigest[]): void {
  if (!isBrowser() || !Array.isArray(digests) || digests.length === 0) return;
  try {
    localStorage.setItem(STORAGE_KEYS.NEWS_DIGESTS_CACHE, JSON.stringify(digests));
  } catch {
    // Falha silenciosa caso o armazenamento local esteja bloqueado ou cheio
  }
}

export function getCachedJobs(): JobOpening[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.JOBS_CACHE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCachedJobs(jobs: JobOpening[]): void {
  if (!isBrowser() || !Array.isArray(jobs) || jobs.length === 0) return;
  try {
    localStorage.setItem(STORAGE_KEYS.JOBS_CACHE, JSON.stringify(jobs));
  } catch {
    // Falha silenciosa
  }
}

