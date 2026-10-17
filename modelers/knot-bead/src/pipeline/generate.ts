import { strToU8, zipSync } from "fflate";
import type { BeadParams, Derived } from "../core/params";
import { derive } from "../core/params";
import type { Issue, Part } from "../core/types";
import { hasErrors, validateParams } from "../core/validateParams";
import { toRecipe } from "../core/recipe";
import { withArena } from "../shared/kernel";
import { validateMesh, type MeshReport } from "../shared/mesh";
import { partsToStl } from "../shared/stl";
import { buildThreeMF } from "../export/threeMF";
import { buildBeads, type Plate } from "../geometry/buildBead";

export interface GenerateResult {
  plates: Plate[];
  /** One bead at the origin, for the preview. */
  bead: Part | null;
  meshReport: MeshReport | null;
  issues: Issue[];
  derived: Derived;
  exportable: boolean;
  elapsedMs: number;
}

/** Settings → validated beads on plates. Deterministic; requires initKernel(). */
export function generate(params: BeadParams): GenerateResult {
  const t0 = Date.now();
  const issues = validateParams(params);
  if (hasErrors(issues)) return { plates: [], bead: null, meshReport: null, issues, derived: derive(params), exportable: false, elapsedMs: Date.now() - t0 };
  return withArena(() => {
    const built = buildBeads(params);
    issues.push(...built.issues);
    // Every bead is the same mesh moved on the plate, so one check covers them all.
    const meshReport = validateMesh("BEAD", built.bead.mesh);
    for (const e of meshReport.errors) issues.push({ severity: "error", message: `BEAD: ${e}` });
    return { plates: built.plates, bead: built.bead, meshReport, issues, derived: built.derived, exportable: !hasErrors(issues) && built.plates.length > 0, elapsedMs: Date.now() - t0 };
  });
}

const plateOf = (result: GenerateResult, n: number) => {
  const plate = result.plates[n - 1];
  if (!plate) throw new Error(`There is no plate ${n}.`);
  return plate;
};

export function plate3MF(result: GenerateResult, plateIndex: number, params: BeadParams, title: string): Uint8Array {
  const plate = plateOf(result, plateIndex);
  const name = result.plates.length > 1 ? `${title} plate ${plateIndex}` : title;
  return buildThreeMF(plate.parts, { title: name, project: JSON.stringify(toRecipe(params), null, 2) });
}

export const plateStl = (result: GenerateResult, plateIndex: number, title: string) => partsToStl(plateOf(result, plateIndex).parts, title);

/** Every plate as its own 3MF and STL, plus a README. */
export function beadZip(result: GenerateResult, params: BeadParams, title: string): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const multi = result.plates.length > 1;
  for (const plate of result.plates) {
    const stem = multi ? `${title}-plate-${String(plate.index).padStart(2, "0")}` : title;
    files[`${stem}.3mf`] = plate3MF(result, plate.index, params, title);
    files[`${stem}.stl`] = plateStl(result, plate.index, stem);
  }
  const total = result.plates.reduce((n, p) => n + p.beads.length, 0);
  files["README.txt"] = strToU8(
    `${title}: ${total} knot bead${total === 1 ? "" : "s"} on ${result.plates.length} plate(s).\n\n` +
      `Print each plate as placed, beads standing up, no supports. ${params.height} mm tall, ${params.diameter} mm wide, ${params.bore} mm bore.\n` +
      `0.2 mm layers; 3 walls. Slide the bead onto the cord; no knot needed.\n`,
  );
  return zipSync(files, { level: 6 });
}
