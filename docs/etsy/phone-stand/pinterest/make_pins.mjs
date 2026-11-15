// Render every <div class="pin" id="..."> in a pins HTML file to <outdir>/pin-N.png at 1000x1500.
// Deps: npm i --prefix <deps> playwright-core@1.56.1
// Usage: RENDER_DEPS=<deps> node make_pins.mjs pins.html <outdir>
import { existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const deps = resolve(process.env.RENDER_DEPS || '.');
const { chromium } = await import(join(deps, 'node_modules/playwright-core/index.mjs'));
const [html, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const exe = process.env.CHROMIUM_PATH || (() => { const b = '/opt/pw-browsers';
  const d = existsSync(b) && readdirSync(b).find((x) => /^chromium-\d+$/.test(x)); return d ? join(b, d, 'chrome-linux/chrome') : undefined; })();
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1000, height: 1500 } });
await page.goto(pathToFileURL(resolve(html)).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const ids = await page.$$eval('.pin', (els) => els.map((e) => e.id));
for (const [i, id] of ids.entries()) {
  await page.evaluate((id) => document.querySelectorAll('.pin').forEach((e) => { e.style.display = e.id === id ? 'block' : 'none'; }), id);
  await page.locator('#' + id).screenshot({ path: join(outDir, `pin-${i + 1}.png`) });
}
await browser.close();
console.log('wrote', ids.length, 'pins to', outDir);
