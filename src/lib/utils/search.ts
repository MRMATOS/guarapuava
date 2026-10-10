import { JobOpening } from "@/types/job";
import { NewsItem, DailyDigest } from "@/types/news";

/**
 * Normaliza uma string removendo diacríticos (acentos) e convertendo para minúsculas.
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Mapeamento canônico de categorias conhecidas de notícias para garantir
 * acentuação correta e evitar botões duplicados (ex: Saude vs Saúde, Politica vs Política).
 */
export const CANONICAL_NEWS_CATEGORIES: Record<string, string> = {
  saude: "Saúde",
  politica: "Política",
  transito: "Trânsito",
  educacao: "Educação",
  seguranca: "Segurança",
  gestao: "Gestão",
  economia: "Economia",
  comunidade: "Comunidade",
  cultura: "Cultura",
  clima: "Clima",
  tecnologia: "Tecnologia",
  prazos: "Prazos",
  esporte: "Esportes",
  esportes: "Esportes",
  habitacao: "Habitação",
  obras: "Obras",
  turismo: "Turismo",
  legislacao: "Legislação",
  meioambiente: "Meio Ambiente",
};

export const DEFAULT_NEWS_CATEGORIES: string[] = [
  "Cultura",
  "Clima",
  "Prazos",
  "Saúde",
  "Política",
  "Educação",
  "Segurança",
  "Trânsito",
];

/**
 * Normaliza uma categoria de notícia para sua grafia canônica e padronizada.
 */
export function normalizeCategory(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.trim();
  const key = normalizeText(cleaned).replace(/[^a-z0-9]/g, "");
  if (CANONICAL_NEWS_CATEGORIES[key]) {
    return CANONICAL_NEWS_CATEGORIES[key];
  }
  // Mantém maiúsculas apropriadas respeitando preposições
  return cleaned
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (["e", "de", "da", "do", "das", "dos", "em", "na", "no"].includes(lower)) {
        return lower;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Verifica se um texto contém todos os tokens da busca (insensível a acentos e maiúsculas).
 * Também suporta buscas numéricas flexíveis (ex: "5.000" vs "5000").
 */
export function matchesQuery(targetText: string, query: string): boolean {
  const normQuery = normalizeText(query);
  if (!normQuery) return true;

  const normTarget = normalizeText(targetText);
  const tokens = normQuery.split(/\s+/).filter(Boolean);

  return tokens.every((token) => {
    // 1. Busca textual direta
    if (normTarget.includes(token)) return true;

    // 2. Busca numérica inteligente de valores/salários (ex: "5000" casa com "5.000" ou "5.000,00", mas não com "2.150,00")
    const cleanToken = token.replace(/[.,]/g, "");
    if (/^\d+$/.test(cleanToken)) {
      const numberMatches = normTarget.match(/\b\d+(?:[.,]\d+)*\b/g);
      if (numberMatches) {
        const matchesAnyNumber = numberMatches.some((numStr) => {
          const stripped = numStr
            .replace(/\.00$/, "")
            .replace(/,00$/, "")
            .replace(/[.,]/g, "");
          return stripped === cleanToken || numStr === token;
        });
        if (matchesAnyNumber) return true;
      }
    }

    return false;
  });
}

export interface JobFilterOptions {
  query: string;
  contractState: number; // 0 = Contrato (todas), 1 = CLT, 2 = PJ
  pcdState: number; // 0 = PCD (todas), 1 = Somente PCD, 2 = Aceita PCD
  experienceState: number; // 0 = Experiência (todas), 1 = Com experiência, 2 = Sem experiência
  favoritesOnly?: boolean;
  favoriteJobIds?: string[];
}

/**
 * Filtra a lista de vagas de acordo com a barra de busca e os botões dinâmicos de estado.
 */
export function filterJobs(
  jobs: JobOpening[],
  options: JobFilterOptions
): JobOpening[] {
  const { query, contractState, pcdState, experienceState, favoritesOnly, favoriteJobIds } = options;

  return jobs.filter((job) => {
    // 0. Filtro de Favoritas
    if (favoritesOnly) {
      const favList = favoriteJobIds || [];
      const isFav =
        Boolean(job.id && favList.includes(job.id)) ||
        Boolean(job.externalId && favList.includes(job.externalId));
      if (!isFav) return false;
    }

    // 1. Filtro textual geral (busca por empresa, salário, palavra-chave, data, título, requisitos)
    if (query.trim()) {
      const jobCorpus = [
        job.title,
        job.company,
        job.intermediary,
        job.location,
        job.workModel,
        job.contractType,
        job.compensation,
        job.schedule,
        job.publishedDate,
        job.applicationDeadline,
        job.applicationInstructions,
        ...(job.descriptionItems || []),
        ...(job.requirementItems || []),
        ...(job.benefitItems || []),
        ...(job.additionalInfo?.map((i) => `${i.label} ${i.text}`) || []),
      ]
        .filter(Boolean)
        .join(" ");

      if (!matchesQuery(jobCorpus, query)) {
        return false;
      }
    }

    // 2. Filtro de Contrato
    // Estado 0: Contrato (mostra tudo)
    // Estado 1: CLT
    // Estado 2: PJ
    if (contractState === 1) {
      const isClt =
        Boolean(job.contractType?.toUpperCase().includes("CLT")) ||
        matchesQuery(
          [job.title, ...(job.descriptionItems || []), ...(job.requirementItems || [])].join(" "),
          "CLT"
        );
      if (!isClt) return false;
    } else if (contractState === 2) {
      const isPj =
        Boolean(job.contractType?.toUpperCase().includes("PJ")) ||
        Boolean(job.contractType?.toUpperCase().includes("MEI")) ||
        matchesQuery(
          [job.title, ...(job.descriptionItems || []), ...(job.requirementItems || [])].join(" "),
          "PJ"
        ) ||
        matchesQuery(
          [job.title, ...(job.descriptionItems || []), ...(job.requirementItems || [])].join(" "),
          "MEI"
        );
      if (!isPj) return false;
    }

    // 3. Filtro de PCD
    // Estado 0: PCD (todas as vagas)
    // Estado 1: Somente PCD (exclusiva para PCD)
    // Estado 2: Aceita PCD (exclusivas ou que aceitam PCD)
    const corpusForPcd = [
      job.title,
      job.company,
      ...(job.descriptionItems || []),
      ...(job.requirementItems || []),
    ].join(" ");

    const hasExclusivePcd =
      job.isPcdExclusive === true ||
      /exclusiv[ao]\s+(para\s+)?pcd/i.test(corpusForPcd) ||
      /somente\s+pcd/i.test(corpusForPcd) ||
      /apenas\s+pcd/i.test(corpusForPcd);

    const acceptsPcd =
      hasExclusivePcd ||
      job.isPcd === true ||
      /\bpcd\b/i.test(corpusForPcd) ||
      /defici[eê]ncia/i.test(corpusForPcd) ||
      /aceita\s+pcd/i.test(corpusForPcd);

    if (pcdState === 1) {
      if (!hasExclusivePcd) return false;
    } else if (pcdState === 2) {
      if (!acceptsPcd) return false;
    }

    // 4. Filtro de Experiência
    // Estado 0: Experiência (todas)
    // Estado 1: Com experiência
    // Estado 2: Sem experiência
    const corpusForExp = [
      job.title,
      ...(job.descriptionItems || []),
      ...(job.requirementItems || []),
    ].join(" ");

    const explicitlyNoExp =
      /sem\s+experi[eê]ncia/i.test(corpusForExp) ||
      /n[aã]o\s+exige\s+experi[eê]ncia/i.test(corpusForExp) ||
      /dispensa\s+experi[eê]ncia/i.test(corpusForExp) ||
      /sem\s+exig[eê]ncia\s+de\s+experi[eê]ncia/i.test(corpusForExp);

    const requiresExp =
      !explicitlyNoExp &&
      (/experi[eê]ncia\s+(pr[aá]tica|comprovada|pr[eé]via|m[ií]nima|na\s+fun[cç][aã]o|em|de)/i.test(corpusForExp) ||
        /necess[aá]ri[ao]\s+experi[eê]ncia/i.test(corpusForExp) ||
        /exige-se\s+experi[eê]ncia/i.test(corpusForExp));

    if (experienceState === 1) {
      // Com experiência: exige experiência ou está aberta para com/sem
      if (!requiresExp && !/com\s+ou\s+sem\s+experi[eê]ncia/i.test(corpusForExp)) {
        return false;
      }
    } else if (experienceState === 2) {
      // Sem experiência: aceita sem experiência ou não exige experiência comprovada
      if (requiresExp && !/com\s+ou\s+sem\s+experi[eê]ncia/i.test(corpusForExp)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filtra notícias por termo textual e categoria opcional.
 */
export function filterNewsHighlights(
  items: NewsItem[],
  query: string,
  category: string | null = null
): NewsItem[] {
  return items.filter((item) => {
    if (category) {
      const matchCat =
        normalizeText(item.category) === normalizeText(category) ||
        normalizeText(item.title).includes(normalizeText(category));
      if (!matchCat) return false;
    }

    if (query.trim()) {
      const textCorpus = `${item.title} ${item.text} ${item.category}`;
      if (!matchesQuery(textCorpus, query)) return false;
    }

    return true;
  });
}

/**
 * Retorna todos os itens de notícias de um resumo diário (incluindo lotes completos e destaques deduplicados).
 */
export function getAllDigestNewsItems(digest: DailyDigest): NewsItem[] {
  const map = new Map<string, NewsItem>();
  if (digest.batches) {
    for (const batch of digest.batches) {
      if (batch.items) {
        for (const item of batch.items) {
          if (item) {
            const key = item.id || item.title || `${item.category}-${item.text}`;
            map.set(key, item);
          }
        }
      }
    }
  }
  if (digest.highlights) {
    for (const item of digest.highlights) {
      if (item) {
        const key = item.id || item.title || `${item.category}-${item.text}`;
        if (!map.has(key)) {
          map.set(key, item);
        }
      }
    }
  }
  return Array.from(map.values());
}
