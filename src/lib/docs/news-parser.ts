import JSZip from 'jszip';
import { DailyDigest, NewsBatch, NewsItem } from '@/types/news';

export interface RawNewsRound {
  date: string;
  time: string;
  headline?: string;
  highlights: NewsItem[];
  deltaItems: NewsItem[];
}

/**
 * Converte data brasileira "DD/MM/AAAA" para formato ISO "AAAA-MM-DD"
 */
export function parseDateToIso(dateStr: string): string {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
}

/**
 * Converte DOCX buffer em lista de DailyDigest[] agrupados por dia.
 */
export async function parseNewsDocxBuffer(buffer: ArrayBuffer | Buffer): Promise<DailyDigest[]> {
  const zip = await JSZip.loadAsync(buffer);

  // 1. Mapeia relacionamentos de hiperlinks (word/_rels/document.xml.rels)
  const relsXml = (await zip.file('word/_rels/document.xml.rels')?.async('text')) || '';
  const relsMap = new Map<string, string>();
  const relRegex = /<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g;
  let relMatch;
  while ((relMatch = relRegex.exec(relsXml)) !== null) {
    if (relMatch[2].startsWith('http')) {
      relsMap.set(relMatch[1], relMatch[2]);
    }
  }

  // 2. Extrai parágrafos do documento principal (word/document.xml)
  const docXml = (await zip.file('word/document.xml')?.async('text')) || '';
  const pRegex = /<w:p(?:[\s>][\s\S]*?<\/w:p>|\/>)/g;

  const paragraphs: { text: string; links: string[] }[] = [];
  let pMatch;

  while ((pMatch = pRegex.exec(docXml)) !== null) {
    const pContent = pMatch[0];

    // Extrai texto dos nós <w:t>
    const tRegex = /<w:t(?:[^>]*)>([\s\S]*?)<\/w:t>/g;
    let tMatch;
    let fullText = '';
    while ((tMatch = tRegex.exec(pContent)) !== null) {
      fullText += tMatch[1];
    }
    fullText = fullText.trim();

    // Extrai links dos nós <w:hyperlink>
    const hlRegex = /<w:hyperlink[^>]+r:id="([^"]+)"/g;
    let hlMatch;
    const links: string[] = [];
    while ((hlMatch = hlRegex.exec(pContent)) !== null) {
      const target = relsMap.get(hlMatch[1]);
      if (target) links.push(target);
    }

    if (fullText || links.length > 0) {
      paragraphs.push({ text: fullText, links });
    }
  }

  return parseNewsParagraphs(paragraphs);
}

/**
 * Converte o texto recebido do Google Apps Script (webhook) em DailyDigest[].
 */
export function parseNewsDocText(content: string): DailyDigest[] {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const paragraphs: { text: string; links: string[] }[] = [];

  for (const line of lines) {
    const links: string[] = [];
    let cleanText = line;

    // Detecta padrão customizado: (Link: https://...)
    const customLinkMatch = line.match(/\(Link:\s*(https?:\/\/[^\s)]+)\)/i);
    if (customLinkMatch) {
      links.push(customLinkMatch[1]);
      cleanText = line.replace(/\(Link:\s*https?:\/\/[^\s)]+\)/i, '').trim();
    } else {
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/i);
      if (urlMatch) {
        links.push(urlMatch[1]);
      }
    }

    paragraphs.push({ text: cleanText, links });
  }

  return parseNewsParagraphs(paragraphs);
}

/**
 * Núcleo do Parser: analisa os parágrafos identificando rodadas de atualização,
 * blocos DELTA FEED e Card Principal do Dia.
 */
export function parseNewsParagraphs(paragraphs: { text: string; links: string[] }[]): DailyDigest[] {
  const rounds: RawNewsRound[] = [];
  let currentRound: RawNewsRound | null = null;
  let inDeltaFeed = false;
  let inCardPrincipal = false;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const text = p.text.trim();
    if (!text) continue;

    // 1. Detecta cabeçalho de atualização: "Atualização em DD/MM/AAAA às HH:MM"
    const updateHeaderMatch = text.match(/Atualização em\s+(\d{2}\/\d{2}\/\d{4})\s+às\s+(\d{2}:\d{2})/i);
    if (updateHeaderMatch) {
      if (currentRound && (currentRound.headline || currentRound.deltaItems.length > 0)) {
        rounds.push(currentRound);
      }
      currentRound = {
        date: updateHeaderMatch[1],
        time: updateHeaderMatch[2],
        highlights: [],
        deltaItems: [],
      };
      inDeltaFeed = false;
      inCardPrincipal = false;
      continue;
    }

    // 2. Detecta início do Delta Feed: "DELTA FEED - [HH:MM]" ou "DELTA FEED"
    const deltaFeedMatch = text.match(/DELTA FEED\s*(?:-\s*\[?(\d{2}:\d{2})\]?)?/i);
    if (deltaFeedMatch) {
      inDeltaFeed = true;
      inCardPrincipal = false;
      if (currentRound && deltaFeedMatch[1]) {
        currentRound.time = deltaFeedMatch[1];
      }
      continue;
    }

    // 3. Detecta início do Card Principal: "Card Principal do Dia"
    if (/^Card Principal do Dia/i.test(text)) {
      inDeltaFeed = false;
      inCardPrincipal = true;
      continue;
    }

    // Se estivermos em outra seção como "Seção 1:", "Seção 2:", encerra delta feed ou card
    if (/^Seção \d+:/i.test(text)) {
      inDeltaFeed = false;
      inCardPrincipal = false;
      continue;
    }

    if (!currentRound) continue;

    // Processa itens dentro do DELTA FEED
    if (inDeltaFeed) {
      // Ignora avisos entre parênteses como "(Alimentação de novidades...)"
      if (text.startsWith('(') && text.endsWith(')')) continue;

      // Padrão: "[Categoria] Notícia nova: texto Fonte: fonte" ou variações
      const deltaItemMatch = text.match(/^\[([^\]]+)\]\s*(?:Notícia nova:\s*)?(.*?)(?:\s*Fonte:\s*(.*))?$/i);
      if (deltaItemMatch) {
        const category = deltaItemMatch[1].trim();
        const rawBody = deltaItemMatch[2].trim();
        const rawSource = deltaItemMatch[3]?.trim();

        // Extrai link caso presente nos nós do parágrafo
        const link = p.links[0];
        const fullSource = rawSource ? rawSource : (link ? link : undefined);

        const id = `item-${currentRound.date.replace(/\//g, '')}-${currentRound.time.replace(/:/g, '')}-${currentRound.deltaItems.length + 1}`;

        // Extrai título simples da notícia ou usa a categoria
        let itemTitle = category;
        const titleMatch = rawBody.match(/^([^:–—]+)[:–—]\s*(.+)$/);
        let itemText = rawBody;
        if (titleMatch && titleMatch[1].length < 60) {
          itemTitle = titleMatch[1].trim();
          itemText = titleMatch[2].trim();
        }

        currentRound.deltaItems.push({
          id,
          category,
          title: itemTitle,
          text: itemText,
          source: fullSource,
        });
      }
      continue;
    }

    // Processa linhas dentro do Card Principal do Dia
    if (inCardPrincipal) {
      // Manchete do dia
      const headlineMatch = text.match(/^Manchete:\s*(.+)$/i);
      if (headlineMatch) {
        currentRound.headline = headlineMatch[1].trim();
        continue;
      }

      // Destaques por categoria: "Categoria: texto"
      const highlightMatch = text.match(/^([^:]+):\s*(.+)$/);
      if (highlightMatch) {
        const cat = highlightMatch[1].trim();
        const body = highlightMatch[2].trim();

        // Evita capturar cabeçalhos estranhos
        if (!['Modalidade', 'Local', 'Data e Horário', 'Divulgação'].includes(cat)) {
          const id = `h-${currentRound.date.replace(/\//g, '')}-${currentRound.highlights.length + 1}`;
          currentRound.highlights.push({
            id,
            category: cat,
            title: cat,
            text: body,
          });
        }
      }
    }
  }

  // Adiciona a última rodada
  if (currentRound && (currentRound.headline || currentRound.deltaItems.length > 0)) {
    rounds.push(currentRound);
  }

  // 4. Agrupa as rodadas por dia e consolida os lotes horários
  const dayGroups = new Map<string, {
    date: string;
    latestTime: string;
    headline: string;
    highlights: NewsItem[];
    batchesMap: Map<string, NewsBatch>;
  }>();

  for (const round of rounds) {
    if (!dayGroups.has(round.date)) {
      dayGroups.set(round.date, {
        date: round.date,
        latestTime: round.time,
        headline: round.headline || '',
        highlights: round.highlights,
        batchesMap: new Map<string, NewsBatch>(),
      });
    }

    const day = dayGroups.get(round.date)!;

    // Atualiza com a rodada mais recente do dia (compara HH:MM)
    if (round.time >= day.latestTime || !day.headline) {
      day.latestTime = round.time;
      if (round.headline) day.headline = round.headline;
      if (round.highlights.length > 0) day.highlights = round.highlights;
    }

    // Adiciona o lote horário se tiver itens no delta
    if (round.deltaItems.length > 0) {
      if (!day.batchesMap.has(round.time)) {
        day.batchesMap.set(round.time, {
          id: `batch-${round.date.replace(/\//g, '')}-${round.time.replace(/:/g, '')}`,
          date: round.date,
          time: round.time,
          items: [...round.deltaItems],
        });
      } else {
        // Mescla sem duplicar itens com mesmo id
        const existingBatch = day.batchesMap.get(round.time)!;
        for (const item of round.deltaItems) {
          if (!existingBatch.items.some((it) => it.text === item.text)) {
            existingBatch.items.push(item);
          }
        }
      }
    }
  }

  // 5. Constrói o array final de DailyDigest[]
  const digests: DailyDigest[] = [];

  for (const [dateStr, day] of dayGroups.entries()) {
    // Ordena os lotes horários do mais recente para o mais antigo (12:20 > 11:45 > 10:30)
    const sortedBatches = Array.from(day.batchesMap.values()).sort((a, b) => {
      return b.time.localeCompare(a.time);
    });

    // Se o dia não tiver headline nem batches, ignora
    if (!day.headline && sortedBatches.length === 0) continue;

    digests.push({
      date: dateStr,
      dateIso: parseDateToIso(dateStr),
      lastUpdatedTime: day.latestTime,
      headline: day.headline || 'Notícias e atualizações de Guarapuava',
      highlights: day.highlights,
      batches: sortedBatches,
      isActive: true,
    });
  }

  // Ordena os dias do mais recente para o mais antigo (ex: 07/10/2026 antes de 06/10/2026)
  digests.sort((a, b) => {
    const isoA = a.dateIso || parseDateToIso(a.date);
    const isoB = b.dateIso || parseDateToIso(b.date);
    return isoB.localeCompare(isoA);
  });

  return digests;
}
