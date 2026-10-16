import JSZip from 'jszip';
import { jobOpeningInputSchema, JobOpeningInput } from '@/lib/mcp/schema';
import { getTodayDateString } from '@/lib/utils/date';

const COMPANY_PREFIXES = [
  'Empresa contratante:',
  'Empresa / Entidade contratante:',
  'Empresa / Instituição contratante:',
  'Empresa / Plataforma contratante:',
  'Empresa / Órgão contratante:',
  'Empresa / Orgao contratante:',
  'Empresa:',
];

export async function parseDocxBuffer(buffer: ArrayBuffer | Buffer): Promise<JobOpeningInput[]> {
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

  return parseJobParagraphs(paragraphs);
}

function isCompanyLine(txt: string): boolean {
  if (!txt) return false;
  const clean = txt.replace(/^[\s\-*•_#]+/, '').trim();
  return (
    COMPANY_PREFIXES.some((pfx) => clean.toLowerCase().startsWith(pfx.toLowerCase())) ||
    /^(?:empresa(?:\s*[\/\-]\s*(?:entidade|instituição|instituicao|plataforma|órgão|orgao))?\s*(?:contratante)?)\s*:/i.test(clean)
  );
}

function extractCompany(txt: string): string {
  const clean = txt.replace(/^[\s\-*•_#]+/, '').trim();
  const replaced = clean.replace(
    /^(?:empresa(?:\s*[\/\-]\s*(?:entidade|instituição|instituicao|plataforma|órgão|orgao))?\s*(?:contratante)?)\s*:\s*/i,
    ''
  );
  return replaced.replace(/[\*_]/g, '').trim() || 'Empresa Confidencial';
}

function cleanField(f: string): string {
  return f.replace(/^[\s\-*•_#]+/, '').trim();
}

function isFieldLine(txt: string): boolean {
  if (!txt) return false;
  if (isCompanyLine(txt)) return true;
  const clean = cleanField(txt).toLowerCase();
  return /^(?:registro\s+no\s+documento|registrad[ao]\s+em|data\s+de\s+registro|data\s+de\s+publica[çc][ãa]o|publicad[ao]\s+em|modalidade|local|tipo\s+de\s+contrato|contrato|benef[íi]cios?|atribui[çc][õo]es|descri[çc][ãa]o|requisitos|remunera[çc][ãa]o|sal[áa]rio|hor[áa]rio|carga\s+hor[áa]ria|inscri[çc][õo]es|prazo|fonte|canal|link|c[óo]digo(?:\s+da\s+vaga)?|id(?:\s+da\s+vaga)?)\s*:/i.test(
    clean
  );
}

function isNextJobStart(paragraphs: { text: string; links: string[] }[], index: number): boolean {
  if (index >= paragraphs.length) return false;
  const currentText = paragraphs[index].text.trim();
  if (!currentText) return false;

  // Se a linha é uma Empresa Contratante, pode iniciar uma vaga
  if (isCompanyLine(currentText)) return true;

  // Se a linha atual é uma linha de campo conhecida, não é início de vaga
  if (isFieldLine(currentText)) return false;

  // Se for cabeçalho global do documento, não é vaga
  const IGNORED = [
    'vagas registradas',
    'atualização diária',
    'oportunidades e vagas',
    'este documento é atualizado',
  ];
  const cleanLower = currentText.toLowerCase();
  if (IGNORED.some((ig) => cleanLower.includes(ig))) return false;

  // Procura se nas próximas linhas há uma linha de Empresa Contratante
  let checkedCount = 0;
  for (let offset = 1; index + offset < paragraphs.length && checkedCount < 5; offset++) {
    const candidate = paragraphs[index + offset].text.trim();
    if (!candidate) continue;
    checkedCount++;

    if (isCompanyLine(candidate)) {
      return true;
    }
    // Se no caminho encontrarmos outra linha que não é campo, interrompe
    if (!isFieldLine(candidate)) {
      break;
    }
  }

  return false;
}

/**
 * Converte parágrafos com texto e links no formato normalizado de vagas JobOpeningInput[].
 */
export function parseJobParagraphs(paragraphs: { text: string; links: string[] }[]): JobOpeningInput[] {
  // 3. Agrupa parágrafos em blocos de vagas
  const rawJobs: { title: string; link: string; fields: string[] }[] = [];
  let i = 0;

  while (i < paragraphs.length) {
    if (isNextJobStart(paragraphs, i)) {
      let title = '';
      let link = '';
      const jobFields: string[] = [];
      let hasSeenCompany = false;

      const currentTxt = paragraphs[i].text.trim();
      if (!isCompanyLine(currentTxt)) {
        // paragraphs[i] é o título da vaga
        const titleItem = paragraphs[i];
        title = titleItem.text.replace(/^[\s\-*•_#]+/, '').replace(/[\*_]/g, '').trim();
        link = titleItem.links[0] || '';
        i++;
      } else {
        // Empresa direta sem título explícito prévio
        if (i > 0 && !isFieldLine(paragraphs[i - 1].text)) {
          title = paragraphs[i - 1].text.replace(/^[\s\-*•_#]+/, '').replace(/[\*_]/g, '').trim();
          link = paragraphs[i - 1].links[0] || '';
        }
      }

      // Agora acumula todos os campos desta vaga até a próxima vaga
      while (i < paragraphs.length) {
        const lineTxt = paragraphs[i].text.trim();
        if (!lineTxt) {
          i++;
          continue;
        }

        // Se encontramos o início da próxima vaga:
        // Caso A: nova linha de título (!isCompanyLine) que inicia próxima vaga -> para
        // Caso B: já vimos uma empresa nesta vaga e encontramos outra linha de empresa -> para
        if (isNextJobStart(paragraphs, i) && (!isCompanyLine(lineTxt) || hasSeenCompany)) {
          break;
        }

        if (isCompanyLine(lineTxt)) {
          hasSeenCompany = true;
        }

        const IGNORED = [
          'Vagas Registradas',
          'Atualização Diária de Vagas',
          'Oportunidades e Vagas de Emprego - Guarapuava / PR',
        ];

        if (!IGNORED.some((ig) => lineTxt.includes(ig))) {
          jobFields.push(lineTxt);
          if (!link && paragraphs[i].links.length > 0) {
            link = paragraphs[i].links[0];
          }
        }

        i++;
      }

      if (title || jobFields.some((f) => isCompanyLine(f))) {
        rawJobs.push({
          title,
          link,
          fields: jobFields,
        });
      }
    } else {
      i++;
    }
  }

  // Fallback: se nenhum bloco clássico com "Empresa:" foi encontrado,
  // mas existem parágrafos individuais com hiperlinks de vagas
  if (rawJobs.length === 0) {
    const IGNORED = [
      'oportunidades e vagas',
      'atualização diária',
      'vagas registradas',
      'este documento é atualizado',
    ];

    for (const p of paragraphs) {
      const textClean = p.text.replace(/^[\s\-*•_#]+/, '').trim();
      const isIgnored = IGNORED.some((ig) => textClean.toLowerCase().includes(ig));
      if (!isIgnored && p.links.length > 0 && textClean.length > 5) {
        let company = 'Empresa Confidencial';
        if (textClean.includes(' - ')) {
          const parts = textClean.split(' - ');
          company = parts[parts.length - 1].replace(/\(.*?\)/g, '').trim() || company;
        } else if (p.links[0]?.includes('sicredi')) {
          company = 'Sicredi';
        }

        rawJobs.push({
          title: textClean,
          link: p.links[0],
          fields: [
            `Empresa: ${company}`,
            'Modalidade: Presencial',
            'Descrição da Vaga: Oportunidade de trabalho em Guarapuava / PR divulgada nos canais oficiais.',
            'Requisitos: Consultar requisitos completos e instruções no link da vaga.',
          ],
        });
      }
    }
  }

  // 4. Normaliza cada vaga para o schema
  const validatedJobs: JobOpeningInput[] = [];

  for (const r of rawJobs) {
    const title = r.title.trim();
    if (!title) continue;

    let company = 'Empresa Confidencial';
    let registeredAt: string | null = null;
    let publishedDate: string | null = null;
    let deadline: string | null = null;
    let location = 'Guarapuava - PR';
    let workModel: 'Presencial' | 'Híbrido' | 'Remoto' | 'Externo/Campo' = 'Presencial';
    let contractType = 'CLT';
    let vacanciesCount = 1;
    let isPcd = false;
    let isPcdExclusive = false;
    let compensation: string | null = null;
    let schedule: string | null = null;
    const descItems: string[] = [];
    const reqItems: string[] = [];
    const benItems: string[] = [];

    const vMatch = title.match(/\((\d+)\s+[Vv]agas?\)/);
    if (vMatch) {
      vacanciesCount = parseInt(vMatch[1], 10);
    }

    for (const f of r.fields) {
      const clean = cleanField(f);

      if (isCompanyLine(clean)) {
        company = extractCompany(clean);
      } else if (/^registro\s+no\s+documento\s*:/i.test(clean) || /^registrad[ao]\s+em\s*:/i.test(clean)) {
        const colonIdx = clean.indexOf(':');
        registeredAt = colonIdx !== -1 ? clean.substring(colonIdx + 1).trim() : clean;
      } else if (
        /^data\s+de\s+publica[çc][ãa]o(?:\s+original)?\s*:/i.test(clean) ||
        /^publicad[ao]\s+em\s*:/i.test(clean)
      ) {
        const colonIdx = clean.indexOf(':');
        const val = colonIdx !== -1 ? clean.substring(colonIdx + 1).trim() : '';
        const dlMatch = val.match(/[Ii]nscrições.*?(?:até|encerram em)\s+([0-9]{2}\/[0-9]{2}\/[0-9]{4})/);
        if (dlMatch) {
          deadline = dlMatch[1];
        }
        const dateMatches = val.match(/([0-9]{2}\/[0-9]{2}\/[0-9]{4})/g);
        if (dateMatches) {
          const pubCandidate = dateMatches.find((d) => d !== deadline) || (!dlMatch ? dateMatches[0] : null);
          if (pubCandidate) {
            publishedDate = pubCandidate;
          }
        }
      } else if (
        /^modalidade(?:\s+e\s+local)?\s*:/i.test(clean) ||
        /^local(?:\s+e\s+atendimento)?\s*:/i.test(clean)
      ) {
        const val = clean.split(':', 2)[1]?.trim() || '';
        if (val.includes('Remoto')) workModel = 'Remoto';
        else if (val.includes('Híbrido') || val.includes('Hibrido')) workModel = 'Híbrido';
        else if (val.includes('Externo') || val.includes('Campo')) workModel = 'Externo/Campo';
        else workModel = 'Presencial';

        if (val.includes('PcD')) {
          isPcd = true;
          if (val.toLowerCase().includes('exclusiv')) {
            isPcdExclusive = true;
          }
        }

        if (val.includes('Estágio') || val.includes('Estagio')) contractType = 'Estágio';
        else if (val.includes('Temporári') || val.includes('Temporari')) contractType = 'Temporário';
        else if (val.includes('Teste Seletivo')) contractType = 'Teste Seletivo';
        else if (val.includes('Jovem Aprendiz')) contractType = 'Jovem Aprendiz';
        else if (val.includes('PJ')) contractType = 'PJ/MEI';

        const locClean = val.replace(/\(.*?\)/g, '').trim();
        if (locClean.includes('Guarapuava')) {
          location = 'Guarapuava - PR';
        }
      } else if (
        /^descri[çc][ãa]o(?:\s+e\s+responsabilidades|\s+da\s+vaga|\s+e\s+destaques)?\s*:/i.test(clean)
      ) {
        const val = clean.split(':', 2)[1]?.trim() || '';
        const items = val.split(';').map((x) => x.trim()).filter((x) => x.length > 3);
        if (items.length > 0) {
          descItems.push(...items);
        } else if (val) {
          descItems.push(val);
        }
      } else if (
        /^requisitos(?:\s+gerais|\s+e\s+sele[çc][ãa]o)?\s*:/i.test(clean)
      ) {
        const val = clean.split(':', 2)[1]?.trim() || '';
        const items = val.split(';').map((x) => x.trim()).filter((x) => x.length > 3);
        if (items.length > 0) {
          reqItems.push(...items);
        } else if (val) {
          reqItems.push(val);
        }
      } else if (
        /^benef[íi]cios(?:\s+e\s+vantagens)?\s*:/i.test(clean) ||
        /^bolsa\s+e\s+benef[íi]cios\s*:/i.test(clean)
      ) {
        const val = clean.split(':', 2)[1]?.trim() || '';
        const items = val
          .split(/[,;]/)
          .map((x) => x.trim())
          .filter((x) => x.length > 2);
        benItems.push(...items);
      } else if (
        /^(?:jornada\s+e\s+remunera[çc][ãa]o|remunera[çc][ãa]o|sal[áa]rio|bolsa-?aux[íi]lio)\s*:/i.test(clean)
      ) {
        compensation = clean.split(':', 2)[1]?.trim() || null;
      } else {
        if (clean.length > 10) {
          descItems.push(clean);
        }
      }
    }

    if (descItems.length === 0) {
      descItems.push('Atuação profissional na cidade de Guarapuava - PR.');
    }
    if (reqItems.length === 0) {
      reqItems.push('Consultar requisitos detalhados na página oficial da vaga.');
    }

    const sourceUrl = r.link || 'https://guarapuava.pr.gov.br/noticias';

    // Se publishedDate não foi explicitamente informado, deriva da data de registro ou de hoje
    if (!publishedDate) {
      if (registeredAt) {
        const regDateMatch = registeredAt.match(/([0-9]{2}\/[0-9]{2}\/[0-9]{4})/);
        if (regDateMatch) {
          publishedDate = regDateMatch[1];
        }
      }
      if (!publishedDate) {
        publishedDate = getTodayDateString();
      }
    }

    try {
      const parsed = jobOpeningInputSchema.parse({
        title,
        company,
        location,
        workModel,
        contractType,
        vacanciesCount,
        isPcd,
        isPcdExclusive,
        publishedDate,
        registeredAt,
        applicationDeadline: deadline,
        compensation,
        schedule,
        sourceUrl,
        descriptionItems: descItems,
        requirementItems: reqItems,
        benefitItems: benItems,
      });
      validatedJobs.push(parsed);
    } catch (err: any) {
      console.warn(`Vaga ignorada "${title}":`, err?.message);
    }
  }

  return validatedJobs;
}

/**
 * Converte o texto recebido do Google Apps Script (preservando links embutidos) em JobOpeningInput[].
 */
export function parseDocText(content: string): JobOpeningInput[] {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const paragraphs: { text: string; links: string[] }[] = [];

  for (const line of lines) {
    const links: string[] = [];
    let cleanText = line;

    // Detecta links em formato markdown: [Texto](https://...)
    const mdLinkMatches = [...cleanText.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g)];
    if (mdLinkMatches.length > 0) {
      for (const m of mdLinkMatches) {
        if (!links.includes(m[2])) links.push(m[2]);
      }
      cleanText = cleanText.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1').trim();
    }

    // Detecta padrão customizado: (Link: https://...)
    const customLinkMatch = cleanText.match(/\(Link:\s*(https?:\/\/[^\s)]+)\)/i);
    if (customLinkMatch) {
      if (!links.includes(customLinkMatch[1])) links.push(customLinkMatch[1]);
      cleanText = cleanText.replace(/\(Link:\s*https?:\/\/[^\s)]+\)/i, '').trim();
    } else if (links.length === 0) {
      // Detecta URL direta na linha caso não tenha link extraído
      const urlMatch = cleanText.match(/(https?:\/\/[^\s)]+)/i);
      if (urlMatch) {
        links.push(urlMatch[1]);
      }
    }

    paragraphs.push({ text: cleanText, links });
  }

  return parseJobParagraphs(paragraphs);
}

