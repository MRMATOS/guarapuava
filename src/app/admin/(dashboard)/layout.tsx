import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { LogoutButton } from "../_components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const authorizedEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const userEmail = user?.email?.trim().toLowerCase();

  // Se não estiver autenticado ou e-mail não for o do administrador
  if (!user || !userEmail || !authorizedEmail || userEmail !== authorizedEmail) {
    redirect("/admin/login?error=unauthorized");
  }

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink flex flex-col">
      {/* Barra superior de moderação no padrão de Alabastro */}
      <header className="w-full border-b border-rule/70 bg-canvas/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3 flex items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="text-xs sm:text-sm font-bold tracking-tight text-ink hover:text-coral transition-colors"
            title="Voltar ao portal público"
          >
            Guarapuava Digital
          </Link>
          <span className="text-xs text-ink-muted select-none" aria-hidden="true">
            /
          </span>
          <Link
            href="/admin/cidade-viva"
            className="text-xs sm:text-sm font-semibold text-ink"
          >
            Cidade Viva
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline text-xs text-ink-muted truncate max-w-[220px]">
            {user.email}
          </span>
          <LogoutButton />
        </div>
      </header>

      <main className="w-full flex-1 max-w-[1680px] mx-auto p-4 sm:p-6 lg:p-7">
        {children}
      </main>
    </div>
  );
}
