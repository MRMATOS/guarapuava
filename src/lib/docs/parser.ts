import JSZip from 'jszip';
import { jobOpeningInputSchema, JobOpeningInput } from '@/lib/mcp/schema';

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

/**
 * Converte parágrafos com texto e links no formato normalizado de vagas JobOpeningInput[].
 */
export function parseJobParagraphs(paragraphs: { text: string; links: string[] }[]): JobOpeningInput[] {
  // 3. Agrupa parágrafos em blocos de vagas
  const rawJobs: { title: string; link: string; fields: string[] }[] = [];
  let i = 0;

  while (i < paragraphs.length) {
    const txt = paragraphs[i].text;
    if (isCompanyLine(txt)) {
      const titleItem = i > 0 ? paragraphs[i - 1] : { text: '', links: [] };
      const title = titleItem.text.replace(/^[\s\-*•_#]+/, '').replace(/[\*_]/g, '').trim();
      let link = titleItem.links[0] || (paragraphs[i].links[0] ?? '');

      const jobFields = [txt];
      let j = i + 1;

      while (j < paragraphs.length) {
        const nextTxt = paragraphs[j].text;
        if (isCompanyLine(nextTxt)) {
          break;
        }
        if (
          j + 1 < paragraphs.length &&
          isCompanyLine(paragraphs[j + 1].text)
        ) {
          break;
        }
        if (
          nextTxt &&
          !['Vagas Registradas', 'Atualização Diária de Vagas', 'Oportunidades e Vagas de Emprego - Guarapuava / PR'].some(
            (ignored) => nextTxt.includes(ignored)
          )
        ) {
          jobFields.push(nextTxt);
          if (!link && paragraphs[j].links.length > 0) {
            link = paragraphs[j].links[0];
          }
        }
        j++;
      }

      rawJobs.push({
        title,
        link,
        fields: jobFields,
      });
      i = j;
    } else {
      i++;
    }
  }

  // 4. Normaliza cada vaga para o schema
  const validatedJobs: JobOpeningInput[] = [];

  for (const r of rawJobs) {
    const title = r.title.trim();
    if (!title) continue;

    let company = 'Empresa Confidencial';
    let registeredAt: string | null = null;
    let publishedDate = '01/10/2026';
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
        registeredAt = clean.split(':', 2)[1]?.trim() || null;
      } else if (
        /^data\s+de\s+publica[çc][ãa]o(?:\s+original)?\s*:/i.test(clean) ||
        /^publicad[ao]\s+em\s*:/i.test(clean)
      ) {
        const val = clean.split(':', 2)[1]?.trim() || '';
        const dlMatch = val.match(/[Ii]nscrições.*?(?:até|encerram em)\s+([0-9]{2}\/[0-9]{2}\/[0-9]{4})/);
        if (dlMatch) {
          deadline = dlMatch[1];
        }
        const dateMatch = val.match(/([0-9]{2}\/[0-9]{2}\/[0-9]{4})/);
        if (dateMatch) {
          publishedDate = dateMatch[1];
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

    // Detecta padrão customizado: (Link: https://...)
    const customLinkMatch = line.match(/\(Link:\s*(https?:\/\/[^\s)]+)\)/i);
    if (customLinkMatch) {
      links.push(customLinkMatch[1]);
      cleanText = line.replace(/\(Link:\s*https?:\/\/[^\s)]+\)/i, '').trim();
    } else {
      // Detecta URL direta na linha caso exista
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/i);
      if (urlMatch) {
        links.push(urlMatch[1]);
      }
    }

    paragraphs.push({ text: cleanText, links });
  }

  return parseJobParagraphs(paragraphs);
}

