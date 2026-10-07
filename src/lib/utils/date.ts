/**
 * Utilitários de data e hora com suporte ao fuso horário oficial de Guarapuava (America/Sao_Paulo).
 */

import { JobOpening } from "@/types/job";

const TIMEZONE = "America/Sao_Paulo";

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: string;
  minute: string;
}

/**
 * Extrai os componentes de data e hora no fuso horário America/Sao_Paulo.
 */
function getSaoPauloDateParts(date: Date): DateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  // Tratamento especial para meia-noite caso retorne 24
  let hour = map.hour || "00";
  if (hour === "24") hour = "00";

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour,
    minute: map.minute || "00",
  };
}

/**
 * Retorna a data atual no formato DD/MM/AAAA para exibição fixa na âncora do dia.
 */
export function getTodayDateString(refDate: Date = new Date()): string {
  const { day, month, year } = getSaoPauloDateParts(refDate);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(day)}/${pad(month)}/${year}`;
}

/**
 * Converte diferentes formatos de data e hora para um objeto Date.
 */
export function parseDateInput(
  input: string | Date | { date: string; time: string } | null | undefined
): Date | null {
  if (!input) return null;

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  // Objeto { date: "DD/MM/AAAA" | "YYYY-MM-DD", time: "HH:MM" }
  if (typeof input === "object" && "date" in input && "time" in input) {
    const { date, time } = input;
    if (!date) return null;
    const timeClean = (time || "12:00").trim();

    // Formato DD/MM/AAAA
    const brMatch = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
      const [, d, m, y] = brMatch;
      const iso = `${y}-${m}-${d}T${timeClean.length === 5 ? timeClean + ":00" : timeClean}-03:00`;
      const parsed = new Date(iso);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    // Formato YYYY-MM-DD
    const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      const iso = `${y}-${m}-${d}T${timeClean.length === 5 ? timeClean + ":00" : timeClean}-03:00`;
      const parsed = new Date(iso);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    const fallback = new Date(`${date} ${timeClean}`);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  if (typeof input === "string") {
    const raw = input.trim();

    // ISO string padrão (ex: 2026-10-07T12:00:00Z)
    const directDate = new Date(raw);
    if (!isNaN(directDate.getTime()) && raw.includes("T")) {
      return directDate;
    }

    // Padrão brasileiro: "Registrado em 06/10/2026 as 18:30" ou "06/10/2026 18:30" ou "06/10/2026 às 18:30"
    const brPattern = /(\d{2})\/(\d{2})\/(\d{4})(?:\s*(?:as|às|ás|em|,)?\s*(\d{2}):(\d{2}))?/i;
    const match = raw.match(brPattern);
    if (match) {
      const [, d, m, y, h, min] = match;
      const hour = h || "12";
      const minute = min || "00";
      const iso = `${y}-${m}-${d}T${hour}:${minute}:00-03:00`;
      const parsed = new Date(iso);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    if (!isNaN(directDate.getTime())) {
      return directDate;
    }
  }

  return null;
}

/**
 * Encontra a data da atualização mais recente em uma lista de vagas.
 */
export function getLatestJobUpdateDate(jobs: JobOpening[]): Date | null {
  let latestDate: Date | null = null;

  for (const job of jobs) {
    const raw = job.updatedAt || job.createdAt;
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime()) && (!latestDate || d > latestDate)) {
        latestDate = d;
      }
    }
  }

  if (!latestDate) {
    for (const job of jobs) {
      const reg = job.registeredAt || job.registeredDate;
      if (reg) {
        const parsed = parseDateInput(reg);
        if (parsed && (!latestDate || parsed > latestDate)) {
          latestDate = parsed;
        }
      }
    }
  }

  if (!latestDate) {
    for (const job of jobs) {
      if (job.publishedDate) {
        const parsed = parseDateInput(job.publishedDate);
        if (parsed && (!latestDate || parsed > latestDate)) {
          latestDate = parsed;
        }
      }
    }
  }

  return latestDate;
}

/**
 * Formata o texto relativo da badge de atualização de acordo com as regras:
 * - Se atualizado hoje: "atualizado hoje às HH:MM"
 * - Se atualizado ontem: "atualizado ontem às HH:MM"
 * - Se atualizado há ≥ 2 dias: "atualizado em DD/MM às HH:MM"
 */
export function formatRelativeUpdateText(
  input: string | Date | { date: string; time: string } | null | undefined,
  refDate: Date = new Date()
): string {
  const targetDate = parseDateInput(input) || refDate;

  const targetParts = getSaoPauloDateParts(targetDate);
  const nowParts = getSaoPauloDateParts(refDate);

  // Calcula a diferença em dias civis baseado nas datas de Brasília
  const utcTarget = Date.UTC(targetParts.year, targetParts.month - 1, targetParts.day);
  const utcNow = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day);
  const diffDays = Math.round((utcNow - utcTarget) / (1000 * 60 * 60 * 24));

  const pad = (n: number) => String(n).padStart(2, "0");
  const timeStr = `${targetParts.hour}:${targetParts.minute}`;

  if (diffDays <= 0) {
    return `atualizado hoje às ${timeStr}`;
  }

  if (diffDays === 1) {
    return `atualizado ontem às ${timeStr}`;
  }

  const dateStr = `${pad(targetParts.day)}/${pad(targetParts.month)}`;
  return `atualizado em ${dateStr} às ${timeStr}`;
}

/**
 * Ordena uma lista de vagas pela data de publicação, da mais recente para a mais antiga.
 * Em caso de empate na data, utiliza registeredAt, createdAt ou updatedAt como desempate.
 */
export function sortJobsByPublishedDate(jobs: JobOpening[]): JobOpening[] {
  return [...jobs].sort((a, b) => {
    const dateA = parseDateInput(a.publishedDate);
    const dateB = parseDateInput(b.publishedDate);

    const timeA = dateA ? dateA.getTime() : 0;
    const timeB = dateB ? dateB.getTime() : 0;

    if (timeB !== timeA) {
      return timeB - timeA;
    }

    // Desempate secundário: registeredAt / registeredDate
    const regA = parseDateInput(a.registeredAt || a.registeredDate);
    const regB = parseDateInput(b.registeredAt || b.registeredDate);
    const timeRegA = regA ? regA.getTime() : 0;
    const timeRegB = regB ? regB.getTime() : 0;

    if (timeRegB !== timeRegA) {
      return timeRegB - timeRegA;
    }

    // Desempate terciário: createdAt / updatedAt
    const createA = parseDateInput(a.createdAt || a.updatedAt);
    const createB = parseDateInput(b.createdAt || b.updatedAt);
    const timeCreateA = createA ? createA.getTime() : 0;
    const timeCreateB = createB ? createB.getTime() : 0;

    return timeCreateB - timeCreateA;
  });
}
