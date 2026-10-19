/**
 * Export validation: small, default and large stadiums, every floodlight
 * mode, odd and many-sided buildings, long text and an emblem are built
 * headlessly; every mesh must be watertight with consistent winding and
 * positive volume, the structure one piece and no colour volume overlapping
 * another. Writes out/*.3mf for a look in the slicer.
 *
 *   npm run validate
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { initKernel, withArena } from "../src/shared/kernel";
import { DEFAULT_PARAMS, type StadiumParams } from "../src/core/params";
import { generate, group3MF, stadiumZip } from "../src/pipeline/generate";
import { buildStadium, largestOverlap } from "../src/geometry/buildStadium";
import type { Artwork } from "../src/core/types";

await initKernel();
mkdirSync("out", { recursive: true });
const P = (patch: Partial<StadiumParams>): StadiumParams => ({ ...DEFAULT_PARAMS, ...patch });
const emblem: Artwork = {
  name: "crest.svg",
  layers: [
    { hex: "#C53B32", rings: [[[0, 0], [100, 0], [100, 100], [0, 100]], [[30, 30], [30, 70], [70, 70], [70, 30]]] },
    { hex: "#223B6B", rings: [[[40, 40], [60, 40], [60, 60], [40, 60]]] },
  ],
  bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
};

const cases: [string, StadiumParams, Artwork | null][] = [
  ["default", P({}), null],
  ["small-tealight", P({ innerDiameter: 40, depth: 12, rows: 2, sections: 6, wallHeight: 20, lightHeight: 30, text: "CUP" }), null],
  ["large-softball", P({ innerDiameter: 120, depth: 50, rows: 8, sections: 12, wallHeight: 80, baseMargin: 12, bedSize: 350 }), null],
  ["attached-lights", P({ lights: "attached" }), null],
  ["no-lights", P({ lights: "none", baseMargin: 3 }), null],
  ["five-sections", P({ sections: 5, rows: 3 }), null],
  ["sixteen-sections", P({ sections: 16, rowRise: 1.2, rowTread: 2, aisleWidth: 1 }), null],
  ["regular-octagon", P({ cornerSize: 1, rows: 6, rowTread: 4 }), null],
  ["square-corners", P({ cornerSize: 0.3, frontApron: 0 }), null],
  ["thin-wall-no-lights", P({ wallThickness: 2, lights: "none" }), null],
  ["tall-wall", P({ wallHeight: 90, lightHeight: 120 }), null],
  ["thick-walls", P({ wall: 4, wallThickness: 4, floor: 5, baseThickness: 5 }), null],
  ["long-text", P({ text: "THE GRAND OLD BALLPARK" }), null],
  ["serif-emblem", P({ text: "HOME", font: "serif" }), emblem],
  ["emblem-only", P({ text: "", emblemHeight: 12 }), emblem],
  ["nozzle-0.6", P({ nozzle: 0.6, layerHeight: 0.3 }), null],
  ["two-colours", P({ colorFacade: "#8E9094", colorSign: "#C53B32" }), null],
];

let failed = false;
for (const [name, p, art] of cases) {
  const r = generate(p, art);
  const errors = r.issues.filter((i) => i.severity === "error").map((i) => i.message);
  let overlap = { volume: 0, pair: "" }, pieces = 1;
  if (!errors.length) withArena(() => { const b = buildStadium(p, art); overlap = largestOverlap(b.stadiumSolids); pieces = b.bodyPieces; });
  const ok = errors.length === 0 && r.meshesFailed === 0 && r.exportable && overlap.volume < 0.01 && pieces === 1;
  if (!ok) failed = true;
  const warnings = r.issues.filter((i) => i.severity === "warning").length;
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(18)} ${String(r.meshesChecked).padStart(2)} meshes, ${warnings} warning(s), ${String(r.elapsedMs).padStart(4)} ms, ${r.readout ? `${r.readout.footprint.toFixed(0)} × ${r.readout.height.toFixed(0)} mm, letters ${r.readout.capHeight.toFixed(1)} mm` : ""}${overlap.volume >= 0.01 ? `  OVERLAP ${overlap.volume.toFixed(3)} mm³ ${overlap.pair}` : ""}${pieces !== 1 ? `  ${pieces} PIECES` : ""}${errors.length ? "  " + errors.slice(0, 3).join(" | ") : ""}`);
  if (!ok) continue;
  writeFileSync(`out/${name}.3mf`, group3MF(r, "stadium", p, name));
  if (name === "default") writeFileSync(`out/${name}.zip`, stadiumZip(r, p, name));
}
console.log(failed ? "\nSome cases FAILED." : "\nAll cases passed. 3MF files are in out/.");
process.exit(failed ? 1 : 0);
