// src/app/cidade-viva/_components/ReportModal.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { Category, Report } from "../_lib/types";
import { compressImageToWebP } from "../_lib/image-compression";
import { createReport } from "../actions";
import { getSavedUserLocation, saveUserLocation } from "../_lib/location-storage";

interface ReportModalProps {
  isOpen: boolean;
  categories: Category[];
  onClose: () => void;
  onReportCreated: (newReport: Report) => void;
}

const CATEGORY_LABEL_OVERRIDES: Record<string, string> = {
  "buraco-pista": "Asfalto / Buracos",
  "vazamento-agua": "Água / Esgoto Sanepar",
  "risco-eletrico": "Iluminação / Risco Elétrico",
  "falha-semaforo": "Semáforo / Sinalização",
  "acumulo-lixo": "Lixo / Entulho acumulado",
  "arvore-queda": "Vegetação / Mato Alto",
  "calcada-danificada": "Calçada / Acessibilidade",
  "foco-dengue": "Foco de Dengue",
  "alagamento": "Alagamento / Drenagem",
  "perturbacao-sossego": "Perturbação de Sossego",
};

const FALLBACK_CATEGORIES = [
  { id: "buraco-pista", name: "Asfalto / Buracos" },
  { id: "vazamento-agua", name: "Água / Esgoto Sanepar" },
  { id: "risco-eletrico", name: "Iluminação / Risco Elétrico" },
  { id: "falha-semaforo", name: "Semáforo / Sinalização" },
  { id: "acumulo-lixo", name: "Lixo / Entulho acumulado" },
  { id: "arvore-queda", name: "Vegetação / Mato Alto" },
  { id: "calcada-danificada", name: "Calçada / Acessibilidade" },
  { id: "foco-dengue", name: "Foco de Dengue" },
  { id: "alagamento", name: "Alagamento / Drenagem" },
  { id: "perturbacao-sossego", name: "Perturbação de Sossego" },
];

export function ReportModal({
  isOpen,
  categories,
  onClose,
  onReportCreated,
}: ReportModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(() => {
    const saved = getSavedUserLocation();
    return saved ? { lat: saved.lat, lng: saved.lng } : null;
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveUserLocation(pos.coords.longitude, pos.coords.latitude);
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        console.warn("Geolocalização não obtida:", err);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  }, []);

  const resetForm = useCallback(() => {
    setStep(1);
    setSelectedCategory("");
    setDescription("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setIsPhotoModalOpen(false);
    setShowConfirmClose(false);
    setErrorMessage(null);
    setIsSubmitting(false);
    setSubmitStatus("");
  }, []);

  const handleCloseAttempt = useCallback(() => {
    if (isSubmitting) return;
    if (photoFile || description.trim()) {
      setShowConfirmClose(true);
    } else {
      resetForm();
      onClose();
    }
  }, [isSubmitting, photoFile, description, resetForm, onClose]);

  const handleForceClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    requestLocation();
  }, [isOpen, requestLocation]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    setErrorMessage(null);
    setIsPhotoModalOpen(false);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
    setIsPhotoModalOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!selectedCategory) {
      setErrorMessage("Por favor, selecione qual é o problema.");
      setStep(1);
      return;
    }

    if (!photoFile) {
      setErrorMessage("Anexe uma foto para comprovar a ocorrência.");
      return;
    }

    if (!coords) {
      setErrorMessage(
        "Não foi possível obter sua localização. Por favor, ative a permissão de localização no navegador e tente novamente."
      );
      requestLocation();
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("Processando foto...");

    let compressedBlob: Blob;
    try {
      compressedBlob = await compressImageToWebP(photoFile);
    } catch (compressionErr) {
      console.error("Erro ao comprimir imagem:", compressionErr);
      const msg =
        compressionErr instanceof Error
          ? compressionErr.message
          : "Não foi possível processar a imagem. Tente tirar uma nova foto.";
      setErrorMessage(msg);
      setIsSubmitting(false);
      setSubmitStatus("");
      return;
    }

    if (compressedBlob.size > 2 * 1024 * 1024) {
      setErrorMessage("A foto excede o limite permitido de 2 MB. Tente outra foto.");
      setIsSubmitting(false);
      setSubmitStatus("");
      return;
    }

    try {
      setSubmitStatus("Registrando ocorrência...");

      const formData = new FormData();
      formData.append("categoryId", selectedCategory);
      formData.append("latitude", coords.lat.toString());
      formData.append("longitude", coords.lng.toString());
      if (description.trim()) {
        formData.append("description", description.trim());
      }
      formData.append("photo", compressedBlob, "report.webp");

      const result = await createReport(formData);

      if (!result.success || !result.report) {
        setErrorMessage(result.error || "Falha ao registrar ocorrência.");
        setIsSubmitting(false);
        setSubmitStatus("");
        return;
      }

      onReportCreated(result.report);
      resetForm();
      onClose();
    } catch (err) {
      console.error("Erro ao enviar ocorrência:", err);
      setErrorMessage("Ocorreu um erro ao enviar o relato. Verifique sua conexão e tente novamente.");
      setIsSubmitting(false);
      setSubmitStatus("");
    }
  };

  if (!isOpen) return null;

  const optionsList =
    categories && categories.length > 0
      ? categories.map((cat) => ({
          id: cat.id,
          name: CATEGORY_LABEL_OVERRIDES[cat.id] || cat.name,
        }))
      : FALLBACK_CATEGORIES;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelect}
        className="hidden"
      />

      {/* Overlay Principal */}
      <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div
          className={`bg-canvas border border-rule/70 dark:border-white/10 rounded-3xl shadow-none relative w-full p-4 sm:p-6 my-auto transition-all ${
            step === 1 ? "max-w-md md:max-w-xl" : "max-w-md"
          }`}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between pb-3.5 border-b border-rule/50 gap-2">
            <h2 className="text-lg font-bold text-ink tracking-tight">
              {step === 1 ? "Qual é o problema?" : "Foto e Detalhes"}
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="px-2.5 py-1 text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer"
                >
                  Voltar
                </button>
              )}
              <button
                type="button"
                onClick={handleCloseAttempt}
                disabled={isSubmitting}
                aria-label="Fechar"
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Mensagem de Erro */}
          {errorMessage && (
            <div className="my-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {/* ETAPA 1: SELEÇÃO DA CATEGORIA */}
          {step === 1 && (
            <div className="flex flex-col gap-4 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                {optionsList.map((item) => {
                  const isSelected = selectedCategory === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedCategory(item.id)}
                      className={`w-full text-left p-3 rounded-xl border text-xs sm:text-[13px] font-semibold transition-all cursor-pointer select-none ${
                        isSelected
                          ? "bg-coral text-white border-coral shadow-sm font-bold"
                          : "bg-surface text-ink border-rule/70 hover:border-coral/40"
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (selectedCategory) setStep(2);
                }}
                disabled={!selectedCategory}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  selectedCategory
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-95 shadow-sm active:scale-[0.98]"
                    : "bg-rule/30 text-ink-muted/50 cursor-not-allowed"
                }`}
              >
                Continuar
              </button>
            </div>
          )}

          {/* ETAPA 2: FOTO E DETALHES */}
          {step === 2 && (
            <div className="flex flex-col gap-3.5 mt-3">
              {photoFile ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-rule/70 bg-surface">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span className="text-xs font-semibold text-ink">Foto anexada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPhotoModalOpen(true)}
                      className="text-xs font-semibold text-coral hover:underline cursor-pointer"
                    >
                      Visualizar
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-xs text-red-500 hover:underline cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-5 px-4 border-2 border-dashed border-rule rounded-xl flex flex-col items-center justify-center gap-1.5 hover:border-coral/50 transition-colors cursor-pointer bg-surface/50"
                >
                  <span className="text-xl">📷</span>
                  <span className="text-xs font-bold text-ink">Tirar ou anexar foto</span>
                  <span className="text-[11px] text-ink-muted">Comprovante obrigatório</span>
                </button>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-ink-muted">
                  Observações adicionais (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder="Ex: buraco grande próximo à esquina com a padaria..."
                  className="w-full text-[16px] sm:text-xs p-3 rounded-xl border border-rule/70 bg-surface text-ink placeholder:text-ink-muted/60 resize-none focus:outline-hidden focus:border-coral"
                />
                <span className="text-right text-[10px] text-ink-muted">
                  {description.length}/500
                </span>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!photoFile || isSubmitting}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  photoFile && !isSubmitting
                    ? "bg-coral text-white hover:opacity-95 shadow-md active:scale-[0.98]"
                    : "bg-rule/40 text-ink-muted cursor-not-allowed"
                }`}
              >
                {isSubmitting ? submitStatus || "Enviando..." : "Enviar Relato Anônimo"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Saída */}
      {showConfirmClose && (
        <div className="fixed inset-0 z-[160] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-canvas border border-rule/70 dark:border-white/10 rounded-2xl shadow-none max-w-xs w-full p-5 flex flex-col gap-3">
            <h3 className="font-bold text-ink text-sm">Descartar relato?</h3>
            <p className="text-xs text-ink-body">
              As informações e foto preenchidas serão perdidas.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmClose(false)}
                className="px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer"
              >
                Continuar editando
              </button>
              <button
                type="button"
                onClick={handleForceClose}
                className="px-3 py-1.5 text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lightbox de Prévia da Foto */}
      {isPhotoModalOpen && photoPreview && (
        <div
          className="fixed inset-0 z-[170] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsPhotoModalOpen(false)}
        >
          <div className="relative max-w-sm max-h-[80vh] overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreview}
              alt="Prévia da ocorrência"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
