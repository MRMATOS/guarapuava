export interface NewsItem {
  id: string;
  category: string; // Ex: "Política", "Saúde", "Prazos", "Clima", "Lazer & Cultura", "Educação"
  title: string;    // Ex: "Bancada regional na ALEP"
  text: string;     // Descrição resumida da notícia
}

export interface NewsBatch {
  id: string;
  date: string;     // Ex: "06/10/2026"
  time: string;     // Ex: "10:15", "08:45", "06:05"
  items: NewsItem[];
}

export interface DailyDigest {
  date: string;
  lastUpdatedTime: string;
  headline: string;
  highlights: NewsItem[];
  batches: NewsBatch[];
}
