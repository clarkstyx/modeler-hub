"""
Turn an OpenSCAD multicolor 3MF into one that Bambu Studio and OrcaSlicer open in color.

OpenSCAD (exported with --enable=lazy-union) writes one object per color() part, but it
stores colors as <basematerials>, which Bambu Studio ignores. This rewrites the file with:
  * one <m:colorgroup> per distinct color (OrcaSlicer keeps only the last color of a group),
  * one mesh object per part plus an assembly object, so the parts stay together,
  * Metadata/model_settings.config assigning each color its own filament slot.

usage: python3 openscad_to_bambu_3mf.py in.3mf out.3mf [--name NAME] [--thumbnail top.png]

Only the Python standard library is needed.
"""
import argparse
import re
import zipfile
from collections import Counter
from xml.sax.saxutils import escape, quoteattr

NS_CORE = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
NS_MATERIAL = "http://schemas.microsoft.com/3dmanufacturing/material/2015/02"
REL_MODEL = "http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"
REL_THUMB = "http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail"


def read_parts(path):
    """Returns [(hex_color, vertices_xml, triangles)] in file order."""
    xml = zipfile.ZipFile(path).read("3D/3dmodel.model").decode("utf-8")
    colors = [c[:7].upper() for c in re.findall(r'<base [^>]*displaycolor="(#[0-9A-Fa-f]{6,8})"', xml)]
    parts = []
    for obj in re.findall(r"<object .*?</object>", xml, re.S):
        if "<mesh>" not in obj:
            continue
        vertices = re.findall(r"<vertex [^>]*/>", obj)
        tris = re.findall(r'<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"(?: pid="\d+" p1="(\d+)")?', obj)
        obj_index = re.search(r'pindex="(\d+)"', obj)
        idx = Counter(t[3] for t in tris if t[3]).most_common(1)
        index = int(idx[0][0]) if idx else int(obj_index.group(1)) if obj_index else 0
        hex_color = colors[index] if index < len(colors) else "#808080"
        parts.append((hex_color, vertices, [t[:3] for t in tris]))
    if not parts:
        raise SystemExit("No meshes found. Export from OpenSCAD with --enable=lazy-union.")
    return parts


def build(parts, name):
    slots = []
    for hex_color, _, _ in parts:
        if hex_color not in slots:
            slots.append(hex_color)
    first_object = len(slots) + 1
    assembly_id = first_object + len(parts)
    names = [f"PART_{i + 1:02d}_{hex_color[1:]}" for i, (hex_color, _, _) in enumerate(parts)]

    model = [
        '<?xml version="1.0" encoding="UTF-8"?>\n',
        f'<model unit="millimeter" xml:lang="en-US" xmlns="{NS_CORE}" xmlns:m="{NS_MATERIAL}">\n',
        f' <metadata name="Title">{escape(name)}</metadata>\n',
        ' <metadata name="Application">OpenSCAD + openscad_to_bambu_3mf.py</metadata>\n',
        " <resources>\n",
    ]
    for i, hex_color in enumerate(slots):
        model.append(f'  <m:colorgroup id="{i + 1}"><m:color color="{hex_color}FF"/></m:colorgroup>\n')
    for i, (hex_color, vertices, tris) in enumerate(parts):
        model.append(
            f'  <object id="{first_object + i}" type="model" name={quoteattr(names[i])} '
            f'pid="{slots.index(hex_color) + 1}" pindex="0"><mesh><vertices>'
        )
        model.extend(vertices)
        model.append("</vertices><triangles>")
        model.extend(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in tris)
        model.append("</triangles></mesh></object>\n")
    model.append(f'  <object id="{assembly_id}" type="model" name={quoteattr(name)}><components>')
    model.extend(f'<component objectid="{first_object + i}"/>' for i in range(len(parts)))
    model.append("</components></object>\n </resources>\n")
    model.append(f' <build><item objectid="{assembly_id}"/></build>\n</model>\n')

    config = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        "<config>",
        f'  <object id="{assembly_id}">',
        f"    <metadata key=\"name\" value={quoteattr(name)}/>",
        '    <metadata key="extruder" value="1"/>',
    ]
    for i, (hex_color, _, _) in enumerate(parts):
        config += [
            f'    <part id="{first_object + i}" subtype="normal_part">',
            f"      <metadata key=\"name\" value={quoteattr(names[i])}/>",
            f'      <metadata key="extruder" value="{slots.index(hex_color) + 1}"/>',
            "    </part>",
        ]
    config += ["  </object>", "</config>", ""]
    return "".join(model), "\n".join(config), slots


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--name", default="MODEL")
    ap.add_argument("--thumbnail", help="PNG to embed as the file's preview picture")
    args = ap.parse_args()

    parts = read_parts(args.input)
    model, config, slots = build(parts, args.name)
    rels = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        f'<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="{REL_MODEL}"/>'
        + (f'<Relationship Target="/Metadata/thumbnail.png" Id="rel1" Type="{REL_THUMB}"/>' if args.thumbnail else "")
        + "</Relationships>\n"
    )
    types = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>'
        '<Default Extension="png" ContentType="image/png"/>'
        '<Default Extension="config" ContentType="text/xml"/>'
        "</Types>\n"
    )
    with zipfile.ZipFile(args.output, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", types)
        z.writestr("_rels/.rels", rels)
        z.writestr("3D/3dmodel.model", model)
        z.writestr("Metadata/model_settings.config", config)
        if args.thumbnail:
            z.write(args.thumbnail, "Metadata/thumbnail.png")
    print(f"{args.output}: {len(parts)} parts, filament slots: "
          + ", ".join(f"{i + 1}={c}" for i, c in enumerate(slots)))


if __name__ == "__main__":
    main()
