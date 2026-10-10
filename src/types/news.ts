export interface NewsItem {
  id: string;
  category: string; // Ex: "Política", "Saúde", "Prazos", "Clima", "Lazer & Cultura", "Educação"
  title: string;    // Ex: "Bancada regional na ALEP"
  text: string;     // Descrição resumida da notícia
  source?: string;  // Ex: "Portal RSN", "Prefeitura de Guarapuava"
  url?: string;     // Link direto para a matéria completa no site de origem
}

export interface NewsBatch {
  id: string;
  date: string;     // Ex: "06/10/2026"
  time: string;     // Ex: "10:15", "08:45", "06:05"
  items: NewsItem[];
}

export interface DailyDigest {
  id?: string;
  date: string;
  dateIso?: string;
  lastUpdatedTime: string;
  headline: string;
  highlights: NewsItem[];
  batches: NewsBatch[];
  isActive?: boolean;
}

export interface DatabaseNewsDigestRow {
  id: string;
  date: string;
  date_iso: string;
  last_updated_time: string;
  headline: string;
  highlights: NewsItem[];
  batches: NewsBatch[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
