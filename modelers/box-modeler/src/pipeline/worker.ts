/// <reference lib="webworker" />
import wasmUrl from "manifold-3d/manifold.wasm?url";
import { initKernel } from "../shared/kernel";
import { batchPlate3MF, batchZip, export3MF, exportStl, exportStlZip, generate, generateBatch, type BatchResult, type GenerateResult } from "./generate";
import type { WorkerRequest, WorkerResponse } from "./protocol";

// All geometry runs here so the sliders never freeze the page. The last result
// is kept so exports need no rebuild.
const ready = initKernel(() => wasmUrl);
let last: GenerateResult | null = null;
let lastBatch: BatchResult | null = null;
const post = (msg: WorkerResponse, transfer: Transferable[] = []) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    await ready;
    switch (req.type) {
      case "generate": {
        last = generate(req.params, req.art, req.kind);
        post({ id: req.id, ok: true, type: "generate", result: last });
        break;
      }
      case "export3mf": {
        if (!last) throw new Error("Build the model first.");
        const bytes = export3MF(last, req.params, req.title);
        post({ id: req.id, ok: true, type: "export3mf", bytes }, [bytes.buffer]);
        break;
      }
      case "exportStl": {
        if (!last) throw new Error("Build the model first.");
        const bytes = req.zip ? exportStlZip(last, req.title) : exportStl(last, req.title);
        post({ id: req.id, ok: true, type: "exportStl", bytes }, [bytes.buffer]);
        break;
      }
      case "batch": {
        lastBatch = generateBatch(req.params, req.items, req.art, req.what);
        post({ id: req.id, ok: true, type: "batch", result: lastBatch });
        break;
      }
      case "exportBatch3mf": {
        if (!lastBatch) throw new Error("Build the batch first.");
        const bytes = batchPlate3MF(lastBatch, req.plate, req.params, req.title);
        post({ id: req.id, ok: true, type: "exportBatch3mf", bytes }, [bytes.buffer]);
        break;
      }
      case "exportBatchZip": {
        if (!lastBatch) throw new Error("Build the batch first.");
        const bytes = batchZip(lastBatch, req.params, req.title);
        post({ id: req.id, ok: true, type: "exportBatchZip", bytes }, [bytes.buffer]);
        break;
      }
    }
  } catch (err) {
    post({ id: req.id, ok: false, error: (err as Error)?.message ?? String(err) });
  }
};
