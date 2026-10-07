"use client";

import React, { useMemo } from "react";
import { JobOpening } from "@/types/job";
import { MainNav } from "@/components/ui/MainNav";
import {
  getTodayDateString,
  getLatestJobUpdateDate,
  formatRelativeUpdateText,
} from "@/lib/utils/date";

interface JobsFeedProps {
  jobs: JobOpening[];
  onSelectJob: (job: JobOpening) => void;
  onSelectNoticias: () => void;
  lastUpdated?: string;
}

export const JobsFeed: React.FC<JobsFeedProps> = ({
  jobs,
  onSelectJob,
  onSelectNoticias,
  lastUpdated,
}) => {
  const todayDisplay = useMemo(() => getTodayDateString(), []);

  const lastUpdatedDisplay = useMemo(() => {
    if (lastUpdated) {
      return formatRelativeUpdateText(lastUpdated);
    }
    const latestDate = getLatestJobUpdateDate(jobs);
    return formatRelativeUpdateText(latestDate);
  }, [jobs, lastUpdated]);

  return (
    <div className="page-shell">
      {/* Título semântico para acessibilidade/SEO */}
      <h1 className="sr-only">Vagas em Guarapuava</h1>

      {/* Card compacto com data de hoje e status da última atualização */}
      <div className="surface-card w-full px-5 py-3.5 sm:px-6 sm:py-4 mb-4 flex items-center justify-between tracking-tight tabular-time">
        <span className="font-semibold text-ink text-[15px]">
          {todayDisplay}
        </span>
        <span className="badge-inset">
          <span
            className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse"
            aria-hidden="true"
          />
          {lastUpdatedDisplay}
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

