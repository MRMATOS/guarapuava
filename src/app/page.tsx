"use client";

import React, { useState, useEffect } from "react";
import { initialDigest, availableTags } from "@/data/mockNews";
import { mockJobs } from "@/data/mockJobs";
import { JobOpening } from "@/types/job";
import { HomeFeed } from "@/components/HomeFeed";
import { DetailedFeed } from "@/components/DetailedFeed";
import { JobsFeed } from "@/components/JobsFeed";
import { JobDetail } from "@/components/JobDetail";
import { listActiveJobs } from "@/lib/supabase/jobs";

type ActiveView = "home" | "details" | "vagas" | "vaga-detail";

export default function Page() {
  const [view, setView] = useState<ActiveView>("home");
  const [jobs, setJobs] = useState<JobOpening[]>(mockJobs);
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);

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
        if (view === "vaga-detail") {
          navigateTo("vagas");
        } else if (view !== "home") {
          navigateTo("home");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view]);

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink flex justify-center">
      {view === "home" && (
        <HomeFeed
          digest={initialDigest}
          onOpenDetails={() => navigateTo("details")}
          onSelectVagas={() => navigateTo("vagas")}
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
          onSelectNoticias={() => navigateTo("home")}
        />
      )}

      {view === "vaga-detail" && (selectedJob || jobs[0]) && (
        <JobDetail
          job={selectedJob || jobs[0]}
          onBack={() => navigateTo("vagas")}
        />
      )}
    </div>
  );
}
