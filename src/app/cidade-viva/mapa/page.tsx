// src/app/cidade-viva/mapa/page.tsx
import type { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getCategories, getReports } from "../actions";
import { CidadeVivaContainer } from "../_components/CidadeVivaContainer";

export const metadata: Metadata = {
  alternates: {
    canonical: "/cidade-viva/mapa",
  },
  title: "Mapa Interativo — Cidade Viva | Guarapuava Digital",
  description:
    "Mapa colaborativo em tempo real para visualizar e relatar ocorrências de zeladoria e infraestrutura em Guarapuava.",
  openGraph: {
    title: "Mapa Interativo — Cidade Viva em Guarapuava",
    description:
      "Acompanhe e relate ocorrências de zeladoria urbana, asfalto, iluminação, água e semáforos em Guarapuava em tempo real.",
    url: "https://guarapuava.digital/cidade-viva/mapa",
    siteName: "Guarapuava Digital",
    locale: "pt_BR",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function CidadeVivaMapaPage() {
  const [categories, reports] = await Promise.all([
    getCategories(),
    getReports(),
  ]);

  let isAdmin = false;
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const authorizedEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const userEmail = user?.email?.trim().toLowerCase();
    isAdmin = Boolean(userEmail && authorizedEmail && userEmail === authorizedEmail);
  } catch {
    isAdmin = false;
  }

  return (
    <main className="w-full h-[100dvh] flex flex-col overflow-hidden">
      <CidadeVivaContainer
        initialCategories={categories}
        initialReports={reports}
        isAdmin={isAdmin}
      />
    </main>
  );
}
