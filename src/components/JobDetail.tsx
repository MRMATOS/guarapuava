"use client";

import React from "react";
import { JobOpening } from "@/types/job";
import { ArrowLeft } from "lucide-react";
import { Dock } from "@/components/ui/Dock";
import { Key } from "@/components/ui/Key";

interface JobDetailProps {
  job: JobOpening;
  onBack: () => void;
}

export const JobDetail: React.FC<JobDetailProps> = ({ job, onBack }) => {
  return (
    <div className="page-shell">
      <main className="surface-card w-full p-6 sm:p-7">
        {/* Título da vaga */}
        <h1 className="text-[20px] sm:text-[21px] font-bold leading-[1.3] text-ink tracking-[-0.02em] text-balance mb-5">
          {job.title}
        </h1>

        {/* Tópicos principais (apenas rótulos em negrito, sem bullet points) */}
        <div className="space-y-2 text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body mb-5">
          <p>
            <strong className="font-bold text-ink">Empresa:</strong>{" "}
            <span>{job.company}</span>
          </p>
          {job.location && (
            <p>
              <strong className="font-bold text-ink">Localização:</strong>{" "}
              <span>{job.location}</span>
            </p>
          )}
          <p>
            <strong className="font-bold text-ink">Data de Publicação:</strong>{" "}
            <span className="tabular-time">{job.publishedDate}</span>
          </p>
        </div>

        {/* Linha pontilhada de separação */}
        <div
          className="my-5 border-b border-dotted border-rule/90"
          aria-hidden="true"
        />

        {/* Descrição da vaga (com bullet points internos) */}
        {job.descriptionItems && job.descriptionItems.length > 0 && (
          <section className="mb-5">
            <h2 className="font-bold text-ink text-[15px] mb-3">
              Descrição da Vaga:
            </h2>
            <ul className="space-y-2.5 text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
              {job.descriptionItems.map((item, idx) => (
                <li key={idx} className="flex items-start">
                  <span
                    className="mr-2.5 text-coral font-black text-[15px] leading-[1.1] select-none shrink-0"
                    aria-hidden="true"
                  >
                    •
                  </span>
                  <span className="flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Linha pontilhada de separação */}
        <div
          className="my-5 border-b border-dotted border-rule/90"
          aria-hidden="true"
        />

        {/* Requisitos (com bullet points internos) */}
        {job.requirementItems && job.requirementItems.length > 0 && (
          <section className="mb-2">
            <h2 className="font-bold text-ink text-[15px] mb-3">
              Requisitos:
            </h2>
            <ul className="space-y-2.5 text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
              {job.requirementItems.map((item, idx) => (
                <li key={idx} className="flex items-start">
                  <span
                    className="mr-2.5 text-coral font-black text-[15px] leading-[1.1] select-none shrink-0"
                    aria-hidden="true"
                  >
                    •
                  </span>
                  <span className="flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Informações adicionais flexíveis caso a vaga possua */}
        {job.additionalInfo && job.additionalInfo.length > 0 && (
          <>
            <div
              className="my-5 border-b border-dotted border-rule/90"
              aria-hidden="true"
            />
            {job.additionalInfo.map((info, idx) => (
              <section key={idx} className="mb-3">
                <h2 className="font-bold text-ink text-[15px] mb-2">
                  {info.label}:
                </h2>
                <p className="text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
                  {info.text}
                </p>
              </section>
            ))}
          </>
        )}
      </main>

      {/* Footer com botão Abrir site da vaga (laranja, à esquerda) e Voltar (à direita) */}
      <Dock align="between" aria-label="Ações da vaga">
        <a
          href={job.link}
          target="_blank"
          rel="noopener noreferrer"
          className="key key--coral px-4 sm:px-5"
        >
          Abrir site da vaga
        </a>

        <Key
          variant="icon"
          onClick={onBack}
          aria-label="Voltar para a lista de vagas"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2.2} />
        </Key>
      </Dock>
    </div>
  );
};
