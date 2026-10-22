"""Contact sheet and CSV so every variant can be compared at a glance."""
from __future__ import annotations

import csv
from pathlib import Path
import numpy as np
import cv2


def shade(height_mm: np.ndarray, pitch_mm: float, light=(-0.6, 0.6, 0.55)) -> np.ndarray:
    """Lambert render of the height map with a 45-degree key light: what the print will look like."""
    gy, gx = np.gradient(height_mm, pitch_mm)
    n = np.stack([-gx, gy, np.ones_like(gx)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    L = np.asarray(light, np.float32); L /= np.linalg.norm(L)
    lam = np.clip(n @ L, 0, 1)
    img = (0.15 + 0.85 * lam) * 255
    return img.astype(np.uint8)


def to_u8(a: np.ndarray) -> np.ndarray:
    a = a.astype(np.float32)
    lo, hi = np.percentile(a, [0.5, 99.5])
    return (np.clip((a - lo) / max(hi - lo, 1e-9), 0, 1) * 255).astype(np.uint8)


def save_png16(path: Path, a: np.ndarray, scale: float) -> None:
    cv2.imwrite(str(path), np.clip(a * scale, 0, 65535).astype(np.uint16))


def contact_sheet(rows: list[tuple[str, list[np.ndarray]]], path: Path, cell_w: int = 360) -> None:
    tiles = []
    for label, imgs in rows:
        cells = []
        for im in imgs:
            if im.ndim == 2:
                im = cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)
            else:
                im = cv2.cvtColor(im, cv2.COLOR_RGB2BGR)
            s = cell_w / im.shape[1]
            cells.append(cv2.resize(im, (cell_w, int(im.shape[0] * s))))
        h = max(c.shape[0] for c in cells)
        cells = [cv2.copyMakeBorder(c, 0, h - c.shape[0], 0, 0, cv2.BORDER_CONSTANT, value=(40, 40, 40)) for c in cells]
        row = np.concatenate(cells, 1)
        row = cv2.copyMakeBorder(row, 28, 4, 0, 0, cv2.BORDER_CONSTANT, value=(20, 20, 20))
        cv2.putText(row, label, (6, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)
        tiles.append(row)
    w = max(t.shape[1] for t in tiles)
    tiles = [cv2.copyMakeBorder(t, 0, 0, 0, w - t.shape[1], cv2.BORDER_CONSTANT, value=(20, 20, 20)) for t in tiles]
    cv2.imwrite(str(path), np.concatenate(tiles, 0))


def write_csv(path: Path, records: list[dict]) -> None:
    keys: list[str] = []
    for r in records:
        for k in r:
            if k not in keys:
                keys.append(k)
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=keys)
        w.writeheader()
        for r in records:
            w.writerow(r)
