import { BOX_LABELS, CHECK_LABELS, DEFAULT_PARAMS, FONT_LABELS, HOLE_LABELS, LAYOUT_LABELS, LIMITS, type TagParams } from "./params";

export interface Recipe {
  app: "checklist-tag";
  version: 1;
  params: TagParams;
}

export function toRecipe(params: TagParams): Recipe {
  return { app: "checklist-tag", version: 1, params };
}

/** Tolerant loader: unknown keys dropped, missing ones defaulted, numbers clamped, choices checked. */
export function parseRecipe(json: string | object): TagParams {
  const raw = typeof json === "string" ? JSON.parse(json) : json;
  if (!raw || typeof raw !== "object") throw new Error("Not a checklist tag settings file.");
  const r = raw as { params?: Record<string, unknown> };
  const src = (r.params && typeof r.params === "object" ? r.params : raw) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...DEFAULT_PARAMS };
  for (const key of Object.keys(DEFAULT_PARAMS) as (keyof TagParams)[]) {
    const v = src[key];
    const def = DEFAULT_PARAMS[key];
    if (v === undefined || v === null) continue;
    if (typeof def === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      const lim = (LIMITS as Record<string, { min: number; max: number } | undefined>)[key];
      out[key] = lim ? Math.min(lim.max, Math.max(lim.min, n)) : n;
    } else if (typeof def === "string" && typeof v === "string") out[key] = v.slice(0, 2000);
  }
  const choices: [keyof TagParams, object][] = [["holePosition", HOLE_LABELS], ["checkStyle", CHECK_LABELS], ["boxStyle", BOX_LABELS], ["optionsLayout", LAYOUT_LABELS], ["font", FONT_LABELS]];
  for (const [key, labels] of choices) if (!((out[key] as string) in labels)) out[key] = DEFAULT_PARAMS[key];
  return out as unknown as TagParams;
}
