import { initKernel } from "../src/geometry/kernel";
import { DEFAULT_PARAMS, type BoxParams } from "../src/core/params";
import { generate, type GenerateResult } from "../src/pipeline/generate";
import type { Artwork } from "../src/core/types";

export const ready = () => initKernel().then(() => undefined);
export const params = (patch: Partial<BoxParams> = {}): BoxParams => ({ ...DEFAULT_PARAMS, ...patch });
export const build = (patch: Partial<BoxParams> = {}, art: Artwork | null = null): GenerateResult => generate(params(patch), art);
export const errorsOf = (r: GenerateResult) => r.issues.filter((i) => i.severity === "error").map((i) => i.message);

/** A two-colour star-in-circle artwork in SVG-like units (y down). */
export function starArt(): Artwork {
  const circle: [number, number][] = [];
  for (let i = 0; i < 64; i++) circle.push([50 + 50 * Math.cos((i / 64) * 2 * Math.PI), 50 + 50 * Math.sin((i / 64) * 2 * Math.PI)]);
  const star: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 14 : 32;
    const a = -Math.PI / 2 + (i / 10) * 2 * Math.PI;
    star.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)]);
  }
  return { name: "star", layers: [{ hex: "#1E5AA8", rings: [circle] }, { hex: "#F2C14E", rings: [star] }], bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 } };
}
