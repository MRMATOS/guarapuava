import { NextResponse } from "next/server";
import rawBusData from "@/data/horarios-onibus.json";
import type { DadosHorariosOnibus } from "@/types/bus";

export interface GeoSuggestion {
  id: string;
  label: string;
  rua: string;
  bairro?: string;
  cep?: string;
  latitude: number;
  longitude: number;
  tipo: "ponto" | "endereco";
}

const busData = rawBusData as unknown as DadosHorariosOnibus;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const queryLower = q.toLowerCase();
  const suggestions: GeoSuggestion[] = [];
  const seenLabels = new Set<string>();

  // 1. Busca Local nos Pontos de Ônibus Existentes (Resposta Instantânea)
  for (const linha of busData.linhas) {
    for (const ponto of linha.pontos) {
      const matchNome = ponto.nome.toLowerCase().includes(queryLower);
      const matchRua = ponto.rua?.toLowerCase().includes(queryLower);
      const matchRef = ponto.referencia?.toLowerCase().includes(queryLower);
      const matchBairro = ponto.bairro?.toLowerCase().includes(queryLower);

      if (matchNome || matchRua || matchRef || matchBairro) {
        if (ponto.latitude && ponto.longitude) {
          const label = ponto.referencia
            ? `${ponto.rua || ponto.nome} (${ponto.referencia}) - ${ponto.bairro || linha.bairro}`
            : `${ponto.nome} - ${ponto.bairro || linha.bairro}`;

          if (!seenLabels.has(label)) {
            seenLabels.add(label);
            suggestions.push({
              id: `ponto-${ponto.id}`,
              label,
              rua: ponto.rua || ponto.nome,
              bairro: ponto.bairro || linha.bairro,
              cep: ponto.cep,
              latitude: ponto.latitude,
              longitude: ponto.longitude,
              tipo: "ponto",
            });
            if (suggestions.length >= 6) break;
          }
        }
      }
    }
    if (suggestions.length >= 6) break;
  }

  // 2. Se tiver poucas sugestões locais, consulta Photon API (OSM) de Guarapuava
  if (suggestions.length < 4) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);

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
              const street = props.street || name;
              const district = props.district || props.suburb || "Guarapuava";
              const label = `${street} - ${district}`;

              if (!seenLabels.has(label)) {
                seenLabels.add(label);
                suggestions.push({
                  id: `osm-${lat}-${lon}`,
                  label,
                  rua: street,
                  bairro: district,
                  cep: props.postcode,
                  latitude: lat,
                  longitude: lon,
                  tipo: "endereco",
                });
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
