import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PARAMS, LIMITS, MAX_RIBBONS, WAIST_STYLE_DEFAULTS, derive, ribbonList, type Ceiling, type SkirtParams, type WaistStyle } from "../core/params";
import { PRESETS, presetParams } from "../core/presets";
import { parseRecipe, toRecipe } from "../core/recipe";
import { readProjectFrom3MF } from "../export/threeMF";
import { GeometryClient } from "../pipeline/client";
import type { GenerateResult } from "../pipeline/generate";
import { downloadBytes, safeName } from "./download";
import { Choice, Colour, Num, Section } from "./controls";
import { Preview3D } from "./Preview3D";

const STORAGE_KEY = "ribbon-skirt:v1";
/** Grams per cm³ for the filament estimate (PLA ≈ 1.24, PETG ≈ 1.27). */
const DENSITY = 1.25;

function loadSaved(): SkirtParams {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return parseRecipe(s);
  } catch { /* ignore */ }
  return presetParams("pictured");
}

export default function App() {
  const [params, setParams] = useState<SkirtParams>(loadSaved);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const client = useMemo(() => new GeometryClient(), []);
  const seq = useRef(0);
  const d = useMemo(() => derive(params), [params]);
  const set = <K extends keyof SkirtParams>(k: K, v: SkirtParams[K]) => { setParams((p) => ({ ...p, [k]: v })); setActivePreset(null); };

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
    }, 250);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toRecipe(params))); } catch { /* ignore */ }
    return () => clearTimeout(t);
  }, [params, client]);
  useEffect(() => () => client.dispose(), [client]);

  // Downloads report problems in the status pill instead of failing silently.
  const save = (bytes: Uint8Array, filename: string, mime: string) => { downloadBytes(bytes, filename, mime).catch((e) => setError((e as Error).message)); };
  const title = safeName(`ribbon-skirt-${params.bottomDiameter}mm`);
  const download3mf = async () => save((await client.export3mf(params, title)).bytes, `${title}.3mf`, "model/3mf");
  const downloadStl = async (zip: boolean) => save((await client.exportStl(title, zip)).bytes, zip ? `${title}-parts.zip` : `${title}.stl`, zip ? "application/zip" : "model/stl");
  const saveSettings = () => save(new TextEncoder().encode(JSON.stringify(toRecipe(params), null, 2)), `${title}-settings.json`, "application/json");
  const openFile = async (file: File) => {
    try {
      const json = file.name.toLowerCase().endsWith(".3mf") ? readProjectFrom3MF(new Uint8Array(await file.arrayBuffer())) : await file.text();
      if (!json) throw new Error("This 3MF has no saved settings. Only files downloaded from this app reopen.");
      setParams(parseRecipe(json));
      setActivePreset(null);
      setError(null);
    } catch (e) { setError((e as Error).message); }
  };

  const ribbons = ribbonList(params);
  const setRibbons = (list: string[]) => set("ribbons", list.join(","));
  const errors = result?.issues.filter((i) => i.severity === "error") ?? [];
  const canExport = !!result?.exportable && !busy;
  const colours = result ? [...new Set(result.parts.map((p) => p.hex))] : [];
  const volume = result ? result.parts.reduce((v, p) => v + p.volume, 0) / 1000 : 0;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="dot" /><div><h1>Ribbon Skirt Ornament</h1><small>Pleated skirt, ribbon bands, gathered waistband · Valencia Modelers</small></div></div>

        <Section title="1 · Start from">
          <div className="presets">
            {PRESETS.map((p) => (
              <button key={p.id} className={activePreset === p.id ? "active" : ""} title={p.description}
                onClick={() => { setParams(presetParams(p.id)); setActivePreset(p.id); }}>
                <b>{p.label}</b><small>{p.description}</small>
              </button>
            ))}
          </div>
        </Section>

        <Section title="2 · Ribbons">
          <Colour label="Skirt" value={params.baseColor} set={(v) => set("baseColor", v)} />
          {ribbons.map((hex, i) => (
            <div key={i} className="ribbon-row">
              <Colour label={`Ribbon ${i + 1}${i === 0 ? " (bottom)" : ""}`} value={hex} set={(v) => setRibbons(ribbons.map((h, k) => (k === i ? v.toUpperCase() : h)))} />
              <button title="Remove this ribbon" onClick={() => setRibbons(ribbons.filter((_, k) => k !== i))}>✕</button>
            </div>
          ))}
          <div className="btns">
            <button disabled={ribbons.length >= MAX_RIBBONS} onClick={() => setRibbons([...ribbons, "#FFFFFF"])}>+ Add a ribbon</button>
          </div>
          <Num label="Ribbon width" value={params.ribbonWidth} set={(v) => set("ribbonWidth", v)} {...LIMITS.ribbonWidth} />
          <Num label="Skirt showing between ribbons" value={params.ribbonGap} set={(v) => set("ribbonGap", v)} {...LIMITS.ribbonGap} />
          <Num label="Skirt below the first ribbon" value={params.hemHeight} set={(v) => set("hemHeight", v)} {...LIMITS.hemHeight} />
          <small className="hint">Each colour becomes its own part in the 3MF, already on its own filament slot. One AMS holds four colours, skirt included.</small>
        </Section>

        <Section title="3 · Size and shape">
          <Num label="Height (without the loop)" value={params.height} set={(v) => set("height", v)} {...LIMITS.height} />
          <Num label="Hem diameter" value={params.bottomDiameter} set={(v) => set("bottomDiameter", v)} {...LIMITS.bottomDiameter} />
          <Num label="Waist diameter" value={params.topDiameter} set={(v) => set("topDiameter", v)} {...LIMITS.topDiameter} />
          <Num label="Flare" value={params.flare} set={(v) => set("flare", v)} {...LIMITS.flare} unit="×" hint="1 = straight sides; higher flares out more at the hem." />
          <Num label="Fullness" value={params.fullness} set={(v) => set("fullness", v)} {...LIMITS.fullness} unit="×" hint="0 = straight or flared sides; higher = rounded shoulders that stay wide and curve in to the waist." />
          <Num label="Wall" value={params.wall} set={(v) => set("wall", v)} {...LIMITS.wall} hint="1.6 mm = four lines with a 0.4 mm nozzle." />
        </Section>

        <Section title="4 · Pleats">
          <Num label="Pleats" value={params.pleats} set={(v) => set("pleats", Math.round(v))} {...LIMITS.pleats} unit="" />
          <Num label="Pleat depth at the hem" value={params.pleatDepth} set={(v) => set("pleatDepth", v)} {...LIMITS.pleatDepth} />
          <Num label="Pleats stay deep" value={params.pleatReach} set={(v) => set("pleatReach", v)} {...LIMITS.pleatReach} unit="×" hint="1 = fade evenly up to the waist; higher = deep most of the way, gathering just under the waist." />
        </Section>

        <Section title="5 · Waistband and loop">
          <Choice label="Waistband style" value={params.waistStyle}
            set={(v) => { setParams((p) => ({ ...p, ...WAIST_STYLE_DEFAULTS[v as WaistStyle], waistStyle: v as WaistStyle })); setActivePreset(null); }}
            options={[{ value: "shirred", label: "Shirred elastic (gathered puffs)" }, { value: "crown", label: "Bottle cap (crimped crown, closed top)" }]} />
          <Num label="Waistband height" value={params.waistHeight} set={(v) => set("waistHeight", v)} {...LIMITS.waistHeight} hint={d.waistHeight > params.waistHeight ? `Raised to ${d.waistHeight.toFixed(1)} mm to fit the inside top and the recess.` : undefined} />
          <Num label="Waistband stands out" value={params.waistBulge} set={(v) => set("waistBulge", v)} {...LIMITS.waistBulge} hint="How far the shirred waistband stands out past the top of the skirt." />
          {params.waistStyle === "shirred" && <>
            <Num label="Shirring rows" value={params.waistRows} set={(v) => set("waistRows", Math.round(v))} {...LIMITS.waistRows} unit="" hint="Rows of puffs between the elastic lines. 1 = one round puff." />
            <Num label="Elastic pinch" value={params.waistPinch} set={(v) => set("waistPinch", v)} {...LIMITS.waistPinch} unit="×" hint="How tightly each elastic line pinches the puffs in." />
          </>}
          <Num label={params.waistStyle === "crown" ? "Crimps around the cap" : "Gathers around the waist"} value={params.waistRibs} set={(v) => set("waistRibs", Math.round(v))} {...LIMITS.waistRibs} unit="" />
          <Num label={params.waistStyle === "crown" ? "Crimp depth" : "Gather depth"} value={params.waistRibDepth} set={(v) => set("waistRibDepth", v)} {...LIMITS.waistRibDepth} />
          <Num label="Loop sits down inside the waist" value={params.waistRecess} set={(v) => set("waistRecess", v)} {...LIMITS.waistRecess} hint="0 = flat top; more = an open ring with the loop rising from inside." />
          <Choice label="Inside top" value={params.ceiling} set={(v) => set("ceiling", v as Ceiling)}
            options={[{ value: "flat", label: "Flat (short waistband, bridged inside)" }, { value: "cone", label: "45° cone (no bridge, taller waistband)" }]} />
          <Num label="Loop diameter" value={params.loopDiameter} set={(v) => set("loopDiameter", v)} {...LIMITS.loopDiameter} />
          <Num label="Loop hole" value={params.loopHole} set={(v) => set("loopHole", v)} {...LIMITS.loopHole} />
          <Num label="Loop thickness" value={params.loopThickness} set={(v) => set("loopThickness", v)} {...LIMITS.loopThickness} />
        </Section>

        <Section title="6 · Printer" open={false}>
          <Num label="Nozzle" value={params.nozzle} set={(v) => set("nozzle", v)} {...LIMITS.nozzle} />
          <Num label="Layer height" value={params.layerHeight} set={(v) => set("layerHeight", v)} {...LIMITS.layerHeight} />
          <Num label="Bed size" value={params.bedSize} set={(v) => set("bedSize", v)} {...LIMITS.bedSize} />
        </Section>

        <Section title="7 · Export">
          <div className="btns">
            <button className="primary" onClick={download3mf} disabled={!canExport}>Download 3MF (colour-ready)</button>
            <button onClick={() => downloadStl(false)} disabled={!canExport}>STL (one colour)</button>
            <button onClick={() => downloadStl(true)} disabled={!canExport}>STL per colour (ZIP)</button>
          </div>
          <div className="btns">
            <button onClick={saveSettings}>Save settings</button>
            <label className="btn-like"><button onClick={(e) => (e.currentTarget.nextElementSibling as HTMLInputElement).click()}>Open settings / saved 3MF</button>
              <input type="file" accept=".json,.3mf" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ""; }} /></label>
            <button onClick={() => { setParams({ ...DEFAULT_PARAMS }); setActivePreset(null); }}>Reset</button>
          </div>
          <small className="hint">Print standing up exactly as placed, hem on the bed: no supports, no brim needed. 0.2 mm layers. The 3MF carries your settings so you can reopen it here.</small>
        </Section>
      </aside>

      <main className="main">
        <Preview3D parts={result?.parts ?? []} bedSize={params.bedSize} resetToken={resetToken} frameKey={result ? `${result.derived.totalHeight}:${result.derived.bottomRadius}:${params.bedSize}` : ""} />
        <div className="toolbar"><button onClick={() => setResetToken((t) => t + 1)}>Reset view</button></div>
        {(busy || error) && <div className="status">{error ? `Error: ${error}` : "Building…"}</div>}
        <div className="readout">
          <b>Ornament</b>
          <table><tbody>
            <tr><td>Size</td><td className="v">{params.bottomDiameter.toFixed(0)} mm wide × {d.totalHeight.toFixed(0)} mm tall with the loop</td></tr>
            <tr><td>Ribbons</td><td className="v">{d.ribbons.length} · {colours.length} colour{colours.length === 1 ? "" : "s"}</td></tr>
            {result && result.exportable && <tr><td>Filament</td><td className="v">≈ {(volume * DENSITY).toFixed(0)} g</td></tr>}
            {result && <tr><td>Checks</td><td className="v">{result.meshReports.length && result.meshReports.every((m) => m.ok) && errors.length === 0 ? "✓ watertight, prints without supports" : "✗ see problems"}</td></tr>}
          </tbody></table>
          {result && <div style={{ marginTop: 6 }}>{result.parts.map((p) => <div key={p.name}><span className="swatch" style={{ background: p.hex }} />{p.name} <span style={{ color: "var(--muted)" }}>{(p.volume / 1000).toFixed(1)} cm³</span></div>)}</div>}
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
