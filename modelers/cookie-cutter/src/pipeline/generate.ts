import { strToU8, zipSync } from "fflate";
import { FOOD_NOTE, type CutterParams } from "../core/params";
import type { Artwork, Issue } from "../core/types";
import { hasErrors, validateParams } from "../core/validateParams";
import { toRecipe } from "../core/recipe";
import { withArena } from "../shared/kernel";
import { validateMesh } from "../shared/mesh";
import { partsToStl } from "../shared/stl";
import { toCsv } from "../shared/batch";
import { buildThreeMF } from "../export/threeMF";
import { buildCutters, type Plate } from "../geometry/buildCutters";

export interface GenerateResult {
  plates: Plate[];
  issues: Issue[];
  cutterCount: number;
  meshesChecked: number;
  meshesFailed: number;
  exportable: boolean;
  elapsedMs: number;
}

/** Settings (+ SVG) → validated cutters on plates. Requires initKernel(). */
export function generate(params: CutterParams, art: Artwork | null): GenerateResult {
  const t0 = Date.now();
  const issues = validateParams(params);
  if (hasErrors(issues)) return { plates: [], issues, cutterCount: 0, meshesChecked: 0, meshesFailed: 0, exportable: false, elapsedMs: Date.now() - t0 };
  return withArena(() => {
    const built = buildCutters(params, art);
    issues.push(...built.issues);
    let checked = 0, failed = 0;
    for (const plate of built.plates)
      for (const part of plate.parts) {
        checked++;
        const r = validateMesh(`${part.object}`, part.mesh);
        if (!r.ok) { failed++; for (const e of r.errors) issues.push({ severity: "error", message: `${r.name}: ${e}` }); }
      }
    const cutterCount = built.plates.reduce((n, p) => n + p.cutters.length, 0);
    return { plates: built.plates, issues, cutterCount, meshesChecked: checked, meshesFailed: failed, exportable: !hasErrors(issues) && cutterCount > 0, elapsedMs: Date.now() - t0 };
  });
}

const plateOf = (result: GenerateResult, n: number) => {
  const plate = result.plates[n - 1];
  if (!plate) throw new Error(`There is no plate ${n}.`);
  return plate;
};

export function plate3MF(result: GenerateResult, plateIndex: number, params: CutterParams, title: string): Uint8Array {
  const plate = plateOf(result, plateIndex);
  const name = result.plates.length > 1 ? `${title} plate ${plateIndex}` : title;
  return buildThreeMF(plate.parts, { title: name, project: JSON.stringify(toRecipe(params), null, 2) });
}

export const plateStl = (result: GenerateResult, plateIndex: number, title: string) => partsToStl(plateOf(result, plateIndex).parts, title);

export function manifestCsv(result: GenerateResult): string {
  const rows: (string | number)[][] = [["cutter", "plate", "object", "label", "cookie_w_mm", "cookie_h_mm", "footprint_w_mm", "footprint_d_mm", "x_mm", "y_mm"]];
  for (const plate of result.plates)
    for (const c of plate.cutters)
      rows.push([c.index, plate.index, c.object, c.label, c.cookieW.toFixed(1), c.cookieH.toFixed(1), c.width.toFixed(1), c.depth.toFixed(1), c.x.toFixed(1), c.y.toFixed(1)]);
  return toCsv(rows);
}

export function readme(result: GenerateResult, params: CutterParams, title: string): string {
  return (
    `${title}: ${result.cutterCount} cookie cutter${result.cutterCount === 1 ? "" : "s"} on ${result.plates.length} plate(s).\n\n` +
    `Print each plate as placed: flange on the bed, cutting edge up, no supports. ` +
    `Height ${params.height} mm, wall ${params.wall} mm, cutting edge ${params.edge} mm, flange ${params.flange} mm.\n\n` +
    `${FOOD_NOTE}\n`
  );
}

/** Every plate as its own 3MF plus an STL per plate, manifest.csv and a README with the food-contact note. */
export function cutterZip(result: GenerateResult, params: CutterParams, title: string): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const multi = result.plates.length > 1;
  for (const plate of result.plates) {
    const stem = multi ? `${title}-plate-${String(plate.index).padStart(2, "0")}` : title;
    files[`${stem}.3mf`] = plate3MF(result, plate.index, params, title);
    files[`${stem}.stl`] = plateStl(result, plate.index, stem);
  }
  files["manifest.csv"] = strToU8(manifestCsv(result));
  files["README.txt"] = strToU8(readme(result, params, title));
  return zipSync(files, { level: 6 });
}

export { withArena };
