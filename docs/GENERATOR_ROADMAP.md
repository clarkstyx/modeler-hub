# Generator roadmap

Ranked implementation plan for Valencia Modelers, derived from `BLITCH_GAP_ANALYSIS.md`. One
engine per genuinely different geometry; everything else is a preset. Status is updated at the
end of every implementation batch.

Status key: ✅ done · 🟡 partial · ⬜ not started · ⛔ blocked

## Batch 1 (this session, 2026-10-13)

| # | Item | Status | Repo / location | Engine or preset | Done | Missing | Tests | Limitations |
|---|---|---|---|---|---|---|---|---|
| P0-1 | Register the phone-grip modeler | ✅ | hub `modelers.json` → `clarkstyx/popsocket-text-modeler`, id `phone-grip`, Maker | own engine | builds under `/m/phone-grip/`, worker + wasm paths verified | MakerWorld mirror, hub-side tagline mentions the fit test | `npm run check` in repo (14 variants) | every hardware preset is **unverified** until a physical fit test; no snap-in PopTop |
| P0-2 | Vendor docs + skills for every modeler | ✅ | hub `vendor/docs/<id>/`, `.claude/skills/<id>--*` | – | all 13 | – | – | – |
| P0-3 | Pull script: local modelers | ✅ | hub `scripts/pull.mjs` (`"path"` entries) | – | builds `modelers/<x>` without cloning | – | full pull run: 13/13 ok | – |
| P0-4 | Fix ornament font path under `/m/<id>/` | ⬜ | grinch-ornament-generator, dumpling-ornament-generator `src/app/useEngine.ts:17` | – | – | one-line `import.meta.env.BASE_URL` fix | existing suites | blocks name text on the hub today |
| P0-5 | Fix Name Keychain export rotation | ⬜ | keychain-modeler `src/KeychainModeler.jsx:349-368` | – | – | reset group rotation before export (as letter-beads does) | none | – |
| P0-6 | Fix Name Tag raised-text race | ⬜ | name-tag-modeler `src/NameTagModeler.jsx:899-903` | – | – | cancel stale async text build | none | – |
| P0-7 | Jerry Can 3MF: XML escaping + slot config | ⬜ | jerry-can-modeler `src/export/threemf.js` | – | – | copy the phone-grip writer | smoke test | – |
| P1-1 | **Sliding-lid box engine** | ✅ | hub `modelers/box-modeler/`, id `box-modeler`, Maker | engine; 8 presets | see README: size (inner/outer), wall, base, corner radius, lid thickness, rail depth/lip, clearance, thumb notch/ridge, dividers, text (4 fonts, multi-line, along/across, auto-fit), raised/engraved/inlay, SVG artwork per colour, colours, printer settings, fit-test set, 3MF/STL/ZIP/JSON | PNG/JPG tracing (use SVG), rounded-end "tin" outline, lid pattern generator, batch | 23 vitest + 18-case `npm run validate` + browser check (screenshot, 3MF download) | lid fit **unverified** physically; defaults from common practice (0.25 mm clearance) |
| P1-2 | Trinket Tray presets: heart, cloud, name tray, dividers | ⬜ | Trinket-Tray-Generator | presets + `footprint.ts` shapes | – | heart/cloud footprints, text-only build, divider grid | repo suite (117) | separate repo change |
| P1-3 | Gridfinity / storage label engine + batch plates | ⬜ | new repo `gridfinity-label-modeler` | engine | – | label sizes, text + icon (icon-beads library), clip geometry, batch layout, ZIP | – | needs Gridfinity label-holder dimensions from the spec (42 mm pitch, 1.6 mm label slots) |

## Batch 2 (next)

| # | Item | Engine | Presets it unlocks | Blockers |
|---|---|---|---|---|
| P2-1 | Cookie cutter engine (SVG/image outline, wall, cutting rim, flange, letter cutters, optional press-in stamp) | new, reusing trinket-tray silhouette + box-modeler text | Image to Cookie Cutter, Cookie Cutter, Letter & Number Cutters | food-contact warning text; no food-safety claims |
| P2-2 | Stamp maker (mirrored relief, handle, press-fit or thread) | box-modeler relief + handle module | Stamp Maker | thread/press-fit must be print-tested |
| P2-3 | MX clicker family | new engine | 5 clicker products | Cherry MX plate cut-out 14.0 mm, 1.5 mm plate, stem cross 4.0 × 1.1 mm from the datasheet; calibration coupon required |
| P2-4 | Image Keychain ornament/plaque presets; Name Tag strap slot + magnet pockets; Letter Beads pet-collar preset | existing | Image to Ornament, Printed-Photo Plaque, Bag & Luggage Tag, Name Badge, Pet Collar Beads | – |

## Batch 3

| # | Item | Engine | Presets |
|---|---|---|---|
| P3-1 | QR/NFC module (encoder, module size, quiet zone, NFC pocket) + sign/stand | desktop-sign + new `qr` module | QR keychain, QR sign, Wi-Fi sign, NFC/QR stand, café board, review stand |
| P3-2 | Medals and event products (disc/hex/flower, ribbon slot, arc text, emblem, batch) | ornament engine extracted | 5 medals, cake topper, place card, table number |
| P3-3 | Sign/plaque: mounting holes, no-foot mode, multicolour logo | desktop-sign + image-keychain tracer | address plaque, door sign, logo sign |

## Batch 4 (decorative, after the above)

Lattice containers (woven basket, vase, planter sleeve, pen cup), photo frame, two-sided pet tag,
pen toppers, shoe charms (after measuring the shoe hole), stencil, domed relief badge, art on
imported models.

## Platform work (runs alongside)

| Item | Status | Notes |
|---|---|---|
| Batch production (text list / CSV → variations → plates → ZIP + manifest) | ⬜ | Start with box-modeler lids or name keychains: both already produce a bed-positioned object per order. Design in `GENERATOR_ARCHITECTURE.md`. |
| Shared printer profiles | 🟡 | box-modeler and phone-grip expose nozzle/layer/bed; a shared `printer.json` schema is specified in the architecture doc. |
| Saved templates | 🟡 | Every newer modeler saves JSON and embeds it in the 3MF; the hub does not store them server-side yet. |
| Shared geometry package | ⬜ | Do not extract yet: four 3MF writers and three text stacks exist; box-modeler and trinket-tray share the same module shapes, which is the template for the package. |
| Slicer round-trip CI | ⬜ | OrcaSlicer CLI in a container, as planned in the Trinket Tray roadmap. |

## Dependencies

- Everything in Batch 2+ that needs a new repo depends on creating repos under `clarkstyx/`
  (not possible from this session's credentials; local scaffolds under `modelers/` work meanwhile).
- Medals and cake toppers depend on extracting the ornament engine (`src/engine/` is byte-identical
  across the two ornament repos apart from slot names).
- Clickers and stamps depend on physical calibration prints before any fit is claimed.
