import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PARAMS, FONT_LABELS, LIMITS, derive, deriveRack, type BoxParams, type FontId, type Product } from "../core/params";
import { PRESETS, presetParams } from "../core/presets";
import { parseRecipe, toRecipe } from "../core/recipe";
import type { Artwork } from "../core/types";
import { GeometryClient } from "../pipeline/client";
import type { BatchResult, GenerateResult } from "../pipeline/generate";
import { BATCH_WHAT_LABELS, csvHeaders, guessMapping, parseNames, parseOrdersCsv, MAX_BATCH, type BatchWhat, type CsvMapping } from "../core/batch";
import { readProjectFrom3MF } from "../export/threeMF";
import { parseSvgArtwork } from "./loadArtwork";
import { downloadBytes, safeName } from "./download";
import { Choice, Colour, Num, Section } from "./controls";
import { Preview3D, type PreviewModel, type ViewMode } from "./Preview3D";
import { RackControls } from "./RackControls";

const STORAGE_KEY = "box-modeler:params";
const BATCH_KEY = "box-modeler:batch-list";
const SAMPLE_BATCH = "Ava\nNoah\nMia | 2\nHappy\\nBirthday";

function loadBatchList(): string {
  try { return localStorage.getItem(BATCH_KEY) ?? SAMPLE_BATCH; } catch { return SAMPLE_BATCH; }
}

function loadSaved(): BoxParams {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return parseRecipe(s);
  } catch { /* ignore */ }
  return presetParams("gift-tin");
}

/** "127 mm (5.00 in)" */
const inches = (mm: number) => `${mm.toFixed(0)} mm (${(mm / 25.4).toFixed(2)} in)`;

export default function App() {
  const [params, setParams] = useState<BoxParams>(loadSaved);
  const [art, setArt] = useState<Artwork | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("print");
  const [resetToken, setResetToken] = useState(0);
  const [activePreset, setActivePreset] = useState<string | null>("gift-tin");
  const [batchList, setBatchList] = useState(loadBatchList);
  const [csv, setCsv] = useState<{ name: string; text: string; headers: string[]; mapping: CsvMapping } | null>(null);
  const [what, setWhat] = useState<BatchWhat>("lids");
  const [batch, setBatch] = useState<BatchResult | null>(null);
  const [plateNo, setPlateNo] = useState(1);
  const [showBatch, setShowBatch] = useState(false);
  const client = useMemo(() => new GeometryClient(), []);
  const seq = useRef(0);
  const d = useMemo(() => derive(params), [params]);
  const isRack = params.product === "rack";
  const rk = useMemo(() => deriveRack(params), [params]);

  const set = useCallback(<K extends keyof BoxParams>(k: K, v: BoxParams[K]) => {
    setParams((p) => ({ ...p, [k]: v }));
    setActivePreset(null);
  }, []);

  // Rebuild (debounced) whenever params or artwork change.
  useEffect(() => {
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await client.generate(params, art, "box");
        if (id !== seq.current) return;
        setResult(r.result);
        setError(null);
      } catch (e) {
        if (id === seq.current) setError((e as Error).message);
      } finally {
        if (id === seq.current) setBusy(false);
      }
    }, 200);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toRecipe(params))); } catch { /* ignore */ }
    return () => clearTimeout(t);
  }, [params, art, client]);

  useEffect(() => () => client.dispose(), [client]);

  // Batch: parsed input, and a built batch goes stale when anything it used changes.
  const parsed = useMemo(() => (csv ? parseOrdersCsv(csv.text, csv.mapping) : parseNames(batchList)), [csv, batchList]);
  useEffect(() => { setBatch(null); setShowBatch(false); }, [params, art, parsed, what]);
  useEffect(() => { try { localStorage.setItem(BATCH_KEY, batchList); } catch { /* ignore */ } }, [batchList]);
  const buildBatch = async () => {
    setBusy(true);
    try {
      const r = await client.batch(params, art, parsed.items, what);
      setBatch(r.result);
      setPlateNo(1);
      setShowBatch(true);
      setError(null);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const openCsv = async (file: File) => {
    const text = await file.text();
    const headers = csvHeaders(text);
    setCsv({ name: file.name, text, headers, mapping: guessMapping(headers) });
  };
  const batchTitle = safeName(csv ? csv.name.replace(/\.csv$/i, "") : "lids");
  const downloadBatchPlate = async () => {
    const r = await client.exportBatch3mf(params, batchTitle, plateNo);
    save(r.bytes, `${batchTitle}-plate-${String(plateNo).padStart(2, "0")}.3mf`, "model/3mf");
  };
  const downloadBatchZip = async () => {
    const r = await client.exportBatchZip(params, batchTitle);
    save(r.bytes, `${batchTitle}-all-plates.zip`, "application/zip");
  };
  const plate = showBatch && batch ? batch.plates[plateNo - 1] ?? null : null;
  const model: PreviewModel | null = plate ? { parts: plate.parts, lidPrintOffset: [0, 0, 0], lidClosedOffset: [0, 0, 0], kind: "batch" } : result;
  const frameKey = plate ? `batch:${plateNo}:${batch!.plates.length}`
    : result?.rack ? `rack:${result.kind}:${result.rack.W}:${result.rack.H}:${result.rack.D}:${params.rackCols}:${params.rackRows}`
    : result ? `${result.kind}:${result.derived.outerL}:${result.derived.outerW}:${result.derived.outerH}` : "";
  const batchErrors = batch?.issues.filter((i) => i.severity === "error") ?? [];

  // Downloads report problems in the status pill instead of failing silently
  // (inside a claude.ai artifact they go through the viewer's downloads prompt).
  const save = (bytes: Uint8Array, filename: string, mime: string) => {
    downloadBytes(bytes, filename, mime).catch((e) => setError((e as Error).message));
  };

  const title = isRack ? safeName(`enclosure-rack-${(params.encWidth / 25.4).toFixed(2)}x${(params.encDepth / 25.4).toFixed(2)}x${(params.encHeight / 25.4).toFixed(2)}in`)
    : safeName(params.text.split("\n")[0] || activePreset || "box");
  const suffix = isRack ? "" : "-box";

  const download3mf = async () => {
    const r = await client.export3mf(params, title);
    save(r.bytes, `${title}${suffix}.3mf`, "model/3mf");
  };
  const downloadStl = async (zip: boolean) => {
    const r = await client.exportStl(title, zip);
    save(r.bytes, zip ? `${title}${suffix}-parts.zip` : `${title}${suffix}.stl`, zip ? "application/zip" : "model/stl");
  };
  const downloadCalibration = async () => {
    setBusy(true);
    try {
      const r = await client.generate(params, null, "calibration");
      if (!r.result.exportable) { setError("Calibration set could not be built: " + r.result.issues.filter((i) => i.severity === "error").map((i) => i.message).join(" ")); return; }
      const test = isRack ? "key-fit-test" : "lid-fit-test";
      const bytes = await client.export3mf(params, `${title}-${test}`);
      save(bytes.bytes, `${title}-${test}.3mf`, "model/3mf");
      // restore the real model in the worker
      const back = await client.generate(params, art, "box");
      setResult(back.result);
    } finally { setBusy(false); }
  };
  const saveSettings = () => save(new TextEncoder().encode(JSON.stringify(toRecipe(params), null, 2)), `${title}${suffix}-settings.json`, "application/json");
  const openFile = async (file: File) => {
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith(".svg")) {
        setArt(parseSvgArtwork(await file.text(), file.name));
        return;
      }
      let json: string | null = null;
      if (name.endsWith(".json")) json = await file.text();
      else if (name.endsWith(".3mf")) json = readProjectFrom3MF(new Uint8Array(await file.arrayBuffer()));
      if (!json) throw new Error("This 3MF has no saved settings. Only files downloaded from this app reopen.");
      setParams(parseRecipe(json));
      setActivePreset(null);
      setError(null);
    } catch (e) { setError((e as Error).message); }
  };

  const errors = result?.issues.filter((i) => i.severity === "error") ?? [];
  const canExport = !!result?.exportable && !busy;
  const colours = result ? [...new Set(result.parts.map((p) => p.hex))] : [];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="dot" /><div><h1>Box Modeler</h1><small>Sliding-lid boxes, tins, sorting trays and enclosure racks · Valencia Modelers</small></div></div>

        <Section title="1 · Pick a product">
          <Choice label="Making a" value={params.product} set={(v) => set("product", v as Product)}
            options={[{ value: "box", label: "Sliding-lid box" }, { value: "rack", label: "Enclosure rack (stackable cubes with drawer trays)" }]} />
          <div className="presets">
            {PRESETS.filter((p) => (p.params.product ?? "box") === params.product).map((p) => (
              <button key={p.id} className={activePreset === p.id ? "active" : ""} title={p.description}
                onClick={() => { setParams(presetParams(p.id)); setActivePreset(p.id); }}>
                <b>{p.label}</b><small>{p.description}</small>
              </button>
            ))}
          </div>
        </Section>

        {isRack ? <RackControls params={params} set={set} busy={busy} onFitTest={downloadCalibration} /> : <>
        <Section title="2 · Size">
          <Choice label="Dimensions describe the" value={params.sizeMode} set={(v) => set("sizeMode", v)}
            options={[{ value: "inner", label: "inside (what has to fit)" }, { value: "outer", label: "outside (overall size)" }]} />
          <Num label="Length (lid slides this way)" value={params.length} set={(v) => set("length", v)} {...LIMITS.length} />
          <Num label="Width" value={params.width} set={(v) => set("width", v)} {...LIMITS.width} />
          <Num label="Height" value={params.height} set={(v) => set("height", v)} {...LIMITS.height} />
          <Num label="Corner radius" value={params.cornerRadius} set={(v) => set("cornerRadius", v)} {...LIMITS.cornerRadius} />
          <Num label="Wall" value={params.wall} set={(v) => set("wall", v)} {...LIMITS.wall} />
          <Num label="Base" value={params.base} set={(v) => set("base", v)} {...LIMITS.base} />
        </Section>

        <Section title="3 · Lid and fit">
          <Num label="Lid thickness" value={params.lidThickness} set={(v) => set("lidThickness", v)} {...LIMITS.lidThickness} />
          <Num label="Clearance" value={params.clearance} set={(v) => set("clearance", v)} {...LIMITS.clearance}
            hint="Gap around the lid in its rail. 0.25 mm suits most well-tuned printers. Print the fit test to be sure." />
          <Num label="Rail depth" value={params.railDepth} set={(v) => set("railDepth", v)} {...LIMITS.railDepth} hint="How far the lid reaches into the side walls." />
          <Num label="Rail lip" value={params.railLip} set={(v) => set("railLip", v)} {...LIMITS.railLip} hint="Material above the lid that keeps it captive." />
          <Choice label="Grip" value={params.lidGrip} set={(v) => set("lidGrip", v)}
            options={[{ value: "thumbNotch", label: "Thumb notch (recess)" }, { value: "ridge", label: "Raised ridge" }, { value: "none", label: "None" }]} />
          {params.lidGrip !== "none" && <Num label={params.lidGrip === "ridge" ? "Ridge height" : "Notch depth"} value={params.gripDepth} set={(v) => set("gripDepth", v)} {...LIMITS.gripDepth} />}
          <div className="btns"><button onClick={downloadCalibration} disabled={busy}>Download lid fit test (3MF)</button></div>
          <small className="hint">A short box section plus three lids at your clearance ±0.1 mm, each labelled. Print, pick the one that slides without rattling, set Clearance to it.</small>
        </Section>

        <Section title="4 · Compartments" open={params.dividerCols * params.dividerRows > 1}>
          <Num label="Columns (along the length)" value={params.dividerCols} set={(v) => set("dividerCols", Math.round(v))} {...LIMITS.dividerCols} unit="" />
          <Num label="Rows (across the width)" value={params.dividerRows} set={(v) => set("dividerRows", Math.round(v))} {...LIMITS.dividerRows} unit="" />
          <Num label="Divider thickness" value={params.dividerThickness} set={(v) => set("dividerThickness", v)} {...LIMITS.dividerThickness} />
          <Num label="Divider height" value={params.dividerHeightPct} set={(v) => set("dividerHeightPct", v)} {...LIMITS.dividerHeightPct} unit="×" hint="Fraction of the inside height." />
        </Section>

        <Section title="5 · Lid text and artwork">
          <label className="field"><div className="row"><span>Text (Enter for a new line)</span></div>
            <textarea value={params.text} onChange={(e) => set("text", e.target.value)} placeholder="Name, message, label…" /></label>
          <Choice label="Font" value={params.font} set={(v) => set("font", v as FontId)} options={(Object.keys(FONT_LABELS) as FontId[]).map((f) => ({ value: f, label: FONT_LABELS[f] }))} />
          <Num label="Letter height" value={params.textSize} set={(v) => set("textSize", v)} {...LIMITS.textSize} hint="Shrinks automatically if it does not fit." />
          <Choice label="Reads" value={params.textDirection} set={(v) => set("textDirection", v)} options={[{ value: "along", label: "along the length" }, { value: "across", label: "across the width" }]} />
          <Num label="Letter spacing" value={params.letterSpacing} set={(v) => set("letterSpacing", v)} {...LIMITS.letterSpacing} unit="×" />
          <Num label="Line spacing" value={params.lineSpacing} set={(v) => set("lineSpacing", v)} {...LIMITS.lineSpacing} unit="×" />
          <Choice label="Relief" value={params.relief} set={(v) => set("relief", v)}
            options={[{ value: "raised", label: "Raised (second colour on top)" }, { value: "engraved", label: "Engraved (cut into the lid)" }, { value: "inlay", label: "Flush inlay (second colour, smooth top)" }]} />
          <Num label={params.relief === "raised" ? "Relief height" : "Depth"} value={params.reliefDepth} set={(v) => set("reliefDepth", v)} {...LIMITS.reliefDepth} />
          <Num label="Margin from the lid edge" value={params.decoMargin} set={(v) => set("decoMargin", v)} {...LIMITS.decoMargin} />
          <div className="art">
            <label className="field"><span>SVG artwork</span><br />
              <input type="file" accept=".svg,image/svg+xml" onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ""; }} /></label>
            {art && <>
              <span>{art.name}</span>
              <span className="layers">{art.layers.map((l, i) => <span key={i} className="swatch" style={{ background: l.hex }} title={l.hex} />)}</span>
              <button onClick={() => setArt(null)}>Remove</button>
            </>}
          </div>
          {art && <>
            <Num label="Artwork width (0 = fill)" value={params.artWidth} set={(v) => set("artWidth", v)} {...LIMITS.artWidth} />
            <Num label="Gap between artwork and text" value={params.artTextGap} set={(v) => set("artTextGap", v)} {...LIMITS.artTextGap} />
            <label className="field"><div className="row"><span>Print all artwork in one colour</span>
              <input type="checkbox" checked={!!params.artColorOverride} onChange={(e) => set("artColorOverride", e.target.checked ? params.textColor : "")} /></div></label>
            {params.artColorOverride && <Colour label="Artwork colour" value={params.artColorOverride} set={(v) => set("artColorOverride", v)} />}
          </>}
          <small className="hint">PNG/JPG tracing is not in this modeler yet: convert photos to SVG first (Image Keychain does this), or use filled SVG shapes. Each fill colour becomes its own part.</small>
        </Section>

        </>}

        <Section title="6 · Colours">
          <Colour label={isRack ? "Cubes and keys" : "Box"} value={params.bodyColor} set={(v) => set("bodyColor", v)} />
          <Colour label={isRack ? "Trays" : "Lid"} value={params.lidColor} set={(v) => set("lidColor", v)} />
          {!isRack && <Colour label="Text" value={params.textColor} set={(v) => set("textColor", v)} />}
        </Section>

        <Section title="7 · Printer" open={false}>
          <Num label="Nozzle" value={params.nozzle} set={(v) => set("nozzle", v)} {...LIMITS.nozzle} />
          <Num label="Layer height" value={params.layerHeight} set={(v) => set("layerHeight", v)} {...LIMITS.layerHeight} />
          <Num label="Bed size" value={params.bedSize} set={(v) => set("bedSize", v)} {...LIMITS.bedSize} />
        </Section>

        <Section title="8 · Export">
          <div className="btns">
            <button className="primary" onClick={download3mf} disabled={!canExport}>Download 3MF (colour-ready)</button>
            <button onClick={() => downloadStl(false)} disabled={!canExport}>STL (one colour)</button>
            <button onClick={() => downloadStl(true)} disabled={!canExport}>STL per part (ZIP)</button>
          </div>
          <div className="btns">
            <button onClick={saveSettings}>Save settings</button>
            <label className="btn-like"><button onClick={(e) => (e.currentTarget.nextElementSibling as HTMLInputElement).click()}>Open settings / saved 3MF</button>
              <input type="file" accept=".json,.3mf" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ""; }} /></label>
            <button onClick={() => { setParams({ ...DEFAULT_PARAMS }); setActivePreset(null); }}>Reset</button>
          </div>
          {isRack
            ? <small className="hint">The 3MF holds one cube, one tray and every joining key for a {params.rackCols} × {params.rackRows} rack, and carries your settings so you can reopen it here. Print the cube on its back as placed (open side up) and the tray flat: no supports. They may need separate plates: in Bambu Studio add a plate and press Arrange.</small>
            : <small className="hint">The 3MF opens in Bambu Studio / OrcaSlicer as two objects (box, lid) with every colour already on its own filament slot, and carries your settings so you can reopen it here. Print both flat as placed, no supports.</small>}
        </Section>
        {!isRack && <Section title="9 · Batch: one lid per name" open={false}>
          {!csv ? <>
            <label className="field"><span>Names, one lid per line</span>
              <textarea className="list" value={batchList} onChange={(e) => setBatchList(e.target.value)} rows={6} /></label>
            <small className="hint">Add <code>| 3</code> after a name for three of it, <code>\n</code> for a second line, <code>#</code> for a comment. {parsed.items.length} lid{parsed.items.length === 1 ? "" : "s"} (up to {MAX_BATCH}).</small>
          </> : <>
            <div className="row"><span>{csv.name}: {parsed.items.length} lid{parsed.items.length === 1 ? "" : "s"}</span><button onClick={() => setCsv(null)}>Use a typed list</button></div>
            {(["text", "order", "quantity"] as (keyof CsvMapping)[]).map((k) => (
              <Choice key={k} label={k === "text" ? "Lid text column" : k === "order" ? "Order id column" : "Quantity column"} value={csv.mapping[k]}
                set={(v) => setCsv({ ...csv, mapping: { ...csv.mapping, [k]: v } })}
                options={[...(k === "text" ? [] : [{ value: "", label: "(none)" }]), ...csv.headers.map((h) => ({ value: h, label: h }))]} />
            ))}
          </>}
          <label className="field"><span>Import orders (CSV)</span><br />
            <input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) openCsv(f); e.target.value = ""; }} /></label>
          <Choice label="Print for every name" value={what} set={(v) => setWhat(v as BatchWhat)} options={(Object.keys(BATCH_WHAT_LABELS) as BatchWhat[]).map((w) => ({ value: w, label: BATCH_WHAT_LABELS[w] }))} />
          {parsed.warnings.map((w, k) => <div key={k} className="issue warning">⚠ {w}</div>)}
          <div className="btns"><button className="primary" onClick={buildBatch} disabled={busy || !parsed.items.length || !result?.exportable}>Build batch plates</button></div>
          {batch && <>
            {batch.plates.length > 1 && <Choice label="Plate" value={String(plateNo)} set={(v) => { setPlateNo(Number(v)); setShowBatch(true); }}
              options={batch.plates.map((pl) => ({ value: String(pl.index), label: `Plate ${pl.index} · ${pl.objects.length} object${pl.objects.length === 1 ? "" : "s"}` }))} />}
            <div className="btns">
              <button onClick={downloadBatchPlate} disabled={busy || !batch.exportable}>3MF of plate {plateNo}</button>
              <button className="primary" onClick={downloadBatchZip} disabled={busy || !batch.exportable}>All plates + manifest (ZIP)</button>
              <button onClick={() => setShowBatch((s) => !s)}>{showBatch ? "Show the single box" : "Show the batch"}</button>
            </div>
          </>}
          <small className="hint">Every lid uses the settings and artwork above; only the text changes. The ZIP holds one 3MF per plate and a manifest.csv saying which name and order is where.</small>
        </Section>}
        <p className="footer-note">{isRack
          ? "Print one cube and tray first and try the enclosure in it before printing the whole rack."
          : "Lid fit depends on your printer. Treat the first print of a new size as the test print, or use the fit test above."}</p>
      </aside>

      <main className="main">
        <Preview3D result={model} view={plate ? "print" : view} bedSize={params.bedSize} resetToken={resetToken} frameKey={frameKey} />
        <div className="toolbar">
          {!plate && <>
            <button className={view === "print" ? "on" : ""} onClick={() => setView("print")}>Print layout</button>
            <button className={view === "closed" ? "on" : ""} onClick={() => setView("closed")}>{isRack ? "Assembled rack" : "Lid closed"}</button>
          </>}
          <button onClick={() => setResetToken((t) => t + 1)}>Reset view</button>
        </div>
        {(busy || error) && <div className="status">{error ? `Error: ${error}` : "Building…"}</div>}
        {plate && batch ? <div className="readout">
          <b>Batch</b>
          <table><tbody>
            <tr><td>Lids</td><td className="v">{batch.itemCount} on {batch.plates.length} plate{batch.plates.length === 1 ? "" : "s"} ({params.bedSize} mm bed)</td></tr>
            {batch.boxesNeeded > 0 && <tr><td>Boxes</td><td className="v">{batch.boxesNeeded} plain boxes still to print</td></tr>}
            <tr><td>Plate {plate.index}</td><td className="v">{plate.objects.map((o) => o.item.text.replace(/\n/g, " ")).filter((t, i, a) => a.indexOf(t) === i).join(" · ")}</td></tr>
            <tr><td>Checks</td><td className="v">{batch.meshesFailed === 0 && batchErrors.length === 0 ? `✓ ${batch.meshesChecked} parts watertight` : "✗ see problems"}</td></tr>
            <tr><td>Built in</td><td className="v">{(batch.elapsedMs / 1000).toFixed(1)} s</td></tr>
          </tbody></table>
        </div> : isRack ? <div className="readout">
          <b>Enclosure rack</b>
          <table><tbody>
            <tr><td>One cube</td><td className="v">{inches(rk.W)} × {inches(rk.H)} × {inches(rk.D)} deep</td></tr>
            <tr><td>Whole rack</td><td className="v">{inches(rk.W * params.rackCols)} wide × {inches(rk.H * params.rackRows)} tall</td></tr>
            <tr><td>Tray</td><td className="v">{inches(rk.trayW)} × {inches(rk.trayL)}, slides out {inches(rk.travel)}</td></tr>
            <tr><td>To print</td><td className="v">{params.rackCols * params.rackRows} cubes, {params.rackCols * params.rackRows} trays{rk.keysNeeded ? `, ${rk.keysNeeded} keys (one set)` : ""}</td></tr>
            {result && <tr><td>Checks</td><td className="v">{result.meshReports.every((m) => m.ok) && errors.length === 0 ? "✓ watertight, no overlaps" : "✗ see problems"}</td></tr>}
          </tbody></table>
          {result && <div style={{ marginTop: 6 }}>{result.parts.map((p) => <div key={p.name}><span className="swatch" style={{ background: p.hex }} />{p.object}/{p.name} <span style={{ color: "var(--muted)" }}>{(p.volume / 1000).toFixed(1)} cm³</span></div>)}</div>}
        </div> : <div className="readout">
          <b>{params.sizeMode === "inner" ? "Outside" : "Inside"} size</b>
          <table><tbody>
            <tr><td>Box</td><td className="v">{params.sizeMode === "inner" ? `${d.outerL.toFixed(1)} × ${d.outerW.toFixed(1)} × ${d.outerH.toFixed(1)} mm` : `${d.innerL.toFixed(1)} × ${d.innerW.toFixed(1)} × ${d.innerH.toFixed(1)} mm inside`}</td></tr>
            <tr><td>Lid</td><td className="v">{d.lidL.toFixed(1)} × {d.lidW.toFixed(1)} × {params.lidThickness.toFixed(1)} mm</td></tr>
            {result && result.textSizeUsed > 0 && <tr><td>Letters</td><td className="v">{result.textSizeUsed.toFixed(1)} mm tall</td></tr>}
            {result && <tr><td>Parts</td><td className="v">{result.parts.length} · {colours.length} colour{colours.length === 1 ? "" : "s"}</td></tr>}
            {result && <tr><td>Checks</td><td className="v">{result.meshReports.every((m) => m.ok) && errors.length === 0 ? "✓ watertight, no overlaps" : "✗ see problems"}</td></tr>}
          </tbody></table>
          {result && <div style={{ marginTop: 6 }}>{result.parts.map((p) => <div key={p.name}><span className="swatch" style={{ background: p.hex }} />{p.object}/{p.name} <span style={{ color: "var(--muted)" }}>{(p.volume / 1000).toFixed(1)} cm³</span></div>)}</div>}
        </div>}
        {plate && batch && batch.issues.length > 0 && (
          <div className="issues">
            {batch.issues.map((i, k) => <div key={k} className={`issue ${i.severity}`}>{i.severity === "error" ? "✗ " : i.severity === "warning" ? "⚠ " : "ℹ "}{i.message}</div>)}
          </div>
        )}
        {!plate && result && result.issues.length > 0 && (
          <div className="issues">
            {result.issues.map((i, k) => <div key={k} className={`issue ${i.severity}`}>{i.severity === "error" ? "✗ " : i.severity === "warning" ? "⚠ " : "ℹ "}{i.message}</div>)}
          </div>
        )}
      </main>
    </div>
  );
}
