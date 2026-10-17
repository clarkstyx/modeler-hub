import { DEFAULT_PARAMS, type SkirtParams } from "./params";

export interface Preset {
  id: string;
  label: string;
  description: string;
  params: Partial<SkirtParams>;
}

export const PRESETS: Preset[] = [
  {
    id: "pictured",
    label: "As pictured",
    description: "70 mm, shirred elastic waistband, three silk ribbons on black",
    params: {
      height: 66, bottomDiameter: 70, topDiameter: 24, flare: 1, fullness: 0.75, pleats: 12, pleatDepth: 4, pleatReach: 3.5, wall: 1.6,
      waistHeight: 8, waistRibs: 28, waistRibDepth: 1.1, waistBulge: 0.6, waistRows: 2, waistPinch: 0.3, waistRecess: 2.5, ceiling: "flat",
      loopDiameter: 14, loopHole: 6.5, loopThickness: 4.5,
      baseColor: "#151515", ribbons: "#FF6A2A,#A51EF0,#1C7CF0", hemHeight: 2.5, ribbonWidth: 8.5, ribbonGap: 2.5,
    },
  },
  {
    id: "classic",
    label: "Ribbon skirt ornament",
    description: "70 mm, 12 pleats, three ribbons on black",
    params: {},
  },
  {
    id: "mini",
    label: "Mini ornament",
    description: "45 mm for a tree or a rear-view mirror, two ribbons",
    params: {
      height: 46, bottomDiameter: 45, topDiameter: 17, pleats: 10, pleatDepth: 2.2, wall: 1.2, waistHeight: 8,
      waistRibs: 20, waistRibDepth: 0.6, loopDiameter: 11, loopHole: 5, loopThickness: 3.5,
      ribbons: "#E8352F,#2F6FD6", hemHeight: 2, ribbonWidth: 6, ribbonGap: 2,
    },
  },
  {
    id: "long",
    label: "Long skirt, five ribbons",
    description: "95 mm tall, 14 pleats, five ribbons in three colours (fits one AMS)",
    params: {
      height: 95, bottomDiameter: 80, topDiameter: 26, flare: 1.35, pleats: 14, pleatDepth: 3.8, pleatReach: 2.4,
      ribbons: "#E8352F,#F4E04D,#2F6FD6,#F4E04D,#E8352F", hemHeight: 3, ribbonWidth: 7, ribbonGap: 2.4,
    },
  },
];

export function presetParams(id: string): SkirtParams {
  const p = PRESETS.find((x) => x.id === id);
  return { ...DEFAULT_PARAMS, ...(p?.params ?? {}) };
}
