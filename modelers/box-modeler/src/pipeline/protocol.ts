import type { BoxParams } from "../core/params";
import type { Artwork } from "../core/types";
import type { GenerateResult } from "./generate";

export type Kind = "box" | "calibration";

export type WorkerRequest =
  | { id: number; type: "generate"; params: BoxParams; art: Artwork | null; kind: Kind }
  | { id: number; type: "export3mf"; params: BoxParams; title: string }
  | { id: number; type: "exportStl"; title: string; zip: boolean };

export type WorkerResponse =
  | { id: number; ok: true; type: "generate"; result: GenerateResult }
  | { id: number; ok: true; type: "export3mf"; bytes: Uint8Array }
  | { id: number; ok: true; type: "exportStl"; bytes: Uint8Array }
  | { id: number; ok: false; error: string };
