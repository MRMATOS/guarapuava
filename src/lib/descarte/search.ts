import { normalizeText } from "@/lib/utils/search";

/** Distância de edição (Levenshtein) entre duas strings já normalizadas. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let curr0 = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(prev[j] + 1, curr0 + 1, prev[j - 1] + cost);
      prev[j - 1] = curr0;
      curr0 = next;
    }
    prev[b.length] = curr0;
  }
  return prev[b.length];
}

function maxDist(tokenLength: number): number {
  if (tokenLength <= 3) return 0;
  if (tokenLength <= 5) return 1;
  return 2;
}

function tokenMatchesWord(token: string, word: string): boolean {
  if (!token || !word) return false;
  if (word.includes(token)) return true;
  // Palavras digitadas juntas ("pneuvelho"): só o início do token vale,
  // senão a cauda ("velho") gera falso positivo com "celular velho".
  if (word.length >= 3 && token.startsWith(word)) return true;
  const allowed = maxDist(token.length);
  if (allowed === 0) return false;
  if (Math.abs(token.length - word.length) > allowed) return false;
  return levenshtein(token, word) <= allowed;
}

/**
 * Busca tolerante: ignora acentos/maiúsculas, aceita pequenos erros de
 * digitação e palavras digitadas juntas ("pneuvelho" acha "pneu velho").
 * A consulta inteira precisa casar (AND por token).
 */
export function matchesLoose(query: string, corpus: string): boolean {
  const q = normalizeText(query);
  const c = normalizeText(corpus);
  if (!q) return true;
  if (!c) return false;

  // Frase exata ("resto de obra", "óleo de cozinha" mesmo sem acento)
  if (c.includes(q)) return true;

  // Palavras digitadas juntas ("pneuvelho", "oleodecozinha")
  const qc = q.replace(/\s+/g, "");
  if (qc.length > 3 && c.replace(/\s+/g, "").includes(qc)) return true;

  // Token a token com tolerância a typos ("tijols", "celuar")
  const words = c.split(/\s+/).filter(Boolean);
  return q
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => words.some((w) => tokenMatchesWord(token, w)));
}
