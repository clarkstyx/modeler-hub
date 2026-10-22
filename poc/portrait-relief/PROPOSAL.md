# Portrait Relief Generator — feasibility study and proposal

Valencia AI / Valencia Holdings Inc. · prepared 2026-10-22 · planning only, nothing installed or changed.

Note: no reference image reached me with the brief, so "the reference" below means the kind of
sculpted head-and-shoulders relief you described: raised nose, eyes, cheeks, lips, hair texture,
clothing, a flat back and a keyring tab.

---

## 0. The short version

- **Achievable:** a recognisable, genuinely sculpted (not lithophane) head-and-shoulders relief from
  one good customer photo, printed on your Creator 5 Pro in matte PLA, with a flat back, an
  automatic silhouette, a keyring loop and a manifold STL/3MF. Likeness will be "clearly that
  person" for most front-facing photos, not a laser-scan portrait.
- **Not achievable without manual work:** gallery-grade hair strands, perfectly shaped eyes and
  teeth on every photo, side-angle or heavily shadowed photos, glasses.
- **Recommended approach:** a monocular depth model for the big shapes **plus** a shading-derived
  detail layer, fused and compressed in the gradient domain into a relief height map, then a
  height-field solid built with manifold-3d. Everything local and open-licence; no paid AI API.
- **Why not the others:** Blender's bas-relief tools need a 3D model first, pure depth→displace
  flattens faces into pillows, image-to-3D models (Hunyuan3D, TRELLIS) invent a generic face and
  need 10–24 GB of GPU memory, and the accurate face-specific models (FLAME, Basel Face Model
  based) are licensed non-commercial only.
- **First experiment:** one Python script, one photo, five depth backends side by side, printed as
  a 90 mm relief at 0.08 mm layers. Details in §5 and §10.

---

## 1. Feasibility assessment

### What the printer can physically show

| Constraint | Consequence for a relief |
|---|---|
| 0.4 mm nozzle, printed face-up | Smallest reliable raised feature ≈ 0.5 mm wide. On a 90 mm tall piece the face is ~45 mm wide and an eye ~8 mm, so eyelids, nostrils and lip edges are printable; individual eyelashes and single hair strands are not. |
| 0.08–0.12 mm layers, face-up | The relief is built from horizontal slices. With 2 mm of relief depth and 0.08 mm layers there are only **25 contour steps** across the whole face. Gentle slopes (cheeks, forehead) show visible "topographic" rings. This is the single biggest quality limit on FDM, more than the AI. |
| Matte PLA | Hides layer lines well; the right choice. |
| Relief depth 1–3 mm | 1 mm is too shallow to read as sculpture under room light; 2.5–3 mm for a 90 mm piece looks right. Depth is best expressed as a percentage of head width (≈ 6–7 %). |
| Overall height 80–100 mm | Good for a plaque or ornament; big for a keychain (typical 40–60 mm). Shrinking to 60 mm halves every feature, so expect "recognisable silhouette + big features" rather than fine detail at keychain size. |

Mitigations (tested in Phase 2): 0.06 mm or adaptive layer height in OrcaSlicer over the relief
zone, 3 mm relief depth, an "upright" print test (the relief then uses the printer's XY precision
like a lithophane does, but under-nose/under-chin slopes become overhangs), and a light bead-blast
or primer for the premium version.

### What the AI can give you

| Feature | Automatic result | Needs manual help | Unrealistic |
|---|---|---|---|
| Overall head/shoulder shape, silhouette | Good from a clean photo (BiRefNet portrait matting) | Busy backgrounds, hair against similar colours | — |
| Nose, cheeks, chin, brow (big planes) | Good: monocular depth models order these correctly on frontal faces | 3/4 or profile photos, strong side lighting | Exact metric facial depth |
| Eyes | Fair: eyelid line, eyeball bulge | Open/closed eyes, glasses reflections, dark eye sockets read as "deep" | Iris/pupil as geometry |
| Lips, teeth | Fair: lip line and bulge | Smiles with teeth: teeth read as bright → appear raised unless the detail layer is masked | Individual teeth |
| Hair | Fair: volume and major clumps from depth; strand *texture* from the shading layer | Fine, flyaway or very dark hair; hair against dark backgrounds | Strand-accurate hair |
| Clothing | Good: collars, folds and texture from the shading layer | Flat-colour tees have nothing to show | — |
| Ears, glasses, hats | Ears often flattened; glasses frames become ridges, lenses confuse depth | Nearly always | Transparent lenses |
| Likeness | "Yes, that's them" for most straight-on photos with even lighting | Low-res photos, group crops, filters | Photo-realism |

Honest bottom line: with a good input photo (see §5) and 3–8 minutes of operator review per order,
the product is commercially credible. Without an input-photo standard, rejection rate will be high.

---

## 2. Technical recommendation: comparing the five approaches

| Approach | Likeness | Hair / clothing | Geometry quality | Consistency | Automation | Hardware | Licence for commercial use | Cost | Time / image |
|---|---|---|---|---|---|---|---|---|---|
| **1. Blender Bas Relief extension** (extensions.blender.org, G. Bissières; Blender CAM's older one) | n/a: it turns an image or rendered depth into a displaced mesh; quality is whatever depth you feed it | depends on input | OK but heavy meshes, no printability logic | depends on input | Scriptable in bpy but slow to drive per order | any | GPL add-on, fine to use | free | seconds |
| **2. AI depth map + displacement** (the common "depth map lithophane" route) | Fair–good big shapes, but naive depth→height makes a **pillow face**: the depth range is dominated by head-vs-shoulders, so facial features get 10 % of the relief | weak unless a detail layer is added | fine | good | excellent | CPU ok | Apache/MIT models exist (see §3) | free | 1–10 s |
| **2b. Depth + detail layer + gradient-domain relief compression** (recommended) | Good: features keep their relative depth, large jumps are compressed, hair/cloth texture rides on top | good | fine, height field is naturally watertight | good | excellent | CPU ok, GPU nicer | Apache/MIT | free | 2–20 s |
| **3. Image-to-3D (Hunyuan3D 2.1, TRELLIS.2, TripoSR) then flatten** | **Poor for faces**: these models hallucinate a plausible generic head; identity is lost; occasionally good for hair volume | generic | full 3D mesh, needs re-projection to relief | poor | medium | 10–24 GB VRAM; Hunyuan3D-2GP forks run shape on 6 GB slowly | Hunyuan3D 2.1: commercial OK outside EU/UK/Korea, <1 M MAU. TRELLIS.2: MIT. | free | 20 s–20 min |
| **3b. Face-specific reconstruction (DECA/EMOCA, Pixel3DMM, 3DDFA, Deep3DFaceRecon)** | Best facial *structure* | none: face only, no hair, no clothes | smooth template mesh | good | good | GPU | **Blocked:** FLAME and Basel Face Model licences are non-commercial; Pixel3DMM is CC BY-NC | n/a | seconds |
| **4. Blender Python automation** | not an approach on its own; the glue | | | | good for review/sculpt tooling, poor as the main engine (startup time, mesh size) | | GPL, outputs are yours | free | |
| **5. Alternatives** — Sapiens human depth/normals (Meta), Marigold normals, MoGe-2 point maps + normals, MediaPipe Face Landmarker depth prior | Sapiens is the best human-specific depth/normal estimator but **CC BY-NC**. MoGe-2 (MIT code) gives depth + normals in one pass. MediaPipe (Apache) gives 468 landmarks with relative z: a free sanity check and face prior | | | | | | | |

**Recommendation: 2b**, with 5 (MoGe-2 normals or Marigold normals, MediaPipe prior) as optional
upgrades that are tested, not assumed. Keep 1 and 4 as the operator's manual-touch-up station, not
as the pipeline. Drop 3 and 3b.

### Why the gradient-domain step matters (the anti-lithophane argument)

A lithophane maps brightness to thickness. Depth-to-displacement maps *distance* to thickness,
which is better but still wrong for a relief: the shoulders are 150 mm behind the nose, the nose is
30 mm in front of the eyes, so on a 2 mm relief the nose gets 0.3 mm. The relief sculptor's trick
(Weyrich et al. 2007, Kerber et al.) is to work on the depth **gradients**: attenuate large
gradients (silhouette jumps, head-to-shoulder), keep small ones (nose, lips, eye sockets), then
solve a Poisson equation to get a height map back. Result: every feature keeps its local shape, the
overall range fits in 2–3 mm. On top of that we add a **detail layer** (±0.1–0.2 mm) derived from
the photo's shading or an estimated normal map, masked out on teeth, eye whites and skin
highlights. Brightness never drives the big shape, so this is not a lithophane and does not depend
on lighting.

---

## 3. Recommended technology stack

All free, all local. Licences checked 2026-10-22 against the official repos/model cards; recheck
before launch because these move.

| Role | Choice | Licence | Notes |
|---|---|---|---|
| Subject isolation (matting) | **BiRefNet** (portrait or HR-matting variant), ONNX | MIT | Soft alpha for hair. Runs on CPU in ~4 s at 1024². Also has transformers.js builds for the browser. Fallbacks: rembg (MIT code; check each weight), MODNet (Apache). **Avoid** BRIA RMBG 1.4/2.0 (non-commercial). |
| Coarse depth | **Depth Anything V2 Small** (Apache 2.0, 25 M params, browser-capable) and **Depth Anything 3 Small/Base or DA3-Mono-Large** (Apache 2.0) | Apache 2.0 | DA3 Large/Giant and DA V2 Base/Large/Giant are **CC BY-NC**: do not ship them. |
| Depth + normals (upgrade) | **MoGe-2 ViT-L (normal variant)** | code MIT; confirm the weight card | 326 M params, 60 ms on an RTX 3090; CPU a few seconds. Metric depth plus normals in one pass. |
| Normals / fine detail (upgrade) | **Marigold normals v1.1** | code Apache 2.0, weights RAIL++-M (commercial allowed, use restrictions) | Diffusion-based, needs a GPU (tested on RTX 3090), 10–30 s. Highest detail of the group. |
| Face sanity / prior | **MediaPipe Face Landmarker** | Apache 2.0 | 468 landmarks with relative z. Used to check "nose is the highest point", to mask teeth/eye whites, and to find the face box for cropping and sizing. |
| Relief maths | NumPy + SciPy (sparse Poisson solve or FFT), OpenCV (bilateral/guided filters) | BSD/Apache | Pure maths; ports to TypeScript later. |
| Mesh | **manifold-3d** (Python package `manifold3d`, same kernel as `packages/geometry/kernel.ts`) + trimesh for I/O | Apache 2.0 / MIT | Height field → closed solid, union with backing and loop, guaranteed manifold. |
| Printability checks | reuse the rules in `packages/geometry/src/mesh.ts` (closed, wound, no degenerate triangles, positive volume) ported to Python for the PoC | — | Plus relief-specific checks (§4). |
| Review / manual fix | **Blender 4.2+** via `bpy`: import STL, Sculpt (Smooth, Clay Strips), optional Bas Relief extension for re-rendered depth | GPL (outputs unaffected) | Operator tool only. |
| Slicing | OrcaSlicer, profile for Creator 5 Pro: 0.08 mm, adaptive layers in relief zone, 3 walls, 15 % infill, no supports | AGPL | Script-driven via `orca-slicer --slice` for batch later. |
| Likeness scoring | **facenet-pytorch** (MIT) embeddings on a rendered relief vs the photo; MediaPipe landmark depth ordering | MIT / Apache | **Avoid InsightFace model packs** (non-commercial). |

Not recommended: Apple Depth Pro (good model, but Apple's own non-standard licence wording:
read it with a lawyer if you ever want it), Sapiens (CC BY-NC), anything FLAME/BFM-based, Distill
Any Depth (licence unverified).

Hardware: the recommended core path (BiRefNet + Depth Anything small/base + relief maths) runs on
a CPU-only Windows PC in 5–20 s per photo. A GPU with 8 GB (any RTX 3060-class card) makes MoGe-2
and Marigold practical and brings everything under 5 s. Nothing needs 24 GB.

Compatibility notes: Python 3.10–3.12, PyTorch with CUDA on Windows is fine; BiRefNet and Depth
Anything have ONNX exports so the final product can also run with `onnxruntime` only (no PyTorch),
which matters for packaging and for the browser.

---

## 4. Proposed architecture

### 4.1 The pipeline (photo → STL/3MF)

```
photo.jpg
  │
  ├─ 1. Intake checks ........ face found (MediaPipe), one face, ≥ 1000 px across the face,
  │                            yaw/pitch < 20°, not blurry (Laplacian variance), warn on glasses
  ├─ 2. Crop & normalise ...... head-and-shoulders crop, square 1024–1536 px, EXIF rotation fixed
  ├─ 3. Matting ............... BiRefNet → soft alpha; feather 1–2 px; drop islands < 1 mm²
  ├─ 4. Coarse depth .......... Depth Anything (relative, inverse depth) → align scale so the
  │                            nose–ear span is ~1.0, shoulders ~0.5
  ├─ 5. Face prior (optional) . MediaPipe z blended into the face box, teeth/eye-white masks
  ├─ 6. Detail layer .......... guided filter of luminance (or MoGe/Marigold normals integrated
  │                            at high frequency), masked, limited to ±0.15 mm
  ├─ 7. Relief compression .... gradient attenuation (Fattal/Weyrich style) + Poisson solve,
  │                            then depth = user "relief depth" (1–3 mm), floor at 0 on the alpha
  ├─ 8. Silhouette ............ alpha → polygon (CrossSection), offset +0.6 mm border, smooth
  ├─ 9. Solid ................. height field over the silhouette (manifold) ∪ backing prism
  │                            (3–4 mm) ∪ keyring loop (hole ≥ 4 mm, wall ≥ 2.5 mm) at a chosen edge
  ├─ 10. Checks ............... manifold, positive volume, min feature 0.5 mm, slope/overhang,
  │                            loop wall, relief depth within range, "stair count" estimate
  ├─ 11. Preview .............. three.js (hub) / Blender render with 45° key light
  └─ 12. Export ............... STL, colour-ready 3MF with the recipe embedded, PNG height map
```

Everything from step 7 onward is deterministic geometry and is the part that later lives in
`packages/geometry`. Steps 3–6 are "AI backends" behind one tiny interface:

```python
class DepthBackend(Protocol):
    name: str
    def run(self, rgb: np.ndarray, alpha: np.ndarray) -> DepthResult   # depth, optional normals
```

so the PoC can compare backends and the product can swap them without touching the relief code.

### 4.2 Where it runs, and privacy

Two deployment shapes, decided by the PoC result:

- **A. In the browser (preferred if the small models are good enough).** Both BiRefNet and
  Depth Anything V2 Small have transformers.js/ONNX builds that run with WebGPU (seconds) or
  WASM (tens of seconds). The customer's photo never leaves their device, which is the strongest
  possible privacy story and fits the hub exactly (every modeler is a client-side Vite app). Model
  download is ~30–100 MB once, cached.
- **B. Local order processor on your Windows PC.** A Python service (watched folder or
  `localhost` API) runs the heavier models (DA3-Mono-Large, MoGe-2, Marigold). The hub, or
  Etsy/email, only delivers the photo to you. No third-party AI service sees the photo.

Either way: no cloud AI API, no per-image fees. Cloudflare Pages Functions cannot run these models
(no GPU, 10 ms–30 s CPU limits), so "run it on the hub's server" is not an option, and that is a
feature, not a bug.

Privacy and retention (Canada, PIPEDA; the Privacy Commissioner's 2025 biometrics guidance):
a photo used to make a print is personal information; a face embedding is biometric and
"sensitive". Rules for us:
1. State purpose and retention on the upload page ("used only to make your relief; deleted 30 days
   after shipping").
2. Do not store face embeddings; the likeness score is computed and discarded.
3. The hub's 3MF convention embeds the source image in the file (`Metadata/source-image.png`,
   as image-keychain does). For portraits, embed the **height map**, not the photo, or make it
   opt-in, so order files are not photo archives.
4. Keep order folders on an encrypted drive; purge on a schedule; never upload to MakerWorld.
5. Only the subject (or a parent/guardian) may order a portrait of a person; put that in the terms.

### 4.3 Integration into the hub (Phase 4)

What I inspected: `modelers.json` is the catalogue (tier levels 0/1/2), each modeler is a Vite app
built by `scripts/pull.mjs` into `/m/<id>/`, Generation 2 engines live in `src/core | geometry |
pipeline (Web Worker) | export | ui`, share `packages/geometry` (manifold-3d kernel, `validateMesh`,
`buildThreeMF`, `partsToStl`, recipes embedded in the 3MF), and image-keychain already does
client-side image processing with keyring-loop placement, hole-anywhere, raised rim and a
validation panel. Nothing is restructured; the new module slots in as:

- `modelers/portrait-relief/` (or its own repo `clarkstyx/portrait-relief-modeler`), id
  `portrait-relief`, category "Keychains", tier `seller`, status `beta` in `modelers.json`.
- `src/ai/` — matting + depth backends (transformers.js, WebGPU with WASM fallback), running in
  the existing Web Worker pattern; models loaded from the bundle-relative URL so `--base=/m/<id>/`
  works (the architecture doc's rule).
- `src/relief/` — the deterministic maths from steps 6–7 (TypeScript port of the Python PoC,
  tested against the PoC's saved height maps so the port is proven bit-for-bit close).
- `src/geometry/buildRelief.ts` — height field → `Manifold` using `packages/geometry` helpers
  (`prism`, `mUnion`, `csOffset`), keyring loop reused from image-keychain's approach.
- Recipe = `{ reliefDepthMm, backingMm, heightMm, loop: {side,x,y,holeMm}, smoothing,
  detailStrength, heightMapPng }`, embedded in the 3MF like every other modeler.
- Batch: the existing `BatchItem`/`Plate` interface (gridfinity-labels, box-modeler) for plates
  of 4–6 portraits on the 300 × 300 bed.
- New shared piece for `packages/geometry`, only after a second modeler needs it (the repo's own
  rule): `heightField.ts` (grid → closed manifold with cropping to a CrossSection).

The MakerWorld funnel: there is no OpenSCAD mirror possible for an AI step, so the free MakerWorld
piece should be a **"portrait plaque frame"** (backing + loop + name text, with an STL slot where the
relief goes) that links to the hub for the actual generator.

---

## 5. Proof-of-concept plan (Phase 1)

**Input photo standard** (this doubles as the customer guideline later):
- One person, straight on (±15°), eyes open, neutral or gentle smile with closed lips for test #1.
- Soft, even, frontal light (window light, overcast). No flash, no hard side shadows.
- Head-and-shoulders fill ≥ 60 % of the frame; face ≥ 1000 px wide; JPG/PNG, no filters.
- Plain background preferred; hair not blending into it.
- Test #2 and #3 (same session): a teeth-showing smile, and a glasses photo, to see failures early.

**Steps** (one script, `poc/relief.py`, run on your Windows PC, Python 3.11, in a venv):
1. Intake + crop + matting → `01_alpha.png`.
2. Run depth backends: DA-V2-Small, DA3-Small, DA3-Mono-Large, MoGe-2 (if GPU), Marigold (if
   GPU) → `02_depth_<backend>.png` (16-bit).
3. Relief compression + detail layer with three settings (no detail / 0.1 mm / 0.2 mm) →
   `03_height_<backend>_<detail>.png` (16-bit, mm encoded).
4. Solid: 90 mm tall, 3.5 mm backing, 2.5 mm relief, loop top-centre, 5 mm hole → `04_<…>.stl`
   and `.3mf`, plus `05_<…>_render.png` (Blender, 45° key light, matte grey).
5. Pick the best two by the checks below; slice in Orca at 0.08 mm (and one at 0.06 adaptive);
   print both in matte PLA. Photograph prints under a desk lamp.

**Expected outputs:** a contact sheet of renders per backend, two printed pieces, a numbers table,
and a written verdict on browser-only (A) vs local processor (B).

**Objective quality checks (automated, in the script):**
- Manifold: closed, consistent winding, no degenerate triangles, volume > 0 (same rules as
  `validateMesh`).
- Landmark depth ordering on the final height map: nose tip > upper lip > cheeks > eye corners >
  ear; brow > eye socket. Pass/fail per relation.
- Relief histogram: ≥ 70 % of the 2.5 mm range used inside the face box (a pillow face fails).
- Min feature 0.5 mm, hole ≥ 4 mm, loop wall ≥ 2.5 mm, overhang slopes ≤ 45° (face-up print).
- Stair estimate: count of 0.08 mm contour rings crossing the cheek; report it, no pass/fail yet.

**Likeness measurement:**
- **Embedding score:** facenet-pytorch cosine similarity between the photo and a frontal render
  of the relief (and the printed piece's photo). Expect 0.5–0.7 for a good relief vs 0.8+ for two
  photos of the same person; we calibrate the threshold on the first three subjects.
- **Blind pick test:** show 5 people the printed piece and 4 candidate photos (same age/sex);
  target ≥ 4/5 correct.
- **Landmark overlay:** project MediaPipe landmarks from the photo onto the render; mean offset
  in mm after alignment (target < 1 mm at 90 mm scale).

**Printability tests:** one face-up at 0.08, one at 0.06 adaptive, one upright at 0.12 (lithophane
orientation) to compare stair-stepping vs overhang artefacts; loop pull test (hang 2 kg); drop test.

**Estimated manual cleanup for the PoC:** 10–20 minutes in Blender Sculpt (smooth the hair/background
boundary, flatten teeth if raised, soften an eye). Record each fix; each becomes a parameter or a
mask rule in Phase 2.

---

## 6. Commercial viability

**Time per order (target state, Phase 3):**

| Step | Time |
|---|---|
| Photo intake and check | 1 min (automatic reject + customer re-request email template) |
| AI + relief + checks | 10–40 s compute |
| Operator review: mask, relief depth, detail, loop position, preview | 3–8 min |
| Blender touch-up when needed (est. 1 in 4 orders at first, 1 in 10 later) | 5–15 min |
| Slicing (batched, 4–6 per plate) | 2 min per plate |
| Printing, 90 × 65 × 6 mm at 0.08 mm | 2.5–3.5 h per piece, 4–6 per plate, unattended |
| Finishing, packing | 5 min |

Material ≈ 25 g PLA ≈ CAD 1. Realistic sale price CAD 20–35 as a keychain/ornament, CAD 40–60 as
a plaque with a name. The gross margin is fine; the constraint is **print hours**: at 3 h per piece
one Creator 5 Pro yields ~8 pieces/day. A 60 mm keychain at 0.12 mm cuts that to ~1 h but loses
detail; offer both.

**Main obstacles to profit, in order:**
1. **Customer photos.** The dominant failure. Fix with a strict upload guide, instant automated
   rejection with reasons, and a "we'll use your best photo" expectation set in the listing.
2. **"It doesn't look like me."** Reliefs of yourself are judged harshly. Preview approval before
   printing (the 3D preview in the hub) moves the decision to the customer and cuts reprints.
3. **Operator minutes.** Every manual Blender fix must be turned into a parameter or a rule, or the
   business becomes a sculpting job.
4. **FDM stair-stepping** on gentle slopes. Decided in Phase 2 by test prints; matte filament and
   adaptive layers are the levers; resin would be better but you specified FDM.
5. Patreon/hub positioning: Seller-tier feature with per-order credits, or keep it in-house as a
   service product only. The in-browser path (A) makes the hub version possible; path (B) means
   the hub only takes orders.

---

## 7. Risks and limitations (where AI reconstruction fails)

- **Eyes:** depth models see dark sockets as far and bright eyeballs as near; glasses lenses and
  reflections produce blobs. Fix with MediaPipe eye masks: force a gentle eyeball bulge and a
  crisp lid line, suppress the detail layer inside the eye.
- **Teeth:** bright → raised in the detail layer. Mask the mouth interior, keep only the lip line.
  Recommend closed-lip or gentle smiles in the guide.
- **Hair:** volume comes out as a smooth helmet; strand texture is only what the shading layer
  adds. Dark hair on dark backgrounds mats badly. Flyaway strands become specks (the min-feature
  filter removes them). Curly hair is the best case, straight dark hair the worst.
- **Ears:** often flattened or merged into hair; acceptable because ears are rarely identity
  carriers, but note it.
- **Glasses:** frames become ridges, bridge and temples merge into the face. Offer "glasses off"
  as the default recommendation and an "emboss frames as a line" style later.
- **Angle:** beyond ~20° yaw the far cheek compresses and the nose profile is lost; profile
  photos produce a half-face. Reject at intake.
- **Lighting:** side light bakes shadows into the detail layer (that is the lithophane failure
  mode). The guided-filter detail layer limits it; the photo guide prevents it.
- **Children and babies:** soft features, little depth contrast; outputs read as "a baby" more
  than "this baby". Set expectations.
- **Licensing drift:** model licences change version to version (Depth Anything V2 vs 3, Large vs
  Small). Pin exact checkpoints and record the licence in the repo.
- **Likeness ceiling:** this is a sculpted impression of a photo. A photo-realistic or
  scan-accurate portrait is not on the table with one photo and a 0.4 mm nozzle.

---

## 8. Implementation roadmap

| Phase | Goal | Deliverables | Exit criteria | Effort |
|---|---|---|---|---|
| **0. Research and tool validation** | Confirm the stack runs on your PC | Python venv, BiRefNet + Depth Anything + MoGe-2 smoke test on one photo, licence sheet pinned to checkpoints, GPU inventory | Each backend produces a depth PNG on your machine | 1–2 days |
| **1. Single-photo PoC** (§5) | Prove the relief method and pick the backend | `poc/relief.py`, contact sheet, two prints, numbers table, verdict A vs B | Blind pick ≥ 4/5, manifold STL, nose/cheek/eye ordering pass | 3–5 days |
| **2. Print-quality optimisation** | Make the print look like the render | Orca profile for the Creator 5 Pro, layer/orientation/depth matrix (3 × 3 prints), min-feature and slope rules written into checks, eye/teeth/hair masks | A second subject prints well first time with no Blender touch-up | 1–2 weeks |
| **3. Semi-automated workflow** | Process real orders | Watched-folder processor, review UI (sliders: depth, detail, smoothing; loop placement; preview render), customer photo guide + auto-reject emails, retention script, 3MF with recipe, batch plates | 10 orders processed at ≤ 8 operator minutes each | 2–3 weeks |
| **4. Hub integration** | Portrait Relief Generator as a modeler | `modelers/portrait-relief` Generation 2 app: transformers.js backends in the worker, TS port of the relief maths validated against PoC height maps, `buildRelief.ts` on manifold-3d, three.js preview, validation panel, 3MF/STL, `modelers.json` entry at Seller tier, `vendor/docs` and skill | `npm run check`, `npm run validate`, visible at `/m/portrait-relief/` behind the gate, same output as the Python path within 0.05 mm | 3–4 weeks |
| **5. Commercial batch production** | Scale | Order queue (Etsy/hub → folder), plate packing via the shared batch interface, QC checklist, pricing tiers (60 mm keychain, 90 mm ornament, plaque with name), MakerWorld frame funnel, privacy page and terms | 20 orders/week with ≤ 10 % reprints | ongoing |

Phases 0–3 are independent of the hub, as you asked; only Phase 4 touches it.

---

## 9. Recommended solution and reasoning

**Build a depth-plus-detail relief engine, not an AI 3D-reconstruction product.**

- It is the only route that is simultaneously free, local, commercially licensed, CPU-capable and
  portable to the browser.
- The quality lever is the relief maths (gradient compression, masks, detail layer), which is
  deterministic, testable with your existing `validateMesh`-style checks, and improves with every
  manual fix you turn into a rule. The AI backend is a swappable commodity behind one interface.
- It reuses what you already have: manifold-3d, the 3MF writer, the keyring-loop logic from
  image-keychain, the Web Worker pipeline, batch plates.
- The two serious alternatives fail on exactly the things you care about: image-to-3D loses
  identity and needs big GPUs; face-model fitting is the most accurate but legally closed to
  commercial use.

The main thing it cannot promise is fine detail at keychain size on FDM; that is a physics limit,
so the product line should lead with the 90 mm ornament/plaque and offer the 60 mm keychain as the
"silhouette and features" version.

## 10. The exact first experiment

1. On your Windows PC: `py -3.11 -m venv relief && relief\Scripts\activate`, install
   `torch` (CUDA build if you have an NVIDIA card, else CPU), `onnxruntime`, `opencv-python`,
   `numpy scipy trimesh manifold3d mediapipe facenet-pytorch transformers`.
2. Take **one** photo of a willing adult following the §5 standard, 2000+ px across the face.
3. Run `relief.py photo.jpg --backends dav2-small,da3-small,da3-mono-large[,moge2]`
   `--height 90 --backing 3.5 --relief 2.5 --detail 0,0.1,0.2 --loop top`.
4. Open the contact sheet `out/contact.png`; read `out/report.csv` (manifold, landmark ordering,
   range used, embedding score per variant).
5. Print the best variant face-up at 0.08 mm and the same variant at 0.06 mm adaptive, matte
   PLA, 3 walls, 15 % infill, no supports.
6. Judge: blind pick test with 5 people; photograph under a lamp next to the render.

Decision rule after step 6: if DA-V2-Small or DA3-Small wins or ties, go browser-first (path A,
Phase 4 becomes cheap). If only the larger models pass, build the local processor (path B) and keep
the hub as the order front end.

---

### Sources checked (2026-10-22)

- Depth Anything 3 licences per checkpoint: github.com/ByteDance-Seed/Depth-Anything-3 and the
  DA3-LARGE/GIANT model cards (Small/Base/Mono-Large/Metric-Large Apache 2.0; Large/Giant CC BY-NC).
- Depth Anything V2: Small Apache 2.0; Base/Large/Giant CC BY-NC; `onnx-community/depth-anything-v2-small`.
- BiRefNet: MIT; `onnx-community/BiRefNet-portrait-ONNX`.
- FLAME licence (flame.is.tue.mpg.de) and Basel Face Model 2017/2019 licences: non-commercial.
- Pixel3DMM: CC BY-NC 4.0. Sapiens model cards: CC BY-NC 4.0.
- Hunyuan3D 2.1 Community License: commercial OK, excludes EU/UK/South Korea, 1 M MAU cap.
- TRELLIS.2: MIT, 24 GB GPU. MoGe: code MIT, 60 ms on RTX 3090. Marigold: code Apache 2.0, weights RAIL++-M.
- Apple Depth Pro: Apple-specific licence text (permits use/modify/redistribute; non-standard).
- Office of the Privacy Commissioner of Canada biometrics guidance (Aug 2025) via Norton Rose Fulbright / Miller Thomson summaries.
- Relief literature: Weyrich et al. 2007 / Kerber et al. (gradient-domain bas-relief), PMC5375858 (base + detail map blending).
