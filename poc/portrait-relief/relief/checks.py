"""Objective checks on the height map and the solid. Nothing is repaired: a failure is reported."""
from __future__ import annotations

import numpy as np
import cv2

from .landmarks import Face

ORDER_RULES = [  # (higher, lower): these must hold on a frontal face relief
    ("nose_tip", "upper_lip"), ("nose_tip", "left_cheek"), ("nose_tip", "right_cheek"),
    ("upper_lip", "chin"), ("left_cheek", "left_eye"), ("right_cheek", "right_eye"),
    ("left_brow", "left_eye"), ("right_brow", "right_eye"),
    ("left_cheek", "left_ear"), ("right_cheek", "right_ear"),
]


def _sample(h: np.ndarray, xy: np.ndarray, r: int = 2) -> float:
    x, y = int(round(xy[0])), int(round(xy[1]))
    y0, y1 = max(0, y - r), min(h.shape[0], y + r + 1)
    x0, x1 = max(0, x - r), min(h.shape[1], x + r + 1)
    return float(h[y0:y1, x0:x1].mean()) if y1 > y0 and x1 > x0 else float("nan")


def landmark_ordering(height_mm: np.ndarray, face: Face | None) -> dict:
    if face is None:
        return {"ordering_checked": False}
    out = {"ordering_checked": True}
    fails = []
    for hi, lo in ORDER_RULES:
        a, b = _sample(height_mm, face.key(hi)), _sample(height_mm, face.key(lo))
        ok = a > b + 0.02
        out[f"{hi}>{lo}"] = round(a - b, 3)
        if not ok:
            fails.append(f"{hi}>{lo}")
    out["ordering_fail"] = ";".join(fails)
    out["ordering_pass"] = len(fails) == 0
    return out


def range_used(height_mm: np.ndarray, mask: np.ndarray, face: Face | None, relief_mm: float) -> dict:
    inside = mask > 0.5
    out = {"height_max_mm": round(float(height_mm[inside].max()), 3)}
    if face is not None:
        x0, y0, x1, y1 = face.box
        fb = height_mm[max(0, y0):y1, max(0, x0):x1]
        if fb.size:
            lo, hi = np.percentile(fb, [2, 98])
            out["face_range_mm"] = round(float(hi - lo), 3)
            out["face_range_frac"] = round(float((hi - lo) / relief_mm), 3)
            out["pillow_face"] = bool((hi - lo) / relief_mm < 0.5)
    return out


def stair_estimate(height_mm: np.ndarray, face: Face | None, layer_mm: float) -> dict:
    """How many layer contours a horizontal line through the cheeks crosses (face-up print)."""
    if face is None:
        return {}
    y = int(face.key("left_cheek")[1])
    x0, x1 = int(face.key("left_ear")[0]), int(face.key("right_ear")[0])
    x0, x1 = max(0, min(x0, x1)), min(height_mm.shape[1], max(x0, x1))
    if x1 - x0 < 4:
        return {}
    row = np.floor(height_mm[y, x0:x1] / layer_mm)
    return {f"cheek_steps_at_{layer_mm}mm": int(np.abs(np.diff(row)).sum())}


def thin_features(mask: np.ndarray, pitch_mm: float, min_mm: float = 0.5) -> dict:
    """Fraction of the silhouette thinner than a nozzle line (lost specks / hair wisps)."""
    hard = (mask > 0.5).astype(np.uint8)
    r = max(1, int(round(min_mm / 2 / pitch_mm)))
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    opened = cv2.morphologyEx(hard, cv2.MORPH_OPEN, k)
    lost = int(hard.sum() - opened.sum())
    return {"thin_px_frac": round(lost / max(1, int(hard.sum())), 4)}


def overhang(height_mm: np.ndarray, pitch_mm: float, max_deg: float = 45.0) -> dict:
    gy, gx = np.gradient(height_mm, pitch_mm)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    return {"slope_p99_deg": round(float(np.percentile(slope, 99)), 1),
            "steep_frac": round(float((slope > max_deg).mean()), 4)}


def solid_checks(tm, info: dict, hole_mm: float, loop_wall_mm: float) -> dict:
    out = {
        "watertight": bool(tm.is_watertight),
        "winding_ok": bool(tm.is_winding_consistent),
        "volume_mm3": round(float(tm.volume), 1),
        "triangles": int(len(tm.faces)),
        "euler": int(tm.euler_number),
        "bbox_mm": [round(float(v), 2) for v in (tm.extents)],
    }
    out["manifold_pass"] = out["watertight"] and out["winding_ok"] and out["volume_mm3"] > 0
    out["hole_ok"] = hole_mm >= 4.0 and loop_wall_mm >= 2.5
    return out
