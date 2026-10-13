# MakerWorld version (OpenSCAD)

This folder holds a **customizable OpenSCAD version** of the Image Keychain Modeler for MakerWorld's
*Parametric Model Maker*. Buyers press **Customize** on MakerWorld, upload their own picture,
change the settings and download a multicolor 3MF. No web app is needed.

| File | What it is |
|---|---|
| `image_keychain.scad` | The model. MakerWorld runs this file. |
| `default.png`, `default.svg` | Sample pictures that show before a buyer uploads their own. MakerWorld only accepts these exact names. |
| `makerworld-listing.txt` | Copy-paste text for every field of the MakerWorld upload form. |
| `preview-iso.png`, `preview-top.png` | Renders of the default model, for extra listing pictures. |
| `sample-keychain.3mf` | The default model as a ready-to-slice multicolor 3MF. Print it to take the listing photo. |
| `tools/` | Scripts to rebuild the previews and sample, and to test many setting combinations. |

## How it differs from the web app

OpenSCAD can't analyse pictures the way the web app does, so the MakerWorld version splits a PNG
into colors by **brightness** (dark to light) instead of by hue. Logos with clearly different
light and dark colors work best. Transparent areas of a PNG read as black, so buyers should use a
white background. SVG pictures come out in one color. The listing text explains this to buyers.

## Publish it on MakerWorld

1. **Print the sample first.** Open `sample-keychain.3mf` in Bambu Studio. Each color is already on its
   own filament slot. Print it and take a photo; MakerWorld requires a photo of a real print.
2. On MakerWorld, start a new upload and choose the **Parametric Model Maker** (customizable
   model) option. It is also reachable from MakerLab. Menu names change now and then.
3. Upload `image_keychain.scad`, plus `default.png` and `default.svg` as its default files.
   If the editor shows code instead, open it with the **Code** button and paste the whole file.
4. Check every settings tab, then press **Generate** with the default settings and with a few
   extreme ones (smallest and largest size, 1 and 4 colors, SVG, no picture). Download one 3MF and
   open it in Bambu Studio to confirm the colors land on separate filaments.
5. Fill the form from `makerworld-listing.txt`: name, summary, category, tags, license,
   description and print profile notes.
6. Add your print photo as the cover picture and the two preview renders as extra pictures.
7. Publish.

Bambu Lab doesn't publish exact limits for the Parametric Model Maker. If a render times out,
try a smaller picture first (about 300 to 600 pixels tall is plenty).

## Edit and test locally (optional)

You need OpenSCAD 2025 or newer ("development snapshot") with the Manifold backend, plus Python
with `numpy`, `trimesh` and `pillow` for the checks.

```bash
openscad --backend=manifold makerworld/image_keychain.scad      # opens the Customizer
makerworld/tools/build.sh makerworld/image_keychain.scad        # rebuild previews + sample, test all variants
```

`build.sh` renders the default model and a list of setting combinations. It checks that every
color part is watertight, redraws `preview-*.png`, and rebuilds `sample-keychain.3mf` with
`tools/openscad_to_bambu_3mf.py`. That script is needed because OpenSCAD writes colors in a form
Bambu Studio ignores.
