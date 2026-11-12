/// <reference lib="webworker" />
import wasmUrl from "manifold-3d/manifold.wasm?url";
import { initKernel } from "../shared/kernel";
import { generate, group3MF, groupStl, stadiumZip, type GenerateResult } from "./generate";
import type { WorkerRequest, WorkerResponse } from "./protocol";

// All geometry runs here so dragging a slider never freezes the page.
const ready = initKernel(() => wasmUrl);
let last: GenerateResult | null = null;
const post = (msg: WorkerResponse, transfer: Transferable[] = []) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    await ready;
    if (req.type === "generate") {
      last = generate(req.params, req.art);
      post({ id: req.id, ok: true, type: "generate", result: last });
      return;
    }
    if (!last) throw new Error("Build the stadium first.");
    const bytes =
      req.type === "export3mf" ? group3MF(last, req.group, req.params, req.title)
      : req.type === "exportStl" ? groupStl(last, req.group, req.title)
      : stadiumZip(last, req.params, req.title);
    post({ id: req.id, ok: true, type: req.type, bytes } as WorkerResponse, [bytes.buffer]);
  } catch (err) {
    post({ id: req.id, ok: false, error: (err as Error)?.message ?? String(err) });
  }
};
