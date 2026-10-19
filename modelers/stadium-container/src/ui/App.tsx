import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PARAMS, FONT_LABELS, LIGHT_LABELS, LIMITS, TARGETS, type FontId, type LightMode, type StadiumParams } from "../core/params";
import { parseRecipe, toRecipe } from "../core/recipe";
import type { Artwork } from "../core/types";
import { readProjectFrom3MF } from "../export/threeMF";
import { GeometryClient } from "../pipeline/client";
import { GROUP_LABELS, type ExportGroup, type GenerateResult } from "../pipeline/generate";
import { parseSvgArtwork } from "./loadArtwork";
import { parseRasterArtwork } from "./loadRaster";
import { downloadBytes, safeName } from "./download";
import { Choice, Colour, Num, Section } from "./controls";
import { Preview3D, type ViewId } from "./Preview3D";

const STORAGE_KEY = "stadium-container:v1";
type Layout = "assembled" | ExportGroup;
const LAYOUT_LABELS: Record<Layout, string> = { assembled: "Assembled", ...GROUP_LABELS };

function loadSaved(): StadiumParams {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return parseRecipe(s);
  } catch { /* ignore */ }
  return { ...DEFAULT_PARAMS };
}

/** ?view=front|top|back|iso frames the preview from that side on load, ?layout=floodlights|fit-test|stadium shows a print layout (handy for screenshots). */
function initialView(): ViewId {
  const v = new URLSearchParams(location.search).get("view");
  return v === "front" || v === "top" || v === "back" ? v : "iso";
}
function initialLayout(): Layout {
  const l = new URLSearchParams(location.search).get("layout");
  return l === "stadium" || l === "floodlights" || l === "fit-test" ? l : "assembled";
}

export default function App() {
  const [params, setParams] = useState<StadiumParams>(loadSaved);
  const [art, setArt] = useState<Artwork | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [view, setView] = useState<{ id: ViewId; token: number }>({ id: initialView(), token: 0 });
  const client = useMemo(() => new GeometryClient(), []);
  const seq = useRef(0);
  const set = <K extends keyof StadiumParams>(k: K, v: StadiumParams[K]) => setParams((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await client.generate(params, art);
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
  }, [params, art, client]);
  useEffect(() => () => client.dispose(), [client]);

  const title = safeName(`${params.text || "stadium"}-stadium`);
  const canExport = !!result?.exportable && !busy;
  const hasLights = params.lights === "separate";
  const shown = !result ? [] : layout === "assembled" ? result.assembled : result.groups[layout].flatMap((o) => o.parts);
  const exportGroup: ExportGroup = layout === "assembled" ? "stadium" : layout;

  const save = async (make: () => Promise<Uint8Array>, filename: string, mime: string) => {
    try {
      const r = await downloadBytes(await make(), filename, mime);
      setNote(r === "declined" ? "Download cancelled." : null);
    } catch (e) { setError((e as Error).message); }
  };
  const suffix = exportGroup === "stadium" ? "" : `-${exportGroup}`;
  const download3mf = () => save(async () => (await client.export3mf(exportGroup, params, title)).bytes, `${title}${suffix}.3mf`, "model/3mf");
  const downloadStl = () => save(async () => (await client.exportStl(exportGroup, title)).bytes, `${title}${suffix}.stl`, "model/stl");
  const downloadZip = () => save(async () => (await client.exportZip(params, title)).bytes, `${title}.zip`, "application/zip");
  const saveSettings = () => save(async () => new TextEncoder().encode(JSON.stringify(toRecipe(params), null, 2)), `${title}-settings.json`, "application/json");
  const openFile = async (file: File) => {
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith(".svg") || file.type === "image/svg+xml") setArt(parseSvgArtwork(await file.text(), file.name));
      else if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/.test(name)) {
        const palette = new Set([params.colorStructure, params.colorFacade, params.colorAccent, params.colorSign].map((c) => c.toUpperCase())).size;
        setArt(await parseRasterArtwork(file, palette));
      } else {
        const json = name.endsWith(".3mf") ? readProjectFrom3MF(new Uint8Array(await file.arrayBuffer())) : await file.text();
        if (!json) throw new Error("This 3MF has no saved settings. Only files downloaded from this app reopen.");
        setParams(parseRecipe(json));
      }
      setError(null);
    } catch (e) { setError((e as Error).message); }
  };
  const fileInput = (accept: string) => <input type="file" accept={accept} onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ""; }} />;
  const look = (id: ViewId) => setView((v) => ({ id, token: v.token + 1 }));
  const r = result?.readout ?? null;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="dot" /><div><h1>Stadium Container</h1><small>A ballpark around an open round container · Valencia Modelers</small></div></div>

        <Section title="1 · Container">
          <Num label="Inside diameter" value={params.innerDiameter} set={(v) => set("innerDiameter", v)} {...LIMITS.innerDiameter} hint="A baseball is about 74 mm; the default leaves a little room." />
          <Num label="Usable depth" value={params.depth} set={(v) => set("depth", v)} {...LIMITS.depth} />
          <Num label="Rim width (container wall)" value={params.wall} set={(v) => set("wall", v)} {...LIMITS.wall} />
          <Num label="Floor thickness" value={params.floor} set={(v) => set("floor", v)} {...LIMITS.floor} />
        </Section>

        <Section title="2 · Seating">
          <Num label="Rows" value={params.rows} set={(v) => set("rows", Math.round(v))} {...LIMITS.rows} unit="" />
          <Num label="Row rise" value={params.rowRise} set={(v) => set("rowRise", v)} {...LIMITS.rowRise} />
          <Num label="Row depth (tread)" value={params.rowTread} set={(v) => set("rowTread", v)} {...LIMITS.rowTread} />
          <Num label="Sections (and sides)" value={params.sections} set={(v) => set("sections", Math.round(v))} {...LIMITS.sections} unit="" hint="Stairs between the sections line up with the corners of the building." />
          <Num label="Aisle (stairs) width" value={params.aisleWidth} set={(v) => set("aisleWidth", v)} {...LIMITS.aisleWidth} />
        </Section>

        <Section title="3 · Building">
          <Num label="Exterior wall height" value={params.wallHeight} set={(v) => set("wallHeight", v)} {...LIMITS.wallHeight} hint="Raised automatically so it clears the top row." />
          <Num label="Exterior wall thickness" value={params.wallThickness} set={(v) => set("wallThickness", v)} {...LIMITS.wallThickness} />
          <Num label="Concourse (top walkway)" value={params.concourse} set={(v) => set("concourse", v)} {...LIMITS.concourse} />
          <Num label="Base thickness" value={params.baseThickness} set={(v) => set("baseThickness", v)} {...LIMITS.baseThickness} />
          <Num label="Base margin" value={params.baseMargin} set={(v) => set("baseMargin", v)} {...LIMITS.baseMargin} hint="How far the base plate sticks out past the walls; the floodlights stand on it." />
        </Section>

        <Section title="4 · Entrance sign">
          <label className="field"><div className="row"><span>Sign text</span></div>
            <input className="text-input" value={params.text} onChange={(e) => set("text", e.target.value)} placeholder="BALLPARK" maxLength={24} /></label>
          <Choice label="Font" value={params.font} set={(v) => set("font", v as FontId)} options={(Object.keys(FONT_LABELS) as FontId[]).map((f) => ({ value: f, label: FONT_LABELS[f] }))} />
          <label className="field"><span>Emblem: a logo as SVG, PNG or JPG (raised on the tower; each colour prints in the nearest filament)</span><br />{fileInput(".svg,.png,.jpg,.jpeg,.webp,.gif,image/*")}</label>
          <small className="hint">PNG or JPG: the background (transparent or the border colour) is removed and the logo is reduced to at most four colours. Flat, bold logos work best.</small>
          {art && <div className="btns art"><span>{art.name}</span><span className="layers">{art.layers.map((l, i) => <span key={i} className="swatch" style={{ background: l.hex }} title={l.hex} />)}</span><button onClick={() => setArt(null)}>Remove</button></div>}
          {art && <Num label="Emblem height (0 = automatic)" value={params.emblemHeight} set={(v) => set("emblemHeight", v)} {...LIMITS.emblemHeight} />}
          {r && r.capHeight > 0 && <small className="hint">Letters {r.capHeight.toFixed(1)} mm tall, raised {TARGETS.stroke} mm.</small>}
        </Section>

        <Section title="5 · Floodlights">
          <Choice label="Floodlights" value={params.lights} set={(v) => set("lights", v as LightMode)} options={(Object.keys(LIGHT_LABELS) as LightMode[]).map((l) => ({ value: l, label: LIGHT_LABELS[l] }))} />
          {params.lights !== "none" && <Num label="Mast height" value={params.lightHeight} set={(v) => set("lightHeight", v)} {...LIMITS.lightHeight} />}
          {params.lights === "separate" && <Num label="Peg clearance (per side)" value={params.pegClearance} set={(v) => set("pegClearance", v)} {...LIMITS.pegClearance}
            hint="Print the peg fit test first. Loose: lower it. Will not go in: raise it." />}
        </Section>

        <Section title="6 · Colours" open={false}>
          <Colour label="Structure (base, steps, masts)" value={params.colorStructure} set={(v) => set("colorStructure", v)} />
          <Colour label="Facade (walls, tower, letters, lamps)" value={params.colorFacade} set={(v) => set("colorFacade", v)} />
          <Colour label="Accent (seats, awnings, top band, wing text)" value={params.colorAccent} set={(v) => set("colorAccent", v)} />
          <Colour label="Sign panel, doors, lamp heads" value={params.colorSign} set={(v) => set("colorSign", v)} />
          <small className="hint">Four colours at most, one AMS. Pick the same colour twice to use fewer.</small>
        </Section>

        <Section title="7 · Printer" open={false}>
          <Num label="Nozzle" value={params.nozzle} set={(v) => set("nozzle", v)} {...LIMITS.nozzle} />
          <Num label="Layer height" value={params.layerHeight} set={(v) => set("layerHeight", v)} {...LIMITS.layerHeight} />
          <Num label="Bed size" value={params.bedSize} set={(v) => set("bedSize", v)} {...LIMITS.bedSize} />
        </Section>

        <Section title="8 · Export">
          <div className="btns">
            <button className="primary" onClick={download3mf} disabled={!canExport}>3MF · {GROUP_LABELS[exportGroup]}</button>
            <button onClick={downloadStl} disabled={!canExport}>STL · {GROUP_LABELS[exportGroup]}</button>
            <button onClick={downloadZip} disabled={!canExport}>Everything (ZIP)</button>
          </div>
          <small className="hint">The 3MF and STL buttons export what the preview shows (Assembled exports the stadium). {hasLights ? "The ZIP holds the stadium, the four floodlights and the peg fit test." : ""}</small>
          <div className="btns">
            <button onClick={saveSettings}>Save settings</button>
            <label className="field"><span>Open settings / saved 3MF</span><br />{fileInput(".json,.3mf")}</label>
            <button onClick={() => { setParams({ ...DEFAULT_PARAMS }); setArt(null); }}>Reset</button>
          </div>
          <small className="hint">Print as placed: base on the bed, no supports. Floodlights print lying flat, lamps up.</small>
        </Section>
      </aside>

      <main className="main">
        <Preview3D parts={shown} bedSize={params.bedSize} view={view} />
        <div className="toolbar">
          {(Object.keys(LAYOUT_LABELS) as Layout[]).filter((l) => l === "assembled" || l === "stadium" || hasLights).map((l) => (
            <button key={l} className={l === layout ? "on" : ""} onClick={() => setLayout(l)}>{LAYOUT_LABELS[l]}</button>
          ))}
          <span style={{ width: 8 }} />
          <button onClick={() => look("iso")}>Reset view</button>
          <button onClick={() => look("front")}>Front</button>
          <button onClick={() => look("top")}>Top</button>
        </div>
        {(busy || error || note) && <div className="status">{error ? `Error: ${error}` : busy ? "Building…" : note}</div>}
        <div className="readout">
          <b>Stadium</b>
          <table><tbody>
            {r && <>
              <tr><td>Container</td><td className="v">⌀ {r.cavityDiameter} × {r.cavityDepth} mm deep, floor {r.floor} mm</td></tr>
              <tr><td>Footprint</td><td className="v">{r.footprint.toFixed(0)} mm corners / {r.acrossFlats.toFixed(0)} mm flats</td></tr>
              <tr><td>Height</td><td className="v">{r.height.toFixed(0)} mm{params.lights === "separate" ? ` (+ ${r.lightHeight.toFixed(0)} mm masts)` : ""}</td></tr>
              <tr><td>Seating</td><td className="v">{params.rows} rows, {r.seatingWidth.toFixed(0)} wide × {r.seatingHeight.toFixed(1)} mm tall</td></tr>
              <tr><td>Colours</td><td className="v">{r.colours}</td></tr>
            </>}
            {result && <tr><td>Checks</td><td className="v">{result.meshesFailed === 0 && result.exportable ? `✓ ${result.meshesChecked} meshes watertight` : "✗ see problems"}</td></tr>}
          </tbody></table>
        </div>
        {result && result.issues.length > 0 && (
          <div className="issues">
            {result.issues.slice(0, 8).map((i, k) => <div key={k} className={`issue ${i.severity}`}>{i.severity === "error" ? "✗ " : i.severity === "warning" ? "⚠ " : "ℹ "}{i.message}</div>)}
            {result.issues.length > 8 && <div className="issue info">…and {result.issues.length - 8} more.</div>}
          </div>
        )}
      </main>
    </div>
  );
}
