import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PARAMS, LIMITS, PATTERN_LABELS, derive, type BeadParams, type Pattern } from "../core/params";
import { PRESETS, presetParams } from "../core/presets";
import { parseRecipe, toRecipe } from "../core/recipe";
import { WARN_DEG } from "../core/validateParams";
import { readProjectFrom3MF } from "../export/threeMF";
import { GeometryClient } from "../pipeline/client";
import type { GenerateResult } from "../pipeline/generate";
import { downloadBytes, safeName } from "./download";
import { Choice, Colour, Num, Section } from "./controls";
import { Preview3D } from "./Preview3D";

const STORAGE_KEY = "knot-bead:v1";
/** Grams per cm³ for the filament estimate (PLA ≈ 1.24, PETG ≈ 1.27). */
const DENSITY = 1.25;
type View = "bead" | "plate";

function loadSaved(): BeadParams {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return parseRecipe(s);
  } catch { /* ignore */ }
  return presetParams("snake");
}

export default function App() {
  const [params, setParams] = useState<BeadParams>(loadSaved);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [view, setView] = useState<View>("bead");
  const [plateNo, setPlateNo] = useState(1);
  const client = useMemo(() => new GeometryClient(), []);
  const seq = useRef(0);
  const d = useMemo(() => derive(params), [params]);
  const set = <K extends keyof BeadParams>(k: K, v: BeadParams[K]) => { setParams((p) => ({ ...p, [k]: v })); setActivePreset(null); };

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
    }, 200);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toRecipe(params))); } catch { /* ignore */ }
    return () => clearTimeout(t);
  }, [params, client]);
  useEffect(() => () => client.dispose(), [client]);

  // Downloads report problems in the status pill instead of failing silently.
  const save = (bytes: Uint8Array, filename: string, mime: string) => { downloadBytes(bytes, filename, mime).catch((e) => setError((e as Error).message)); };
  const title = safeName(`${params.pattern}-knot-bead-${params.diameter}x${params.height}`);
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
  const total = result?.plates.reduce((n, p) => n + p.beads.length, 0) ?? 0;
  const parts = view === "plate" && plate ? plate.parts : result?.bead ? [result.bead] : [];
  const gramsEach = result?.bead ? (result.bead.volume / 1000) * DENSITY : 0;
  const helical = params.pattern === "rope" || params.pattern === "braid";

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="dot" /><div><h1>Knot Bead</h1><small>Paracord knot beads: slide on, no tying · Valencia Modelers</small></div></div>

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

        <Section title="2 · Knot look">
          <Choice label="Pattern" value={params.pattern} set={(v) => set("pattern", v as Pattern)}
            options={(Object.keys(PATTERN_LABELS) as Pattern[]).map((k) => ({ value: k, label: PATTERN_LABELS[k] }))} />
          <Num label="Ridge depth" value={params.ridgeDepth} set={(v) => set("ridgeDepth", v)} {...LIMITS.ridgeDepth} hint="How far the cord ridges stand out." />
          {params.pattern === "coil" && <Num label="Wrap pitch" value={params.pitch} set={(v) => set("pitch", v)} {...LIMITS.pitch} hint="Height of one wrap; 3 to 4 mm looks like 550 cord." />}
          {params.pattern === "snake" && <Num label="Link height" value={params.pitch} set={(v) => set("pitch", v)} {...LIMITS.pitch} hint="Each link turns 90° from the one below." />}
          {helical && <>
            <Num label="Strands" value={params.strands} set={(v) => set("strands", Math.round(v))} {...LIMITS.strands} unit="" />
            <Num label="Twist (height of one turn)" value={params.twist} set={(v) => set("twist", v)} {...LIMITS.twist} hint="Shorter = tighter, more diagonal strands." />
          </>}
          <small className="hint">Overhang {d.overhangDeg.toFixed(0)}°{d.overhangDeg > WARN_DEG ? ": a longer pitch or shallower ridges prints cleaner." : ": prints without supports."}</small>
        </Section>

        <Section title="3 · Size and bore">
          <Num label="Height" value={params.height} set={(v) => set("height", v)} {...LIMITS.height} />
          <Num label="Diameter (over the ridges)" value={params.diameter} set={(v) => set("diameter", v)} {...LIMITS.diameter} />
          <Num label="Bore (cord hole)" value={params.bore} set={(v) => set("bore", v)} {...LIMITS.bore} hint="550 paracord: about 4 mm per strand. 5.5 mm = one strand slides, 8.5 mm = two strands." />
          <Num label="Bore chamfer" value={params.boreChamfer} set={(v) => set("boreChamfer", v)} {...LIMITS.boreChamfer} hint="Flared ends so the cord feeds in." />
          <Num label="Ridges fade at the ends" value={params.endFade} set={(v) => set("endFade", v)} {...LIMITS.endFade} hint="Plain rims over this height at top and bottom." />
          <small className="hint">Thinnest wall {d.minWall.toFixed(1)} mm (needs {(2 * params.nozzle).toFixed(1)}).</small>
        </Section>

        <Section title="4 · Colour and batch">
          <Colour label="Bead" value={params.color} set={(v) => set("color", v)} />
          <Num label="How many beads" value={params.count} set={(v) => set("count", Math.round(v))} {...LIMITS.count} unit="" hint="Packed on plates that fit your bed, each bead its own object." />
        </Section>

        <Section title="5 · Printer" open={false}>
          <Num label="Nozzle" value={params.nozzle} set={(v) => set("nozzle", v)} {...LIMITS.nozzle} />
          <Num label="Layer height" value={params.layerHeight} set={(v) => set("layerHeight", v)} {...LIMITS.layerHeight} />
          <Num label="Bed size" value={params.bedSize} set={(v) => set("bedSize", v)} {...LIMITS.bedSize} />
        </Section>

        <Section title="6 · Export">
          {result && result.plates.length > 1 && <Choice label="Plate" value={String(plateNo)} set={(v) => { setPlateNo(Number(v)); setView("plate"); }}
            options={result.plates.map((pl) => ({ value: String(pl.index), label: `Plate ${pl.index} · ${pl.beads.length} beads` }))} />}
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
          <small className="hint">Print standing up as placed: no supports. 0.2 mm layers, 3 walls. The 3MF carries your settings so you can reopen it here.</small>
        </Section>
      </aside>

      <main className="main">
        <Preview3D parts={parts} bedSize={view === "plate" ? params.bedSize : 0} resetToken={resetToken}
          frameKey={view === "plate" ? `plate:${plateNo}:${params.bedSize}` : result?.bead ? `bead:${params.height}:${params.diameter}` : ""} />
        <div className="toolbar">
          <button className={view === "bead" ? "on" : ""} onClick={() => setView("bead")}>One bead</button>
          <button className={view === "plate" ? "on" : ""} onClick={() => setView("plate")}>Print plate</button>
          <button onClick={() => setResetToken((t) => t + 1)}>Reset view</button>
        </div>
        {(busy || error) && <div className="status">{error ? `Error: ${error}` : "Building…"}</div>}
        <div className="readout">
          <b>Knot bead</b>
          <table><tbody>
            <tr><td>Bead</td><td className="v">{params.diameter} × {params.height} mm, {params.bore} mm bore</td></tr>
            {result && <tr><td>Batch</td><td className="v">{total} bead{total === 1 ? "" : "s"} on {result.plates.length} plate{result.plates.length === 1 ? "" : "s"}</td></tr>}
            {result?.bead && <tr><td>Filament</td><td className="v">≈ {gramsEach.toFixed(1)} g each, {(gramsEach * total).toFixed(0)} g total</td></tr>}
            {result && <tr><td>Checks</td><td className="v">{result.meshReport?.ok && errors.length === 0 ? "✓ watertight, no supports" : "✗ see problems"}</td></tr>}
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
