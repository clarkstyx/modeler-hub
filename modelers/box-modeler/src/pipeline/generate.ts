import { strToU8, zipSync } from "fflate";
import { derive, deriveRack, type BoxParams, type Derived, type RackDerived } from "../core/params";
import type { BatchItem, BatchWhat } from "../core/batch";
import type { Artwork, Issue, Part } from "../core/types";
import { hasErrors, validateParams, validateRack } from "../core/validateParams";
import { withArena } from "../shared/kernel";
import { validateMesh, type MeshReport } from "../shared/mesh";
import { buildBox, buildCalibration } from "../geometry/buildBox";
import { buildThreeMF } from "../export/threeMF";
import { partsToStl, partsToStlZip } from "../shared/stl";
import { toRecipe } from "../core/recipe";
import { toCsv } from "../shared/batch";
import { buildBoxBatch, type BatchPlate } from "../geometry/buildBatch";
import { buildRack, buildRackCalibration, type Ghost, type Placement } from "../geometry/buildRack";

export interface GenerateResult {
  parts: Part[];
  meshReports: MeshReport[];
  issues: Issue[];
  derived: Derived;
  lidPrintOffset: [number, number, number];
  lidClosedOffset: [number, number, number];
  textSizeUsed: number;
  artWidthUsed: number;
  exportable: boolean;
  elapsedMs: number;
  kind: "box" | "calibration";
  product: "box" | "rack";
  /** Rack only: cube sizes, how the printed objects assemble, and the enclosures to draw see-through. */
  rack?: RackDerived;
  assembly?: Placement[];
  ghosts?: Ghost[];
}

/** Enclosure rack: cube + tray + keys, or the key fit test. */
function generateRack(params: BoxParams, kind: "box" | "calibration", t0: number): GenerateResult {
  const issues = validateRack(params);
  const derived = derive(params);
  const none = { lidPrintOffset: [0, 0, 0] as [number, number, number], lidClosedOffset: [0, 0, 0] as [number, number, number], textSizeUsed: 0, artWidthUsed: 0, product: "rack" as const };
  if (hasErrors(issues))
    return { parts: [], meshReports: [], issues, derived, ...none, rack: deriveRack(params), exportable: false, elapsedMs: Date.now() - t0, kind };
  return withArena(() => {
    const built = kind === "calibration" ? buildRackCalibration(params) : buildRack(params);
    issues.push(...built.issues);
    const meshReports = built.parts.map((p) => validateMesh(p.name, p.mesh));
    for (const r of meshReports) for (const e of r.errors) issues.push({ severity: "error", message: `${r.name}: ${e}` });
    return {
      parts: built.parts, meshReports, issues, derived, ...none,
      rack: built.rack, assembly: built.assembly, ghosts: built.ghosts,
      exportable: !hasErrors(issues) && built.parts.length > 0,
      elapsedMs: Date.now() - t0,
      kind,
    };
  });
}

/** Parameters → validated parts. Deterministic for identical inputs; requires initKernel(). */
export function generate(params: BoxParams, art: Artwork | null, kind: "box" | "calibration" = "box"): GenerateResult {
  const t0 = Date.now();
  if (params.product === "rack") return generateRack(params, kind, t0);
  const issues = validateParams(params);
  if (hasErrors(issues)) {
    const d = (withArena(() => buildBox({ ...params, text: "" }, null)) as { derived: Derived }).derived;
    return { parts: [], meshReports: [], issues, derived: d, lidPrintOffset: [0, 0, 0], lidClosedOffset: [0, 0, 0], textSizeUsed: 0, artWidthUsed: 0, exportable: false, elapsedMs: Date.now() - t0, kind, product: "box" };
  }
  return withArena(() => {
    const built = kind === "calibration" ? buildCalibration(params) : buildBox(params, art);
    issues.push(...built.issues);
    const meshReports = built.parts.map((p) => validateMesh(p.name, p.mesh));
    for (const r of meshReports) for (const e of r.errors) issues.push({ severity: "error", message: `${r.name}: ${e}` });
    return {
      parts: built.parts,
      meshReports,
      issues,
      derived: built.derived,
      lidPrintOffset: built.lidPrintOffset,
      lidClosedOffset: built.lidClosedOffset,
      textSizeUsed: built.textSizeUsed,
      artWidthUsed: built.artWidthUsed,
      exportable: !hasErrors(issues) && built.parts.length > 0,
      elapsedMs: Date.now() - t0,
      kind,
      product: "box",
    };
  });
}

export function export3MF(result: GenerateResult, params: BoxParams, title: string): Uint8Array {
  return buildThreeMF(result.parts, { title, project: JSON.stringify(toRecipe(params), null, 2) });
}
export const exportStl = (result: GenerateResult, title: string) => partsToStl(result.parts, title);
export const exportStlZip = (result: GenerateResult, title: string) => partsToStlZip(result.parts, title);

export interface BatchResult {
  plates: BatchPlate[];
  issues: Issue[];
  itemCount: number;
  boxesNeeded: number;
  meshesChecked: number;
  meshesFailed: number;
  exportable: boolean;
  elapsedMs: number;
}

/** A list of lid texts → validated plates. Requires initKernel(). */
export function generateBatch(params: BoxParams, items: BatchItem[], art: Artwork | null, what: BatchWhat): BatchResult {
  const t0 = Date.now();
  const issues = validateParams(params);
  const empty = (extra: Issue[] = []): BatchResult => ({ plates: [], issues: [...issues, ...extra], itemCount: 0, boxesNeeded: 0, meshesChecked: 0, meshesFailed: 0, exportable: false, elapsedMs: Date.now() - t0 });
  if (hasErrors(issues)) return empty();
  if (!items.length) return empty([{ severity: "info", message: "Type at least one name in the batch list." }]);
  return withArena(() => {
    const built = buildBoxBatch(params, items, art, what);
    issues.push(...built.issues);
    let checked = 0;
    let failed = 0;
    for (const plate of built.plates)
      for (const part of plate.parts) {
        checked++;
        const r = validateMesh(`${part.object}/${part.name}`, part.mesh);
        if (!r.ok) {
          failed++;
          for (const e of r.errors) issues.push({ severity: "error", message: `${r.name}: ${e}` });
        }
      }
    const itemCount = new Set(built.plates.flatMap((pl) => pl.objects.map((o) => o.index))).size;
    return { plates: built.plates, issues, itemCount, boxesNeeded: built.boxesNeeded, meshesChecked: checked, meshesFailed: failed, exportable: !hasErrors(issues) && itemCount > 0, elapsedMs: Date.now() - t0 };
  });
}

export function batchPlate3MF(result: BatchResult, plateIndex: number, params: BoxParams, title: string): Uint8Array {
  const plate = result.plates[plateIndex - 1];
  if (!plate) throw new Error(`There is no plate ${plateIndex}.`);
  return buildThreeMF(plate.parts, { title: `${title} plate ${plateIndex}`, project: JSON.stringify(toRecipe({ ...params, text: "" }), null, 2) });
}

/** One row per printed object: which name and order is on which plate, where. */
export function batchManifest(result: BatchResult): string {
  const rows: (string | number)[][] = [["item", "plate", "object", "kind", "text", "order", "x_mm", "y_mm", "width_mm", "depth_mm", "letter_mm", "source_line"]];
  for (const plate of result.plates)
    for (const o of plate.objects)
      rows.push([o.index, plate.index, o.object, o.kind, o.item.text.replace(/\n/g, " / "), o.item.order, o.x.toFixed(1), o.y.toFixed(1), o.width.toFixed(1), o.depth.toFixed(1), o.textSize.toFixed(1), o.item.line]);
  return toCsv(rows);
}

/** Every plate as its own 3MF, plus manifest.csv and a README, in one ZIP. */
export function batchZip(result: BatchResult, params: BoxParams, title: string): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  for (const plate of result.plates) files[`${title}-plate-${String(plate.index).padStart(2, "0")}.3mf`] = batchPlate3MF(result, plate.index, params, title);
  files["manifest.csv"] = strToU8(batchManifest(result));
  const boxes = result.boxesNeeded
    ? `This batch holds lids only. Print ${result.boxesNeeded} plain box${result.boxesNeeded === 1 ? "" : "es"} with the same settings (the normal 3MF, lid text empty).\n`
    : `Every name has its box beside its lid.\n`;
  files["README.txt"] = strToU8(
    `${title}: ${result.itemCount} personalised lid${result.itemCount === 1 ? "" : "s"} on ${result.plates.length} plate(s).\n\n` +
      `Each plate-NN.3mf opens in Bambu Studio / OrcaSlicer with every lid as its own object and each colour on its own filament slot.\n` +
      boxes +
      `manifest.csv says which name (and order, if the CSV had one) is on which plate, at which position.\n` +
      `Lid fit depends on your printer: print the lid fit test from the app before a big batch.\n`,
  );
  return zipSync(files, { level: 6 });
}
