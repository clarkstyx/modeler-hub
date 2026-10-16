import type { SkirtParams } from "../core/params";
import type { WorkerRequest, WorkerResponse } from "./protocol";

type Ok<T extends string> = Extract<WorkerResponse, { ok: true; type: T }>;
type Body = WorkerRequest extends infer R ? (R extends WorkerRequest ? Omit<R, "id"> : never) : never;

/**
 * Promise wrapper around the geometry worker. The worker starts on the first
 * request and again after dispose(): React's StrictMode (npm run dev) unmounts
 * and remounts the app once, and a client that stayed disposed would leave the
 * preview on "Building…" forever.
 */
export class GeometryClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (r: WorkerResponse) => void; reject: (e: Error) => void }>();

  private start(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const p = this.pending.get(e.data.id);
      if (!p) return;
      this.pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data);
      else p.reject(new Error(e.data.error));
    };
    worker.onerror = (e) => {
      for (const p of this.pending.values()) p.reject(new Error(e.message || "Geometry worker crashed."));
      this.pending.clear();
    };
    return (this.worker = worker);
  }
  private send<T extends string>(body: Body): Promise<Ok<T>> {
    const id = this.nextId++;
    const worker = this.start();
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: (r) => resolve(r as Ok<T>), reject });
      worker.postMessage({ ...body, id });
    });
  }
  generate(params: SkirtParams) {
    return this.send<"generate">({ type: "generate", params });
  }
  export3mf(params: SkirtParams, title: string) {
    return this.send<"export3mf">({ type: "export3mf", params, title });
  }
  exportStl(title: string, zip: boolean) {
    return this.send<"exportStl">({ type: "exportStl", title, zip });
  }
  /** Stops the worker; requests still waiting are rejected. The next request starts a new one. */
  dispose() {
    this.worker?.terminate();
    this.worker = null;
    for (const p of this.pending.values()) p.reject(new Error("Geometry worker stopped."));
    this.pending.clear();
  }
}
