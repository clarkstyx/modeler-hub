import { ICON_LABELS, LIMITS, type IconId, type LabelSpec } from "./params";

const ICON_IDS = Object.keys(ICON_LABELS) as IconId[];
const ICON_ALIASES: Record<string, IconId> = {
  screw: "screw", screws: "screw", bolt: "bolt", bolts: "bolt", nut: "nut", nuts: "nut",
  washer: "washer", washers: "washer", insert: "insert", inserts: "insert", "heat-set": "insert",
  svg: "custom", custom: "custom", logo: "custom", none: "none", "-": "none", "": "none",
};

export interface ParseResult {
  specs: LabelSpec[];
  warnings: string[];
}

function iconOf(raw: string, fallback: IconId, line: number, warnings: string[]): IconId {
  const k = raw.trim().toLowerCase();
  if (!k) return fallback;
  const id = ICON_ALIASES[k] ?? (ICON_IDS.includes(k as IconId) ? (k as IconId) : null);
  if (!id) {
    warnings.push(`Line ${line}: unknown icon "${raw.trim()}", used ${ICON_LABELS[fallback].toLowerCase()} instead.`);
    return fallback;
  }
  return id;
}

function unitsOf(raw: string, line: number, warnings: string[]): number | null {
  const k = raw.trim().toLowerCase().replace(/u(nits?)?$/, "");
  if (!k) return null;
  const n = Math.round(Number(k));
  if (!Number.isFinite(n) || n < LIMITS.units.min || n > LIMITS.units.max) {
    warnings.push(`Line ${line}: width "${raw.trim()}" is not 1–6 grid units; used the default.`);
    return null;
  }
  return n;
}

/**
 * Plain-text batch list: one label per line, fields separated by "|":
 *   M3 x 8 | screw | 2
 *   text   | icon  | width in grid units (optional)
 * "\n" inside the text makes a second line. Blank lines and lines starting
 * with # are skipped.
 */
export function parseList(text: string, defaultIcon: IconId): ParseResult {
  const specs: LabelSpec[] = [];
  const warnings: string[] = [];
  text.replace(/\r/g, "").split("\n").forEach((raw, i) => {
    const line = i + 1;
    if (!raw.trim() || raw.trim().startsWith("#")) return;
    const [t = "", ic = "", u = ""] = raw.split("|");
    const labelText = t.trim().replace(/\\n/g, "\n");
    if (!labelText.trim()) {
      warnings.push(`Line ${line}: no text, skipped.`);
      return;
    }
    specs.push({ line, text: labelText, icon: iconOf(ic, defaultIcon, line, warnings), units: unitsOf(u, line, warnings), order: "" });
  });
  return { specs, warnings };
}

/** Splits one CSV row, honouring double quotes ("a, b" and doubled "" escapes). */
export function splitCsvRow(row: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (q) {
      if (c === '"' && row[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

export interface CsvMapping {
  text: string;
  icon: string;
  units: string;
  order: string;
  /** Rows repeat this many times when a quantity column is mapped. */
  quantity: string;
}

/** Column names that are picked automatically when present (case-insensitive). */
export const CSV_GUESSES: Record<keyof CsvMapping, string[]> = {
  text: ["text", "label", "name", "title", "item"],
  icon: ["icon", "symbol", "type"],
  units: ["units", "width", "size", "grid"],
  order: ["order", "order id", "order_id", "order number", "sku"],
  quantity: ["quantity", "qty", "count"],
};

export function csvHeaders(csv: string): string[] {
  const first = csv.replace(/\r/g, "").split("\n").find((l) => l.trim()) ?? "";
  return splitCsvRow(first).map((h) => h.trim());
}

export function guessMapping(headers: string[]): CsvMapping {
  const find = (names: string[]) => headers.find((h) => names.includes(h.toLowerCase())) ?? "";
  return {
    text: find(CSV_GUESSES.text) || headers[0] || "",
    icon: find(CSV_GUESSES.icon),
    units: find(CSV_GUESSES.units),
    order: find(CSV_GUESSES.order),
    quantity: find(CSV_GUESSES.quantity),
  };
}

/** CSV with a header row; columns are mapped to label fields. Up to 500 labels. */
export function parseCsv(csv: string, mapping: CsvMapping, defaultIcon: IconId): ParseResult {
  const rows = csv.replace(/\r/g, "").split("\n");
  const headerIndex = rows.findIndex((l) => l.trim());
  const warnings: string[] = [];
  const specs: LabelSpec[] = [];
  if (headerIndex < 0) return { specs, warnings: ["The CSV file is empty."] };
  const headers = splitCsvRow(rows[headerIndex]).map((h) => h.trim());
  const col = (name: string) => (name ? headers.indexOf(name) : -1);
  const ci = { text: col(mapping.text), icon: col(mapping.icon), units: col(mapping.units), order: col(mapping.order), qty: col(mapping.quantity) };
  if (ci.text < 0) return { specs, warnings: ["Pick which CSV column holds the label text."] };
  for (let i = headerIndex + 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue;
    const cells = splitCsvRow(rows[i]);
    const line = i + 1;
    const text = (cells[ci.text] ?? "").trim().replace(/\\n/g, "\n");
    if (!text) { warnings.push(`Row ${line}: no text, skipped.`); continue; }
    let qty = 1;
    if (ci.qty >= 0) {
      const q = Math.round(Number(cells[ci.qty]));
      if (Number.isFinite(q) && q >= 1) qty = Math.min(q, 100);
      else warnings.push(`Row ${line}: quantity "${cells[ci.qty] ?? ""}" is not a whole number; made 1.`);
    }
    const spec: LabelSpec = {
      line,
      text,
      icon: ci.icon >= 0 ? iconOf(cells[ci.icon] ?? "", defaultIcon, line, warnings) : defaultIcon,
      units: ci.units >= 0 ? unitsOf(cells[ci.units] ?? "", line, warnings) : null,
      order: ci.order >= 0 ? (cells[ci.order] ?? "").trim() : "",
    };
    for (let k = 0; k < qty; k++) specs.push({ ...spec });
    if (specs.length >= 500) { warnings.push("Stopped at 500 labels; split the CSV for more."); break; }
  }
  return { specs, warnings };
}
