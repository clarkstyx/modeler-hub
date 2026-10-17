/**
 * Export validation: builds every preset plus edge cases headlessly, checks
 * the bead is watertight with consistent winding and positive volume, and
 * writes out/*.3mf for a look in the slicer.
 *
 *   npm run validate
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
import { initKernel } from "../src/shared/kernel";
import { DEFAULT_PARAMS, type BeadParams } from "../src/core/params";
import { PRESETS, presetParams } from "../src/core/presets";
import { generate, plate3MF } from "../src/pipeline/generate";

await initKernel();
mkdirSync("out", { recursive: true });

const cases: [string, BeadParams][] = PRESETS.map((p) => [p.id, presetParams(p.id)] as [string, BeadParams]);
cases.push(
  ["tiny-6mm", { ...DEFAULT_PARAMS, pattern: "coil", height: 8, diameter: 7, bore: 3, ridgeDepth: 0.5, pitch: 2, boreChamfer: 0.4, endFade: 0.6 }],
  ["big-30mm", { ...DEFAULT_PARAMS, pattern: "rope", height: 40, diameter: 30, bore: 12, ridgeDepth: 2.5, strands: 4, twist: 50 }],
  ["smooth", { ...DEFAULT_PARAMS, ridgeDepth: 0 }],
  ["six-strand-braid", { ...DEFAULT_PARAMS, pattern: "braid", strands: 6, twist: 30, diameter: 14 }],
  ["no-chamfer", { ...DEFAULT_PARAMS, boreChamfer: 0 }],
  ["200-beads-180bed", { ...DEFAULT_PARAMS, count: 200, bedSize: 180 }],
);

let failed = false;
for (const [name, params] of cases) {
  const r = generate(params);
  const errors = r.issues.filter((i) => i.severity === "error").map((i) => i.message);
  const ok = errors.length === 0 && r.exportable && !!r.meshReport?.ok;
  if (!ok) failed = true;
  const beads = r.plates.reduce((n, p) => n + p.beads.length, 0);
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(18)} ${beads} beads on ${r.plates.length} plate(s), ${r.meshReport?.triangles ?? 0} tris each, overhang ${r.derived.overhangDeg.toFixed(0)}°, ${r.elapsedMs} ms${errors.length ? "  " + errors.join(" | ") : ""}`);
  if (ok) {
    const bytes = plate3MF(r, 1, params, name);
    writeFileSync(`out/${name}.3mf`, bytes);
    const model = strFromU8(unzipSync(bytes)["3D/3dmodel.model"]);
    if ((model.match(/<mesh>/g) ?? []).length !== r.plates[0].parts.length) { console.log("     3MF structure mismatch"); failed = true; }
  }
}
console.log(failed ? "\nSome cases FAILED." : "\nAll cases passed. 3MF files are in out/.");
process.exit(failed ? 1 : 0);
