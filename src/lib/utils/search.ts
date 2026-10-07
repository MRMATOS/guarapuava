import { JobOpening } from "@/types/job";
import { NewsItem } from "@/types/news";

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
}

/**
 * Filtra a lista de vagas de acordo com a barra de busca e os 3 botões dinâmicos de estado.
 */
export function filterJobs(
  jobs: JobOpening[],
  options: JobFilterOptions
): JobOpening[] {
  const { query, contractState, pcdState, experienceState } = options;

  return jobs.filter((job) => {
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
