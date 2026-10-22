"""MediaPipe Face Landmarker (Apache-2.0): face box for cropping, eye/mouth protection masks and
the landmark-depth-ordering sanity check. Landmarks are estimates: they protect features from
distortion, they do not guarantee likeness."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import urllib.request

import numpy as np
import cv2

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
CACHE = Path(__file__).resolve().parent.parent / "models"

LEFT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
RIGHT_EYE = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466]
LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185]
LIPS_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191]
KEY = {"nose_tip": 1, "upper_lip": 0, "chin": 152, "left_cheek": 50, "right_cheek": 280,
       "left_eye": 159, "right_eye": 386, "left_eye_corner": 33, "right_eye_corner": 263,
       "left_brow": 105, "right_brow": 334, "left_ear": 234, "right_ear": 454, "forehead": 10}


def fetch_model(name: str, url: str) -> str:
    CACHE.mkdir(exist_ok=True)
    p = CACHE / name
    if not p.exists():
        print(f"downloading {url} -> {p}")
        urllib.request.urlretrieve(url, p)
    return str(p)


@dataclass
class Face:
    pts: np.ndarray            # 478x3: x,y in pixels, z relative (negative = closer, MediaPipe convention)
    box: tuple[int, int, int, int]   # x0,y0,x1,y1 of the face oval
    yaw_deg: float
    pitch_deg: float

    def key(self, name: str) -> np.ndarray:
        return self.pts[KEY[name]]


def detect(rgb: np.ndarray) -> Face | None:
    try:
        import mediapipe as mp
        from mediapipe.tasks import python as mpp
        from mediapipe.tasks.python import vision
    except ImportError:
        print("mediapipe not installed: landmark masks and ordering checks are skipped")
        return None
    path = fetch_model("face_landmarker.task", MODEL_URL)
    opts = vision.FaceLandmarkerOptions(base_options=mpp.BaseOptions(model_asset_path=path), num_faces=2,
                                        output_facial_transformation_matrixes=True)
    with vision.FaceLandmarker.create_from_options(opts) as lm:
        res = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)))
    if not res.face_landmarks:
        return None
    if len(res.face_landmarks) > 1:
        print(f"WARNING: {len(res.face_landmarks)} faces found; using the first. One person per portrait.")
    H, W = rgb.shape[:2]
    pts = np.array([[p.x * W, p.y * H, p.z * W] for p in res.face_landmarks[0]], np.float32)
    x0, y0 = pts[:, 0].min(), pts[:, 1].min()
    x1, y1 = pts[:, 0].max(), pts[:, 1].max()
    yaw = pitch = 0.0
    if res.facial_transformation_matrixes:
        M = np.asarray(res.facial_transformation_matrixes[0])[:3, :3]
        yaw = float(np.degrees(np.arctan2(-M[2, 0], np.sqrt(M[0, 0] ** 2 + M[1, 0] ** 2))))
        pitch = float(np.degrees(np.arctan2(M[2, 1], M[2, 2])))
    return Face(pts, (int(x0), int(y0), int(x1), int(y1)), yaw, pitch)


def protect_mask(face: Face | None, shape: tuple[int, int], dilate_px: int = 3) -> np.ndarray:
    """1 over eyes and the mouth interior (teeth), so the detail layer leaves them alone."""
    m = np.zeros(shape, np.uint8)
    if face is None:
        return m.astype(np.float32)
    for idx in (LEFT_EYE, RIGHT_EYE, LIPS_INNER):
        poly = face.pts[idx, :2].astype(np.int32).reshape(-1, 1, 2)
        cv2.fillPoly(m, [poly], 1)
    if dilate_px > 0:
        m = cv2.dilate(m, np.ones((2 * dilate_px + 1, 2 * dilate_px + 1), np.uint8))
    return cv2.GaussianBlur(m.astype(np.float32), (0, 0), max(dilate_px, 1))


def scale_face(face: Face, s: float, offset=(0, 0)) -> Face:
    pts = face.pts.copy()
    pts[:, 0] = (pts[:, 0] - offset[0]) * s
    pts[:, 1] = (pts[:, 1] - offset[1]) * s
    pts[:, 2] *= s
    x0, y0, x1, y1 = face.box
    return Face(pts, (int((x0 - offset[0]) * s), int((y0 - offset[1]) * s), int((x1 - offset[0]) * s), int((y1 - offset[1]) * s)),
                face.yaw_deg, face.pitch_deg)
