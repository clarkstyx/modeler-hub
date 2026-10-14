import { strToU8, zipSync } from "fflate";
import type { LabelParams, LabelSpec } from "../core/params";
import type { Artwork, Issue } from "../core/types";
import { hasErrors, validateParams } from "../core/validateParams";
import { toRecipe } from "../core/recipe";
import { withArena } from "../shared/kernel";
import { validateMesh } from "../shared/mesh";
import { buildBatch, buildFitTest, type Plate } from "../geometry/buildLabels";
import { buildThreeMF } from "../export/threeMF";
import { partsToStl } from "../shared/stl";
import { toCsv } from "../shared/batch";

export interface GenerateResult {
  plates: Plate[];
  issues: Issue[];
  labelCount: number;
  /** Meshes checked and how many failed (failures are also listed in issues). */
  meshesChecked: number;
  meshesFailed: number;
  exportable: boolean;
  elapsedMs: number;
  kind: "batch" | "fit-test";
}

/** Requires initKernel(). Deterministic for identical inputs. */
export function generate(params: LabelParams, specs: LabelSpec[], art: Artwork | null, kind: "batch" | "fit-test" = "batch"): GenerateResult {
  const t0 = Date.now();
  const issues = validateParams(params);
  const empty = (extra: Issue[] = []): GenerateResult => ({ plates: [], issues: [...issues, ...extra], labelCount: 0, meshesChecked: 0, meshesFailed: 0, exportable: false, elapsedMs: Date.now() - t0, kind });
  if (hasErrors(issues)) return empty();
  if (kind === "batch" && !specs.length) return empty([{ severity: "info", message: "Type at least one label in the list." }]);
  return withArena(() => {
    const built = kind === "fit-test" ? buildFitTest(params) : buildBatch(specs, params, art);
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
    const labelCount = built.plates.reduce((n, p) => n + p.labels.length, 0);
    return { plates: built.plates, issues, labelCount, meshesChecked: checked, meshesFailed: failed, exportable: !hasErrors(issues) && labelCount > 0, elapsedMs: Date.now() - t0, kind };
  });
}

export function plate3MF(result: GenerateResult, plateIndex: number, params: LabelParams, list: string, title: string): Uint8Array {
  const plate = result.plates[plateIndex - 1];
  if (!plate) throw new Error(`There is no plate ${plateIndex}.`);
  return buildThreeMF(plate.parts, { title: `${title} plate ${plateIndex}`, project: JSON.stringify(toRecipe(params, list), null, 2) });
}

export function plateStl(result: GenerateResult, plateIndex: number, title: string): Uint8Array {
  const plate = result.plates[plateIndex - 1];
  if (!plate) throw new Error(`There is no plate ${plateIndex}.`);
  return partsToStl(plate.parts, `${title} plate ${plateIndex}`);
}

/** Order → plate manifest: one row per label. */
export function manifestCsv(result: GenerateResult): string {
  const rows = [["label", "plate", "object", "text", "icon", "width_mm", "height_mm", "x_mm", "y_mm", "letter_mm", "source_line", "order"]];
  for (const plate of result.plates)
    for (const l of plate.labels)
      rows.push([String(l.index), String(plate.index), l.object, l.spec.text.replace(/\n/g, " / "), l.spec.icon, l.width.toFixed(1), l.height.toFixed(1), l.x.toFixed(1), l.y.toFixed(1), l.textSize.toFixed(1), String(l.spec.line), l.spec.order]);
  return toCsv(rows);
}

/** Every plate as its own 3MF, plus manifest.csv and a README, in one ZIP. */
export function batchZip(result: GenerateResult, params: LabelParams, list: string, title: string): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  for (const plate of result.plates) files[`${title}-plate-${String(plate.index).padStart(2, "0")}.3mf`] = plate3MF(result, plate.index, params, list, title);
  files["manifest.csv"] = strToU8(manifestCsv(result));
  files["README.txt"] = strToU8(
    `${title}: ${result.labelCount} labels on ${result.plates.length} plate(s).\n\n` +
      `Each plate-NN.3mf opens in Bambu Studio / OrcaSlicer with every label as its own object and each colour on its own filament slot.\n` +
      `manifest.csv says which label (and order, if the CSV had one) is on which plate, at which position.\n` +
      `Label slots differ between Gridfinity bin designs: print the fit-test strip from the app before a big batch.\n`,
  );
  return zipSync(files, { level: 6 });
}

export { withArena };
