import type { ReactNode } from "react";

export function Section({ title, children, open = true }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="section" open={open}>
      <summary>{title}</summary>
      <div className="section-body">{children}</div>
    </details>
  );
}

interface NumProps {
  label: string;
  value: number;
  set: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  hint?: string;
}
export function Num({ label, value, set, min, max, step, unit = "mm", hint }: NumProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <label className="field">
      <div className="row">
        <span>{label}</span>
        <span className="val">
          <input type="number" value={value} min={min} max={max} step={step} onChange={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) set(clamp(v)); }} />
          <small>{unit}</small>
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(parseFloat(e.target.value))} />
      {hint && <small className="hint">{hint}</small>}
    </label>
  );
}

export function Choice<T extends string>({ label, value, set, options }: { label: string; value: T; set: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <label className="field">
      <div className="row"><span>{label}</span></div>
      <select value={value} onChange={(e) => set(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function Colour({ label, value, set }: { label: string; value: string; set: (v: string) => void }) {
  return (
    <label className="field colour">
      <span>{label}</span>
      <input type="color" value={value} onChange={(e) => set(e.target.value)} />
      <code>{value.toUpperCase()}</code>
    </label>
  );
}
