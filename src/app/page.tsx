"use client";

import React, { useState, useEffect, useMemo } from "react";
import { initialDigest, availableTags } from "@/data/mockNews";
import { mockJobs } from "@/data/mockJobs";
import { JobOpening } from "@/types/job";
import { HomeFeed } from "@/components/HomeFeed";
import { DetailedFeed } from "@/components/DetailedFeed";
import { JobsFeed } from "@/components/JobsFeed";
import { JobDetail } from "@/components/JobDetail";
import { listActiveJobs } from "@/lib/supabase/jobs";
import { filterJobs } from "@/lib/utils/search";

type ActiveView = "home" | "details" | "vagas" | "vaga-detail";

export default function Page() {
  const [view, setView] = useState<ActiveView>("home");
  const [jobs, setJobs] = useState<JobOpening[]>(mockJobs);
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);

  // Estados dos filtros de Vagas (persistem na navegação)
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [contractState, setContractState] = useState(0); // 0 = Contrato, 1 = CLT, 2 = PJ
  const [pcdState, setPcdState] = useState(0); // 0 = PCD, 1 = Somente PCD, 2 = Aceita PCD
  const [experienceState, setExperienceState] = useState(0); // 0 = Experiência, 1 = Com experiência, 2 = Sem experiência
  const [isJobFilterOpen, setIsJobFilterOpen] = useState(false);

  const handleCycleContract = () => setContractState((prev) => (prev + 1) % 3);
  const handleCyclePcd = () => setPcdState((prev) => (prev + 1) % 3);
  const handleCycleExperience = () => setExperienceState((prev) => (prev + 1) % 3);
  const handleResetJobFilters = () => {
    setJobSearchQuery("");
    setContractState(0);
    setPcdState(0);
    setExperienceState(0);
  };

  // Aplica a busca universal e os 3 botões combináveis na lista de vagas
  const filteredJobs = useMemo(() => {
    return filterJobs(jobs, {
      query: jobSearchQuery,
      contractState,
      pcdState,
      experienceState,
    });
  }, [jobs, jobSearchQuery, contractState, pcdState, experienceState]);

  // Vagas a serem exibidas no feed de detalhes (mantém os filtros ativos)
  const detailFeedJobs = filteredJobs;

  // Estados dos filtros de Notícias
  const [newsSearchQuery, setNewsSearchQuery] = useState("");
  const [selectedNewsCategory, setSelectedNewsCategory] = useState<string | null>(null);
  const [isNewsFilterOpen, setIsNewsFilterOpen] = useState(false);
  const handleResetNewsFilters = () => {
    setNewsSearchQuery("");
    setSelectedNewsCategory(null);
  };

  // Carrega vagas do Supabase com fallback seguro para mockJobs
  useEffect(() => {
    async function loadJobs() {
      try {
        const liveJobs = await listActiveJobs();
        if (liveJobs && liveJobs.length > 0) {
          setJobs(liveJobs);
        }
      } catch (err) {
        console.warn("Usando mockJobs como fallback:", err);
      }
    }
    loadJobs();
  }, []);

  // Sincroniza com o histórico do navegador e suporta o botão/gesto voltar nativo do celular
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash;
      if (hash === "#noticias") {
        setView("details");
      } else if (hash.startsWith("#vaga-")) {
        const jobId = hash.replace("#vaga-", "");
        const found = jobs.find((j) => j.id === jobId || j.externalId === jobId);
        if (found) {
          setSelectedJob(found);
          setView("vaga-detail");
        } else {
          setView("vagas");
        }
      } else if (hash === "#vagas") {
        setView("vagas");
      } else {
        setView("home");
      }
    };

    handlePopState();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [jobs]);

  const navigateTo = (newView: ActiveView, job?: JobOpening) => {
    setView(newView);
    if (job) {
      setSelectedJob(job);
    }
    try {
      if (newView === "details") {
        window.history.pushState(null, "", "#noticias");
      } else if (newView === "vagas") {
        window.history.pushState(null, "", "#vagas");
      } else if (newView === "vaga-detail" && job) {
        const key = job.id || job.externalId || "vaga";
        window.history.pushState(null, "", `#vaga-${key}`);
      } else {
        window.history.pushState(null, "", window.location.pathname);
      }
    } catch {
      // Ignora erro em ambientes sem suporte
    }
  };

  // Suporte à tecla Esc no desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isJobFilterOpen) {
          setIsJobFilterOpen(false);
          return;
        }
        if (isNewsFilterOpen) {
          setIsNewsFilterOpen(false);
          return;
        }
        if (view === "vaga-detail") {
          navigateTo("vagas");
        } else if (view !== "home") {
          navigateTo("home");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, isJobFilterOpen, isNewsFilterOpen]);

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink flex justify-center">
      {view === "home" && (
        <HomeFeed
          digest={initialDigest}
          onOpenDetails={() => navigateTo("details")}
          onSelectVagas={() => {
            setIsNewsFilterOpen(false);
            navigateTo("vagas");
          }}
          searchQuery={newsSearchQuery}
          onSearchChange={setNewsSearchQuery}
          selectedCategory={selectedNewsCategory}
          onSelectCategory={setSelectedNewsCategory}
          isFilterOpen={isNewsFilterOpen}
          onToggleFilter={() => setIsNewsFilterOpen((prev) => !prev)}
          onCloseFilter={() => setIsNewsFilterOpen(false)}
          onResetFilters={handleResetNewsFilters}
        />
      )}

      {view === "details" && (
        <DetailedFeed
          digest={initialDigest}
          tags={availableTags}
          onBack={() => navigateTo("home")}
        />
      )}

      {view === "vagas" && (
        <JobsFeed
          jobs={jobs}
          onSelectJob={(job) => navigateTo("vaga-detail", job)}
          onSelectNoticias={() => {
            setIsJobFilterOpen(false);
            navigateTo("home");
          }}
          searchQuery={jobSearchQuery}
          onSearchChange={setJobSearchQuery}
          contractState={contractState}
          onCycleContract={handleCycleContract}
          pcdState={pcdState}
          onCyclePcd={handleCyclePcd}
          experienceState={experienceState}
          onCycleExperience={handleCycleExperience}
          isFilterOpen={isJobFilterOpen}
          onToggleFilter={() => setIsJobFilterOpen((prev) => !prev)}
          onCloseFilter={() => setIsJobFilterOpen(false)}
          onResetFilters={handleResetJobFilters}
        />
      )}

      {view === "vaga-detail" && (selectedJob || jobs[0]) && (
        <JobDetail
          jobs={detailFeedJobs}
          initialJobId={selectedJob?.id || selectedJob?.externalId}
          onBack={() => {
            setIsJobFilterOpen(false);
            navigateTo("vagas");
          }}
          searchQuery={jobSearchQuery}
          onSearchChange={setJobSearchQuery}
          contractState={contractState}
          onCycleContract={handleCycleContract}
          pcdState={pcdState}
          onCyclePcd={handleCyclePcd}
          experienceState={experienceState}
          onCycleExperience={handleCycleExperience}
          isFilterOpen={isJobFilterOpen}
          onToggleFilter={() => setIsJobFilterOpen((prev) => !prev)}
          onCloseFilter={() => setIsJobFilterOpen(false)}
          onResetFilters={handleResetJobFilters}
        />
      )}
    </div>
  );
}
