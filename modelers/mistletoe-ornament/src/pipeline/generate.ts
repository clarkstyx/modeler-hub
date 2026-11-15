import type { OrnamentParams } from "../core/params";
import type { Issue, Part } from "../core/types";
import { hasErrors, validateParams } from "../core/validateParams";
import { toRecipe } from "../core/recipe";
import { withArena } from "../shared/kernel";
import { validateMesh } from "../shared/mesh";
import { partsToStl } from "../shared/stl";
import { buildThreeMF } from "../export/threeMF";
import { buildOrnament, type OrnamentInfo } from "../geometry/buildOrnament";

export interface GenerateResult {
  parts: Part[];
  issues: Issue[];
  info: OrnamentInfo;
  meshesChecked: number;
  meshesFailed: number;
  exportable: boolean;
  elapsedMs: number;
}

const EMPTY_INFO: OrnamentInfo = { width: 0, height: 0, thickness: 0, capHeight: 0, colours: 0, hole: { x: 0, y: 0, d: 0 } };

/** Settings → validated parts. Requires initKernel(). */
export function generate(params: OrnamentParams): GenerateResult {
  const t0 = Date.now();
  const issues = validateParams(params);
  if (hasErrors(issues)) return { parts: [], issues, info: EMPTY_INFO, meshesChecked: 0, meshesFailed: 0, exportable: false, elapsedMs: Date.now() - t0 };
  return withArena(() => {
    const built = buildOrnament(params);
    issues.push(...built.issues);
    let checked = 0, failed = 0;
    for (const part of built.parts) {
      checked++;
      const r = validateMesh(part.name, part.mesh);
      if (!r.ok) { failed++; for (const e of r.errors) issues.push({ severity: "error", message: `${r.name}: ${e}` }); }
    }
    return { parts: built.parts, issues, info: built.info, meshesChecked: checked, meshesFailed: failed, exportable: !hasErrors(issues) && built.parts.length > 0, elapsedMs: Date.now() - t0 };
  });
}

export const ornament3MF = (result: GenerateResult, params: OrnamentParams, title: string) =>
  buildThreeMF(result.parts, { title, project: JSON.stringify(toRecipe(params), null, 2) });

export const ornamentStl = (result: GenerateResult, title: string) => partsToStl(result.parts, title);

export { withArena };
