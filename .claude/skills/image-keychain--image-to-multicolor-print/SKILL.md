---
name: image-to-multicolor-print
description: Playbook for apps that turn an uploaded image into a multicolor 3D-printable part (trinket trays, keychains, coasters, signs). It covers color detection from logos and photos, printability cleanup in mm, manifold multi-part geometry, the Original / Colors / Processed 2D preview, the three.js 3D preview, text and outline borders, Bambu/Orca-friendly 3MF export, phone upload, and publishing as a claude.ai page. Use when building or fixing any image → multicolor print generator, or when colors go missing, previews look wrong, or exports show non-manifold or repair warnings, or parts of a logo go missing.
---

# Image → multicolor print: what works

These lessons come from building `clarkstyx/Trinket-Tray-Generator` and from upgrading `clarkstyx/image-keychain-modeler`.

Reference code in the tray repo:

- `src/image/` for colors;
- `src/geometry2d/` and `src/tray/` for geometry;
- `src/export/` for 3MF and STL;
- `src/ui/` for the previews.

In the keychain repo, everything is in `src/ImageKeychainModeler.jsx`: imagetracerjs, clipper-lib, and three's `ExtrudeGeometry`.

Each rule below fixed a real bug.

## 1. Color detection (logos and photos)

Pipeline: alpha → background → crop → quantize → clean up labels → trace.

- **Alpha.** Make alpha binary at 128 first. Soft PNG halos otherwise become a fake extra color.
- **Background removal.**
  - Flood-fill from the image border with the border's dominant color, within an RGB tolerance of about 40.
  - Only do this when that color covers **at least 70% of the border**. At 35–40%, a logo that fills the frame loses a real color: the one touching the edge.
  - Never treat "the color nearest the corners" as background by itself.
- **Quantize deterministically.**
  - Bucket colors at 5 bits per channel and run k-means in **Lab** space.
  - Seed with the most common bucket. Then repeatedly add the bucket with the highest `count × distance²` from the existing seeds; logo mode uses `√count`.
  - Use no randomness, so the same image always gives the same palette.
- **Exact flat colors in logo mode.** Report each cluster's most populated bucket, not its mean. Means drift toward the anti-aliased edges.
- **Anti-aliasing fringe** is a blend between two real colors, such as grey where a black outline meets white.
  - Only _rare_ buckets (under 1% of the art) may be skipped as blends when seeding. A real grey between black and white covers real area and must stay a color.
  - After clustering, merge clusters under about 3% that lie on the Lab segment between two other centers (tolerance about 15) into their neighbours. Otherwise they waste a color slot and are then erased by the cleanup.
- **Label cleanup.** Run a 3×3 majority filter, plus a 5×5 pass in photo mode, then reassign pixel specks to their neighbour.
- **Tracing.** Trace the exact pixel edges with unit edges chained into rings, filled with the EvenOdd rule, and merge collinear points.
  - Letter holes, islands and diagonal pinches all come out correct.
  - Neighbouring colors share exactly coincident boundaries.
- **Ring nesting after tracing.** Tracers such as imagetracerjs return outer rings, holes, and islands inside holes, all mixed together.
  - Normalize the orientation: outer rings counter-clockwise, holes clockwise. Then union all of them with the **NonZero** fill rule, so each ring adds +1 or −1.
  - Never compute "union of all outer rings minus union of all holes". That deletes every island that sits inside a hole. On a horse logo, the black body inside the white outline's hole disappeared, and the UI showed it as "erased".
- **Regression test.** Use frame-filling four-color logos, for example black/white/grey/green in columns. All four colors must survive.

## 2. Printability in millimetres (after scaling)

- **Order.** Scale to mm first, _then_ filter.
- **Per color:**
  - A closing then an opening, each with radius `minFeature/2` (0.8 mm feature by default). This removes lines, gaps and pinholes thinner than the minimum feature.
  - Drop islands, and fill holes, smaller than `minIslandArea`.
  - Use round joins, which turn pixel staircases into curves.
- **Report what was removed** per color: percentage of area and pieces lost. A small keychain legitimately erases thin outlines; say so instead of hiding it.
  - A large color that shows as "erased", or loses most of its area, is a **geometry bug**, not thin features. Log the area before and after each cleanup step for every layer to find the step that dropped it.
- **Partition colors** so that no point belongs to two colors:
  - Grow each color by a 0.1 mm seam.
  - Paint smallest-first, so details win.
  - Never fill holes in this step, because a hole may be another color's region.

## 3. Manifold geometry (zero repair warnings in slicers)

- **Kernel.** Use **manifold-3d** (Apache-2.0, WASM), which has Clipper2 for 2D work. Do not CSG three.js triangle soup and then weld it with `mergeVertices`.
- **Carve the body; don't assemble it.** Build `slab − cavity − pockets`.
  - Unioning side-by-side solids that share vertical walls leaves zero-area slivers.
  - Solids that only meet at horizontal planes do not.
- **Before extruding, make each region "extrusion-ready":**
  - A 2 µm _round_ opening with a fixed 8 segments separates corner pinches. Miter joins re-close them.
  - Simplify with epsilon `2e-4` to drop near-duplicate vertices. Booleans leave edges as short as 1e-8 mm.
  - Remove zero-width **spikes** (A→B→A) in your own code. Clipper's simplify creates them and its union does not remove them.
- **Floor specks.** Microscopic leftover floor specks between inlays go to a neighbouring inlay.
- **Pocket pinches.** A micro closing (2 µm) on the inlay pockets bridges corner-only contacts, so the floor never pinches to a zero-thickness seam.
- **Mesh cleanup.** Run `Manifold.simplify(1e-4)` on every part. It collapses the collinear slivers that coplanar booleans leave while keeping the mesh manifold.
- **Export precision.** Snap exported positions to 1e-7 mm and write 7 decimals. Validate **those exact numbers**. A 1e-5 grid flattened valid but thin triangles.
- **Vertex welding keys.** When you weld vertices by rounding coordinates into a string key, turn `-0` into `0`: `(Math.round(n * 1e4) / 1e4 + 0).toFixed(4)`.
  - Without this, `"-0.0000"` and `"0.0000"` become two different vertices. The keyring mesh stopped being watertight because of it.
- **three.js `ExtrudeGeometry`** (keychain app) can leave a few zero-area triangles on complex shapes. Slicers accept them, but only a real manifold kernel removes them completely.
- **Validate independently, and block export on failure.** Check that every directed edge appears once and its reverse once, there are no zero-area triangles or NaN values, volume is positive, Z starts at 0, height is as expected, and pairs of parts don't overlap.
  - Measure overlap as `2V/area` thickness, compared with 10× the mesh tolerance.
  - Never "repair" a failing mesh. Fix the algorithm instead.
- **Memory.** Free WASM objects. Track every CrossSection and Manifold and delete them all after each build.

## 4. Previews

- **2D tabs: Original / Colors / Processed.**
  - _Colors_ is the segmented raster, or the traced layers.
  - _Processed_ must draw the **exact cleaned mm geometry that gets extruded**: plate, then each color as an `evenodd` SVG path with a faint stroke. That is how users see removed specks before printing.
  - Flip Y, because geometry is Y-up and SVG is Y-down.
- **3D preview.**
  - Set `camera.up = (0,0,1)` and rotate the GridHelper onto the XY plane.
  - Use `MeshStandardMaterial({flatShading:true})` with each part's filament color.
  - Offer perspective, top and bottom views, a reset button, and a dimensions readout (W × D × H mm).
  - Re-frame the camera only when the size changes, not on every parameter tweak.
- **Thumbnail.** Rasterize the top view in pure TypeScript with a scanline even-odd fill and a tiny PNG encoder (zlib from fflate). Darken the silhouette edge so white rims stay visible.

## 5. App structure

- **Web Worker.** Run the heavy work in a Web Worker so the page doesn't freeze. Debounce analysis by about 250 ms and generation by about 400 ms, and drop stale responses.
- **SVG input** needs `DOMParser`, so parse SVG on the main thread with three's `SVGLoader`. Respect painter order: each shape keeps only what isn't covered by later shapes.
- **React StrictMode** mounts, unmounts and remounts in development. Create the worker lazily through a ref and recreate it after it is disposed, or requests will hang against a terminated worker.
- **Settings.** Keep the parameters as a serialisable recipe JSON with a version and tolerant parsing.

## 6. 3MF that Bambu Studio and OrcaSlicer read correctly

- **Package.** Standard OPC parts: `[Content_Types].xml`, `_rels/.rels`, `3D/3dmodel.model` with `unit="millimeter"`.
- **Objects.** One mesh object per part, plus one assembly object with `<components>` and no `pid`, plus one build item.
- **Colors.** Use **one `m:colorgroup` per color**, and an object-level `pid`/`pindex="0"` on each part.
  - OrcaSlicer keeps only the _last_ color in a group.
  - Bambu ignores `basematerials`.
- **Filament slots (optional hint).** `Metadata/model_settings.config` with `<object id=ASSEMBLY>` and one `<part id=COMPONENT_OBJECT_ID subtype="normal_part">` per part, each carrying `name` and `extruder` metadata.
- **Don't impersonate Bambu.** Never write `Application=BambuStudio-…`; that switches Bambu to a strict loader.
- **Part names** should mean something: `BODY_GREEN`, `COLOR_01_BLACK`, `RIM_WHITE`.
- **Verify** with lib3mf in strict mode (Python package `lib3mf`, expect 0 warnings) and with trimesh (watertight).

## 7. Phones and publishing as a claude.ai page

- **Upload button.** Make it a real `<label for=…>` around a visually hidden input (not `display:none`). Clicking a hidden input from script does nothing in in-app web views.
- **Accepted types.** Accept `image/*`, because phones hand over HEIC.
- **Hosted pages:**
  - Build with Vite `base: "./"` and inline the CSS.
  - Ship the JS, worker and WASM as supporting files.
  - Downloads must go through `claude.use("downloads").save({filename, data})`.
  - `.3mf` isn't an allowed type there, so wrap it in a `.zip`.
- **E2E test.** Use Playwright `isMobile + hasTouch` and _tap_ the upload box, waiting for the `filechooser` event.

## 8. Text and outline border (keychains and name tags)

Popular image-to-keychain tools only offer the image. Adding text and an outline border makes the result much more useful.

- **Fonts.** Bundle three.js typeface JSON fonts (helvetiker, optimer, gentilis, droid; all bold) and load them with `FontLoader`. No network fonts and no font licensing surprises.
- **Size text by cap height.** Measure the letter "H" and scale it so a capital letter is exactly the requested height in mm. Font units differ from font to font.
- **Text is its own color layer.** Run it through the same ring normalization (section 1) so letter holes such as O, A and R stay open.
- **Text-only keychains** must work: enable export when there is text but no image.
- **Outline border.** Build it as `offset(content, width) − content`, where content is the art plus the text. That gives a ring of the border color around everything.
  - If the text color matches the border color, switch the text to a contrasting color automatically. Otherwise the letters disappear into the border.
- **Plate and keyring placement.** Measure the bounding box of art + text + border, then center that box. Build the plate and position the keyring hole from the centered box, not from the image alone.
- **Sensible defaults** (they match common keychain makers): about 50 mm wide, 2 mm plate, each color raised about 0.6 mm, 5 mm keyring hole.

## 9. Debugging and verifying

- **Reproduce with the user's exact file.** Screenshots show the symptom; the real image shows the cause. Keep users' logos local, and never commit them.
- **Log per layer:** area after tracing, after nesting, after printability cleanup, and after partitioning. The step where the area falls is where the bug is.
- **Check every exported file** with trimesh in Python: `watertight`, the number of zero-area faces, volume, and bounds for each part. Do this for the 3MF and the STL, and for each option combination you changed (text on or off, border on or off).
- **Don't guess-fix.** If a change doesn't move the measured number, revert it before trying the next idea.

## 10. MakerWorld Parametric Model Maker (OpenSCAD)

Reference: `makerworld/` in both repos (`.scad`, listing text, build and check tools).

- **One `.scad` file.** No local includes. Buyers' uploads are only reachable as `default.png`, `default.svg` or `default.stl`, so ship sample files with exactly those names.
- **Customizer comments.** `// [min:step:max]` for sliders, `// [a:Label, b:Label]` for dropdowns, `/* [Tab] */` for tabs, `"#RRGGBB"; // color` for color pickers (hex only), `"Font:style=Bold"; // font` for font pickers. Put derived values under `/* [Hidden] */`.
- **Colors from a PNG without image analysis.** `surface(file = "default.png")` turns brightness into height (0 = black, 100 = white; alpha is ignored, so transparent reads as its hidden color, usually black). `projection(cut = true)` at height `t` gives the area brighter than `t`, and the difference of two cuts is one brightness band.
  - The cuts follow interpolated contours, so edges come out smooth, not pixel-stepped.
  - Blur between two colors becomes thin slivers of the in-between band. Grow each color by `min_detail / 2` and give one color the job of filling every leftover gap. Paint in priority order: region k = grown k minus every higher-priority grown region.
  - OpenSCAD can't read an image's size. Size the picture with `resize([0, height, 0], auto = [true, false, false])`, so the height is known for placing the text and keyring.
- **Fill holes** (no built-in exists). Take the hull of each thin horizontal strip of the shape, then of each vertical strip, and intersect the two unions. Enclosed holes fill, outward notches stay.
- **Zero-area triangles.**
  - Never cut a shape with a cutter whose edge runs along the shape's own edge. Let cutters reach past the outline, and clip only once.
  - Rounded `offset` leaves near-duplicate points. A tiny square round trip, `offset(delta = 0.005) offset(delta = -0.005)`, removes most of them.
  - Never cut a coplanar slab off a wall; make the body shorter instead.
- **Multicolor output.** Make each color a separate top-level `color()` part. Export with `--enable=lazy-union` to get one object per color. OpenSCAD's 3MF stores colors as `basematerials`, which Bambu ignores, so convert it for local test prints (one `m:colorgroup` per color, see section 6).
- **Test with the same engine.** The 2021.01 release (CGAL) took 9 minutes for what the Manifold backend did in 3 seconds. The `openscad/openscad:dev` Docker image matches MakerWorld's renderer closely. Render a matrix of setting combinations and check every part with trimesh.
- **Quote strings in `-D` overrides** as `-D 'name="value"'`. Unquoted, OpenSCAD reads the value as an undefined variable and silently renders the defaults.
