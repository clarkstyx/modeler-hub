export type Vec2 = [number, number];
/** Closed ring of points, no repeated closing point. */
export type Ring = Vec2[];

/** Indexed triangle mesh in millimetres, counter-clockwise seen from outside. */
export interface TriMesh {
  positions: Float64Array;
  indices: Uint32Array;
}

/** One printable solid of one colour. */
export interface Part {
  /** Slicer-visible name, e.g. LID_TEXT. */
  name: string;
  /** Which printed object this part belongs to ("box" or "lid" or "calibration-…"). */
  object: string;
  hex: string;
  mesh: TriMesh;
  volume: number;
}

export type Severity = "error" | "warning" | "info";
export interface Issue {
  severity: Severity;
  message: string;
}

/** Artwork from an uploaded SVG, already flattened into one ring set per colour. */
export interface ArtLayer {
  hex: string;
  rings: Ring[];
}
export interface Artwork {
  name: string;
  layers: ArtLayer[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}
