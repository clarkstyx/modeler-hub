import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

// Built modelers live in public/m/<id>/ (made by `npm run pull`). Vite's dev
// server does not open public/m/<id>/index.html for /m/<id>/ on its own, it
// shows the hub home page instead. This opens the modeler, and says how to
// build it when it is missing. Cloudflare Pages does this by itself.
function serveBuiltModelers() {
  const handler = (req, res, next) => {
    const path = decodeURIComponent((req.url || '').split('?')[0]);
    const m = path.match(/^\/m\/([^/]+)(\/(index\.html)?)?$/);
    if (!m) return next();
    const id = m[1];
    if (!m[2]) {
      res.statusCode = 302;
      res.setHeader('Location', `/m/${id}/`);
      return res.end();
    }
    const file = resolve(__dirname, 'public', 'm', id, 'index.html');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (existsSync(file)) return res.end(readFileSync(file));
    res.statusCode = 404;
    res.end(`<!doctype html><meta charset="utf-8"><title>Not built yet</title>
<body style="font:16px system-ui;background:#16181d;color:#eee;padding:40px">
<h1>${id.replace(/[^\w-]/g, '')} is not built yet</h1>
<p>Run this in the modeler-hub folder, then reload:</p>
<pre style="background:#000;padding:12px;border-radius:6px">npm run pull ${id.replace(/[^\w-]/g, '')}</pre>
<p><a style="color:#f5b041" href="/">Back to all modelers</a></p></body>`);
  };
  return {
    name: 'serve-built-modelers',
    configureServer(server) { server.middlewares.use(handler); },
  };
}

// The hub itself is a few static pages. Built modelers are copied through untouched.
export default defineConfig({
  plugins: [serveBuiltModelers()],
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
