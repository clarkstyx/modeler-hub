"""Depth backends behind one tiny interface so the PoC can compare them and the product can swap them.

Convention: every backend returns `depth` as a float32 HxW array where LARGER = CLOSER to the
camera (inverse-depth style, which is what Depth Anything outputs natively). Metric backends are
inverted here. `normals` is optional (HxWx3, camera space) for a later detail-layer upgrade.

Licence status (checkpoint level, see LICENSES.md): dav2-small Apache-2.0, da3-small/base and
da3-mono-large Apache-2.0, moge2 code MIT (confirm the weight card), file: whatever produced it.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import time

import numpy as np
import cv2

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], np.float32)


@dataclass
class DepthResult:
    depth: np.ndarray                     # HxW float32, larger = closer
    normals: np.ndarray | None = None     # HxWx3 or None
    seconds: float = 0.0
    meta: dict = field(default_factory=dict)


def _resize_back(d: np.ndarray, hw: tuple[int, int]) -> np.ndarray:
    return cv2.resize(d.astype(np.float32), (hw[1], hw[0]), interpolation=cv2.INTER_CUBIC)


# ----------------------------------------------------------------------------- synthetic
def synthetic(rgb: np.ndarray, mask: np.ndarray) -> DepthResult:
    """A dome plus a nose bump, for tests and for checking the geometry path without any model."""
    H, W = mask.shape
    ys, xs = np.nonzero(mask > 0.5)
    if ys.size == 0:
        raise ValueError("empty mask")
    cx, cy = xs.mean(), ys.mean() * 0.8
    rx, ry = max(xs.max() - xs.min(), 2) / 2, max(ys.max() - ys.min(), 2) / 2
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    d = np.clip(1 - r ** 2, 0, None) + 0.25 * np.exp(-(((xx - cx) / (rx * 0.12)) ** 2 + ((yy - cy * 1.1) / (ry * 0.2)) ** 2))
    return DepthResult((d * (mask > 0.5)).astype(np.float32), meta={"backend": "synthetic"})


# ----------------------------------------------------------------------------- Depth Anything V2 small (ONNX, CPU-friendly)
def dav2_small_onnx(rgb: np.ndarray, mask: np.ndarray, size: int = 518) -> DepthResult:
    """onnx-community/depth-anything-v2-small (Apache-2.0). Needs onnxruntime + huggingface_hub."""
    import onnxruntime as ort
    from huggingface_hub import hf_hub_download
    path = hf_hub_download("onnx-community/depth-anything-v2-small", "onnx/model.onnx")
    sess = ort.InferenceSession(path, providers=_providers())
    x = cv2.resize(rgb, (size, size), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    x = ((x - IMAGENET_MEAN) / IMAGENET_STD).transpose(2, 0, 1)[None]
    t = time.time()
    out = sess.run(None, {sess.get_inputs()[0].name: x})[0]
    d = np.squeeze(out)
    return DepthResult(_resize_back(d, rgb.shape[:2]), seconds=time.time() - t,
                       meta={"backend": "dav2-small", "providers": sess.get_providers()})


# ----------------------------------------------------------------------------- Depth Anything V2 / 3 via transformers (PyTorch)
def _hf_pipeline_depth(model_id: str, rgb: np.ndarray) -> tuple[np.ndarray, float, dict]:
    from transformers import pipeline
    from PIL import Image
    import torch
    device = 0 if torch.cuda.is_available() else -1
    pipe = pipeline("depth-estimation", model=model_id, device=device)
    t = time.time()
    out = pipe(Image.fromarray(rgb))
    d = np.asarray(out["predicted_depth"]).astype(np.float32)
    d = np.squeeze(d)
    return _resize_back(d, rgb.shape[:2]), time.time() - t, {"device": "cuda" if device == 0 else "cpu"}


def dav2_small_torch(rgb, mask):
    d, s, m = _hf_pipeline_depth("depth-anything/Depth-Anything-V2-Small-hf", rgb)
    return DepthResult(d, seconds=s, meta={"backend": "dav2-small-torch", **m})


def da3(rgb: np.ndarray, mask: np.ndarray, variant: str = "small") -> DepthResult:
    """Depth Anything 3 (ByteDance-Seed). Small/Base/Mono-Large are Apache-2.0; Large/Giant are NOT.

    DA3 ships its own package (see github.com/ByteDance-Seed/Depth-Anything-3, `pip install` per
    its README). The import below follows its README API; if it has moved, run the DA3 demo,
    save the 16-bit depth PNG and use the `file:` backend instead.
    """
    allowed = {"small": "depth-anything/DA3-SMALL", "base": "depth-anything/DA3-BASE",
               "mono-large": "depth-anything/DA3MONO-LARGE"}
    if variant not in allowed:
        raise ValueError(f"da3 variant must be one of {list(allowed)} (Large/Giant are CC BY-NC)")
    try:
        import torch
        from depth_anything_3.api import DepthAnything3  # type: ignore
    except ImportError as e:
        raise RuntimeError("Depth Anything 3 package not installed; see LICENSES.md / README 'DA3'. "
                           "Alternative: export a depth PNG from its demo and use --backends file:<png>") from e
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = DepthAnything3.from_pretrained(allowed[variant]).to(device)
    t = time.time()
    pred = model.inference([rgb])
    d = np.asarray(pred.depth[0], dtype=np.float32)      # metric-ish depth: larger = farther
    d = 1.0 / np.maximum(d, 1e-6)
    return DepthResult(_resize_back(d, rgb.shape[:2]), seconds=time.time() - t,
                       meta={"backend": f"da3-{variant}", "device": device})


# ----------------------------------------------------------------------------- MoGe-2 (depth + normals, PyTorch)
def moge2(rgb: np.ndarray, mask: np.ndarray, model_id: str = "Ruicheng/moge-2-vitl-normal") -> DepthResult:
    """microsoft/MoGe (code MIT; confirm the weight card before selling). Returns depth AND normals."""
    try:
        import torch
        from moge.model.v2 import MoGeModel  # type: ignore
    except ImportError as e:
        raise RuntimeError("MoGe not installed: pip install git+https://github.com/microsoft/MoGe.git") from e
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = MoGeModel.from_pretrained(model_id).to(device).eval()
    x = torch.tensor(rgb / 255.0, dtype=torch.float32, device=device).permute(2, 0, 1)
    t = time.time()
    with torch.no_grad():
        out = model.infer(x)
    depth = out["depth"].detach().cpu().numpy().astype(np.float32)
    valid = out["mask"].detach().cpu().numpy().astype(bool)
    depth[~valid] = np.nanmax(depth[valid]) if valid.any() else 1.0
    inv = 1.0 / np.maximum(depth, 1e-6)
    normals = out["normal"].detach().cpu().numpy().astype(np.float32) if "normal" in out else None
    return DepthResult(inv, normals=normals, seconds=time.time() - t, meta={"backend": "moge2", "device": device})


# ----------------------------------------------------------------------------- depth from a file (any tool: DA3 demo, Marigold, Blender)
def from_file(rgb: np.ndarray, mask: np.ndarray, path: str, invert: bool = False) -> DepthResult:
    """Load a depth PNG/EXR/NPY made elsewhere. 8/16-bit PNG is read as 'larger = closer' unless --invert."""
    p = Path(path)
    if p.suffix.lower() == ".npy":
        d = np.load(p).astype(np.float32)
    else:
        d = cv2.imread(str(p), cv2.IMREAD_UNCHANGED)
        if d is None:
            raise FileNotFoundError(path)
        if d.ndim == 3:
            d = d[..., 0]
        d = d.astype(np.float32)
    if invert:
        d = d.max() - d
    return DepthResult(_resize_back(d, rgb.shape[:2]), meta={"backend": f"file:{p.name}"})


def _providers():
    try:
        import onnxruntime as ort
        avail = ort.get_available_providers()
    except Exception:
        return ["CPUExecutionProvider"]
    order = ["CUDAExecutionProvider", "DmlExecutionProvider", "CPUExecutionProvider"]
    return [p for p in order if p in avail] or ["CPUExecutionProvider"]


def run_backend(name: str, rgb: np.ndarray, mask: np.ndarray) -> DepthResult:
    """Resolve a backend by CLI name: synthetic | dav2-small | dav2-small-torch | da3-small |
    da3-base | da3-mono-large | moge2 | file:<path> | file-inv:<path>."""
    if name == "synthetic":
        return synthetic(rgb, mask)
    if name == "dav2-small":
        return dav2_small_onnx(rgb, mask)
    if name == "dav2-small-torch":
        return dav2_small_torch(rgb, mask)
    if name.startswith("da3-"):
        return da3(rgb, mask, name[4:])
    if name == "moge2":
        return moge2(rgb, mask)
    if name.startswith("file:"):
        return from_file(rgb, mask, name[5:])
    if name.startswith("file-inv:"):
        return from_file(rgb, mask, name[9:], invert=True)
    raise ValueError(f"unknown backend {name!r}")
