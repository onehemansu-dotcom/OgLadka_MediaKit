// Saves a PDF copy of a brand kit exactly as the brand sees it on the day it's sent, as proof of
// the quote. The PDF goes to that quote's row in Notion (Quotes Sent); it never goes in this repo.
// Usage (from the repo root):
//   node tools/snapshot-kit.js <spec.json> <out.pdf> <Geist woff2 folder> "<note shown at the top>"
// The fonts come from the "geist" npm package (npm i geist@1.3.1 -> node_modules/geist/dist/fonts/geist-sans).
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

(async () => {
  const [specFile, outFile, fontArg, note] = process.argv.slice(2);
  if (!specFile || !outFile) throw new Error('usage: snapshot-kit.js <spec.json> <out.pdf> <font folder> "<note>"');
  const root = path.resolve(__dirname, '..');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-snap-'));
  execFileSync('node', [path.join(__dirname, 'make-brand-kit.js'), specFile, '--preview', dir], { stdio: 'ignore' });

  const fontDir = path.resolve(fontArg || 'node_modules/geist/dist/fonts/geist-sans');
  const weights = { 300: 'Geist-Light', 400: 'Geist-Regular', 500: 'Geist-Medium', 600: 'Geist-SemiBold' };
  const faces = Object.entries(weights).map(([w, f]) => {
    const file = path.join(fontDir, f + '.woff2');
    if (!fs.existsSync(file)) throw new Error('Missing font ' + file);
    return `@font-face{font-family:'Geist';font-weight:${w};font-style:normal;src:url(data:font/woff2;base64,${fs.readFileSync(file).toString('base64')}) format('woff2')}`;
  }).join('\n');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
  await page.route('**/*', (r) => (r.request().url().startsWith('file://') ? r.continue() : r.abort()));
  await page.emulateMedia({ media: 'screen', colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('file://' + path.join(dir, 'index.html'), { waitUntil: 'load' });
  await page.addStyleTag({ content: faces + '\n.snap-note{max-width:560px;margin:0 auto;padding:14px 16px 0;font:12px/1.5 Geist,system-ui,sans-serif;color:#616161}' });
  await page.waitForSelector('.deal-price', { timeout: 10000 });
  await page.evaluate(() => { const l = document.getElementById('og-loader'); if (l) l.remove(); document.documentElement.classList.remove('is-loading'); });
  if (note) {
    await page.evaluate((t) => {
      const d = document.createElement('div');
      d.className = 'snap-note';
      d.textContent = t;
      document.body.insertBefore(d, document.body.firstChild);
    }, note);
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const height = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
  await page.pdf({ path: outFile, width: '390px', height: height + 'px', printBackground: true, pageRanges: '1' });
  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('Wrote ' + outFile + ' (' + height + 'px tall)');
})().catch((e) => { console.error(e.message); process.exit(1); });
