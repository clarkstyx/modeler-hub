#!/usr/bin/env bash
# Rebuilds the preview pictures and sample 3MF for a MakerWorld .scad file, then renders a
# set of setting combinations and checks that every part of every result is watertight.
#
#   makerworld/tools/build.sh makerworld/image_keychain.scad
#
# Needs a recent OpenSCAD (2025 or newer, Manifold backend) and Python with
# numpy, trimesh and pillow. Set OPENSCAD to use a different OpenSCAD command.
set -euo pipefail

scad=$(realpath "$1")
dir=$(dirname "$scad")
tools=$(dirname "$(realpath "$0")")
name=$(basename "$scad" .scad)
openscad=${OPENSCAD:-openscad}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

case "$name" in
  image_keychain)
    title=IMAGE_KEYCHAIN; sample=sample-keychain.3mf
    variants=(
      "svg|-D 'art_source=\"svg\"'"
      "text-only|-D 'art_source=\"none\"' -D 'text=\"ALEX\"'"
      "no-text|-D 'text=\"\"'"
      "four-colors-no-background|-D 'background=\"none\"' -D color_count=4"
      "one-color|-D color_count=1"
      "light-first|-D color_count=4 -D 'detail_priority=\"light\"'"
      "text-above-no-border-no-ring|-D 'text_position=\"above\"' -D border=false -D keyring=false"
      "large-mirrored|-D art_height=90 -D mirror_picture=true -D ring_offset=20"
    ) ;;
  trinket_tray)
    title=TRINKET_TRAY; sample=sample-tray.3mf
    variants=(
      "svg|-D 'art_source=\"svg\"'"
      "plain|-D 'art_source=\"none\"'"
      "round|-D 'shape=\"round\"' -D art_height=100"
      "oval-raised|-D 'shape=\"oval\"' -D 'picture_style=\"raised\"' -D art_height=90"
      "rectangle-no-rim|-D 'shape=\"rounded_rect\"' -D rim=false -D tray_width=200 -D tray_depth=140 -D art_height=100"
      "hexagon-four-colors|-D 'shape=\"hexagon\"' -D color_count=4 -D 'background=\"none\"' -D art_height=100"
      "large|-D art_height=200 -D wall_height=20 -D wall_thickness=3"
      "tray-text-pattern|-D 'shape=\"round\"' -D art_height=90 -D 'text_top=\"KEYS\"' -D 'pattern=\"rings\"'"
      "coaster|-D 'product=\"coaster\"'"
      "coaster-text-arc|-D 'product=\"coaster\"' -D 'text_top=\"HOME SWEET HOME\"' -D 'text_bottom=\"EST. 2026\"' -D coaster_art_height=45"
      "coaster-square-straight|-D 'product=\"coaster\"' -D 'coaster_shape=\"square\"' -D 'text_style=\"straight\"' -D 'text_top=\"CHEERS\"' -D coaster_art_height=45"
      "coaster-hex-honeycomb|-D 'product=\"coaster\"' -D 'coaster_shape=\"hexagon\"' -D 'pattern=\"honeycomb\"' -D pattern_spacing=8 -D coaster_art_height=45"
      "coaster-octagon-dots-feet|-D 'product=\"coaster\"' -D 'coaster_shape=\"octagon\"' -D 'pattern=\"dots\"' -D pattern_width=2.5 -D 'underside=\"feet\"' -D feet_count=6"
      "coaster-grid-stripes|-D 'product=\"coaster\"' -D 'pattern=\"stripes\"'"
      "coaster-flat-cork|-D 'product=\"coaster\"' -D 'underside=\"recess\"' -D 'pattern=\"grid\"'"
      "coaster-silhouette-holder|-D 'product=\"coaster\"' -D 'coaster_shape=\"silhouette\"' -D margin=3 -D holder=true"
      "coaster-holder|-D 'product=\"coaster\"' -D holder=true -D 'underside=\"feet\"'"
    ) ;;
  *) echo "Unknown model: $name" >&2; exit 2 ;;
esac

render() {  # render <out.3mf> [openscad args...]
  local out=$1; shift
  (cd "$dir" && "$openscad" --backend=manifold --enable=lazy-union "$@" -o "$out" "$scad" >"$work/log.txt" 2>&1) ||
    { cat "$work/log.txt"; return 1; }
  if grep -qi "error" "$work/log.txt"; then cat "$work/log.txt"; return 1; fi
}

echo "== default settings"
render "$work/default.3mf"
python3 "$tools/check_3mf.py" "$work/default.3mf" "$dir/preview-iso.png" iso
python3 "$tools/check_3mf.py" "$work/default.3mf" "$dir/preview-top.png" top >/dev/null
python3 "$tools/openscad_to_bambu_3mf.py" "$work/default.3mf" "$dir/$sample" \
  --name "$title" --thumbnail "$dir/preview-top.png"

# The tray file also makes coasters: build a coaster sample and previews too.
if [ "$name" = trinket_tray ]; then
  echo "== coaster sample"
  render "$work/coaster.3mf" -D 'product="coaster"' -D 'text_top="CHEERS"' \
    -D 'text_bottom="EST. 2026"' -D 'pattern="rings"' -D coaster_art_height=45 -D holder=true
  python3 "$tools/check_3mf.py" "$work/coaster.3mf" "$dir/preview-coaster-iso.png" iso
  python3 "$tools/check_3mf.py" "$work/coaster.3mf" "$dir/preview-coaster-top.png" top >/dev/null
  python3 "$tools/openscad_to_bambu_3mf.py" "$work/coaster.3mf" "$dir/sample-coaster.3mf" \
    --name COASTER --thumbnail "$dir/preview-coaster-top.png"
fi

failed=0
for v in "${variants[@]}"; do
  label=${v%%|*}
  eval "args=(${v#*|})"  # entries quote strings as -D 'name="value"' 
  if render "$work/$label.3mf" "${args[@]}" && python3 "$tools/check_3mf.py" "$work/$label.3mf" >"$work/check.txt"; then
    echo "ok    $label  $(tail -1 "$work/check.txt")"
  else
    echo "FAIL  $label"; cat "$work/check.txt" 2>/dev/null || true; failed=1
  fi
done
exit $failed
