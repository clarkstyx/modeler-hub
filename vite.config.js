import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// The hub itself is a few static pages. Built modelers live in public/m/<id>/
// (produced by `npm run pull`) and are copied through untouched.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        pricing: resolve(__dirname, 'pricing/index.html'),
        login: resolve(__dirname, 'login/index.html'),
      },
    },
  },
});
