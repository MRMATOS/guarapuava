import { NextResponse } from "next/server";
import rawBusData from "@/data/horarios-onibus.json";
import { normalizeText } from "@/lib/utils/search";
import { GUARAPUAVA_POIS } from "@/lib/bus/guarapuava-pois";
import type { DadosHorariosOnibus } from "@/types/bus";

export interface GeoSuggestion {
  id: string;
  label: string;
  rua: string;
  bairro?: string;
  cep?: string;
  latitude: number;
  longitude: number;
  tipo: "poi" | "linha" | "ponto" | "endereco";
  subtitulo?: string;
  linhaId?: string;
  pontoId?: string;
}

const busData = rawBusData as unknown as DadosHorariosOnibus;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const queryNorm = normalizeText(q);
  const suggestions: GeoSuggestion[] = [];
  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();

  // 1. Busca nos Pontos de Interesse (POIs) de Guarapuava: Universidades, Shopping, Hospitais, Parques
  for (const poi of GUARAPUAVA_POIS) {
    const matchName = normalizeText(poi.name).includes(queryNorm);
    const matchShort = normalizeText(poi.shortName).includes(queryNorm);
    const queryWords = queryNorm.split(/\s+/).filter(Boolean);
    const matchKeywords = poi.keywords.some((k) => {
      const normK = normalizeText(k);
      return normK.includes(queryNorm) || queryWords.includes(normK);
    });

    if (matchName || matchShort || matchKeywords) {
      if (!seenIds.has(poi.id) && !seenLabels.has(poi.name)) {
        seenIds.add(poi.id);
        seenLabels.add(poi.name);
        suggestions.push({
          id: poi.id,
          label: poi.name,
          subtitulo: `${poi.shortName} • ${poi.bairro}`,
          rua: poi.rua,
          bairro: poi.bairro,
          cep: poi.cep,
          latitude: poi.latitude,
          longitude: poi.longitude,
          tipo: "poi",
        });
      }
    }
  }

  // 2. Busca nas Linhas de Ônibus
  for (const linha of busData.linhas) {
    const matchLinhaNome = normalizeText(linha.nomeExibicao).includes(queryNorm);
    const matchLinhaBairro = normalizeText(linha.bairro).includes(queryNorm);
    const matchCodigo = normalizeText(linha.codigo).includes(queryNorm);

    if (matchLinhaNome || matchLinhaBairro || matchCodigo) {
      const sugId = `linha-${linha.id}`;
      // Pega coordenada do ponto central ou principal da linha
      const mainPonto = linha.pontos.find((p) => p.latitude && p.longitude) || linha.pontos[0];
      if (mainPonto && mainPonto.latitude && mainPonto.longitude) {
        if (!seenIds.has(sugId) && !seenLabels.has(linha.nomeExibicao)) {
          seenIds.add(sugId);
          seenLabels.add(linha.nomeExibicao);
          suggestions.push({
            id: sugId,
            label: linha.nomeExibicao,
            subtitulo: `Linha ${linha.codigo} • ${linha.pontos.length} paradas`,
            linhaId: linha.id,
            rua: linha.bairro,
            bairro: linha.bairro,
            latitude: mainPonto.latitude,
            longitude: mainPonto.longitude,
            tipo: "linha",
          });
          if (suggestions.length >= 7) break;
        }
      }
    }
  }

  // 3. Busca nos Pontos de Parada Existentes com Coordenadas
  for (const linha of busData.linhas) {
    for (const ponto of linha.pontos) {
      const matchNome = normalizeText(ponto.nome).includes(queryNorm);
      const matchRua = ponto.rua ? normalizeText(ponto.rua).includes(queryNorm) : false;
      const matchRef = ponto.referencia ? normalizeText(ponto.referencia).includes(queryNorm) : false;

      if (matchNome || matchRua || matchRef) {
        if (ponto.latitude && ponto.longitude) {
          const sugId = `ponto-${ponto.id}`;
          const label = ponto.referencia
            ? `${ponto.rua || ponto.nome} (${ponto.referencia})`
            : `${ponto.nome}`;

          const fullLabel = `${label} • ${ponto.bairro || linha.bairro}`;

          if (!seenIds.has(sugId) && !seenLabels.has(fullLabel)) {
            seenIds.add(sugId);
            seenLabels.add(fullLabel);
            suggestions.push({
              id: sugId,
              label: fullLabel,
              subtitulo: `Parada da ${linha.nomeExibicao}`,
              linhaId: linha.id,
              pontoId: ponto.id,
              rua: ponto.rua || ponto.nome,
              bairro: ponto.bairro || linha.bairro,
              cep: ponto.cep,
              latitude: ponto.latitude,
              longitude: ponto.longitude,
              tipo: "ponto",
            });
            if (suggestions.length >= 7) break;
          }
        }
      }
    }
    if (suggestions.length >= 7) break;
  }

  // 4. Se tiver poucas sugestões locais, consulta Photon API (OSM) de Guarapuava
  if (suggestions.length < 3) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const targetUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        `${q}, Guarapuava, PR`
      )}&lat=-25.3907&lon=-51.4642&limit=4`;

      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "guarapuava-digital-bus/1.0",
        },
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const features = data?.features || [];

        for (const feat of features) {
          const props = feat?.properties || {};
          const coords = feat?.geometry?.coordinates || [];

          if (coords.length === 2) {
            const lon = coords[0];
            const lat = coords[1];
            // Filtro de sanidade para limites de Guarapuava
            if (lat >= -25.55 && lat <= -25.25 && lon >= -51.65 && lon <= -51.3) {
              const name = props.name || props.street || q;
              const street = props.street && props.name && props.street !== props.name
                ? `${props.name} (${props.street})`
                : name;
              const district = props.district || props.suburb || "Guarapuava";
              const label = `${street} - ${district}`;
              const sugId = `osm-${lat.toFixed(6)}-${lon.toFixed(6)}`;

              if (!seenIds.has(sugId) && !seenLabels.has(label)) {
                seenIds.add(sugId);
                seenLabels.add(label);
                suggestions.push({
                  id: sugId,
                  label,
                  subtitulo: district,
                  rua: props.street || name,
                  bairro: district,
                  cep: props.postcode,
                  latitude: lat,
                  longitude: lon,
                  tipo: "endereco",
                });
                if (suggestions.length >= 7) break;
              }
            }
          }
        }
      }
    } catch {
      // Ignora erro e entrega sugestões locais
    }
  }

  return NextResponse.json({
    suggestions: suggestions.slice(0, 7),
  });
}
