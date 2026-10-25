#!/usr/bin/env python
"""Portrait Relief PoC: one photo -> relief STL/3MF per depth backend and detail setting.

Example (Windows, inside the venv):
    python relief.py photo.jpg --backends dav2-small,synthetic --detail 0,0.1,0.2 --out out
See README.md. Nothing here touches the hub modelers.
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np
import cv2

from relief import intake, matting, backends, landmarks, relief_math, mesh, checks, report


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("photo")
    ap.add_argument("--out", default="out")
    ap.add_argument("--backends", default="dav2-small", help="comma list: synthetic,dav2-small,dav2-small-torch,da3-small,da3-base,da3-mono-large,moge2,file:<png>,file-inv:<png>")
    ap.add_argument("--matting", default="birefnet", help="birefnet | mediapipe | png | file:<mask.png>")
    ap.add_argument("--detail", default="0,0.1,0.2", help="comma list of detail-layer strengths in mm")
    ap.add_argument("--height", type=float, default=90.0, help="overall height of the portrait crop in mm (before the border and loop)")
    ap.add_argument("--relief", type=float, default=2.5, help="relief depth in mm (1-3)")
    ap.add_argument("--backing", type=float, default=3.5, help="flat backing thickness in mm")
    ap.add_argument("--border", type=float, default=0.6, help="flat rim outside the silhouette in mm")
    ap.add_argument("--pitch", type=float, default=0.15, help="height-field grid spacing in mm (0.1 = finer, slower)")
    ap.add_argument("--loop", default="top", choices=["top", "left", "right", "none"])
    ap.add_argument("--hole", type=float, default=5.0)
    ap.add_argument("--loop-wall", type=float, default=2.5)
    ap.add_argument("--alpha", type=float, default=0.02, help="gradient threshold (normalised depth per px) above which jumps are compressed")
    ap.add_argument("--beta", type=float, default=0.6, help="compression exponent: 1 = none, 0.5 = strong")
    ap.add_argument("--smooth", type=float, default=1.0, help="Gaussian sigma (px) on the depth before relief")
    ap.add_argument("--feather", type=float, default=0.8, help="silhouette fall-off width in mm")
    ap.add_argument("--layer", type=float, default=0.08, help="print layer height used for the stair estimate")
    ap.add_argument("--no-crop", action="store_true")
    ap.add_argument("--no-3mf", action="store_true")
    a = ap.parse_args()

    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    it = intake.prepare(a.photo, height_mm=a.height, pitch_mm=a.pitch, pad_mm=a.border + 1.5 + (a.hole if a.loop != "none" else 0), crop=not a.no_crop)
    for w in it.warnings:
        print("WARNING:", w)
    print("intake:", json.dumps(it.info))
    cv2.imwrite(str(out / "00_crop.png"), cv2.cvtColor(it.rgb, cv2.COLOR_RGB2BGR))

    alpha, minfo = matting.run_matting(a.matting, it.rgb, it.alpha_png)
    alpha = matting.clean_alpha(alpha, a.pitch)
    print("matting:", json.dumps(minfo))
    cv2.imwrite(str(out / "01_alpha.png"), (alpha * 255).astype(np.uint8))
    protect = landmarks.protect_mask(it.face, alpha.shape, dilate_px=max(1, int(0.4 / a.pitch)))
    lum = cv2.cvtColor(it.rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0
    feather_px = max(1, int(round(a.feather / a.pitch)))
    params = mesh.ReliefParams(pitch_mm=a.pitch, backing_mm=a.backing, border_mm=a.border, loop=a.loop,
                               hole_mm=a.hole, loop_wall_mm=a.loop_wall)
    details = [float(x) for x in a.detail.split(",") if x.strip()]
    records: list[dict] = []
    sheet: list[tuple[str, list[np.ndarray]]] = [("input | alpha | protect", [it.rgb, (alpha * 255).astype(np.uint8), (protect * 255).astype(np.uint8)])]

    for name in [b.strip() for b in a.backends.split(",") if b.strip()]:
        try:
            dr = backends.run_backend(name, it.rgb, alpha)
        except Exception as e:  # keep going with the other backends
            print(f"backend {name} FAILED: {e}")
            records.append({"variant": name, "error": str(e)[:200]})
            continue
        tag = name.replace(":", "_").replace("/", "_").replace("\\", "_")
        report.save_png16(out / f"02_depth_{tag}.png", report.to_u8(dr.depth).astype(np.float32), 257)
        coarse = relief_math.relief_from_depth(dr.depth, alpha, alpha=a.alpha, beta=a.beta, smooth_px=a.smooth)
        for det in details:
            vname = f"{tag}_d{det:g}"
            t1 = time.time()
            detail = relief_math.detail_layer(lum, alpha, strength_mm=det, radius_px=max(2, int(0.8 / a.pitch)), protect=protect)
            hm = relief_math.compose_height(coarse, detail, alpha, relief_mm=a.relief, feather_px=feather_px)
            report.save_png16(out / f"03_height_{vname}.png", hm, 65535 / max(a.relief + 0.5, 1e-6))
            rec = {"variant": vname, "backend": name, "detail_mm": det, "depth_seconds": round(dr.seconds, 2), **dr.meta}
            rec.update(checks.landmark_ordering(hm, it.face))
            rec.update(checks.range_used(hm, alpha, it.face, a.relief))
            rec.update(checks.stair_estimate(hm, it.face, a.layer))
            rec.update(checks.thin_features(alpha, a.pitch))
            rec.update(checks.overhang(hm, a.pitch))
            try:
                body, info = mesh.build_solid(hm, alpha, params)
                tm = mesh.to_trimesh(body)
                rec.update(checks.solid_checks(tm, info, a.hole, a.loop_wall))
                tm.export(out / f"04_{vname}.stl")
                if not a.no_3mf:
                    try:
                        tm.export(out / f"04_{vname}.3mf")
                    except Exception as e:
                        (out / f"04_{vname}.3mf").unlink(missing_ok=True)
                        rec["3mf"] = f"skipped: {e}"
            except Exception as e:
                rec["mesh_error"] = str(e)[:200]
            rec["seconds_total"] = round(time.time() - t1 + dr.seconds, 2)
            records.append(rec)
            shaded = report.shade(hm, a.pitch)
            cv2.imwrite(str(out / f"05_render_{vname}.png"), shaded)
            sheet.append((f"{vname}  depth | height | shaded", [report.to_u8(dr.depth), report.to_u8(hm), shaded]))
            print(f"{vname}: ordering={rec.get('ordering_pass', 'n/a')} face_range={rec.get('face_range_frac', 'n/a')} "
                  f"manifold={rec.get('manifold_pass', 'n/a')} tris={rec.get('triangles', 'n/a')}")

    report.contact_sheet(sheet, out / "contact.png")
    report.write_csv(out / "report.csv", records)
    with open(out / "run.json", "w") as f:
        json.dump({"args": vars(a), "intake": it.info, "matting": minfo, "warnings": it.warnings,
                   "seconds": round(time.time() - t0, 1)}, f, indent=2)
    print(f"done in {time.time() - t0:.1f}s -> {out}/contact.png, report.csv")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
