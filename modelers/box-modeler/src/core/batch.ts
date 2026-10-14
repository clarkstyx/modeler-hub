import { csvHeaders, findHeader, splitCsvRow } from "../shared/batch";

export { csvHeaders };

/** One personalised lid (or box + lid) in a batch. */
export interface BatchItem {
  /** Line or row of the input it came from (1-based), for messages and the manifest. */
  line: number;
  text: string;
  /** Order id from a CSV, "" for a typed list. */
  order: string;
}

export type BatchWhat = "lids" | "sets";
export const BATCH_WHAT_LABELS: Record<BatchWhat, string> = {
  lids: "Lids only (print the plain boxes separately)",
  sets: "Box + lid for every name",
};

export const MAX_BATCH = 200;

export interface BatchParse {
  items: BatchItem[];
  warnings: string[];
}

function quantity(raw: string, where: string, warnings: string[]): number {
  if (!raw.trim()) return 1;
  const q = Math.round(Number(raw));
  if (Number.isFinite(q) && q >= 1) return Math.min(q, 50);
  warnings.push(`${where}: quantity "${raw.trim()}" is not a whole number; made 1.`);
  return 1;
}

function push(items: BatchItem[], item: BatchItem, qty: number, warnings: string[]): boolean {
  for (let k = 0; k < qty; k++) {
    if (items.length >= MAX_BATCH) {
      warnings.push(`Stopped at ${MAX_BATCH} lids; split the list for more.`);
      return false;
    }
    items.push({ ...item });
  }
  return true;
}

/**
 * Typed list: one lid per line, optional quantity after a "|":
 *   Ava
 *   Noah | 2
 *   Happy\nBirthday     (\n makes a second line)
 * Blank lines and lines starting with # are skipped.
 */
export function parseNames(text: string): BatchParse {
  const items: BatchItem[] = [];
  const warnings: string[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const bar = raw.lastIndexOf("|");
    const name = (bar >= 0 ? raw.slice(0, bar) : raw).trim().replace(/\\n/g, "\n");
    if (!name.trim()) { warnings.push(`Line ${i + 1}: no text, skipped.`); continue; }
    const qty = bar >= 0 ? quantity(raw.slice(bar + 1), `Line ${i + 1}`, warnings) : 1;
    if (!push(items, { line: i + 1, text: name, order: "" }, qty, warnings)) break;
  }
  return { items, warnings };
}

export interface CsvMapping {
  text: string;
  order: string;
  quantity: string;
}

export function guessMapping(headers: string[]): CsvMapping {
  return {
    text: findHeader(headers, ["text", "name", "personalisation", "personalization", "engraving", "lid text"]) || headers[0] || "",
    order: findHeader(headers, ["order", "order id", "order_id", "order number", "sku"]),
    quantity: findHeader(headers, ["quantity", "qty", "count"]),
  };
}

/** CSV with a header row (an Etsy or Shopify order export, say); columns picked in the app. */
export function parseOrdersCsv(csv: string, mapping: CsvMapping): BatchParse {
  const rows = csv.replace(/\r/g, "").split("\n");
  const headerIndex = rows.findIndex((l) => l.trim());
  const items: BatchItem[] = [];
  const warnings: string[] = [];
  if (headerIndex < 0) return { items, warnings: ["The CSV file is empty."] };
  const headers = splitCsvRow(rows[headerIndex]).map((h) => h.trim());
  const col = (name: string) => (name ? headers.indexOf(name) : -1);
  const ci = { text: col(mapping.text), order: col(mapping.order), qty: col(mapping.quantity) };
  if (ci.text < 0) return { items, warnings: ["Pick which CSV column holds the lid text."] };
  for (let i = headerIndex + 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue;
    const cells = splitCsvRow(rows[i]);
    const text = (cells[ci.text] ?? "").trim().replace(/\\n/g, "\n");
    if (!text) { warnings.push(`Row ${i + 1}: no text, skipped.`); continue; }
    const qty = ci.qty >= 0 ? quantity(cells[ci.qty] ?? "", `Row ${i + 1}`, warnings) : 1;
    if (!push(items, { line: i + 1, text, order: ci.order >= 0 ? (cells[ci.order] ?? "").trim() : "" }, qty, warnings)) break;
  }
  return { items, warnings };
}
