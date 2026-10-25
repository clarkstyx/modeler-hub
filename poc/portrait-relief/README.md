# Portrait Relief — Phase 0/1 proof of concept

Photo → sculpted bas-relief portrait → watertight STL/3MF with a flat back and keyring loop.
Standalone Python; it does **not** touch the hub or any modeler. See `PROPOSAL.md` for the why.

What it does, in one line: subject matting (BiRefNet) → depth estimate (swappable backend) →
gradient-compressed relief (Poisson) + masked shading detail → height field solid (manifold3d)
→ checks → STL/3MF + a contact sheet and `report.csv` for every variant.

## 1. Check the PC first (nothing installed yet)

```powershell
cd poc\portrait-relief
py -3.11 -m venv venv
venv\Scripts\activate
python check_env.py
```

It prints OS, CPU, RAM, GPU (via `nvidia-smi`), and which packages are missing. **Send me that
output** before installing the AI packages: it decides CPU-only vs GPU builds.

## 2. Install the core (CPU-only, ~300 MB)

```powershell
pip install -r requirements.txt
python -m pytest -q tests      # 5 tests, no models, ~5 s: the maths and the mesh builder
```

Optional PyTorch backends (DA3, MoGe-2, likeness score): install `torch` from pytorch.org for your
GPU first, then `pip install -r requirements-ai.txt` and follow the comments in that file.

## 3. Run on one photo

Photo standard (this becomes the customer guideline): one adult, straight on (±15°), eyes open,
closed-lip or gentle smile, soft even light (window, overcast), face ≥ 1000 px wide, plain-ish
background, no glasses for the first test, no filters.

```powershell
python relief.py photo.jpg --backends synthetic,dav2-small --detail 0,0.1,0.2 --out out\test1
```

First run downloads `depth-anything-v2-small` (~100 MB), `BiRefNet-portrait` (~900 MB) and the
MediaPipe landmarker into the Hugging Face cache / `models/`. Then open:

- `out\test1\contact.png` — one row per variant: depth | height map | shaded preview.
- `out\test1\report.csv` — the numbers (see §5).
- `out\test1\04_<variant>.stl` / `.3mf` — open in OrcaSlicer or Blender.

More backends: `--backends da3-small,da3-mono-large,moge2`, or any depth PNG made elsewhere
(the DA3 demo, Marigold, Blender): `--backends file:depth.png` (`file-inv:` if white = far).

Useful knobs:

| Flag | Default | What it does |
|---|---|---|
| `--height` | 90 | portrait crop height in mm (try 60 for the keychain test) |
| `--relief` | 2.5 | relief depth in mm (1–3) |
| `--backing` | 3.5 | flat back thickness |
| `--pitch` | 0.15 | grid spacing in mm; 0.1 is finer and ~2× slower |
| `--beta` | 0.6 | gradient compression: 1 = none (pillow face), 0.5 = strong |
| `--alpha` | 0.02 | gradient size above which jumps get compressed |
| `--detail` | 0,0.1,0.2 | shading detail strengths in mm to try |
| `--loop` | top | top / left / right / none; `--hole 5 --loop-wall 2.5` |
| `--matting` | birefnet | birefnet / mediapipe / png (use the PNG's alpha) / file:mask.png |

## 4. What each file in `relief/` is

| File | Role | Ports to the hub as |
|---|---|---|
| `intake.py` | EXIF, face detection, crop, sharpness/yaw warnings, resize to mm | `src/ai/intake.ts` |
| `matting.py` | BiRefNet (MIT) alpha, speck/pinhole cleanup in mm | `src/ai/matting.ts` (transformers.js) |
| `backends.py` | `DepthResult` interface + synthetic / dav2-small / da3-* / moge2 / file | `src/ai/depth.ts` |
| `landmarks.py` | MediaPipe landmarks, eye/teeth protection masks | `src/ai/landmarks.ts` |
| `relief_math.py` | **the core**: normalise, compress gradients, Poisson, detail layer, compose | `src/relief/*.ts` (tested against these height maps) |
| `mesh.py` | height field → manifold solid, silhouette with border, loop | `src/geometry/buildRelief.ts` on `packages/geometry` |
| `checks.py` | manifold, landmark ordering, range used, stairs, thin features, slopes | validation panel |
| `report.py` | contact sheet, shaded preview, CSV | three.js preview |

## 5. Reading `report.csv`

| Column | Pass looks like | Meaning |
|---|---|---|
| `manifold_pass`, `euler` | True, 0 with a loop (2 without) | watertight, consistent winding, positive volume; one keyring hole = genus 1 |
| `ordering_pass`, `ordering_fail` | True, empty | nose > lip > cheeks > eyes, brow > eye, cheek > ear on the final height map |
| `face_range_frac`, `pillow_face` | ≥ 0.5, False | how much of the relief depth the face itself uses |
| `cheek_steps_at_0.08mm` | lower is smoother | layer contours crossed along the cheeks when printed face-up |
| `thin_px_frac` | < 0.01 | silhouette thinner than a nozzle line (lost hair wisps) |
| `slope_p99_deg`, `steep_frac` | < 60, < 0.02 | overhang risk when printed face-up |
| `depth_seconds`, `seconds_total` | — | the real timings on your PC (the proposal's numbers were estimates) |

## 6. Print test (Phase 1 exit)

1. Pick the best two variants by the sheet + CSV.
2. OrcaSlicer, Creator 5 Pro profile: 0.08 mm layers (and one copy with adaptive layers down to
   0.06 over the relief), 3 walls, 15 % infill, no supports, matte PLA, face-up.
3. Print one upright (standing on the bottom edge, loop up) too: different trade-off (no stairs,
   but overhangs under the nose/chin). Neither orientation is assumed better.
4. Blind pick: show the print and 4 candidate photos to 5 people; target ≥ 4/5.
5. Note every manual fix you make in Blender and how long it took. Each becomes a rule here.

## 7. Known limits of this PoC

- Backends other than `synthetic` were written against the published model APIs but **not run in
  the sandbox where this was built** (no Hugging Face access). The first run on your PC is the test.
- `da3-*` imports the DA3 package per its README; if the API moved, use the DA3 demo to save a
  depth PNG and feed it with `file:`.
- The detail layer on a perfectly flat synthetic image shows faint quantisation stripes; real
  photos do not have that problem, but keep `--detail` ≤ 0.2.
- No likeness score yet (`facenet-pytorch` hook is Phase 1 step 2): first see if the prints are
  worth scoring.
- Privacy: everything runs locally; `out/` contains the crop and height maps, which are still
  identifiable portrait data. Delete customer `out/` folders on your retention schedule.
