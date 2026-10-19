import type { StadiumParams } from "../core/params";
import type { Artwork } from "../core/types";
import type { WorkerRequest, WorkerResponse } from "./protocol";
import type { ExportGroup } from "./generate";

type Ok<T extends string> = Extract<WorkerResponse, { ok: true; type: T }>;
type Body = WorkerRequest extends infer R ? (R extends WorkerRequest ? Omit<R, "id"> : never) : never;

/** Promise wrapper around the geometry worker. */
export class GeometryClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (r: WorkerResponse) => void; reject: (e: Error) => void }>();
  /** Creates the worker on first use, so a client stays usable after dispose() (React StrictMode remounts in dev). */
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
    this.worker = worker;
    return worker;
  }
  private send<T extends string>(body: Body): Promise<Ok<T>> {
    const id = this.nextId++;
    const worker = this.start();
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: (r) => resolve(r as Ok<T>), reject });
      worker.postMessage({ ...body, id });
    });
  }
  generate(params: StadiumParams, art: Artwork | null) {
    return this.send<"generate">({ type: "generate", params, art });
  }
  export3mf(group: ExportGroup, params: StadiumParams, title: string) {
    return this.send<"export3mf">({ type: "export3mf", group, params, title });
  }
  exportStl(group: ExportGroup, title: string) {
    return this.send<"exportStl">({ type: "exportStl", group, title });
  }
  exportZip(params: StadiumParams, title: string) {
    return this.send<"exportZip">({ type: "exportZip", params, title });
  }
  dispose() {
    this.worker?.terminate();
    this.worker = null;
    for (const p of this.pending.values()) p.reject(new Error("Geometry worker stopped."));
    this.pending.clear();
  }
}
