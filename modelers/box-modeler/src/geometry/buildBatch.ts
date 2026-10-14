import { derive, type BoxParams } from "../core/params";
import type { BatchItem, BatchWhat } from "../core/batch";
import type { Artwork, Issue, Part } from "../core/types";
import { objectSlug, shelfPack } from "../shared/batch";
import { manifoldToMesh } from "../shared/mesh";
import { mTranslate } from "../shared/shapes";
import { buildBody, buildLid, overlapIssues, planDecoration, type BuiltPart } from "./buildBox";

/** Clear border around each plate and gap between objects on it. */
export const BATCH_BORDER = 5;
export const BATCH_GAP = 5;

export interface PlacedObject {
  /** 1-based position in the batch. */
  index: number;
  item: BatchItem;
  kind: "lid" | "box";
  /** Slicer object name, e.g. 03_AVA_LID. */
  object: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  /** Final letter height on this lid after fitting (mm), 0 for a box or no text. */
  textSize: number;
}

export interface BatchPlate {
  index: number;
  objects: PlacedObject[];
  parts: Part[];
}

export interface BatchBuild {
  plates: BatchPlate[];
  issues: Issue[];
  /** Plain boxes still to print when only lids are in the batch. */
  boxesNeeded: number;
}

const slug = (s: string) => objectSlug(s, "LID");

/**
 * One personalised lid per item (and, for "sets", a box beside it), packed in
 * list order onto bed-sized plates. Every item uses the current settings and
 * artwork; only the lid text changes. Requires an open arena (withArena).
 */
export function buildBoxBatch(p: BoxParams, items: BatchItem[], art: Artwork | null, what: BatchWhat): BatchBuild {
  const d = derive(p);
  const issues: Issue[] = [];
  const body: BuiltPart | null = what === "sets" ? { name: "BOX", object: "box", hex: p.bodyColor.toUpperCase(), solid: buildBody(p, d) } : null;

  const objects = items.flatMap((item, i) => {
    const index = i + 1;
    const base = `${String(index).padStart(2, "0")}_${slug(item.text)}`;
    const lid = { index, item, kind: "lid" as const, object: `${base}_LID`, width: d.lidL, depth: d.lidW };
    return body ? [{ index, item, kind: "box" as const, object: `${base}_BOX`, width: d.outerL, depth: d.outerW }, lid] : [lid];
  });
  const at = shelfPack(objects.map((o) => ({ w: o.width, h: o.depth })), p.bedSize, BATCH_BORDER, BATCH_GAP);

  const plates: BatchPlate[] = [];
  objects.forEach((o, k) => {
    const where = `Line ${o.item.line} (${o.item.text.replace(/\n/g, " ")})`;
    const pos = at[k];
    if (!pos) {
      issues.push({ severity: "error", message: `${where}: a ${o.width.toFixed(0)} × ${o.depth.toFixed(0)} mm ${o.kind} does not fit a ${p.bedSize} mm bed.` });
      return;
    }
    const plate = (plates[pos.plate] ??= { index: pos.plate + 1, objects: [], parts: [] });
    let built: BuiltPart[];
    let textSize = 0;
    if (o.kind === "box") built = [body!];
    else {
      const lp = { ...p, text: o.item.text };
      const plan = planDecoration(lp, d, art);
      for (const i of plan.issues) issues.push({ ...i, message: `${where}: ${i.message}` });
      built = buildLid(lp, d, plan);
      for (const i of overlapIssues(built)) issues.push({ ...i, message: `${where}: ${i.message}` });
      textSize = plan.textSizeUsed;
    }
    for (const b of built) {
      const m = mTranslate(b.solid, pos.x, pos.y, 0);
      if (m.isEmpty()) continue;
      plate.parts.push({ name: b.name, object: o.object, hex: b.hex, mesh: manifoldToMesh(m), volume: m.volume() });
    }
    plate.objects.push({ ...o, x: pos.x, y: pos.y, textSize });
  });

  const colours = new Set(plates.flatMap((pl) => pl.parts.map((x) => x.hex)));
  if (colours.size > 4) issues.push({ severity: "warning", message: `${colours.size} colours: more than the four slots of one AMS.` });
  return { plates: plates.filter(Boolean), issues, boxesNeeded: what === "lids" ? items.length : 0 };
}
