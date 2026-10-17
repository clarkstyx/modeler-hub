import { DEFAULT_PARAMS, type TagParams } from "./params";

export type Season = "christmas" | "halloween" | "valentines" | "easter";

export interface Preset {
  id: string;
  season: Season;
  label: string;
  description: string;
  params: Partial<TagParams>;
}

export const SEASON_LABELS: Record<Season, string> = {
  christmas: "Christmas",
  halloween: "Halloween",
  valentines: "Valentine's",
  easter: "Easter",
};

export const PRESETS: Preset[] = [
  {
    id: "nice",
    season: "christmas",
    label: "Nice list",
    description: "Red tag, white boxes, green tick (like the photo)",
    params: {},
  },
  {
    id: "naughty",
    season: "christmas",
    label: "Naughty list",
    description: "Green tag, red boxes, white tick (like the photo)",
    params: { question: "IS {name} ON THE NAUGHTY LIST?", name: "KOHEN", baseColor: "#1E7B3C", textColor: "#FFFFFF", boxColor: "#C8102E", checkColor: "#FFFFFF" },
  },
  {
    id: "halloween",
    season: "halloween",
    label: "Trick or treat",
    description: "Orange tag, black text, purple tick",
    params: { question: "{name}: TRICK OR TREAT?", name: "KINSLEY", options: "TRICK, TREAT", checked: 2, baseColor: "#F07F13", textColor: "#1A1A1A", boxColor: "#1A1A1A", checkColor: "#7B2D8E" },
  },
  {
    id: "valentine",
    season: "valentines",
    label: "Be my Valentine",
    description: "Pink tag, white boxes, red heart",
    params: { question: "{name}, WILL YOU BE MY VALENTINE?", name: "KINSLEY", checkStyle: "heart", baseColor: "#F28BB6", textColor: "#FFFFFF", boxColor: "#FFFFFF", checkColor: "#C8102E" },
  },
  {
    id: "easter",
    season: "easter",
    label: "Good bunny?",
    description: "Lavender tag, yellow boxes, green tick",
    params: { question: "HAS {name} BEEN A GOOD BUNNY?", name: "KOHEN", font: "rounded", baseColor: "#B9A2E0", textColor: "#FFFFFF", boxColor: "#F6D743", checkColor: "#1E8E3E" },
  },
];

export function presetParams(id: string): TagParams {
  const p = PRESETS.find((x) => x.id === id);
  return { ...DEFAULT_PARAMS, ...(p?.params ?? {}) };
}
