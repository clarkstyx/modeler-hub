# Create.Blitch gap analysis

Comparison of the 86 products advertised at createblitch.com (catalogue as of October 2026; the
live site could not be fetched from this build environment, so the list in the brief was used
as-is) against the Valencia Modelers that actually exist in code. Every status below was decided
by reading the modeler source, not the READMEs. File references are `repo:path:line` at the
commits audited on 2026-10-13 (see "Audit snapshot").

## How to read it

| Status | Meaning |
|---|---|
| **EXISTING** | We already provide equivalent functionality. |
| **PARTIAL** | The basic product exists but important parameters or features are missing. |
| **PRESET** | Supported by adding a preset (and at most a small feature) to an existing engine. |
| **MISSING** | No working implementation anywhere. |
| **DEFER** | Not justified yet: demand, safety, unverified hardware, or cost. |

Priority: P0 = fix/integrate what exists, P1 = highest value new engines, P2 = popular personalised
products, P3 = business/event, P4 = decorative. Effort is in developer days for a tested, hub-ready
generator (S ≤ 1, M 2–4, L 5–10, XL > 10).

## Audit snapshot (what we actually have)

All twelve repositories plus the hub were cloned and built with the hub's command
(`npx vite build --base=/m/<id>/`). **Every one builds.** Test suites: Trinket Tray 117 pass,
Grinch 103 pass, Dumpling 156 pass, Desktop Sign 22 pass, Jerry Can smoke test passes, Phone Grip
`npm run check` passes (14 variants, all watertight, no overlaps). The others have no tests.

| Hub id | Repo | Engine | Colour-ready 3MF | Image / SVG | Text | Validation | Save/load |
|---|---|---|---|---|---|---|---|
| name-keychain | keychain-modeler | three ExtrudeGeometry + clipper 2D | basematerials, separate items, **no Bambu slot config, unwelded** (`KeychainModeler.jsx:166-225`) | SVG only, one colour | 29 fonts fetched from jsDelivr at runtime | none | none |
| letter-beads | letter_bead_creator | manifold-3d | yes: welded, components, `model_settings.config` (`LetterBeadModeler.jsx:237-336`) | none | 8 bundled TTF + upload | hole-wall warnings | none |
| name-tag | name-tag-modeler | ExtrudeGeometry + clipper, T-junction fix | welded assembly, no slot config (`NameTagModeler.jsx:362-426`) | SVG + raster trace (imagetracerjs), up to 6 colours | 6 Google fonts (runtime fetch) | fit readout only | none |
| jerry-can | jerry-can-modeler | manifold-3d | basematerials only, separate items, **no XML escaping** (`src/export/threemf.js:32-46`) | none (3 built-in icons) | 5 bundled fonts, 3 lines, auto-fit | 2 warnings | localStorage + JSON |
| bubble-keychain | bubble-keychain-maker | clipper 2D + ExtrudeGeometry | yes: colorgroup, components, slot config, settings embedded in 3MF (`src/export.js:72-172`) | none | 4 bundled fonts | 2 warnings | JSON + 3MF round-trip |
| icon-beads | icon-bead-modeler | manifold-3d | yes: components, slot config, per-bead transforms (`src/geometry.js:269-368`) | 278 charms, Iconify search (network), SVG/PNG upload, k-means | none | hole-wall warnings | none |
| phone-grip (new) | popsocket-text-modeler | manifold-3d, Web Worker | yes: colorgroup, components, slot config, settings embedded (`src/export.js:15-65`) | none | 5 bundled fonts | thin strokes, cap height, gem fit, glue face, >4 colours | JSON + 3MF round-trip |
| desktop-sign | desktop-sign-modeler | ExtrudeGeometry + clipper | basematerials only (`src/threeMF.js:97-132`) | SVG + binary raster trace, one colour | 21 fonts (runtime fetch) | none | none |
| trinket-tray | Trinket-Tray-Generator | manifold-3d, Web Worker, TypeScript | yes: standards 3MF + slot config, STL ZIP, lib3mf-verified (`src/export/threeMFExporter.ts`) | PNG/JPG/WebP/SVG, Lab k-means, bg removal, palette editing, 2–8 colours | 2 bundled fonts, arc/straight | full manifold check, min-feature cleanup, export blocked on error | JSON recipe |
| box-modeler (new) | hub `modelers/box-modeler` | manifold-3d, Web Worker, TypeScript | yes: colorgroup, one object per printed part, slot config, settings embedded | SVG, one part per fill colour | 4 bundled fonts, multi-line, auto-fit | manifold + overlap check, stroke width, fit rules, export blocked on error | JSON + 3MF round-trip |
| image-keychain | image-keychain-modeler | clipper 2D + ExtrudeGeometry, manifold for validation | yes: colorgroup, components, slot config, image + settings embedded (`src/ImageKeychainModeler.jsx:918-1033`) | PNG/JPG/SVG, imagetracerjs, bg knock-out, palette seeding, 1–8 colours, eraser | 5 bundled fonts, 3 lines | per-part watertight + pairwise overlap (`src/meshMode.js:619-643`) | JSON + 3MF round-trip |
| grinch-ornament | grinch-ornament-generator | manifold-3d kernel, opentype.js, zod, zustand | basematerials only, separate items (`src/engine/export/threeMf.ts`) | none (poses traced offline) | 1 font | thin feature, gap, off-support | JSON, undo/redo |
| dumpling-ornament | dumpling-ornament-generator | same engine as Grinch (byte-identical bar slot names) | same | none | 1 font | same | same |

Defects found during the audit that affect products below. Batch 2 (2026-10-14) opened a fix for each of the
four marked P0; they take effect on the hub once those PRs merge.

- **Ornament fonts 404 on the hub**: both ornament apps load `/fonts/FredokaOne-Regular.woff` with a
  root-absolute path (`src/app/useEngine.ts:17`), which breaks under `/m/<id>/`; the name becomes a
  blocking error and export is disabled. One-line fix (`import.meta.env.BASE_URL`). **P0, fixed in
  grinch-ornament-generator#1 and dumpling-ornament-generator#2.**
- **Name Keychain exports the preview rotation**: STL/3MF bake the live group's `matrixWorld`
  after the user drags the view (`KeychainModeler.jsx:352,181`). **P0, fixed in keychain-modeler#1.**
- **Name Tag raised-text race**: text mesh is appended in an un-cancelled async import
  (`NameTagModeler.jsx:899-903`), so fast typing can leave stale or missing text in exports. **P0, fixed in
  name-tag-modeler#9.**
- **Jerry Can 3MF** does not XML-escape the title/part names and has no slot config. **P0, fixed in
  jerry-can-modeler#2.**
- Name Keychain, Name Tag and Desktop Sign fetch fonts from jsDelivr at runtime (offline = no text).
- No modeler generates QR codes, stands with slots, stencils, cutters, threads, MX-switch pockets.

## The matrix

### A. Personalised products (12)

| Product | Valencia equivalent | Status | Missing capabilities | Reusable engine | Priority | Effort |
|---|---|---|---|---|---|---|
| Name Keychain | name-keychain, bubble-keychain | **EXISTING** | Bambu slot config and welding in name-keychain's 3MF; export-rotation bug | keychain-modeler | P0 fix | S |
| Name Keychain with Image | image-keychain (text + traced image + keyring, `ImageKeychainModeler.jsx:2481-2625`) | **EXISTING** | none material | image-keychain-modeler | – | – |
| QR Code Keychain | none | **MISSING** | QR encoder, module-size/quiet-zone rules, scannability test | image-keychain plate + keyring; new `qr` module | P3 | M |
| Contact Card Keychain | name-tag (2 lines), image-keychain (3 lines) | **PARTIAL** | 4+ lines, phone/email layout, two-sided | name-tag text stack | P3 | S |
| Bag & Luggage Tag | name-tag ("bag tags" with slot per tagline; web app has no strap slot: `NameTagModeler.jsx` has no slot parameter) | **PARTIAL** | strap slot, address field on the back | name-tag | P2 | S |
| Two-Sided Pet Tag | none (icon-beads does both faces for icons only) | **MISSING** | circle/bone outline, front name, back phone, split ring hole | bubble-keychain outline + name-tag text | P2 | M |
| Name Badge | name-tag | **EXISTING** | pin/magnet pockets in the web app (the SCAD mirror has magnet recesses, `makerworld/name_tag.scad:106-111`) | name-tag | P2 | S |
| Desk Nameplate | desktop-sign | **EXISTING** | multi-colour logo (binary trace only) | desktop-sign | – | – |
| Sports Team Tag | name-tag / image-keychain | **PRESET** | team logo + name + number preset with keyring | image-keychain | P3 | S |
| Sports Ball Tag | none | **MISSING** | ball silhouettes (soccer/basketball/baseball) as SVG presets with seam engraving | image-keychain | P4 | S |
| Picture Frame | none | **MISSING** | frame with photo slot and stand/hanger | box-modeler rail logic (slide-in photo) | P4 | M |
| Printed-Photo Plaque | image-keychain inlay mode (`emboss=inlay`) | **PRESET** | plaque with stand, no keyring | image-keychain + desktop-sign stand | P3 | S |

### B. Beads, charms and accessories (6)

| Product | Valencia equivalent | Status | Missing | Engine | Priority | Effort |
|---|---|---|---|---|---|---|
| Name Beads | letter-beads | **EXISTING** | – | – | – | – |
| Pet Collar Beads | letter-beads (vertical hole, smaller height) | **PRESET** | preset only | letter_bead_creator | P2 | S |
| Number Beads | letter-beads (any glyph) | **EXISTING** | – | – | – | – |
| Charm Beads | icon-beads (278 charms, upload, multicolour) | **EXISTING** | – | – | – | – |
| Straw/Pen/Pencil Topper | none | **MISSING** | tube socket with clearance, calibration | icon-beads silhouette pipeline | P4 | M |
| Clog Shoe Charm | none | **MISSING** | rivet/button neck; the shoe-hole size must be measured | icon-beads | P4 (DEFER until measured) | M |

### C. Events and celebrations (9)

| Product | Valencia equivalent | Status | Missing | Engine | Priority | Effort |
|---|---|---|---|---|---|---|
| Award Medal | none (bubble-keychain oval plate is close, no ribbon slot) | **MISSING** | disc/hex/flower outlines, ribbon slot/loop, arc text, emblem, batch names | ornament engine (`shapes.ts`, `arcText.ts`) + icon-beads SVG | P3 | M |
| School Sports Medal | same | **MISSING** | presets of the above | same | P3 | S after medal |
| Hexagon Medal | same | **PRESET** after medal | – | same | P3 | S |
| Fun Run Medal | same | **PRESET** after medal | – | same | P3 | S |
| Flower-Edge Medal | same | **PRESET** after medal | union-of-circles outline | same | P3 | S |
| Place Card | name-tag plate (flat), desktop-sign (stand) | **PARTIAL** | tent/stand without the L-foot, batch of names | desktop-sign | P3 | S |
| Table Number | desktop-sign (number + stand) | **PRESET** | numeric batch | desktop-sign | P3 | S |
| Menu Card | desktop-sign | **PARTIAL** | multi-line paragraphs, holder for a printed card | desktop-sign | P4 | M |
| Cake Topper | none (bubble text plate exists, no pick) | **MISSING** | pick/stake geometry, no keyring, script fonts | bubble-keychain / box-modeler text | P3 | S |

### D. Image and outline generators (13)

| Product | Valencia equivalent | Status | Missing | Engine | Priority | Effort |
|---|---|---|---|---|---|---|
| Image Tracer | image-keychain (traced SVG download, `ImageKeychainModeler.jsx:1629`), trinket-tray segmentation | **EXISTING** | standalone page | – | – | – |
| Image to Keychain | image-keychain | **EXISTING** | – | – | – | – |
| Image to Cookie Cutter | **cookie-cutter** (`modelers/cookie-cutter`, Maker): SVG outline → wall, stepped taper, cutting edge, flange; holes filled, islands joined, food-contact note | **PARTIAL** (2026-10-14) | PNG/JPG tracing (use an SVG for now; Trinket Tray / Image Keychain have tracers), press-in stamp | cookie-cutter | P2 | S |
| Cookie Cutter | **cookie-cutter**: circle, scalloped circle, heart, star, rounded square, egg | **EXISTING** (2026-10-14) | more shapes (seasonal), dough test | cookie-cutter | P2 ✅ | – |
| Letter & Number Cutters | **cookie-cutter** letters mode (one cutter per character, 4 fonts, plates) and word mode (one cutter around a word) | **EXISTING** (2026-10-14) | inner counters cut by a second piece | cookie-cutter | P2 ✅ | – |
| Cake Pop Mold & Tray Set | none | **DEFER** | two-part molds, food-contact, untested fits | – | – | L |
| Stencil | none (name-tag cut-out style is the inverse) | **MISSING** | bridges for counters, inversion | name-tag cutout + image-keychain bridges (`buildBridges`) | P4 | M |
| Image to Ornament | image-keychain (hole anywhere, top loop) | **PRESET** | ornament preset: larger, loop on top, no plate text | image-keychain | P2 | S |
| Logo to Sign | desktop-sign (one colour) / image-keychain (multi, no stand) | **PARTIAL** | multicolour logo with a stand | desktop-sign + image-keychain tracer | P3 | M |
| Layered Logo Plaque | image-keychain stacking mode (`stacking=piece/area`) | **EXISTING** | attachment none + plate preset | image-keychain | – | S |
| Art on Your Model | image-keychain mesh mode (imports 3MF/STL, recolours, cuts) | **PARTIAL** | project artwork onto an imported mesh surface | image-keychain meshMode | P4 | L |
| Image to Cake Topper | image-keychain | **PARTIAL** | pick geometry | image-keychain | P3 | S |
| Domed Relief Badge | phone-grip dome stack (`geometry.js:369-384`) | **PARTIAL** | dome over an image, badge back | phone-grip + image-keychain | P4 | M |

### E. Signs and business displays (10)

| Product | Valencia equivalent | Status | Missing | Engine | Priority | Effort |
|---|---|---|---|---|---|---|
| Address Plaque | desktop-sign | **PARTIAL** | wall-mount screw holes, no foot, weather note | desktop-sign | P3 | S |
| Door Sign | desktop-sign / name-tag | **PARTIAL** | mounting holes, no foot | desktop-sign | P3 | S |
| Drawer/Storage Label | **gridfinity-labels** (`modelers/gridfinity-labels`, Seller): grid-unit or mm width, text + hardware icons + SVG, raised/inlay/engraved, list/CSV batch → plates → ZIP + manifest, fit-test strip | **EXISTING** (2026-10-14) | snap clip / adhesive-backed variants for non-Gridfinity bins; slot size **unverified** physically | gridfinity-labels | P1 ✅ | – |
| QR-Code Sign | none | **MISSING** | QR module | desktop-sign + qr | P3 | M |
| Guest Wi-Fi Sign | none | **MISSING** | WIFI: string encoder + QR | same | P3 | S after QR |
| NFC/QR Display Stand | none | **MISSING** | NFC pocket (real tag sizes: 25 mm round, 30 mm), stand | desktop-sign + qr | P3 | M |
| Café Scan & Tap Board | none | **MISSING** | layout presets | same | P3 | S after stand |
| Boutique Arch Scan Board | none | **MISSING** | arch outline (desktop-sign has `cutBottomArch`, unused) | same | P4 | S |
| Custom-Shape Scan Board | none | **MISSING** | SVG outline board | same | P4 | S |
| Braille & Tactile Sign | none | **DEFER** | Braille cell dimensions per ADA (dot 1.5 mm Ø, 2.3 mm spacing) must be implemented exactly; legal exposure if wrong | desktop-sign | P4 | M |

### F. Trays and household (9)

| Product | Valencia equivalent | Status | Missing | Engine | Priority | Effort |
|---|---|---|---|---|---|---|
| Trinket Tray | trinket-tray | **EXISTING** | – | – | – | – |
| Heart Ring Dish | trinket-tray: `heart` shape + Heart Ring Dish preset (Trinket-Tray-Generator#7, open) | **EXISTING** once #7 merges | – | trinket-tray | P1 done | – |
| Cloud Tray | trinket-tray: `cloud` shape + Cloud Tray preset (#7) | **EXISTING** once #7 merges | – | trinket-tray | P1 done | – |
| Woven Tray | none | **MISSING** | woven wall pattern | trinket-tray wall | P4 | M |
| Divided Tray | trinket-tray (no dividers) / box-modeler (dividers, lid removable) | **PARTIAL** | divider grid in trinket-tray; today use box-modeler with `lidGrip` none and skip the lid | box-modeler | P1 | S |
| Flower Compartment Tray | none | **MISSING** | petal compartments | trinket-tray | P2 | M |
| Pet Image Compartment Tray | trinket-tray silhouette + image | **PARTIAL** | compartments | trinket-tray | P2 | M |
| Shaped Art Tray | trinket-tray silhouette mode | **EXISTING** | – | – | – | – |
| Name Tray | trinket-tray: text as the artwork + Silhouette = tray in the outline of the name; Name Tray preset (#7) | **EXISTING** once #7 merges | – | trinket-tray | P1 done | – |

### G. Baskets and containers (4)

| Product | Valencia equivalent | Status | Missing | Engine | Priority | Effort |
|---|---|---|---|---|---|---|
| Woven Basket | none | **MISSING** | lattice/woven wall generator (vase-mode friendly) | new lattice engine | P4 | M |
| Lattice Vase | none | **MISSING** | same | same | P4 | S after basket |
| Planter Sleeve | none | **MISSING** | same + drainage | same | P4 | S |
| Lattice Pen Cup | none | **MISSING** | same | same | P4 | S |

### H. Sliding-lid gift boxes (17)

All 17 map to the **new box-modeler engine** (this batch). Presets shipped now are marked ✓.

| Product | Status | Preset | Missing for a faithful version |
|---|---|---|---|
| Sardine Tin Gift Box | **PRESET** | – | oval/rounded-end outline, fish artwork (SVG upload works today) |
| Christmas Gift Tin | **PRESET** | ✓ gift-tin + SVG | seasonal SVG pack |
| Pencil Slide Box | **EXISTING** | ✓ pencil-box | – |
| Crayon Slide Box | **PRESET** | pencil-box variant | – |
| Notebook Slide Box | **PRESET** | storage-box sized A6/A5 | – |
| Gift-Wrapped Tin | **PARTIAL** | gift-tin | ribbon/bow relief on lid (SVG today) |
| Chocolate Bar Tin | **PRESET** | sized 160 × 80 × 15 | – |
| Cassette Tape Tin | **PRESET** | sized 110 × 70 × 18 | cassette SVG |
| Love Letter Tin | **PRESET** | business-card sized, text | envelope SVG |
| Classic Fish Tin | **PARTIAL** | – | rounded-end outline |
| Boarding Pass Tin | **PRESET** | sized 190 × 85 × 12 | – |
| Pattern Gift Tin | **PARTIAL** | – | lid pattern generator (trinket-tray `pattern.ts` is reusable) |
| Jewellery Tin | **EXISTING** | ✓ jewellery-box (2 × 3 compartments) | ring-slot foam insert |
| Pill & Vitamin Tin | **EXISTING** | ✓ pill-box (7 compartments) | – |
| Pet Treat Tin | **EXISTING** | ✓ treat-tin (inlaid name) | – |
| Wedding Favour Tin | **PRESET** | personalised-gift sized 60 × 60 × 30 | – |
| Business or Gift Card Tin | **EXISTING** | ✓ business-card | – |

### I. Stamps (1)

| Product | Valencia equivalent | Status | Missing | Engine | Priority | Effort |
|---|---|---|---|---|---|---|
| Stamp Maker | none (phone-grip has a `mirror` option for stamps, `geometry.js:30`) | **MISSING** | mirrored relief plate, handle with thread or press-fit, tolerance calibration; thread fit is unverified until printed | box-modeler text/SVG relief + new handle module | P2 | M |

### J. Fidgets and MX-switch clickers (5)

| Product | Valencia equivalent | Status | Missing | Engine | Priority | Effort |
|---|---|---|---|---|---|---|
| Keychain Keycap Clicker | none | **MISSING** | MX switch pocket (14.0 × 14.0 mm plate cut-out, 1.5 mm plate per Cherry datasheet), stem socket (4.0 × 1.1 mm cross), keyring | new clicker engine; icon-beads/phone-grip for the cap face | P2 | M |
| Custom-Shaped Clicker | none | **MISSING** | SVG body outline | same | P2 | S after engine |
| Custom Name Clicker | none | **MISSING** | text cap | same + box-modeler text | P2 | S |
| Image Keycap Clicker | none | **MISSING** | image cap | same + image-keychain tracer | P2 | S |
| Domed Emblem Clicker | none | **MISSING** | dome cap | same + phone-grip dome | P2 | S |

Clark already sells physical clickers, so this family ranks above its raw demand score; the
stem/plate dimensions must come from the Cherry MX datasheet and a printed calibration piece, not
from memory (see `PRINT_VALIDATION.md`).

## Totals

| Status | Count (2026-10-13 audit) | After the batch 2 PRs merge |
|---|---|---|
| EXISTING | 16 | 19 |
| PARTIAL | 17 | 16 |
| PRESET | 20 | 18 |
| MISSING | 30 | 30 |
| DEFER | 3 | 3 |

Of the 30 MISSING products, 17 collapse into five engines: QR/NFC (6), medals (5 → 1 engine + presets),
lattice containers (4), cookie cutters (3), clickers (5). That is the whole point of the engine +
preset architecture: the roadmap builds ~8 engines, not 86 apps.

## Valencia has, Create.Blitch does not advertise

- **Jerry Can Keychain** (3-colour sculpted body with knurled cap).
- **Bubble Keychain** (speech/thought/shout bubbles with tails and a draggable keyring).
- **Letter Beads** with custom TTF upload and bed layouts for 180/256/350 mm plates.
- **Icon Beads** with a 278-charm library and Iconify search.
- **Phone Grip Topper** with gem inlays and a hardware-fit calibration set.
- **Grinch and Dumpling ornaments** (character generators with poses/accessories).
- **Coasters** with drip grooves, feet pockets, cork recess, face-down printing and a holder
  (Trinket Tray), and 3MF output verified with lib3mf in strict mode.
- **Image Keychain mesh mode**: import a 3MF/STL, recolour parts, plug holes, cut loops off.
- Project round-trips inside the 3MF (bubble, phone-grip, image-keychain, box-modeler).

## Scoring (criteria from the brief, 1–5 each, higher is better; cost criteria inverted)

| Candidate | Demand | Repeat personalisation | Reuse | Low complexity | Print reliability | Differentiation | Low cost | MakerWorld / subscription fit | Score | Rank |
|---|---|---|---|---|---|---|---|---|---|---|
| Phone-grip integration + P0 fixes | 3 | 4 | 5 | 5 | 4 | 4 | 5 | 4 | 34 | 1 |
| Sliding-lid box engine (17 products) | 5 | 4 | 5 | 3 | 5 | 3 | 3 | 5 | 33 | 2 |
| Trinket Tray presets (heart, cloud, name, dividers) | 4 | 4 | 5 | 5 | 5 | 3 | 5 | 4 | 35* | 3 |
| Gridfinity / storage labels + batch | 5 | 3 | 4 | 3 | 5 | 4 | 3 | 5 | 32 | 4 |
| Cookie cutters + letter cutters | 5 | 3 | 4 | 3 | 3 | 2 | 3 | 4 | 27 | 5 |
| MX clicker family | 4 | 4 | 4 | 2 | 3 | 5 | 2 | 4 | 28 | 6 |
| Stamp maker | 3 | 4 | 4 | 3 | 3 | 3 | 3 | 3 | 26 | 7 |
| QR / NFC / Wi-Fi family | 4 | 3 | 4 | 3 | 5 | 3 | 3 | 4 | 29 | 8 |
| Medals + event products | 3 | 5 | 4 | 3 | 5 | 3 | 3 | 3 | 29 | 9 |
| Sign/plaque (mount holes, multicolour logo) | 3 | 3 | 5 | 4 | 5 | 2 | 4 | 3 | 29 | 10 |
| Lattice containers | 3 | 1 | 3 | 3 | 3 | 2 | 3 | 3 | 21 | 11 |
| Photo frame, pet tag, toppers, shoe charm, stencil | 2–3 | 2–4 | 3 | 3 | 3 | 2 | 3 | 3 | 21–24 | 12 |

\* The tray presets score highest per day of work but live in the Trinket Tray repo, not the hub;
they are scheduled right after this batch so the hub change set stays reviewable.

## What was done in this batch

1. **P0**: `phone-grip` registered in `modelers.json` (Maker tier). `vendor/docs/<id>/` now exists
   for every modeler. The four defects above are documented with file:line for the next session in
   each repo (fixes belong in the modeler repos, per `CLAUDE.md`).
2. **P1**: `box-modeler` built as a local modeler in `modelers/box-modeler/` (the hub's pull script
   now understands `"path"` entries). 8 presets, dividers, raised/engraved/inlay text, SVG artwork
   per colour, thumb notch or ridge, inner/outer sizing, lid-fit calibration set, colour-ready 3MF
   with embedded settings, STL and per-part STL ZIP, 23 unit tests, 18-case export validation.
3. Documentation: this file, `GENERATOR_ROADMAP.md`, `GENERATOR_ARCHITECTURE.md`,
   `PRINT_VALIDATION.md`.

## What was done in batch 2 (2026-10-14)

1. Fix PRs for the four P0 defects above, each reproduced in a browser before and verified after.
2. Trinket-Tray-Generator#7: heart and cloud outlines, text as the artwork, and the Heart Ring Dish,
   Cloud Tray and Name Tray presets. That moves three trays-and-household rows from PRESET/PARTIAL to
   EXISTING once merged. It also fixes one-colour designs vanishing into the floor and zero-area
   triangles when oversized artwork is clipped at a curved wall.
