import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PARAMS, FONT_LABELS, ICON_LABELS, LIMITS, labelWidth, type FontId, type IconId, type LabelParams } from "../core/params";
import { csvHeaders, guessMapping, parseCsv, parseList, type CsvMapping } from "../core/batch";
import { parseRecipe, toRecipe } from "../core/recipe";
import type { Artwork } from "../core/types";
import { readProjectFrom3MF } from "../export/threeMF";
import { GeometryClient } from "../pipeline/client";
import type { GenerateResult } from "../pipeline/generate";
import { parseSvgArtwork } from "./loadArtwork";
import { downloadBytes, safeName } from "./download";
import { Choice, Colour, Num, Section } from "./controls";
import { Preview3D } from "./Preview3D";

const STORAGE_KEY = "gridfinity-labels:v1";
const SAMPLE_LIST = ["M3 x 8 | screw", "M3 x 12 | screw", "M3 NUT | nut", "M3 WASHER | washer", "M4 x 16 | bolt | 2", "M3 INSERTS | insert | 2", "RESISTORS\\n10k - 100k | none | 2"].join("\n");

function loadSaved(): { params: LabelParams; list: string } {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const r = parseRecipe(s);
      return { params: r.params, list: r.list || SAMPLE_LIST };
    }
  } catch { /* ignore */ }
  return { params: { ...DEFAULT_PARAMS }, list: SAMPLE_LIST };
}

export default function App() {
  const saved = useMemo(loadSaved, []);
  const [params, setParams] = useState<LabelParams>(saved.params);
  const [list, setList] = useState(saved.list);
  const [art, setArt] = useState<Artwork | null>(null);
  const [csv, setCsv] = useState<{ name: string; text: string; headers: string[]; mapping: CsvMapping } | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [plateNo, setPlateNo] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const client = useMemo(() => new GeometryClient(), []);
  const seq = useRef(0);

  const set = <K extends keyof LabelParams>(k: K, v: LabelParams[K]) => setParams((p) => ({ ...p, [k]: v }));
  // While a CSV is loaded its rows are used directly, so order ids and
  // quantities reach the manifest; the list box shows them as text. Editing
  // the list by hand switches back to plain-list mode.
  const parsed = useMemo(
    () => (csv ? parseCsv(csv.text, csv.mapping, params.icon) : parseList(list, params.icon)),
    [csv, list, params.icon],
  );

  useEffect(() => {
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await client.generate(params, parsed.specs, art, "batch");
        if (id !== seq.current) return;
        setResult(r.result);
        setPlateNo((n) => Math.min(Math.max(1, n), Math.max(1, r.result.plates.length)));
        setError(null);
      } catch (e) {
        if (id === seq.current) setError((e as Error).message);
      } finally {
        if (id === seq.current) setBusy(false);
      }
    }, 300);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toRecipe(params, list))); } catch { /* ignore */ }
    return () => clearTimeout(t);
  }, [params, parsed, art, client, list]);
  useEffect(() => () => client.dispose(), [client]);

  const title = safeName(list.split("\n")[0]?.split("|")[0] || "labels");
  const plate = result?.plates[plateNo - 1] ?? null;
  const canExport = !!result?.exportable && !busy;
  const issues = [...parsed.warnings.map((m) => ({ severity: "warning" as const, message: m })), ...(result?.issues ?? [])];

  const applyCsv = (text: string, mapping: CsvMapping) => {
    const r = parseCsv(text, mapping, params.icon);
    const lines = r.specs.map((s) => [s.text.replace(/\n/g, "\\n").replace(/\|/g, "/"), s.icon, s.units ?? ""].join(" | ").replace(/( \| )+$/, ""));
    setList(lines.join("\n"));
  };
  const openFile = async (file: File) => {
    try {
      const name = file.name.toLowerCase();
      const text = name.endsWith(".3mf") ? null : await file.text();
      if (name.endsWith(".svg")) { setArt(parseSvgArtwork(text!, file.name)); return; }
      if (name.endsWith(".csv") || name.endsWith(".tsv")) {
        const t = name.endsWith(".tsv") ? text!.replace(/\t/g, ",") : text!;
        const headers = csvHeaders(t);
        const mapping = guessMapping(headers);
        setCsv({ name: file.name, text: t, headers, mapping });
        applyCsv(t, mapping);
        return;
      }
      if (name.endsWith(".txt")) { setList(text!); return; }
      const json = name.endsWith(".3mf") ? readProjectFrom3MF(new Uint8Array(await file.arrayBuffer())) : text;
      if (!json) throw new Error("This 3MF has no saved settings. Only files from this app reopen.");
      const r = parseRecipe(json);
      setParams(r.params);
      if (r.list) setList(r.list);
      setError(null);
    } catch (e) { setError((e as Error).message); }
  };

  const download3mf = async () => downloadBytes((await client.export3mf(plateNo, params, list, title)).bytes, `${title}-plate-${plateNo}.3mf`, "model/3mf");
  const downloadStl = async () => downloadBytes((await client.exportStl(plateNo, title)).bytes, `${title}-plate-${plateNo}.stl`, "model/stl");
  const downloadZip = async () => downloadBytes((await client.exportZip(params, list, title)).bytes, `${title}-all-plates.zip`, "application/zip");
  const downloadFitTest = async () => {
    setBusy(true);
    try {
      await client.generate(params, [], null, "fit-test");
      downloadBytes((await client.export3mf(1, params, list, "label-fit-test")).bytes, "label-fit-test.3mf", "model/3mf");
      const back = await client.generate(params, parsed.specs, art, "batch");
      setResult(back.result);
    } finally { setBusy(false); }
  };
  const saveSettings = () => downloadBytes(new TextEncoder().encode(JSON.stringify(toRecipe(params, list), null, 2)), `${title}-labels-settings.json`, "application/json");
  const fileInput = (accept: string) => (
    <input type="file" accept={accept} onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ""; }} />
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="dot" /><div><h1>Gridfinity Labels</h1><small>Bin labels with text and icons, a whole drawer per plate · Valencia Modelers</small></div></div>

        <Section title="1 · Labels (one per line)">
          <textarea className="list" value={list} onChange={(e) => { setList(e.target.value); setCsv(null); }} spellCheck={false} rows={9} />
          <small className="hint">Format: <code>text | icon | width</code>. Icons: screw, bolt, nut, washer, insert, svg, none. Width in grid units (1–6). <code>\n</code> makes a second line. {parsed.specs.length} label{parsed.specs.length === 1 ? "" : "s"}.</small>
          <div className="btns">
            <label className="field"><span>Import CSV or TXT</span><br />{fileInput(".csv,.tsv,.txt,text/csv,text/plain")}</label>
          </div>
          {csv && (
            <div className="csvmap">
              <small>From <b>{csv.name}</b>: pick the columns.</small>
              {(["text", "icon", "units", "order", "quantity"] as (keyof CsvMapping)[]).map((k) => (
                <label key={k} className="field"><div className="row"><span>{k === "units" ? "Width (grid units)" : k[0].toUpperCase() + k.slice(1)}</span>
                  <select value={csv.mapping[k]} onChange={(e) => { const mapping = { ...csv.mapping, [k]: e.target.value }; setCsv({ ...csv, mapping }); applyCsv(csv.text, mapping); }}>
                    {k !== "text" && <option value="">(none)</option>}
                    {csv.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select></div></label>
              ))}
              <small className="hint">Order ids go into manifest.csv in the ZIP, next to the plate each label is on. Editing the list above drops the CSV link (and its order ids).</small>
            </div>
          )}
        </Section>

        <Section title="2 · Label size">
          <Choice label="Width set by" value={params.widthMode} set={(v) => set("widthMode", v)} options={[{ value: "units", label: "grid units (42 mm)" }, { value: "mm", label: "millimetres" }]} />
          {params.widthMode === "units"
            ? <>
                <Num label="Default width" value={params.units} set={(v) => set("units", Math.round(v))} {...LIMITS.units} unit="u" hint={`${labelWidth(params, null).toFixed(1)} mm. A line can set its own width.`} />
                <Num label="End clearance" value={params.endClearance} set={(v) => set("endClearance", v)} {...LIMITS.endClearance} hint="Label length = units × 42 mm − this." />
              </>
            : <Num label="Width" value={params.widthMm} set={(v) => set("widthMm", v)} {...LIMITS.widthMm} />}
          <Num label="Height" value={params.height} set={(v) => set("height", v)} {...LIMITS.height} />
          <Num label="Thickness" value={params.thickness} set={(v) => set("thickness", v)} {...LIMITS.thickness} />
          <Num label="Corner radius" value={params.cornerRadius} set={(v) => set("cornerRadius", v)} {...LIMITS.cornerRadius} />
          <div className="note">Label slots differ between Gridfinity bin designs. These sizes are starting values, not a standard: print the fit test and measure your bins first.</div>
          <div className="btns"><button onClick={downloadFitTest} disabled={busy}>Download fit test (3 heights)</button></div>
        </Section>

        <Section title="3 · Text and icons">
          <Choice label="Font" value={params.font} set={(v) => set("font", v as FontId)} options={(Object.keys(FONT_LABELS) as FontId[]).map((f) => ({ value: f, label: FONT_LABELS[f] }))} />
          <Num label="Letter height (0 = largest that fits)" value={params.textSize} set={(v) => set("textSize", v)} {...LIMITS.textSize} />
          <Choice label="Align" value={params.align} set={(v) => set("align", v)} options={[{ value: "center", label: "Centre" }, { value: "left", label: "Left (after the icon)" }]} />
          <Num label="Letter spacing" value={params.letterSpacing} set={(v) => set("letterSpacing", v)} {...LIMITS.letterSpacing} unit="×" />
          <Num label="Padding" value={params.padding} set={(v) => set("padding", v)} {...LIMITS.padding} />
          <Choice label="Relief" value={params.relief} set={(v) => set("relief", v)} options={[{ value: "raised", label: "Raised (second colour)" }, { value: "inlay", label: "Flush inlay (second colour, smooth)" }, { value: "engraved", label: "Engraved (one colour)" }]} />
          <Num label={params.relief === "raised" ? "Text height" : "Depth"} value={params.reliefDepth} set={(v) => set("reliefDepth", v)} {...LIMITS.reliefDepth} />
          <Choice label="Default icon" value={params.icon} set={(v) => set("icon", v as IconId)} options={(Object.keys(ICON_LABELS) as IconId[]).map((i) => ({ value: i, label: ICON_LABELS[i] }))} />
          <Num label="Gap after icon" value={params.iconGap} set={(v) => set("iconGap", v)} {...LIMITS.iconGap} />
          <label className="field"><span>Your own icon (SVG, used by lines marked "svg")</span><br />{fileInput(".svg,image/svg+xml")}</label>
          {art && <div className="btns"><span>{art.name}</span><button onClick={() => setArt(null)}>Remove</button></div>}
        </Section>

        <Section title="4 · Colours">
          <Colour label="Label" value={params.plateColor} set={(v) => set("plateColor", v)} />
          <Colour label="Text" value={params.textColor} set={(v) => set("textColor", v)} />
          <Colour label="Icon" value={params.iconColor} set={(v) => set("iconColor", v)} />
        </Section>

        <Section title="5 · Printer and plates" open={false}>
          <Num label="Bed size" value={params.bedSize} set={(v) => set("bedSize", v)} {...LIMITS.bedSize} />
          <Num label="Gap between labels" value={params.plateGap} set={(v) => set("plateGap", v)} {...LIMITS.plateGap} />
          <Num label="Nozzle" value={params.nozzle} set={(v) => set("nozzle", v)} {...LIMITS.nozzle} />
          <Num label="Layer height" value={params.layerHeight} set={(v) => set("layerHeight", v)} {...LIMITS.layerHeight} />
        </Section>

        <Section title="6 · Export">
          <div className="btns">
            <button className="primary" onClick={download3mf} disabled={!canExport}>3MF of plate {plateNo}</button>
            <button onClick={downloadZip} disabled={!canExport}>All {result?.plates.length ?? 0} plates + manifest (ZIP)</button>
            <button onClick={downloadStl} disabled={!canExport}>STL of plate {plateNo}</button>
          </div>
          <div className="btns">
            <button onClick={saveSettings}>Save settings</button>
            <label className="field"><span>Open settings / saved 3MF</span><br />{fileInput(".json,.3mf")}</label>
            <button onClick={() => { setParams({ ...DEFAULT_PARAMS }); setList(SAMPLE_LIST); setCsv(null); }}>Reset</button>
          </div>
          <small className="hint">Every label is its own object in the 3MF, each colour on its own filament slot. Print flat, text up, no supports.</small>
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
        {(busy || error) && <div className="status">{error ? `Error: ${error}` : "Building…"}</div>}
        <div className="readout">
          <b>Batch</b>
          <table><tbody>
            <tr><td>Labels</td><td className="v">{result?.labelCount ?? 0}</td></tr>
            <tr><td>Plates</td><td className="v">{result?.plates.length ?? 0} on a {params.bedSize} mm bed</td></tr>
            <tr><td>Label</td><td className="v">{labelWidth(params, null).toFixed(1)} × {params.height} × {params.thickness} mm</td></tr>
            {result && <tr><td>Checks</td><td className="v">{result.meshesFailed === 0 && result.exportable ? `✓ ${result.meshesChecked} parts watertight` : "✗ see problems"}</td></tr>}
          </tbody></table>
          {plate && <div style={{ marginTop: 6, maxHeight: 220, overflow: "auto" }}>{plate.labels.map((l) => <div key={l.index}><span style={{ color: "var(--muted)" }}>{l.index}.</span> {l.spec.text.replace(/\n/g, " / ")} <span style={{ color: "var(--muted)" }}>{l.width.toFixed(0)} mm · {l.textSize.toFixed(1)} mm text</span></div>)}</div>}
        </div>
        {issues.length > 0 && (
          <div className="issues">
            {issues.slice(0, 12).map((i, k) => <div key={k} className={`issue ${i.severity}`}>{i.severity === "error" ? "✗ " : i.severity === "warning" ? "⚠ " : "ℹ "}{i.message}</div>)}
            {issues.length > 12 && <div className="issue info">…and {issues.length - 12} more.</div>}
          </div>
        )}
      </main>
    </div>
  );
}
