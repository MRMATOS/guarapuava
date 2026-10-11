// src/app/cidade-viva/_lib/geocoding.ts

interface GeocodingResult {
  address: string;
  city: string;
  state: string;
}

const UF_MAP: Record<string, string> = {
  "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM",
  "Bahia": "BA", "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES",
  "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS",
  "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR",
  "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN",
  "Rio Grande do Sul": "RS", "Rondônia": "RO", "Roraima": "RR", "Santa Catarina": "SC",
  "São Paulo": "SP", "Sergipe": "SE", "Tocantins": "TO"
};

/**
 * Realiza geocodificação reversa usando a API aberta do Nominatim (OpenStreetMap).
 * Timeout de 1500ms para resposta rápida com fallback para vazio.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodingResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "guarapuava-digital-cidade-viva",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      next: { revalidate: 3600 },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return { address: "", city: "", state: "" };
    }

    const data = (await res.json()) as {
      address?: {
        road?: string;
        pedestrian?: string;
        suburb?: string;
        neighbourhood?: string;
        city?: string;
        town?: string;
        municipality?: string;
        state?: string;
      };
    };

    const addr = data.address ?? {};
    const street = addr.road || addr.pedestrian || "";
    const neighborhood = addr.neighbourhood || addr.suburb || "";
    const city = addr.city || addr.town || addr.municipality || "Guarapuava";
    const rawState = addr.state || "Paraná";
    const state = UF_MAP[rawState] || rawState.slice(0, 2).toUpperCase();

    let fullAddress = street;
    if (street && neighborhood) {
      fullAddress = `${street}, ${neighborhood}`;
    } else if (!street && neighborhood) {
      fullAddress = neighborhood;
    }

    return {
      address: fullAddress,
      city,
      state,
    };
  } catch {
    clearTimeout(timeoutId);
    return { address: "", city: "Guarapuava", state: "PR" };
  }
}
