"""Remove whole-part colour painting (paint_color) from a Bambu project so each part's own filament
number decides its colour. Usage: python3 -I strip_paint.py in.3mf out.3mf"""
import re, sys, zipfile
src, dst = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename.startswith("3D/") and item.filename.endswith(".model"):
            data = re.sub(rb' paint_color="[0-9A-Fa-f]*"', b"", data)
        zout.writestr(item, data)
