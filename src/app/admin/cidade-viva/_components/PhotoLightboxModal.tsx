"use client";

import React, { useEffect } from "react";
import { Key } from "@/components/ui/Key";

interface PhotoLightboxModalProps {
  photoUrl: string | null;
  onClose: () => void;
}

export function PhotoLightboxModal({
  photoUrl,
  onClose,
}: PhotoLightboxModalProps) {
  useEffect(() => {
    if (!photoUrl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photoUrl, onClose]);

  if (!photoUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Visualização ampliada da fotografia"
    >
      <div
        className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex justify-end">
          <Key
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold"
          >
            Fechar ✕
          </Key>
        </div>

        <div className="w-full max-h-[80vh] rounded-2xl overflow-hidden border border-rule/50 bg-black flex items-center justify-center shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Fotografia ampliada da ocorrência"
            className="w-full h-auto max-h-[80vh] object-contain select-none"
          />
        </div>
      </div>
    </div>
  );
}
