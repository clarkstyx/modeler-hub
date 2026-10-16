# Ribbon Skirt Ornament

A parametric **ribbon skirt ornament**: a pleated skirt with ribbon bands in your colours, a
gathered waistband and a hanging loop, exported as a colour-ready 3MF for Bambu Studio / OrcaSlicer.

Lives inside the hub at `modelers/ribbon-skirt/` and is served at `/m/ribbon-skirt/`. It is a normal
Vite app and can move to its own repository by changing `path` to `repo` in `modelers.json`.

## What it makes

- **Skirt**: hollow, with soft rounded folds facing out and sharp creases facing in, deepest at the
  hem and gathering into the waistband. Settings: height, hem and waist diameter, flare, fullness
  (rounded shoulders), wall,
  number of pleats, pleat depth, how far up the pleats stay deep.
- **Ribbons**: horizontal bands from the hem up, each colour its own part (same colours share a
  part), with the skirt colour showing below and between them. Width, gap and hem band are set in mm.
- **Waistband**: a gathered band that puffs out past the skirt, open on top like a ring, with the
  loop rising from a solid floor a few mm down inside. That floor is either a flat 2 mm bridge
  (short waistband; the bridge is hidden inside) or a 45° cone (no bridge, taller waistband); the
  waistband is raised automatically if it is too short for the choice.
- **Loop**: standing on top, with a teardrop-shaped hole (pointed at the top) so it prints clean.
- Exports: 3MF (one object, one part per colour, settings embedded so the file reopens here),
  single STL, STL per colour (ZIP), settings JSON.

Presets: as pictured (70 mm, full shoulders, puffy waist, three ribbons on black), ribbon skirt
ornament (70 mm, straighter sides), mini ornament (45 mm), long skirt with five ribbons (95 mm).

## Run

```bash
npm install
npm run dev        # http://localhost:5185
npm test           # vitest: geometry, sizes, ribbons, checks, 3MF
npm run validate   # every preset and edge case, writes out/*.3mf
npm run build      # production build (the hub passes --base=/m/ribbon-skirt/)
```

## How it is built

All geometry runs in a Web Worker on **manifold-3d**. The skirt is one closed mesh built ring by ring:
each level's outer outline comes from the profile and the pleat shape, and the inner outline is that
outline moved inwards by the wall along its 2D normal, so every layer the slicer sees is exactly
`wall` thick. Two checks run before the mesh is made: a pleat fold bending tighter than the wall
(the inside would fold over itself) and any part of the wall leaning over 45° (needs supports) both
block export. The waistband and loop are unioned on, then the ribbons are cut out as horizontal
slabs, so the parts never overlap and always add up to the whole ornament.

## Printing

Print standing up as placed, hem on the bed: no supports. 0.2 mm layers; the default 1.6 mm wall is
four lines with a 0.4 mm nozzle. One AMS holds four colours, skirt included.
