"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Key } from "@/components/ui/Key";

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
          "https://ufjvqciyrtpfpetpgavf.supabase.co",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
      );

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        alert(`Erro ao iniciar login: ${error.message}`);
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      alert(`Falha no login: ${msg}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink flex items-center justify-center p-4 sm:p-6 select-text">
      <div className="surface-card w-full max-w-[420px] p-6 sm:p-8 flex flex-col gap-6 text-center">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Guarapuava Digital
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Acesso Administrativo
          </h1>
          <p className="text-sm text-ink-body leading-relaxed">
            Painel exclusivo para moderação de ocorrências e gestão da plataforma.
          </p>
        </div>

        {errorParam === "unauthorized" && (
          <div
            role="alert"
            className="p-3.5 rounded-xl border border-coral/30 bg-coral/10 text-coral text-xs font-semibold leading-relaxed"
          >
            Acesso não autorizado. Sua conta Google não possui permissões de administrador.
          </div>
        )}

        {errorParam === "auth" && (
          <div
            role="alert"
            className="p-3.5 rounded-xl border border-coral/30 bg-coral/10 text-coral text-xs font-semibold leading-relaxed"
          >
            Falha na autenticação. Por favor, tente novamente.
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="key key--coral w-full py-3 h-[46px] inline-flex items-center justify-center font-bold text-sm rounded-xl cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Conectando ao Google..." : "Entrar com Google"}
          </button>

          <Link
            href="/"
            className="w-full text-center text-xs font-semibold text-ink-muted hover:text-ink transition-colors py-2"
          >
            ← Voltar para o portal público
          </Link>
        </div>
      </div>
    </div>
  );
}
