# Valencia Glow Studio

Parametric **photo-lithophane ornaments** that you can actually print: the browser turns a photo into
real variable-thickness geometry and generates every mechanical part around it (hollow housing,
removable photo insert, twist-lock frames, LED cap with hanging bail) as separate, validated
STL and 3MF files. A product of Valencia Parametric Studio (Valencia Holdings Inc.).

![GlowSphere V1, lit](docs/screens/01-assembled-led-on.png)
![Exploded assembly](docs/screens/02-exploded.png)

| Product | Status |
|---|---|
| **GlowSphere V1** (bauble, 65–110 mm) | Built and validated by automated tests. **Not yet printed.** |
| **GlowHeart V1** (heart lantern) | Built and validated by automated tests. **Not yet printed.** |
| Oval lantern | Built on the heart engine, validated by tests. Not yet printed. |
| Bell, star, snowflake | Not built (see [docs/BACKLOG.md](docs/BACKLOG.md)); the app shows them as "coming later". |
| Full spherical lithophane | Researched, not built (backlog item). |

"Validated" means: every part is checked watertight, consistently wound, one piece, on the bed,
collision-free when assembled, and the assembly/disassembly paths are simulated on the real meshes.
The exports were re-checked with trimesh and lib3mf. They have **not** been opened in Bambu Studio,
OrcaSlicer or FlashStudio, and no fit has been verified by a physical print yet.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5191
npm test             # 33 geometry, mechanism, export and image tests (≈2 min)
npm run validate     # writes out/glowsphere-v1.zip, glowheart-v1.zip, glowoval-v1.zip
python3 scripts/check_exports.py out/glowsphere-v1 out/glowheart-v1 out/glowoval-v1   # independent check (pip install trimesh lib3mf)
npm run build        # static site in dist/
```

Sample exports made from the synthetic test portrait are in [`samples/`](samples/).

## Privacy

Photos never leave the device. The page decodes the file into grayscale pixels and the geometry
is computed in a Web Worker in the same tab. The app makes no network requests after loading;
fonts and the geometry kernel are bundled. A headless-browser run confirmed this (0 external
requests while building and exporting).

## Where things are

```
src/core/       params.ts (every parameter, limits, tolerant recipe loader), hardware.ts (LED + printer profiles)
src/image/      gray.ts (decode, tone, gamma, denoise, crop, subject centring), raster.ts (text/pattern panels, synthetic test image)
src/geometry/   lithophane.ts (image → watertight thickness solid, curved and flat), sphere.ts (GlowSphere parts),
                lantern.ts (heart/oval), coupon.ts (LED fit coupon), prims.ts, analysis.ts (overhangs, pieces, self-intersection)
src/pipeline/   generate.ts (params → validated parts, part cache), fields.ts, worker.ts, client.ts
src/export/     package.ts (STL per part, 3MF plates, assembly preview, manifest, guide)
src/shared/     copy of the Valencia Modelers shared engine (modeler-hub packages/geometry): kernel, mesh validation, 3MF/STL writers, text
src/ui/         React UI and the three.js preview (draws the exported meshes)
test/           vitest suites run the real engine in Node
scripts/        validate-exports.ts, check_exports.py (trimesh + lib3mf), screens.cjs (headless browser check)
docs/           TECHNICAL.md, PRINT_GUIDE.md, PRINT_VALIDATION.md, BACKLOG.md, LICENSING.md
```

## Documentation

- [Technical notes](docs/TECHNICAL.md): geometry engine, the GlowSphere mechanism, part dimensions and connections
- [Print guide](docs/PRINT_GUIDE.md): orientation and settings for every part, per printer
- [Print validation](docs/PRINT_VALIDATION.md): what is checked, results, what still needs a slicer or a print
- [Known limitations and backlog](docs/BACKLOG.md)
- [Licensing review](docs/LICENSING.md)

All code here is original Valencia code (see LICENSING.md). It is proprietary and not licensed for redistribution.
