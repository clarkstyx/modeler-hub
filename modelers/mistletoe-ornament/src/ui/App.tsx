import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PARAMS, FONT_LABELS, LIMITS, MAX_NAME_LENGTH, TEXT_STYLE_LABELS, type FontId, type OrnamentParams, type TextStyle } from "../core/params";
import { parseRecipe, toRecipe } from "../core/recipe";
import { readProjectFrom3MF } from "../export/threeMF";
import { GeometryClient } from "../pipeline/client";
import type { GenerateResult } from "../pipeline/generate";
import { downloadBytes, safeName } from "./download";
import { Choice, Colour, Num, Section } from "./controls";
import { Preview3D } from "./Preview3D";

const STORAGE_KEY = "mistletoe-ornament:v1";

function loadSaved(): OrnamentParams {
  let p = { ...DEFAULT_PARAMS };
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) p = parseRecipe(s);
  } catch { /* ignore */ }
  // ?name=Ava opens with that name (handy for links and the craft-show page).
  try {
    const q = new URLSearchParams(location.search).get("name");
    if (q) p = { ...p, name: q.slice(0, MAX_NAME_LENGTH), tag: true };
  } catch { /* ignore */ }
  return p;
}

const PALETTES: { label: string; colours: Pick<OrnamentParams, "baseColor" | "leafColor" | "berryColor" | "ribbonColor" | "textColor"> }[] = [
  { label: "Classic", colours: { baseColor: "#1F3A2A", leafColor: "#4F9A5C", berryColor: "#F4F1E6", ribbonColor: "#C8322B", textColor: "#F4F1E6" } },
  { label: "Gold & cream", colours: { baseColor: "#2B2622", leafColor: "#6B8F3C", berryColor: "#F4F1E6", ribbonColor: "#D4A23A", textColor: "#2B2622" } },
  { label: "Frosty", colours: { baseColor: "#1E2A44", leafColor: "#7FB3A2", berryColor: "#FFFFFF", ribbonColor: "#B23A48", textColor: "#FFFFFF" } },
  { label: "Black & red", colours: { baseColor: "#111111", leafColor: "#2E7D4F", berryColor: "#F4F1E6", ribbonColor: "#E5392F", textColor: "#FFFFFF" } },
];

export default function App() {
  const [params, setParams] = useState<OrnamentParams>(loadSaved);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const client = useMemo(() => new GeometryClient(), []);
  const seq = useRef(0);
  const set = <K extends keyof OrnamentParams>(k: K, v: OrnamentParams[K]) => setParams((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await client.generate(params);
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
    // The hub's craft-show order button reads this to save the exact design with the order.
    (window as unknown as { __valenciaState?: () => unknown }).__valenciaState = () => toRecipe(params);
    return () => clearTimeout(t);
  }, [params, client]);
  useEffect(() => () => client.dispose(), [client]);

  const title = safeName(`${params.name || "mistletoe"}-mistletoe-ornament`);
  const canExport = !!result?.exportable && !busy;
  const save = async (make: () => Promise<Uint8Array>, filename: string, mime: string) => {
    try {
      const r = await downloadBytes(await make(), filename, mime);
      setNote(r === "declined" ? "Download cancelled." : null);
    } catch (e) { setError((e as Error).message); }
  };
  const download3mf = () => save(async () => (await client.export3mf(params, title)).bytes, `${title}.3mf`, "model/3mf");
  const downloadStl = () => save(async () => (await client.exportStl(title)).bytes, `${title}.stl`, "model/stl");
  const saveSettings = () => save(async () => new TextEncoder().encode(JSON.stringify(toRecipe(params), null, 2)), `${title}-settings.json`, "application/json");
  const openFile = async (file: File) => {
    try {
      const json = file.name.toLowerCase().endsWith(".3mf") ? readProjectFrom3MF(new Uint8Array(await file.arrayBuffer())) : await file.text();
      if (!json) throw new Error("This 3MF has no saved settings. Only files downloaded from this app reopen.");
      setParams(parseRecipe(json));
      setError(null);
    } catch (e) { setError((e as Error).message); }
  };
  const info = result?.info;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="dot" /><div><h1>Mistletoe Ornament</h1><small>Berries, a bow and a name · Valencia Modelers</small></div></div>

        <Section title="1 · Name">
          <label className="field"><div className="row"><span>Name on the tag</span><span className="val"><small>{params.name.length}/{MAX_NAME_LENGTH}</small></span></div>
            <input className="text-input" value={params.name} maxLength={MAX_NAME_LENGTH} onChange={(e) => set("name", e.target.value)} placeholder="Noah" autoFocus /></label>
          <Choice label="Font" value={params.font} set={(v) => set("font", v as FontId)} options={(Object.keys(FONT_LABELS) as FontId[]).map((f) => ({ value: f, label: FONT_LABELS[f] }))} />
          <Choice label="Letters" value={params.textStyle} set={(v) => set("textStyle", v as TextStyle)} options={(Object.keys(TEXT_STYLE_LABELS) as TextStyle[]).map((t) => ({ value: t, label: TEXT_STYLE_LABELS[t] }))} />
          <label className="field check"><input type="checkbox" checked={params.tag} onChange={(e) => set("tag", e.target.checked)} /> Show the name tag</label>
        </Section>

        <Section title="2 · Sprig">
          <Num label="Width" value={params.size} set={(v) => set("size", v)} {...LIMITS.size} />
          <Num label="Leaf pairs" value={params.leafPairs} set={(v) => set("leafPairs", v)} {...LIMITS.leafPairs} unit="" />
          <Num label="Berries" value={params.berries} set={(v) => set("berries", v)} {...LIMITS.berries} unit="" />
          <label className="field check"><input type="checkbox" checked={params.bow} onChange={(e) => set("bow", e.target.checked)} /> Ribbon bow on top</label>
        </Section>

        <Section title="3 · Colours">
          <div className="presets">
            {PALETTES.map((pal) => (
              <button key={pal.label} onClick={() => setParams((p) => ({ ...p, ...pal.colours }))}>
                <span className="dots">{Object.values(pal.colours).map((c, i) => <i key={i} style={{ background: c }} />)}</span>
                <b>{pal.label}</b>
              </button>
            ))}
          </div>
          <Colour label="Leaves" value={params.leafColor} set={(v) => set("leafColor", v)} />
          <Colour label="Berries" value={params.berryColor} set={(v) => set("berryColor", v)} />
          <Colour label="Ribbon and tag" value={params.ribbonColor} set={(v) => set("ribbonColor", v)} />
          <Colour label="Name" value={params.textColor} set={(v) => set("textColor", v)} />
          <Colour label="Back plate and outline" value={params.baseColor} set={(v) => set("baseColor", v)} />
        </Section>

        <Section title="4 · Print" open={false}>
          <Num label="Back plate thickness" value={params.baseThickness} set={(v) => set("baseThickness", v)} {...LIMITS.baseThickness} />
          <Num label="Colour layer thickness" value={params.layerThickness} set={(v) => set("layerThickness", v)} {...LIMITS.layerThickness} />
          <Num label="Outline around the shapes" value={params.outline} set={(v) => set("outline", v)} {...LIMITS.outline} />
          <Num label="Hanger hole" value={params.holeDiameter} set={(v) => set("holeDiameter", v)} {...LIMITS.holeDiameter} />
        </Section>

        <Section title="5 · Export">
          <div className="btns">
            <button className="primary" onClick={download3mf} disabled={!canExport}>3MF (colours split)</button>
            <button onClick={downloadStl} disabled={!canExport}>STL</button>
          </div>
          <div className="btns">
            <button onClick={saveSettings}>Save settings</button>
            <label className="field"><span>Open settings / saved 3MF</span><br /><input type="file" accept=".json,.3mf" onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ""; }} /></label>
            <button onClick={() => setParams({ ...DEFAULT_PARAMS })}>Reset</button>
          </div>
          <small className="hint">Print as placed: back plate on the bed, colours up, no supports. In the slicer, load as one object with multiple parts and give each colour a filament.</small>
        </Section>
      </aside>

      <main className="main">
        <Preview3D parts={result?.parts ?? []} resetToken={resetToken} />
        <div className="toolbar"><button onClick={() => setResetToken((t) => t + 1)}>Reset view</button></div>
        {(busy || error || note) && <div className="status">{error ? `Error: ${error}` : busy ? "Building…" : note}</div>}
        <div className="readout">
          <b>Ornament</b>
          <table><tbody>
            {info && <tr><td>Size</td><td className="v">{info.width.toFixed(0)} × {info.height.toFixed(0)} × {info.thickness.toFixed(1)} mm</td></tr>}
            {info && info.capHeight > 0 && <tr><td>Letters</td><td className="v">{info.capHeight.toFixed(1)} mm tall</td></tr>}
            {info && <tr><td>Colours</td><td className="v">{info.colours}</td></tr>}
            {result && <tr><td>Checks</td><td className="v">{result.meshesFailed === 0 && result.exportable ? `✓ ${result.meshesChecked} watertight` : "✗ see problems"}</td></tr>}
          </tbody></table>
        </div>
        {result && result.issues.length > 0 && (
          <div className="issues">
            {result.issues.slice(0, 8).map((i, k) => <div key={k} className={`issue ${i.severity}`}>{i.severity === "error" ? "✗ " : i.severity === "warning" ? "⚠ " : "ℹ "}{i.message}</div>)}
          </div>
        )}
      </main>
    </div>
  );
}
