import { useEffect, useMemo, useRef, useState } from "react";
import { BOX_LABELS, CHECK_LABELS, DEFAULT_PARAMS, FONT_LABELS, HOLE_LABELS, LAYOUT_LABELS, LIMITS, MAX_TAGS, optionList, tagNames, type BoxStyle, type CheckStyle, type HolePosition, type OptionsLayout, type TagParams } from "../core/params";
import { PRESETS, SEASON_LABELS, presetParams, type Season } from "../core/presets";
import { parseRecipe, toRecipe } from "../core/recipe";
import { readProjectFrom3MF } from "../export/threeMF";
import { GeometryClient } from "../pipeline/client";
import type { GenerateResult } from "../pipeline/generate";
import type { FontId } from "../shared/textShapes";
import { downloadBytes, safeName } from "./download";
import { Choice, Colour, Num, Section, Text, TextArea } from "./controls";
import { Preview3D } from "./Preview3D";

const STORAGE_KEY = "checklist-tag:v1";
/** Grams per cm³ for the filament estimate (PLA ≈ 1.24, PETG ≈ 1.27). */
const DENSITY = 1.25;
type View = "tag" | "plate";

function loadSaved(): TagParams {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return parseRecipe(s);
  } catch { /* ignore */ }
  return presetParams("nice");
}

export default function App() {
  const [params, setParams] = useState<TagParams>(loadSaved);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [view, setView] = useState<View>("tag");
  const [plateNo, setPlateNo] = useState(1);
  const client = useMemo(() => new GeometryClient(), []);
  const seq = useRef(0);
  const set = <K extends keyof TagParams>(k: K, v: TagParams[K]) => { setParams((p) => ({ ...p, [k]: v })); setActivePreset(null); };

  useEffect(() => {
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await client.generate(params);
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
  }, [params, client]);
  useEffect(() => () => client.dispose(), [client]);

  // Downloads report problems in the status pill instead of failing silently.
  const save = (bytes: Uint8Array, filename: string, mime: string) => { downloadBytes(bytes, filename, mime).catch((e) => setError((e as Error).message)); };
  const names = tagNames(params);
  const title = safeName(`checklist-tag-${names.length > 1 ? `${names.length}-names` : names[0] || "tag"}`);
  const download3mf = async () => save((await client.export3mf(plateNo, params, title)).bytes, `${title}${(result?.plates.length ?? 1) > 1 ? `-plate-${plateNo}` : ""}.3mf`, "model/3mf");
  const downloadStl = async () => save((await client.exportStl(plateNo, title)).bytes, `${title}.stl`, "model/stl");
  const downloadZip = async () => save((await client.exportZip(params, title)).bytes, `${title}-all-plates.zip`, "application/zip");
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

  const errors = result?.issues.filter((i) => i.severity === "error") ?? [];
  const canExport = !!result?.exportable && !busy;
  const plate = result?.plates[plateNo - 1] ?? null;
  const total = result?.plates.reduce((n, p) => n + p.tags.length, 0) ?? 0;
  const parts = view === "plate" && plate ? plate.parts : result?.tag ?? [];
  const gramsEach = result ? (result.tag.reduce((v, p) => v + p.volume, 0) / 1000) * DENSITY : 0;
  const opts = optionList(params);
  const seasons = [...new Set(PRESETS.map((p) => p.season))] as Season[];
  const meshOk = !!result && result.meshReports.length > 0 && result.meshReports.every((r) => r.ok);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="dot" /><div><h1>Checklist Tag</h1><small>Nice list? YES / NO tags, sized for an elf · Valencia Modelers</small></div></div>

        <Section title="1 · Start from">
          {seasons.map((season) => (
            <div key={season}>
              <div className="season">{SEASON_LABELS[season]}</div>
              <div className="presets">
                {PRESETS.filter((p) => p.season === season).map((p) => (
                  <button key={p.id} className={activePreset === p.id ? "active" : ""} title={p.description}
                    onClick={() => { setParams(presetParams(p.id)); setActivePreset(p.id); }}>
                    <b>{p.label}</b><small>{p.description}</small>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Section>

        <Section title="2 · Question">
          <TextArea label="Question" value={params.question} set={(v) => set("question", v)} rows={2}
            hint="{name} is swapped for the name. Long lines wrap by themselves; press Enter to break a line yourself." />
          <Text label="Name" value={params.name} set={(v) => set("name", v)} placeholder="KINSLEY" />
          <Choice label="Font" value={params.font} set={(v) => set("font", v as FontId)}
            options={(Object.keys(FONT_LABELS) as FontId[]).map((k) => ({ value: k, label: FONT_LABELS[k] }))} />
          <Num label="Letter size (capitals)" value={params.textSize} set={(v) => set("textSize", v)} {...LIMITS.textSize}
            hint={result?.layout.question && result.layout.textCap < params.textSize - 0.05 ? `Shrunk to ${result.layout.textCap.toFixed(1)} mm so it fits.` : "Shrinks by itself if the question is too long."} />
          <Num label="Line spacing" value={params.lineSpacing} set={(v) => set("lineSpacing", v)} {...LIMITS.lineSpacing} unit="×" />
        </Section>

        <Section title="3 · Tick boxes">
          <Text label="Box labels (comma separated)" value={params.options} set={(v) => set("options", v)} placeholder="YES, NO" hint="2 to 4 boxes, e.g. YES, NO or TRICK, TREAT." />
          <div className="field"><div className="row"><span>Ticked box</span></div>
            <div className="ticks">
              {opts.map((o, i) => <button key={i} className={params.checked === i + 1 ? "on" : ""} onClick={() => set("checked", i + 1)}>{o}</button>)}
              <button className={params.checked === 0 ? "on" : ""} onClick={() => set("checked", 0)}>None</button>
            </div>
          </div>
          <Choice label="Mark" value={params.checkStyle} set={(v) => set("checkStyle", v as CheckStyle)}
            options={(Object.keys(CHECK_LABELS) as CheckStyle[]).map((k) => ({ value: k, label: CHECK_LABELS[k] }))} />
          <Choice label="Box" value={params.boxStyle} set={(v) => set("boxStyle", v as BoxStyle)}
            options={(Object.keys(BOX_LABELS) as BoxStyle[]).map((k) => ({ value: k, label: BOX_LABELS[k] }))} />
          <Choice label="Boxes" value={params.optionsLayout} set={(v) => set("optionsLayout", v as OptionsLayout)}
            options={(Object.keys(LAYOUT_LABELS) as OptionsLayout[]).map((k) => ({ value: k, label: LAYOUT_LABELS[k] }))} />
          <Num label="Box size" value={params.boxSize} set={(v) => set("boxSize", v)} {...LIMITS.boxSize} />
          <Num label="Label size (capitals)" value={params.labelSize} set={(v) => set("labelSize", v)} {...LIMITS.labelSize} />
          {params.boxStyle === "outline" && <Num label="Box line width" value={params.boxWall} set={(v) => set("boxWall", v)} {...LIMITS.boxWall} />}
        </Section>

        <Section title="4 · Tag shape">
          <Num label="Width" value={params.width} set={(v) => set("width", v)} {...LIMITS.width} hint="55 × 75 mm suits an Elf on the Shelf's hands." />
          <Num label="Height" value={params.height} set={(v) => set("height", v)} {...LIMITS.height} />
          <Num label="Thickness" value={params.thickness} set={(v) => set("thickness", v)} {...LIMITS.thickness} />
          <Num label="Corner radius" value={params.cornerRadius} set={(v) => set("cornerRadius", v)} {...LIMITS.cornerRadius} />
          <Num label="Raised text and boxes" value={params.relief} set={(v) => set("relief", v)} {...LIMITS.relief} hint="How far they stand above the card." />
          <Num label="Edge margin" value={params.margin} set={(v) => set("margin", v)} {...LIMITS.margin} />
          <Choice label="Hanging hole" value={params.holePosition} set={(v) => set("holePosition", v as HolePosition)}
            options={(Object.keys(HOLE_LABELS) as HolePosition[]).map((k) => ({ value: k, label: HOLE_LABELS[k] }))} />
          {params.holePosition !== "none" && <>
            <Num label="Hole diameter" value={params.holeDiameter} set={(v) => set("holeDiameter", v)} {...LIMITS.holeDiameter} hint="5 mm takes a small book ring or ribbon." />
            <Num label="Hole from the edge" value={params.holeInset} set={(v) => set("holeInset", v)} {...LIMITS.holeInset} />
          </>}
        </Section>

        <Section title="5 · Colours">
          <Colour label="Tag" value={params.baseColor} set={(v) => set("baseColor", v)} />
          <Colour label="Text" value={params.textColor} set={(v) => set("textColor", v)} />
          <Colour label="Boxes" value={params.boxColor} set={(v) => set("boxColor", v)} />
          <Colour label="Tick" value={params.checkColor} set={(v) => set("checkColor", v)} />
          <small className="hint">Each colour is its own part in the 3MF, so Bambu Studio gives each its own filament (AMS).</small>
        </Section>

        <Section title="6 · Batch (one tag per name)" open={false}>
          <TextArea label="Names" value={params.names} set={(v) => set("names", v)} rows={5} placeholder={"KINSLEY\nKOHEN"}
            hint={`One name per line (or commas). Leave empty for just the name above. Up to ${MAX_TAGS}.`} />
        </Section>

        <Section title="7 · Printer" open={false}>
          <Num label="Nozzle" value={params.nozzle} set={(v) => set("nozzle", v)} {...LIMITS.nozzle} />
          <Num label="Layer height" value={params.layerHeight} set={(v) => set("layerHeight", v)} {...LIMITS.layerHeight} />
          <Num label="Bed size" value={params.bedSize} set={(v) => set("bedSize", v)} {...LIMITS.bedSize} />
        </Section>

        <Section title="8 · Export">
          {result && result.plates.length > 1 && <Choice label="Plate" value={String(plateNo)} set={(v) => { setPlateNo(Number(v)); setView("plate"); }}
            options={result.plates.map((pl) => ({ value: String(pl.index), label: `Plate ${pl.index} · ${pl.tags.length} tags` }))} />}
          <div className="btns">
            <button className="primary" onClick={download3mf} disabled={!canExport}>Download 3MF{result && result.plates.length > 1 ? ` (plate ${plateNo})` : ""}</button>
            <button onClick={downloadStl} disabled={!canExport}>STL</button>
            {result && result.plates.length > 1 && <button onClick={downloadZip} disabled={!canExport}>All plates (ZIP)</button>}
          </div>
          <div className="btns">
            <button onClick={saveSettings}>Save settings</button>
            <label className="btn-like"><button onClick={(e) => (e.currentTarget.nextElementSibling as HTMLInputElement).click()}>Open settings / saved 3MF</button>
              <input type="file" accept=".json,.3mf" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ""; }} /></label>
            <button onClick={() => { setParams({ ...DEFAULT_PARAMS }); setActivePreset(null); }}>Reset</button>
          </div>
          <small className="hint">Print flat as placed, no supports. The colours change only in the top layers. The 3MF carries your settings so you can reopen it here.</small>
        </Section>
      </aside>

      <main className="main">
        <Preview3D parts={parts} bedSize={view === "plate" ? params.bedSize : 0} resetToken={resetToken}
          frameKey={view === "plate" ? `plate:${plateNo}:${params.bedSize}` : result?.tag.length ? `tag:${params.width}:${params.height}` : ""} />
        <div className="toolbar">
          <button className={view === "tag" ? "on" : ""} onClick={() => setView("tag")}>One tag</button>
          <button className={view === "plate" ? "on" : ""} onClick={() => setView("plate")}>Print plate</button>
          <button onClick={() => setResetToken((t) => t + 1)}>Reset view</button>
        </div>
        {(busy || error) && <div className="status">{error ? `Error: ${error}` : "Building…"}</div>}
        <div className="readout">
          <b>Checklist tag</b>
          <table><tbody>
            <tr><td>Tag</td><td className="v">{params.width} × {params.height} × {(params.thickness + params.relief).toFixed(1)} mm</td></tr>
            {result?.layout.question && <tr><td>Letters</td><td className="v">{result.layout.textCap.toFixed(1)} mm, {result.layout.lines.length} line{result.layout.lines.length === 1 ? "" : "s"}</td></tr>}
            {result && <tr><td>Batch</td><td className="v">{total} tag{total === 1 ? "" : "s"} on {result.plates.length} plate{result.plates.length === 1 ? "" : "s"}</td></tr>}
            {result && result.tag.length > 0 && <tr><td>Filament</td><td className="v">≈ {gramsEach.toFixed(1)} g each</td></tr>}
            {result && <tr><td>Checks</td><td className="v">{meshOk && errors.length === 0 ? "✓ watertight, prints flat" : "✗ see problems"}</td></tr>}
          </tbody></table>
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
