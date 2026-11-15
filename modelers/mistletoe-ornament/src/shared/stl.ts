// GENERATED from packages/geometry/src/stl.ts by `npm run sync-shared` in the hub. Edit the source there, not this copy.
import { zipSync } from "fflate";
import type { Part, TriMesh } from "./types";

/** Binary STL of one mesh. */
export function meshToStl(mesh: TriMesh, header = "valencia-modelers"): Uint8Array {
  const nt = mesh.indices.length / 3;
  const buf = new ArrayBuffer(84 + nt * 50);
  const dv = new DataView(buf);
  const head = new TextEncoder().encode(header.slice(0, 80));
  new Uint8Array(buf, 0, head.length).set(head);
  dv.setUint32(80, nt, true);
  const P = mesh.positions;
  let o = 84;
  for (let t = 0; t < nt; t++) {
    const a = mesh.indices[t * 3] * 3, b = mesh.indices[t * 3 + 1] * 3, c = mesh.indices[t * 3 + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    dv.setFloat32(o, nx, true); dv.setFloat32(o + 4, ny, true); dv.setFloat32(o + 8, nz, true); o += 12;
    for (const idx of [a, b, c]) { dv.setFloat32(o, P[idx], true); dv.setFloat32(o + 4, P[idx + 1], true); dv.setFloat32(o + 8, P[idx + 2], true); o += 12; }
    dv.setUint16(o, 0, true); o += 2;
  }
  return new Uint8Array(buf);
}

/** Merges several meshes into one STL (single colour). */
export function partsToStl(parts: Part[], header = "valencia-modelers"): Uint8Array {
  let nv = 0, ni = 0;
  for (const p of parts) { nv += p.mesh.positions.length; ni += p.mesh.indices.length; }
  const positions = new Float64Array(nv);
  const indices = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const p of parts) {
    positions.set(p.mesh.positions, ov);
    const base = ov / 3;
    for (let i = 0; i < p.mesh.indices.length; i++) indices[oi + i] = p.mesh.indices[i] + base;
    ov += p.mesh.positions.length;
    oi += p.mesh.indices.length;
  }
  return meshToStl({ positions, indices }, header);
}

/** ZIP with one STL per part plus a README on how to import them together. */
export function partsToStlZip(parts: Part[], title = "model"): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  for (const p of parts) files[`${p.object}_${p.name}.stl`.toLowerCase()] = meshToStl(p.mesh, p.name);
  files["README.txt"] = new TextEncoder().encode(
    `${title}\n\nOne STL per colour part. All files share one coordinate frame (the print layout), so import them together ` +
      `(Bambu Studio / OrcaSlicer: "Load as a single object with multiple parts") and assign a filament to each.\n\n` +
      parts.map((p) => `${p.object}_${p.name}.stl  ${p.hex}`).join("\n") + "\n",
  );
  return zipSync(files, { level: 6 });
}
