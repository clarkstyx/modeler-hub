import { initKernel } from "../src/shared/kernel";
import { DEFAULT_PARAMS, type LabelParams } from "../src/core/params";
import { parseList } from "../src/core/batch";
import { generate, type GenerateResult } from "../src/pipeline/generate";
import type { Artwork } from "../src/core/types";

export const ready = () => initKernel().then(() => undefined);
export const params = (patch: Partial<LabelParams> = {}): LabelParams => ({ ...DEFAULT_PARAMS, ...patch });
export function build(list: string, patch: Partial<LabelParams> = {}, art: Artwork | null = null): GenerateResult {
  const p = params(patch);
  return generate(p, parseList(list, p.icon).specs, art);
}
export const errorsOf = (r: GenerateResult) => r.issues.filter((i) => i.severity === "error").map((i) => i.message);

/** A one-colour square-with-hole logo in SVG units (y down). */
export function logoArt(): Artwork {
  return {
    name: "logo",
    layers: [{ hex: "#FF0000", rings: [[[0, 0], [100, 0], [100, 100], [0, 100]], [[30, 30], [30, 70], [70, 70], [70, 30]]] }],
    bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
  };
}
