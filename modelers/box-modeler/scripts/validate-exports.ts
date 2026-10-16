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
import { batchZip, export3MF, generate, generateBatch } from "../src/pipeline/generate";
import { parseNames } from "../src/core/batch";

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
  ["rack-single-no-vents", { ...presetParams("rack-4x4x6"), rackCols: 1, rackRows: 1, ventHole: 0 }],
  ["rack-small-4x3", { ...presetParams("rack-4x4x6"), encWidth: 50, encDepth: 50, encHeight: 60, rackCols: 4, rackRows: 3 }],
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
const rackCal = generate(presetParams("rack-4x4x6"), null, "calibration");
const rackCalOk = rackCal.exportable && rackCal.meshReports.every((m) => m.ok);
console.log(`${rackCalOk ? "ok  " : "FAIL"} key fit test         ${rackCal.parts.map((p) => p.name).join(", ")}`);
if (rackCalOk) writeFileSync("out/key-fit-test.3mf", export3MF(rackCal, presetParams("rack-4x4x6"), "key-fit-test"));
else failed = true;
const names = parseNames(Array.from({ length: 24 }, (_, i) => `NAME ${i + 1}`).join("\n") + "\nZoë & Łukasz\nHappy\\nBirthday").items;
for (const [name, what, p] of [
  ["batch-lids-26", "lids", presetParams("gift-tin")],
  ["batch-sets-26-engraved", "sets", { ...presetParams("gift-tin"), relief: "engraved" }],
  ["batch-lids-inlay-180bed", "lids", { ...presetParams("gift-tin"), relief: "inlay", bedSize: 180 }],
] as [string, "lids" | "sets", BoxParams][]) {
  const r = generateBatch(p, names, null, what);
  const errors = r.issues.filter((i) => i.severity === "error").map((i) => i.message);
  const ok = r.exportable && r.meshesFailed === 0 && errors.length === 0;
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(24)} ${r.itemCount} lids, ${r.plates.length} plate(s), ${r.meshesChecked} parts, ${r.elapsedMs} ms${errors.length ? "  " + errors.join(" | ") : ""}`);
  if (!ok) continue;
  const zipBytes = batchZip(r, p, name);
  const zip = unzipSync(zipBytes);
  const plates = Object.keys(zip).filter((f) => f.endsWith(".3mf"));
  const rows = strFromU8(zip["manifest.csv"]).trim().split("\n").length - 1;
  const objects = r.plates.reduce((n, pl) => n + pl.objects.length, 0);
  const items = plates.reduce((n, f) => n + (strFromU8(unzipSync(zip[f])["3D/3dmodel.model"]).match(/<item /g) ?? []).length, 0);
  if (plates.length !== r.plates.length || rows !== objects || items !== objects) { console.log(`     ZIP mismatch: ${plates.length} plates, ${rows} rows, ${items} items, ${objects} objects`); failed = true; }
  writeFileSync(`out/${name}.zip`, zipBytes);
}
console.log(failed ? "\nSome cases FAILED." : "\nAll cases passed. 3MF files are in out/.");
process.exit(failed ? 1 : 0);
