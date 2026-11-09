#!/usr/bin/env python3
"""Turn the craft-show booth ad into Etsy listing photos for the DIGITAL letter-charm files.

What it does (all coordinates are in the 1672x941 original):
  1. Removes the two purple heart charms near the top of the PRUDENCE keychain and redraws the two
     red cord strands through the gap (cord texture is borrowed from the keychain loop).
  2. Changes step 2 "PICK YOUR LETTERS" to "PRINT YOUR LETTERS" (Fredoka Bold, colour matched).
  3. Removes all pricing (starburst "ONLY $5 CAD", "UP TO 7 LETTERS", "+$1 CAD PER EXTRA LETTER"),
     rebuilds the background and the purple wave, and adds a yellow ribbon
     "3D PRINT FILES · A–Z + 0–9 · FITS 4 MM PARACORD" and a pill "Cord & spacer beads not included".
  4. Writes ad-clean-wide.jpg (2x, 3344x1882) and ad-clean-square.jpg (2000x2000), quality 90.

Run:  python3 make_listing_ad.py   (from anywhere; paths are relative to this file)
Needs: Pillow, numpy, and the Fredoka Bold font (FONT below).
"""
import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "booth-ad-original.png")
OUT = os.path.join(HERE, "..", "listing-images")
FONT = os.environ.get(
    "FREDOKA_BOLD",
    "/tmp/claude-0/-home-user-modeler-hub/7aaeff39-8e23-50e3-8722-01fe0ed67981/scratchpad/fonts/Fredoka-Bold.ttf",
)
SS = 4  # supersampling for drawn shapes and text

PURPLE_TEXT = (67, 4, 90)       # sampled from "UP TO 7 LETTERS"
YELLOW = (254, 242, 143)        # sampled from the ribbons
PILL_FILL = (254, 248, 232)     # sampled from the old "+$1" pill
PILL_LINE = (74, 12, 110)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- 1. hearts
def heart_mask(size, bbox, rot_deg):
    """Filled heart polygon (classic parametric heart) fitted to bbox, rotated."""
    x0, y0, x1, y1 = bbox
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    sx, sy = (x1 - x0) / 34.0, (y1 - y0) / 30.0
    a = math.radians(rot_deg)
    pts = []
    for i in range(400):
        t = 2 * math.pi * i / 400
        hx = 16 * math.sin(t) ** 3
        hy = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)) - 2
        hx, hy = hx * sx, hy * sy
        rx = hx * math.cos(a) - hy * math.sin(a)
        ry = hx * math.sin(a) + hy * math.cos(a)
        pts.append(((cx + rx) * SS, (cy + ry) * SS))
    m = Image.new("L", (size[0] * SS, size[1] * SS), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return m.resize(size, Image.LANCZOS)


def cord_patch(img, length, width, angle_deg):
    """Straight piece of red paracord taken from the left side of the keychain loop."""
    a = np.asarray(img).astype(int)
    crop = img.crop((1524, 62, 1562, 158))
    c = np.asarray(crop).astype(int)
    red = (c[..., 0] > 140) & (c[..., 1] < 130) & (c[..., 0] - c[..., 2] > 40)
    alpha = Image.fromarray((red * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    patch = crop.convert("RGBA")
    patch.putalpha(alpha)
    bb = alpha.point(lambda v: 255 if v > 128 else 0).getbbox()
    patch = patch.crop((bb[0], 0, bb[2], patch.height))
    patch = patch.resize((width, length), Image.LANCZOS)
    return patch.rotate(angle_deg, resample=Image.BICUBIC, expand=True)


# top edge of the P bead (its purple outline), measured column by column
PX = [1482, 1515, 1530, 1545, 1561]
PY = [324.0, 325.0, 329.0, 333.0, 335.0]


def remove_hearts(img):
    """Repaint the gap between the white beads and the P bead (where the two hearts were) with the
    lilac backdrop, then redraw the two cord strands through it."""
    w, h = img.size
    a = np.asarray(img).astype(float)
    yy = np.arange(h)[:, None].astype(float)
    xx = np.arange(w)[None, :].astype(float)
    # band edges measured on a 5x zoom of the original
    top = np.where(xx < 1537, 283.0, 283.0)                       # bottoms of the two white beads
    p_top = np.where(xx <= 1561, np.interp(xx, PX, PY), 340.0)       # top edge of the P bead
    m = ((yy >= top) & (yy < p_top) & (xx >= 1483) & (xx <= 1581)).astype(float)
    # soften the mask by half a pixel so the edges against bead and P are not jagged
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))).astype(float) / 255
    keep_band = (yy >= top) & (yy < p_top)
    m = m * keep_band
    # backdrop: harmonic (Laplace) fill of the gap from the surrounding backdrop only. Bead and
    # P-bead pixels are not used as boundary values (they are walls), so the lilac on the left and
    # the keychain's soft cast shadow on the right (above at the beads, below at the P) flow
    # smoothly into the gap the way real light would.
    X0, X1, Y0, Y1 = 1462, 1608, 264, 348
    sub_y = yy[Y0:Y1]; sub_x = xx[:, X0:X1]
    t_ = np.where(sub_x < 1537, 283.0, 283.0)
    p_ = np.where(sub_x <= 1561, np.interp(sub_x, PX, PY), 340.0)
    unknown = (sub_y >= t_) & (sub_y < p_) & (sub_x >= 1466) & (sub_x <= 1604)
    wall = ((sub_y < t_) & (sub_x >= 1497) & (sub_x <= 1581)) | ((sub_y >= p_) & (sub_x >= 1478) & (sub_x <= 1561))
    wall &= ~unknown
    f = a[Y0:Y1, X0:X1].copy()
    # start from a row-wise blend so it converges quickly
    for c in range(3):
        f[..., c] = np.where(unknown, f[:, :1, c] * (1 - (sub_x - X0) / (X1 - X0)) + f[:, -1:, c] * ((sub_x - X0) / (X1 - X0)), f[..., c])
    ok = (~wall).astype(float)
    for _ in range(4000):
        acc = np.zeros_like(f); cnt = np.zeros(f.shape[:2])
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            acc += np.roll(np.roll(f * ok[..., None], dy, 0), dx, 1)
            cnt += np.roll(np.roll(ok, dy, 0), dx, 1)
        avg = acc / np.maximum(cnt, 1)[..., None]
        f = np.where(unknown[..., None], avg, f)
    bg = a.copy()
    bg[Y0:Y1, X0:X1] = f
    m = np.zeros((h, w)); m[Y0:Y1, X0:X1] = unknown
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))).astype(float) / 255
    m = np.maximum(m, 0); m[Y0:Y1, X0:X1] *= ~wall
    out = a * (1 - m[..., None]) + bg * m[..., None]
    res = Image.fromarray(out.round().clip(0, 255).astype(np.uint8))
    keep = m > 0.5
    # two cord strands from the white beads down into the P bead (they lean with the keychain)
    for (x_top, y_top, x_bot, y_bot) in ((1516, 276, 1504, 332), (1557, 280, 1540, 334)):
        L = int(math.hypot(x_bot - x_top, y_bot - y_top)) + 6
        ang = math.degrees(math.atan2(x_top - x_bot, y_bot - y_top))
        p = cord_patch(img, L, 15, -ang)
        cx, cy = (x_top + x_bot) / 2, (y_top + y_bot) / 2
        layer = Image.new("RGBA", res.size, (0, 0, 0, 0))
        layer.paste(p, (int(round(cx - p.width / 2)), int(round(cy - p.height / 2))), p)
        la = np.asarray(layer).astype(float)
        la[..., 3] *= m            # only inside the repainted gap, so it slips under bead and P
        sh = Image.fromarray(la[..., 3].astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.5))
        sh = np.roll(np.roll(np.asarray(sh).astype(float), 3, 1), 1, 0) / 255 * 0.30 * m
        base = np.asarray(res).astype(float)
        base = base * (1 - sh[..., None]) + np.array([90, 40, 110]) * sh[..., None]
        al = la[..., 3:4] / 255
        base = base * (1 - al) + la[..., :3] * al
        res = Image.fromarray(base.round().clip(0, 255).astype(np.uint8))
    return res


# ---------------------------------------------------------------- 2. PICK -> PRINT
def text_layer(size, xy, text, font, fill, anchor="ls"):
    lay = Image.new("RGBA", (size[0] * SS, size[1] * SS), (0, 0, 0, 0))
    f = ImageFont.truetype(FONT, font.size * SS)
    ImageDraw.Draw(lay).text((xy[0] * SS, xy[1] * SS), text, font=f, fill=fill, anchor=anchor)
    return lay.resize(size, Image.LANCZOS)


def replace_pick(img):
    a = np.asarray(img).astype(float)
    # "PICK" sits at about x 593..688, y 598..640 on the lilac step pill. Rebuild the pill behind it
    # row by row from the clean pill just right of the word (x 700..760).
    x0, x1, y0, y1 = 596, 694, 594, 631     # PICK ink is x 600..686, y 598..625
    for y in range(y0, y1):
        a[y, x0:x1] = np.median(a[y, 720:800], axis=0)
    res = Image.fromarray(a.round().astype(np.uint8))
    # PICK: cap height 28 px (y 598..625), left edge x=600. Fredoka Bold caps are ~0.69 em tall.
    f = ImageFont.truetype(FONT, 41)
    lay = text_layer(res.size, (600, 626), "PRINT", f, PURPLE_TEXT + (255,))
    res = res.convert("RGBA")
    res.alpha_composite(lay)
    return res.convert("RGB")


# ---------------------------------------------------------------- 3. bottom band
def wave_edge(xs):
    """Top edge of the purple wave. Measured where visible (x<=310 and 1140..1300),
    smoothly bridged (cubic Hermite) where the old pill hid it."""
    left = {0: 902, 40: 896, 80: 893, 120: 891, 160: 891, 200: 894, 240: 898, 280: 904, 310: 909}
    right = {1150: 889, 1190: 886, 1220: 887, 1250: 891, 1280: 899, 1300: 905, 1320: 910}
    kx = sorted(list(left) + list(right))
    ky = [left.get(k, right.get(k)) for k in kx]
    out = np.interp(xs, kx, ky)
    # Hermite bridge between 310 and 1150
    p0, p1, m0, m1 = 909.0, 889.0, 0.17 * 840, -0.12 * 840
    t = np.clip((xs - 310) / 840.0, 0, 1)
    h = (2 * t**3 - 3 * t**2 + 1) * p0 + (t**3 - 2 * t**2 + t) * m0 + (-2 * t**3 + 3 * t**2) * p1 + (t**3 - t**2) * m1
    mid = (xs > 310) & (xs < 1150)
    out[mid] = h[mid]
    return out


def rebuild_bottom(img):
    a = np.asarray(img).astype(float)
    H, W = a.shape[:2]
    Y0 = 692           # just under the step panels (their outline ends at y=687)
    XR = 1318          # right limit above y=848 (banner ended at 1316, keychain starts ~1325)
    XR2 = 1284         # right limit lower down (red cord comes in at ~1290)
    ys = np.arange(Y0, H)
    xs = np.arange(0, XR, dtype=float)
    edge = wave_edge(xs)
    new = a.copy()
    # light backdrop colours per row at the left edge and at the right limit. Below y=885 those
    # columns are inside the wave, so hold the last light colour; smooth over rows so the switch
    # from the x=1318 column to the x=1284 column at y=848 leaves no step.
    Ls, Rs = [], []
    for y in ys:
        yc = min(y, 885)
        Ls.append(a[yc, 1:5].mean(0))
        Rs.append(a[yc, XR:XR + 3].mean(0) if y < 848 else a[yc, XR2:XR2 + 3].mean(0))
    Ls, Rs = np.array(Ls), np.array(Rs)
    k = np.exp(-np.arange(-15, 16) ** 2 / (2 * 6.0 ** 2)); k /= k.sum()
    pad = lambda v: np.pad(v, ((15, 15), (0, 0)), mode="edge")
    Ls = np.stack([np.convolve(pad(Ls)[:, c], k, "valid") for c in range(3)], 1)
    Rs = np.stack([np.convolve(pad(Rs)[:, c], k, "valid") for c in range(3)], 1)
    for i, y in enumerate(ys):
        L, R = Ls[i], Rs[i]
        xr = XR if y < 848 else XR2
        t = np.clip(xs / xr, 0, 1)[:, None]
        light = L[None, :] * (1 - t) + R[None, :] * t
        # purple wave colour: left (150,74,190) drifting to (132,54,173) on the right, as measured
        wl = np.array([147, 71, 186.0]); wr = np.array([132, 54, 173.0])
        wave = wl[None, :] * (1 - t) + wr[None, :] * t
        wave = wave * (1 - 0.03 * np.clip((y - edge[:, None]) / 40, 0, 1))
        d = y - edge[:, None]                       # >0 inside the wave
        k_w = smoothstep(0.3, 1.6, d)               # wave coverage
        k_hl = np.exp(-((d + 0.2) ** 2) / 0.9)      # thin white highlight on the crest, as in the original
        row = light * (1 - k_w) + wave * k_w
        row = row * (1 - 0.8 * k_hl) + 255 * 0.8 * k_hl
        new[y, :XR] = row
    # mask of what we replace: all of x<XR above y 848, x<XR2 below; feather the top 5 rows
    m = np.zeros((H, W))
    m[Y0:848, :XR] = 1
    m[848:, :XR2] = 1
    for i in range(5):
        m[Y0 + i, :XR] = (i + 1) / 6
    # feather the right edge below 848 into the untouched original (only background there)
    for i in range(12):
        m[848:, XR2 - 12 + i] = 1 - (i + 1) / 13
    out = a * (1 - m[..., None]) + new * m[..., None]
    res = Image.fromarray(out.round().clip(0, 255).astype(np.uint8)).convert("RGBA")

    # ---- yellow ribbon with swallow-tail ends, like the title ribbon
    S = SS
    lay = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    rx0, rx1, ry0, ry1, notch = 40, 1290, 716, 812, 26
    rib = [(rx0, ry0), (rx1, ry0), (rx1 - notch, (ry0 + ry1) / 2), (rx1, ry1), (rx0, ry1), (rx0 + notch, (ry0 + ry1) / 2)]
    shadow = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).polygon([(x * S + 0, (y + 5) * S) for x, y in rib], fill=(120, 60, 150, 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(6 * S))
    d.polygon([(x * S, y * S) for x, y in rib], fill=YELLOW + (255,))
    lay = Image.alpha_composite(shadow, lay)

    f1 = ImageFont.truetype(FONT, 47 * S)
    line = "3D PRINT FILES  ·  A–Z + 0–9  ·  FITS 4 MM PARACORD"
    tw = d.textlength(line, font=f1) / S
    cx = (rx0 + rx1) / 2
    ImageDraw.Draw(lay).text((cx * S, ((ry0 + ry1) / 2 + 1) * S), line, font=f1, fill=PURPLE_TEXT + (255,), anchor="mm")

    # ---- cream pill on the wave, like the old "+$1" pill
    f2 = ImageFont.truetype(FONT, 38 * S)
    note = "Cord & spacer beads not included"
    nw = ImageDraw.Draw(lay).textlength(note, font=f2) / S
    px0, px1 = cx - nw / 2 - 40, cx + nw / 2 + 40
    py0, py1 = 846, 912
    sh2 = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    ImageDraw.Draw(sh2).rounded_rectangle((px0 * S, (py0 + 5) * S, px1 * S, (py1 + 5) * S), radius=33 * S, fill=(60, 10, 90, 80))
    sh2 = sh2.filter(ImageFilter.GaussianBlur(5 * S))
    lay = Image.alpha_composite(lay, sh2)
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle((px0 * S, py0 * S, px1 * S, py1 * S), radius=33 * S, fill=PILL_FILL + (255,), outline=PILL_LINE + (255,), width=4 * S)
    d.text((cx * S, ((py0 + py1) / 2 + 1) * S), note, font=f2, fill=PURPLE_TEXT + (255,), anchor="mm")

    lay = lay.resize((W, H), Image.LANCZOS)
    res.alpha_composite(lay)
    print(f"ribbon text width {tw:.0f}px, note width {nw:.0f}px")
    return res.convert("RGB")


# ---------------------------------------------------------------- 4. outputs
def square(wide):
    """2000x2000: the ad centred on a soft lilac backdrop that matches its own edges."""
    W = 2000
    ad = wide.resize((W - 80, round((W - 80) * wide.height / wide.width)), Image.LANCZOS)
    top_c = np.array([243, 229, 250.0])
    bot_c = np.array([214, 186, 238.0])
    t = np.linspace(0, 1, W)[:, None, None]
    bg = (top_c * (1 - t) + bot_c * t) * np.ones((W, W, 3))
    canvas = Image.fromarray(bg.astype(np.uint8)).convert("RGBA")
    # rounded corners + soft shadow so the ad sits on the backdrop like a card
    r = 36
    mask = Image.new("L", (ad.width * SS, ad.height * SS), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, ad.width * SS - 1, ad.height * SS - 1), radius=r * SS, fill=255)
    mask = mask.resize(ad.size, Image.LANCZOS)
    x, y = (W - ad.width) // 2, (W - ad.height) // 2
    sh = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((x, y + 14, x + ad.width, y + ad.height + 14), radius=r, fill=(90, 40, 130, 90))
    sh = sh.filter(ImageFilter.GaussianBlur(22))
    canvas.alpha_composite(sh)
    adr = ad.convert("RGBA")
    adr.putalpha(mask)
    canvas.alpha_composite(adr, (x, y))
    # headline above and the digital-download note below, in the house purple
    d = ImageDraw.Draw(canvas)
    lay = Image.new("RGBA", (W * 2, W * 2), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lay)
    f = ImageFont.truetype(FONT, 92 * 2)
    cy_top = y / 2
    for dx, dy in [(i, j) for i in range(-9, 10, 3) for j in range(-9, 10, 3) if i * i + j * j <= 81]:
        ld.text((W + dx * 2 / 2, cy_top * 2 + dy * 2 / 2), "DIGITAL DOWNLOAD", font=f, fill=(255, 255, 255, 255), anchor="mm")
    ld.text((W, cy_top * 2), "DIGITAL DOWNLOAD", font=f, fill=PURPLE_TEXT + (255,), anchor="mm")
    f2 = ImageFont.truetype(FONT, 62 * 2)
    cy_bot = y + ad.height + (W - y - ad.height) / 2
    ld.text((W, cy_bot * 2), "3D print files – you print the letters yourself", font=f2, fill=PURPLE_TEXT + (255,), anchor="mm")
    lay = lay.resize((W, W), Image.LANCZOS)
    canvas.alpha_composite(lay)
    return canvas.convert("RGB")


def main():
    img = Image.open(SRC).convert("RGB")
    assert img.size == (1672, 941), img.size
    img = remove_hearts(img)
    img = replace_pick(img)
    img = rebuild_bottom(img)
    os.makedirs(OUT, exist_ok=True)
    wide = img.resize((img.width * 2, img.height * 2), Image.LANCZOS)
    wide.save(os.path.join(OUT, "ad-clean-wide.jpg"), quality=90, subsampling=0)
    square(img.resize((img.width * 2, img.height * 2), Image.LANCZOS)).save(
        os.path.join(OUT, "ad-clean-square.jpg"), quality=90, subsampling=0)
    img.save(os.path.join(os.environ.get("DEBUG_DIR", OUT), "_debug-1x.png")) if os.environ.get("DEBUG_DIR") else None
    print("wrote", os.path.abspath(OUT))


if __name__ == "__main__":
    main()
