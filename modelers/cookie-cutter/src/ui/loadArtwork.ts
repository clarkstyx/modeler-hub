import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import type { Artwork, Ring } from "../core/types";

/**
 * Parses an SVG on the main thread (DOMParser is not available in workers)
 * into one ring set per fill colour, in SVG user units with y pointing down.
 * Strokes are ignored; unpainted paths are skipped. Painter order is kept so
 * the geometry can let later colours win where they overlap.
 */
export function parseSvgArtwork(text: string, name: string): Artwork {
  const loader = new SVGLoader();
  const data = loader.parse(text);
  const layers: { hex: string; rings: Ring[] }[] = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const path of data.paths) {
    const style = path.userData?.style as { fill?: string; fillOpacity?: number } | undefined;
    const fill = style?.fill;
    if (!fill || fill === "none" || (style?.fillOpacity ?? 1) === 0) continue;
    const hex = normaliseColour(fill, path.color.getHexString());
    const shapes = SVGLoader.createShapes(path);
    const rings: Ring[] = [];
    for (const shape of shapes) {
      const { shape: outline, holes } = shape.extractPoints(12);
      const o: Ring = outline.map((p) => [p.x, p.y]);
      if (o.length >= 3) rings.push(ccw(o, true));
      for (const h of holes) {
        const r: Ring = h.map((p) => [p.x, p.y]);
        if (r.length >= 3) rings.push(ccw(r, false));
      }
    }
    if (!rings.length) continue;
    for (const r of rings) for (const [x, y] of r) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    const prev = layers[layers.length - 1];
    if (prev && prev.hex === hex) prev.rings.push(...rings);
    else layers.push({ hex, rings });
  }
  if (!layers.length) throw new Error("No filled shapes found in this SVG. Outline-only drawings need their paths filled.");
  return { name, layers, bounds: { minX, minY, maxX, maxY } };
}

function signedArea(r: Ring): number {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]);
  return a / 2;
}
/** Outer rings positive, holes negative, so "NonZero" / "Positive" filling works. */
function ccw(r: Ring, outer: boolean): Ring {
  const a = signedArea(r);
  return (outer ? a >= 0 : a <= 0) ? r : r.slice().reverse();
}

function normaliseColour(fill: string, fallbackHex: string): string {
  const m = fill.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
    return `#${h.toUpperCase()}`;
  }
  return `#${fallbackHex.toUpperCase()}`;
}
