import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Guarapuava — Notícias e Vagas de Hoje",
    short_name: "Guarapuava",
    description:
      "Resumo diário e atualizado em tempo real das principais notícias e vagas de emprego de Guarapuava.",
    start_url: "/",
    display: "standalone",
    background_color: "#16181b",
    theme_color: "#eff0f3",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
