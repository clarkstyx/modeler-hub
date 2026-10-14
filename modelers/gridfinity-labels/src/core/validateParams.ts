import { GRID_PITCH, labelWidth, type LabelParams } from "./params";
import type { Issue } from "./types";

/** Rules checked before any geometry is built. Errors block export. */
export function validateParams(p: LabelParams): Issue[] {
  const issues: Issue[] = [];
  const err = (message: string) => issues.push({ severity: "error", message });
  const warn = (message: string) => issues.push({ severity: "warning", message });
  if (p.thickness < 3 * p.layerHeight) err(`Label thickness must be at least three layers (${(3 * p.layerHeight).toFixed(2)} mm).`);
  if (p.relief !== "raised" && p.reliefDepth > p.thickness - 0.4)
    err(`${p.relief === "inlay" ? "Inlay" : "Engraving"} ${p.reliefDepth} mm deep leaves under 0.4 mm of label under the letters.`);
  if (p.relief === "raised" && p.reliefDepth < 2 * p.layerHeight) warn("Raised text under two layers tall barely shows.");
  if (p.height - 2 * p.padding < 3) err("The label is too short for its padding: under 3 mm left for text.");
  if (p.cornerRadius * 2 > p.height) warn("Corner radius is capped at half the label height.");
  const w = labelWidth(p, null);
  if (w < 15) err(`The label would be only ${w.toFixed(1)} mm wide.`);
  if (w > p.bedSize - 10) err(`A ${w.toFixed(0)} mm label does not fit a ${p.bedSize} mm bed.`);
  if (p.widthMode === "units" && p.endClearance > GRID_PITCH / 2) warn("End clearance is more than half a grid unit; labels will look short.");
  if (p.relief === "inlay" && p.textColor.toLowerCase() === p.plateColor.toLowerCase()) warn("Inlaid text is the same colour as the label, so it will be invisible.");
  return issues;
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.severity === "error");
