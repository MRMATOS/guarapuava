#!/usr/bin/env python3
"""
Crawler de Linhas e Horários de Ônibus de Guarapuava (Pérola do Oeste via Moovit)
Consolida todas as variações/sentidos de cada linha, paradas completas, horários
e coordenadas geográficas (lat/long) para exibição em listas e mapas.
"""

import os
import sys
import json
import re
import time
import datetime
import urllib.request
import urllib.parse
from typing import Dict, Any, List, Optional, Tuple, Set

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
}

GEO_HEADERS = {
    'User-Agent': 'GuarapuavaApp/1.0 (rodrigo@guarapuava.app)'
}

CACHE_FILE = os.path.join(os.path.dirname(__file__), 'cache-coordenadas-pontos.json')
OUT_FILE_SRC = os.path.join(os.path.dirname(__file__), '../src/data/horarios-onibus.json')
OUT_FILE_PUB = os.path.join(os.path.dirname(__file__), '../public/data/horarios-onibus.json')


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[áàãâä]', 'a', text)
    text = re.sub(r'[éèêë]', 'e', text)
    text = re.sub(r'[íìîï]', 'i', text)
    text = re.sub(r'[óòõôö]', 'o', text)
    text = re.sub(r'[úùûü]', 'u', text)
    text = re.sub(r'[ç]', 'c', text)
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')


def fetch_html(url: str, retries: int = 3, delay: float = 1.0) -> Optional[str]:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=15) as resp:
                return resp.read().decode('utf-8')
        except Exception as e:
            if attempt == retries - 1:
                print(f" [!] Erro ao requisitar {url}: {e}", file=sys.stderr)
                return None
            time.sleep(delay * (attempt + 1))
    return None


def extract_server_state(html: str) -> Dict[str, Any]:
    m = re.search(r'<script id="serverApp-state" type="application/json">(.*?)</script>', html, re.DOTALL)
    if not m:
        return {}
    try:
        return json.loads(m.group(1))
    except Exception as e:
        print(f" [!] Erro no parse JSON do serverApp-state: {e}", file=sys.stderr)
        return {}


def load_coords_cache() -> Dict[str, Dict[str, float]]:
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_coords_cache(cache: Dict[str, Dict[str, float]]):
    try:
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f" [!] Erro ao salvar cache de coordenadas: {e}", file=sys.stderr)


def clean_address_for_geocoding(stop_name: str) -> str:
    name = stop_name.strip()
    
    if "estação da fonte" in name.lower():
        return "Estação da Fonte, Guarapuava, Paraná, Brasil"
    if "rodoviária" in name.lower() or "terminal" in name.lower():
        return f"{name}, Guarapuava, Paraná, Brasil"

    # Remove parênteses
    clean = re.sub(r'\(.*?\)', '', name).strip()
    clean = re.sub(r'\bR\.\s*', 'Rua ', clean)
    clean = re.sub(r'\bAv\.\s*', 'Avenida ', clean)
    clean = re.sub(r'\bAl\.\s*', 'Alameda ', clean)
    clean = re.sub(r'\bTrav\.\s*', 'Travessa ', clean)
    clean = re.sub(r'\bRod\.\s*', 'Rodovia ', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()

    return f"{clean}, Guarapuava, Paraná, Brasil"


def geocode_stop(stop_name: str, cache: Dict[str, Dict[str, float]]) -> Optional[Tuple[float, float]]:
    clean_name = stop_name.strip()
    if clean_name in cache:
        c = cache[clean_name]
        return c.get('lat'), c.get('lon')
    return None


def get_target_day_offsets() -> Dict[str, int]:
    """Calcula dayOffset para dia útil (terça/quarta), sábado e domingo."""
    now = datetime.datetime.now(datetime.timezone.utc)
    base_ts = now.timestamp()
    base_offset = int(base_ts // 86400)
    
    weekday = now.weekday()
    
    days_to_tuesday = (1 - weekday) % 7
    if days_to_tuesday == 0:
        days_to_tuesday = 7
    offset_uteis = base_offset + days_to_tuesday
    
    days_to_sat = (5 - weekday) % 7
    if days_to_sat == 0:
        days_to_sat = 7
    offset_sabado = base_offset + days_to_sat
    
    days_to_sun = (6 - weekday) % 7
    if days_to_sun == 0:
        days_to_sun = 7
    offset_domingo = base_offset + days_to_sun
    
    return {
        'uteis': offset_uteis,
        'sabado': offset_sabado,
        'domingo': offset_domingo
    }


def convert_timestamps_to_times(timestamps: List[int]) -> List[str]:
    times_set = set()
    for ts in timestamps:
        if ts:
            dt = datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc) - datetime.timedelta(hours=3)
            times_set.add(dt.strftime("%H:%M"))
    return sorted(list(times_set))


def crawl_line_schedule_for_day(line_slug: str, line_group_id: int, line_id: int, day_offset: int) -> Tuple[List[Dict[str, Any]], Dict[str, List[str]]]:
    """Retorna (stops_list, arrivals_dict_by_stop_id) para um dayOffset."""
    url = f"https://moovitapp.com/tripplan/guarapuava-3847/lines/{urllib.parse.quote(line_slug)}/{line_group_id}/{line_id}/pt-br?ref=5&customerId=4908&dayOffset={day_offset}"
    html = fetch_html(url)
    if not html:
        return [], {}
        
    state = extract_server_state(html)
    line_data = state.get('appState', {}).get('line', {})
    displayed = line_data.get('displayedLine') or {}
    
    stops = displayed.get('stops', [])
    raw_arrivals = displayed.get('stopArrivals', {})
    
    formatted_arrivals = {}
    for stop_id, arr_list in raw_arrivals.items():
        ts_list = [item.get('arrivalTime') for item in arr_list if item.get('arrivalTime')]
        formatted_arrivals[str(stop_id)] = convert_timestamps_to_times(ts_list)
        
    return stops, formatted_arrivals


def run_crawler():
    import argparse
    parser = argparse.ArgumentParser(description="Crawler de Horários de Ônibus de Guarapuava")
    parser.add_argument("--limit", type=int, default=None, help="Limita o número de linhas a processar")
    parser.add_argument("--codigo", type=str, default=None, help="Processa apenas uma linha específica (ex: 15)")
    args = parser.parse_args()

    print("=" * 65)
    print(" 🚌 INICIANDO CRAWLER DE HORÁRIOS DE ÔNIBUS - GUARAPUAVA (MOOVIT)")
    print("=" * 65)
    
    coords_cache = load_coords_cache()
    print(f"[*] Cache de coordenadas carregado: {len(coords_cache)} pontos conhecidos.")
    
    # 1. Catálogo de linhas
    lines_hub_url = "https://moovitapp.com/tripplan/guarapuava-3847/lines?ref=5&customerId=4908"
    print(f"[*] Acessando catálogo de linhas: {lines_hub_url} ...")
    hub_html = fetch_html(lines_hub_url)
    if not hub_html:
        print("[!] Falha ao carregar catálogo de linhas. Abortando.", file=sys.stderr)
        return

    hub_state = extract_server_state(hub_html)
    items = hub_state.get('appState', {}).get('line', {}).get('items', [])
    
    raw_lines = [it for it in items if it.get('lineGroupId') and it.get('shortName')]
    if args.codigo:
        raw_lines = [it for it in raw_lines if it.get('shortName', '').startswith(args.codigo)]
    elif args.limit:
        raw_lines = raw_lines[:args.limit]

    print(f"[+] Total de linhas a processar: {len(raw_lines)}")
    
    day_offsets = get_target_day_offsets()
    print(f"[*] Offsets de data configurados: Úteis={day_offsets['uteis']}, Sáb={day_offsets['sabado']}, Dom={day_offsets['domingo']}")

    processed_linhas = []
    
    for idx, line_item in enumerate(raw_lines, 1):
        short_name = line_item.get('shortName', '').strip()
        line_group_id = line_item.get('lineGroupId')
        line_slug = short_name.lower()
        
        code_match = re.match(r'^(\d+)\s+(.+)$', short_name)
        if code_match:
            codigo = code_match.group(1).zfill(2)
            raw_bairro = code_match.group(2).strip()
        else:
            codigo = str(idx).zfill(2)
            raw_bairro = short_name

        bairro_title = raw_bairro.title()
        is_interbairros = "interbairros" in short_name.lower()
        tipo_linha = "interbairros" if is_interbairros else "regular"
        
        linha_id = f"linha-{codigo.lower()}"
        if is_interbairros and not linha_id.endswith("-interbairros"):
            linha_id = f"{linha_id}-interbairros"

        nome_exibicao = f"Linha {codigo} - {bairro_title}"

        print(f"\n[{idx}/{len(raw_lines)}] Processando {nome_exibicao} (ID: {line_group_id}) ...")
        time.sleep(1.0)
        
        line_overview_url = f"https://moovitapp.com/tripplan/guarapuava-3847/lines/{urllib.parse.quote(line_slug)}/{line_group_id}/pt-br?ref=5&customerId=4908"
        overview_html = fetch_html(line_overview_url)
        if not overview_html:
            print(f"  [!] Pulo por falha no overview: {short_name}")
            continue
            
        overview_state = extract_server_state(overview_html)
        directions = overview_state.get('appState', {}).get('line', {}).get('lineDirections', [])
        
        if not directions:
            print(f"  [!] Nenhuma variação encontrada para {short_name}")
            continue

        print(f"  -> {len(directions)} variações/sentidos encontrados. Consolidando itinerários...")

        # Coletar dados de cada variação
        all_dir_stops = []
        stop_names_map = {} # stop_id -> stop_name
        merged_arrivals_uteis: Dict[str, Set[str]] = {}
        merged_arrivals_sab: Dict[str, Set[str]] = {}
        merged_arrivals_dom: Dict[str, Set[str]] = {}

        for d in directions:
            line_id = d.get('lineId')
            d_title = d.get('title') or d.get('destination') or 'Principal'
            if not line_id:
                continue

            time.sleep(0.5)
            # Dias Úteis
            stops_u, arr_u = crawl_line_schedule_for_day(line_slug, line_group_id, line_id, day_offsets['uteis'])
            # Sábados
            time.sleep(0.5)
            _, arr_s = crawl_line_schedule_for_day(line_slug, line_group_id, line_id, day_offsets['sabado'])
            # Domingos
            time.sleep(0.5)
            _, arr_d = crawl_line_schedule_for_day(line_slug, line_group_id, line_id, day_offsets['domingo'])

            if stops_u:
                all_dir_stops.append(stops_u)
                for s in stops_u:
                    sid = str(s.get('id'))
                    stop_names_map[sid] = s.get('name', '').strip()

            # Merge horários
            for sid, times in arr_u.items():
                merged_arrivals_uteis.setdefault(sid, set()).update(times)
            for sid, times in arr_s.items():
                merged_arrivals_sab.setdefault(sid, set()).update(times)
            for sid, times in arr_d.items():
                merged_arrivals_dom.setdefault(sid, set()).update(times)

        if not all_dir_stops:
            print(f"  [!] Nenhuma parada encontrada para a linha {short_name}")
            continue

        # Seleciona a sequência de paradas da variação mais completa como backbone
        all_dir_stops.sort(key=len, reverse=True)
        backbone_stops = all_dir_stops[0]
        backbone_ids = [str(s.get('id')) for s in backbone_stops]

        # Adiciona paradas adicionais que porventura existam em outras variações
        ordered_stop_ids = list(backbone_ids)
        for other_stops in all_dir_stops[1:]:
            for s in other_stops:
                sid = str(s.get('id'))
                if sid not in ordered_stop_ids:
                    ordered_stop_ids.append(sid)

        print(f"  -> Total consolidado: {len(ordered_stop_ids)} paradas únicas. Geocodificando...")

        pontos_itinerario = []
        for p_idx, s_id in enumerate(ordered_stop_ids, 1):
            s_name = stop_names_map.get(s_id, f"Ponto {s_id}")
            ponto_slug = f"{slugify(s_name)}-{s_id[:6]}"
            
            h_uteis = sorted(list(merged_arrivals_uteis.get(s_id, set())))
            h_sab = sorted(list(merged_arrivals_sab.get(s_id, set())))
            h_dom = sorted(list(merged_arrivals_dom.get(s_id, set())))

            coords = geocode_stop(s_name, coords_cache)
            lat = coords[0] if coords else None
            lon = coords[1] if coords else None

            ponto_dict = {
                "id": ponto_slug,
                "nome": s_name,
                "ordem": p_idx,
                "horariosUteis": h_uteis,
                "horariosSabado": h_sab,
                "horariosDomingo": h_dom
            }
            if lat is not None and lon is not None:
                ponto_dict["latitude"] = round(lat, 6)
                ponto_dict["longitude"] = round(lon, 6)

            pontos_itinerario.append(ponto_dict)

        processed_linhas.append({
            "id": linha_id,
            "codigo": codigo,
            "bairro": bairro_title,
            "nomeExibicao": nome_exibicao,
            "tipo": tipo_linha,
            "pontos": pontos_itinerario,
            "observacoes": [
                f"Variações consolidadas: {len(directions)} sentidos",
                "Dados sincronizados via Pérola do Oeste / Moovit"
            ]
        })

    # Ordenar por regular/interbairros e número
    processed_linhas.sort(key=lambda x: (0 if x['tipo'] == 'regular' else 1, x['codigo']))

    final_payload = {
        "dataExtracao": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "totalLinhas": len(processed_linhas),
        "linhas": processed_linhas
    }

    save_coords_cache(coords_cache)

    os.makedirs(os.path.dirname(OUT_FILE_SRC), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_FILE_PUB), exist_ok=True)

    with open(OUT_FILE_SRC, 'w', encoding='utf-8') as f:
        json.dump(final_payload, f, indent=2, ensure_ascii=False)
        
    with open(OUT_FILE_PUB, 'w', encoding='utf-8') as f:
        json.dump(final_payload, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 65)
    print(f" ✨ SUCESSO! {len(processed_linhas)} linhas processadas e salvas:")
    print(f"    -> {OUT_FILE_SRC}")
    print(f"    -> {OUT_FILE_PUB}")
    print("=" * 65)


if __name__ == '__main__':
    run_crawler()
