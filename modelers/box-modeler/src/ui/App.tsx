import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PARAMS, FONT_LABELS, LIMITS, derive, type BoxParams, type FontId } from "../core/params";
import { PRESETS, presetParams } from "../core/presets";
import { parseRecipe, toRecipe } from "../core/recipe";
import type { Artwork } from "../core/types";
import { GeometryClient } from "../pipeline/client";
import type { GenerateResult } from "../pipeline/generate";
import { readProjectFrom3MF } from "../export/threeMF";
import { parseSvgArtwork } from "./loadArtwork";
import { downloadBytes, safeName } from "./download";
import { Choice, Colour, Num, Section } from "./controls";
import { Preview3D, type ViewMode } from "./Preview3D";

const STORAGE_KEY = "box-modeler:params";

function loadSaved(): BoxParams {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return parseRecipe(s);
  } catch { /* ignore */ }
  return presetParams("gift-tin");
}

export default function App() {
  const [params, setParams] = useState<BoxParams>(loadSaved);
  const [art, setArt] = useState<Artwork | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("print");
  const [resetToken, setResetToken] = useState(0);
  const [activePreset, setActivePreset] = useState<string | null>("gift-tin");
  const client = useMemo(() => new GeometryClient(), []);
  const seq = useRef(0);
  const d = useMemo(() => derive(params), [params]);

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

  const title = safeName(params.text.split("\n")[0] || activePreset || "box");

  const download3mf = async () => {
    const r = await client.export3mf(params, title);
    downloadBytes(r.bytes, `${title}-box.3mf`, "model/3mf");
  };
  const downloadStl = async (zip: boolean) => {
    const r = await client.exportStl(title, zip);
    downloadBytes(r.bytes, zip ? `${title}-box-parts.zip` : `${title}-box.stl`, zip ? "application/zip" : "model/stl");
  };
  const downloadCalibration = async () => {
    setBusy(true);
    try {
      const r = await client.generate(params, null, "calibration");
      if (!r.result.exportable) { setError("Calibration set could not be built: " + r.result.issues.filter((i) => i.severity === "error").map((i) => i.message).join(" ")); return; }
      const bytes = await client.export3mf(params, `${title}-lid-fit-test`);
      downloadBytes(bytes.bytes, `${title}-lid-fit-test.3mf`, "model/3mf");
      // restore the real model in the worker
      const back = await client.generate(params, art, "box");
      setResult(back.result);
    } finally { setBusy(false); }
  };
  const saveSettings = () => downloadBytes(new TextEncoder().encode(JSON.stringify(toRecipe(params), null, 2)), `${title}-box-settings.json`, "application/json");
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
        <div className="brand"><span className="dot" /><div><h1>Box Modeler</h1><small>Sliding-lid boxes, tins and sorting trays · Valencia Modelers</small></div></div>

        <Section title="1 · Pick a product">
          <div className="presets">
            {PRESETS.map((p) => (
              <button key={p.id} className={activePreset === p.id ? "active" : ""} title={p.description}
                onClick={() => { setParams(presetParams(p.id)); setActivePreset(p.id); }}>
                <b>{p.label}</b><small>{p.description}</small>
              </button>
            ))}
          </div>
        </Section>

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

        <Section title="6 · Colours">
          <Colour label="Box" value={params.bodyColor} set={(v) => set("bodyColor", v)} />
          <Colour label="Lid" value={params.lidColor} set={(v) => set("lidColor", v)} />
          <Colour label="Text" value={params.textColor} set={(v) => set("textColor", v)} />
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
          <small className="hint">The 3MF opens in Bambu Studio / OrcaSlicer as two objects (box, lid) with every colour already on its own filament slot, and carries your settings so you can reopen it here. Print both flat as placed, no supports.</small>
        </Section>
        <p className="footer-note">Lid fit depends on your printer. Treat the first print of a new size as the test print, or use the fit test above.</p>
      </aside>

      <main className="main">
        <Preview3D result={result} view={view} bedSize={params.bedSize} resetToken={resetToken} />
        <div className="toolbar">
          <button className={view === "print" ? "on" : ""} onClick={() => setView("print")}>Print layout</button>
          <button className={view === "closed" ? "on" : ""} onClick={() => setView("closed")}>Lid closed</button>
          <button onClick={() => setResetToken((t) => t + 1)}>Reset view</button>
        </div>
        {(busy || error) && <div className="status">{error ? `Error: ${error}` : "Building…"}</div>}
        <div className="readout">
          <b>{params.sizeMode === "inner" ? "Outside" : "Inside"} size</b>
          <table><tbody>
            <tr><td>Box</td><td className="v">{params.sizeMode === "inner" ? `${d.outerL.toFixed(1)} × ${d.outerW.toFixed(1)} × ${d.outerH.toFixed(1)} mm` : `${d.innerL.toFixed(1)} × ${d.innerW.toFixed(1)} × ${d.innerH.toFixed(1)} mm inside`}</td></tr>
            <tr><td>Lid</td><td className="v">{d.lidL.toFixed(1)} × {d.lidW.toFixed(1)} × {params.lidThickness.toFixed(1)} mm</td></tr>
            {result && result.textSizeUsed > 0 && <tr><td>Letters</td><td className="v">{result.textSizeUsed.toFixed(1)} mm tall</td></tr>}
            {result && <tr><td>Parts</td><td className="v">{result.parts.length} · {colours.length} colour{colours.length === 1 ? "" : "s"}</td></tr>}
            {result && <tr><td>Checks</td><td className="v">{result.meshReports.every((m) => m.ok) && errors.length === 0 ? "✓ watertight, no overlaps" : "✗ see problems"}</td></tr>}
          </tbody></table>
          {result && <div style={{ marginTop: 6 }}>{result.parts.map((p) => <div key={p.name}><span className="swatch" style={{ background: p.hex }} />{p.object}/{p.name} <span style={{ color: "var(--muted)" }}>{(p.volume / 1000).toFixed(1)} cm³</span></div>)}</div>}
        </div>
        {result && result.issues.length > 0 && (
          <div className="issues">
            {result.issues.map((i, k) => <div key={k} className={`issue ${i.severity}`}>{i.severity === "error" ? "✗ " : i.severity === "warning" ? "⚠ " : "ℹ "}{i.message}</div>)}
          </div>
        )}
      </main>
    </div>
  );
}
