import { LIMITS, deriveRack, type BoxParams } from "../core/params";
import { Choice, Num, Section } from "./controls";

type Set = <K extends keyof BoxParams>(k: K, v: BoxParams[K]) => void;
type Lim = { min: number; max: number; step: number };

const IN = 25.4;

/** A length stored in mm, shown in the rack's chosen unit. */
function Len({ p, label, k, set, hint }: { p: BoxParams; label: string; k: keyof typeof LIMITS & keyof BoxParams; set: Set; hint?: string }) {
  const lim = LIMITS[k] as Lim;
  const mm = p[k] as number;
  if (p.rackUnits === "mm") return <Num label={label} value={mm} set={(v) => set(k, v as never)} {...lim} hint={hint} />;
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return (
    <Num label={label} value={round(mm / IN)} set={(v) => set(k, round(v * IN * 1000) / 1000 as never)}
      min={round(lim.min / IN)} max={round(lim.max / IN)} step={0.05} unit="in" hint={hint} />
  );
}

/** Sidebar sections 2–5 for the enclosure rack. */
export function RackControls({ params: p, set, busy, onFitTest }: { params: BoxParams; set: Set; busy: boolean; onFitTest: () => void }) {
  const r = deriveRack(p);
  const fmt = (mm: number) => (p.rackUnits === "in" ? `${(mm / IN).toFixed(2)} in` : `${mm.toFixed(0)} mm`);
  return <>
    <Section title="2 · Enclosure size">
      <Choice label="Units" value={p.rackUnits} set={(v) => set("rackUnits", v)} options={[{ value: "in", label: "inches" }, { value: "mm", label: "millimetres" }]} />
      <Len p={p} label="Width (seen from the front)" k="encWidth" set={set} />
      <Len p={p} label="Depth (front to back)" k="encDepth" set={set} />
      <Len p={p} label="Height" k="encHeight" set={set} />
      <small className="hint">Measure the outside of the enclosure, including any feet or latches. Each cube is built around one enclosure.</small>
    </Section>

    <Section title="3 · Cube">
      <Len p={p} label="Gap each side" k="rackSideGap" set={set} />
      <Len p={p} label="Gap above" k="rackTopGap" set={set} />
      <Len p={p} label="Space behind the tray" k="rackBackGap" set={set} hint="Room for air and cables in front of the vented back." />
      <Num label="Wall" value={p.rackWall} set={(v) => set("rackWall", v)} {...LIMITS.rackWall} hint="Every outer face has two dovetail grooves for the joining keys." />
      <Num label="Vent hole size (0 = none)" value={p.ventHole} set={(v) => set("ventHole", v)} {...LIMITS.ventHole} />
      {p.ventHole > 0 && <Num label="Vent spacing" value={p.ventSpacing} set={(v) => set("ventSpacing", v)} {...LIMITS.ventSpacing} />}
    </Section>

    <Section title="4 · Drawer tray">
      <Num label="Tray height" value={p.trayHeight} set={(v) => set("trayHeight", v)} {...LIMITS.trayHeight} />
      <Num label="Recess for the enclosure" value={p.trayPocket} set={(v) => set("trayPocket", v)} {...LIMITS.trayPocket} hint="The enclosure sits in this shallow pocket so it cannot slide off the tray." />
      <Num label="Clearance each side" value={p.trayClearance} set={(v) => set("trayClearance", v)} {...LIMITS.trayClearance} />
      <Num label="Slide-out" value={p.trayTravel} set={(v) => set("trayTravel", v)} {...LIMITS.trayTravel} unit="×" hint={`Fraction of the tray that comes out before the stop catches: ${fmt(r.travel)}.`} />
      <small className="hint">A ramp on the cube floor lets the tray in and catches it on the way out. To take the tray out completely, pull it to the stop and press the handle down so the back lifts over the ramp.</small>
    </Section>

    <Section title="5 · Rack layout and joining keys">
      <Num label="Columns" value={p.rackCols} set={(v) => set("rackCols", Math.round(v))} {...LIMITS.rackCols} unit="" />
      <Num label="Rows" value={p.rackRows} set={(v) => set("rackRows", Math.round(v))} {...LIMITS.rackRows} unit="" />
      <Num label="Key clearance" value={p.keyClearance} set={(v) => set("keyClearance", v)} {...LIMITS.keyClearance} hint="Gap around each key in its grooves. Print the fit test to pick it." />
      <div className="btns"><button onClick={onFitTest} disabled={busy}>Download key fit test (3MF)</button></div>
      <small className="hint">Two small blocks and three keys at your clearance ±0.05 mm (the shortest key is the tightest). Put the blocks groove to groove, try each key, set Key clearance to the one that slides in by hand without wobbling.</small>
    </Section>
  </>;
}
