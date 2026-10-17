import { buildThreeMF as build, readProjectFrom3MF as read, type ThreeMFOptions } from "../shared/threeMF";
import type { Part } from "../core/types";

/** This app's id: names the settings file embedded in every 3MF (Metadata/knot-bead.json). */
export const APP_ID = "knot-bead";

export const buildThreeMF = (parts: Part[], opts: Omit<ThreeMFOptions, "app">) => build(parts, { ...opts, app: APP_ID });
export const readProjectFrom3MF = (bytes: Uint8Array) => read(bytes, APP_ID);
