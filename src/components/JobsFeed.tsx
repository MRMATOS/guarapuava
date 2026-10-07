"use client";

import React, { useMemo } from "react";
import { JobOpening } from "@/types/job";
import { MainNav } from "@/components/ui/MainNav";

interface JobsFeedProps {
  jobs: JobOpening[];
  onSelectJob: (job: JobOpening) => void;
  onSelectNoticias: () => void;
  lastUpdated?: string;
}

/**
 * Formata o timestamp da última atualização no padrão: DD/MM - HH:MM (horário de Brasília)
 */
function formatLastUpdated(jobs: JobOpening[], customText?: string): string {
  if (customText) return customText;

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
      const reg = job.registeredAt || (job as Record<string, any>).registeredDate;
      if (typeof reg === "string") {
        const match = reg.match(
          /([0-9]{2})\/([0-9]{2})\/([0-9]{4})\s*(?:as|às|ás)\s*([0-9]{2}):([0-9]{2})/i
        );
        if (match) {
          const [, day, month, year, hour, minute] = match;
          const d = new Date(`${year}-${month}-${day}T${hour}:${minute}:00-03:00`);
          if (!isNaN(d.getTime()) && (!latestDate || d > latestDate)) {
            latestDate = d;
          }
        }
      }
    }
  }

  const target = latestDate || new Date();

  try {
    const parts = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(target);

    const day = parts.find((p) => p.type === "day")?.value || "07";
    const month = parts.find((p) => p.type === "month")?.value || "10";
    const hour = parts.find((p) => p.type === "hour")?.value || "12";
    const minute = parts.find((p) => p.type === "minute")?.value || "00";

    return `${day}/${month} - ${hour}:${minute}`;
  } catch {
    return "07/10 - 12:00";
  }
}

export const JobsFeed: React.FC<JobsFeedProps> = ({
  jobs,
  onSelectJob,
  onSelectNoticias,
  lastUpdated,
}) => {
  const lastUpdatedDisplay = useMemo(
    () => formatLastUpdated(jobs, lastUpdated),
    [jobs, lastUpdated]
  );

  return (
    <div className="page-shell">
      {/* Título semântico para acessibilidade/SEO */}
      <h1 className="sr-only">Vagas em Guarapuava</h1>

      {/* Indicador de última atualização alinhado à direita */}
      <div className="flex justify-end mb-4 px-1 tracking-tight">
        <span className="font-semibold text-ink text-[14px] sm:text-[14.5px] tabular-time">
          Última atualização: {lastUpdatedDisplay}
        </span>
      </div>

      {/* Lista de cartões de vagas */}
      <div className="space-y-4">
        {jobs.map((job) => (
          <article
            key={job.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectJob(job)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectJob(job);
              }
            }}
            aria-label={`Ver detalhes da vaga: ${job.title}`}
            className="surface-card w-full p-5 sm:p-6 cursor-pointer transition-transform duration-150 active:scale-[0.99] touch-manipulation select-none"
          >
            {/* 1. Título da vaga */}
            <h2 className="text-[15px] font-bold text-ink leading-[1.35] tracking-[-0.015em] mb-2 text-balance">
              {job.title}
            </h2>

            {/* 2. Nome da empresa */}
            <p className="text-[14px] sm:text-[14.5px] text-ink-muted leading-[1.4]">
              <strong className="font-semibold text-ink-body">Empresa:</strong>{" "}
              <span>{job.company}</span>
            </p>

            {/* 3. Data da publicação alinhada à direita */}
            <div className="mt-3 pt-1 text-right text-[12.5px] text-ink-muted tabular-time">
              <span>Data da publicação: </span>
              <strong className="font-medium text-ink-body">{job.publishedDate}</strong>
            </div>
          </article>
        ))}
      </div>

      {/* Footer com navegação principal padrão (Vagas afundada) */}
      <MainNav
        active="vagas"
        onNoticias={onSelectNoticias}
        onVagas={() => {}}
      />
    </div>
  );
};
