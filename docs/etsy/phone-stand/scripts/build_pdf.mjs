// Print an HTML guide (fixed-size <section class="page"> pages) to PDF with Chromium, failing
// loudly if any page's content runs into the footer. Text stays selectable; fonts are embedded.
//
// Deps: npm i --prefix <deps> playwright-core@1.56.1
// Usage: RENDER_DEPS=<deps> node build_pdf.mjs guide.html out.pdf [--footer-in 0.5]
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const deps = resolve(process.env.RENDER_DEPS || '.');
const { chromium } = await import(join(deps, 'node_modules/playwright-core/index.mjs'));
const [html, out] = process.argv.slice(2);
const fi = process.argv.indexOf('--footer-in');
const footerIn = fi > 0 ? +process.argv[fi + 1] : 0.5;
const exe = process.env.CHROMIUM_PATH || (() => { const b = '/opt/pw-browsers';
  const d = existsSync(b) && readdirSync(b).find((x) => /^chromium-\d+$/.test(x)); return d ? join(b, d, 'chrome-linux/chrome') : undefined; })();

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage();
await page.goto(pathToFileURL(resolve(html)).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const problems = await page.$$eval('section.page', (pages, footerIn) => pages.flatMap((p, i) => {
  const limit = p.getBoundingClientRect().bottom - footerIn * 96;
  const over = [...p.querySelectorAll('*')].filter((el) => !el.closest('.folio') && el.getBoundingClientRect().bottom > limit + 1);
  const broken = [...p.querySelectorAll('img')].filter((im) => !im.complete || im.naturalWidth === 0).map((im) => `page ${i + 1}: image not found ${im.getAttribute('src')}`);
  return [...broken, ...over.slice(0, 2).map((el) => `page ${i + 1}: <${el.tagName.toLowerCase()} class="${el.className}"> overflows by ${Math.round(el.getBoundingClientRect().bottom - limit)}px`)];
}), footerIn);
await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
await browser.close();
if (problems.length) { console.error(problems.join('\n')); console.error('PDF written, but fix the problems above'); process.exit(1); }
console.log('PDF written:', out);
