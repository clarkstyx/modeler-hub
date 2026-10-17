import { layoutText, type FontId, type TextBlock } from "../shared/textShapes";
import { MIN_TEXT, holeCentre, optionList, questionFor, type TagParams } from "./params";

const LETTER_SPACING = 0.05;

/** A text block placed on the card: its rings are centred on (cx, cy). */
export interface PlacedText {
  text: string;
  block: TextBlock;
  cx: number;
  cy: number;
}

export interface TickBox {
  label: string;
  /** Bottom-left corner of the square. */
  x: number;
  y: number;
  size: number;
  ticked: boolean;
}

export interface TagLayout {
  name: string;
  /** The question as it will print, one entry per line after wrapping. */
  lines: string[];
  /** Capital height the question ended up at (after shrinking to fit). */
  textCap: number;
  /** False when even the smallest text does not fit the space above the boxes. */
  textFits: boolean;
  question: PlacedText | null;
  boxes: TickBox[];
  labels: PlacedText[];
  /** False when the tick boxes and labels are taller than the card allows. */
  optionsFit: boolean;
  /** Below 1 when the boxes and labels were shrunk to fit across the card. */
  optionsScale: number;
  /** The space the question gets: between the boxes and the hole. */
  area: { x0: number; y0: number; x1: number; y1: number };
}

// Width of a string at capital height 1 mm. Width grows in proportion to the
// letter size (letter spacing is a fraction of it too), so wrapping and
// shrinking only need one measurement per string.
const unitWidths = new Map<string, number>();
function unitWidth(s: string, font: FontId): number {
  const key = `${font}|${s}`;
  let w = unitWidths.get(key);
  if (w === undefined) {
    w = layoutText(s, font, 1, LETTER_SPACING).width;
    if (unitWidths.size > 4000) unitWidths.clear();
    unitWidths.set(key, w);
  }
  return w;
}

/** Greedy word wrap at a letter size; keeps the line breaks the user typed. */
function wrap(text: string, font: FontId, cap: number, maxWidth: number): { lines: string[]; widest: number } {
  const lines: string[] = [];
  let widest = 0;
  for (const para of text.replace(/\r/g, "").split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { lines.push(""); continue; }
    let cur = words[0];
    for (const word of words.slice(1)) {
      const next = `${cur} ${word}`;
      if (unitWidth(next, font) * cap <= maxWidth) cur = next;
      else { lines.push(cur); widest = Math.max(widest, unitWidth(cur, font) * cap); cur = word; }
    }
    lines.push(cur);
    widest = Math.max(widest, unitWidth(cur, font) * cap);
  }
  return { lines, widest };
}

/** Width of the tick boxes with their labels, at the set sizes. */
function optionsWidth(p: TagParams, opts: string[]): number {
  const rows = opts.map((t) => p.boxSize * 1.45 + unitWidth(t, p.font) * p.labelSize);
  if (!rows.length) return 0;
  return p.optionsLayout === "rows" ? Math.max(...rows) : rows.reduce((a, b) => a + b, 0) + (rows.length - 1) * p.boxSize;
}

/** Where everything goes on one tag. Pure maths and font outlines, no geometry kernel. */
export function layoutTag(p: TagParams, name: string): TagLayout {
  const opts = optionList(p);
  // Boxes and labels too wide for the card shrink together, like the question does.
  const room = p.width - 2 * p.margin;
  const wide = optionsWidth(p, opts);
  if (wide > room) {
    const k = Math.max(0.4, (room / wide) * 0.999);
    return { ...layoutTag({ ...p, boxSize: p.boxSize * k, labelSize: p.labelSize * k }, name), optionsScale: k };
  }
  const W = p.width, H = p.height, m = p.margin;
  const s = p.boxSize;
  const labelGap = 0.45 * s;
  const labels = opts.map((t) => ({ text: t, block: layoutText(t, p.font, p.labelSize, LETTER_SPACING) }));
  const rowW = labels.map((l) => s + labelGap + l.block.width);

  // Tick boxes: centred across the card, a little above the bottom margin.
  const boxes: TickBox[] = [];
  const placedLabels: PlacedText[] = [];
  const bottom = m + Math.min(2, m / 2);
  let blockW = 0, blockH = 0;
  if (opts.length) {
    if (p.optionsLayout === "rows") {
      const gap = 0.45 * s;
      blockW = Math.max(...rowW);
      blockH = opts.length * s + (opts.length - 1) * gap;
      const x = (W - blockW) / 2;
      opts.forEach((label, i) => {
        const y = bottom + (opts.length - 1 - i) * (s + gap);
        boxes.push({ label, x, y, size: s, ticked: p.checked === i + 1 });
      });
    } else {
      const gap = s;
      blockW = rowW.reduce((a, b) => a + b, 0) + (opts.length - 1) * gap;
      blockH = s;
      let x = (W - blockW) / 2;
      opts.forEach((label, i) => {
        boxes.push({ label, x, y: bottom, size: s, ticked: p.checked === i + 1 });
        x += rowW[i] + gap;
      });
    }
    boxes.forEach((b, i) => placedLabels.push({ ...labels[i], cx: b.x + s + labelGap + labels[i].block.width / 2, cy: b.y + s / 2 }));
  }
  const labelTop = Math.max(0, ...labels.map((l) => l.block.height)) / 2;
  const optionsTop = opts.length ? bottom + blockH - s / 2 + Math.max(s / 2, labelTop) : m;

  // The question gets what is left between the boxes and the hole.
  const hole = holeCentre(p);
  const top = hole ? Math.min(H - m, hole[1] - p.holeDiameter / 2 - 1.5) : H - m;
  const area = { x0: m, y0: opts.length ? optionsTop + Math.max(3, 0.5 * s) : m, x1: W - m, y1: top };
  const optionsFit = blockW <= W - 2 * m && optionsTop <= top;
  const aw = area.x1 - area.x0, ah = area.y1 - area.y0;

  const text = questionFor(p, name);
  let lines: string[] = [];
  let cap = Math.max(MIN_TEXT, p.textSize);
  let textFits = true;
  if (text) {
    textFits = false;
    for (let c = p.textSize; c >= MIN_TEXT - 1e-9; c *= 0.97) {
      const w = wrap(text, p.font, c, aw);
      const h = c + (w.lines.length - 1) * c * p.lineSpacing;
      if (w.widest <= aw && h <= ah) { lines = w.lines; cap = c; textFits = true; break; }
    }
    if (!textFits) { cap = MIN_TEXT; lines = wrap(text, p.font, cap, aw).lines; }
  }
  const question = text
    ? { text: lines.join("\n"), block: layoutText(lines.join("\n"), p.font, cap, LETTER_SPACING, p.lineSpacing), cx: W / 2, cy: (area.y0 + area.y1) / 2 }
    : null;

  return { name, lines, textCap: text ? cap : 0, textFits, question, boxes, labels: placedLabels, optionsFit, optionsScale: 1, area };
}
