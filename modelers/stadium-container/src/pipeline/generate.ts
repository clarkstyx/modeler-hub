import { strToU8, zipSync } from "fflate";
import { TARGETS, type StadiumParams } from "../core/params";
import type { Artwork, Issue, Part } from "../core/types";
import { hasErrors, validateParams } from "../core/validateParams";
import { toRecipe } from "../core/recipe";
import { withArena } from "../shared/kernel";
import { validateMesh } from "../shared/mesh";
import { partsToStl } from "../shared/stl";
import { buildThreeMF } from "../export/threeMF";
import { buildStadium, type Printed } from "../geometry/buildStadium";

export type ExportGroup = "stadium" | "floodlights" | "fit-test";
export const GROUP_LABELS: Record<ExportGroup, string> = { stadium: "Stadium", floodlights: "Floodlights (4)", "fit-test": "Peg fit test" };

/** Numbers shown in the readout; all millimetres. */
export interface Readout {
  cavityDiameter: number;
  cavityDepth: number;
  floor: number;
  footprint: number;
  acrossFlats: number;
  height: number;
  wallHeight: number;
  seatingWidth: number;
  seatingHeight: number;
  lightHeight: number;
  capHeight: number;
  colours: number;
}

export interface GenerateResult {
  assembled: Part[];
  groups: Record<ExportGroup, Printed[]>;
  readout: Readout | null;
  issues: Issue[];
  meshesChecked: number;
  meshesFailed: number;
  exportable: boolean;
  elapsedMs: number;
}

const empty = (issues: Issue[], t0: number): GenerateResult => ({ assembled: [], groups: { stadium: [], floodlights: [], "fit-test": [] }, readout: null, issues, meshesChecked: 0, meshesFailed: 0, exportable: false, elapsedMs: Date.now() - t0 });

/** Settings (+ emblem) → validated parts. Requires initKernel(). */
export function generate(params: StadiumParams, art: Artwork | null): GenerateResult {
  const t0 = Date.now();
  const issues = validateParams(params);
  if (hasErrors(issues)) return empty(issues, t0);
  return withArena(() => {
    const built = buildStadium(params, art);
    issues.push(...built.issues);
    const groups: Record<ExportGroup, Printed[]> = { stadium: built.stadium, floodlights: built.floodlights, "fit-test": built.fitTest };
    let checked = 0, failed = 0;
    for (const list of Object.values(groups))
      for (const obj of list)
        for (const part of obj.parts) {
          checked++;
          const r = validateMesh(`${obj.object} / ${part.name}`, part.mesh);
          if (!r.ok) { failed++; for (const e of r.errors) issues.push({ severity: "error", message: `${r.name}: ${e}` }); }
        }
    const d = built.derived;
    const readout: Readout = {
      cavityDiameter: params.innerDiameter,
      cavityDepth: params.depth,
      floor: params.floor,
      footprint: d.footprint,
      acrossFlats: 2 * d.baseApothem,
      height: d.height,
      wallHeight: d.wallHeight,
      seatingWidth: params.rows * params.rowTread,
      seatingHeight: params.rows * params.rowRise,
      lightHeight: d.lightHeight,
      capHeight: built.capHeight,
      colours: new Set(built.assembled.map((p) => p.hex)).size,
    };
    return { assembled: built.assembled, groups, readout, issues, meshesChecked: checked, meshesFailed: failed, exportable: !hasErrors(issues) && built.stadium.length > 0, elapsedMs: Date.now() - t0 };
  });
}

const partsOf = (result: GenerateResult, group: ExportGroup): Part[] => {
  const parts = result.groups[group].flatMap((o) => o.parts);
  if (!parts.length) throw new Error(`Nothing to export for "${GROUP_LABELS[group]}" with these settings.`);
  return parts;
};

export function group3MF(result: GenerateResult, group: ExportGroup, params: StadiumParams, title: string): Uint8Array {
  const name = group === "stadium" ? title : `${title} ${GROUP_LABELS[group].toLowerCase()}`;
  return buildThreeMF(partsOf(result, group), { title: name, project: JSON.stringify(toRecipe(params), null, 2) });
}

export const groupStl = (result: GenerateResult, group: ExportGroup, title: string) => partsToStl(partsOf(result, group), title);

export function readme(result: GenerateResult, params: StadiumParams, title: string): string {
  const r = result.readout!;
  const lights = params.lights === "separate"
    ? `Floodlights are separate parts: print them lying flat as placed (lamps up) and push the ${result.groups.floodlights.length} pegs into the sockets on the base. ` +
      `Print the peg fit test first (one socket at ${params.pegClearance} mm clearance per side plus a short peg); adjust "Peg clearance" if it is loose or tight.\n`
    : params.lights === "attached" ? "Floodlights print in place, standing on the base.\n" : "No floodlights.\n";
  return (
    `${title}: a stadium around a ${r.cavityDiameter} mm × ${r.cavityDepth} mm deep round container.\n\n` +
    `Footprint ${r.footprint.toFixed(0)} mm across the corners, ${r.height.toFixed(0)} mm tall. ` +
    `Print the stadium as placed, base on the bed, no supports (every overhang is 45° or a tiny step).\n${lights}\n` +
    `Colours: one part per colour inside each object; assign a filament to each part in the slicer (the 3MF carries the suggested slots).\n` +
    `Design targets, not yet confirmed by a print: walls ≥ ${TARGETS.wall} mm, floor ≥ ${TARGETS.floor} mm, raised details ≥ ${TARGETS.detail} mm, letter strokes ≥ ${TARGETS.stroke} mm.\n`
  );
}

/** Every printable group as its own 3MF and STL, plus a README. */
export function stadiumZip(result: GenerateResult, params: StadiumParams, title: string): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  for (const group of Object.keys(GROUP_LABELS) as ExportGroup[]) {
    if (!result.groups[group].flatMap((o) => o.parts).length) continue;
    const stem = group === "stadium" ? title : `${title}-${group}`;
    files[`${stem}.3mf`] = group3MF(result, group, params, title);
    files[`${stem}.stl`] = groupStl(result, group, stem);
  }
  files["README.txt"] = strToU8(readme(result, params, title));
  return zipSync(files, { level: 6 });
}

export { withArena };
