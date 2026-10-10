"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { DailyDigest } from "@/types/news";
import { JobOpening } from "@/types/job";
import { HomeFeed } from "@/components/HomeFeed";
import { DetailedFeed } from "@/components/DetailedFeed";
import { JobsFeed } from "@/components/JobsFeed";
import { JobDetail } from "@/components/JobDetail";
import { InfoFeed } from "@/components/InfoFeed";
import { NewsCardSkeleton } from "@/components/ui/NewsCardSkeleton";
import { DesktopStage } from "@/components/desktop/DesktopStage";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { listActiveJobs } from "@/lib/supabase/jobs";
import { listActiveNewsDigests } from "@/lib/supabase/news";
import { filterJobs, normalizeCategory, DEFAULT_NEWS_CATEGORIES } from "@/lib/utils/search";
import { sortJobsByPublishedDate } from "@/lib/utils/date";
import {
  getViewedJobIds,
  saveViewedJobId,
  getFavoriteJobIds,
  toggleFavoriteJobId,
  getCachedNewsDigests,
  saveCachedNewsDigests,
  getCachedJobs,
  saveCachedJobs,
} from "@/lib/utils/storage";

type ActiveView = "home" | "details" | "vagas" | "vaga-detail" | "info";

export default function Page() {
  const [view, setView] = useState<ActiveView>("home");
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);

  // Estados das Notícias (Multi-dia e digest selecionado)
  const [newsDigests, setNewsDigests] = useState<DailyDigest[]>([]);
  const [selectedDigest, setSelectedDigest] = useState<DailyDigest | null>(null);
  const [isLoadingNews, setIsLoadingNews] = useState(true);

  // Estados dos filtros de Vagas (persistem na navegação)
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [contractState, setContractState] = useState(0); // 0 = Contrato, 1 = CLT, 2 = PJ
  const [pcdState, setPcdState] = useState(0); // 0 = PCD, 1 = Somente PCD, 2 = Aceita PCD
  const [experienceState, setExperienceState] = useState(0); // 0 = Experiência, 1 = Com experiência, 2 = Sem experiência
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteJobIds, setFavoriteJobIds] = useState<string[]>(getFavoriteJobIds);
  const [viewedJobIds, setViewedJobIds] = useState<string[]>(getViewedJobIds);
  const [isJobFilterOpen, setIsJobFilterOpen] = useState(false);
  const [isDesktopInfoOpen, setIsDesktopInfoOpen] = useState(false);

  // Rastreamento de navegação e posição de scroll para restauração precisa
  const hasNavigatedInApp = useRef(false);
  const savedVagasScrollY = useRef(0);

  const handleToggleFavorite = useCallback((jobId: string) => {
    const updated = toggleFavoriteJobId(jobId);
    setFavoriteJobIds(updated);
  }, []);

  const handleMarkJobViewed = useCallback((jobId: string) => {
    const updated = saveViewedJobId(jobId);
    setViewedJobIds(updated);
  }, []);

  const handleToggleFavoritesOnly = () => {
    setFavoritesOnly((prev) => !prev);
  };

  const handleCycleContract = () => setContractState((prev) => (prev + 1) % 3);
  const handleCyclePcd = () => setPcdState((prev) => (prev + 1) % 3);
  const handleCycleExperience = () => setExperienceState((prev) => (prev + 1) % 3);
  const handleResetJobFilters = () => {
    setJobSearchQuery("");
    setContractState(0);
    setPcdState(0);
    setExperienceState(0);
    setFavoritesOnly(false);
  };

  // Aplica a busca universal e os botões combináveis na lista de vagas
  const filteredJobs = useMemo(() => {
    const list = filterJobs(jobs, {
      query: jobSearchQuery,
      contractState,
      pcdState,
      experienceState,
      favoritesOnly,
      favoriteJobIds,
    });
    return sortJobsByPublishedDate(list);
  }, [jobs, jobSearchQuery, contractState, pcdState, experienceState, favoritesOnly, favoriteJobIds]);

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

  // Carrega vagas e notícias: primeiro do cache local (instantâneo), depois do Supabase
  useEffect(() => {
    // 1. Restauração imediata a partir do cache local
    const cachedNews = getCachedNewsDigests();
    if (cachedNews.length > 0) {
      setNewsDigests(cachedNews);
      setSelectedDigest((prev) => prev || cachedNews[0]);
      setIsLoadingNews(false);
    }

    const cachedJobs = getCachedJobs();
    if (cachedJobs.length > 0) {
      setJobs(sortJobsByPublishedDate(cachedJobs));
      setIsLoadingJobs(false);
    }

    // 2. Consulta concorrente ao Supabase (Stale-While-Revalidate)
    async function loadJobs() {
      try {
        const liveJobs = await listActiveJobs();
        if (liveJobs && liveJobs.length > 0) {
          const sorted = sortJobsByPublishedDate(liveJobs);
          setJobs(sorted);
          saveCachedJobs(sorted);
        }
      } catch (err) {
        console.warn("Falha ao consultar vagas no Supabase:", err);
      } finally {
        setIsLoadingJobs(false);
      }
    }

    async function loadNews() {
      try {
        const liveDigests = await listActiveNewsDigests();
        if (liveDigests && liveDigests.length > 0) {
          setNewsDigests(liveDigests);
          saveCachedNewsDigests(liveDigests);
          setSelectedDigest((prev) => {
            if (prev) {
              const matched = liveDigests.find((d) => d.date === prev.date);
              if (matched) return matched;
            }
            return liveDigests[0];
          });
        }
      } catch (err) {
        console.warn("Falha ao consultar notícias no Supabase:", err);
      } finally {
        setIsLoadingNews(false);
      }
    }

    loadJobs();
    loadNews();
  }, []);

  // Extrai tags únicas disponíveis a partir dos lotes do dia selecionado (deduplicadas e ordenadas)
  const currentNewsTags = useMemo(() => {
    if (!selectedDigest || !selectedDigest.batches) return DEFAULT_NEWS_CATEGORIES;
    const tagSet = new Set<string>();
    for (const batch of selectedDigest.batches) {
      for (const item of batch.items) {
        if (item.category) {
          tagSet.add(normalizeCategory(item.category));
        }
      }
    }
    if (tagSet.size === 0) return DEFAULT_NEWS_CATEGORIES;
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [selectedDigest]);

  // Extrai todas as categorias disponíveis somando todos os dias ativos no portal
  const allNewsCategories = useMemo(() => {
    const tagSet = new Set<string>();
    for (const digest of newsDigests) {
      if (!digest.batches) continue;
      for (const batch of digest.batches) {
        for (const item of batch.items) {
          if (item.category) {
            tagSet.add(normalizeCategory(item.category));
          }
        }
      }
    }
    if (tagSet.size === 0) return DEFAULT_NEWS_CATEGORIES;
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [newsDigests]);

  // Sincroniza com o histórico do navegador e suporta o botão/gesto voltar nativo do celular
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash;
      if (hash === "#informacoes" || hash === "#info") {
        setView("info");
      } else if (hash === "#noticias" || hash.startsWith("#noticia-")) {
        if (hash.startsWith("#noticia-")) {
          const datePart = hash.replace("#noticia-", "").replace(/-/g, "/");
          const found = newsDigests.find((d) => d.date === datePart);
          if (found) {
            setSelectedDigest(found);
          }
        }
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
        const targetY = savedVagasScrollY.current;
        requestAnimationFrame(() => {
          window.scrollTo({ top: targetY || 0, behavior: "instant" });
        });
      } else {
        setView("home");
      }
    };

    handlePopState();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [jobs, newsDigests]);

  const navigateTo = useCallback(
    (newView: ActiveView, job?: JobOpening, digest?: DailyDigest) => {
      setView(newView);
      if (job) {
        setSelectedJob(job);
      }
      if (digest) {
        setSelectedDigest(digest);
      }
      try {
        if (newView === "info") {
          window.history.pushState(null, "", "#informacoes");
        } else if (newView === "details") {
          const targetDate = (digest || selectedDigest)?.date;
          if (targetDate) {
            const key = targetDate.replace(/\//g, "-");
            window.history.pushState(null, "", `#noticia-${key}`);
          }
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
    },
    [selectedDigest]
  );

  const handleBackFromJobDetail = useCallback(() => {
    setIsJobFilterOpen(false);
    if (hasNavigatedInApp.current && window.history.length > 1) {
      window.history.back();
    } else {
      navigateTo("vagas");
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedVagasScrollY.current || 0, behavior: "instant" });
      });
    }
  }, [navigateTo]);

  // Suporte à tecla Esc no desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDesktopInfoOpen) {
          setIsDesktopInfoOpen(false);
          return;
        }
        if (isJobFilterOpen) {
          setIsJobFilterOpen(false);
          return;
        }
        if (isNewsFilterOpen) {
          setIsNewsFilterOpen(false);
          return;
        }
        if (view === "vaga-detail") {
          handleBackFromJobDetail();
          return;
        }
        if (view === "details") {
          navigateTo("home");
          return;
        }
        if (view === "info") {
          navigateTo("home");
          return;
        }
        if (view !== "home") {
          navigateTo("home");
          return;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, isDesktopInfoOpen, isJobFilterOpen, isNewsFilterOpen, handleBackFromJobDetail, navigateTo]);

  const desktopActiveTab: "noticias" | "vagas" =
    view === "vagas" || view === "vaga-detail" ? "vagas" : "noticias";

  const isDesktopDetailOpen = view === "details" || view === "vaga-detail";
  const isDesktopInfoActive = isDesktopInfoOpen || view === "info";

  const handleDesktopSelectTab = (tab: "noticias" | "vagas") => {
    setIsDesktopInfoOpen(false);
    if (tab === "vagas") {
      savedVagasScrollY.current = 0;
      navigateTo("vagas");
    } else {
      navigateTo("home");
    }
  };

  const handleDesktopCloseDetail = () => {
    if (view === "details") {
      navigateTo("home");
    } else if (view === "vaga-detail") {
      handleBackFromJobDetail();
    }
  };

  const handleToggleDesktopInfo = () => {
    if (isDesktopInfoActive) {
      setIsDesktopInfoOpen(false);
      if (view === "info") {
        navigateTo(desktopActiveTab === "vagas" ? "vagas" : "home");
      }
    } else {
      setIsDesktopInfoOpen(true);
    }
  };

  const handleCloseDesktopInfo = () => {
    setIsDesktopInfoOpen(false);
    if (view === "info") {
      navigateTo(desktopActiveTab === "vagas" ? "vagas" : "home");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink flex justify-center">
      {/* 1. Casca Mobile / Tablet (< 1024px) com Dock Inferior intacto */}
      <div className="lg:hidden w-full flex justify-center">
        {view === "home" && (
          <HomeFeed
            digests={newsDigests}
            categories={allNewsCategories}
            isLoading={isLoadingNews}
            onOpenDetails={(d) => navigateTo("details", undefined, d)}
            onSelectVagas={() => {
              savedVagasScrollY.current = 0;
              setIsNewsFilterOpen(false);
              navigateTo("vagas");
            }}
            onSelectInfo={() => {
              setIsNewsFilterOpen(false);
              navigateTo("info");
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

        {view === "details" && selectedDigest ? (
          <DetailedFeed
            digest={selectedDigest}
            tags={currentNewsTags}
            onBack={() => navigateTo("home")}
          />
        ) : view === "details" ? (
          <div className="page-shell">
            <div className="w-full space-y-4">
              <NewsCardSkeleton />
            </div>
          </div>
        ) : null}

        {view === "vagas" && (
          <JobsFeed
            jobs={jobs}
            isLoading={isLoadingJobs}
            onSelectJob={(job) => {
              hasNavigatedInApp.current = true;
              savedVagasScrollY.current = window.scrollY;
              const key = job.id || job.externalId || "";
              if (key) handleMarkJobViewed(key);
              navigateTo("vaga-detail", job);
            }}
            onSelectNoticias={() => {
              setIsJobFilterOpen(false);
              navigateTo("home");
            }}
            onSelectInfo={() => {
              setIsJobFilterOpen(false);
              navigateTo("info");
            }}
            searchQuery={jobSearchQuery}
            onSearchChange={setJobSearchQuery}
            contractState={contractState}
            onCycleContract={handleCycleContract}
            pcdState={pcdState}
            onCyclePcd={handleCyclePcd}
            experienceState={experienceState}
            onCycleExperience={handleCycleExperience}
            favoritesOnly={favoritesOnly}
            onToggleFavoritesOnly={handleToggleFavoritesOnly}
            favoriteJobIds={favoriteJobIds}
            viewedJobIds={viewedJobIds}
            isFilterOpen={isJobFilterOpen}
            onToggleFilter={() => setIsJobFilterOpen((prev) => !prev)}
            onCloseFilter={() => setIsJobFilterOpen(false)}
            onResetFilters={handleResetJobFilters}
          />
        )}

        {view === "info" && (
          <InfoFeed
            onSelectNoticias={() => {
              navigateTo("home");
            }}
            onSelectVagas={() => {
              savedVagasScrollY.current = 0;
              navigateTo("vagas");
            }}
            onSelectInfo={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {view === "vaga-detail" && (selectedJob || jobs[0]) && (
          <JobDetail
            jobs={detailFeedJobs}
            initialJobId={selectedJob?.id || selectedJob?.externalId}
            onBack={handleBackFromJobDetail}
            searchQuery={jobSearchQuery}
            onSearchChange={setJobSearchQuery}
            contractState={contractState}
            onCycleContract={handleCycleContract}
            pcdState={pcdState}
            onCyclePcd={handleCyclePcd}
            experienceState={experienceState}
            onCycleExperience={handleCycleExperience}
            favoritesOnly={favoritesOnly}
            onToggleFavoritesOnly={handleToggleFavoritesOnly}
            favoriteJobIds={favoriteJobIds}
            onToggleFavorite={handleToggleFavorite}
            onMarkJobViewed={handleMarkJobViewed}
            isFilterOpen={isJobFilterOpen}
            onToggleFilter={() => setIsJobFilterOpen((prev) => !prev)}
            onCloseFilter={() => setIsJobFilterOpen(false)}
            onResetFilters={handleResetJobFilters}
          />
        )}
      </div>

      {/* 2. Palco Desktop (>= 1024px) Multi-Colunas com Perspectiva 3D */}
      <div className="hidden lg:flex w-full justify-center">
        <DesktopStage
          activeTab={desktopActiveTab}
          onSelectTab={handleDesktopSelectTab}
          isDetailOpen={isDesktopDetailOpen}
          onCloseDetail={handleDesktopCloseDetail}
          isInfoOpen={isDesktopInfoActive}
          onToggleInfo={handleToggleDesktopInfo}
          onCloseInfo={handleCloseDesktopInfo}
          slotLeft={
            view === "details" ? (
              <HomeFeed
                digests={newsDigests}
                categories={allNewsCategories}
                isLoading={isLoadingNews}
                onOpenDetails={(d) => navigateTo("details", undefined, d)}
                onSelectVagas={() => {
                  savedVagasScrollY.current = 0;
                  navigateTo("vagas");
                }}
                onSelectInfo={handleToggleDesktopInfo}
                searchQuery={newsSearchQuery}
                onSearchChange={setNewsSearchQuery}
                selectedCategory={selectedNewsCategory}
                onSelectCategory={setSelectedNewsCategory}
                isFilterOpen={false}
                onToggleFilter={() => {}}
                onCloseFilter={() => {}}
                onResetFilters={handleResetNewsFilters}
              />
            ) : view === "vaga-detail" ? (
              <JobsFeed
                jobs={jobs}
                isLoading={isLoadingJobs}
                onSelectJob={(job) => {
                  hasNavigatedInApp.current = true;
                  savedVagasScrollY.current = window.scrollY;
                  const key = job.id || job.externalId || "";
                  if (key) handleMarkJobViewed(key);
                  navigateTo("vaga-detail", job);
                }}
                onSelectNoticias={() => navigateTo("home")}
                onSelectInfo={handleToggleDesktopInfo}
                searchQuery={jobSearchQuery}
                onSearchChange={setJobSearchQuery}
                contractState={contractState}
                onCycleContract={handleCycleContract}
                pcdState={pcdState}
                onCyclePcd={handleCyclePcd}
                experienceState={experienceState}
                onCycleExperience={handleCycleExperience}
                favoritesOnly={favoritesOnly}
                onToggleFavoritesOnly={handleToggleFavoritesOnly}
                favoriteJobIds={favoriteJobIds}
                viewedJobIds={viewedJobIds}
                isFilterOpen={false}
                onToggleFilter={() => {}}
                onCloseFilter={() => {}}
                onResetFilters={handleResetJobFilters}
              />
            ) : null
          }
          slotCenter={
            view === "details" ? (
              selectedDigest ? (
                <DetailedFeed
                  digest={selectedDigest}
                  tags={currentNewsTags}
                  onBack={() => navigateTo("home")}
                />
              ) : (
                <div className="page-shell">
                  <div className="w-full space-y-4">
                    <NewsCardSkeleton />
                  </div>
                </div>
              )
            ) : view === "vaga-detail" ? (
              (selectedJob || jobs[0]) ? (
                <JobDetail
                  jobs={detailFeedJobs}
                  initialJobId={selectedJob?.id || selectedJob?.externalId}
                  onBack={handleBackFromJobDetail}
                  searchQuery={jobSearchQuery}
                  onSearchChange={setJobSearchQuery}
                  contractState={contractState}
                  onCycleContract={handleCycleContract}
                  pcdState={pcdState}
                  onCyclePcd={handleCyclePcd}
                  experienceState={experienceState}
                  onCycleExperience={handleCycleExperience}
                  favoritesOnly={favoritesOnly}
                  onToggleFavoritesOnly={handleToggleFavoritesOnly}
                  favoriteJobIds={favoriteJobIds}
                  onToggleFavorite={handleToggleFavorite}
                  onMarkJobViewed={handleMarkJobViewed}
                  isFilterOpen={false}
                  onToggleFilter={() => {}}
                  onCloseFilter={() => {}}
                  onResetFilters={handleResetJobFilters}
                />
              ) : null
            ) : desktopActiveTab === "vagas" ? (
              <JobsFeed
                jobs={jobs}
                isLoading={isLoadingJobs}
                onSelectJob={(job) => {
                  hasNavigatedInApp.current = true;
                  savedVagasScrollY.current = window.scrollY;
                  const key = job.id || job.externalId || "";
                  if (key) handleMarkJobViewed(key);
                  navigateTo("vaga-detail", job);
                }}
                onSelectNoticias={() => navigateTo("home")}
                onSelectInfo={handleToggleDesktopInfo}
                searchQuery={jobSearchQuery}
                onSearchChange={setJobSearchQuery}
                contractState={contractState}
                onCycleContract={handleCycleContract}
                pcdState={pcdState}
                onCyclePcd={handleCyclePcd}
                experienceState={experienceState}
                onCycleExperience={handleCycleExperience}
                favoritesOnly={favoritesOnly}
                onToggleFavoritesOnly={handleToggleFavoritesOnly}
                favoriteJobIds={favoriteJobIds}
                viewedJobIds={viewedJobIds}
                isFilterOpen={false}
                onToggleFilter={() => {}}
                onCloseFilter={() => {}}
                onResetFilters={handleResetJobFilters}
              />
            ) : (
              <HomeFeed
                digests={newsDigests}
                categories={allNewsCategories}
                isLoading={isLoadingNews}
                onOpenDetails={(d) => navigateTo("details", undefined, d)}
                onSelectVagas={() => {
                  savedVagasScrollY.current = 0;
                  navigateTo("vagas");
                }}
                onSelectInfo={handleToggleDesktopInfo}
                searchQuery={newsSearchQuery}
                onSearchChange={setNewsSearchQuery}
                selectedCategory={selectedNewsCategory}
                onSelectCategory={setSelectedNewsCategory}
                isFilterOpen={false}
                onToggleFilter={() => {}}
                onCloseFilter={() => {}}
                onResetFilters={handleResetNewsFilters}
              />
            )
          }
          slotRightFilter={
            desktopActiveTab === "vagas" ? (
              <FilterPanel
                mode="vagas"
                persistent
                contractState={contractState}
                onCycleContract={handleCycleContract}
                pcdState={pcdState}
                onCyclePcd={handleCyclePcd}
                experienceState={experienceState}
                onCycleExperience={handleCycleExperience}
                favoritesOnly={favoritesOnly}
                onToggleFavoritesOnly={handleToggleFavoritesOnly}
                searchQuery={jobSearchQuery}
                onSearchChange={setJobSearchQuery}
                onClose={() => {}}
              />
            ) : (
              <FilterPanel
                mode="noticias"
                persistent
                categories={view === "details" ? currentNewsTags : allNewsCategories}
                searchQuery={newsSearchQuery}
                onSearchChange={setNewsSearchQuery}
                selectedCategory={selectedNewsCategory}
                onSelectCategory={setSelectedNewsCategory}
                onClose={() => {}}
              />
            )
          }
          slotRightInfo={
            <InfoFeed
              hideNav
              onSelectNoticias={() => {
                handleCloseDesktopInfo();
                navigateTo("home");
              }}
              onSelectVagas={() => {
                handleCloseDesktopInfo();
                savedVagasScrollY.current = 0;
                navigateTo("vagas");
              }}
            />
          }
        />
      </div>
    </div>
  );
}
