import type { BoxParams, Derived } from "../core/params";
import type { Artwork, Issue, Part } from "../core/types";
import { hasErrors, validateParams } from "../core/validateParams";
import { withArena } from "../geometry/kernel";
import { validateMesh, type MeshReport } from "../geometry/mesh";
import { buildBox, buildCalibration } from "../geometry/buildBox";
import { buildThreeMF } from "../export/threeMF";
import { partsToStl, partsToStlZip } from "../export/stl";
import { toRecipe } from "../core/recipe";

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
}

/** Parameters → validated parts. Deterministic for identical inputs; requires initKernel(). */
export function generate(params: BoxParams, art: Artwork | null, kind: "box" | "calibration" = "box"): GenerateResult {
  const t0 = Date.now();
  const issues = validateParams(params);
  if (hasErrors(issues)) {
    const d = (withArena(() => buildBox({ ...params, text: "" }, null)) as { derived: Derived }).derived;
    return { parts: [], meshReports: [], issues, derived: d, lidPrintOffset: [0, 0, 0], lidClosedOffset: [0, 0, 0], textSizeUsed: 0, artWidthUsed: 0, exportable: false, elapsedMs: Date.now() - t0, kind };
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
    };
  });
}

export function export3MF(result: GenerateResult, params: BoxParams, title: string): Uint8Array {
  return buildThreeMF(result.parts, { title, project: JSON.stringify(toRecipe(params), null, 2) });
}
export const exportStl = (result: GenerateResult, title: string) => partsToStl(result.parts, title);
export const exportStlZip = (result: GenerateResult, title: string) => partsToStlZip(result.parts, title);
