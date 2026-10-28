# Custom Spinner

A parametric **keychain spinner** with your own image on it. Upload a logo or picture and the
modeler splits it into print colours and inlays it in the face plates. You get a multi-colour 3MF
with all the parts:

- **Outer ring** with the keyring loop and two cone sockets
- **Inner ring** that spins on two cone pins
- **Face plate ×2**, one snapped into each side of the inner ring, both showing your image (or a
  plain back)

The geometry is rebuilt from Clark's proven test print, so the parts fit the same way. See
[docs/DESIGN.md](docs/DESIGN.md) for the measurements.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

1. Choose an image (PNG, JPG, WebP or SVG), or try the sample arrow badge.
2. Check the colours. Remove any background colour that was not removed automatically.
3. Set the artwork size, rotation and part colours.
4. Download the 3MF and open it in Bambu Studio or OrcaSlicer. The filaments are pre-assigned.

**Best results:** a clean logo or drawing with flat colours (PNG with a transparent or plain
background). Photos work in Photo mode but look posterised.

## Printing and assembly

- Print the face plates as they come: face-down, so the colours are the first layers.
- Press a face plate into each side of the inner ring until it clicks (the key slots line up with
  the ribs inside the ring, so it goes in four ways: pick the one where the image is upright).
- Squeeze the outer ring into an oval and pop the inner ring's pins into the sockets.
- If the plates are too tight, raise **Plate fit**; if the spinner is stiff, raise **Pin gap**.

## Commands

| Command                                  | What it does                                                   |
| ---------------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                            | Development server                                             |
| `npm run build`                          | Typecheck and production build into `dist/`                    |
| `npm test`                               | Geometry, fit and export tests (Vitest)                        |
| `npm run check`                          | Lint + typecheck + tests + build                               |
| `npm run sample`                         | Headless sample to `examples/output/` (`-- path/to/image.png`) |
| `python3 scripts/verify_3mf.py file.3mf` | Strict 3MF check with lib3mf and trimesh                       |

> Uploaded artwork is the responsibility of the user. Make sure you have the rights to reproduce
> any artwork, logos or trademarks.
