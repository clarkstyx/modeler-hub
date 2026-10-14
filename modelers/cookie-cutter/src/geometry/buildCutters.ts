import type { CutterParams } from "../core/params";
import type { Artwork, Issue, Part } from "../core/types";
import { objectSlug, shelfPack } from "../shared/batch";
import { track, type CrossSection, type Manifold } from "../shared/kernel";
import { manifoldToMesh } from "../shared/mesh";
import { csBounds, csOffset, csSimplify, mSubtract, mTranslate, mUnion, prism } from "../shared/shapes";
import { buildOutlines, OUTLINE_TOLERANCE } from "./outlines";

export const PLATE_BORDER = 5;
/** Steps in the taper from the wall to the cutting edge; each is a small inward step (no overhang). */
export const TAPER_STEPS = 4;
/** Same tolerance as the Trinket Tray: edges shorter than this are collapsed before export. */
export const MESH_TOLERANCE = 1e-4;

export interface PlacedCutter {
  /** 1-based position in the set. */
  index: number;
  label: string;
  /** Slicer object name, e.g. 02_B. */
  object: string;
  x: number;
  y: number;
  /** Footprint on the bed, flange included. */
  width: number;
  depth: number;
  /** Size of the cutting outline (the cookie). */
  cookieW: number;
  cookieH: number;
}

export interface Plate {
  index: number;
  cutters: PlacedCutter[];
  parts: Part[];
}

export interface BuildResult {
  plates: Plate[];
  issues: Issue[];
}

/** The outline grown outwards by `t` (a filled shape). */
const grown = (outline: CrossSection, t: number) => csSimplify(csOffset(outline, t), OUTLINE_TOLERANCE);

/**
 * The cutter, printed flange-down: flange on the bed, the full wall up to the
 * edge band, a stepped taper in, and the thin cutting edge at the top.
 * Built as solid stacked layers (each the outline grown by its wall
 * thickness) minus the outline cut straight through, so the inner cutting
 * face is one clean surface and no layer overhangs the one below.
 */
export function cutterSolid(outline: CrossSection, p: CutterParams): Manifold {
  const top = p.height - p.edgeHeight;
  const taperH = p.edgeHeight / 2;
  const layers: Manifold[] = [prism(grown(outline, p.wall), 0, top)];
  if (p.flange > 0) layers.push(prism(grown(outline, p.wall + p.flange), 0, p.flangeThickness));
  if (p.wall > p.edge)
    for (let k = 1; k <= TAPER_STEPS; k++) {
      const t = p.wall + ((p.edge - p.wall) * k) / TAPER_STEPS;
      layers.push(prism(grown(outline, t), top + ((k - 1) * taperH) / TAPER_STEPS, top + (k * taperH) / TAPER_STEPS));
    }
  layers.push(prism(grown(outline, p.edge), p.wall > p.edge ? top + taperH : top, p.height));
  // Collapse edges under MESH_TOLERANCE: offsets of font curves leave
  // near-coincident vertices that otherwise break the exported mesh.
  return track(mSubtract(mUnion(layers), prism(outline, -1, p.height + 1)).simplify(MESH_TOLERANCE));
}

/** Every cutter for the current settings, packed in order onto bed-sized plates. Requires an open arena. */
export function buildCutters(p: CutterParams, art: Artwork | null): BuildResult {
  const issues: Issue[] = [];
  const outlines = buildOutlines(p, art, issues);
  const reach = p.wall + p.flange;
  const items = outlines.map((o, i) => {
    const b = csBounds(o.section);
    return { index: i + 1, outline: o, b, width: b.w + 2 * reach, depth: b.h + 2 * reach };
  });
  const at = shelfPack(items.map((it) => ({ w: it.width, h: it.depth })), p.bedSize, PLATE_BORDER, p.plateGap);
  const plates: Plate[] = [];
  items.forEach((it, k) => {
    const pos = at[k];
    if (!pos) {
      issues.push({ severity: "error", message: `${it.outline.label}: the cutter is ${it.width.toFixed(0)} × ${it.depth.toFixed(0)} mm with its flange and does not fit a ${p.bedSize} mm bed.` });
      return;
    }
    const solid = mTranslate(cutterSolid(it.outline.section, p), pos.x + reach - it.b.minX, pos.y + reach - it.b.minY, 0);
    const object = `${String(it.index).padStart(2, "0")}_${objectSlug(it.outline.stem, "CUTTER")}`;
    const plate = (plates[pos.plate] ??= { index: pos.plate + 1, cutters: [], parts: [] });
    plate.parts.push({ name: "CUTTER", object, hex: p.color.toUpperCase(), mesh: manifoldToMesh(solid), volume: solid.volume() });
    plate.cutters.push({ index: it.index, label: it.outline.label, object, x: pos.x, y: pos.y, width: it.width, depth: it.depth, cookieW: it.b.w, cookieH: it.b.h });
  });
  return { plates: plates.filter(Boolean), issues };
}
