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
import { DEFAULT_PARAMS, type TagParams } from "../src/core/params";
import { PRESETS, presetParams } from "../src/core/presets";
import { generate, plate3MF } from "../src/pipeline/generate";

await initKernel();
mkdirSync("out", { recursive: true });

const cases: [string, TagParams][] = PRESETS.map((p) => [p.id, presetParams(p.id)] as [string, TagParams]);
cases.push(
  ["outline-x-inline", { ...DEFAULT_PARAMS, boxStyle: "outline", checkStyle: "x", optionsLayout: "inline", checked: 2 }],
  ["three-options", { ...DEFAULT_PARAMS, options: "YES, NO, MAYBE", checked: 3, height: 90 }],
  ["no-hole-no-tick", { ...DEFAULT_PARAMS, holePosition: "none", checked: 0 }],
  ["hole-top-center", { ...DEFAULT_PARAMS, holePosition: "top-center" }],
  ["mini-35x50", { ...DEFAULT_PARAMS, width: 35, height: 50, boxSize: 6, labelSize: 4, textSize: 4, holeDiameter: 3.5, holeInset: 4.5, margin: 3 }],
  ["big-sign-150x200", { ...DEFAULT_PARAMS, width: 150, height: 200, textSize: 18, boxSize: 24, labelSize: 16, cornerRadius: 12, thickness: 3, relief: 1.2 }],
  ["no-question", { ...DEFAULT_PARAMS, question: "" }],
  ["batch-20-names", { ...DEFAULT_PARAMS, names: Array.from({ length: 20 }, (_, i) => `CHILD NUMBER ${i + 1}`).join("\n") }],
);

let failed = false;
for (const [name, params] of cases) {
  const r = generate(params);
  const errors = r.issues.filter((i) => i.severity === "error").map((i) => i.message);
  const ok = errors.length === 0 && r.exportable && r.meshReports.every((m) => m.ok);
  if (!ok) failed = true;
  const tags = r.plates.reduce((n, p) => n + p.tags.length, 0);
  const tris = r.meshReports.reduce((n, m) => n + m.triangles, 0);
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(18)} ${tags} tag(s) on ${r.plates.length} plate(s), parts ${r.tag.map((p) => p.name).join("+")}, letters ${r.layout.textCap.toFixed(1)} mm, ${tris} tris, ${r.elapsedMs} ms${errors.length ? "  " + errors.join(" | ") : ""}`);
  if (ok) {
    const bytes = plate3MF(r, 1, params, name);
    writeFileSync(`out/${name}.3mf`, bytes);
    const model = strFromU8(unzipSync(bytes)["3D/3dmodel.model"]);
    if ((model.match(/<mesh>/g) ?? []).length !== r.plates[0].parts.length) { console.log("     3MF structure mismatch"); failed = true; }
  }
}
console.log(failed ? "\nSome cases FAILED." : "\nAll cases passed. 3MF files are in out/.");
process.exit(failed ? 1 : 0);
