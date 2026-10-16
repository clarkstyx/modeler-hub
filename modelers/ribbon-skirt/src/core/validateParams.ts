import { derive, ribbonList, type SkirtParams } from "./params";
import type { Issue } from "./types";

/** Parameter-level checks, before any geometry is built. Errors block export. */
export function validateParams(p: SkirtParams): Issue[] {
  const issues: Issue[] = [];
  const d = derive(p);
  const err = (message: string) => issues.push({ severity: "error", message });
  const warn = (message: string) => issues.push({ severity: "warning", message });
  const info = (message: string) => issues.push({ severity: "info", message });
  const minWall = 2 * p.nozzle;

  if (p.wall < minWall) err(`Wall ${p.wall} mm is thinner than two nozzle widths (${minWall} mm).`);
  if (d.topRadius >= d.bottomRadius) err("The waistband is as wide as the hem: make the waist narrower or the hem wider (pleats count from the hem's middle).");
  if (p.bottomDiameter > p.bedSize) err(`The hem (${p.bottomDiameter} mm) is wider than a ${p.bedSize} mm bed.`);
  if (d.totalHeight > p.bedSize) err(`With the loop the ornament is ${d.totalHeight.toFixed(0)} mm tall, taller than the printer.`);
  if (p.height < d.waistHeight + 5) err(`The skirt needs to be taller than its waistband (${d.waistHeight.toFixed(1)} mm) to have room for pleats.`);
  if ((p.loopDiameter - p.loopHole) / 2 < 1.5) err("The loop ring would be thinner than 1.5 mm around its hole. Make the hole smaller or the loop bigger.");
  if (p.loopThickness < minWall) err(`The loop must be at least ${minWall} mm thick.`);
  if (p.loopDiameter > p.topDiameter * 1.5) warn("The loop is much wider than the waistband; it may look top-heavy and needs a good first layer of the waist to hold.");
  const list = ribbonList(p);
  if (!list.length) info("No ribbons: the skirt prints in one colour.");
  if (list.some((h) => h === p.baseColor.toUpperCase())) info("A ribbon is the same colour as the skirt, so it will not show.");
  if (p.ribbonWidth < 3 * p.layerHeight) warn(`Ribbons narrower than three layers (${(3 * p.layerHeight).toFixed(2)} mm) will barely show.`);
  return issues;
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.severity === "error");
