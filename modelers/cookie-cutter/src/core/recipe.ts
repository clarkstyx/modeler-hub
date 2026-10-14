import { DEFAULT_PARAMS, FONT_LABELS, LIMITS, SHAPE_LABELS, SOURCE_LABELS, type CutterParams } from "./params";

const CHOICES: Partial<Record<keyof CutterParams, string[]>> = {
  source: Object.keys(SOURCE_LABELS),
  shape: Object.keys(SHAPE_LABELS),
  font: Object.keys(FONT_LABELS),
};

export interface Recipe {
  app: "cookie-cutter";
  version: 1;
  params: CutterParams;
}

export function toRecipe(params: CutterParams): Recipe {
  return { app: "cookie-cutter", version: 1, params };
}

/** Tolerant loader: unknown keys dropped, missing ones defaulted, numbers clamped. */
export function parseRecipe(json: string | object): CutterParams {
  const raw = typeof json === "string" ? JSON.parse(json) : json;
  if (!raw || typeof raw !== "object") throw new Error("Not a cookie cutter settings file.");
  const r = raw as { params?: Record<string, unknown> };
  const src = (r.params && typeof r.params === "object" ? r.params : raw) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...DEFAULT_PARAMS };
  for (const key of Object.keys(DEFAULT_PARAMS) as (keyof CutterParams)[]) {
    const v = src[key];
    const def = DEFAULT_PARAMS[key];
    if (v === undefined || v === null) continue;
    if (typeof def === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      const lim = (LIMITS as Record<string, { min: number; max: number } | undefined>)[key];
      out[key] = lim ? Math.min(lim.max, Math.max(lim.min, n)) : n;
    } else if (typeof def === "string" && typeof v === "string" && (!CHOICES[key] || CHOICES[key]!.includes(v))) out[key] = v;
  }
  return out as unknown as CutterParams;
}
