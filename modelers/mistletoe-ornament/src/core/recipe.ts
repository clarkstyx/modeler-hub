import { DEFAULT_PARAMS, FONT_LABELS, LIMITS, MAX_NAME_LENGTH, TEXT_STYLE_LABELS, type OrnamentParams } from "./params";

const CHOICES: Partial<Record<keyof OrnamentParams, string[]>> = {
  font: Object.keys(FONT_LABELS),
  textStyle: Object.keys(TEXT_STYLE_LABELS),
};

export interface Recipe {
  app: "mistletoe-ornament";
  version: 1;
  params: OrnamentParams;
}

export function toRecipe(params: OrnamentParams): Recipe {
  return { app: "mistletoe-ornament", version: 1, params };
}

/** Tolerant loader: unknown keys dropped, missing ones defaulted, numbers clamped. */
export function parseRecipe(json: string | object): OrnamentParams {
  const raw = typeof json === "string" ? JSON.parse(json) : json;
  if (!raw || typeof raw !== "object") throw new Error("Not a mistletoe ornament settings file.");
  const r = raw as { params?: Record<string, unknown> };
  const src = (r.params && typeof r.params === "object" ? r.params : raw) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...DEFAULT_PARAMS };
  for (const key of Object.keys(DEFAULT_PARAMS) as (keyof OrnamentParams)[]) {
    const v = src[key];
    const def = DEFAULT_PARAMS[key];
    if (v === undefined || v === null) continue;
    if (typeof def === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      const lim = (LIMITS as Record<string, { min: number; max: number } | undefined>)[key];
      out[key] = lim ? Math.min(lim.max, Math.max(lim.min, n)) : n;
    } else if (typeof def === "boolean") out[key] = Boolean(v);
    else if (typeof def === "string" && typeof v === "string") {
      if (key === "name") out[key] = v.slice(0, MAX_NAME_LENGTH);
      else if (key.endsWith("Color")) { if (/^#[0-9a-fA-F]{6}$/.test(v)) out[key] = v.toUpperCase(); }
      else if (!CHOICES[key] || CHOICES[key]!.includes(v)) out[key] = v;
    }
  }
  return out as unknown as OrnamentParams;
}
