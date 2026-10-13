"""Trace a Grinch pose from an approved ornament picture.

Traces every coloured region of the figure: the picture shows the finished ornament (black base
outline, hanger ring, the figure, and the name in bubble letters underneath). The name is cut off at
`crop` (the top of the letters, in pixels); the generator draws the real name on its own.

  python trace_figure.py list <picture.png>                      # component overview, pick the crop row
  python trace_figure.py gen <picture.png> <out.ts> --crop <y> [--mmpx 0.066] [--bottom -14.3]
  python trace_figure.py regen <poses.json> <out-dir>              # every pose from its recorded settings

Output: a TS module exporting GREEN / RED / WHITE as `Shape[]` (outer outline + holes) in reference mm:
x from the figure's centre line, y with the figure's lowest coloured pixel at `--bottom`, +Y up, at a
fixed `--mmpx` scale (pictures of one set share their framing, so the heads come out the same size
whatever each pose spreads to). Yellow (eyes) is folded into WHITE so a pose prints with four filaments.

Black is the base showing through between the colours — but only there. Every black mark INSIDE one
colour (fur strokes, the mouth, finger lines, eyes, brows, pupils, the nose, sunglasses, the suit's
folds) would be a pit down to the base if traced as a gap, chopping the colour into islands; so each
colour is made whole and its marks are exported as black line-work printed ON it (BLACK_ON_GREEN /
BLACK_ON_WHITE / BLACK_ON_RED), thin lines widened so they print. Only the outlines between colours and
around the figure stay as gaps.
"""
import json
import os
import sys
import cv2
import numpy as np

SOLID_PX = 19        # black narrower than this is a line, wider is a solid shape (eyes, nose)
EDGE_PX = 25         # solid black this close to the background is the ornament's outline, not a detail
MIN_SOLID_PX = 400   # smaller solid blobs are specks of the picture
LINE_PX = 31         # black narrower than this inside a colour is its line-work (the colour heals across it)
SEP_PX = 14          # black this close to another colour or the background is an outline between them
THICKEN_PX = 3       # raised line-work is widened by this on each side so it prints (≥ 0.8 mm)
MIN_MARK_PX = 60     # smaller marks are specks: healed over, not raised


def classes(im):
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    return {
        'white':  (r > 200) & (g > 200) & (b > 200),
        'red':    (r > 170) & (g < 90) & (b < 90),
        'green':  (g > 150) & (r < 200) & (b < 110) & (g - r > 20) & (g - b > 80),
        'yellow': (r > 200) & (g > 170) & (b < 170) & (r - b > 60) & (g - b > 40),
        'black':  (r < 70) & (g < 70) & (b < 70),
    }


def ellipse(px):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (px, px))


def solid_black(C, background, crop_y):
    """Solid black shapes inside the figure, each with the colour it sits on: [(mask, colour)]."""
    black = C['black'].astype(np.uint8)
    if crop_y is not None:
        black[crop_y:, :] = 0
    thick = cv2.morphologyEx(black, cv2.MORPH_OPEN, ellipse(SOLID_PX))
    near_edge = cv2.dilate(background.astype(np.uint8), ellipse(EDGE_PX)).astype(bool)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(thick, 8)
    out = []
    for i in range(1, n):
        if stats[i][4] < MIN_SOLID_PX:
            continue
        core = lab == i
        if (core & near_edge).any():
            continue
        region = C['black'] & cv2.dilate(core.astype(np.uint8), ellipse(13)).astype(bool)   # the shape and its anti-aliased corners
        ring = cv2.dilate(region.astype(np.uint8), ellipse(17)).astype(bool) & ~region
        counts = {col: int((C[col] & ring).sum()) for col in ('green', 'white', 'red')}
        colour = max(counts, key=counts.get)
        if counts[colour] == 0:
            continue
        out.append((region, colour))
    return out


def line_work(C, colour, background, crop_y):
    """Black marks inside `colour`: black within its healed region, clear of every other colour and the background."""
    mask = C[colour].astype(np.uint8)
    territory = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, ellipse(LINE_PX)).astype(bool) | C[colour]
    others = background.copy()
    for col in ('green', 'white', 'red'):
        if col != colour:
            others |= C[col]
    near_other = cv2.dilate(others.astype(np.uint8), ellipse(2 * SEP_PX + 1)).astype(bool)
    black = C['black'].copy()
    if crop_y is not None:
        black[crop_y:, :] = False
    marks = (black & territory & ~near_other).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(marks, 8)
    raised = np.zeros_like(marks, dtype=bool)
    for i in range(1, n):
        if stats[i][4] >= MIN_MARK_PX:
            raised |= lab == i
    return marks.astype(bool), raised, near_other


def load(path, crop_y=None):
    im = cv2.imread(path)
    if im is None:
        sys.exit(f"cannot read {path}")
    im = cv2.cvtColor(im, cv2.COLOR_BGR2RGB).astype(int)
    C = classes(im)
    # The background is the white that touches the picture border.
    n, lab = cv2.connectedComponents(C['white'].astype(np.uint8), connectivity=8)
    border = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1])
    background = np.zeros(im.shape[:2], dtype=bool)
    for b in border:
        if b:
            background |= lab == b
    C['white'] &= ~background
    C['white'] |= C['yellow']
    del C['yellow']
    if crop_y is not None:
        for m in C.values():
            m[crop_y:, :] = False
    figure = C['red'] | C['green']
    top = int(np.where(figure.any(axis=1))[0].min())
    C['white'][:top, :] = False      # white above the figure is the hanger ring's hole, not a piece
    # Black inside a colour is its line-work: the colour is made whole and the marks are printed on it,
    # thin lines widened so they print. Solid shapes near another colour (pupils in an eye) go with the
    # colour that surrounds them most.
    fills, details = {}, {}
    for colour in ('green', 'white', 'red'):
        marks, raised, near_other = line_work(C, colour, background, crop_y)
        thick = cv2.dilate(raised.astype(np.uint8), ellipse(2 * THICKEN_PX + 1)).astype(bool)
        fills[colour] = marks | thick
        details[colour] = thick & ~cv2.dilate(near_other.astype(np.uint8), ellipse(1)).astype(bool)
    for region, colour in solid_black(C, background, crop_y):
        fills[colour] |= region
        details[colour] |= region
    for colour in ('green', 'white', 'red'):
        C[colour] |= fills[colour]
    del C['black']
    for colour, m in details.items():
        C[f'black_on_{colour}'] = m
    allc = C['red'] | C['green'] | C['white']
    ys, xs = np.where(allc)
    return C, dict(x0=int(xs.min()), x1=int(xs.max()), y0=int(ys.min()), y1=int(ys.max()))


def comps(mask, min_area):
    n, lab, stats, cents = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    out = []
    for i in range(1, n):
        x, y, w, h, a = stats[i]
        if a >= min_area:
            out.append(dict(i=i, x=int(x), y=int(y), w=int(w), h=int(h), a=int(a), lab=lab))
    return sorted(out, key=lambda c: -c['a'])


def contours(c, eps):
    m = (c['lab'] == c['i']).astype(np.uint8)
    cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    outer, holes = None, []
    for k, cnt in enumerate(cs):
        ap = [(float(p[0][0]), float(p[0][1])) for p in cv2.approxPolyDP(cnt, eps, True)]
        if len(ap) < 3:
            continue
        if hier[0][k][3] == -1:
            if outer is None or cv2.contourArea(cnt) > outer[1]:
                outer = (ap, cv2.contourArea(cnt))
        elif cv2.contourArea(cnt) > 40:
            holes.append(ap)
    return (outer[0] if outer else None), holes


def cmd_list(path):
    C, bb = load(path)
    print(f"coloured extent x[{bb['x0']},{bb['x1']}] y[{bb['y0']},{bb['y1']}]  (width {bb['x1'] - bb['x0']} px)")
    for col, mask in C.items():
        print(col)
        for c in comps(mask, 1500 if not col.startswith('black') else 300)[:14]:
            print(f"  idx {c['i']:<4d} area {c['a']:7d}  x[{c['x']},{c['x'] + c['w']}] y[{c['y']},{c['y'] + c['h']}]")


EXPORTS = [('green', 'GREEN'), ('red', 'RED'), ('white', 'WHITE'),
           ('black_on_green', 'BLACK_ON_GREEN'), ('black_on_white', 'BLACK_ON_WHITE'), ('black_on_red', 'BLACK_ON_RED')]


def cmd_gen(path, out_path, crop_y, mm, bottom_mm, name):
    C, bb = load(path, crop_y)
    cx = (bb['x0'] + bb['x1']) / 2
    to_mm = lambda p: (round((p[0] - cx) * mm, 2), round(bottom_mm + (bb['y1'] - p[1]) * mm, 2))
    fmt = lambda pts: "[" + ", ".join(f"[{x}, {y}]" for x, y in (to_mm(p) for p in pts)) + "]"
    min_area = int(0.6 / (mm * mm))     # ≥ 0.6 mm²: smaller specks never survive the printability opening
    lines = [f"// Generated from the approved '{name}' picture by .claude/skills/add-grinch-pose/scripts/trace_figure.py — do not edit by hand.",
             f"// Reference mm: x from the figure's centre line, lowest coloured point at y {bottom_mm}, +Y up; {mm} mm per pixel.",
             "import type { Shape } from '../figure';", ""]
    counts = {}
    for col, const in EXPORTS:
        shapes = []
        for c in comps(C[col], min_area):
            outer, holes = contours(c, 1.2)
            if outer is None:
                continue
            shapes.append("{ outer: " + fmt(outer) + ", holes: [" + ", ".join(fmt(h) for h in holes) + "] }")
        counts[const] = len(shapes)
        lines.append(f"export const {const}: Shape[] = [" + ", ".join(shapes) + "];")
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")
    details = ", ".join(f"{k.lower().replace('black_on_', 'on ')} {v}" for k, v in counts.items() if k.startswith('BLACK') and v)
    print(f"wrote {out_path}  ({round((bb['x1'] - bb['x0']) * mm, 1)} wide, top y {to_mm((0, bb['y0']))[1]}; black details: {details or 'none'})")


def cmd_regen(json_path, out_dir):
    poses = json.load(open(json_path, encoding='utf-8'))
    pictures = os.path.dirname(os.path.abspath(json_path))
    for pid, p in poses.items():
        cmd_gen(os.path.join(pictures, p['picture']), os.path.join(out_dir, f"{pid}.ts"), p['crop'], p.get('mmpx', 0.066), p.get('bottom', -14.3), pid)


if __name__ == '__main__':
    a = sys.argv[1:]
    opt = lambda flag, default: type(default)(a[a.index(flag) + 1]) if flag in a else default
    if len(a) >= 2 and a[0] == 'list':
        cmd_list(a[1])
    elif len(a) >= 3 and a[0] == 'gen':
        name = opt('--name', os.path.splitext(os.path.basename(a[1]))[0])
        cmd_gen(a[1], a[2], opt('--crop', 0) or None, opt('--mmpx', 0.066), opt('--bottom', -14.3), name)
    elif len(a) >= 3 and a[0] == 'regen':
        cmd_regen(a[1], a[2])
    else:
        print(__doc__)
        sys.exit(1)
