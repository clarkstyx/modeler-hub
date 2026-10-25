"""Load, orient, check and crop the customer photo to head-and-shoulders at the working resolution."""
from __future__ import annotations

from dataclasses import dataclass
import numpy as np
import cv2
from PIL import Image, ImageOps

from .landmarks import Face, detect, scale_face


@dataclass
class Intake:
    rgb: np.ndarray                 # HxWx3 uint8, working resolution
    alpha_png: np.ndarray | None    # the PNG's own alpha at working resolution, if any
    face: Face | None
    warnings: list[str]
    info: dict


def load_photo(path: str) -> tuple[np.ndarray, np.ndarray | None]:
    im = ImageOps.exif_transpose(Image.open(path))
    alpha = None
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        im = im.convert("RGBA")
        alpha = np.asarray(im)[..., 3].astype(np.float32) / 255.0
    rgb = np.asarray(im.convert("RGB"))
    return rgb, alpha


def prepare(path: str, *, height_mm: float, pitch_mm: float, pad_mm: float = 2.0,
            crop: bool = True, max_yaw: float = 20.0, min_face_px: int = 600) -> Intake:
    rgb, alpha = load_photo(path)
    warnings: list[str] = []
    info = {"source_px": rgb.shape[:2]}
    face = detect(rgb)
    if face is None:
        warnings.append("no face found (or mediapipe missing): no crop, no eye/teeth protection, no ordering check")
    else:
        fw = face.box[2] - face.box[0]
        info.update(face_px=int(fw), yaw_deg=round(face.yaw_deg, 1), pitch_deg=round(face.pitch_deg, 1))
        if fw < min_face_px:
            warnings.append(f"face is only {fw}px wide; ask for a sharper/closer photo (>= {min_face_px}px)")
        if abs(face.yaw_deg) > max_yaw or abs(face.pitch_deg) > max_yaw:
            warnings.append(f"head turned {face.yaw_deg:.0f}/{face.pitch_deg:.0f} deg; reliefs need a near-frontal photo")
    blur = cv2.Laplacian(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY), cv2.CV_64F).var()
    info["sharpness"] = round(float(blur), 1)
    if blur < 60:
        warnings.append(f"photo looks soft (Laplacian var {blur:.0f} < 60)")
    # Crop: head-and-shoulders box around the face oval.
    x_off = y_off = 0
    if crop and face is not None:
        x0, y0, x1, y1 = face.box
        fw, fh = x1 - x0, y1 - y0
        cx = (x0 + x1) / 2
        X0 = int(max(0, cx - 1.6 * fw)); X1 = int(min(rgb.shape[1], cx + 1.6 * fw))
        Y0 = int(max(0, y0 - 0.9 * fh)); Y1 = int(min(rgb.shape[0], y1 + 1.6 * fh))
        rgb = rgb[Y0:Y1, X0:X1]
        if alpha is not None:
            alpha = alpha[Y0:Y1, X0:X1]
        x_off, y_off = X0, Y0
    # Resize so the crop is `height_mm` tall at `pitch_mm` per pixel, then pad for the border.
    rows = int(round(height_mm / pitch_mm))
    s = rows / rgb.shape[0]
    cols = max(8, int(round(rgb.shape[1] * s)))
    rgb = cv2.resize(rgb, (cols, rows), interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
    if alpha is not None:
        alpha = cv2.resize(alpha, (cols, rows), interpolation=cv2.INTER_LINEAR)
    pad = int(np.ceil(pad_mm / pitch_mm))
    rgb = cv2.copyMakeBorder(rgb, pad, pad, pad, pad, cv2.BORDER_REPLICATE)
    if alpha is not None:
        alpha = cv2.copyMakeBorder(alpha, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
    if face is not None:
        face = scale_face(face, s, (x_off, y_off))
        face.pts[:, :2] += pad
        x0, y0, x1, y1 = face.box
        face.box = (x0 + pad, y0 + pad, x1 + pad, y1 + pad)
    info.update(work_px=rgb.shape[:2], pad_px=pad, scale=round(s, 4))
    return Intake(rgb, alpha, face, warnings, info)
