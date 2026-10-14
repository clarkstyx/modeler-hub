import type { CutterParams } from "./params";
import type { Issue } from "./types";

/** Rules checked before any geometry is built. Errors block export. */
export function validateParams(p: CutterParams): Issue[] {
  const issues: Issue[] = [];
  const err = (message: string) => issues.push({ severity: "error", message });
  const warn = (message: string) => issues.push({ severity: "warning", message });
  if (p.edge < 2 * p.nozzle - 1e-9) err(`The cutting edge must be at least two nozzle widths (${(2 * p.nozzle).toFixed(2)} mm) to print as a solid wall.`);
  if (p.wall < p.edge) err("The wall cannot be thinner than the cutting edge.");
  if (p.wall < 2 * p.nozzle - 1e-9) err(`The wall must be at least two nozzle widths (${(2 * p.nozzle).toFixed(2)} mm).`);
  if (p.flange > 0 && p.flangeThickness < 3 * p.layerHeight) err(`The flange must be at least three layers thick (${(3 * p.layerHeight).toFixed(2)} mm).`);
  if (p.height < p.flangeThickness + p.edgeHeight + 2) err("The cutter is too short for its flange and edge: make it taller or the edge band shorter.");
  if (p.edge > 1.2) warn("A cutting edge over 1.2 mm pushes the dough rather than cutting it cleanly.");
  if ((p.source === "letters" || p.source === "word") && !p.text.trim()) err("Type the letters or word to cut.");
  if (p.source === "letters" && Array.from(p.text.replace(/\s/g, "")).length > 40) err("Letters mode makes one cutter per character: 40 at most.");
  return issues;
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.severity === "error");
