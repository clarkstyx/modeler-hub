import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PARAMS, FONT_LABELS, FOOD_NOTE, LIMITS, SHAPE_LABELS, SOURCE_LABELS, type CutterParams, type FontId, type ShapeId, type Source } from "../core/params";
import { parseRecipe, toRecipe } from "../core/recipe";
import type { Artwork } from "../core/types";
import { readProjectFrom3MF } from "../export/threeMF";
import { GeometryClient } from "../pipeline/client";
import type { GenerateResult } from "../pipeline/generate";
import { parseSvgArtwork } from "./loadArtwork";
import { downloadBytes, safeName } from "./download";
import { Choice, Colour, Num, Section } from "./controls";
import { Preview3D } from "./Preview3D";

const STORAGE_KEY = "cookie-cutter:v1";

function loadSaved(): CutterParams {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return parseRecipe(s);
  } catch { /* ignore */ }
  return { ...DEFAULT_PARAMS };
}

export default function App() {
  const [params, setParams] = useState<CutterParams>(loadSaved);
  const [art, setArt] = useState<Artwork | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [plateNo, setPlateNo] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const client = useMemo(() => new GeometryClient(), []);
  const seq = useRef(0);
  const set = <K extends keyof CutterParams>(k: K, v: CutterParams[K]) => setParams((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await client.generate(params, art);
        if (id !== seq.current) return;
        setResult(r.result);
        setPlateNo((n) => Math.min(Math.max(1, n), Math.max(1, r.result.plates.length)));
        setError(null);
      } catch (e) {
        if (id === seq.current) setError((e as Error).message);
      } finally {
        if (id === seq.current) setBusy(false);
      }
    }, 250);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toRecipe(params))); } catch { /* ignore */ }
    return () => clearTimeout(t);
  }, [params, art, client]);
  useEffect(() => () => client.dispose(), [client]);

  const title = safeName(
    params.source === "shape" ? `${params.shape}-cutter`
    : params.source === "svg" ? `${(art?.name ?? "svg").replace(/\.svg$/i, "")}-cutter`
    : `${params.text}-${params.source === "letters" ? "letter-cutters" : "cutter"}`,
  );
  const plate = result?.plates[plateNo - 1] ?? null;
  const canExport = !!result?.exportable && !busy;
  const isText = params.source === "letters" || params.source === "word";

  // Downloads report problems in the status pill instead of failing silently.
  const [note, setNote] = useState<string | null>(null);
  const save = async (make: () => Promise<Uint8Array>, filename: string, mime: string) => {
    try {
      const r = await downloadBytes(await make(), filename, mime);
      setNote(r === "declined" ? "Download cancelled." : null);
    } catch (e) { setError((e as Error).message); }
  };
  const suffix = result && result.plates.length > 1 ? `-plate-${plateNo}` : "";
  const download3mf = () => save(async () => (await client.export3mf(plateNo, params, title)).bytes, `${title}${suffix}.3mf`, "model/3mf");
  const downloadStl = () => save(async () => (await client.exportStl(plateNo, title)).bytes, `${title}${suffix}.stl`, "model/stl");
  const downloadZip = () => save(async () => (await client.exportZip(params, title)).bytes, `${title}.zip`, "application/zip");
  const saveSettings = () => save(async () => new TextEncoder().encode(JSON.stringify(toRecipe(params), null, 2)), `${title}-settings.json`, "application/json");
  const openFile = async (file: File) => {
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith(".svg")) {
        setArt(parseSvgArtwork(await file.text(), file.name));
        set("source", "svg");
      } else {
        const json = name.endsWith(".3mf") ? readProjectFrom3MF(new Uint8Array(await file.arrayBuffer())) : await file.text();
        if (!json) throw new Error("This 3MF has no saved settings. Only files downloaded from this app reopen.");
        setParams(parseRecipe(json));
      }
      setError(null);
    } catch (e) { setError((e as Error).message); }
  };
  const fileInput = (accept: string) => <input type="file" accept={accept} onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ""; }} />;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="dot" /><div><h1>Cookie Cutter</h1><small>Shapes, letters, words or your SVG · Valencia Modelers</small></div></div>

        <Section title="1 · What to cut">
          <Choice label="Cut" value={params.source} set={(v) => set("source", v as Source)} options={(Object.keys(SOURCE_LABELS) as Source[]).map((s) => ({ value: s, label: SOURCE_LABELS[s] }))} />
          {params.source === "shape" && (
            <div className="presets">
              {(Object.keys(SHAPE_LABELS) as ShapeId[]).map((s) => (
                <button key={s} className={params.shape === s ? "active" : ""} onClick={() => set("shape", s)}><b>{SHAPE_LABELS[s]}</b></button>
              ))}
            </div>
          )}
          {isText && <>
            <label className="field"><div className="row"><span>{params.source === "letters" ? "Letters (one cutter each)" : "Word"}</span></div>
              <input className="text-input" value={params.text} onChange={(e) => set("text", e.target.value)} placeholder={params.source === "letters" ? "ABC" : "LOVE"} /></label>
            <Choice label="Font" value={params.font} set={(v) => set("font", v as FontId)} options={(Object.keys(FONT_LABELS) as FontId[]).map((f) => ({ value: f, label: FONT_LABELS[f] }))} />
            {params.source === "word" && <Num label="Outline around the letters" value={params.wordMargin} set={(v) => set("wordMargin", v)} {...LIMITS.wordMargin} />}
            {params.source === "letters" && <small className="hint">Holes in letters (O, A, B…) are filled: the cutter follows the outside. The dot of an i or j is joined on.</small>}
          </>}
          {params.source === "svg" && <>
            <label className="field"><span>SVG with filled shapes (the outside outline is used)</span><br />{fileInput(".svg,image/svg+xml")}</label>
            {art && <div className="btns"><span>{art.name}</span><button onClick={() => setArt(null)}>Remove</button></div>}
          </>}
        </Section>

        <Section title="2 · Size">
          <Num label={params.source === "letters" ? "Capital letter height" : "Cookie size (longest side)"} value={params.size} set={(v) => set("size", v)} {...LIMITS.size} />
          <Num label="Smooth off details under" value={params.smoothing} set={(v) => set("smoothing", v)} {...LIMITS.smoothing} unit="mm radius"
            hint="Thin spikes and narrow notches cannot cut cleanly; this rounds them off." />
        </Section>

        <Section title="3 · Cutter">
          <Num label="Height" value={params.height} set={(v) => set("height", v)} {...LIMITS.height} />
          <Num label="Wall" value={params.wall} set={(v) => set("wall", v)} {...LIMITS.wall} />
          <Num label="Cutting edge" value={params.edge} set={(v) => set("edge", v)} {...LIMITS.edge} hint="The thin top rim that cuts the dough. At least two nozzle widths." />
          <Num label="Edge band (taper + edge)" value={params.edgeHeight} set={(v) => set("edgeHeight", v)} {...LIMITS.edgeHeight} />
          <Num label="Flange width (0 = none)" value={params.flange} set={(v) => set("flange", v)} {...LIMITS.flange} hint="The brim on the bed: stiffens the cutter and gives you somewhere to press." />
          {params.flange > 0 && <Num label="Flange thickness" value={params.flangeThickness} set={(v) => set("flangeThickness", v)} {...LIMITS.flangeThickness} />}
        </Section>

        <Section title="4 · Colour and printer" open={false}>
          <Colour label="Colour" value={params.color} set={(v) => set("color", v)} />
          <Num label="Nozzle" value={params.nozzle} set={(v) => set("nozzle", v)} {...LIMITS.nozzle} />
          <Num label="Layer height" value={params.layerHeight} set={(v) => set("layerHeight", v)} {...LIMITS.layerHeight} />
          <Num label="Bed size" value={params.bedSize} set={(v) => set("bedSize", v)} {...LIMITS.bedSize} />
          <Num label="Gap between cutters" value={params.plateGap} set={(v) => set("plateGap", v)} {...LIMITS.plateGap} />
        </Section>

        <Section title="5 · Export">
          <div className="food" role="note">{FOOD_NOTE}</div>
          <div className="btns">
            <button className="primary" onClick={download3mf} disabled={!canExport}>3MF{result && result.plates.length > 1 ? ` of plate ${plateNo}` : ""}</button>
            <button onClick={downloadStl} disabled={!canExport}>STL{result && result.plates.length > 1 ? ` of plate ${plateNo}` : ""}</button>
            <button onClick={downloadZip} disabled={!canExport}>Everything (ZIP)</button>
          </div>
          <div className="btns">
            <button onClick={saveSettings}>Save settings</button>
            <label className="field"><span>Open settings / saved 3MF</span><br />{fileInput(".json,.3mf")}</label>
            <button onClick={() => { setParams({ ...DEFAULT_PARAMS }); setArt(null); }}>Reset</button>
          </div>
          <small className="hint">Print as placed: flange on the bed, cutting edge up, no supports.</small>
        </Section>
      </aside>

      <main className="main">
        <Preview3D plate={plate} bedSize={params.bedSize} resetToken={resetToken} />
        <div className="toolbar">
          {result && result.plates.length > 1 && result.plates.map((p) => (
            <button key={p.index} className={p.index === plateNo ? "on" : ""} onClick={() => setPlateNo(p.index)}>Plate {p.index}</button>
          ))}
          <button onClick={() => setResetToken((t) => t + 1)}>Reset view</button>
        </div>
        {(busy || error || note) && <div className="status">{error ? `Error: ${error}` : busy ? "Building…" : note}</div>}
        <div className="readout">
          <b>{result && result.cutterCount > 1 ? `${result.cutterCount} cutters` : "Cutter"}</b>
          <table><tbody>
            {plate && plate.cutters.length === 1 && <>
              <tr><td>Cookie</td><td className="v">{plate.cutters[0].cookieW.toFixed(1)} × {plate.cutters[0].cookieH.toFixed(1)} mm</td></tr>
              <tr><td>On the bed</td><td className="v">{plate.cutters[0].width.toFixed(1)} × {plate.cutters[0].depth.toFixed(1)} × {params.height} mm</td></tr>
            </>}
            {result && result.plates.length > 1 && <tr><td>Plates</td><td className="v">{result.plates.length} on a {params.bedSize} mm bed</td></tr>}
            <tr><td>Wall / edge</td><td className="v">{params.wall} / {params.edge} mm</td></tr>
            {result && <tr><td>Checks</td><td className="v">{result.meshesFailed === 0 && result.exportable ? `✓ ${result.meshesChecked} watertight` : "✗ see problems"}</td></tr>}
          </tbody></table>
          {plate && plate.cutters.length > 1 && <div style={{ marginTop: 6, maxHeight: 200, overflow: "auto" }}>{plate.cutters.map((c) => <div key={c.index}><span style={{ color: "var(--muted)" }}>{c.index}.</span> {c.label} <span style={{ color: "var(--muted)" }}>{c.cookieW.toFixed(0)} × {c.cookieH.toFixed(0)} mm</span></div>)}</div>}
        </div>
        {result && result.issues.length > 0 && (
          <div className="issues">
            {result.issues.slice(0, 10).map((i, k) => <div key={k} className={`issue ${i.severity}`}>{i.severity === "error" ? "✗ " : i.severity === "warning" ? "⚠ " : "ℹ "}{i.message}</div>)}
            {result.issues.length > 10 && <div className="issue info">…and {result.issues.length - 10} more.</div>}
          </div>
        )}
      </main>
    </div>
  );
}
