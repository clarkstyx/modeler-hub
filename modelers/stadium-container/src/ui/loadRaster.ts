import type { Artwork } from "../core/types";
import { rasterToArtwork } from "../image/raster";

/** Longest side the logo is worked at: enough for a sign a few centimetres wide, few enough edges to stay quick. */
export const RASTER_SIZE = 200;

/**
 * Decodes a PNG, JPG, WebP or GIF in the browser, downsizes it, and turns it
 * into filled colour layers like an SVG. HEIC and other formats the browser
 * cannot decode are reported.
 */
export async function parseRasterArtwork(file: File, maxColours: number): Promise<Artwork> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`Could not read "${file.name}". Export the logo as PNG, JPG or SVG and try again.`);
  }
  const scale = Math.min(1, RASTER_SIZE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale)), h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const img = ctx.getImageData(0, 0, w, h);
  return rasterToArtwork({ width: w, height: h, data: img.data }, file.name, { maxColours });
}
