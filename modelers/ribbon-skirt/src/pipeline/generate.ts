import type { Derived, SkirtParams } from "../core/params";
import { derive } from "../core/params";
import type { Issue, Part } from "../core/types";
import { hasErrors, validateParams } from "../core/validateParams";
import { toRecipe } from "../core/recipe";
import { withArena } from "../shared/kernel";
import { validateMesh, type MeshReport } from "../shared/mesh";
import { partsToStl, partsToStlZip } from "../shared/stl";
import { buildThreeMF } from "../export/threeMF";
import { buildSkirt } from "../geometry/buildSkirt";

export interface GenerateResult {
  parts: Part[];
  meshReports: MeshReport[];
  issues: Issue[];
  derived: Derived;
  exportable: boolean;
  elapsedMs: number;
}

/** Settings → validated parts (one per colour). Deterministic; requires initKernel(). */
export function generate(params: SkirtParams): GenerateResult {
  const t0 = Date.now();
  const issues = validateParams(params);
  if (hasErrors(issues)) return { parts: [], meshReports: [], issues, derived: derive(params), exportable: false, elapsedMs: Date.now() - t0 };
  return withArena(() => {
    const built = buildSkirt(params);
    issues.push(...built.issues);
    const meshReports = built.parts.map((p) => validateMesh(p.name, p.mesh));
    for (const r of meshReports) for (const e of r.errors) issues.push({ severity: "error", message: `${r.name}: ${e}` });
    return { parts: built.parts, meshReports, issues, derived: built.derived, exportable: !hasErrors(issues) && built.parts.length > 0, elapsedMs: Date.now() - t0 };
  });
}

export const export3MF = (result: GenerateResult, params: SkirtParams, title: string) =>
  buildThreeMF(result.parts, { title, project: JSON.stringify(toRecipe(params), null, 2) });
export const exportStl = (result: GenerateResult, title: string) => partsToStl(result.parts, title);
export const exportStlZip = (result: GenerateResult, title: string) => partsToStlZip(result.parts, title);
