import fs from "fs";
import path from "path";
import type { DadosHorariosOnibus, LinhaBairro, PontoItinerario } from "../src/types/bus";

const SRC_DATA_PATH = path.join(process.cwd(), "src/data/horarios-onibus.json");
const PUB_DATA_PATH = path.join(process.cwd(), "public/data/horarios-onibus.json");

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Formata o nome de exibição do ponto exatamente como renderizado no Card da interface.
 */
export function formatStopDisplayName(
  ponto: PontoItinerario,
  fallbackBairro?: string
): string {
  let raw = (ponto.nome || ponto.rua || "").trim();

  // 1. Remove prefixo numérico de rota (ex: "365-R. Judite..." -> "R. Judite...")
  raw = raw.replace(/^\d+\s*-\s*/, "").trim();

  // 2. Remove os termos "Rua" e "R."
  raw = raw.replace(/\b(rua|r\.)\s+/gi, "").trim();

  // 3. Converte parênteses em traço (ex: "(Gastrocentro)" -> " - Gastrocentro")
  raw = raw.replace(/\s*\((.*?)\)\s*/g, " - $1").trim();

  // 4. Limpa traços duplicados ou soltos
  raw = raw.replace(/\s*-\s*-\s*/g, " - ").trim();
  raw = raw.replace(/^-\s*/, "").replace(/\s*-$/, "").trim();

  // 5. Adiciona bairro no final caso ainda não esteja presente
  const bairro = (ponto.bairro || fallbackBairro || "").trim();
  if (bairro) {
    const normBairro = normalizeText(bairro);
    const normRaw = normalizeText(raw);
    if (!normRaw.includes(normBairro)) {
      raw = `${raw} - ${bairro}`;
    }
  }

  return raw;
}

/**
 * Avalia se o texto descrito no card (ou metadados do ponto) constitui de fato um endereço ou ponto de interesse válido.
 */
export function evaluateStopAddress(
  ponto: PontoItinerario,
  fallbackBairro?: string
): { isValid: boolean; effectiveAddress: string; reason: string } {
  let cardTitle = formatStopDisplayName(ponto, fallbackBairro);
  const rawNome = (ponto.nome || "").trim();
  const rawRua = (ponto.rua || "").trim();
  const bairro = (ponto.bairro || fallbackBairro || "").trim();

  // Caso especial: se o nome for genérico (ex: "Ponto de Parada") mas tivermos uma rua válida preenchida
  if (
    /^ponto de parada$/i.test(rawNome) ||
    /^fonte (sa[íi]da|chegada)$/i.test(rawNome) ||
    /^fonte$/i.test(rawNome)
  ) {
    if (rawRua && rawRua.length >= 6 && !/^ponto/i.test(rawRua)) {
      cardTitle = `${rawRua}${bairro ? ` - ${bairro}` : ""}`;
    }
  }

  const norm = normalizeText(cardTitle);

  // 1. Verificações de strings nulas, curtas ou marcadores internos sem endereço
  if (!cardTitle || cardTitle.length < 5) {
    return { isValid: false, effectiveAddress: cardTitle, reason: "Texto muito curto ou vazio" };
  }

  // Padrões conhecidos de códigos internos de paradas ou direções soltas sem endereço
  const invalidPatterns = [
    /^afonso camargo \d+$/i,
    /^jord[aã]o$/i,
    /^coamo (ida|volta)/i,
    /^antenas rpc (ida|volta)/i,
    /^rio valenga (ida|volta)/i,
    /^r[oó]tula$/i,
    /^sa[íi]da ouro branco$/i,
    /^ponto de parada$/i,
    /^viaduto arag[aã]o de$/i,
    /^mattos le[aã]o$/i,
    /^\d+$/,
  ];

  for (const pat of invalidPatterns) {
    if (pat.test(cardTitle.trim()) || pat.test(norm)) {
      // Se não houver rua substituta válida
      if (!rawRua || rawRua.length < 5 || pat.test(rawRua)) {
        return { isValid: false, effectiveAddress: cardTitle, reason: `Corresponde a marcador sem endereço: "${cardTitle}"` };
      }
    }
  }

  // 2. Critérios de Validação Positiva
  const hasNumber = /\b\d+(-\d+)?\b/.test(cardTitle) || /\bs\/n\b/i.test(cardTitle) || !!ponto.numero;

  const streetOrPoiKeywords = [
    "rua", "r.", "av", "avenida", "rod", "rodovia", "alameda", "al.", "travessa", "tv.",
    "praça", "praca", "pç.", "estação", "estacao", "terminal", "viaduto", "ponte", "trevo",
    "br-", "pr-", "pr170", "pr466", "br277", "parque", "posto", "supermercado", "superpao",
    "superpão", "hiper", "muffato", "parteka", "colegio", "colégio", "faculdade", "escola",
    "igreja", "paroquia", "paróquia", "hospital", "ubs", "cmei", "sede", "condomínio", "condominio",
    "reserva", "loteamento", "campus", "universidade", "unicentro", "utfpr", "campo real",
    "guairaca", "guairacá", "forum", "fórum", "prefeitura", "sanepar", "copel", "detran",
    "energisa", "sesc", "senac", "senai", "crea", "inss", "batalhao", "batalhão", "polijuta"
  ];

  const hasKeyword = streetOrPoiKeywords.some(kw => norm.includes(kw));

  // Se tem número predial + referência/bairro ou logradouro
  if (hasNumber && (hasKeyword || cardTitle.includes(" - ") || (rawRua && rawRua.length >= 4))) {
    return { isValid: true, effectiveAddress: cardTitle, reason: "Endereço com número predial e identificação válida" };
  }

  // Se tem termo chave de rua/POI e tamanho suficiente
  if (hasKeyword && cardTitle.length >= 8) {
    return { isValid: true, effectiveAddress: cardTitle, reason: "Ponto de interesse ou logradouro reconhecido" };
  }

  // Se tem rua estruturada identificada nos dados
  if (rawRua && rawRua.length >= 6 && cardTitle.includes(" - ")) {
    return { isValid: true, effectiveAddress: cardTitle, reason: "Logradouro estruturado no itinerário" };
  }

  return { isValid: false, effectiveAddress: cardTitle, reason: "Não possui elementos suficientes de logradouro ou ponto de interesse" };
}

/**
 * Gera a URL oficial de busca do Google Maps a partir do endereço validado.
 */
export function buildGoogleMapsSearchUrl(address: string): string {
  let clean = address.trim();
  if (!clean.toLowerCase().includes("guarapuava")) {
    clean = `${clean}, Guarapuava - PR`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`;
}

export function runUpdate() {
  console.log("=================================================================");
  console.log("  BUSCA E ATUALIZAÇÃO DOS LINKS DO GOOGLE MAPS PELO CARD");
  console.log("=================================================================");

  if (!fs.existsSync(SRC_DATA_PATH)) {
    console.error(`[ERRO] Arquivo não encontrado: ${SRC_DATA_PATH}`);
    process.exit(1);
  }

  const rawJson = fs.readFileSync(SRC_DATA_PATH, "utf-8");
  const data: DadosHorariosOnibus = JSON.parse(rawJson);

  let totalLinhas = data.linhas.length;
  let totalPontos = 0;
  let atualizadosCount = 0;
  let fallbackCoordCount = 0;
  const skippedList: { linha: string; ponto: string; motivo: string }[] = [];
  const updatedSamples: { card: string; url: string }[] = [];

  for (const linha of data.linhas) {
    for (const ponto of linha.pontos) {
      totalPontos++;
      const evalResult = evaluateStopAddress(ponto, linha.bairro);

      if (evalResult.isValid) {
        ponto.maps_url = buildGoogleMapsSearchUrl(evalResult.effectiveAddress);
        atualizadosCount++;
        if (updatedSamples.length < 5) {
          updatedSamples.push({
            card: evalResult.effectiveAddress,
            url: ponto.maps_url,
          });
        }
      } else {
        // Endereço não validado com precisão: preserva coordenadas se disponíveis
        fallbackCoordCount++;
        if (ponto.latitude && ponto.longitude) {
          ponto.maps_url = `https://www.google.com/maps/search/?api=1&query=${ponto.latitude},${ponto.longitude}`;
        }
        skippedList.push({
          linha: linha.nomeExibicao,
          ponto: ponto.nome,
          motivo: evalResult.reason,
        });
      }
    }
  }

  console.log(`\nLinhas processadas: ${totalLinhas}`);
  console.log(`Total de paradas analisadas: ${totalPontos}`);
  console.log(`Links atualizados pelo endereço do card: ${atualizadosCount} (${((atualizadosCount / totalPontos) * 100).toFixed(1)}%)`);
  console.log(`Links mantidos/fallback (endereço inconclusivo): ${fallbackCoordCount}`);

  console.log("\n--- Exemplos de links gerados com sucesso pelo endereço do card: ---");
  for (const sample of updatedSamples) {
    console.log(`Card: "${sample.card}"`);
    console.log(`URL:  ${sample.url}\n`);
  }

  if (skippedList.length > 0) {
    console.log(`--- Amostra de pontos avaliados como inválidos / não substituídos (${skippedList.length} total): ---`);
    for (const item of skippedList.slice(0, 10)) {
      console.log(`[${item.linha}] "${item.ponto}": ${item.motivo}`);
    }
  }

  // Grava nos dois arquivos (src/data e public/data)
  fs.writeFileSync(SRC_DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
  fs.writeFileSync(PUB_DATA_PATH, JSON.stringify(data, null, 2), "utf-8");

  console.log(`\n[OK] Arquivos atualizados com sucesso:`);
  console.log(` - ${SRC_DATA_PATH}`);
  console.log(` - ${PUB_DATA_PATH}`);
}

if (require.main === module) {
  runUpdate();
}
