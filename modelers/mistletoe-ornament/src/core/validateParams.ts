import { MAX_NAME_LENGTH, type OrnamentParams } from "./params";
import type { Issue } from "./types";
import { missingCharacters } from "../shared/textShapes";

/** Rules checked before any geometry is built. */
export function validateParams(p: OrnamentParams): Issue[] {
  const issues: Issue[] = [];
  const name = p.name.trim();
  if (p.tag && name.length === 0) issues.push({ severity: "info", message: "No name yet: the tag is left off. Type a name to add it." });
  if (name.length > MAX_NAME_LENGTH) issues.push({ severity: "error", message: `The name is too long (${name.length} letters, at most ${MAX_NAME_LENGTH}).` });
  const missing = missingCharacters(name, p.font);
  if (missing.length) issues.push({ severity: "error", message: `The font has no shape for: ${missing.join(" ")}. Try another font or remove them.` });
  if (p.holeDiameter > 5 && p.size < 60) issues.push({ severity: "warning", message: "A big hole on a small ornament leaves a thin ring. Shrink the hole or enlarge the ornament." });
  return issues;
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.severity === "error");
