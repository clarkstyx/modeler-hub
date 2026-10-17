import { DEFAULT_PARAMS, LIMITS, PATTERN_LABELS, type BeadParams } from "./params";

export interface Recipe {
  app: "knot-bead";
  version: 1;
  params: BeadParams;
}

export function toRecipe(params: BeadParams): Recipe {
  return { app: "knot-bead", version: 1, params };
}

/** Tolerant loader: unknown keys dropped, missing ones defaulted, numbers clamped. */
export function parseRecipe(json: string | object): BeadParams {
  const raw = typeof json === "string" ? JSON.parse(json) : json;
  if (!raw || typeof raw !== "object") throw new Error("Not a knot bead settings file.");
  const r = raw as { params?: Record<string, unknown> };
  const src = (r.params && typeof r.params === "object" ? r.params : raw) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...DEFAULT_PARAMS };
  for (const key of Object.keys(DEFAULT_PARAMS) as (keyof BeadParams)[]) {
    const v = src[key];
    const def = DEFAULT_PARAMS[key];
    if (v === undefined || v === null) continue;
    if (typeof def === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      const lim = (LIMITS as Record<string, { min: number; max: number } | undefined>)[key];
      out[key] = lim ? Math.min(lim.max, Math.max(lim.min, n)) : n;
    } else if (typeof def === "string" && typeof v === "string") out[key] = v;
  }
  if (!(out.pattern as string in PATTERN_LABELS)) out.pattern = DEFAULT_PARAMS.pattern;
  return out as unknown as BeadParams;
}
