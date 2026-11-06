# Trace a flat-colour charm picture into an SVG for the Icon Bead Modeler.
#   python3 scripts/trace-charm.py <picture> <out.svg> <colours incl. outline> [allwhite]
# Needs: pip install numpy pillow opencv-python-headless vtracer
# Turn a flat-colour cartoon picture into a charm SVG: quantize to <=4 colours
# (white background removed), clean each mask, trace with vtracer.
import sys, os, re, numpy as np, cv2, vtracer
from PIL import Image

def quantize(img_path, k, out_png, bg_white=True, all_white=False):
    im = Image.open(img_path).convert("RGBA")
    if max(im.size) < 600:  # a small preview (e.g. Canva's 200 px thumbnail): upscale smoothly first
        from PIL import ImageFilter
        im = im.resize((800, 800), Image.LANCZOS).filter(ImageFilter.MedianFilter(7))
    im.thumbnail((800, 800))
    a = np.array(im).astype(np.float32)
    alpha = a[..., 3] > 128
    rgb = a[..., :3]
    # treat near-white as background when the picture has no alpha
    if bg_white and alpha.all():
        # background = the near-white area connected to the picture's edge
        white = ((rgb.min(axis=2) > 185) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 25)).astype(np.uint8)  # white or light grey (checkerboard)
        n, lab_cc = cv2.connectedComponents(white)
        edge = set(lab_cc[0, :]) | set(lab_cc[-1, :]) | set(lab_cc[:, 0]) | set(lab_cc[:, -1])
        bg = np.isin(lab_cc, [e for e in edge if e != 0])
        fg = ~bg
        if all_white: fg = fg & ~(white > 0)
    else:
        fg = alpha
    px = rgb[fg]
    # k-means on foreground pixels
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5)
    _, labels, centers = cv2.kmeans(px, k, None, crit, 5, cv2.KMEANS_PP_CENTERS)
    centers = np.round(centers).astype(np.uint8)
    # majority-vote the colour map in a small window (background doesn't vote) so boundary
    # slivers (anti-aliased pixels that landed in a third colour) join their neighbours
    labmap = np.full(a.shape[:2], -1, np.int32); labmap[fg] = labels.ravel()
    votes = np.stack([cv2.boxFilter((labmap == i).astype(np.float32), -1, (5, 5), normalize=False) for i in range(k)])
    labels = votes.argmax(axis=0)[fg].astype(np.int32).reshape(-1, 1)
    out = np.zeros(a.shape[:2] + (4,), np.uint8)
    out[fg, :3] = centers[labels.ravel()]
    out[fg, 3] = 255
    # fill tiny holes / remove specks in the alpha so the edge is clean
    m = out[..., 3]
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    # pixels that became opaque after closing: take nearest colour (median filter)
    lab = np.full(a.shape[:2], -1, np.int32); lab[fg] = labels.ravel()
    newly = (m > 0) & ~fg
    if newly.any():
        # nearest labelled pixel via distance transform indices
        dist, idx = cv2.distanceTransformWithLabels((~fg).astype(np.uint8), cv2.DIST_L2, 3, labelType=cv2.DIST_LABEL_PIXEL)
        ys, xs = np.nonzero(fg); pix_lab = {}
        # map label id -> label colour
        lab_ids = idx[fg]; src = np.zeros(lab_ids.max() + 1, np.int32); src[lab_ids] = lab[fg]
        out[newly, :3] = centers[src[idx[newly]]]
    out[..., 3] = np.where(m > 0, 255, 0)
    # smooth colour regions a bit: majority filter per label map
    Image.fromarray(out).save(out_png)
    return [tuple(c) for c in centers]

def trace(png, svg, mode="spline"):
    vtracer.convert_image_to_svg_py(png, svg, colormode="color", hierarchical="stacked",
        mode=mode, filter_speckle=12, color_precision=8, layer_difference=48,
        corner_threshold=60, length_threshold=4.0, max_iterations=10, splice_threshold=45, path_precision=1)

if __name__ == "__main__":
    src, dst, k = sys.argv[1], sys.argv[2], int(sys.argv[3])
    png = dst + ".q.png"
    cols = quantize(src, k, png, all_white=len(sys.argv) > 4)
    trace(png, dst)
    s = open(dst).read()
    def snap(m):
        c = tuple(int(m.group(1)[i:i+2], 16) for i in (0, 2, 4))
        best = min(cols, key=lambda p: sum((int(a)-b)**2 for a, b in zip(p, c)))
        return 'fill="#%02X%02X%02X"' % tuple(int(v) for v in best)
    s = re.sub(r'fill="#([0-9A-Fa-f]{6})"', snap, s)
    open(dst, "w").write(s)
    fills = sorted(set(re.findall(r'fill="(#[0-9A-Fa-f]+)"', s)))
    print(os.path.basename(dst), "colours:", fills)
