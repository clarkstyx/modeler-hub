# Trace a picture and add it to the Icon Bead Modeler

Needs Python 3 with `pip install numpy pillow opencv-python-headless vtracer`.

```bash
# from the canva-draw-prompt repo
python3 scripts/trace-charm.py <picture.png|jpg> <name>.svg <colours> [allwhite]
```

- `<colours>` is the number of colours **including** the outline (2–4).
- Add `allwhite` when white inside the drawing should be empty rather than a colour (a donut hole, eye highlights). Without it, only white touching the picture's edge is background, so white stripes, beards and icing stay as a colour.
- The script quantizes to that many flat colours, cleans speckles, traces with vtracer, and snaps every fill to the palette it found. It prints the colours it used.

Then, in `clarkstyx/icon-bead-modeler`:

1. Snap the outline fill to the set's outline colour so it shares the body filament: Kawaii `#3b2a2a` (`sed 's/fill="#<dark>"/fill="#3b2a2a"/g'`). Christmas and Everyday Cute keep their own dark `#202027` or whatever dark the trace found; the app picks the darkest colour for the body.
2. Save as `charms/<Category>/<Group>/<kebab-name>.svg`. The file name becomes the label ("pink-axolotl" shows as "Pink Axolotl"). Pick a name that doesn't already exist in that group.
3. `npm run build`, then export it through the harness to prove it makes a valid bead:
   ```bash
   cat > /tmp/one.json <<EOF2
   { "stem": "t", "outDir": "/tmp/one", "options": { "height": 26, "holeDir": "h", "shape": "contour", "faceStyle": "raised" }, "charms": ["<kebab-name>"] }
   EOF2
   node scripts/export-set.mjs /tmp/one.json
   ```
   The 3MF in `/tmp/one/singles/` should have one body object plus one object per colour.
4. Update the README's set description and counts, commit, push, open a draft PR.
5. After merge, `npm run pull icon-beads` in `clarkstyx/modeler-hub` puts it on the live site.

## Common fixes

| Symptom | Fix |
|---|---|
| A colour vanished (yellow sprinkles merged into pink) | Raise `<colours>` by one, or use `allwhite` so white highlights stop using up a slot. |
| Hole or eye highlight filled with white | `allwhite`. |
| Checkerboard "transparent" background baked into the file | Already handled: light grey squares touching the edge count as background. |
| Fuzzy or speckled edges | Ask Canva for a crisper, thicker outline; or raise `filter_speckle` in the script. |
| Tiny loose fragments in the 3MF | The picture has thin details; regenerate with "no tiny details, thicker shapes". |
