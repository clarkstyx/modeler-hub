import { TARGETS, derive, type StadiumParams } from "./params";
import type { Issue } from "./types";

/** Rules checked before any geometry is built. Errors block export; infos explain automatic raises. */
export function validateParams(p: StadiumParams): Issue[] {
  const issues: Issue[] = [];
  const err = (message: string) => issues.push({ severity: "error", message });
  const warn = (message: string) => issues.push({ severity: "warning", message });
  const info = (message: string) => issues.push({ severity: "info", message });
  const d = derive(p);
  const twoNozzles = 2 * p.nozzle;
  if (p.wall < twoNozzles - 1e-9) err(`The rim must be at least two nozzle widths (${twoNozzles.toFixed(2)} mm).`);
  if (p.wallThickness < twoNozzles - 1e-9) err(`The exterior wall must be at least two nozzle widths (${twoNozzles.toFixed(2)} mm).`);
  if (p.floor < 3 * p.layerHeight - 1e-9) err(`The floor must be at least three layers (${(3 * p.layerHeight).toFixed(2)} mm).`);
  if (p.baseThickness < 3 * p.layerHeight - 1e-9) err(`The base must be at least three layers (${(3 * p.layerHeight).toFixed(2)} mm).`);
  if (p.wallThickness < TARGETS.wall - 1e-9) warn(`Exterior wall ${p.wallThickness} mm is under the ${TARGETS.wall} mm design target.`);
  if (p.floor < TARGETS.floor - 1e-9) warn(`Floor ${p.floor} mm is under the ${TARGETS.floor} mm design target.`);
  if (p.baseThickness < TARGETS.floor - 1e-9) warn(`Base ${p.baseThickness} mm is under the ${TARGETS.floor} mm design target.`);
  if (p.rowRise < 2 * p.layerHeight - 1e-9) err(`Each row must rise at least two layers (${(2 * p.layerHeight).toFixed(2)} mm).`);
  if (p.aisleWidth > p.rowTread * 2) warn("Aisles wider than two rows deep look like gaps rather than stairs.");
  if (d.wallHeight > p.wallHeight + 1e-9) info(`Exterior wall raised to ${d.wallHeight.toFixed(1)} mm so it reaches the top row (${d.zSeatTop.toFixed(1)} mm).`);
  if (d.wallThickness > p.wallThickness + 1e-9) info(`Exterior wall thickened to ${d.wallThickness.toFixed(1)} mm so the floodlight legs fit into its top.`);
  if (p.lights === "attached" && d.lightHeight > 35) warn(`${d.lightHeight.toFixed(0)} mm towers printed standing on the wall are wobbly to print and snap along the layers; "Separate parts" prints them lying flat.`);
  if (d.footprint > p.bedSize + 1e-9) err(`The stadium is ${d.footprint.toFixed(0)} mm across and does not fit a ${p.bedSize} mm bed. Fewer rows, a smaller container, a narrower base margin or a shorter front terrace shrink it.`);
  if (d.height > 250 && p.lights === "attached") warn(`${d.height.toFixed(0)} mm tall with the lights attached; check your printer's height.`);
  const colours = new Set([p.colorStructure, p.colorFacade, p.colorAccent, p.colorSign].map((c) => c.toUpperCase()));
  if (colours.size < 4) info(`${colours.size} distinct colour${colours.size === 1 ? "" : "s"}: parts sharing a colour land on the same filament slot.`);
  return issues;
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.severity === "error");
