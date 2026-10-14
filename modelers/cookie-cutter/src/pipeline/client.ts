import type { CutterParams } from "../core/params";
import type { Artwork } from "../core/types";
import type { WorkerRequest, WorkerResponse } from "./protocol";

type Ok<T extends string> = Extract<WorkerResponse, { ok: true; type: T }>;
type Body = WorkerRequest extends infer R ? (R extends WorkerRequest ? Omit<R, "id"> : never) : never;

/** Promise wrapper around the geometry worker. */
export class GeometryClient {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, { resolve: (r: WorkerResponse) => void; reject: (e: Error) => void }>();
  constructor() {
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const p = this.pending.get(e.data.id);
      if (!p) return;
      this.pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data);
      else p.reject(new Error(e.data.error));
    };
    this.worker.onerror = (e) => {
      for (const p of this.pending.values()) p.reject(new Error(e.message || "Geometry worker crashed."));
      this.pending.clear();
    };
  }
  private send<T extends string>(body: Body): Promise<Ok<T>> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: (r) => resolve(r as Ok<T>), reject });
      this.worker.postMessage({ ...body, id });
    });
  }
  generate(params: CutterParams, art: Artwork | null) {
    return this.send<"generate">({ type: "generate", params, art });
  }
  export3mf(plate: number, params: CutterParams, title: string) {
    return this.send<"export3mf">({ type: "export3mf", plate, params, title });
  }
  exportStl(plate: number, title: string) {
    return this.send<"exportStl">({ type: "exportStl", plate, title });
  }
  exportZip(params: CutterParams, title: string) {
    return this.send<"exportZip">({ type: "exportZip", params, title });
  }
  dispose() {
    this.worker.terminate();
  }
}
