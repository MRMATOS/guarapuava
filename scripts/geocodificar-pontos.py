#!/usr/bin/env python3
"""
Enriquecedor de Coordenadas Geográficas dos Pontos de Ônibus (Nominatim / OSM)
Lê os pontos em src/data/horarios-onibus.json, consulta coordenadas com respeito
estrito ao rate-limit (1 req/seg + backoff) e atualiza o cache e o arquivo canônico.
"""

import os
import sys
import json
import re
import time
import urllib.request
import urllib.parse
from typing import Dict, Optional, Tuple

CACHE_FILE = os.path.join(os.path.dirname(__file__), 'cache-coordenadas-pontos.json')
DATA_SRC = os.path.join(os.path.dirname(__file__), '../src/data/horarios-onibus.json')
DATA_PUB = os.path.join(os.path.dirname(__file__), '../public/data/horarios-onibus.json')

GEO_HEADERS = {
    'User-Agent': 'GuarapuavaBusGeocoder/1.0 (rodrigo@guarapuava.app)'
}


def clean_address(name: str) -> str:
    clean = name.strip()
    if "estação da fonte" in clean.lower():
        return "Estação da Fonte, Guarapuava, Paraná, Brasil"
    if "rodoviária" in clean.lower() or "terminal" in clean.lower():
        return f"{clean}, Guarapuava, Paraná, Brasil"

    clean = re.sub(r'\(.*?\)', '', clean).strip()
    clean = re.sub(r'\bR\.\s*', 'Rua ', clean)
    clean = re.sub(r'\bAv\.\s*', 'Avenida ', clean)
    clean = re.sub(r'\bAl\.\s*', 'Alameda ', clean)
    clean = re.sub(r'\bTrav\.\s*', 'Travessa ', clean)
    clean = re.sub(r'\bRod\.\s*', 'Rodovia ', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return f"{clean}, Guarapuava, Paraná, Brasil"


def query_nominatim(query: str) -> Optional[Tuple[float, float]]:
    url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query)}&format=json&limit=1"
    req = urllib.request.Request(url, headers=GEO_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data and len(data) > 0:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                if -26.0 <= lat <= -25.0 and -52.0 <= lon <= -51.0:
                    return lat, lon
    except urllib.error.HTTPError as e:
        if e.code == 429:
            print(f"    [!] Rate limit atingido (429). Aguardando 6 segundos...")
            time.sleep(6)
    except Exception:
        pass
    return None


def run_enricher():
    import argparse
    parser = argparse.ArgumentParser(description="Enriquecedor de coordenadas geográficas dos pontos de ônibus")
    parser.add_argument("--limit", type=int, default=None, help="Limite de pontos a geocodificar por execução")
    args = parser.parse_args()

    print("=" * 65)
    print(" 📍 ENRIQUECEDOR DE COORDENADAS GEOGRÁFICAS DOS PONTOS DE ÔNIBUS")
    print("=" * 65)

    if not os.path.exists(DATA_SRC):
        print("[!] Arquivo src/data/horarios-onibus.json não encontrado.", file=sys.stderr)
        return

    with open(DATA_SRC, 'r', encoding='utf-8') as f:
        bus_data = json.load(f)

    cache = {}
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            cache = json.load(f)
    print(f"[*] Cache inicial: {len(cache)} pontos com coordenadas.")

    # Identificar todos os nomes únicos de pontos que precisam de coordenadas
    all_stops = set()
    for l in bus_data.get('linhas', []):
        for p in l.get('pontos', []):
            name = p.get('nome', '').strip()
            if name:
                all_stops.add(name)

    uncached = [name for name in all_stops if name not in cache]
    if args.limit:
        uncached = uncached[:args.limit]
    print(f"[*] Total de pontos únicos: {len(all_stops)} | A processar neste lote: {len(uncached)}")

    resolved_count = 0
    for idx, stop_name in enumerate(uncached, 1):
        clean_q = clean_address(stop_name)
        print(f"[{idx}/{len(uncached)}] Geocodificando: {stop_name} ...")
        
        coords = query_nominatim(clean_q)
        time.sleep(1.2) # Respeito de taxa de 1 req/segundo
        
        if not coords:
            # Tenta sem o número se houver
            via_only = re.sub(r',\s*\d+.*', '', clean_q)
            if via_only != clean_q:
                coords = query_nominatim(via_only)
                time.sleep(1.2)

        if coords:
            cache[stop_name] = {'lat': round(coords[0], 6), 'lon': round(coords[1], 6)}
            resolved_count += 1
            print(f"  -> Encontrado: {coords[0]:.6f}, {coords[1]:.6f}")
            # Salva o cache progressivamente
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(cache, f, indent=2, ensure_ascii=False)
        else:
            print(f"  -> Coordenada não encontrada")

    print(f"\n[+] Novas coordenadas resolvidas: {resolved_count}")

    # Atualiza o arquivo bus_data com as coordenadas do cache
    updated_stops = 0
    for l in bus_data.get('linhas', []):
        for p in l.get('pontos', []):
            name = p.get('nome', '').strip()
            if name in cache:
                p['latitude'] = cache[name]['lat']
                p['longitude'] = cache[name]['lon']
                updated_stops += 1

    with open(DATA_SRC, 'w', encoding='utf-8') as f:
        json.dump(bus_data, f, indent=2, ensure_ascii=False)
        
    with open(DATA_PUB, 'w', encoding='utf-8') as f:
        json.dump(bus_data, f, indent=2, ensure_ascii=False)

    print(f"[*] Arquivos sincronizados com {updated_stops} paradas geolocalizadas.")
    print("=" * 65)


if __name__ == '__main__':
    run_enricher()
