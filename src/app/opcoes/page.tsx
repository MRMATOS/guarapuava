import type { Metadata } from "next";
import { OpcoesFeed } from "@/components/opcoes/OpcoesFeed";

export const metadata: Metadata = {
  title: "Opções e Acessibilidade | Guarapuava Digital",
  description:
    "Ajustes de acessibilidade, alternância entre modo destro e canhoto, tema visual e termos do portal.",
};

export default function OpcoesPage() {
  return (
    <main className="min-h-[100dvh] bg-canvas text-ink flex justify-center">
      <OpcoesFeed />
    </main>
  );
}
