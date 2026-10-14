# Shared geometry (`packages/geometry`)

The engine code every Generation 2 modeler uses, kept in one place:

| File | What it does |
|---|---|
| `types.ts` | `Vec2`, `Ring`, `TriMesh`, `Part`, `Issue`, `Artwork` |
| `kernel.ts` | loads manifold-3d once; `track()` / `withArena()` free WASM objects after each build |
| `shapes.ts` | 2D/3D helpers: rounded rectangles, unions, offsets, prisms |
| `mesh.ts` | manifold → indexed mesh (welded, flat triangles flipped) and `validateMesh()` (closed, wound, no degenerate triangles, positive volume) |
| `threeMF.ts` | colour-ready 3MF: colour group per colour, mesh per part, object per printed object, Bambu/Orca slot config, embedded settings (`app` names the file) |
| `stl.ts` | binary STL of one mesh, of many parts, or a ZIP with one STL per part |
| `textShapes.ts` | text → outlines in the four bundled three.js fonts, auto-fit, missing-glyph check |

## How modelers get it

Each modeler keeps its **own copy** in `src/shared/`, so it stays a standalone app that can move to
its own repository at any time. A modeler opts in by having a `src/shared/` folder.

```bash
# after editing anything in packages/geometry/src/
npm run sync-shared        # copies into modelers/*/src/shared/
npm test                   # fails if a copy was edited by hand or is missing
```

Then run `npm run check` and `npm run validate` in every modeler that uses it, because a change
here changes all of them.

Rules: no app names or app-specific defaults in here (pass them in, like `app` for the 3MF), and keep
every file free of React and DOM code so it runs in the Web Worker and in Node tests.

Used by: `box-modeler`, `gridfinity-labels`. Trinket Tray (own repository) has an older copy of the
same pattern and is not synced from here.
