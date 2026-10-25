# Licence sheet, checkpoint by checkpoint (checked 2026-10-22)

Rule: a model is only "cleared" when the **exact checkpoint** you ship has a commercial licence.
Code licence and weight licence can differ. Recheck each row before the first sale and pin the
checkpoint revision in `run.json`.

| Component | Exact artefact | Licence | Commercial use | Status |
|---|---|---|---|---|
| Depth Anything V2 Small | `onnx-community/depth-anything-v2-small` (ONNX) / `depth-anything/Depth-Anything-V2-Small-hf` | Apache-2.0 | yes | **cleared** |
| Depth Anything V2 Base / Large / Giant | any | CC BY-NC 4.0 | **no** | do not ship |
| Depth Anything 3 Small / Base | `depth-anything/DA3-SMALL`, `DA3-BASE` | Apache-2.0 | yes | cleared (code Apache-2.0) |
| Depth Anything 3 Mono-Large / Metric-Large | `depth-anything/DA3MONO-LARGE`, `DA3METRIC-LARGE` | Apache-2.0 | yes | cleared |
| Depth Anything 3 Large / Giant / Nested | any | CC BY-NC 4.0 (maintainers confirmed for Large) | **no** | do not ship |
| MoGe-2 | code `microsoft/MoGe` | MIT | yes (code) | **weights: confirm the Hugging Face model card** (`Ruicheng/moge-2-vitl-normal`) before selling |
| Marigold depth / normals v1.1 | code `prs-eth/Marigold`; weights `prs-eth/marigold-*-v1-1` | code Apache-2.0; weights RAIL++-M | yes, with use-based restrictions (no harmful uses; pass restrictions on) | usable; read Attachment A once |
| Apple Depth Pro | `apple/ml-depth-pro` | Apple's own licence text ("personal, non-exclusive" grant to use/modify/redistribute) | unclear wording | not used |
| Meta Sapiens depth / normals | any | CC BY-NC 4.0 | **no** | do not use |
| FLAME / DECA / EMOCA / Pixel3DMM / any FLAME-based | any | FLAME: non-commercial; Pixel3DMM CC BY-NC | **no** | do not use |
| Basel Face Model 2017/2019 (3DDFA, Deep3DFaceRecon…) | any | non-commercial; "manufacture or sell products" explicitly prohibited | **no** | do not use |
| Hunyuan3D 2.1 | `tencent/Hunyuan3D-2.1` | Tencent Hunyuan 3D 2.1 Community License | yes in Canada (not EU/UK/KR), < 1 M MAU, notice file | not needed for this approach |
| TRELLIS.2 | `microsoft/TRELLIS.2` | MIT | yes | not needed; 24 GB GPU |
| BiRefNet (portrait, general, HR-matting) | `onnx-community/BiRefNet-portrait-ONNX` (conversion of `ZhengPeng7/BiRefNet`) | MIT | yes | **cleared** |
| BRIA RMBG 1.4 / 2.0 | any | source-available, non-commercial | **no** | do not use |
| MediaPipe Face Landmarker / Selfie Segmenter | `face_landmarker.task`, `selfie_segmenter.tflite` | Apache-2.0 | yes | cleared |
| facenet-pytorch (likeness score only) | pip `facenet-pytorch`, VGGFace2 weights | MIT | yes | cleared; embeddings are never stored |
| InsightFace model packs (buffalo_l …) | any | non-commercial research | **no** | do not use |
| manifold3d, trimesh, NumPy, SciPy, OpenCV, Pillow, onnxruntime | pip | Apache-2.0 / MIT / BSD | yes | cleared |
| Blender 4.x (+ Bas Relief extension) | app | GPL (your outputs are yours) | yes | operator tool only |
| OrcaSlicer | app | AGPL (outputs are yours) | yes | — |

Sources: the DA3 README model table and the DA3-LARGE/GIANT model-card discussion; the Depth Anything V2
README; flame.is.tue.mpg.de/modellicense.html; faces.dmi.unibas.ch BFM licence PDFs; the Hunyuan3D-2.1
LICENSE file; the TRELLIS.2 and MoGe READMEs; the Marigold README; the ml-depth-pro LICENSE file;
the Sapiens and Pixel3DMM model cards / README.
