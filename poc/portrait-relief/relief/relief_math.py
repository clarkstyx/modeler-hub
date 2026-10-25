"""Depth map -> relief height map (millimetres).

The anti-lithophane core: the big shape comes from the depth estimate with its *gradients*
compressed (large jumps squashed, small facial gradients kept) and integrated back with a
Poisson solve; a small shading-derived detail layer rides on top, masked away from eyes/teeth.
Pure NumPy/SciPy/OpenCV so it ports to TypeScript later.
"""
from __future__ import annotations

import numpy as np
import cv2
from scipy.fft import dctn, idctn


def normalise_depth(depth: np.ndarray, mask: np.ndarray, lo: float = 1.0, hi: float = 99.0) -> np.ndarray:
    """Map a 'closer = larger' depth to [0, 1] over the subject; background becomes 0."""
    inside = mask > 0.5
    vals = depth[inside]
    if vals.size < 10:
        raise ValueError("Subject mask is empty; matting failed.")
    a, b = np.percentile(vals, [lo, hi])
    if b - a < 1e-9:
        raise ValueError("Depth map is flat; the backend returned no relief.")
    d = np.clip((depth - a) / (b - a), 0.0, 1.0).astype(np.float32)
    d[~inside] = 0.0
    return d


def forward_gradients(d: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """gx[i, j] = d[i, j+1] - d[i, j];  gy[i, j] = d[i+1, j] - d[i, j]  (one column/row shorter)."""
    gx = d[:, 1:] - d[:, :-1]
    gy = d[1:, :] - d[:-1, :]
    return gx, gy


def compress_gradients(gx: np.ndarray, gy: np.ndarray, alpha: float, beta: float) -> tuple[np.ndarray, np.ndarray]:
    """Fattal/Weyrich-style attenuation: gradients above `alpha` are scaled by (m/alpha)^(beta-1).

    beta = 1 keeps everything, beta = 0 clamps every large gradient to `alpha`. 0.5-0.7 is the
    usual bas-relief range. `alpha` is in normalised-depth units per pixel.
    """
    def att(g):
        m = np.abs(g) + 1e-12
        f = np.where(m > alpha, (m / alpha) ** (beta - 1.0), 1.0)
        return (g * f).astype(np.float32)
    return att(gx), att(gy)


def poisson_neumann(gx: np.ndarray, gy: np.ndarray) -> np.ndarray:
    """Least-squares integrate a gradient field (forward differences) with zero-flux borders.

    Solves lap(h) = div(g) with a DCT-II eigen-decomposition. The result is defined up to a
    constant; callers subtract their own baseline.
    """
    H = gy.shape[0] + 1
    W = gx.shape[1] + 1
    f = np.zeros((H, W), dtype=np.float64)
    f[:, :-1] += gx
    f[:, 1:] -= gx
    f[:-1, :] += gy
    f[1:, :] -= gy
    # The sum of f is zero by construction, so the Neumann problem is consistent.
    F = dctn(f, type=2, norm="ortho")
    i = np.arange(H)[:, None]
    j = np.arange(W)[None, :]
    lam = (2.0 * np.cos(np.pi * i / H) - 2.0) + (2.0 * np.cos(np.pi * j / W) - 2.0)
    lam[0, 0] = 1.0
    Hc = F / lam
    Hc[0, 0] = 0.0
    h = idctn(Hc, type=2, norm="ortho")
    return h.astype(np.float32)


def soft_edge(mask: np.ndarray, feather_px: int) -> np.ndarray:
    """0..1 weight that falls from 1 inside the subject to 0 at its boundary."""
    hard = (mask > 0.5).astype(np.uint8)
    if feather_px <= 0:
        return hard.astype(np.float32)
    dist = cv2.distanceTransform(hard, cv2.DIST_L2, 3)
    return np.clip(dist / float(feather_px), 0.0, 1.0).astype(np.float32)


def relief_from_depth(depth: np.ndarray, mask: np.ndarray, *, alpha: float = 0.02, beta: float = 0.6,
                      smooth_px: float = 1.0, edge_px: int = 3) -> np.ndarray:
    """Coarse relief in [0, 1]: normalised depth -> compressed gradients -> Poisson -> re-normalised."""
    d = normalise_depth(depth, mask)
    if smooth_px > 0:
        d = cv2.GaussianBlur(d, (0, 0), smooth_px)
    inside = (mask > 0.5).astype(np.uint8)
    interior = cv2.erode(inside, np.ones((2 * edge_px + 1, 2 * edge_px + 1), np.uint8))
    gx, gy = forward_gradients(d)
    # Only trust gradients strictly inside the subject: the silhouette jump is handled by the soft edge.
    gx *= np.minimum(interior[:, 1:], interior[:, :-1])
    gy *= np.minimum(interior[1:, :], interior[:-1, :])
    gx, gy = compress_gradients(gx, gy, alpha, beta)
    h = poisson_neumann(gx, gy)
    vals = h[inside > 0]
    lo, hi = np.percentile(vals, [0.5, 99.5])
    h = np.clip((h - lo) / max(hi - lo, 1e-9), 0.0, 1.0).astype(np.float32)
    h[inside == 0] = 0.0
    return h


def detail_layer(lum: np.ndarray, mask: np.ndarray, *, strength_mm: float, radius_px: int = 6,
                 protect: np.ndarray | None = None) -> np.ndarray:
    """Shading-derived high-frequency layer in mm, clamped to +-strength_mm.

    lum is 0..1 luminance. The base is an edge-preserving bilateral filter so skin tone
    boundaries do not become ridges. `protect` (0..1) suppresses it over eyes, teeth and
    specular highlights, which is what keeps this from being a lithophane.
    """
    if strength_mm <= 0:
        return np.zeros_like(lum, dtype=np.float32)
    l8 = (np.clip(lum, 0, 1) * 255).astype(np.uint8)
    base = cv2.bilateralFilter(l8, d=0, sigmaColor=25, sigmaSpace=float(radius_px)).astype(np.float32) / 255.0
    hp = lum.astype(np.float32) - base
    inside = mask > 0.5
    s = float(np.std(hp[inside])) if inside.any() else 1.0
    s = max(s, 0.012)  # ~3 grey levels: flat or quantised regions produce no detail
    det = np.clip(hp / (2.5 * s), -1.0, 1.0) * strength_mm
    # Highlights (specular skin shine) read as 'raised'; cap bright excursions harder.
    det = np.where(det > 0, det * 0.6, det)
    w = inside.astype(np.float32)
    if protect is not None:
        w *= 1.0 - np.clip(protect, 0, 1)
    return (det * w).astype(np.float32)


def compose_height(coarse01: np.ndarray, detail_mm: np.ndarray, mask: np.ndarray, *,
                   relief_mm: float, feather_px: int) -> np.ndarray:
    """Final height above the backing in mm, falling to 0 at the silhouette."""
    h = relief_mm * coarse01 + detail_mm
    h *= soft_edge(mask, feather_px)
    return np.clip(h, 0.0, None).astype(np.float32)
