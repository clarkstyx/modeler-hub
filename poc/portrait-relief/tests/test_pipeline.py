"""Runs the deterministic part of the pipeline on a synthetic head. No models, no network."""
import numpy as np
import cv2

from relief import relief_math, mesh, checks, backends, matting


def synthetic_mask(H=400, W=320):
    m = np.zeros((H, W), np.float32)
    cv2.ellipse(m, (160, 150), (95, 120), 0, 0, 360, 1, -1)
    cv2.rectangle(m, (30, 250), (290, 400), 1, -1)
    return m


def test_poisson_roundtrip():
    rng = np.random.default_rng(0)
    d = cv2.GaussianBlur(rng.random((64, 48)).astype(np.float32), (0, 0), 3)
    gx, gy = relief_math.forward_gradients(d)
    h = relief_math.poisson_neumann(gx, gy)
    assert np.abs((h - h.mean()) - (d - d.mean())).max() < 1e-5


def test_compression_keeps_small_gradients():
    gx = np.array([[0.001, 0.1]], np.float32); gy = np.zeros((0, 2), np.float32)
    cx, _ = relief_math.compress_gradients(gx, gy, alpha=0.01, beta=0.5)
    assert np.isclose(cx[0, 0], 0.001)
    assert cx[0, 1] < 0.1 and cx[0, 1] > 0.01


def test_relief_and_solid():
    mask = synthetic_mask()
    dr = backends.synthetic(None, mask)
    coarse = relief_math.relief_from_depth(dr.depth, mask, alpha=0.02, beta=0.6)
    assert coarse.min() == 0 and coarse.max() <= 1
    cy, cx = 165, 160  # nose area vs cheek
    assert coarse[cy, cx] > coarse[cy, 90]
    lum = np.full(mask.shape, 0.5, np.float32)
    det = relief_math.detail_layer(lum, mask, strength_mm=0.1)
    hm = relief_math.compose_height(coarse, det, mask, relief_mm=2.5, feather_px=4)
    assert 2.0 < hm.max() <= 2.6
    p = mesh.ReliefParams(pitch_mm=0.25, backing_mm=3.0, loop="top", hole_mm=5, loop_wall_mm=2.5)
    body, info = mesh.build_solid(hm, mask, p)
    tm = mesh.to_trimesh(body)
    rep = checks.solid_checks(tm, info, p.hole_mm, p.loop_wall_mm)
    assert rep["manifold_pass"], rep
    assert rep["euler"] == 0, "one keyring hole means genus 1 (Euler number 0)"
    assert rep["bbox_mm"][2] > 3.0 + 2.0  # backing + relief


def test_no_loop_is_genus_0():
    mask = synthetic_mask()
    hm = relief_math.compose_height(backends.synthetic(None, mask).depth / 1.25, np.zeros_like(mask), mask, relief_mm=2.0, feather_px=3)
    body, info = mesh.build_solid(hm, mask, mesh.ReliefParams(pitch_mm=0.3, loop="none"))
    tm = mesh.to_trimesh(body)
    assert tm.is_watertight and tm.euler_number == 2


def test_clean_alpha_drops_specks_and_fills_pinholes():
    a = synthetic_mask()
    a[10, 10] = 1.0            # speck
    a[150, 160] = 0.0          # pinhole
    c = matting.clean_alpha(a, pitch_mm=0.15)
    assert c[10, 10] < 0.5 and c[150, 160] > 0.5
