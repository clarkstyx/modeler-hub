import { zipSync } from "fflate";

// Save a generated file.
//  1. Normal browser (the hub site, npm run dev): a regular <a download>.
//  2. Inside a claude.ai Artifact page the sandbox blocks <a download>, so the
//     file goes through the viewer's `downloads` capability. That only
//     accepts some extensions (zip and json yes, stl and 3mf no), so STL and
//     3MF are wrapped in a .zip there. Same approach as the Jerry Can modeler.

const ARTIFACT_OK_EXT = new Set(["zip", "json", "txt", "csv", "svg", "png", "html", "md"]);

interface Downloads {
  save(req: { filename: string; data: Blob }): Promise<unknown>;
}
type ClaudeWindow = { claude?: { use?: (name: string) => Promise<unknown> } };

let downloadsPromise: Promise<Downloads | null> | null = null;
function artifactDownloads(): Promise<Downloads | null> {
  const use = (window as unknown as ClaudeWindow).claude?.use;
  if (typeof use !== "function") return Promise.resolve(null);
  downloadsPromise ??= (use("downloads") as Promise<Downloads | null>).catch(() => null);
  return downloadsPromise;
}

function browserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Resolves "saved", "browser", or "declined" (the viewer said no in the artifact's prompt). */
export async function downloadBytes(bytes: Uint8Array, filename: string, mime = "application/octet-stream"): Promise<"saved" | "browser" | "declined"> {
  const downloads = await artifactDownloads();
  if (!downloads) {
    browserDownload(new Blob([bytes as BlobPart], { type: mime }), filename);
    return "browser";
  }
  const ext = (filename.split(".").pop() ?? "").toLowerCase();
  const wrap = !ARTIFACT_OK_EXT.has(ext);
  const data = wrap ? zipSync({ [filename]: bytes }, { level: 6 }) : bytes;
  try {
    await downloads.save({ filename: wrap ? `${filename}.zip` : filename, data: new Blob([data as BlobPart]) });
    return "saved";
  } catch (e) {
    if ((e as { code?: string })?.code === "declined") return "declined";
    throw e;
  }
}

export const safeName = (s: string) => (s.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "stadium");
