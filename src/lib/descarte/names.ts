import { normalizeText } from "@/lib/utils/search";
import type { DescarteItem } from "@/types/descarte";

export interface EnderecoPartes {
  rua: string;
  numero: string;
  bairro: string;
}

const PREFIXOS_RUA = /^(rua|r\.|avenida|av\.|rodovia|rod\.|estrada|est\.|travessa|trav\.|alameda|al\.|pra[cç]a|p[cç]a\.|largo|beco|via|br|pr)[\s.]+/i;
const TITULOS = /^(pref\.|dr\.|dra\.|mal\.|prof\.|professora|professor)[\s.]+/i;

function limparRua(raw: string): string {
  let s = raw.trim();
  for (let i = 0; i < 3; i++) {
    const next = s.replace(PREFIXOS_RUA, "").replace(TITULOS, "").trim();
    if (next === s) break;
    s = next;
  }
  return s;
}

/** Extrai rua, número e bairro de endereços no padrão "Rua X, NNN, Bairro". */
export function parseEndereco(endereco: string): EnderecoPartes {
  const parts = endereco
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  let first = parts[0] || "";
  if (first.includes(" - ")) first = first.split(" - ")[0].trim();
  const rua = limparRua(first);

  const second = parts[1] || "";
  const numMatch = second.match(/^(s\/n|\d[\d.\-]*)/i);
  const numero = numMatch ? numMatch[1] : "";

  let last = parts.length > 0 ? parts[parts.length - 1] : endereco;
  if (last.includes(" - ")) last = last.slice(last.lastIndexOf(" - ") + 3).trim();
  const bairro = last.replace(/\s*\(.*?\)\s*/g, "").trim();

  return { rua, numero, bairro };
}

/**
 * Desambigua locais repetidos (mesmo nome, endereços diferentes):
 * "Nome - Bairro", ou "Nome - Rua, Bairro" quando o bairro repete,
 * ou "Nome - Rua, Número, Bairro" em último caso. Não reordena nada.
 */
export function withDisplayNames(items: DescarteItem[]): DescarteItem[] {
  const byName = new Map<string, number[]>();
  items.forEach((it, idx) => {
    const list = byName.get(it.empresa) || [];
    list.push(idx);
    byName.set(it.empresa, list);
  });

  return items.map((it) => {
    const group = byName.get(it.empresa) || [];
    if (group.length < 2) return it;

    // Endereços distintos: duplicatas idênticas não contam como repetição
    const seen = new Map<string, number>();
    for (const i of group) {
      const key = normalizeText(items[i].endereco);
      if (!seen.has(key)) seen.set(key, i);
    }
    if (seen.size < 2) return it;

    const distinct = [...seen.values()].map((i) => ({
      i,
      p: parseEndereco(items[i].endereco),
    }));
    const normBairro = (p: EnderecoPartes) => normalizeText(p.bairro);
    const normRuaBairro = (p: EnderecoPartes) =>
      `${normalizeText(p.rua)}|${normalizeText(p.bairro)}`;

    const suffixByIdx = new Map<number, string>();
    for (const { i, p } of distinct) {
      const base = items[i].empresa.replace(/^farmácia\s+/i, "").trim() || items[i].empresa;
      if (!p.bairro) {
        suffixByIdx.set(i, p.rua ? `${base} - ${p.rua}` : base);
        continue;
      }
      if (distinct.filter((d) => normBairro(d.p) === normBairro(p)).length <= 1) {
        suffixByIdx.set(i, `${base} - ${p.bairro}`);
        continue;
      }
      if (distinct.filter((d) => normRuaBairro(d.p) === normRuaBairro(p)).length <= 1) {
        suffixByIdx.set(i, `${base} - ${p.rua}, ${p.bairro}`);
        continue;
      }
      suffixByIdx.set(
        i,
        p.numero
          ? `${base} - ${p.rua}, ${p.numero}, ${p.bairro}`
          : `${base} - ${p.rua}, ${p.bairro}`
      );
    }

    const suffix = suffixByIdx.get(seen.get(normalizeText(it.endereco)) as number) as string;
    return { ...it, nomeExibicao: suffix };
  });
}
