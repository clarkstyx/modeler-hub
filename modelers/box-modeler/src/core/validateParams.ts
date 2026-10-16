import { DOVETAIL, STOP, derive, deriveRack, type BoxParams } from "./params";
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

/** Checks for the enclosure rack (product "rack"). */
export function validateRack(p: BoxParams): Issue[] {
  const issues: Issue[] = [];
  const r = deriveRack(p);
  const err = (message: string) => issues.push({ severity: "error", message });
  const warn = (message: string) => issues.push({ severity: "warning", message });
  const info = (message: string) => issues.push({ severity: "info", message });
  const mm = (v: number) => `${v.toFixed(0)} mm (${(v / 25.4).toFixed(2)}")`;

  if (r.W > p.bedSize || r.H > p.bedSize)
    err(`One cube is ${mm(r.W)} × ${mm(r.H)} on the bed; that does not fit a ${p.bedSize} mm bed. Make the enclosure or the gaps smaller.`);
  if (r.D > p.bedSize) err(`The cube prints ${mm(r.D)} tall (it lies on its back); that is taller than the printer. Make the enclosure shallower.`);
  if (r.trayW > p.bedSize || r.trayL + 14 > p.bedSize) err(`The tray (${mm(r.trayW)} × ${mm(r.trayL + 14)}) does not fit a ${p.bedSize} mm bed.`);
  const left = p.rackWall - DOVETAIL.depth;
  if (left < 4 * p.nozzle) err(`Walls ${p.rackWall} mm thick leave only ${left.toFixed(1)} mm behind the ${DOVETAIL.depth} mm joining grooves. Use at least ${(DOVETAIL.depth + 4 * p.nozzle).toFixed(1)} mm.`);
  const under = p.trayHeight - Math.min(p.trayPocket, p.trayHeight - 1) - r.channelDepth;
  if (under < 1.2) err(`The tray is too thin: only ${under.toFixed(1)} mm between its recess and the stop channel underneath. Make it taller or the recess shallower.`);
  if (p.rackTopGap < STOP.height + 1) err(`The gap above the enclosure must be at least ${STOP.height + 1} mm so the tray can lift over the stop going in.`);
  if (p.trayTravel > 0.55) warn("A tray that slides out more than about half way can tip forward with an enclosure on it and lift over its stop. Keep Slide-out at 0.5 or less unless the enclosure is light.");
  if (r.travel < p.trayTravel * r.trayL - 0.5) info(`The tray slides out ${mm(r.travel)}: the most this tray length allows.`);
  if (p.ventHole > 0 && p.ventSpacing < p.ventHole + 2) err("Vent holes would touch each other. Increase the spacing or make the holes smaller.");
  if (p.trayClearance < 0.3) warn("Tray clearance under 0.3 mm may rub on the walls; a drawer does not need a tight fit.");
  if (p.keyClearance < 0.1) warn("Key clearance under 0.1 mm will be hard to slide in over the full depth. Print the key fit test first.");
  return issues;
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.severity === "error");
