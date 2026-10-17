import { strToU8, zipSync } from "fflate";
import type { TagLayout } from "../core/layout";
import { layoutTag } from "../core/layout";
import { tagNames, type TagParams } from "../core/params";
import type { Issue, Part } from "../core/types";
import { hasErrors, validateParams } from "../core/validateParams";
import { toRecipe } from "../core/recipe";
import { withArena } from "../shared/kernel";
import { validateMesh, type MeshReport } from "../shared/mesh";
import { partsToStl } from "../shared/stl";
import { buildThreeMF } from "../export/threeMF";
import { buildTags, type Plate } from "../geometry/buildTag";

export interface GenerateResult {
  plates: Plate[];
  /** The first tag, centred on the origin, for the preview. */
  tag: Part[];
  layout: TagLayout;
  meshReports: MeshReport[];
  issues: Issue[];
  exportable: boolean;
  elapsedMs: number;
}

/** Settings → validated tags on plates. Deterministic; requires initKernel(). */
export function generate(params: TagParams): GenerateResult {
  const t0 = Date.now();
  const issues = validateParams(params);
  if (hasErrors(issues)) return { plates: [], tag: [], layout: layoutTag(params, tagNames(params)[0] ?? ""), meshReports: [], issues, exportable: false, elapsedMs: Date.now() - t0 };
  return withArena(() => {
    const built = buildTags(params);
    issues.push(...built.issues);
    // Every part of every tag is checked: the text differs from name to name.
    const meshReports = built.plates.flatMap((pl) => pl.parts.map((part) => validateMesh(`${part.object} ${part.name}`, part.mesh)));
    for (const r of meshReports) for (const e of r.errors) issues.push({ severity: "error", message: `${r.name}: ${e}` });
    return { plates: built.plates, tag: built.tag, layout: built.layout, meshReports, issues, exportable: !hasErrors(issues) && built.plates.length > 0, elapsedMs: Date.now() - t0 };
  });
}

const plateOf = (result: GenerateResult, n: number) => {
  const plate = result.plates[n - 1];
  if (!plate) throw new Error(`There is no plate ${n}.`);
  return plate;
};

export function plate3MF(result: GenerateResult, plateIndex: number, params: TagParams, title: string): Uint8Array {
  const plate = plateOf(result, plateIndex);
  const name = result.plates.length > 1 ? `${title} plate ${plateIndex}` : title;
  return buildThreeMF(plate.parts, { title: name, project: JSON.stringify(toRecipe(params), null, 2) });
}

export const plateStl = (result: GenerateResult, plateIndex: number, title: string) => partsToStl(plateOf(result, plateIndex).parts, title);

/** Every plate as its own 3MF and STL, plus a README. */
export function tagZip(result: GenerateResult, params: TagParams, title: string): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const multi = result.plates.length > 1;
  for (const plate of result.plates) {
    const stem = multi ? `${title}-plate-${String(plate.index).padStart(2, "0")}` : title;
    files[`${stem}.3mf`] = plate3MF(result, plate.index, params, title);
    files[`${stem}.stl`] = plateStl(result, plate.index, stem);
  }
  const total = result.plates.reduce((n, p) => n + p.tags.length, 0);
  files["README.txt"] = strToU8(
    `${title}: ${total} checklist tag${total === 1 ? "" : "s"} on ${result.plates.length} plate(s).\n\n` +
      `Print flat as placed, no supports. ${params.width} x ${params.height} mm, ${params.thickness} mm card, details ${params.relief} mm raised.\n` +
      `Open the 3MF in Bambu Studio: card, text, boxes and tick are separate parts, so each gets its own filament.\n` +
      `The STL is one colour; use the 3MF for colours.\n`,
  );
  return zipSync(files, { level: 6 });
}
