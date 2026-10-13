import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs; the hub's pull script passes --base=/m/box-modeler/.
  base: "./",
  // manifold-3d ships its own WASM loader; pre-bundling breaks its asset URL.
  optimizeDeps: { exclude: ["manifold-3d"] },
  worker: { format: "es" },
  build: { chunkSizeWarningLimit: 1500 },
  server: { port: 5181 },
});
