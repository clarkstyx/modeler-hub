"""
Check every part of an OpenSCAD multicolor 3MF and optionally draw a preview picture.

  python3 check_3mf.py model.3mf [preview.png] [iso|top]

Export the 3MF with `openscad --enable=lazy-union` so each color is its own part.
For each part it prints: closed (watertight), zero-area triangle count, volume and size.
Exits with code 1 if any part is not watertight. Needs: pip install numpy trimesh pillow
"""
import re, sys, zipfile
import numpy as np
import trimesh
from PIL import Image, ImageDraw

path = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else None
view = sys.argv[3] if len(sys.argv) > 3 else "iso"
xml = zipfile.ZipFile(path).read("3D/3dmodel.model").decode()
colors = [c[:7] for c in re.findall(r'<base [^>]*displaycolor="(#[0-9A-Fa-f]{6,8})"', xml)]
groups = {g: c[:7] for g, c in re.findall(r'<m:colorgroup id="(\d+)"><m:color color="(#[0-9A-Fa-f]{6,8})"', xml)}
parts = []
for obj in re.findall(r"<object .*?</object>", xml, re.S):
    if "<mesh>" not in obj:
        continue
    name = re.search(r'name="([^"]*)"', obj).group(1)
    v = np.array(re.findall(r'<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"', obj), float)
    tris = re.findall(r'<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"(?: pid="\d+" p1="(\d+)")?', obj)
    f = np.array([t[:3] for t in tris], int)
    p1 = [int(t[3]) if t[3] else 0 for t in tris]
    group = re.search(r'pid="(\d+)"', obj.split(">", 1)[0])
    if group and group.group(1) in groups:  # color group per object (Bambu style)
        col = groups[group.group(1)]
    else:  # base materials per triangle (OpenSCAD style)
        col = colors[max(set(p1), key=p1.count)] if colors else "#888888"
    m = trimesh.Trimesh(v, f, process=False)
    areas = m.area_faces
    parts.append((name, col, m))
    print(f"{name:18s} {col}  tris={len(f):6d} watertight={m.is_watertight} "
          f"zero_area={(areas < 1e-9).sum()} vol={m.volume:9.1f} "
          f"size={np.round(m.extents, 2).tolist()} zmin={m.bounds[0][2]:.3f}")

allv = np.vstack([p[2].vertices for p in parts])
print("overall size (mm):", np.round(allv.max(0) - allv.min(0), 2).tolist())
if not all(m.is_watertight for _, _, m in parts):
    print("FAIL: a part is not watertight")
    sys.exit(1)
if not out:
    sys.exit(0)

# Preview: a simple z-buffer renderer (iso = tilted view, top = straight down).
if view == "iso":
    a, b = np.radians(-30), np.radians(50)
    rz = np.array([[np.cos(a), -np.sin(a), 0], [np.sin(a), np.cos(a), 0], [0, 0, 1]])
    rx = np.array([[1, 0, 0], [0, np.cos(b), -np.sin(b)], [0, np.sin(b), np.cos(b)]])
    R = rx @ rz
else:
    R = np.eye(3)
light = np.array([0.35, 0.45, 0.82]); light /= np.linalg.norm(light)
W = 1000
pts = allv @ R.T
lo, hi = pts[:, :2].min(0), pts[:, :2].max(0)
s = (W - 80) / (hi - lo).max()
off = (np.array([W, W]) - (hi - lo) * s) / 2
zbuf = np.full((W, W), -np.inf)
rgb = np.full((W, W, 3), 245.0)
for name, col, m in parts:
    base = np.array([int(col[i:i + 2], 16) for i in (1, 3, 5)], float)
    p = m.vertices @ R.T
    xy = (p[:, :2] - lo) * s + off
    n = m.face_normals @ R.T
    for tri, nn in zip(m.faces, n):
        if nn[2] <= 1e-9:
            continue
        shade = 0.55 + 0.45 * max(0.0, float(nn @ light))
        c = np.clip(base * shade + 25 * (1 - shade), 0, 255)
        if base.max() < 60:
            c = base + 40 * max(0.0, float(nn @ light))
        q = xy[tri]; z = p[tri, 2]
        x0, y0 = np.floor(q.min(0)).astype(int); x1, y1 = np.ceil(q.max(0)).astype(int)
        x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, W - 1), min(y1, W - 1)
        if x1 < x0 or y1 < y0:
            continue
        X, Y = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (cx, cy) = q
        den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(den) < 1e-12:
            continue
        l1 = ((by - cy) * (X - cx) + (cx - bx) * (Y - cy)) / den
        l2 = ((cy - ay) * (X - cx) + (ax - cx) * (Y - cy)) / den
        l3 = 1 - l1 - l2
        inside = (l1 >= -1e-6) & (l2 >= -1e-6) & (l3 >= -1e-6)
        if not inside.any():
            continue
        zz = l1 * z[0] + l2 * z[1] + l3 * z[2]
        sub = zbuf[y0:y1 + 1, x0:x1 + 1]
        upd = inside & (zz > sub)
        sub[upd] = zz[upd]
        rgb[y0:y1 + 1, x0:x1 + 1][upd] = c
Image.fromarray(rgb[::-1].astype(np.uint8)).save(out)
