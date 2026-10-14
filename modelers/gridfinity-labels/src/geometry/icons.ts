import type { IconId } from "../core/params";
import type { Artwork, Ring } from "../core/types";
import { type CrossSection } from "../shared/kernel";
import { cs, csScale, csTranslate, csUnion, csSubtract, rect, csBounds } from "../shared/shapes";
import { kernel, track } from "../shared/kernel";

/**
 * Built-in hardware icons, drawn to fill an `s` × `s` box centred on the
 * origin (Y up). Strokes are sized as fractions of `s`; at the default label
 * (12 mm high, 1.2 mm padding) s ≈ 9.6 mm, so thread teeth are ~0.8 mm, two
 * nozzle widths.
 */
export function builtinIcon(id: IconId, s: number): CrossSection | null {
  switch (id) {
    case "nut":
      return csSubtract(hexagon(s), circle(s * 0.5));
    case "washer":
      return csSubtract(circle(s), circle(s * 0.46));
    case "screw":
      return threadedFastener(s, "round");
    case "bolt":
      return threadedFastener(s, "hex");
    case "insert":
      return insert(s);
    default:
      return null;
  }
}

function circle(d: number): CrossSection {
  return track(kernel().CrossSection.circle(d / 2, 64));
}

function hexagon(acrossCorners: number): CrossSection {
  const r = acrossCorners / 2;
  const ring: Ring = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    ring.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return cs([ring]);
}

/** Side view, lying left to right: head on the left, threaded shank to the right. */
function threadedFastener(s: number, head: "round" | "hex"): CrossSection {
  const x0 = -s / 2;
  const headW = s * 0.24;
  const headH = head === "hex" ? s * 0.72 : s * 0.62;
  const shankH = s * 0.26;
  const tooth = s * 0.085;
  const pitch = s * 0.12;
  const parts: CrossSection[] = [];
  if (head === "round") {
    parts.push(rect(x0, -headH / 2, x0 + headW, headH / 2, headW * 0.45));
  } else {
    const c = headW * 0.25;
    parts.push(cs([[[x0 + c, -headH / 2], [x0 + headW - c, -headH / 2], [x0 + headW, -headH / 2 + c], [x0 + headW, headH / 2 - c], [x0 + headW - c, headH / 2], [x0 + c, headH / 2], [x0, headH / 2 - c], [x0, -headH / 2 + c]]]));
  }
  const sx0 = x0 + headW - 0.01;
  const sx1 = s / 2;
  parts.push(rect(sx0, -shankH / 2, sx1, shankH / 2, 0));
  // thread teeth on both edges of the shank
  for (let x = sx0 + pitch * 0.6; x + pitch <= sx1 + 1e-9; x += pitch) {
    parts.push(cs([[[x, shankH / 2 - 0.01], [x + pitch, shankH / 2 - 0.01], [x + pitch / 2, shankH / 2 + tooth]]]));
    parts.push(cs([[[x + pitch, -shankH / 2 + 0.01], [x, -shankH / 2 + 0.01], [x + pitch / 2, -shankH / 2 - tooth]]]));
  }
  return csUnion(parts);
}

/** Heat-set insert, side view: a knurled sleeve. */
function insert(s: number): CrossSection {
  const w = s * 0.5;
  const parts: CrossSection[] = [rect(-w / 2, -s / 2, w / 2, s / 2, s * 0.04)];
  const band = s * 0.14;
  for (const y of [-0.3, 0, 0.3]) parts.push(rect(-w / 2 - s * 0.12, y * s - band / 2, w / 2 + s * 0.12, y * s + band / 2, band * 0.3));
  return csUnion(parts);
}

/**
 * An uploaded SVG as a one-colour icon: every fill colour merged into one
 * silhouette (label icons print in one colour), scaled to fit `s` × `s`,
 * centred, Y flipped (SVG Y points down).
 */
export function artworkIcon(art: Artwork, s: number): CrossSection | null {
  const layers = art.layers.map((l) => cs(l.rings, "NonZero"));
  if (!layers.length) return null;
  let u = csUnion(layers);
  if (u.isEmpty()) return null;
  u = track(u.mirror([0, 1]));
  const b = csBounds(u);
  const k = s / Math.max(b.w, b.h);
  return csScale(csTranslate(u, -(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2), k);
}
