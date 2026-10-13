# Image Keychain Modeler

Turn any **picture into a multi-colour 3D-printable keychain** in your browser: upload a PNG or JPG, it is traced to an SVG (one vector layer per colour), each colour is extruded as its own part on top of a keychain plate, and you export a **colour-ready 3MF** (or STL) for your slicer — plus the traced SVG itself.

Sibling of the [Jeepney Style Keychain](../Jeepney%20style%20keychain%20modeler) and [keychain-modeler](../keychain-modeler) projects; same Vite + React + three.js stack and 3MF writer.

## How it works

1. **Upload** a PNG / JPG (or an SVG — its fills become the layers directly, no tracing).
2. **Trace**: the image is quantised and vectorised with [imagetracerjs](https://github.com/jankovicsandras/imagetracerjs) (public domain).
   - **Background removal**: transparent pixels are always dropped. Alpha is cut at 50% first, because PNGs from image generators carry a soft half-transparent halo around the artwork whose hidden colour is white, and without the cut the tracer reads that halo as white artwork and every letter grows a fat skirt. Otherwise the background colour (the most common colour along the image border) is flood-filled from the edges inward, within the *background tolerance*, and made transparent before tracing. Only background that touches the border goes, so white eyes, teeth or text inside the artwork survive as their own colour layer.
   - **Trace palette** (8 by default): how many colours the tracer looks for. The palette is seeded from the artwork's own pixels, most common colour first and then the most distinct ones, so small but distinct colours such as white details get their own entry. Six tends to fold them into a neighbour.
   - **Max printed colours** (4 by default, one AMS load): the biggest real colours are kept and the image is retraced with just those, so every pixel of a dropped colour, and all the anti-aliasing fringe between colours, snaps to its nearest kept colour and the artwork never needs more filaments than this. The plate colour is extra unless it matches one of them.
   - **Exact colours**: each kept colour is the most common exact pixel colour in its region (not an average dragged towards the soft edges), so a flat `#fd7201` orange prints as `#fd7201`.
   - **Letter holes**: the insides of A, B, D, O, P, R and & are cut out of the letter rather than filled.
   - **Left open**: when the colour limit drops a colour that matches the removed background (white letter holes and eyes on a white-background logo), it is left open instead of being filled with the nearest kept colour. Raise *Max printed colours* to print it as a colour.
   - **= background**: a colour that matches the removed background but sits enclosed inside the artwork is kept and marked. That is the eyes and teeth on a dark dragon, or just the gaps inside letters, so untick it if it is the latter.
   - **Simplify paths** is an error threshold: higher means fewer nodes and blockier curves, so keep it low for smooth text and raise the trace resolution instead. The resolution defaults to 800 px on the long side; at 400 px features only a pixel or two wide (a dragon's eye, a thin script) vanish before cleanup even runs.
3. **Colour layers**: each traced colour is listed with a swatch — untick to leave it off, recolour it to match a filament, or type its own height.
4. **Cleanup (printability)**: applied at printed size in millimetres — *Min Feature Width* erases anything thinner than it (0.4 mm by default, one 0.4 mm nozzle line), *Drop Specks Under* removes loose dots smaller than that area, and *Fill Holes Under* fills holes smaller than its area (both 1 mm² by default; set the hole size to 0 to keep tiny holes like the inside of an "A"). Use these for specks and hairlines the tracer keeps; smoothing only simplifies curves. Raising the feature width erases text and thin outlines along with the noise, so each colour in the list reports how much of it the cleanup removed (`−12%`, or `erased`). *Smooth Edges* rounds every corner to that radius (0.15 mm by default, 0.3 mm at most), which turns pixel stair-steps into curves; set it to 0 to keep the trace exactly. It works one piece at a time and never erases anything, so it cannot weld the letters of a word into a blob or thin out strokes; only *Min Feature Width* erases. The **Preset: logo / wordmark** button at the top of the Cleanup section sets the whole recipe for a bold wordmark like "FIRE & ICE VAPES": 60 mm wide, 3 printed colours, outline plate, loop on top, flat 1 mm letters, 0.3 mm min feature, 0.3 mm² specks and holes, 0.1 mm smoothing. For the odd speck or dash that survives, tick **Eraser** and click the piece in the 3D view to remove it (*Restore* brings everything back). The outline plate is built from the cleaned artwork, so erased pieces do not leave bumps in it.
5. **Emboss**: colours are stacked at different heights so the artwork stands proud of the plate instead of printing as a flat sticker. Modes: stacked by size (big regions low, small details on top — the default), by brightness, by darkness, flat, or **flush inlay**. Flush inlay sinks the colours into the top of the plate by the *inlay depth* (0.6 mm by default) so the finished top is level, the way MakerWorld prints an image keychain; the plate then exports as two same-coloured parts, `Plate` and `Plate top`. Set the lowest layer height and the step per layer, or override any layer's height in the list.
   - **Stacking (raise parts)**: makes chosen parts thicker than the rest of their colour, for a layered badge look (a raised text panel and magnifier on a black badge, a slab behind it). *Click a piece to raise it* lifts one connected piece of one colour by *Raise By* (click again to put it back). *Draw an area to raise* is for a solid colour that is all one piece: click points around the part (the view turns face-on), then click the first point or press *Finish*, and everything inside, every colour, is lifted, so text on a raised panel goes up with it. Each area keeps its own height in the list and can be removed; the highest area wins where two overlap.
6. **Image**: *Image Width* is the width of the artwork itself (empty margins in the picture don't count). **Rotate** in 5° steps and **mirror** left ↔ right; the plate sizes itself around the rotated artwork.
7. **Plate**: rounded rectangle (auto-hug + padding, or manual size with fit-to-plate), an **outline** that hugs the artwork silhouette (set *Outline Width* to 0 for no visible border: the plate is then exactly the artwork's shape), a **circle**, a **hexagon** (with rounded corners), or **none**. With no plate, **Bridges** (on by default) join every loose piece — teeth, dots, the keyring loop — to its nearest neighbour with a bar in the plate colour so the print comes off as one piece. **Attachment**: a keyring loop, or **None** for a flat-backed piece with no hole to glue a magnet onto (or print as a badge or coaster). The keyring loop goes on the **left, top or right**, placed on the real edge of the plate (so it sits right on an outline plate too), with hole size and X/Y offset. Or choose **Anywhere (cut a hole through)**: the hole goes wherever you put it, for example on a ring drawn into the artwork. Tick *Click the 3D view to place the hole* and click the spot, or type its X / Y in mm from the centre. The hole is cut through the plate and every colour, and a disc of ring wall around it is merged into the plate, so it can also hang half off a corner. **Raised rim**: tick *Raised rim around the hole (chamfered)* for a collar in the plate colour standing up around the hole with its top edges sloped, the look of the moulded rim on a rubber keychain; set its width, height and chamfer. It exports as its own `Keyring rim` part, stays inside the ring wall, and the colours are cut back around it so no parts overlap. **Export the loop as its own object** (on by default for the left / top / right loop): the 3MF then holds two objects, the keychain and its `Keyring` loop, which only touch at the plate's edge, so anyone can delete the loop in the slicer and print the keychain as a magnet. Overall scale.
8. **Text & outline**:
   - **Text:** type up to three lines (a name, a team, a date). You can do this with or without an image; text alone makes a name keychain.
   - **Font:** choose one of five bundled bold fonts. They work offline.
   - **Letter height:** sets the height of the capital letters, in mm. 5 mm or more prints crisply.
   - **Position:** text goes above or below the artwork, with a gap you choose.
   - **Colour and height:** the text gets its own colour and stands up from the plate by the *Text Height*. In flush-inlay mode it sits level with the top instead.
   - **Outline border:** draws a contrasting band that hugs the artwork and letters, the sticker look. It has its own width, colour and height, and fills the gaps between letters and inside them.
   - **Colours stay readable:** when you turn the border on and the letters are the same colour as it, the letters switch to a contrasting colour.
   - **Plate sizing:** the plate, outline plate, circle or hexagon and the keyring are all sized around the image, the text and the border together.
9. **Export**: `Download 3MF` gives one object whose parts are named by colour — `Plate`, `Keyring`, `Text`, `Outline`, `Black`, `Orange`, `Sky Blue`, `White`, `Bridges`… Every distinct colour gets a filament slot (the plate colour is slot 1) and parts of the same colour share it; Bambu Studio and OrcaSlicer read the slot of each part from `Metadata/model_settings.config`, so the parts arrive already on the right filaments. The colours are stored as a 3MF colour group, which those slicers use to match your filaments. STL and the traced SVG are also available.

**No artwork?** Open *No artwork? Get an AI prompt* under the upload box and copy the prompt into ChatGPT or another image AI: it asks for at most four flat colours, a bold die-cut outline, and nothing thinner than a nozzle can print, which is exactly what traces and prints well here.

## Run

Requires Node 18+.

```bash
npm install
npm run dev      # opens http://localhost:5176
npm run build    # production build into dist/
```

## Projects

Every 3MF you download also keeps your settings and the picture (`Metadata/image-keychain.json` and `Metadata/source-image.png` or `.svg`; slicers ignore them). Upload that 3MF in the main upload box (or use **Open project…**; the `.zip` a hosted page wraps it in works too) and the same keychain is rebuilt, ready to edit. A 3MF without those settings opens as a solid model instead (next section). **Save settings** downloads just the settings as `.json`; after opening one, upload the picture again and your colour, eraser and raise edits are kept.

## Validation

Below the settings, **Validation** checks the parts the way a slicer would, a moment after every change: each part is listed with its triangle count, volume and whether it is a watertight solid (checked with manifold-3d), any two parts that overlap are reported with the overlapping volume, and settings a 0.4 mm nozzle or a split ring will struggle with (hairline features, letters under 5 mm, a hole under 3 mm, a thin ring wall, layers under 0.2 mm, more than four filament slots, a footprint over 256 mm) are listed as notes. Export is only blocked when there is nothing printable.

## Solid models (a 3MF or STL without settings)

A 3MF that has no settings inside (one downloaded before October 2026, one re-saved by a slicer, or one from the MakerWorld customizer or any other tool) and any STL open as a **solid model** instead: the parts are read straight from the file, with their names and filament colours when the file has them (Bambu Studio and OrcaSlicer project files included), and shown as they are. You can't retrace the picture or edit text, but you can:

- **Recolour parts** with each part's swatch and untick parts to leave them out.
- **Find the keyring hole**: round through-holes near an edge are found automatically and marked in the 3D view (green for the selected one); click another hole to pick it.
- **Plug the hole** fills it and keeps the shape, for a magnet on the back. Every part that surrounds the hole from the base up gets a plug in its own colour.
- **Cut the loop off** removes the lobe around the hole along the body's own edge and closes the bite the hole left, so the edge comes out straight. Parts that are nothing but the loop (a `Keyring` part, a `Keyring rim`) are dropped.
- **Draw an area to cut away**: click points around any bit of the model and press *Cut* to remove everything inside, in every part, for shapes the automatic tools don't handle.
- **Undo** steps back through your changes.

The cuts and plugs are real 3D booleans (done in the browser with [manifold-3d](https://github.com/elalish/manifold)), so the parts stay watertight, and `Download 3MF` writes them out with their colours on filament slots like any other keychain.

## Printing

- **AMS / multi-material**: open the 3MF in Bambu Studio or OrcaSlicer. The parts are already assigned to filament slots 1–4; set each slot's filament to the colour shown (the slicer offers to match them), then print flat.
- **Single extruder**: print the plate colour, add a filament change at the top of the plate, and print all image layers in one colour (or export with only one layer ticked).
- By default the lowest colour is 1 mm above a 2 mm plate and each further colour steps up 0.6 mm; thin details print better with 2 colours and a higher speck-removal value.

## Tips

- Logos and flat artwork trace best. Photos need a bigger trace palette (12–16), a higher max, and some blur.
- If the background comes through as a layer, untick it in the colour list, raise the *background tolerance*, or toggle *Remove background*.
- Use the **Outline** plate style with **Flush inlay** for a MakerWorld-style flat sticker keychain; use **Outline** with stacked heights for an embossed one.
- Thin white text on a dark logo: trace at 800 px and drop *Min Feature Width* to 0.3 mm.
- Specks along an edge vs small holes: *Drop Specks Under* removes loose bits (raise it to clean an outline edge), *Fill Holes Under* fills small holes. Set *Fill Holes Under* to 0 to keep tiny holes open, such as the inside of an "A" or pupils, while specks are still removed.
- Detailed logos (teeth, spikes, small letter holes) need room: at 40 mm wide they are thinner than a 0.4 mm nozzle line and the cleanup removes them. 60 mm wide with *Min Feature Width* 0.3 mm, *Drop Specks Under* and *Fill Holes Under* 0–0.3 mm² and *Smooth Edges* 0.1 mm keeps them.

## MakerWorld version

`makerworld/` holds a customizable OpenSCAD version for MakerWorld's Parametric Model Maker. Buyers upload a PNG or SVG on MakerWorld, add text, pick colors, and download a multicolor 3MF. It splits PNG colors by brightness rather than hue, so it is simpler than this app. The folder also has copy-paste listing text, preview renders, a sample 3MF and upload steps: see [makerworld/README.md](makerworld/README.md).

## Status

Everything has been run through the headless browser test on the test images: exact colours, letter holes, the per-part 3MF (also checked by re-saving it with the OrcaSlicer command line), rotate / mirror, circle and hexagon plates, keyring left / top / right, bridges, and the AI prompt. Bridges are also unit-tested.

## Credits

[imagetracerjs](https://github.com/jankovicsandras/imagetracerjs) (Unlicense), [three.js](https://threejs.org/), [Vite](https://vitejs.dev/), [clipper-lib](https://www.npmjs.com/package/clipper-lib), [JSZip](https://stuk.github.io/jszip/).
