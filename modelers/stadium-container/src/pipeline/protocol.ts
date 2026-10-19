import type { StadiumParams } from "../core/params";
import type { Artwork } from "../core/types";
import type { ExportGroup, GenerateResult } from "./generate";

export type WorkerRequest =
  | { id: number; type: "generate"; params: StadiumParams; art: Artwork | null }
  | { id: number; type: "export3mf"; group: ExportGroup; params: StadiumParams; title: string }
  | { id: number; type: "exportStl"; group: ExportGroup; title: string }
  | { id: number; type: "exportZip"; params: StadiumParams; title: string };
export type WorkerResponse =
  | { id: number; ok: true; type: "generate"; result: GenerateResult }
  | { id: number; ok: true; type: "export3mf"; bytes: Uint8Array }
  | { id: number; ok: true; type: "exportStl"; bytes: Uint8Array }
  | { id: number; ok: true; type: "exportZip"; bytes: Uint8Array }
  | { id: number; ok: false; error: string };
