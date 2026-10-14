import { DEFAULT_PARAMS, LIMITS, type LabelParams } from "./params";

export interface Recipe {
  app: "gridfinity-labels";
  version: 1;
  params: LabelParams;
  /** The batch list as typed (or produced from a CSV). */
  list: string;
}

export function toRecipe(params: LabelParams, list: string): Recipe {
  return { app: "gridfinity-labels", version: 1, params, list };
}

/** Tolerant loader: unknown keys dropped, missing ones defaulted, numbers clamped. */
export function parseRecipe(json: string | object): { params: LabelParams; list: string } {
  const raw = typeof json === "string" ? JSON.parse(json) : json;
  if (!raw || typeof raw !== "object") throw new Error("Not a label settings file.");
  const r = raw as { params?: Record<string, unknown>; list?: unknown };
  const src = (r.params && typeof r.params === "object" ? r.params : raw) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...DEFAULT_PARAMS };
  for (const key of Object.keys(DEFAULT_PARAMS) as (keyof LabelParams)[]) {
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
  return { params: out as unknown as LabelParams, list: typeof r.list === "string" ? r.list : "" };
}
