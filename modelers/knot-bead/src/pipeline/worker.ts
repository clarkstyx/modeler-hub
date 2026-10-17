/// <reference lib="webworker" />
import wasmUrl from "manifold-3d/manifold.wasm?url";
import { initKernel } from "../shared/kernel";
import { beadZip, generate, plate3MF, plateStl, type GenerateResult } from "./generate";
import type { WorkerRequest, WorkerResponse } from "./protocol";

// All geometry runs here so dragging a slider never freezes the page. The last
// result is kept so exports need no rebuild.
const ready = initKernel(() => wasmUrl);
let last: GenerateResult | null = null;
const post = (msg: WorkerResponse, transfer: Transferable[] = []) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    await ready;
    if (req.type === "generate") {
      last = generate(req.params);
      post({ id: req.id, ok: true, type: "generate", result: last });
      return;
    }
    if (!last) throw new Error("Build the beads first.");
    const bytes =
      req.type === "export3mf" ? plate3MF(last, req.plate, req.params, req.title)
      : req.type === "exportStl" ? plateStl(last, req.plate, req.title)
      : beadZip(last, req.params, req.title);
    post({ id: req.id, ok: true, type: req.type, bytes } as WorkerResponse, [bytes.buffer]);
  } catch (err) {
    post({ id: req.id, ok: false, error: (err as Error)?.message ?? String(err) });
  }
};
