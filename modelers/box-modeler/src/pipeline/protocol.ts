import type { BoxParams } from "../core/params";
import type { Artwork } from "../core/types";
import type { BatchItem, BatchWhat } from "../core/batch";
import type { BatchResult, GenerateResult } from "./generate";

export type Kind = "box" | "calibration";

export type WorkerRequest =
  | { id: number; type: "generate"; params: BoxParams; art: Artwork | null; kind: Kind }
  | { id: number; type: "export3mf"; params: BoxParams; title: string }
  | { id: number; type: "exportStl"; title: string; zip: boolean }
  | { id: number; type: "batch"; params: BoxParams; art: Artwork | null; items: BatchItem[]; what: BatchWhat }
  | { id: number; type: "exportBatch3mf"; params: BoxParams; title: string; plate: number }
  | { id: number; type: "exportBatchZip"; params: BoxParams; title: string };

export type WorkerResponse =
  | { id: number; ok: true; type: "generate"; result: GenerateResult }
  | { id: number; ok: true; type: "export3mf"; bytes: Uint8Array }
  | { id: number; ok: true; type: "exportStl"; bytes: Uint8Array }
  | { id: number; ok: true; type: "batch"; result: BatchResult }
  | { id: number; ok: true; type: "exportBatch3mf"; bytes: Uint8Array }
  | { id: number; ok: true; type: "exportBatchZip"; bytes: Uint8Array }
  | { id: number; ok: false; error: string };
