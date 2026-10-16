import { DEFAULT_PARAMS, LIMITS, type BoxParams } from "./params";

export const RECIPE_VERSION = 1;

export interface Recipe {
  app: "box-modeler";
  version: number;
  params: BoxParams;
}

export function toRecipe(params: BoxParams): Recipe {
  return { app: "box-modeler", version: RECIPE_VERSION, params };
}

/**
 * Tolerant loader: unknown keys are dropped, missing ones take the default,
 * numbers are clamped to their limits. Old files stay loadable.
 */
export function parseRecipe(json: string | object): BoxParams {
  const raw = typeof json === "string" ? JSON.parse(json) : json;
  const src = (raw && typeof raw === "object" && "params" in raw ? (raw as { params: unknown }).params : raw) as Record<string, unknown>;
  if (!src || typeof src !== "object") throw new Error("Not a box-modeler settings file.");
  const out: Record<string, unknown> = { ...DEFAULT_PARAMS };
  for (const key of Object.keys(DEFAULT_PARAMS) as (keyof BoxParams)[]) {
    const v = src[key];
    const def = DEFAULT_PARAMS[key];
    if (v === undefined || v === null) continue;
    if (typeof def === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      const lim = (LIMITS as Record<string, { min: number; max: number } | undefined>)[key];
      out[key] = lim ? Math.min(lim.max, Math.max(lim.min, n)) : n;
    } else if (typeof def === "string" && typeof v === "string") {
      out[key] = v;
    }
  }
  if (out.product !== "box" && out.product !== "rack") out.product = DEFAULT_PARAMS.product;
  if (out.rackUnits !== "mm" && out.rackUnits !== "in") out.rackUnits = DEFAULT_PARAMS.rackUnits;
  return out as unknown as BoxParams;
}
