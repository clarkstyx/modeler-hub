import { derive, type BoxParams } from "./params";
import type { Issue } from "./types";

/** Parameter-level checks, before any geometry is built. Errors block export. */
export function validateParams(p: BoxParams): Issue[] {
  const issues: Issue[] = [];
  const d = derive(p);
  const minWall = 2 * p.nozzle;
  const err = (message: string) => issues.push({ severity: "error", message });
  const warn = (message: string) => issues.push({ severity: "warning", message });

  if (d.railDepth < p.railDepth - 1e-9)
    issues.push({ severity: "info", message: `Rail depth reduced to ${d.railDepth.toFixed(2)} mm so the wall outside the rail keeps ${minWall.toFixed(2)} mm (two nozzle widths).` });
  if (p.railLip < 2 * p.layerHeight) err(`Rail lip must be at least two layers (${(2 * p.layerHeight).toFixed(2)} mm).`);
  if (p.wall < minWall) err(`Wall ${p.wall} mm is thinner than two nozzle widths (${minWall} mm).`);
  if (p.base < 2 * p.layerHeight) err(`Base must be at least two layers thick.`);
  if (d.innerL < 5 || d.innerW < 5 || d.innerH < 3) err("The box is too small for its walls: nothing would fit inside.");
  if (p.cornerRadius > Math.min(d.outerL, d.outerW) / 2 - 0.01) warn("Corner radius is capped to half of the shorter side.");
  if (p.lidGrip === "thumbNotch" && p.gripDepth > p.lidThickness - 0.6)
    err(`Thumb notch ${p.gripDepth} mm would leave under 0.6 mm of lid. Make the lid thicker or the notch shallower.`);
  if (p.relief === "engraved" && p.reliefDepth > p.lidThickness - 0.6)
    err(`Engraving ${p.reliefDepth} mm deep leaves under 0.6 mm of lid under the letters.`);
  if (p.relief === "inlay" && p.reliefDepth > p.lidThickness - 0.6)
    err(`Inlay ${p.reliefDepth} mm deep leaves under 0.6 mm of lid under the letters.`);
  if (p.dividerCols * p.dividerRows > 1) {
    if (p.dividerThickness < minWall) warn(`Dividers thinner than ${minWall} mm may not print as solid walls.`);
    const cellL = (d.innerL - (p.dividerCols - 1) * p.dividerThickness) / p.dividerCols;
    const cellW = (d.innerW - (p.dividerRows - 1) * p.dividerThickness) / p.dividerRows;
    if (cellL < 5 || cellW < 5) err(`Compartments would be only ${Math.min(cellL, cellW).toFixed(1)} mm across. Use fewer dividers.`);
  }
  const footprint = Math.max(d.outerL, d.outerW + 10 + d.lidW);
  if (d.outerL > p.bedSize || d.outerW > p.bedSize) err(`The box (${d.outerL.toFixed(1)} × ${d.outerW.toFixed(1)} mm) does not fit a ${p.bedSize} mm bed.`);
  else if (footprint > p.bedSize) warn(`Box and lid side by side need ${footprint.toFixed(0)} mm; print them on two plates or move the lid in the slicer.`);
  if (p.clearance < 0.15) warn("Clearance under 0.15 mm usually needs a very well tuned printer. Print the calibration set first.");
  if (p.clearance > 0.4) warn("Clearance over 0.4 mm makes a rattly lid.");
  if (p.relief === "inlay" && p.textColor.toLowerCase() === p.lidColor.toLowerCase())
    warn("Inlaid text is the same colour as the lid, so it will be invisible.");
  return issues;
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.severity === "error");
