"use client";

import React from "react";
import { JobOpening } from "@/types/job";
import { MainNav } from "@/components/ui/MainNav";

interface JobsFeedProps {
  jobs: JobOpening[];
  onSelectJob: (job: JobOpening) => void;
  onSelectNoticias: () => void;
}

export const JobsFeed: React.FC<JobsFeedProps> = ({
  jobs,
  onSelectJob,
  onSelectNoticias,
}) => {
  return (
    <div className="page-shell">
      {/* Cabeçalho da seção de vagas: título à esquerda, data à direita na mesma linha */}
      <div className="flex items-baseline justify-between mb-5 px-1 tracking-tight">
        <h1 className="text-[20px] sm:text-[21px] font-bold leading-[1.3] text-ink tracking-[-0.02em]">
          Vagas em Guarapuava
        </h1>
        <span className="font-semibold text-ink text-[15px] tabular-time shrink-0 ml-3">
          06/10/2026
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
