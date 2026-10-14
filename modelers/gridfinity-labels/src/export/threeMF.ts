import { strToU8, zipSync, unzipSync, strFromU8 } from "fflate";
import type { Part } from "../core/types";

/**
 * 3MF writer (Core 1.3 + Materials extension), the pattern the other Valencia
 * modelers settled on: one m:colorgroup per distinct colour, one mesh object
 * per part, one components object per printed object (each label), a build
 * item per printed object, and Metadata/model_settings.config so Bambu Studio
 * and OrcaSlicer put every part on its filament slot straight away.
 */

export const NS_CORE = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02";
export const NS_MATERIAL = "http://schemas.microsoft.com/3dmanufacturing/material/2015/02";
export const PROJECT_PATH = "Metadata/gridfinity-labels.json";

export const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function num(v: number): string {
  const s = v.toFixed(7);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") || "0" : s;
}

function meshXml(p: Part): string {
  const P = p.mesh.positions, I = p.mesh.indices;
  const out: string[] = ["<mesh><vertices>"];
  for (let i = 0; i < P.length; i += 3) out.push(`<vertex x="${num(P[i])}" y="${num(P[i + 1])}" z="${num(P[i + 2])}"/>`);
  out.push("</vertices><triangles>");
  for (let t = 0; t < I.length; t += 3) out.push(`<triangle v1="${I[t]}" v2="${I[t + 1]}" v3="${I[t + 2]}"/>`);
  out.push("</triangles></mesh>");
  return out.join("");
}

export interface ThreeMFLayout {
  /** Distinct colours in slot order (index + 1 = suggested filament slot). */
  slots: string[];
  meshes: { id: number; part: Part; slot: number }[];
  objects: { id: number; name: string; meshIds: number[] }[];
}

export function planThreeMF(parts: Part[]): ThreeMFLayout {
  const slots: string[] = [];
  for (const p of parts) { const h = p.hex.toUpperCase(); if (!slots.includes(h)) slots.push(h); }
  let nextId = slots.length + 1;
  const meshes = parts.map((part) => ({ id: nextId++, part, slot: slots.indexOf(part.hex.toUpperCase()) + 1 }));
  const objectNames = [...new Set(parts.map((p) => p.object))];
  const objects = objectNames.map((name) => ({
    id: nextId++,
    name,
    meshIds: meshes.filter((m) => m.part.object === name).map((m) => m.id),
  }));
  return { slots, meshes, objects };
}

export interface ThreeMFOptions {
  title: string;
  /** JSON settings embedded so the file reopens in the app. */
  project?: string;
  bambuMetadata?: boolean;
}

export function buildModelXml(parts: Part[], opts: ThreeMFOptions): string {
  const layout = planThreeMF(parts);
  const xml: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>\n`,
    `<model unit="millimeter" xml:lang="en-US" xmlns="${NS_CORE}" xmlns:m="${NS_MATERIAL}">\n`,
    ` <metadata name="Title">${xmlEscape(opts.title)}</metadata>\n`,
    ` <metadata name="Application">Valencia Modelers gridfinity-labels</metadata>\n`,
    ` <metadata name="CreationDate">${new Date().toISOString().slice(0, 10)}</metadata>\n`,
    ` <resources>\n`,
  ];
  layout.slots.forEach((hex, i) => xml.push(`  <m:colorgroup id="${i + 1}"><m:color color="${hex}FF"/></m:colorgroup>\n`));
  for (const m of layout.meshes)
    xml.push(`  <object id="${m.id}" type="model" name="${xmlEscape(m.part.name)}" pid="${m.slot}" pindex="0">`, meshXml(m.part), `</object>\n`);
  for (const o of layout.objects)
    xml.push(`  <object id="${o.id}" type="model" name="${xmlEscape(o.name)}"><components>`, ...o.meshIds.map((id) => `<component objectid="${id}"/>`), `</components></object>\n`);
  xml.push(` </resources>\n <build>\n`, ...layout.objects.map((o) => `  <item objectid="${o.id}"/>\n`), ` </build>\n</model>\n`);
  return xml.join("");
}

/** Bambu Studio / OrcaSlicer per-part filament slots. Only a hint; the user still maps slots to AMS filaments. */
export function buildModelSettings(parts: Part[]): string {
  const layout = planThreeMF(parts);
  const lines = [`<?xml version="1.0" encoding="UTF-8"?>`, `<config>`];
  for (const o of layout.objects) {
    lines.push(`  <object id="${o.id}">`, `    <metadata key="name" value="${xmlEscape(o.name)}"/>`, `    <metadata key="extruder" value="1"/>`);
    for (const id of o.meshIds) {
      const m = layout.meshes.find((x) => x.id === id)!;
      lines.push(`    <part id="${id}" subtype="normal_part">`, `      <metadata key="name" value="${xmlEscape(m.part.name)}"/>`, `      <metadata key="extruder" value="${m.slot}"/>`, `    </part>`);
    }
    lines.push(`  </object>`);
  }
  lines.push(`</config>`, ``);
  return lines.join("\n");
}

export function buildThreeMF(parts: Part[], opts: ThreeMFOptions): Uint8Array {
  if (!parts.length) throw new Error("Nothing to export.");
  const files: Record<string, Uint8Array> = {};
  files["[Content_Types].xml"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>` +
      `<Default Extension="config" ContentType="text/xml"/>` +
      `<Default Extension="json" ContentType="application/json"/></Types>\n`,
  );
  files["_rels/.rels"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>\n`,
  );
  files["3D/3dmodel.model"] = strToU8(buildModelXml(parts, opts));
  if (opts.bambuMetadata !== false) files["Metadata/model_settings.config"] = strToU8(buildModelSettings(parts));
  if (opts.project) files[PROJECT_PATH] = strToU8(opts.project);
  return zipSync(files, { level: 6 });
}

/** Reads the embedded settings back out of a 3MF made by this app. */
export function readProjectFrom3MF(bytes: Uint8Array): string | null {
  const files = unzipSync(bytes);
  const f = files[PROJECT_PATH];
  return f ? strFromU8(f) : null;
}
