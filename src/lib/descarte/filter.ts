import { matchesLoose } from "@/lib/descarte/search";
import keywordsMap from "@/data/descarte-keywords.json";
import type { DescarteItem } from "@/types/descarte";

export interface DescarteFilter {
  query: string;
  categoria: string | null;
  local: string | null;
}

export function getCategorias(items: DescarteItem[]): string[] {
  const set = new Set(items.map((i) => i.categoria));
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

export function getLocais(items: DescarteItem[]): string[] {
  const set = new Set(items.map((i) => i.empresa));
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

export function filterDescarte(items: DescarteItem[], filter: DescarteFilter): DescarteItem[] {
  const q = (filter.query || "").trim();
  return items.filter((item) => {
    if (filter.categoria && item.categoria !== filter.categoria) return false;
    if (filter.local && item.empresa !== filter.local) return false;
    if (!q) return true;
    // Palavras-chave invisíveis: ampliam a busca sem mudar o visual do card
    const keywords =
      (keywordsMap as Record<string, string[]>)[item.categoria] || [];
    const corpus = [
      item.categoria,
      item.empresa,
      item.nomeExibicao && item.nomeExibicao !== item.empresa ? item.nomeExibicao : "",
      item.endereco,
      item.telefone || "",
      ...keywords,
    ].join(" ");
    return matchesLoose(q, corpus);
  });
}

export interface DescarteGrupo {
  categoria: string;
  items: DescarteItem[];
}

/** Casa a busca contra o nome da categoria + suas palavras-chave invisíveis. */
export function categoriaMatches(categoria: string, query: string): boolean {
  const keywords = (keywordsMap as Record<string, string[]>)[categoria] || [];
  return matchesLoose(query, [categoria, ...keywords].join(" "));
}

export function groupDescarteByCategoria(items: DescarteItem[]): DescarteGrupo[] {
  const map = new Map<string, DescarteItem[]>();
  for (const item of items) {
    const list = map.get(item.categoria) || [];
    list.push(item);
    map.set(item.categoria, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }))
    .map(([categoria, list]) => ({
      categoria,
      items: [...list].sort((x, y) => x.empresa.localeCompare(y.empresa, "pt-BR", { sensitivity: "base" })),
    }));
}
