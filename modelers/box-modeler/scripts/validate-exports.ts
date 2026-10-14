/**
 * Export validation: builds every preset plus edge cases headlessly, checks
 * every part is watertight with consistent winding and positive volume, that
 * no two parts of one object overlap, and writes out/*.3mf for a look in the slicer.
 *
 *   npm run validate
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
import { initKernel } from "../src/shared/kernel";
import { DEFAULT_PARAMS, type BoxParams } from "../src/core/params";
import { PRESETS, presetParams } from "../src/core/presets";
import { export3MF, generate } from "../src/pipeline/generate";

await initKernel();
mkdirSync("out", { recursive: true });

const cases: [string, BoxParams][] = PRESETS.map((p) => [p.id, presetParams(p.id)] as [string, BoxParams]);
cases.push(
  ["min-size", { ...DEFAULT_PARAMS, length: 20, width: 15, height: 6, cornerRadius: 0, text: "" }],
  ["max-bed-256", { ...DEFAULT_PARAMS, length: 230, width: 60, height: 80, text: "BIG", bedSize: 256 }],
  ["long-text", { ...DEFAULT_PARAMS, text: "THE QUICK BROWN FOX JUMPS", textSize: 30 }],
  ["two-lines-across", { ...DEFAULT_PARAMS, text: "MUM\n2026", textDirection: "across", relief: "inlay" }],
  ["unicode", { ...DEFAULT_PARAMS, text: "Zoë & Łukasz ♥", relief: "engraved" }],
  ["dividers-7x3", { ...DEFAULT_PARAMS, length: 180, width: 90, dividerCols: 7, dividerRows: 3 }],
  ["ridge-grip-square", { ...DEFAULT_PARAMS, cornerRadius: 0, lidGrip: "ridge", text: "RIDGE" }],
  ["outer-sizing", { ...DEFAULT_PARAMS, sizeMode: "outer", length: 80, width: 50, height: 30, text: "OUT" }],
  ["thin-wall-rail-cap", { ...DEFAULT_PARAMS, wall: 1.2, railDepth: 1.5, text: "" }],
);

let failed = false;
for (const [name, params] of cases) {
  const r = generate(params, null);
  const errors = r.issues.filter((i) => i.severity === "error").map((i) => i.message);
  const bad = r.meshReports.filter((m) => !m.ok);
  const ok = errors.length === 0 && bad.length === 0 && r.exportable;
  if (!ok) failed = true;
  const colours = new Set(r.parts.map((p) => p.hex)).size;
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(20)} ${r.parts.length} parts, ${colours} colours, ${r.meshReports.reduce((n, m) => n + m.triangles, 0)} tris, ${r.elapsedMs} ms${errors.length ? "  " + errors.join(" | ") : ""}`);
  if (ok) {
    const bytes = export3MF(r, params, name);
    writeFileSync(`out/${name}.3mf`, bytes);
    const files = unzipSync(bytes);
    const model = strFromU8(files["3D/3dmodel.model"]);
    if (!model.includes('unit="millimeter"') || (model.match(/<mesh>/g) ?? []).length !== r.parts.length) { console.log("     3MF structure mismatch"); failed = true; }
  }
}
const cal = generate(DEFAULT_PARAMS, null, "calibration");
const calOk = cal.exportable && cal.meshReports.every((m) => m.ok);
console.log(`${calOk ? "ok  " : "FAIL"} calibration set      ${cal.parts.map((p) => p.name).join(", ")}`);
if (calOk) writeFileSync("out/calibration.3mf", export3MF(cal, DEFAULT_PARAMS, "calibration"));
if (!calOk) failed = true;
console.log(failed ? "\nSome cases FAILED." : "\nAll cases passed. 3MF files are in out/.");
process.exit(failed ? 1 : 0);
