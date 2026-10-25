"""Subject isolation: soft alpha for hair. BiRefNet portrait (MIT) via ONNX by default."""
from __future__ import annotations

import time
import numpy as np
import cv2

from .backends import IMAGENET_MEAN, IMAGENET_STD, _providers


def birefnet_portrait(rgb: np.ndarray, size: int = 1024) -> tuple[np.ndarray, dict]:
    """onnx-community/BiRefNet-portrait-ONNX. Returns alpha 0..1 at the image size."""
    import onnxruntime as ort
    from huggingface_hub import hf_hub_download
    path = hf_hub_download("onnx-community/BiRefNet-portrait-ONNX", "onnx/model.onnx")
    sess = ort.InferenceSession(path, providers=_providers())
    x = cv2.resize(rgb, (size, size), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    x = ((x - IMAGENET_MEAN) / IMAGENET_STD).transpose(2, 0, 1)[None]
    t = time.time()
    out = sess.run(None, {sess.get_inputs()[0].name: x})
    logits = np.squeeze(out[-1]).astype(np.float32)
    alpha = 1.0 / (1.0 + np.exp(-logits))
    alpha = cv2.resize(alpha, (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_LINEAR)
    return alpha, {"matting": "birefnet-portrait", "seconds": time.time() - t, "providers": sess.get_providers()}


def mediapipe_selfie(rgb: np.ndarray) -> tuple[np.ndarray, dict]:
    """Fallback (Apache-2.0, coarse edges, no hair detail)."""
    import mediapipe as mp
    from mediapipe.tasks import python as mpp
    from mediapipe.tasks.python import vision
    from .landmarks import fetch_model
    path = fetch_model("selfie_segmenter.tflite",
                       "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite")
    opts = vision.ImageSegmenterOptions(base_options=mpp.BaseOptions(model_asset_path=path), output_confidence_masks=True)
    t = time.time()
    with vision.ImageSegmenter.create_from_options(opts) as seg:
        res = seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)))
    alpha = res.confidence_masks[0].numpy_view().astype(np.float32)
    return alpha, {"matting": "mediapipe-selfie", "seconds": time.time() - t}


def clean_alpha(alpha: np.ndarray, pitch_mm: float, min_island_mm2: float = 2.0, hole_mm2: float = 1.0) -> np.ndarray:
    """Drop flyaway specks and fill pinholes smaller than what a 0.4 mm nozzle can print."""
    hard = (alpha > 0.5).astype(np.uint8)
    px_area = pitch_mm * pitch_mm
    n, lab, stats, _ = cv2.connectedComponentsWithStats(hard, 8)
    keep = np.zeros_like(hard)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] * px_area >= min_island_mm2:
            keep[lab == i] = 1
    inv = 1 - keep
    n, lab, stats, _ = cv2.connectedComponentsWithStats(inv, 4)
    for i in range(1, n):
        x, y, w, h, a = stats[i]
        touches = x == 0 or y == 0 or x + w == inv.shape[1] or y + h == inv.shape[0]
        if not touches and a * px_area < hole_mm2:
            keep[lab == i] = 1
    return np.where(keep > 0, np.maximum(alpha, 0.5 + 1e-3), np.minimum(alpha, 0.5 - 1e-3)).astype(np.float32)


def run_matting(method: str, rgb: np.ndarray, alpha_in: np.ndarray | None) -> tuple[np.ndarray, dict]:
    """method: birefnet | mediapipe | png (use the PNG's own alpha) | file:<mask.png>."""
    if method == "birefnet":
        return birefnet_portrait(rgb)
    if method == "mediapipe":
        return mediapipe_selfie(rgb)
    if method == "png":
        if alpha_in is None:
            raise ValueError("--matting png needs a PNG with transparency")
        return alpha_in.astype(np.float32), {"matting": "png-alpha"}
    if method.startswith("file:"):
        m = cv2.imread(method[5:], cv2.IMREAD_GRAYSCALE)
        if m is None:
            raise FileNotFoundError(method[5:])
        m = cv2.resize(m, (rgb.shape[1], rgb.shape[0])).astype(np.float32) / 255.0
        return m, {"matting": method}
    raise ValueError(f"unknown matting {method!r}")
