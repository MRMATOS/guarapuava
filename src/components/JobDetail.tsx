"use client";

import React, { useEffect, useRef } from "react";
import { JobOpening } from "@/types/job";
import { ArrowLeft } from "lucide-react";
import { Dock } from "@/components/ui/Dock";
import { Key } from "@/components/ui/Key";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { FilterIndicator } from "@/components/ui/FilterIndicator";
import { Presence } from "@/components/ui/Presence";

interface JobDetailProps {
  jobs: JobOpening[];
  initialJobId?: string;
  onBack: () => void;

  // Estados e manipuladores dos filtros
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  contractState?: number;
  onCycleContract?: () => void;
  pcdState?: number;
  onCyclePcd?: () => void;
  experienceState?: number;
  onCycleExperience?: () => void;
  favoritesOnly?: boolean;
  onToggleFavoritesOnly?: () => void;
  isFilterOpen?: boolean;
  onToggleFilter?: () => void;
  onCloseFilter?: () => void;
  onResetFilters?: () => void;

  // Favoritos e histórico de visualizadas
  favoriteJobIds?: string[];
  onToggleFavorite?: (jobId: string) => void;
  onMarkJobViewed?: (jobId: string) => void;
}

export const JobDetail: React.FC<JobDetailProps> = ({
  jobs,
  initialJobId,
  onBack,
  searchQuery = "",
  onSearchChange,
  contractState = 0,
  onCycleContract,
  pcdState = 0,
  onCyclePcd,
  experienceState = 0,
  onCycleExperience,
  favoritesOnly = false,
  onToggleFavoritesOnly,
  isFilterOpen = false,
  onToggleFilter,
  onCloseFilter,
  onResetFilters,
  favoriteJobIds = [],
  onToggleFavorite,
  onMarkJobViewed,
}) => {
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const hasInitialScrolled = useRef(false);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      contractState !== 0 ||
      pcdState !== 0 ||
      experienceState !== 0 ||
      favoritesOnly
  );

  // Scroll inicial instantâneo até a vaga clicada (permite rolar tanto para cima quanto para baixo)
  useEffect(() => {
    if (hasInitialScrolled.current || jobs.length === 0) return;

    const targetId = initialJobId || jobs[0]?.id || jobs[0]?.externalId;
    if (!targetId) return;

    if (onMarkJobViewed) {
      onMarkJobViewed(targetId);
    }

    // Aguarda um pequeno tick para garantir que o DOM esteja montado
    const timer = setTimeout(() => {
      const el =
        cardRefs.current.get(targetId) ||
        document.getElementById(`vaga-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: "instant", block: "start" });
        hasInitialScrolled.current = true;
      }
    }, 10);

    return () => clearTimeout(timer);
  }, [initialJobId, jobs, onMarkJobViewed]);

  // Atualiza a URL hash via replaceState conforme o usuário rola o feed de detalhes
  useEffect(() => {
    if (jobs.length <= 1) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Encontra a vaga mais visível no terço superior de leitura da tela
        const visibleEntry = entries.find((entry) => entry.isIntersecting);
        if (visibleEntry) {
          const jobId = visibleEntry.target.getAttribute("data-job-id");
          if (jobId) {
            onMarkJobViewed?.(jobId);
            const nextHash = `#vaga-${jobId}`;
            if (window.location.hash !== nextHash) {
              window.history.replaceState(null, "", nextHash);
            }
          }
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0,
      }
    );

    cardRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [jobs, onMarkJobViewed]);

  return (
    <div className="page-shell">
      {/* Título semântico para SEO e acessibilidade */}
      <h1 className="sr-only">Vagas de Emprego em Guarapuava — Detalhes</h1>

      {/* Feed contínuo de cards de detalhe das vagas ou Estado Vazio */}
      {jobs.length > 0 ? (
        <div className="space-y-6">
          {jobs.map((job) => {
            const jobKey = job.id || job.externalId || "vaga";
            const targetUrl = job.sourceUrl || job.link || "#";

            return (
              <article
                key={jobKey}
                id={`vaga-${jobKey}`}
                data-job-id={jobKey}
                ref={(el) => {
                  if (el) {
                    cardRefs.current.set(jobKey, el);
                  } else {
                    cardRefs.current.delete(jobKey);
                  }
                }}
                className="surface-card w-full p-6 sm:p-7 scroll-mt-6"
              >
                {/* Título da vaga */}
                <h2 className="text-[20px] sm:text-[21px] font-bold leading-[1.3] text-ink tracking-[-0.02em] text-balance mb-5">
                  {job.title}
                </h2>

                {/* Tópicos principais */}
                <div className="space-y-2 text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body mb-5">
                  <p>
                    <strong className="font-bold text-ink">Empresa:</strong>{" "}
                    <span>{job.company}</span>
                  </p>
                  {job.intermediary && (
                    <p>
                      <strong className="font-bold text-ink">Intermediação:</strong>{" "}
                      <span>{job.intermediary}</span>
                    </p>
                  )}
                  {job.location && (
                    <p>
                      <strong className="font-bold text-ink">Localização:</strong>{" "}
                      <span>{job.location}</span>
                    </p>
                  )}
                  {job.workModel && (
                    <p>
                      <strong className="font-bold text-ink">Modalidade:</strong>{" "}
                      <span>{job.workModel}</span>
                    </p>
                  )}
                  {job.contractType && (
                    <p>
                      <strong className="font-bold text-ink">Tipo de Contrato:</strong>{" "}
                      <span>{job.contractType}</span>
                    </p>
                  )}
                  {job.compensation && (
                    <p>
                      <strong className="font-bold text-ink">Remuneração:</strong>{" "}
                      <span>{job.compensation}</span>
                    </p>
                  )}
                  {job.schedule && (
                    <p>
                      <strong className="font-bold text-ink">Jornada / Escala:</strong>{" "}
                      <span>{job.schedule}</span>
                    </p>
                  )}
                  <p>
                    <strong className="font-bold text-ink">Data de Publicação:</strong>{" "}
                    <span className="tabular-time">{job.publishedDate}</span>
                  </p>
                  {job.applicationDeadline && (
                    <p>
                      <strong className="font-bold text-ink">Prazo de Inscrição:</strong>{" "}
                      <span className="tabular-time font-semibold text-coral">
                        {job.applicationDeadline}
                      </span>
                    </p>
                  )}
                </div>

                {/* Linha pontilhada de separação */}
                <div
                  className="my-5 border-b border-dotted border-rule/90"
                  aria-hidden="true"
                />

                {/* Descrição da vaga */}
                {job.descriptionItems && job.descriptionItems.length > 0 && (
                  <section className="mb-5">
                    <h3 className="font-bold text-ink text-[15px] mb-3">
                      Descrição da Vaga:
                    </h3>
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

                {/* Requisitos */}
                {job.requirementItems && job.requirementItems.length > 0 && (
                  <>
                    <div
                      className="my-5 border-b border-dotted border-rule/90"
                      aria-hidden="true"
                    />
                    <section className="mb-5">
                      <h3 className="font-bold text-ink text-[15px] mb-3">
                        Requisitos:
                      </h3>
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
                  </>
                )}

                {/* Benefícios */}
                {job.benefitItems && job.benefitItems.length > 0 && (
                  <>
                    <div
                      className="my-5 border-b border-dotted border-rule/90"
                      aria-hidden="true"
                    />
                    <section className="mb-5">
                      <h3 className="font-bold text-ink text-[15px] mb-3">
                        Benefícios:
                      </h3>
                      <ul className="space-y-2.5 text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
                        {job.benefitItems.map((item, idx) => (
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
                  </>
                )}

                {/* Instruções de candidatura */}
                {job.applicationInstructions && (
                  <>
                    <div
                      className="my-5 border-b border-dotted border-rule/90"
                      aria-hidden="true"
                    />
                    <section className="mb-5">
                      <h3 className="font-bold text-ink text-[15px] mb-2">
                        Como se candidatar:
                      </h3>
                      <p className="text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
                        {job.applicationInstructions}
                      </p>
                    </section>
                  </>
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
                        <h3 className="font-bold text-ink text-[15px] mb-2">
                          {info.label}:
                        </h3>
                        <p className="text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
                          {info.text}
                        </p>
                      </section>
                    ))}
                  </>
                )}

                {/* Linha pontilhada antes do botão de ação */}
                <div
                  className="my-5 border-b border-dotted border-rule/90"
                  aria-hidden="true"
                />

                {/* Botões de Ação dentro do próprio card: Abrir site e Favoritar */}
                <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="key key--coral w-full sm:w-auto inline-flex items-center justify-center px-6"
                  >
                    Abrir site da vaga
                  </a>

                  {onToggleFavorite && (
                    <Key
                      pressed={
                        Boolean(
                          favoriteJobIds.includes(jobKey) ||
                            (job.id && favoriteJobIds.includes(job.id)) ||
                            (job.externalId &&
                              favoriteJobIds.includes(job.externalId))
                        )
                      }
                      onClick={() => onToggleFavorite(jobKey)}
                      className="w-full sm:w-auto px-5 text-[14px]"
                      aria-label={
                        favoriteJobIds.includes(jobKey) ||
                        (job.id && favoriteJobIds.includes(job.id)) ||
                        (job.externalId &&
                          favoriteJobIds.includes(job.externalId))
                          ? "Remover dos favoritos"
                          : "Salvar como favorita"
                      }
                    >
                      {favoriteJobIds.includes(jobKey) ||
                      (job.id && favoriteJobIds.includes(job.id)) ||
                      (job.externalId &&
                        favoriteJobIds.includes(job.externalId))
                        ? "Desfavoritar"
                        : "Favoritar"}
                    </Key>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="surface-card w-full p-8 text-center text-ink-muted text-[15px]">
          <p className="font-semibold text-ink mb-1.5">
            Nenhuma vaga encontrada
          </p>
          <p className="text-[12.5px] text-ink-muted mb-5 max-w-[280px] mx-auto leading-relaxed">
            Nenhum resultado corresponde aos filtros selecionados. Tente
            modificar a palavra-chave ou os filtros no botão abaixo.
          </p>
          {onResetFilters && (
            <Key onClick={onResetFilters} className="mx-auto">
              Limpar todos os filtros
            </Key>
          )}
        </div>
      )}

      {/* Footer com botão Filtrar e Voltar agrupados à direita */}
      <Dock
        align="end"
        above={
          <>
            <Presence isVisible={Boolean(hasActiveFilters && onResetFilters)} duration={200}>
              {onResetFilters && (
                <FilterIndicator
                  label={
                    <span>
                      Exibindo{" "}
                      <strong className="text-ink font-bold">
                        {jobs.length}
                      </strong>{" "}
                      {jobs.length === 1
                        ? "vaga encontrada"
                        : "vagas encontradas"}
                    </span>
                  }
                  onClear={onResetFilters}
                />
              )}
            </Presence>
            <Presence isVisible={Boolean(isFilterOpen && onCloseFilter)} duration={200}>
              {onCloseFilter && (
                <FilterPanel
                  mode="vagas"
                  onClose={onCloseFilter}
                  filterButtonRef={filterButtonRef}
                  contractState={contractState}
                  onCycleContract={onCycleContract ?? (() => {})}
                  pcdState={pcdState}
                  onCyclePcd={onCyclePcd ?? (() => {})}
                  experienceState={experienceState}
                  onCycleExperience={onCycleExperience ?? (() => {})}
                  searchQuery={searchQuery}
                  onSearchChange={onSearchChange ?? (() => {})}
                  favoritesOnly={favoritesOnly}
                  onToggleFavoritesOnly={onToggleFavoritesOnly}
                />
              )}
            </Presence>
          </>
        }
        aria-label="Ações e filtros da vaga"
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          {onToggleFilter && (
            <Key
              ref={filterButtonRef}
              pressed={isFilterOpen}
              onClick={onToggleFilter}
              aria-expanded={isFilterOpen}
              aria-label={
                isFilterOpen
                  ? "Fechar bloco de filtros"
                  : "Abrir bloco de filtros"
              }
              className="px-2.5 sm:px-3.5 text-[14px]"
            >
              Filtrar
            </Key>
          )}

          <Key
            variant="icon"
            onClick={onBack}
            aria-label="Voltar para a lista de vagas"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.2} />
          </Key>
        </div>
      </Dock>
    </div>
  );
};
