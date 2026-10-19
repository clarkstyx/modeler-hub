import { DEFAULT_PARAMS, FONT_LABELS, LIGHT_LABELS, LIMITS, type StadiumParams } from "./params";

const CHOICES: Partial<Record<keyof StadiumParams, string[]>> = {
  font: Object.keys(FONT_LABELS),
  lights: Object.keys(LIGHT_LABELS),
};
const HEX = /^#[0-9a-f]{6}$/i;

export interface Recipe {
  app: "stadium-container";
  version: 1;
  params: StadiumParams;
}

export function toRecipe(params: StadiumParams): Recipe {
  return { app: "stadium-container", version: 1, params };
}

/** Tolerant loader: unknown keys dropped, missing ones defaulted, numbers clamped, bad colours and choices ignored. */
export function parseRecipe(json: string | object): StadiumParams {
  const raw = typeof json === "string" ? JSON.parse(json) : json;
  if (!raw || typeof raw !== "object") throw new Error("Not a stadium settings file.");
  const r = raw as { params?: Record<string, unknown> };
  const src = (r.params && typeof r.params === "object" ? r.params : raw) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...DEFAULT_PARAMS };
  for (const key of Object.keys(DEFAULT_PARAMS) as (keyof StadiumParams)[]) {
    const v = src[key];
    const def = DEFAULT_PARAMS[key];
    if (v === undefined || v === null) continue;
    if (typeof def === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      const lim = (LIMITS as Record<string, { min: number; max: number } | undefined>)[key];
      out[key] = lim ? Math.min(lim.max, Math.max(lim.min, n)) : n;
    } else if (typeof def === "string" && typeof v === "string") {
      if (key.startsWith("color")) { if (HEX.test(v)) out[key] = v.toUpperCase(); }
      else if (!CHOICES[key] || CHOICES[key]!.includes(v)) out[key] = v;
    }
  }
  return out as unknown as StadiumParams;
}
