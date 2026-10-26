// Rebuilds og-ladka-media-kit.pdf from index.html, so the PDF always matches the live numbers.
// Usage (from the repo root): node tools/make-pdf.js <path to Geist woff2 folder>
// The fonts come from the "geist" npm package (npm i geist@1.3.1 -> node_modules/geist/dist/fonts/geist-sans).
// Analytics, tracking and Google Fonts requests are blocked; Geist is loaded from the local files instead.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const fontDir = path.resolve(process.argv[2] || 'node_modules/geist/dist/fonts/geist-sans');
  const weights = { 300: 'Geist-Light', 400: 'Geist-Regular', 500: 'Geist-Medium', 600: 'Geist-SemiBold' };
  const faces = Object.entries(weights).map(([w, f]) => {
    const file = path.join(fontDir, f + '.woff2');
    if (!fs.existsSync(file)) throw new Error('Missing font ' + file);
    const b64 = fs.readFileSync(file).toString('base64');
    return `@font-face{font-family:'Geist';font-weight:${w};font-style:normal;src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
  }).join('\n');

  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith('file://')) return route.continue();
    return route.abort();
  });
  await page.goto('file://' + path.join(root, 'index.html'), { waitUntil: 'load' });
  await page.addStyleTag({ content: faces });
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const out = path.join(root, 'og-ladka-media-kit.pdf');
  await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log('Wrote ' + out);
})().catch((e) => { console.error(e.message); process.exit(1); });
