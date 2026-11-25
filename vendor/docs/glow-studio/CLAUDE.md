# Valencia Glow Studio — notes for Claude Code

Photo-lithophane ornament generator (GlowSphere, GlowHeart) for Clark's Valencia Modelers family.
Clark is a beginner programmer who vibe-codes: explain in plain words, keep changes small, verify in the browser.

## Rules

- Generation 2 modeler conventions (see modeler-hub `docs/GENERATOR_ARCHITECTURE.md`): manifold-3d solids,
  geometry in a Web Worker, the preview draws the exported meshes, export blocked on any error.
- `src/shared/` is a copy of modeler-hub `packages/geometry`. Do not edit it here; change the hub package and copy it.
- Photos stay in the browser. Never add a network call, a CDN font or an upload.
- Do not claim a fit, a slicer import or a print result that was not observed. Record real results in `docs/PRINT_VALIDATION.md`.
- No AGPL/GPL code (lithobox-creator is AGPL). See `docs/LICENSING.md`.
- Every mechanical change must keep `npm test` green, especially the assembly-path tests in `test/sphere.test.ts`.
  They move real parts and are the only evidence the mechanism works.
- Avoid faces that exactly coincide in booleans (cutter faces flush with other faces). The shared exporter welds
  coincident vertices, and touching geometry then shows up as "not watertight". Overlap cutters by ≥ 0.02 mm instead.

## Commands

```bash
npm run dev        # :5191
npm test           # ≈2 min
npm run validate && python3 scripts/check_exports.py out/glowsphere-v1 out/glowheart-v1 out/glowoval-v1
node scripts/screens.cjs docs/screens <photo.png>   # needs `npx vite preview --port 5191` running
```
