/**
 * Batch helpers shared by every engine that turns a list of orders into
 * print plates: CSV reading/writing and shelf packing of rectangles.
 */

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

/** Header names of a CSV (first non-blank row), trimmed. */
export function csvHeaders(csv: string): string[] {
  const first = csv.replace(/\r/g, "").split("\n").find((l) => l.trim()) ?? "";
  return splitCsvRow(first).map((h) => h.trim());
}

/** First header whose lower-case name is in `names`, or "". */
export const findHeader = (headers: string[], names: string[]) => headers.find((h) => names.includes(h.toLowerCase())) ?? "";

/** One CSV cell, quoted when it holds a comma, quote or newline. */
export function csvCell(s: string | number): string {
  const v = String(s);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export const toCsv = (rows: (string | number)[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";

export interface Placement {
  /** 0-based plate index. */
  plate: number;
  x: number;
  y: number;
}

/**
 * Shelf packing in list order: rectangles fill a row left to right, rows stack
 * up the plate, and a new plate starts when the next row would not fit. Order
 * is kept so a manifest reads like the input list. A rectangle larger than the
 * usable bed gets null.
 */
export function shelfPack(sizes: { w: number; h: number }[], bed: number, border: number, gap: number): (Placement | null)[] {
  const max = bed - border;
  let plate = 0;
  let x = border;
  let y = border;
  let rowH = 0;
  return sizes.map(({ w, h }) => {
    if (w > bed - 2 * border || h > bed - 2 * border) return null;
    if (x + w > max) {
      x = border;
      y += rowH + gap;
      rowH = 0;
    }
    if (y + h > max) {
      plate++;
      x = border;
      y = border;
      rowH = 0;
    }
    const at = { plate, x, y };
    x += w + gap;
    rowH = Math.max(rowH, h);
    return at;
  });
}

const LETTERS: Record<string, string> = { ß: "SS", Ł: "L", ł: "L", Ø: "O", ø: "O", Æ: "AE", æ: "AE", Œ: "OE", œ: "OE", Đ: "D", đ: "D", Þ: "TH", þ: "TH" };

/**
 * Slicer-safe object name from free text: "Zoë & Łukasz" → "ZOE_LUKASZ".
 * Accents are dropped rather than the letter, so names stay readable in the
 * slicer's object list and the manifest.
 */
export function objectSlug(text: string, fallback: string, max = 24): string {
  const plain = text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[ßŁłØøÆæŒœĐđÞþ]/g, (c) => LETTERS[c]);
  return plain.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, max).replace(/_$/, "") || fallback;
}
