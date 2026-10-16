/**
 * Export validation: builds every preset plus edge cases headlessly, checks
 * every part is watertight with consistent winding and positive volume, and
 * writes out/*.3mf for a look in the slicer.
 *
 *   npm run validate
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
import { initKernel } from "../src/shared/kernel";
import { DEFAULT_PARAMS, type SkirtParams } from "../src/core/params";
import { PRESETS, presetParams } from "../src/core/presets";
import { export3MF, generate } from "../src/pipeline/generate";

await initKernel();
mkdirSync("out", { recursive: true });

const cases: [string, SkirtParams][] = PRESETS.map((p) => [p.id, presetParams(p.id)] as [string, SkirtParams]);
cases.push(
  ["no-pleats", { ...DEFAULT_PARAMS, pleats: 0 }],
  ["straight-cone", { ...DEFAULT_PARAMS, flare: 1, pleatReach: 1 }],
  ["many-pleats", { ...DEFAULT_PARAMS, pleats: 24, pleatDepth: 1.6, wall: 1.2 }],
  ["one-colour", { ...DEFAULT_PARAMS, ribbons: "" }],
  ["eight-ribbons", { ...DEFAULT_PARAMS, height: 110, ribbons: "#E8352F,#F2A81D,#F4E04D,#2FA84F,#2F6FD6,#7B3FC4,#FFFFFF,#FF66AA", ribbonWidth: 6, ribbonGap: 2 }],
  ["smooth-waist", { ...DEFAULT_PARAMS, waistRibs: 0 }],
  ["big-on-256", { ...DEFAULT_PARAMS, height: 200, bottomDiameter: 180, topDiameter: 50, pleats: 16, pleatDepth: 6, wall: 2 }],
  ["small-30mm", { ...DEFAULT_PARAMS, height: 32, bottomDiameter: 30, topDiameter: 12, pleats: 8, pleatDepth: 1.4, wall: 1, waistHeight: 6, loopDiameter: 9, loopHole: 4, loopThickness: 3, ribbonWidth: 4, ribbonGap: 1.5, hemHeight: 1.5 }],
);

let failed = false;
for (const [name, params] of cases) {
  const r = generate(params);
  const errors = r.issues.filter((i) => i.severity === "error").map((i) => i.message);
  const ok = errors.length === 0 && r.exportable && r.meshReports.every((m) => m.ok);
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(16)} ${r.parts.length} parts, ${r.meshReports.reduce((n, m) => n + m.triangles, 0)} tris, ${r.elapsedMs} ms${errors.length ? "  " + errors.join(" | ") : ""}`);
  if (ok) {
    const bytes = export3MF(r, params, name);
    writeFileSync(`out/${name}.3mf`, bytes);
    const model = strFromU8(unzipSync(bytes)["3D/3dmodel.model"]);
    if ((model.match(/<mesh>/g) ?? []).length !== r.parts.length) { console.log("     3MF structure mismatch"); failed = true; }
  }
}
console.log(failed ? "\nSome cases FAILED." : "\nAll cases passed. 3MF files are in out/.");
process.exit(failed ? 1 : 0);
