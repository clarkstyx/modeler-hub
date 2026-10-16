import { beforeAll, describe, expect, it } from "vitest";
import { errorsOf, params, ready } from "./helpers";
import { DOVETAIL, STOP, deriveRack } from "../src/core/params";
import { PRESETS, presetParams } from "../src/core/presets";
import { parseRecipe, toRecipe } from "../src/core/recipe";
import { generate } from "../src/pipeline/generate";
import { buildCube, buildKey, buildTray, keyWidth } from "../src/geometry/buildRack";
import { track, withArena } from "../src/shared/kernel";
import { mIntersect, mTranslate } from "../src/shared/shapes";

beforeAll(ready);

const rack = (patch = {}) => params({ product: "rack", ...patch });
const bbox = (r: ReturnType<typeof generate>, name: string) => r.meshReports.find((m) => m.name === name)!.bbox;

/** Rotates a cube built in its print frame (lying on its back) into the world frame: y = D − pz, z = py. */
function cubeInWorld(p: ReturnType<typeof rack>) {
  const r = deriveRack(p);
  return { r, cube: mTranslate(track(buildCube(p, r).rotate([90, 0, 0])), 0, r.D, 0) };
}

describe("enclosure rack", () => {
  it("builds a watertight cube, tray and keys with no errors", () => {
    const r = generate(rack(), null);
    expect(errorsOf(r)).toEqual([]);
    expect(r.exportable).toBe(true);
    expect(r.parts.map((p) => p.name)).toEqual(["CUBE", "TRAY", "KEYS"]);
    for (const m of r.meshReports) expect(m.ok, m.name).toBe(true);
  });

  it("sizes the cube around a 4 × 4 × 6 inch enclosure with half-inch gaps", () => {
    const p = rack();
    const d = deriveRack(p);
    expect(d.innerW).toBeCloseTo(101.6 + 2 * 12.7);
    expect(d.innerH).toBeCloseTo(p.trayHeight - p.trayPocket + 152.4 + 12.7);
    const r = generate(p, null);
    const cube = bbox(r, "CUBE");
    // lies on its back: footprint W × H, printed D tall
    expect(cube.max[0] - cube.min[0]).toBeCloseTo(d.W, 3);
    expect(cube.max[1] - cube.min[1]).toBeCloseTo(d.H, 3);
    expect(cube.max[2] - cube.min[2]).toBeCloseTo(d.D, 3);
    expect(cube.min[2]).toBeCloseTo(0, 5);
    expect(Math.max(d.W, d.H, d.D)).toBeLessThanOrEqual(256);
  });

  it("needs 14 keys for the 3 × 2 rack in the picture", () => {
    expect(deriveRack(rack({ rackCols: 3, rackRows: 2 })).keysNeeded).toBe(14);
    const solo = generate(rack({ rackCols: 1, rackRows: 1 }), null);
    expect(solo.parts.map((p) => p.name)).toEqual(["CUBE", "TRAY"]);
  });

  it("the closed tray sits in the cube without touching it, the stop inside its channel", () => {
    withArena(() => {
      const p = rack();
      const { r, cube } = cubeInWorld(p);
      const tray = mTranslate(buildTray(r), r.wall + p.trayClearance, 0, r.wall);
      expect(mIntersect(cube, tray).volume()).toBeLessThan(1e-6);
    });
  });

  it("pulled out to its travel, the tray's channel end meets the stop's steep face", () => {
    withArena(() => {
      const p = rack();
      const { r, cube } = cubeInWorld(p);
      const at = (pull: number) => mTranslate(buildTray(r), r.wall + p.trayClearance, -pull, r.wall);
      expect(mIntersect(cube, at(r.travel - 0.2)).volume()).toBeLessThan(1e-6);
      // a little further and the tray would have to pass through the stop
      expect(mIntersect(cube, at(r.travel + 1)).volume()).toBeGreaterThan(0.5);
      // lifted over the stop it comes free
      const lifted = mTranslate(at(r.travel + 1), 0, 0, STOP.height + 0.1);
      expect(mIntersect(cube, lifted).volume()).toBeLessThan(1e-6);
    });
  });

  it("a key fills two facing grooves of neighbouring cubes without touching either", () => {
    withArena(() => {
      const p = rack();
      const r = deriveRack(p);
      const a = buildCube(p, r);
      const b = mTranslate(a, r.W, 0, 0); // right-hand neighbour, print frame
      // The key lies along x; turn it so its length runs along print z and its height spans the joint at x = W.
      const across = (kc: number) => {
        const e = DOVETAIL.depth - kc;
        return mTranslate(track(buildKey(r.keyLength, kc).rotate([0, -90, 0])), r.W + e, r.H * 0.25, 0.5);
      };
      const k = across(p.keyClearance);
      const bb = k.boundingBox();
      expect(bb.max[1] - bb.min[1]).toBeCloseTo(keyWidth(p.keyClearance), 3);
      expect(bb.max[0] - bb.min[0]).toBeCloseTo(2 * (DOVETAIL.depth - p.keyClearance), 3);
      expect(mIntersect(a, k).volume()).toBeLessThan(1e-6);
      expect(mIntersect(b, k).volume()).toBeLessThan(1e-6);
      // an oversized key would be clamped by the flanks
      const tight = across(-0.2);
      expect(mIntersect(a, tight).volume()).toBeGreaterThan(1);
    });
  });

  it("vent holes go through the back and can be switched off", () => {
    const vented = generate(rack(), null).parts[0].volume;
    const solid = generate(rack({ ventHole: 0 }), null).parts[0].volume;
    expect(solid).toBeGreaterThan(vented + 1000);
  });

  it("refuses a cube that does not fit the bed", () => {
    const r = generate(rack({ encWidth: 230, rackSideGap: 20 }), null);
    expect(r.exportable).toBe(false);
    expect(errorsOf(r).join(" ")).toMatch(/does not fit/);
  });

  it("key fit test builds two blocks and three labelled keys", () => {
    const r = generate(rack(), null, "calibration");
    expect(errorsOf(r)).toEqual([]);
    expect(r.parts.map((p) => p.name)).toEqual(["BLOCK_A", "BLOCK_B", "KEY_0.15", "KEY_0.20", "KEY_0.25"]);
    for (const m of r.meshReports) expect(m.ok, m.name).toBe(true);
  });

  it("every rack preset builds, and settings round-trip with the product", () => {
    for (const preset of PRESETS.filter((x) => x.params.product === "rack")) {
      const r = generate(presetParams(preset.id), null);
      expect(errorsOf(r), preset.id).toEqual([]);
    }
    const back = parseRecipe(JSON.stringify(toRecipe(rack({ encWidth: 158.75 }))));
    expect(back.product).toBe("rack");
    expect(back.encWidth).toBeCloseTo(158.75);
    expect(parseRecipe({ product: "spaceship" }).product).toBe("box");
  });
});
