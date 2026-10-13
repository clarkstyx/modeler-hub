"""Trace an accessory from an approved composite (the dumpling ornament wearing the accessory).

Coordinates are reference mm at the 70 mm width: x from the bun's centre line, y with the eye
centres at FACE.eyeY = 1.8, +Y up. The bun (largest white blob) is taken as 52 mm wide.

  List the coloured pieces (to pick component indices):
    python trace.py list <composite.png>

  Generate a shapes module from a piece map:
    python trace.py gen <composite.png> <pieces.json> <out.ts> [--name <style>]

pieces.json: [{"const": "HAT", "kind": "poly", "colour": "green", "idx": [1]}, ...]
  kind: poly (one outline) | polys (several outlines, one array) | circle ({x, y, r}) | ring (outline with holes)
  colour: white | red | green | blue | brown | yellow | orange  (black is the outline; it cannot be traced)
  idx: component indices as printed by `list` for that colour
"""
import json, os, sys
import cv2
import numpy as np

EYE_Y = 1.8
BUN_W = 52.0


def classes(im):
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    return {
        'white':  (r > 200) & (g > 200) & (b > 200),
        'black':  (r < 60) & (g < 60) & (b < 60),
        'red':    (r > 170) & (g < 90) & (b < 90),
        'green':  (g > 120) & (r < 120) & (b < 130) & (g - r > 50),
        'blue':   (b > 150) & (r < 100) & (b - r > 80),
        'brown':  (r > 120) & (r < 210) & (g > 70) & (g < 150) & (b < 110) & (r - b > 50) & (r - g > 25),
        'yellow': (r > 210) & (g > 180) & (b < 170) & (r - b > 60) & (g - b > 40),
        'orange': (r > 200) & (g > 100) & (g < 180) & (b < 90) & (r - g > 50),
    }


def comps(mask, min_area):
    n, lab, stats, cents = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    out = []
    for i in range(1, n):
        x, y, w, h, a = stats[i]
        if a >= min_area:
            out.append(dict(i=i, x=x, y=y, w=w, h=h, a=a, cx=cents[i][0], cy=cents[i][1], lab=lab))
    return sorted(out, key=lambda c: -c['a'])


def load(path):
    im = cv2.imread(path)
    if im is None:
        sys.exit(f"cannot read {path}")
    im = cv2.cvtColor(im, cv2.COLOR_BGR2RGB).astype(int)
    C = classes(im)
    bun = comps(C['white'], 300)[0]
    mm = BUN_W / bun['w']
    cx = bun['x'] + bun['w'] / 2
    inside = lambda c: bun['x'] < c['cx'] < bun['x'] + bun['w'] and bun['y'] < c['cy'] < bun['y'] + bun['h']
    eyes = sorted([c for c in comps(C['black'], 2000) if c['a'] < 60000 and inside(c)], key=lambda c: -c['a'])[:2]
    if len(eyes) < 2:
        sys.exit("could not find the two eyes inside the bun; is this a composite with the standard face?")
    eye_y = sum(c['cy'] for c in eyes) / 2
    to_mm = lambda p: (round((p[0] - cx) * mm, 2), round(EYE_Y - (p[1] - eye_y) * mm, 2))
    return C, mm, to_mm


def contours(c, eps=1.5):
    m = (c['lab'] == c['i']).astype(np.uint8)
    cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    outer, holes = None, []
    for k, cnt in enumerate(cs):
        ap = [(float(p[0][0]), float(p[0][1])) for p in cv2.approxPolyDP(cnt, eps, True)]
        if hier[0][k][3] == -1:
            if outer is None or cv2.contourArea(cnt) > cv2.contourArea(cs[outer[1]]):
                outer = (ap, k)
        elif cv2.contourArea(cnt) > 200:
            holes.append(ap)
    return outer[0], holes


def cmd_list(path):
    C, mm, to_mm = load(path)
    print(f"mm/px {mm:.4f}  (the steamer ~66 wide, bun 52 wide; pieces below y -8 are usually the steamer/plate)")
    for col, mask in C.items():
        if col == 'black':
            continue
        for c in comps(mask, 150):
            if c['a'] * mm * mm < 0.8:
                continue
            (x0, y1), (x1, y0) = to_mm((c['x'], c['y'])), to_mm((c['x'] + c['w'], c['y'] + c['h']))
            print(f"  {col:6s} idx {c['i']:<4d} area {c['a'] * mm * mm:7.1f}  x[{x0:6.1f},{x1:6.1f}] y[{y0:6.1f},{y1:6.1f}]")


def cmd_gen(path, pieces_path, out_path, name):
    C, mm, to_mm = load(path)
    pieces = json.load(open(pieces_path, encoding='utf-8'))
    by_colour = {col: {c['i']: c for c in comps(C[col], 150)} for col in C if col != 'black'}
    fmt = lambda pts: "[" + ", ".join(f"[{x}, {y}]" for x, y in (to_mm(p) for p in pts)) + "]"
    lines = [f"// Generated from the approved '{name}' composite by .claude/skills/add-dumpling-accessory/scripts/trace.py — do not edit by hand.",
             "// Reference mm: x from the centre line, eye centres at y 1.8, +Y up.",
             "export type Poly = readonly (readonly [number, number])[];", ""]
    for p in pieces:
        try:
            cs = [by_colour[p['colour']][i] for i in p['idx']]
        except KeyError as e:
            sys.exit(f"{p['const']}: no {p['colour']} component {e}; run `list` again")
        kind, const = p['kind'], p['const']
        if kind == 'circle':
            c = cs[0]
            x, y = to_mm((c['cx'], c['cy']))
            lines.append(f"export const {const} = {{ x: {x}, y: {y}, r: {round((c['w'] + c['h']) / 4 * mm, 2)} }};")
        elif kind == 'poly':
            lines.append(f"export const {const}: Poly = {fmt(contours(cs[0])[0])};")
        elif kind == 'polys':
            lines.append(f"export const {const}: Poly[] = [" + ", ".join(fmt(contours(c)[0]) for c in cs) + "];")
        elif kind == 'ring':
            outer, holes = contours(cs[0])
            lines.append(f"export const {const} = {{ outer: {fmt(outer)} as Poly, holes: [" + ", ".join(fmt(h) for h in holes) + "] as Poly[] };")
        else:
            sys.exit(f"{const}: unknown kind {kind}")
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")
    print(f"wrote {out_path} ({len(pieces)} shapes)")


if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) >= 2 and a[0] == 'list':
        cmd_list(a[1])
    elif len(a) >= 4 and a[0] == 'gen':
        name = a[a.index('--name') + 1] if '--name' in a else os.path.splitext(os.path.basename(a[3]))[0]
        cmd_gen(a[1], a[2], a[3], name)
    else:
        print(__doc__)
        sys.exit(1)
