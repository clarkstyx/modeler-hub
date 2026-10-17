import { PLATE_BORDER, PLATE_GAP, derive, outerRadius, type BeadParams, type Derived } from "../core/params";
import type { Issue, Part } from "../core/types";
import { shelfPack } from "../shared/batch";
import { manifoldToMesh } from "../shared/mesh";
import { kernel, track, type Manifold } from "../shared/kernel";

const TAU = Math.PI * 2;

export interface PlacedBead {
  /** 1-based number in the batch. */
  index: number;
  object: string;
  x: number;
  y: number;
}

export interface Plate {
  index: number;
  beads: PlacedBead[];
  parts: Part[];
}

export interface BuildResult {
  plates: Plate[];
  issues: Issue[];
  derived: Derived;
  /** The single bead, centred at the origin, for the preview. */
  bead: Part;
}

/**
 * Points around the bead: enough for smooth ridges, few enough that a plate of
 * 20 beads stays a sensible 3MF (about 25–30 k triangles per bead).
 */
function segmentsAround(p: BeadParams): number {
  if (p.pattern === "coil") return 120;
  if (p.pattern === "snake") return 96;
  return Math.max(120, Math.min(240, 40 * Math.max(2, Math.round(p.strands))));
}

/** Bore radius at height z: the bore plus a chamfer at each end. */
function boreRadius(p: BeadParams, z: number): number {
  const c = p.boreChamfer;
  if (c <= 0) return p.bore / 2;
  const edge = Math.min(z, p.height - z);
  return p.bore / 2 + Math.max(0, c - edge);
}

/**
 * One bead as a closed mesh: outside = core + pattern, inside = bore with
 * chamfers, flat annulus at each end. Built ring by ring so every level is
 * exactly the outline the slicer sees.
 */
export function buildBead(p: BeadParams, d: Derived): Manifold {
  const N = segmentsAround(p);
  const M = Math.max(24, Math.min(240, Math.ceil(p.height / 0.25)));
  const L = M + 1;
  const verts = new Float32Array(2 * L * N * 3);
  const O = (i: number, j: number) => i * N + (j % N);
  const I = (i: number, j: number) => L * N + i * N + (j % N);
  for (let i = 0; i <= M; i++) {
    const z = (i / M) * p.height;
    const rin = boreRadius(p, z);
    for (let j = 0; j < N; j++) {
      const t = (j / N) * TAU;
      const ro = outerRadius(p, d, t, z);
      const ko = 3 * O(i, j), ki = 3 * I(i, j);
      verts[ko] = ro * Math.cos(t); verts[ko + 1] = ro * Math.sin(t); verts[ko + 2] = z;
      verts[ki] = rin * Math.cos(t); verts[ki + 1] = rin * Math.sin(t); verts[ki + 2] = z;
    }
  }
  const tris: number[] = [];
  for (let i = 0; i < M; i++)
    for (let j = 0; j < N; j++) {
      tris.push(O(i, j), O(i, j + 1), O(i + 1, j + 1), O(i, j), O(i + 1, j + 1), O(i + 1, j));
      tris.push(I(i, j), I(i + 1, j + 1), I(i, j + 1), I(i, j), I(i + 1, j), I(i + 1, j + 1));
    }
  for (let j = 0; j < N; j++) {
    tris.push(O(0, j), I(0, j), O(0, j + 1), I(0, j), I(0, j + 1), O(0, j + 1)); // bottom, facing down
    tris.push(O(M, j), O(M, j + 1), I(M, j), I(M, j), O(M, j + 1), I(M, j + 1)); // top, facing up
  }
  const K = kernel();
  return track(new K.Manifold(new K.Mesh({ numProp: 3, vertProperties: verts, triVerts: new Uint32Array(tris) })));
}

/** The same mesh moved on the plate (every bead is identical, so no rebuild per copy). */
function shifted(m: Part["mesh"], dx: number, dy: number): Part["mesh"] {
  const positions = new Float64Array(m.positions);
  for (let k = 0; k < positions.length; k += 3) { positions[k] += dx; positions[k + 1] += dy; }
  return { positions, indices: m.indices };
}

/** The whole batch: `count` copies packed on plates that fit the bed. */
export function buildBeads(p: BeadParams): BuildResult {
  const d = derive(p);
  const issues: Issue[] = [];
  const solid = buildBead(p, d);
  const mesh = manifoldToMesh(solid);
  const hex = p.color.toUpperCase();
  const bead: Part = { name: "BEAD", object: "bead", hex, mesh, volume: solid.volume() };

  const count = Math.max(1, Math.round(p.count));
  const size = p.diameter;
  const placed = shelfPack(Array.from({ length: count }, () => ({ w: size, h: size })), p.bedSize, PLATE_BORDER, PLATE_GAP);
  const plates = new Map<number, Plate>();
  placed.forEach((at, k) => {
    if (!at) return;
    const index = k + 1;
    if (!plates.has(at.plate)) plates.set(at.plate, { index: at.plate + 1, beads: [], parts: [] });
    const plate = plates.get(at.plate)!;
    const object = `bead-${String(index).padStart(2, "0")}`;
    const cx = at.x + size / 2, cy = at.y + size / 2;
    plate.beads.push({ index, object, x: cx, y: cy });
    plate.parts.push({ name: "BEAD", object, hex, mesh: shifted(mesh, cx, cy), volume: bead.volume });
  });
  const list = [...plates.values()].sort((a, b) => a.index - b.index);
  if (list.length > 1) issues.push({ severity: "info", message: `${count} beads need ${list.length} plates on a ${p.bedSize} mm bed (${list[0].beads.length} per plate).` });
  return { plates: list, issues, derived: d, bead };
}
