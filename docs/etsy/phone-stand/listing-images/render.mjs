// Render each <section> of listing.html to a 2000×2000 PNG. RENDER_DEPS=<deps with playwright-core> node render.mjs
import { join, resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const { chromium } = await import(join(resolve(process.env.RENDER_DEPS || '.'), 'node_modules/playwright-core/index.mjs'));
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const p = await b.newPage({ viewport: { width: 2000, height: 2000 } });
await p.goto(pathToFileURL(resolve(process.argv[2] || 'listing.html')).href, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
for (const id of (process.argv[3] || 'i1,i2,i3,i4,i5,i6').split(',')) await (await p.$('#' + id)).screenshot({ path: `${process.argv[4] || ''}${id.replace('i','0')}-listing.png` });
await b.close(); console.log('done');
