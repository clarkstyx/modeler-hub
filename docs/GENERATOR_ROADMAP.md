# Generator roadmap

Ranked implementation plan for Valencia Modelers, derived from `BLITCH_GAP_ANALYSIS.md`. One
engine per genuinely different geometry; everything else is a preset. Status is updated at the
end of every implementation batch.

Status key: ✅ done · 🟡 partial · ⬜ not started · ⛔ blocked

## Batches 1 and 2 (2026-10-13 and 2026-10-14)

| # | Item | Status | Repo / location | Engine or preset | Done | Missing | Tests | Limitations |
|---|---|---|---|---|---|---|---|---|
| P0-1 | Register the phone-grip modeler | ✅ | hub `modelers.json` → `clarkstyx/popsocket-text-modeler`, id `phone-grip`, Maker | own engine | builds under `/m/phone-grip/`, worker + wasm paths verified | MakerWorld mirror, hub-side tagline mentions the fit test | `npm run check` in repo (14 variants) | every hardware preset is **unverified** until a physical fit test; no snap-in PopTop |
| P0-2 | Vendor docs + skills for every modeler | ✅ | hub `vendor/docs/<id>/`, `.claude/skills/<id>--*` | – | all 13 | – | – | – |
| P0-3 | Pull script: local modelers | ✅ | hub `scripts/pull.mjs` (`"path"` entries) | – | builds `modelers/<x>` without cloning | – | full pull run: 13/13 ok | – |
| P0-4 | Fix ornament font path under `/m/<id>/` | 🟡 PR open | grinch-ornament-generator#1, dumpling-ornament-generator#2 | – | font URL built from `import.meta.env.BASE_URL` | merge | 103 + 156 tests; sub-path build in Chromium: 404 + font error before, none after | – |
| P0-5 | Fix Name Keychain export rotation | 🟡 PR open | keychain-modeler#1 | – | exports read geometry with rotation zeroed, scale kept | merge | Chromium: after a drag, export height 66.6 mm before, 10.5 mm after | repo still has no test suite |
| P0-6 | Fix Name Tag raised-text race | 🟡 PR open | name-tag-modeler#9 | – | text merged synchronously (static import) | merge | Chromium with slow chunk + fast typing: 11 Text parts before, 1 after | repo still has no test suite |
| P0-7 | Jerry Can 3MF: XML escaping + slot config | ⛔ dropped: modeler handed to its owner and removed from the hub (2026-10-17) | jerry-can-modeler#2 | – | colour groups, assembly, `model_settings.config`, escaping | merge | smoke test now checks 3MF structure; "A&B <C>" XML invalid before, valid after | slicer import not checked |
| P1-1 | **Sliding-lid box engine** | ✅ | own repo `clarkstyx/box-modeler` (was hub `modelers/box-modeler/`), id `box-modeler`, Maker | engine; 8 presets | see README: size (inner/outer), wall, base, corner radius, lid thickness, rail depth/lip, clearance, thumb notch/ridge, dividers, text (4 fonts, multi-line, along/across, auto-fit), raised/engraved/inlay, SVG artwork per colour, colours, printer settings, fit-test set, 3MF/STL/ZIP/JSON | PNG/JPG tracing (use SVG), rounded-end "tin" outline, lid pattern generator, batch | 23 vitest + 18-case `npm run validate` + browser check (screenshot, 3MF download) | lid fit **unverified** physically; defaults from common practice (0.25 mm clearance) |
| P1-2 | Trinket Tray presets: heart, cloud, name tray | 🟡 PR open | Trinket-Tray-Generator#7 | engine + 3 presets | heart and cloud outlines with a containment fit, text as the artwork (name trays, names in a heart), Heart Ring Dish / Cloud Tray / Name Tray presets; fixed one-colour designs vanishing and zero-area triangles on oversized art at curved walls | divider grid (use box-modeler meanwhile), flower compartments | 134 tests (17 new); Chromium walkthrough of all three presets | pre-existing ~1 % size/scale combos fail on a 2D pinch (export blocked); `scripts/scanSizes.ts` reproduces |
| P1-3 | Gridfinity / storage label engine + batch plates | ✅ (draft PR) | hub `modelers/gridfinity-labels/`, id `gridfinity-labels`, Seller | engine | width in grid units (42 mm pitch − end clearance) or mm, height, thickness, corners; 1–2 lines of text in 4 fonts with auto-fit; screw/bolt/nut/washer/insert icons or SVG; raised/inlay/engraved; list or CSV (column mapping, order id, quantity) → plates packed to the bed → 3MF/STL per plate, ZIP + `manifest.csv`; fit-test strip (height −0.4/0/+0.4) | snap-clip and adhesive variants for non-Gridfinity bins; icon-beads icon library; colour-set grouping across batches | 16 vitest + 11-case `npm run validate` + Chromium walkthrough (sample list, CSV with order ids, 3MF/STL/fit-test downloads, 0 page errors, 0 external requests) | slot height/thickness **unverified**: only the 42 mm pitch is a published fact, so the defaults (12 × 1.2 mm) are a common size and the fit-test strip ships with the app |

## Batch 2 follow-ups

| Item | Where | Notes |
|---|---|---|
| Fix the 2D pinch that blocks ~1 % of size/scale combinations | Trinket-Tray-Generator#8 (draft) | ✅ Root cause: a 3-point sliver ring (~3e-6 mm²) survived the 1e-6 mm² clean-up and the 3D simplify (1e-4) squashed it into open edges. `MICRO_RING_AREA` is now 1e-4, matched to `MESH_TOLERANCE`. `scripts/scanSizes.ts`: 0 failures; regression test added. |
| Divider grid in the Trinket Tray | Trinket-Tray-Generator | Divided Tray / Flower Compartment Tray. |
| Bundle fonts in Name Keychain, Name Tag, Desktop Sign | keychain-modeler#2, name-tag-modeler#10, desktop-sign-modeler#1 (drafts) | ✅ Fonts come from `@expo-google-fonts/*` packages (OFL) and the repo's own files, imported with `?url` so each loads only when picked. With every non-local request blocked: 28/28, 7/7 and 21/21 fonts failed before, 0 after. |

## Batch 3 (2026-10-14)

P1-3 above and two batch 2 follow-ups (the Trinket pinch fix and bundled fonts). All are draft PRs; nothing is deployed.

## Batch 4 (next)

| # | Item | Engine | Presets it unlocks | Blockers |
|---|---|---|---|---|
| P2-1 | Cookie cutter engine | 🟡 draft PR | hub `modelers/cookie-cutter/`, id `cookie-cutter`, Maker: shapes, letters (one cutter each), word, SVG outline; stepped taper to a thin edge, flange, smoothing, island joining, fragile-part warning, food-contact note in the app and every ZIP | Image to Cookie Cutter (SVG only), Cookie Cutter, Letter & Number Cutters | PNG/JPG tracing, press-in stamp, physical dough test |
| P2-2 | Stamp maker (mirrored relief, handle, press-fit or thread) | box-modeler relief + handle module | Stamp Maker | thread/press-fit must be print-tested |
| P2-3 | MX clicker family | new engine | 5 clicker products | Cherry MX plate cut-out 14.0 mm, 1.5 mm plate, stem cross 4.0 × 1.1 mm from the datasheet; calibration coupon required |
| P2-4 | Image Keychain ornament/plaque presets; Name Tag strap slot + magnet pockets; Letter Beads pet-collar preset | existing | Image to Ornament, Printed-Photo Plaque, Bag & Luggage Tag, Name Badge, Pet Collar Beads | – |

## Batch 5

| # | Item | Engine | Presets |
|---|---|---|---|
| P3-1 | QR/NFC module (encoder, module size, quiet zone, NFC pocket) + sign/stand | desktop-sign + new `qr` module | QR keychain, QR sign, Wi-Fi sign, NFC/QR stand, café board, review stand |
| P3-2 | Medals and event products (disc/hex/flower, ribbon slot, arc text, emblem, batch) | ornament engine extracted | 5 medals, cake topper, place card, table number |
| P3-3 | Sign/plaque: mounting holes, no-foot mode, multicolour logo | desktop-sign + image-keychain tracer | address plaque, door sign, logo sign |

## Batch 6 (decorative, after the above)

Lattice containers (woven basket, vase, planter sleeve, pen cup), photo frame, two-sided pet tag,
pen toppers, shoe charms (after measuring the shoe hole), stencil, domed relief badge, art on
imported models.

## Platform work (runs alongside)

| Item | Status | Notes |
|---|---|---|
| Batch production (text list / CSV → variations → plates → ZIP + manifest) | 🟡 | Built in gridfinity-labels and box-modeler (one lid per name, or box + lid sets; CSV order ids and quantities; plates; ZIP + manifest). Shared parts in `packages/geometry/src/batch.ts`. Name Keychain: keychain-modeler#3 (draft; same list/CSV/plates/ZIP flow, helpers copied since it is its own repo). Next: Name Tag. Design in `GENERATOR_ARCHITECTURE.md`. |
| Shared printer profiles | 🟡 | box-modeler and phone-grip expose nozzle/layer/bed; a shared `printer.json` schema is specified in the architecture doc. |
| Saved templates | 🟡 | Every newer modeler saves JSON and embeds it in the 3MF; the hub does not store them server-side yet. |
| Shared geometry package | ✅ | `packages/geometry/` in the hub, copied into `modelers/*/src/shared/` by `npm run sync-shared`; `npm test` fails on drift. gridfinity-labels and cookie-cutter use it; box-modeler (now its own repo) carries a copy updated by hand (23 + 16 tests, both validate suites, Chromium export + reopen check). Trinket Tray (own repo) not synced. |
| Slicer round-trip CI | ⬜ | OrcaSlicer CLI in a container, as planned in the Trinket Tray roadmap. |

## Dependencies

- Everything in Batch 3+ that needs a new repo depends on creating repos under `clarkstyx/`
  (not possible from this session's credentials; local scaffolds under `modelers/` work meanwhile).
- Medals and cake toppers depend on extracting the ornament engine (`src/engine/` is byte-identical
  across the two ornament repos apart from slot names).
- Clickers and stamps depend on physical calibration prints before any fit is claimed.
