import { DEFAULT_PARAMS, type BeadParams } from "./params";

export interface Preset {
  id: string;
  label: string;
  description: string;
  params: Partial<BeadParams>;
}

export const PRESETS: Preset[] = [
  {
    id: "snake",
    label: "Snake knot",
    description: "A chain of knot links, 18 mm, single cord",
    params: { pattern: "snake", height: 18, diameter: 12, bore: 5.5, ridgeDepth: 1.3, pitch: 5 },
  },
  {
    id: "coil",
    label: "Coil wrap",
    description: "Wrapped-cord look like the photo, 16 mm",
    params: { pattern: "coil", height: 16, diameter: 12, bore: 5.5, ridgeDepth: 0.9, pitch: 3.4 },
  },
  {
    id: "rope",
    label: "Twisted rope",
    description: "Five strands twisted, 18 mm",
    params: { pattern: "rope", height: 18, diameter: 12, bore: 5.5, ridgeDepth: 1.6, strands: 5, twist: 22 },
  },
  {
    id: "braid",
    label: "Round braid",
    description: "Woven look, four strands, 18 mm",
    params: { pattern: "braid", height: 18, diameter: 13, bore: 5.5, ridgeDepth: 1.8, strands: 4, twist: 18 },
  },
  {
    id: "double",
    label: "Snake knot, two strands",
    description: "8.5 mm bore for a doubled cord, 14 mm wide",
    params: { pattern: "snake", height: 18, diameter: 14.5, bore: 8.5, ridgeDepth: 1.3, pitch: 5, boreChamfer: 0.6 },
  },
];

export function presetParams(id: string): BeadParams {
  const p = PRESETS.find((x) => x.id === id);
  return { ...DEFAULT_PARAMS, ...(p?.params ?? {}) };
}
