#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/release"
ZIP_PATH="$RELEASE_DIR/godemodegame-verified-badge-1.0.0.zip"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$ROOT_DIR/assets/icons" "$RELEASE_DIR"

embed_svg_assets() {
  local source_svg="$1"
  local output_svg="$2"

  python3 - "$source_svg" "$output_svg" <<'PY'
from pathlib import Path
import base64
import mimetypes
import re
import sys

source = Path(sys.argv[1]).resolve()
output = Path(sys.argv[2]).resolve()
text = source.read_text()

def replace_href(match):
    href = match.group(1)
    if href.startswith("data:") or "://" in href:
        return match.group(0)

    asset = (source.parent / href).resolve()
    if not asset.exists() or not asset.is_file():
        return match.group(0)

    mime = mimetypes.guess_type(asset.name)[0] or "application/octet-stream"
    data = base64.b64encode(asset.read_bytes()).decode("ascii")
    return f'href="data:{mime};base64,{data}"'

text = re.sub(r'href="([^"]+\.(?:png|jpg|jpeg|webp))"', replace_href, text, flags=re.IGNORECASE)
output.write_text(text)
PY
}

ICON_SVG="$TMP_DIR/icon.svg"
SCREENSHOT_SVG="$TMP_DIR/screenshot-1280x800.svg"
SMALL_PROMO_SVG="$TMP_DIR/small-promo-440x280.svg"
MARQUEE_PROMO_SVG="$TMP_DIR/marquee-promo-1400x560.svg"

embed_svg_assets "$ROOT_DIR/assets/icons/icon.svg" "$ICON_SVG"
embed_svg_assets "$ROOT_DIR/store-assets/screenshot-1280x800.svg" "$SCREENSHOT_SVG"
embed_svg_assets "$ROOT_DIR/store-assets/small-promo-440x280.svg" "$SMALL_PROMO_SVG"
embed_svg_assets "$ROOT_DIR/store-assets/marquee-promo-1400x560.svg" "$MARQUEE_PROMO_SVG"

sips -s format png -z 16 16 "$ICON_SVG" --out "$ROOT_DIR/assets/icons/icon16.png" >/dev/null
sips -s format png -z 32 32 "$ICON_SVG" --out "$ROOT_DIR/assets/icons/icon32.png" >/dev/null
sips -s format png -z 48 48 "$ICON_SVG" --out "$ROOT_DIR/assets/icons/icon48.png" >/dev/null
sips -s format png -z 128 128 "$ICON_SVG" --out "$ROOT_DIR/assets/icons/icon128.png" >/dev/null

sips -s format png "$SCREENSHOT_SVG" --out "$ROOT_DIR/store-assets/screenshot-1280x800.png" >/dev/null
sips -s format png "$SMALL_PROMO_SVG" --out "$ROOT_DIR/store-assets/small-promo-440x280.png" >/dev/null
sips -s format png "$MARQUEE_PROMO_SVG" --out "$ROOT_DIR/store-assets/marquee-promo-1400x560.png" >/dev/null

rm -f "$ZIP_PATH"
(
  cd "$ROOT_DIR"
  zip -qr "$ZIP_PATH" manifest.json src assets/icons/icon16.png assets/icons/icon32.png assets/icons/icon48.png assets/icons/icon128.png
)

echo "$ZIP_PATH"
