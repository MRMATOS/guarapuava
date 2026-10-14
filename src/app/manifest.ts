import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Guarapuava Digital",
    short_name: "Guarapuava Digital",
    description:
      "Se atualize e utilize ferramentas criadas para todos os moradores de Guarapuava.",
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
