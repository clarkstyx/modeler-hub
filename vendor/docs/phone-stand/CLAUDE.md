# Phone Stand Keychain — notes for Claude Code

Valencia Modelers' print-in-place keychain phone stand. Clark is a beginner programmer who
vibe-codes: explain in plain words, keep changes small, and verify in the browser.

## Where things are

- `src/core/params.ts` — every setting with its limits, presets and labels. Add a setting here first.
- `src/core/layout.ts` — every derived dimension (hinge position, pin, ledge, hook, stop face, tip,
  phone angle, free text areas). The rules, the geometry and the readout all read from it; never
  recompute a dimension elsewhere.
- `src/core/validateParams.ts` — rules checked before building. Errors block export.
- `src/geometry/buildStand.ts` — the solids. Frame: x along the bar from the keychain end, y across
  it (centre = 0), z up from the bed. Side-plane profiles are extruded across the bar with `prismY`.
  The flap is drawn folded (pointing +x) and turned about the pin afterwards; its text goes on
  before the turn.
- `src/pipeline/` — worker protocol; `generate.ts` validates, builds one stand per distinct name,
  checks every mesh, and packs the batch onto plates (`shelfPack` from the shared engine). Export
  only from a result whose `exportable` is true. Each stand is its own slicer object.
- Printers live in `src/core/params.ts` (`PRINTERS`, `printNotes`): bed, filament slots, slicer and
  the colour notes. Add a printer there; nothing else needs to know.
- `scripts/artifact-page.mjs` turns `dist/` into `artifact/page.html` + assets for the claude.ai
  page; publish with the `downloads` capability.
- `src/shared/` — copy of the hub's `packages/geometry`. Fix bugs there and copy the file here by hand.
- `src/ai/` — the AI assistant (Phase 0 of the Valencia AI CAD Engine). `schema.ts` derives the
  settings schema from `params.ts` (a test fails if a setting has no description); `patch.ts` checks
  a proposed change and labels every row APPLIED / ADJUSTED / REJECTED / UNCHANGED, never clamping
  quietly; `session.ts` holds the rules for Apply, Cancel and Undo (a proposal applies only when the
  engine built it without errors); `prompt.ts` builds what the model sees; `provider.ts` is the seam
  to whichever model answers; `mock.ts` + `scenarios.ts` are the 20 scripted evaluation cases.
  The model only ever proposes settings; `generate()` decides. See `docs/AI_EDITOR.md`.
- `server/` — Node only: `claude.ts` makes the API call, `aiProxy.ts` is the Vite dev/preview
  middleware that holds the key (`.env.local`). Nothing in `server/` is bundled for the browser.
- `docs/DESIGN.md` — the mechanism, the dimensions, and the measurements of the original.

## Conventions

- Print-in-place is the point: the flap and the body must never touch. The slot is the flap's full
  swing grown by `clearance`; the test `the flap never touches the body` measures it. Keep it green.
- The ledge sits 0.2 mm below the hinge slot's floor on purpose: a single T-shaped floor face
  triangulates into a zero-area triangle and fails the mesh check.
- Circles use a multiple of four segments so the lowest line of a cylinder is on the bed exactly.
- The bar's rounded or chamfered edges come from a convex hull of stepped outlines (`edgedBar`).
  Keep every plan outline convex, or that breaks. Stacking thin prisms instead left tangent
  contacts with the ring hole and the dip that failed the mesh check.
- Dark sidebar, plain React, no framework beyond that. Same look as the other modelers.
- Colour-ready 3MF: bar, flap and text are separate parts of one object. Settings are embedded so a
  downloaded 3MF reopens in the app.
- Nothing here has been printed yet. When a print happens, log it in the hub's
  `docs/PRINT_VALIDATION.md` and adjust the defaults (clearance, latch) from what was learned.

## Commands

```bash
npm run dev        # port 5184
npm test
npm run validate   # headless build of presets and edge settings, writes out/*.3mf
npm run check      # typecheck + test + build
npm run eval:live  # the 20 assistant scenarios against the live model (needs ANTHROPIC_API_KEY)
npm run screenshot # browser walkthrough of the assistant in mock mode, writes docs/screenshot-ai.png
```

The assistant's tests use mocked model replies: they prove the pipeline around the model, not the
model. Say which one you ran. The app opens with `?ai=mock` for scripted replies without a key.
