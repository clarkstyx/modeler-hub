"""Height map (mm) + mask -> watertight solid with a flat back, border and keyring loop.

Uses manifold3d, the same kernel as the hub's packages/geometry, so the port later is 1:1.
Coordinates: X right, Y up (image row 0 is the top), Z out of the backing; Z=0 is the bed.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import cv2
import manifold3d as m3


@dataclass
class ReliefParams:
    pitch_mm: float = 0.15      # grid spacing of the height field (= one image pixel)
    backing_mm: float = 3.5
    border_mm: float = 0.6      # flat rim outside the silhouette
    loop: str = "top"           # top | left | right | none
    hole_mm: float = 5.0
    loop_wall_mm: float = 2.5
    min_island_mm2: float = 2.0


def silhouette(mask: np.ndarray, pitch: float, border_mm: float, min_island_mm2: float) -> m3.CrossSection:
    """Polygon outline of the subject in mm, offset outwards by the border."""
    hard = (mask > 0.5).astype(np.uint8)
    rows = hard.shape[0]
    contours, hierarchy = cv2.findContours(hard, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    polys = []
    for c in contours:
        if len(c) < 3:
            continue
        c = cv2.approxPolyDP(c, 0.6, True)
        if len(c) < 3:
            continue
        pts = [(float(x) * pitch, float(rows - y) * pitch) for x, y in c[:, 0, :]]
        polys.append(pts)
    cs = m3.CrossSection(polys, m3.FillRule.EvenOdd)
    parts = [p for p in cs.decompose() if p.area() >= min_island_mm2]
    if not parts:
        raise ValueError("No subject found after matting.")
    cs = m3.CrossSection.compose(parts) if len(parts) > 1 else parts[0]
    if border_mm > 0:
        cs = cs.offset(border_mm, m3.JoinType.Round)
    return cs.simplify(0.03)


def height_field_solid(height_mm: np.ndarray, pitch: float, backing_mm: float) -> m3.Manifold:
    """Closed solid over the whole image rectangle: top = backing + height, bottom = 0."""
    H, W = height_mm.shape
    xs = np.arange(W, dtype=np.float32) * pitch
    ys = (H - 1 - np.arange(H, dtype=np.float32)) * pitch
    X, Y = np.meshgrid(xs, ys)
    top = np.stack([X, Y, backing_mm + height_mm], axis=-1).reshape(-1, 3)
    bot = np.stack([X, Y, np.zeros_like(X)], axis=-1).reshape(-1, 3)
    verts = np.concatenate([top, bot]).astype(np.float32)
    n = H * W
    idx = np.arange(n).reshape(H, W)
    a = idx[:-1, :-1].ravel(); b = idx[:-1, 1:].ravel(); c = idx[1:, 1:].ravel(); d = idx[1:, :-1].ravel()
    # Top faces, counter-clockwise seen from +Z (Y goes up as the row index goes down).
    top_t = np.concatenate([np.stack([a, d, c], 1), np.stack([a, c, b], 1)])
    bot_t = np.concatenate([np.stack([a, c, d], 1), np.stack([a, b, c], 1)]) + n
    sides = []
    def strip(i0, i1):  # i0,i1: 1-D arrays of top indices along an edge, in order
        t0, t1, b0, b1 = i0, i1, i0 + n, i1 + n
        sides.append(np.stack([t0, b1, b0], 1)); sides.append(np.stack([t0, t1, b1], 1))
    # Walk the rectangle boundary clockwise seen from +Z; with this winding the normals point out.
    topE = idx[0, :]; rightE = idx[:, -1]; botE = idx[-1, ::-1]; leftE = idx[::-1, 0]
    for e in (topE, rightE, botE, leftE):
        strip(e[:-1], e[1:])
    tris = np.concatenate([top_t, bot_t] + sides).astype(np.uint32)
    m = m3.Manifold(m3.Mesh(vert_properties=verts, tri_verts=tris))
    if m.status() != m3.Error.NoError:
        raise RuntimeError(f"Height field is not manifold: {m.status()}")
    return m


def loop_ring(outline: m3.CrossSection, p: ReliefParams) -> m3.CrossSection | None:
    if p.loop == "none":
        return None
    (x0, y0), (x1, y1) = _bounds(outline)
    r_out = p.hole_mm / 2 + p.loop_wall_mm
    overlap = max(1.0, p.loop_wall_mm * 0.6)
    if p.loop == "top":
        cx, cy = (x0 + x1) / 2, y1 + r_out - overlap
    elif p.loop == "left":
        cx, cy = x0 - r_out + overlap, y0 + (y1 - y0) * 0.75
    elif p.loop == "right":
        cx, cy = x1 + r_out - overlap, y0 + (y1 - y0) * 0.75
    else:
        raise ValueError(f"loop must be top|left|right|none, got {p.loop}")
    ring = m3.CrossSection.circle(r_out, 96).translate((cx, cy))
    hole = m3.CrossSection.circle(p.hole_mm / 2, 64).translate((cx, cy))
    return ring - hole, hole


def _bounds(cs: m3.CrossSection):
    b = cs.bounds()
    return (b[0], b[1]), (b[2], b[3])


def build_solid(height_mm: np.ndarray, mask: np.ndarray, p: ReliefParams) -> tuple[m3.Manifold, dict]:
    outline = silhouette(mask, p.pitch_mm, p.border_mm, p.min_island_mm2)
    field = height_field_solid(height_mm, p.pitch_mm, p.backing_mm)
    zmax = p.backing_mm + float(height_mm.max()) + 1.0
    body = field ^ m3.Manifold.extrude(outline, zmax)
    info = {"outline_area_mm2": outline.area()}
    lr = loop_ring(outline, p)
    if lr is not None:
        ring, hole = lr
        body = body + m3.Manifold.extrude(ring, p.backing_mm)
        body = body - m3.Manifold.extrude(hole, zmax)
        info["hole_centre_mm"] = hole.bounds()
    if body.status() != m3.Error.NoError:
        raise RuntimeError(f"Boolean result not manifold: {body.status()}")
    (bx0, by0), (bx1, by1) = _bounds(outline)
    body = body.translate((-(bx0 + bx1) / 2, -(by0 + by1) / 2, 0))  # centre on the bed
    info.update(volume_mm3=body.volume(), triangles=body.num_tri(), genus=body.genus())
    return body, info


def to_trimesh(m: m3.Manifold):
    import trimesh
    mesh = m.to_mesh()
    return trimesh.Trimesh(np.asarray(mesh.vert_properties[:, :3], dtype=np.float64),
                           np.asarray(mesh.tri_verts, dtype=np.int64), process=False)
