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
 * As 12 categorias canônicas oficiais de notícias do portal (1 palavra cada).
 * Organizadas em ordem alfabética para facilitar a rápida localização pelo morador.
 */
export const FIXED_NEWS_CATEGORIES: string[] = [
  "Clima",
  "Cultura",
  "Economia",
  "Educação",
  "Política",
  "Prazos",
  "Saúde",
  "Segurança",
  "Social",
  "Tecnologia",
  "Trânsito",
  "Outros",
];

// Compatibilidade regressiva
export const DEFAULT_NEWS_CATEGORIES: string[] = FIXED_NEWS_CATEGORIES;

/**
 * Mapeamento canônico exaustivo de categorias e termos compostos conhecidos
 * para direcionar notícias para uma das 12 categorias oficiais fixas.
 */
export const CANONICAL_NEWS_CATEGORIES: Record<string, string> = {
  // Clima
  clima: "Clima",
  "clima e tempo": "Clima",
  "clima e servicos": "Clima",
  "clima e serviços": "Clima",
  "servicos e clima": "Clima",
  "serviços e clima": "Clima",
  "clima e precipitacao": "Clima",
  "clima e precipitação": "Clima",
  "clima e simepar": "Clima",
  "clima e previsao": "Clima",
  "clima e previsão": "Clima",
  "clima e balanco": "Clima",
  "clima e balanço": "Clima",
  "clima e frio polar": "Clima",
  "clima noturno": "Clima",
  "clima e alerta": "Clima",
  "defesa civil e clima": "Clima",
  "clima e defesa civil": "Clima",
  "clima e prevencao": "Clima",
  "clima e prevenção": "Clima",
  "defesa civil": "Clima",

  // Cultura
  cultura: "Cultura",
  "cultura e lazer": "Cultura",
  "cultura e festival": "Cultura",
  "cultura e festivais": "Cultura",
  "cultura e festividades": "Cultura",
  "cultura e religiosidade": "Cultura",
  "lazer e fim de semana": "Cultura",
  "negocios e cultura": "Cultura",
  "negócios e cultura": "Cultura",
  esportes: "Cultura",
  esporte: "Cultura",

  // Economia
  economia: "Economia",
  trabalho: "Economia",
  "trabalho e emprego": "Economia",
  "emprego e renda": "Economia",
  "governanca fiscal": "Economia",
  "governança fiscal": "Economia",
  "equilibrio fiscal": "Economia",
  "equilíbrio fiscal": "Economia",
  "oportunidades e servicos": "Economia",
  "oportunidades e serviços": "Economia",
  "gestao e oportunidades": "Economia",
  "gestão e oportunidades": "Economia",

  // Educação
  educacao: "Educação",
  educação: "Educação",
  "alimentacao escolar": "Educação",
  "alimentação escolar": "Educação",
  "educacao e atos": "Educação",
  "educação e atos": "Educação",
  "educacao e vestibular": "Educação",
  "educação e vestibular": "Educação",
  "educacao municipal": "Educação",
  "educação municipal": "Educação",
  "obras e educacao": "Educação",
  "obras e educação": "Educação",

  // Política
  politica: "Política",
  política: "Política",
  "politica e gestao": "Política",
  "política e gestão": "Política",
  "gestao municipal": "Política",
  "gestão municipal": "Política",
  "gestao e servicos publicos": "Política",
  "gestão e serviços públicos": "Política",
  "atos e gestao publica": "Política",
  "atos e gestão pública": "Política",
  "atos e servicos": "Política",
  "atos e serviços": "Política",
  "atos e transparencia": "Política",
  "atos e transparência": "Política",
  "atos e retomada": "Política",
  "atos e publicacoes": "Política",
  "atos e publicações": "Política",
  "poder legislativo": "Política",
  "atos oficiais": "Política",
  gestao: "Política",
  gestão: "Política",

  // Prazos
  prazos: "Prazos",
  prazo: "Prazos",
  "prazos e cultura": "Prazos",
  "servicos e prazos": "Prazos",
  "serviços e prazos": "Prazos",

  // Saúde
  saude: "Saúde",
  saúde: "Saúde",
  "saude e servicos": "Saúde",
  "saúde e serviços": "Saúde",
  "saude e comunidade": "Saúde",
  "saúde e comunidade": "Saúde",
  "saude publica e extensao": "Saúde",
  "saúde pública e extensão": "Saúde",
  "servicos e plantao": "Saúde",
  "serviços e plantão": "Saúde",
  "saude e prevencao": "Saúde",
  "saúde e prevenção": "Saúde",
  "saude e cuidados": "Saúde",
  "saúde e cuidados": "Saúde",
  "saude e gestao": "Saúde",
  "saúde e gestão": "Saúde",

  // Segurança
  seguranca: "Segurança",
  segurança: "Segurança",
  policia: "Segurança",
  polícia: "Segurança",
  "seguranca e tecnologia": "Segurança",
  "segurança e tecnologia": "Segurança",
  "seguranca e operacoes": "Segurança",
  "segurança e operações": "Segurança",

  // Social
  social: "Social",
  comunidade: "Social",
  "comunidade e filantropia": "Social",
  "comunidade e fe": "Social",
  "comunidade e fé": "Social",
  "comunidade e empreendedorismo": "Social",
  "solidariedade e terceiro setor": "Social",
  "habitacao e solo urbano": "Social",
  "habitação e solo urbano": "Social",
  "fe e romarias": "Social",
  "fé e romarias": "Social",
  "planejamento e direitos": "Social",
  "lazer e comunidade": "Social",
  "cultura e comunidade": "Social",
  habitacao: "Social",
  habitação: "Social",

  // Tecnologia
  tecnologia: "Tecnologia",
  "servicos digitais": "Tecnologia",
  "serviços digitais": "Tecnologia",
  "inovacao e ciencia": "Tecnologia",
  "inovação e ciência": "Tecnologia",
  inovacao: "Tecnologia",
  inovação: "Tecnologia",

  // Trânsito
  transito: "Trânsito",
  trânsito: "Trânsito",
  "transito e rodovias": "Trânsito",
  "trânsito e rodovias": "Trânsito",
  "transito e vias": "Trânsito",
  "trânsito e vias": "Trânsito",
  "infraestrutura e transito": "Trânsito",
  "infraestrutura e trânsito": "Trânsito",
  "transito e seguranca": "Trânsito",
  "trânsito e segurança": "Trânsito",
  "transito e servicos": "Trânsito",
  "trânsito e serviços": "Trânsito",

  // Outros
  outros: "Outros",
  outro: "Outros",
  geral: "Outros",
  "fechamento do dia": "Outros",
};

/**
 * Normaliza uma categoria de notícia para uma das 12 categorias canônicas oficiais.
 * Mapeia termos compostos, variações e tópicos específicos para a categoria correta.
 * Qualquer termo não reconhecido é mapeado com segurança para "Outros", garantindo que
 * nenhuma notícia fique sem filtro ou quebre a interface com botões gigantes.
 */
export function normalizeCategory(raw: string): string {
  if (!raw) return "Outros";
  const cleaned = raw.trim();
  const lower = cleaned.toLowerCase();
  const norm = normalizeText(cleaned);

  // 1. Dicionário canônico direto (com e sem acentos)
  if (CANONICAL_NEWS_CATEGORIES[lower]) return CANONICAL_NEWS_CATEGORIES[lower];
  if (CANONICAL_NEWS_CATEGORIES[norm]) return CANONICAL_NEWS_CATEGORIES[norm];

  // 2. Chave limpa alfanumérica
  const alphaKey = norm.replace(/[^a-z0-9]/g, "");
  for (const [k, v] of Object.entries(CANONICAL_NEWS_CATEGORIES)) {
    if (k.replace(/[^a-z0-9]/g, "") === alphaKey) return v;
  }

  // 3. Heurísticas por radicais/tokens
  if (/clima|tempo|precipit|simepar|chuva|geada|frio|defesa\s*civil|meteorol/.test(norm)) return "Clima";
  if (/saude|hospital|vacina|medic|plantao|preventivo|clinica|dengue|exame/.test(norm)) return "Saúde";
  if (/transito|rodovia|via\b|rua|asfalto|sinaliza|onibus|tarifa|mobilidade/.test(norm)) return "Trânsito";
  if (/educa|escola|colegio|vestibular|unicentro|merenda|aluno|professor|academ/.test(norm)) return "Educação";
  if (/seguranca|policia|pmpr|bope|bombeiro|furto|assalto|crime|apreens|droga/.test(norm)) return "Segurança";
  if (/cultura|arte|show|teatro|musica|festival|festiv|lazer|esporte|turismo/.test(norm)) return "Cultura";
  if (/social|comunidade|solidari|voluntar|doacao|filantrop|cras|creas|romaria|fe\b/.test(norm)) return "Social";
  if (/prazo|edital|inscric|vencimento|calendario|chamada/.test(norm)) return "Prazos";
  if (/tecnolog|digital|software|inovac|ciencia|startup/.test(norm)) return "Tecnologia";
  if (/econom|trabalho|emprego|vaga|renda|salario|empresa|comercio|fiscal|tribut/.test(norm)) return "Economia";
  if (/politica|prefeit|camara|vereador|decreto|governo|gestao|legislat|boletim/.test(norm)) return "Política";

  // 4. Se já for exatamente uma das 12 categorias
  const directMatch = FIXED_NEWS_CATEGORIES.find((c) => normalizeText(c) === norm);
  if (directMatch) return directMatch;

  return "Outros";
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

/**
 * Normaliza um texto removendo acentos, convertendo para minúsculas e
 * colapsando letras consecutivas repetidas (ex: "anna" -> "ana", "bassara" -> "basara").
 */
export function fuzzyNormalize(text: string): string {
  return normalizeText(text).replace(/(.)\1+/g, "$1");
}

/**
 * Verifica se um texto contém todos os tokens da busca de forma tolerante:
 * - Insensível a acentos e maiúsculas
 * - Tolerante a consoantes dobradas (ex: Ana vs Anna, Matos vs Mattos)
 * - Multi-token: todos os termos digitados devem estar presentes no alvo
 */
export function matchesFuzzyQuery(targetText: string, query: string): boolean {
  if (!query.trim()) return true;
  if (!targetText) return false;

  const normQuery = normalizeText(query);
  const normTarget = normalizeText(targetText);

  // 1. Verificação rápida direta
  if (normTarget.includes(normQuery)) return true;

  // 2. Verificação com colapso de letras duplicadas
  const fuzzyTarget = fuzzyNormalize(targetText);
  const fuzzyTokens = fuzzyNormalize(query).split(/\s+/).filter(Boolean);

  if (fuzzyTokens.length === 0) return true;

  return fuzzyTokens.every((token) => fuzzyTarget.includes(token));
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
      // Comparação estrita por categoria canônica: evita que uma notícia de
      // "Polícia" apareça no filtro "Social" só porque o título contém a palavra.
      if (normalizeCategory(item.category) !== normalizeCategory(category)) {
        return false;
      }
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
