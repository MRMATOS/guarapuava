import type { Metadata } from "next";
import { InfoFeed } from "@/components/InfoFeed";

export const metadata: Metadata = {
  title: "Informações e Diretrizes | Guarapuava Digital",
  description:
    "Diretrizes editoriais, fontes oficiais de dados, transparência pública e compromisso de privacidade do Guarapuava Digital.",
};

export default function InformacoesPage() {
  return (
    <main className="min-h-[100dvh] bg-canvas text-ink flex justify-center">
      <InfoFeed />
    </main>
  );
}
