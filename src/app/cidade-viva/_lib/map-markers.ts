// src/app/cidade-viva/_lib/map-markers.ts
import * as maplibregl from "maplibre-gl";

/**
 * Cria o elemento DOM para o marcador de localização do usuário ("Você")
 * com estilo tátil consistente com o app.
 */
export function createUserMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "cidade-viva-user-marker";
  el.style.display = "flex";
  el.style.flexDirection = "column";
  el.style.alignItems = "center";
  el.style.pointerEvents = "none";
  el.style.userSelect = "none";

  el.innerHTML = `
    <div style="
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 3px 9px;
      background: #0ea5e9;
      color: #ffffff;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 1.5px solid rgba(255,255,255,0.9);
      letter-spacing: 0.02em;
    ">
      <span>Você</span>
    </div>
    <div style="
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 5px solid #0ea5e9;
      margin-top: -1px;
    "></div>
  `;
  return el;
}

/**
 * Atualiza ou cria o marcador do usuário no mapa MapLibre.
 */
export function updateUserMarker(
  map: maplibregl.Map,
  markerRef: React.MutableRefObject<maplibregl.Marker | null>,
  coords: [number, number]
): maplibregl.Marker {
  if (!markerRef.current) {
    const el = createUserMarkerElement();
    markerRef.current = new maplibregl.Marker({
      element: el,
      anchor: "bottom",
    })
      .setLngLat(coords)
      .addTo(map);
  } else {
    markerRef.current.setLngLat(coords);
  }
  return markerRef.current;
}
