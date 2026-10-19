import type { TriMesh } from "./types";
import type { Manifold } from "./kernel";

/** 3MF writes 7 decimals; positions are snapped to it so validation sees exactly what is exported. */
export const POSITION_QUANTUM = 1e-7;
const snap = (v: number) => Math.round(v / POSITION_QUANTUM) * POSITION_QUANTUM;

export function manifoldToMesh(m: Manifold): TriMesh {
  const mesh = m.getMesh();
  const stride = mesh.numProp;
  const nVert = mesh.vertProperties.length / stride;
  const positions = new Float64Array(nVert * 3);
  for (let i = 0; i < nVert; i++) {
    positions[i * 3] = snap(mesh.vertProperties[i * stride]);
    positions[i * 3 + 1] = snap(mesh.vertProperties[i * stride + 1]);
    positions[i * 3 + 2] = snap(mesh.vertProperties[i * stride + 2]);
  }
  const welded = weld(positions, new Uint32Array(mesh.triVerts));
  flipFlatTriangles(welded.positions, welded.indices);
  return welded;
}

/**
 * Merges vertices that snap to the same position and drops the zero-area
 * triangles this leaves behind (the kernel can emit two coincident vertices
 * where a cut edge meets a curve). The surface stays closed: a collapsed
 * triangle's two surviving edges cancel each other.
 *
 * The kernel also keeps some coincident vertices apart on purpose: where a
 * surface touches itself at a point (its "merge vectors"), joining them would
 * give an edge shared by more than two triangles. Any merge that does that is
 * undone, so the result is always as manifold as the kernel's own mesh.
 */
function weld(P: Float64Array, I: Uint32Array): TriMesh {
  const nv = P.length / 3;
  const keyOf = new Array<string>(nv);
  for (let i = 0; i < nv; i++) keyOf[i] = `${P[i * 3]},${P[i * 3 + 1]},${P[i * 3 + 2]}`;
  const keepApart = new Set<number>();
  for (let round = 0; round < 8; round++) {
    const remap = new Uint32Array(nv);
    const seen = new Map<string, number>();
    const kept: number[] = [];
    for (let i = 0; i < nv; i++) {
      const j = keepApart.has(i) ? undefined : seen.get(keyOf[i]);
      if (j === undefined) {
        if (!keepApart.has(i)) seen.set(keyOf[i], kept.length);
        remap[i] = kept.length;
        kept.push(i);
      } else remap[i] = j;
    }
    const out: number[] = [];
    for (let t = 0; t < I.length; t += 3) {
      const a = remap[I[t]], b = remap[I[t + 1]], c = remap[I[t + 2]];
      if (a === b || b === c || a === c) continue;
      out.push(a, b, c);
    }
    // Directed edges used more than once mark merges that broke the surface: keep those vertices apart and retry.
    const count = new Map<number, number>();
    const n = kept.length;
    for (let t = 0; t < out.length; t += 3)
      for (const [u, v] of [[out[t], out[t + 1]], [out[t + 1], out[t + 2]], [out[t + 2], out[t]]]) {
        const k = u * n + v;
        count.set(k, (count.get(k) ?? 0) + 1);
      }
    const bad = new Set<number>();
    for (const [k, c] of count) if (c > 1) { bad.add(Math.floor(k / n)); bad.add(k % n); }
    if (bad.size) {
      let grew = false;
      for (let i = 0; i < nv; i++) if (bad.has(remap[i]) && !keepApart.has(i)) { keepApart.add(i); grew = true; }
      if (grew) continue;
    }
    const positions = new Float64Array(n * 3);
    kept.forEach((src, dst) => {
      positions[dst * 3] = P[src * 3];
      positions[dst * 3 + 1] = P[src * 3 + 1];
      positions[dst * 3 + 2] = P[src * 3 + 2];
    });
    return { positions, indices: new Uint32Array(out) };
  }
  return { positions: P, indices: I };
}

function area2(P: Float64Array, a: number, b: number, c: number): number {
  const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
  const vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
  return (uy * vz - uz * vy) ** 2 + (uz * vx - ux * vz) ** 2 + (ux * vy - uy * vx) ** 2;
}

/**
 * The kernel's polygon triangulator can join three exactly collinear outline
 * vertices (coincident cut edges do this) into a flat, zero-area triangle.
 * Such a triangle (p, q, r), with r on the long edge p–q, is fixed by flipping
 * that edge with the neighbouring triangle (q, p, s): the pair becomes
 * (p, s, r) and (s, q, r). Same vertices, same closed surface, only the
 * diagonal changes. Edits `indices` in place. (Same approach as the Trinket Tray.)
 */
export function flipFlatTriangles(P: Float64Array, I: Uint32Array): void {
  const nt = I.length / 3;
  const EPS = 4e-20;
  const key = (u: number, v: number) => u * 4294967296 + v;
  const edgeOwner = new Map<number, number>();
  const register = (t: number) => {
    for (let k = 0; k < 3; k++) edgeOwner.set(key(I[t * 3 + k], I[t * 3 + ((k + 1) % 3)]), t);
  };
  const flat: number[] = [];
  for (let t = 0; t < nt; t++) {
    register(t);
    const a = I[t * 3], b = I[t * 3 + 1], c = I[t * 3 + 2];
    if (a !== b && b !== c && a !== c && area2(P, a, b, c) < EPS) flat.push(t);
  }
  for (const t of flat) {
    const v = [I[t * 3], I[t * 3 + 1], I[t * 3 + 2]];
    if (area2(P, v[0], v[1], v[2]) >= EPS) continue;
    let best = -1, k0 = 0;
    for (let k = 0; k < 3; k++) {
      const p = v[k], q = v[(k + 1) % 3];
      const d = (P[p * 3] - P[q * 3]) ** 2 + (P[p * 3 + 1] - P[q * 3 + 1]) ** 2 + (P[p * 3 + 2] - P[q * 3 + 2]) ** 2;
      if (d > best) { best = d; k0 = k; }
    }
    const p = v[k0], q = v[(k0 + 1) % 3], r = v[(k0 + 2) % 3];
    const u = edgeOwner.get(key(q, p));
    if (u === undefined || u === t) continue;
    const w = [I[u * 3], I[u * 3 + 1], I[u * 3 + 2]];
    const s = w.find((x) => x !== p && x !== q)!;
    if (area2(P, p, s, r) < EPS || area2(P, s, q, r) < EPS) continue;
    I[t * 3] = p; I[t * 3 + 1] = s; I[t * 3 + 2] = r;
    I[u * 3] = s; I[u * 3 + 1] = q; I[u * 3 + 2] = r;
    register(t);
    register(u);
  }
}

export interface MeshReport {
  name: string;
  triangles: number;
  vertices: number;
  watertight: boolean;
  consistentWinding: boolean;
  volume: number;
  degenerateTriangles: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
  errors: string[];
  ok: boolean;
}

/**
 * Independent check of an exported mesh: every edge shared by exactly two
 * triangles, traversed once in each direction, no degenerate triangles,
 * positive volume. Nothing is repaired: a failure blocks export.
 */
export function validateMesh(name: string, mesh: TriMesh): MeshReport {
  const { positions: P, indices: I } = mesh;
  const nv = P.length / 3;
  const nt = I.length / 3;
  const errors: string[] = [];
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  let nan = 0;
  for (let i = 0; i < nv; i++)
    for (let k = 0; k < 3; k++) {
      const v = P[i * 3 + k];
      if (!Number.isFinite(v)) { nan++; break; }
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  const directed = new Map<number, number>();
  let degenerate = 0;
  let vol6 = 0;
  for (let t = 0; t < nt; t++) {
    const a = I[t * 3], b = I[t * 3 + 1], c = I[t * 3 + 2];
    if (a >= nv || b >= nv || c >= nv) { errors.push(`Triangle ${t} references a missing vertex.`); continue; }
    if (a === b || b === c || a === c) { degenerate++; continue; }
    const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2];
    const bx = P[b * 3] - ax, by = P[b * 3 + 1] - ay, bz = P[b * 3 + 2] - az;
    const cx = P[c * 3] - ax, cy = P[c * 3 + 1] - ay, cz = P[c * 3 + 2] - az;
    const nx = by * cz - bz * cy, ny = bz * cx - bx * cz, nz = bx * cy - by * cx;
    if (0.5 * Math.hypot(nx, ny, nz) < 1e-10) degenerate++;
    vol6 += P[a * 3] * (P[b * 3 + 1] * P[c * 3 + 2] - P[b * 3 + 2] * P[c * 3 + 1])
      - P[a * 3 + 1] * (P[b * 3] * P[c * 3 + 2] - P[b * 3 + 2] * P[c * 3])
      + P[a * 3 + 2] * (P[b * 3] * P[c * 3 + 1] - P[b * 3 + 1] * P[c * 3]);
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      const k = u * nv + v;
      directed.set(k, (directed.get(k) ?? 0) + 1);
    }
  }
  let unmatched = 0, repeated = 0;
  for (const [k, count] of directed) {
    if (count > 1) repeated++;
    const u = Math.floor(k / nv);
    const v = k - u * nv;
    if ((directed.get(v * nv + u) ?? 0) !== 1 || count !== 1) unmatched++;
  }
  const watertight = unmatched === 0 && nt > 0;
  const consistentWinding = repeated === 0;
  const volume = vol6 / 6;
  if (nt === 0) errors.push("Mesh has no triangles.");
  if (nan) errors.push(`${nan} vertices have non-finite coordinates.`);
  if (!watertight) errors.push(`Not watertight: ${unmatched} open or non-manifold edge(s).`);
  if (!consistentWinding) errors.push(`${repeated} edge(s) with inconsistent winding.`);
  if (degenerate) errors.push(`${degenerate} degenerate (zero-area) triangle(s).`);
  if (!(volume > 0)) errors.push(`Volume is not positive (${volume.toFixed(3)} mm³): inverted normals.`);
  return { name, triangles: nt, vertices: nv, watertight, consistentWinding, volume, degenerateTriangles: degenerate, bbox: { min, max }, errors, ok: errors.length === 0 };
}
