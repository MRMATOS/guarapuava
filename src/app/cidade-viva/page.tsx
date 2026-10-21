// src/app/cidade-viva/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CidadeVivaApresentacaoClient } from "./_components/CidadeVivaApresentacaoClient";

export const metadata: Metadata = {
  alternates: {
    canonical: "/cidade-viva",
  },
  title: "Cidade Viva — Mapeamento Colaborativo | Guarapuava Digital",
  description:
    "Plataforma colaborativa e anônima para reportar e acompanhar ocorrências de zeladoria urbana e infraestrutura em Guarapuava.",
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

interface CidadeVivaPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CidadeVivaPage({ searchParams }: CidadeVivaPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const id = resolvedParams?.id;

  // Se houver id de relato compartilhado via deep link, redireciona para o mapa com id
  if (id && typeof id === "string") {
    redirect(`/cidade-viva/mapa?id=${encodeURIComponent(id)}`);
  }

  redirect("/cidade-viva/mapa");
}
