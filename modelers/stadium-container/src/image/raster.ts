import type { Artwork, Ring } from "../core/types";

/**
 * Turns a small bitmap (a logo as PNG or JPG) into filled colour layers, the
 * same shape the SVG loader produces, so the sign pipeline treats both alike.
 * Pure code, no canvas: the caller decodes and downsizes the image first.
 *
 * Pipeline (the lessons of the image-keychain and trinket-tray modelers):
 * alpha → background flood-fill from the border → deterministic k-means in
 * Lab on 5-bit colour buckets → merge blend clusters → 3×3 majority filter →
 * trace exact pixel edges into rings (outer rings and holes come out with
 * opposite turn, so a NonZero fill nests them correctly).
 */
export interface Bitmap {
  width: number;
  height: number;
  /** RGBA, row-major, like ImageData.data. */
  data: Uint8ClampedArray | Uint8Array;
}

export interface RasterOptions {
  /** Most colours to keep (one AMS: 4). */
  maxColours?: number;
  /** RGB distance within which a border pixel counts as background. */
  backgroundTolerance?: number;
}

const BG = -1;

export function rasterToArtwork(img: Bitmap, name: string, opts: RasterOptions = {}): Artwork {
  const maxColours = Math.max(1, Math.min(8, opts.maxColours ?? 4));
  const tol = opts.backgroundTolerance ?? 40;
  const { width: W, height: H, data } = img;
  const n = W * H;
  const key = new Int32Array(n); // 5-bit bucket per pixel, or BG
  const solid = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (data[i * 4 + 3] < 128) { key[i] = BG; continue; }
    solid[i] = 1;
    key[i] = ((data[i * 4] >> 3) << 10) | ((data[i * 4 + 1] >> 3) << 5) | (data[i * 4 + 2] >> 3);
  }

  // --- background: the border's dominant colour, when it owns at least 70 % of the border, flood-filled inwards
  const borderCount = new Map<number, number>();
  let border = 0;
  const addBorder = (i: number) => { border++; if (solid[i]) borderCount.set(key[i], (borderCount.get(key[i]) ?? 0) + 1); };
  for (let x = 0; x < W; x++) { addBorder(x); if (H > 1) addBorder((H - 1) * W + x); }
  for (let y = 1; y < H - 1; y++) { addBorder(y * W); if (W > 1) addBorder(y * W + W - 1); }
  let bgKey = -2, bgN = 0;
  for (const [k, c] of borderCount) if (c > bgN) { bgKey = k; bgN = c; }
  const transparentBorder = border - [...borderCount.values()].reduce((a, b) => a + b, 0);
  if (bgKey >= 0 && bgN + transparentBorder >= 0.7 * border) {
    const bgRgb = bucketRgb(bgKey);
    const near = (i: number) => solid[i] && dist2(data, i, bgRgb) <= tol * tol;
    const stack: number[] = [];
    const seen = new Uint8Array(n);
    const push = (i: number) => { if (!seen[i] && near(i)) { seen[i] = 1; stack.push(i); } };
    for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
    while (stack.length) {
      const i = stack.pop()!;
      solid[i] = 0; key[i] = BG;
      const x = i % W, y = (i - x) / W;
      if (x > 0) push(i - 1);
      if (x < W - 1) push(i + 1);
      if (y > 0) push(i - W);
      if (y < H - 1) push(i + W);
    }
  }

  // --- buckets and their Lab positions
  const counts = new Map<number, number>();
  let art = 0;
  for (let i = 0; i < n; i++) if (solid[i]) { art++; counts.set(key[i], (counts.get(key[i]) ?? 0) + 1); }
  if (!art) throw new Error("The image is empty once its background is removed.");
  const buckets = [...counts.entries()].map(([k, c]) => ({ k, c, lab: rgbToLab(bucketRgb(k)) }));
  buckets.sort((a, b) => b.c - a.c);

  // --- deterministic k-means seeds: the most common bucket, then the farthest-weighted ones (rare blends skipped)
  const K = Math.min(maxColours, buckets.length);
  const seeds: number[][] = [buckets[0].lab];
  while (seeds.length < K) {
    let best = -1, bestScore = -1;
    buckets.forEach((b, i) => {
      if (b.c < 0.01 * art && buckets.length > K) return;
      const d = Math.min(...seeds.map((s) => labDist2(s, b.lab)));
      const score = Math.sqrt(b.c) * d;
      if (score > bestScore) { bestScore = score; best = i; }
    });
    if (best < 0 || bestScore <= 1e-9) break;
    seeds.push(buckets[best].lab);
  }
  let centres = seeds;
  let assign = new Int32Array(buckets.length);
  for (let iter = 0; iter < 12; iter++) {
    buckets.forEach((b, i) => {
      let bi = 0, bd = Infinity;
      centres.forEach((c, j) => { const d = labDist2(c, b.lab); if (d < bd) { bd = d; bi = j; } });
      assign[i] = bi;
    });
    const sums = centres.map(() => [0, 0, 0, 0]);
    buckets.forEach((b, i) => { const s = sums[assign[i]]; s[0] += b.lab[0] * b.c; s[1] += b.lab[1] * b.c; s[2] += b.lab[2] * b.c; s[3] += b.c; });
    const next = sums.map((s, j) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centres[j]));
    const moved = next.some((c, j) => labDist2(c, centres[j]) > 0.01);
    centres = next;
    if (!moved) break;
  }
  // Each cluster's colour is its most populated bucket (exact flat colours, not anti-aliased means).
  const clusterSize = centres.map(() => 0);
  const clusterTop = centres.map(() => ({ k: -1, c: -1 }));
  buckets.forEach((b, i) => { const j = assign[i]; clusterSize[j] += b.c; if (b.c > clusterTop[j].c) clusterTop[j] = { k: b.k, c: b.c }; });
  // Merge small clusters that lie on the line between two others (anti-aliasing blends). The removed
  // background colour counts as an end point too: a logo's edge blends towards it.
  const alive = centres.map((_, j) => clusterSize[j] > 0);
  const ends = bgKey >= 0 ? [...centres, rgbToLab(bucketRgb(bgKey))] : centres;
  for (let j = 0; j < centres.length; j++) {
    if (!alive[j] || clusterSize[j] > 0.08 * art) continue;
    for (let a = 0; a < ends.length && alive[j]; a++)
      for (let b = a + 1; b < ends.length && alive[j]; b++) {
        if (a === j || b === j || (a < centres.length && !alive[a]) || (b < centres.length && !alive[b])) continue;
        if (segmentDistance(centres[j], ends[a], ends[b]) < 15) alive[j] = false;
      }
  }
  const liveIdx = centres.map((_, j) => j).filter((j) => alive[j]);
  if (!liveIdx.length) liveIdx.push(clusterSize.indexOf(Math.max(...clusterSize)));
  const bucketLabel = new Map<number, number>();
  buckets.forEach((b, i) => {
    let j = assign[i];
    if (!alive[j]) { let bd = Infinity; for (const l of liveIdx) { const d = labDist2(centres[l], b.lab); if (d < bd) { bd = d; j = l; } } }
    bucketLabel.set(b.k, liveIdx.indexOf(j));
  });
  const labels = new Int32Array(n).fill(BG);
  for (let i = 0; i < n; i++) if (solid[i]) labels[i] = bucketLabel.get(key[i])!;

  // --- 3×3 majority filter removes specks and smooths jagged colour edges
  const L = liveIdx.length;
  const filtered = new Int32Array(n);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (labels[i] === BG) { filtered[i] = BG; continue; }
      const votes = new Int32Array(L);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const l = labels[yy * W + xx];
          if (l !== BG) votes[l]++;
        }
      let best = labels[i];
      for (let l = 0; l < L; l++) if (votes[l] > votes[best]) best = l;
      filtered[i] = best;
    }

  // --- trace every colour's exact pixel edges
  const layers = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let l = 0; l < L; l++) {
    const rings = traceLabel(filtered, W, H, l);
    if (!rings.length) continue;
    for (const r of rings) for (const [x, y] of r) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    const [r, g, b] = bucketRgb(clusterTop[liveIdx[l]].k);
    layers.push({ hex: `#${hex2(r)}${hex2(g)}${hex2(b)}`, rings, area: rings.reduce((a, ring) => a + Math.abs(signedArea(ring)), 0) });
  }
  if (!layers.length) throw new Error("No shapes were found in the image.");
  // Biggest first: the painter order lets small details win where edges meet.
  layers.sort((a, b) => b.area - a.area);
  return { name, layers: layers.map(({ hex, rings }) => ({ hex, rings })), bounds: { minX, minY, maxX, maxY } };
}

/**
 * Boundary of all pixels with `label`, as closed rings on the pixel grid
 * (y down). Every boundary edge is walked with the shape on its right, so
 * outer rings and holes turn opposite ways; `cs(rings, "NonZero")` then
 * nests them correctly, islands inside holes included. Collinear points are
 * merged.
 */
export function traceLabel(labels: Int32Array, W: number, H: number, label: number): Ring[] {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? false : labels[y * W + x] === label);
  // Directed edges keyed by start vertex: shape on the right of the travel direction.
  const edges = new Map<number, number[]>();
  const vkey = (x: number, y: number) => y * (W + 1) + x;
  const add = (x0: number, y0: number, x1: number, y1: number) => {
    const k = vkey(x0, y0);
    const list = edges.get(k);
    if (list) list.push(vkey(x1, y1)); else edges.set(k, [vkey(x1, y1)]);
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!at(x, y)) continue;
      if (!at(x, y - 1)) add(x, y, x + 1, y); // top edge, travelling right (shape below = right side in y-down)
      if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1); // right edge, travelling down
      if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1); // bottom edge, travelling left
      if (!at(x - 1, y)) add(x, y + 1, x, y); // left edge, travelling up
    }
  const rings: Ring[] = [];
  const ux = (k: number) => k % (W + 1), uy = (k: number) => (k - (k % (W + 1))) / (W + 1);
  for (const [start, list] of edges) {
    while (list.length) {
      const ring: number[] = [start];
      let cur = start;
      let next = list.pop()!;
      let guard = 0;
      while (next !== start && guard++ < 4 * W * H) {
        ring.push(next);
        const out = edges.get(next);
        if (!out || !out.length) break;
        // At a pinch (two shape corners touching), keep turning the same way: pick the edge that turns right first.
        let pick = 0;
        if (out.length > 1) {
          const dx = ux(next) - ux(cur), dy = uy(next) - uy(cur);
          let bestTurn = -Infinity;
          out.forEach((cand, i) => {
            const ex = ux(cand) - ux(next), ey = uy(cand) - uy(next);
            const turn = dx * ey - dy * ex; // > 0 is a right turn in y-down coordinates
            if (turn > bestTurn) { bestTurn = turn; pick = i; }
          });
        }
        cur = next;
        next = out.splice(pick, 1)[0];
      }
      const pts: Ring = ring.map((k) => [ux(k), uy(k)]);
      const merged = mergeCollinear(pts);
      if (merged.length >= 3) rings.push(merged);
    }
  }
  return rings;
}

function mergeCollinear(r: Ring): Ring {
  const out: Ring = [];
  const n = r.length;
  for (let i = 0; i < n; i++) {
    const a = r[(i - 1 + n) % n], b = r[i], c = r[(i + 1) % n];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (cross !== 0) out.push(b);
  }
  return out;
}

export function signedArea(r: Ring): number {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]);
  return a / 2;
}

const hex2 = (v: number) => v.toString(16).padStart(2, "0").toUpperCase();
const bucketRgb = (k: number): [number, number, number] => [((k >> 10) & 31) * 8 + 4, ((k >> 5) & 31) * 8 + 4, (k & 31) * 8 + 4];
function dist2(data: Bitmap["data"], i: number, rgb: [number, number, number]): number {
  const dr = data[i * 4] - rgb[0], dg = data[i * 4 + 1] - rgb[1], db = data[i * 4 + 2] - rgb[2];
  return dr * dr + dg * dg + db * db;
}
const labDist2 = (a: number[], b: number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
function segmentDistance(p: number[], a: number[], b: number[]): number {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  if (len2 < 1e-9) return Math.sqrt(labDist2(p, a));
  let t = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / len2;
  if (t <= 0.1 || t >= 0.9) return Infinity; // not between them
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(labDist2(p, [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t]));
}

/** sRGB → CIE Lab (D65). */
export function rgbToLab([r, g, b]: [number, number, number]): number[] {
  const lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
