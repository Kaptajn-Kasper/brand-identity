#!/usr/bin/env bash
# Re-export the logo files in brand-assets/ from brand-board.svg.
#
# Run this after editing the board in Inkscape, then commit the result. Every
# group labelled logo-<n>-color-<role>-variant-<n> on the board becomes one SVG
# (text converted to outlines, so it renders without the Figtree font) and one
# 1024px-wide PNG.
#
# Requires: inkscape >= 1.2 and the Figtree font installed locally
# (https://fonts.google.com/specimen/Figtree), plus `npm ci` for svgo.
set -euo pipefail

cd "$(dirname "$0")/.."

board=brand-board.svg
declare -A out_dir=(
  [logo-1]=brand-assets/logos
  [logo-2]=brand-assets/logos-with-brand-name
)

if ! fc-list : family | grep -i figtree >/dev/null; then
  echo "error: Figtree font not installed; the wordmark would be outlined in a fallback font" >&2
  exit 1
fi

# label<TAB>id for every exportable logo group on the board.
mapfile -t groups < <(python3 - "$board" <<'PY'
import re, sys, xml.etree.ElementTree as ET
label = '{http://www.inkscape.org/namespaces/inkscape}label'
for el in ET.parse(sys.argv[1]).getroot().iter():
    name = el.get(label) or ''
    if re.fullmatch(r'logo-[12]-color-(primary|secondary|tertiary)-variant-[1-3]', name):
        print(f"{name}\t{el.get('id')}")
PY
)

if [[ ${#groups[@]} -eq 0 ]]; then
  echo "error: no logo groups found in $board" >&2
  exit 1
fi

for entry in "${groups[@]}"; do
  name=${entry%%$'\t'*}
  id=${entry#*$'\t'}
  dir=${out_dir[${name%%-color-*}]}
  mkdir -p "$dir"
  echo "exporting $name ($id) -> $dir"
  inkscape "$board" \
    --export-id="$id" --export-id-only \
    --export-plain-svg --export-text-to-path \
    --export-filename="$dir/$name.svg"
  inkscape "$board" \
    --export-id="$id" --export-id-only \
    --export-width=1024 --export-background-opacity=0 \
    --export-filename="$dir/$name.png"
done

npx --no-install svgo --quiet --multipass --recursive brand-assets
