import { describe, expect, it } from "vitest";
import { rasterToArtwork, signedArea, traceLabel, type Bitmap } from "../src/image/raster";
import type { Ring } from "../src/core/types";

/** Paints a bitmap from a function returning an RGBA colour per pixel. */
function paint(W: number, H: number, f: (x: number, y: number) => [number, number, number, number]): Bitmap {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) data.set(f(x, y), (y * W + x) * 4);
  return { width: W, height: H, data };
}
const ringArea = (rings: Ring[]) => rings.reduce((a, r) => a + signedArea(r), 0);

describe("bitmap logos", () => {
  it("a crest on a transparent background keeps its three colours, biggest first, with the ring as a ring", () => {
    const W = 120;
    const img = paint(W, W, (x, y) => {
      const r = Math.hypot(x - 60 + 0.5, y - 60 + 0.5);
      if (r > 56) return [0, 0, 0, 0];
      if (r > 36) return [197, 59, 50, 255];
      if (r > 14) return [241, 230, 206, 255];
      return [34, 59, 107, 255];
    });
    const art = rasterToArtwork(img, "crest.png", { maxColours: 4 });
    expect(art.layers.map((l) => l.hex)).toEqual(["#C43C34", "#F4E4CC", "#243C6C"]);
    // the red ring is one outer ring plus one hole; the net area is the annulus
    const red = art.layers[0].rings;
    expect(red.length).toBe(2);
    expect(Math.abs(ringArea(red))).toBeCloseTo(Math.PI * (56 * 56 - 36 * 36), -2);
    expect(Math.sign(signedArea(red[0]))).not.toBe(Math.sign(signedArea(red[1])));
    expect(art.bounds.maxX - art.bounds.minX).toBeCloseTo(112, 0);
  });

  it("a white JPG background is removed by flood fill; a white part of the logo inside survives", () => {
    const W = 100;
    const img = paint(W, W, (x, y) => {
      const inSquare = x >= 20 && x < 80 && y >= 20 && y < 80;
      const inner = x >= 40 && x < 60 && y >= 40 && y < 60;
      if (!inSquare) return [255, 255, 255, 255];
      return inner ? [255, 255, 255, 255] : [20, 20, 20, 255];
    });
    const art = rasterToArtwork(img, "box.jpg");
    expect(art.layers.length).toBe(2);
    expect(art.layers.map((l) => l.hex).sort()).toEqual(["#141414", "#FCFCFC"]);
    const white = art.layers.find((l) => l.hex === "#FCFCFC")!;
    // the majority filter rounds the four corners by a pixel
    expect(Math.abs(ringArea(white.rings))).toBeGreaterThanOrEqual(392);
    expect(Math.abs(ringArea(white.rings))).toBeLessThanOrEqual(400);
  });

  it("four frame-filling columns all survive (no column mistaken for background)", () => {
    const cols: [number, number, number, number][] = [[0, 0, 0, 255], [255, 255, 255, 255], [128, 128, 128, 255], [0, 160, 0, 255]];
    const img = paint(80, 40, (x) => cols[Math.floor(x / 20)]);
    const art = rasterToArtwork(img, "columns.png", { maxColours: 4 });
    expect(art.layers.length).toBe(4);
    for (const l of art.layers) expect(Math.abs(ringArea(l.rings))).toBe(800);
  });

  it("anti-aliased edges do not become an extra colour", () => {
    const img = paint(60, 60, (x, y) => {
      const d = Math.hypot(x - 30 + 0.5, y - 30 + 0.5) - 20;
      if (d > 1) return [255, 255, 255, 255];
      if (d < 0) return [200, 30, 30, 255];
      const t = d; // one-pixel blend ring
      return [Math.round(200 + 55 * t), Math.round(30 + 225 * t), Math.round(30 + 225 * t), 255];
    });
    const art = rasterToArtwork(img, "dot.png", { maxColours: 4 });
    expect(art.layers.length).toBe(1);
  });

  it("tracing: a square with a hole gives two rings of opposite turn; a diagonal pinch stays two shapes", () => {
    const W = 6, H = 6;
    const lab = new Int32Array(W * H).fill(-1);
    for (let y = 1; y < 5; y++) for (let x = 1; x < 5; x++) lab[y * W + x] = 0;
    lab[2 * W + 2] = -1; lab[2 * W + 3] = -1; lab[3 * W + 2] = -1; lab[3 * W + 3] = -1;
    const rings = traceLabel(lab, W, H, 0);
    expect(rings.length).toBe(2);
    expect(rings.map((r) => r.length)).toEqual([4, 4]);
    expect(Math.sign(signedArea(rings[0]))).not.toBe(Math.sign(signedArea(rings[1])));
    expect(Math.abs(ringArea(rings))).toBe(12);
    const pinch = new Int32Array(4 * 4).fill(-1);
    pinch[0 * 4 + 0] = 0; pinch[1 * 4 + 1] = 0;
    const two = traceLabel(pinch, 4, 4, 0);
    expect(two.length).toBe(2);
    expect(Math.abs(ringArea(two))).toBe(2);
  });
});
