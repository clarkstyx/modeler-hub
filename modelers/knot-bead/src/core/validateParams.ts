import { PLATE_BORDER, derive, type BeadParams } from "./params";
import type { Issue } from "./types";

/** Overhang the pattern may reach before we warn, and before we refuse. */
export const WARN_DEG = 60;
export const MAX_DEG = 72;

/** Parameter-level checks, before any geometry is built. Errors block export. */
export function validateParams(p: BeadParams): Issue[] {
  const issues: Issue[] = [];
  const d = derive(p);
  const err = (message: string) => issues.push({ severity: "error", message });
  const warn = (message: string) => issues.push({ severity: "warning", message });
  const info = (message: string) => issues.push({ severity: "info", message });
  const minWall = 2 * p.nozzle;

  if (d.minWall < minWall) err(`Only ${d.minWall.toFixed(1)} mm of wall between the bore and the pattern's valleys; it needs ${minWall.toFixed(1)} mm (two nozzle widths). Make the bead wider, the bore smaller or the ridges shallower.`);
  else if (d.minWall < 1.2) warn(`Only ${d.minWall.toFixed(1)} mm of wall at the pattern's valleys; under 1.2 mm a bead can crack on the cord. Make it wider or the ridges shallower.`);
  if (p.boreChamfer > d.minWall / 2) warn("The bore chamfer eats into most of the wall at the ends; a smaller chamfer keeps the ends sturdy.");
  if (p.ridgeDepth < p.layerHeight * 2 && p.ridgeDepth > 0) info("Ridges shallower than two layers will barely show.");
  if (d.overhangDeg > MAX_DEG) err(`The pattern overhangs ${d.overhangDeg.toFixed(0)}° from upright; over ${MAX_DEG}° will not print cleanly without supports. Use a longer pitch or twist, or shallower ridges.`);
  else if (d.overhangDeg > WARN_DEG) warn(`The pattern overhangs ${d.overhangDeg.toFixed(0)}°. It usually prints, but the undersides of the ridges may look rough; a longer pitch or shallower ridges is safer.`);
  if ((p.pattern === "coil" || p.pattern === "snake") && p.height < p.pitch) warn("The bead is shorter than one wrap or link; make it taller or the pitch shorter.");
  if (p.pattern === "coil" && p.pitch < p.ridgeDepth * 2) warn("Coil pitch is tighter than the ridges; they will blur together.");
  if (p.diameter > p.bedSize - 2 * PLATE_BORDER) err("The bead is wider than the bed.");
  if (p.height > p.bedSize) err("The bead is taller than the printer.");
  if (p.bore < 4.2) info("Bore under 4.2 mm: a single strand of 550 paracord is a snug fit; use 8 mm or more for two strands.");
  return issues;
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.severity === "error");
