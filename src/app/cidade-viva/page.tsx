// src/app/cidade-viva/page.tsx
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase/client";
import { getCategories, getReports } from "./actions";
import { CidadeVivaContainer } from "./_components/CidadeVivaContainer";

export const metadata: Metadata = {
  alternates: {
    canonical: "/cidade-viva",
  },
  title: "Cidade Viva — Mapeamento Colaborativo | Guarapuava Digital",
  description:
    "Plataforma geoespacial e anônima para reportar e acompanhar ocorrências de zeladoria, trânsito e infraestrutura em Guarapuava.",
  openGraph: {
    title: "Cidade Viva — Mapeamento Colaborativo em Guarapuava",
    description:
      "Acompanhe e relate ocorrências de zeladoria urbana, asfalto, iluminação, água e semáforos em Guarapuava em tempo real.",
    url: "https://guarapuava.digital/cidade-viva",
    siteName: "Guarapuava Digital",
    locale: "pt_BR",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function CidadeVivaPage() {
  const [categories, reports] = await Promise.all([
    getCategories(),
    getReports(),
  ]);

  let isAdmin = false;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isAdmin = Boolean(user?.email && user.email === process.env.ADMIN_EMAIL);
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
