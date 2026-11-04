// GENERATED from packages/geometry/src/kernel.ts by `npm run sync-shared` in the hub. Edit the source there, not this copy.
import Module from "manifold-3d";
import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";

export type { CrossSection, Manifold };

let wasmPromise: Promise<ManifoldToplevel> | null = null;
let wasm: ManifoldToplevel | null = null;

/** Loads the manifold-3d WASM kernel once (guaranteed-manifold booleans + Clipper2 for 2D). */
export function initKernel(locateFile?: () => string): Promise<ManifoldToplevel> {
  if (!wasmPromise) {
    wasmPromise = Module(locateFile ? { locateFile } : undefined).then((m) => {
      m.setup();
      m.setMinCircularAngle(3);
      m.setMinCircularEdgeLength(0.5);
      wasm = m;
      return m;
    });
  }
  return wasmPromise;
}

export function kernel(): ManifoldToplevel {
  if (!wasm) throw new Error("Geometry kernel not initialised (call initKernel first).");
  return wasm;
}

/** WASM objects are not garbage collected: everything made during a build is freed by withArena. */
let arena: { delete(): void }[] = [];
export function track<T extends { delete(): void }>(obj: T): T {
  arena.push(obj);
  return obj;
}
export function withArena<T>(fn: () => T): T {
  const outer = arena;
  arena = [];
  try {
    return fn();
  } finally {
    for (const o of arena) {
      try {
        o.delete();
      } catch {
        /* already freed */
      }
    }
    arena = outer;
  }
}
