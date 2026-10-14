import type { CutterParams } from "../core/params";
import type { Artwork } from "../core/types";
import type { GenerateResult } from "./generate";

export type WorkerRequest =
  | { id: number; type: "generate"; params: CutterParams; art: Artwork | null }
  | { id: number; type: "export3mf"; plate: number; params: CutterParams; title: string }
  | { id: number; type: "exportStl"; plate: number; title: string }
  | { id: number; type: "exportZip"; params: CutterParams; title: string };
export type WorkerResponse =
  | { id: number; ok: true; type: "generate"; result: GenerateResult }
  | { id: number; ok: true; type: "export3mf"; bytes: Uint8Array }
  | { id: number; ok: true; type: "exportStl"; bytes: Uint8Array }
  | { id: number; ok: true; type: "exportZip"; bytes: Uint8Array }
  | { id: number; ok: false; error: string };
