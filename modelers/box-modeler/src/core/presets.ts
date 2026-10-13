import { DEFAULT_PARAMS, type BoxParams } from "./params";

export interface Preset {
  id: string;
  label: string;
  description: string;
  params: Partial<BoxParams>;
}

/**
 * Presets are the "product catalogue": one engine, many boxes. Inside sizes are
 * chosen for what people actually put in them.
 */
export const PRESETS: Preset[] = [
  {
    id: "gift-tin",
    label: "Gift tin",
    description: "100 × 65 × 25 mm inside, rounded corners, name on the lid",
    params: { sizeMode: "inner", length: 100, width: 65, height: 25, cornerRadius: 8, text: "FOR YOU", textSize: 10 },
  },
  {
    id: "jewellery-box",
    label: "Jewellery box",
    description: "Ring and earring box with a 2 × 3 compartment insert",
    params: {
      sizeMode: "inner", length: 84, width: 56, height: 22, cornerRadius: 5, wall: 1.8, railDepth: 0.8,
      dividerCols: 3, dividerRows: 2, dividerThickness: 1.2, dividerHeightPct: 0.85,
      text: "", bodyColor: "#6B3E6E", lidColor: "#F4F1EC", textColor: "#6B3E6E",
    },
  },
  {
    id: "business-card",
    label: "Business card box",
    description: "Holds a stack of 89 × 51 mm cards with room to pinch them out",
    params: { sizeMode: "inner", length: 93, width: 55, height: 14, cornerRadius: 4, text: "CARDS", textSize: 8 },
  },
  {
    id: "storage-box",
    label: "Storage box",
    description: "150 × 100 × 40 mm sorting box with 3 × 2 compartments",
    params: {
      sizeMode: "inner", length: 150, width: 100, height: 40, cornerRadius: 4, wall: 1.8, base: 1.8,
      lidThickness: 2.2, dividerCols: 3, dividerRows: 2, text: "", bodyColor: "#2B2B2B", lidColor: "#2B2B2B",
    },
  },
  {
    id: "personalised-gift",
    label: "Personalised gift box",
    description: "120 × 80 × 35 mm, two-colour raised name, thumb notch",
    params: {
      sizeMode: "inner", length: 120, width: 80, height: 35, cornerRadius: 10, text: "CLAIRE", textSize: 14,
      relief: "raised", bodyColor: "#C2457F", lidColor: "#F4F1EC", textColor: "#C2457F",
    },
  },
  {
    id: "pencil-box",
    label: "Pencil box",
    description: "Long and low for pencils and brushes, label engraved",
    params: { sizeMode: "inner", length: 190, width: 50, height: 22, cornerRadius: 5, text: "PENCILS", textSize: 9, relief: "engraved" },
  },
  {
    id: "pill-box",
    label: "Pill box (7 days)",
    description: "Seven compartments in a row",
    params: {
      sizeMode: "inner", length: 119, width: 30, height: 16, cornerRadius: 3, wall: 1.6, railDepth: 0.8,
      dividerCols: 7, dividerRows: 1, dividerThickness: 1, dividerHeightPct: 0.95, text: "MON  TUE  WED  THU  FRI  SAT  SUN",
      textSize: 4.5, relief: "engraved", decoMargin: 3,
    },
  },
  {
    id: "treat-tin",
    label: "Pet treat tin",
    description: "A chunky tin for treats, inlaid name so it stays smooth",
    params: { sizeMode: "inner", length: 90, width: 90, height: 45, cornerRadius: 14, text: "LUNA", textSize: 16, relief: "inlay" },
  },
];

export function presetParams(id: string): BoxParams {
  const p = PRESETS.find((x) => x.id === id);
  return { ...DEFAULT_PARAMS, ...(p?.params ?? {}) };
}
