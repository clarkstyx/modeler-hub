# Generator architecture

How Valencia Modelers are built, what the mature ones share, and the shape every new engine
should take. This is descriptive of the code that exists today (October 2026) plus the rules the
box-modeler batch adopted.

## The hub

- `modelers.json` is the catalogue. Each entry has an `id` (the URL `/m/<id>/`), a `repo` **or**
  a `path`, a tier (`free` < `maker` < `seller`) and a category.
- `scripts/pull.mjs` clones (or, for `path` entries, uses the folder in this repo), runs
  `npx vite build --base=/m/<id>/ --outDir public/m/<id>/`, copies README/CLAUDE.md into
  `vendor/docs/<id>/` and skills into `.claude/skills/<id>--*`.
- Cloudflare Pages Functions gate `/m/<id>/` by tier (`functions/_middleware.js`).
- A modeler is any Vite app. Nothing else is required. Workers and WASM must resolve relative to
  the bundle (`new URL("./worker.ts", import.meta.url)` and `manifold.wasm?url`), which Vite
  rewrites correctly under `--base`. Root-absolute asset URLs (`/fonts/...`) break on the hub.

## Two generations of modelers

| | Generation 1 (2025) | Generation 2 (2026) |
|---|---|---|
| Examples | name-keychain, name-tag, desktop-sign, bubble-keychain | trinket-tray, phone-grip, box-modeler, ornaments |
| Language | JSX, one large component | TypeScript, modules by responsibility |
| 2D | clipper-lib at 1000 units/mm | manifold-3d `CrossSection` (Clipper2) |
| 3D | three.js `ExtrudeGeometry`, parts stacked, no booleans | manifold-3d solids, real booleans, parts never overlap |
| Threading | main thread | Web Worker |
| Validation | none | edge/winding/volume check, overlap check, export blocked on error |
| 3MF | basematerials (Bambu does not pre-assign filaments) | `m:colorgroup` + components + `model_settings.config` |
| Save/load | none or JSON | JSON + settings embedded in the 3MF |

New engines are Generation 2. Generation 1 apps are not rewritten; they get targeted fixes
(see the P0 list in the roadmap).

## The reference layout (trinket-tray and box-modeler)

```
src/core/        params.ts (all parameters, defaults, LIMITS, derived sizes), presets.ts,
                 recipe.ts (tolerant JSON load), validateParams.ts (rules before geometry), types.ts
src/geometry/    kernel.ts (WASM init + arena), shapes.ts (2D/3D helpers), build*.ts (the product),
                 mesh.ts (manifold → indexed mesh, weld, flat-triangle fix, independent validation)
src/text/        textShapes.ts (bundled three.js typeface fonts → rings, cap-height layout)
src/export/      threeMF.ts, stl.ts
src/pipeline/    generate.ts (params → parts + issues), protocol.ts, worker.ts, client.ts
src/ui/          React only: App, controls, Preview3D (three.js, OrbitControls, bed grid), loadArtwork (SVG on the main thread)
test/            vitest, runs the engine headlessly in Node
scripts/         validate-exports.ts: builds every preset + edge cases, checks meshes, writes out/*.3mf
```

Rules that fall out of this layout:

1. **One source of geometry.** The preview draws the exact `TriMesh` arrays that the exporters
   write. There is no separate preview mesh.
2. **Parts never overlap.** Colour parts are built with booleans so they touch along faces. The
   pipeline checks pairwise intersection volume and blocks export above 0.01 mm³.
3. **Every exported mesh is validated independently** of the kernel (edge sharing, winding,
   degenerate triangles, positive volume). Export is blocked on any error; warnings are shown.
4. **Parameters are millimetres with limits.** `LIMITS` is shared by the UI and the validator.
   Derived sizes (`derive()`) are computed once and shown in the UI.
5. **Recipes are tolerant.** Unknown keys dropped, missing keys defaulted, numbers clamped, so old
   files reopen. The recipe is embedded in the 3MF at `Metadata/<app>.json`.
6. **Fonts are bundled** (three.js typeface JSON: Optimer, Helvetiker, Gentilis, Droid Sans).
   Runtime font fetches from CDNs are a Generation 1 habit to retire.
7. **WASM memory is arena-managed**: everything created in a build is freed by `withArena`.

## 3MF contract (what slicers get)

```
[Content_Types].xml, _rels/.rels
3D/3dmodel.model     unit="millimeter"
                     <m:colorgroup id=1..n>            one per distinct colour (slot order)
                     <object type="model" name="LID_TEXT" pid=slot pindex=0><mesh/></object>   one per part
                     <object name="box"><components/></object>                                  one per printed object
                     <build><item objectid=…/></build>                                          one item per printed object
Metadata/model_settings.config   per-part <metadata key="extruder" value=slot/>  (Bambu Studio / OrcaSlicer)
Metadata/<app>.json              the recipe
```

Part names are stable, upper-case identifiers (`BOX`, `LID`, `LID_TEXT`, `LID_ART_1_1E5AA8`).
Objects are placed in print orientation on the bed (Z = 0 is the plate) with no supports needed.
PrusaSlicer users take the STL ZIP (one STL per part, same frame) instead.

## Reusable pieces and where they live today

| Capability | Best implementation today | Reuse plan |
|---|---|---|
| Text → polygons, cap-height layout, multi-line | `packages/geometry/src/textShapes.ts` (from trinket-tray) | `npm run sync-shared` into new engines |
| Arc text | trinket-tray `textShapes.ts` `arcText`, ornaments `arcText.ts` (opentype) | medals, coasters |
| SVG → colour layers | box-modeler `ui/loadArtwork.ts` (three SVGLoader); icon-beads `iconSource.js` (strokes too) | all image products |
| Raster → colour regions | trinket-tray `image/*` (Lab k-means, bg removal, palette editing); image-keychain tracer | cutters, ornaments, clicker caps |
| Rounded footprints | `packages/geometry/src/shapes.ts` `rectRing` (per-corner radii); trinket-tray `footprint.ts` | trays, boxes, medals |
| Colour-separated 3MF | `packages/geometry/src/threeMF.ts` (multi-object) ≥ trinket-tray ≥ phone-grip | the shared writer |
| Mesh validation | `packages/geometry/src/mesh.ts` (trinket-tray has its own) | all |
| Keyring loop / hole placement | image-keychain (anywhere, chamfered rim), bubble-keychain (drag) | tags, medals |
| Dome / pillow | phone-grip layer stack | badges, clicker caps |
| Hardware presets with verification status | phone-grip `hardware.js` | clickers, stamps, NFC pockets |
| Calibration pieces | phone-grip (size rings), box-modeler (lid fit set) | every mechanical product |

**Do not extract a shared package yet.** Two engines (trinket-tray, box-modeler) now share the same
module shapes and near-identical `mesh.ts`, `threeMF.ts`, `textShapes.ts`. When a third engine
(cookie cutters or gridfinity labels) copies them again, lift those four files into
`@valencia/geometry` as an independently licensed internal package and point all three at it.
`modelers/gridfinity-labels` (2026-10-14) was that third copy, so the files now live once in
`packages/geometry/src/` (types, kernel, shapes, mesh, threeMF, stl, textShapes) and
`npm run sync-shared` copies them into each modeler's `src/shared/`. A copy rather than an npm link
keeps every modeler a standalone app that can move to its own repo; the hub's `npm test` fails if a
copy drifts. App-specific values are passed in (the 3MF `app` id, STL headers), never hard-coded.
Trinket Tray (own repo) is not synced yet.

## Batch production (built: gridfinity-labels, box-modeler)

Seller-tier feature. Reusable interface every engine should be able to expose:

```ts
interface BatchItem { id: string; params: Params }               // one order line
interface BatchResult { parts: Part[]; footprint: {w,d}; }        // from generate()
plan(items, printer: PrinterProfile) → Plate[]                    // shelf packing with a 5 mm gap, grouped by colour set
export: ZIP { plate-01.3mf … , manifest.csv (order id → plate, object name, colours) }
```

Inputs: a plain text list (one name per line) or CSV with a column → parameter mapping. Grouping
by filament assignment keeps AMS swaps to a minimum.

Built first in `modelers/gridfinity-labels`: `core/batch.ts` parses the list (`text | icon | units`)
or a CSV with a column mapping (text, icon, width, order id, quantity; 500-label cap),
`geometry/buildLabels.ts` `layoutPlates()` shelf-packs labels in list order onto bed-sized plates,
and `pipeline/generate.ts` `batchZip()` writes `plate-NN.3mf` + `manifest.csv` (label, plate,
object, text, icon, size, x/y, letter height, source line, order id) + README.

box-modeler follows the same shape (`core/batch.ts`, `geometry/buildBatch.ts`, `generateBatch()` /
`batchZip()` in `pipeline/generate.ts`): one lid per name, or a box beside every lid, 200-lid cap.
The engine-neutral pieces live in `packages/geometry/src/batch.ts`: CSV reading (`splitCsvRow`,
`csvHeaders`, `findHeader`), CSV writing (`toCsv`), `shelfPack()` and `objectSlug()` (accent-safe
object names). A new engine's batch needs only its own list format and per-item build.

Not yet done: grouping by colour set (every item in one batch shares the same colours), rotating
items to pack tighter. Name Keychain (keychain-modeler#3) has the same flow in its own repo, with the
helpers copied into `src/batch.js` and its geometry extracted to `src/keychain.js`.

## Printer profiles (design)

```json
{ "name": "Bambu P1S", "bed": [256, 256, 256], "nozzle": 0.4, "layerHeight": 0.2,
  "fit": { "slideClearance": 0.25, "holeClearance": 0.15 }, "xyCompensation": 0, "colours": 4 }
```

box-modeler already takes nozzle, layer height and bed size; `fit.slideClearance` maps to its
`clearance`. A profile picker in the hub (`localStorage` first, Patreon-backed later) feeds these
to every modeler through the URL (`?printer=…`) or a shared storage key.

## UX contract

Sidebar on the left in numbered sections (product → size → fit → decoration → colours → printer →
export), live preview on the right with print layout / assembled toggle, bed grid, dimension
readout, part list with colours and volumes, and an issues panel that explains every warning in
plain words. Export buttons are disabled while anything is red.
