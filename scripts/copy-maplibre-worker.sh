#!/bin/bash
# scripts/copy-maplibre-worker.sh
# Copies MapLibre GL production worker files from node_modules to public/maplibre/.

set -euo pipefail

SRC="node_modules/maplibre-gl/dist"
DEST="public/maplibre"

mkdir -p "$DEST"

cp "$SRC/maplibre-gl-worker.mjs" "$DEST/maplibre-gl-worker.mjs"
cp "$SRC/maplibre-gl-shared.mjs" "$DEST/maplibre-gl-shared.mjs"

echo "✓ MapLibre worker files copied to $DEST"
