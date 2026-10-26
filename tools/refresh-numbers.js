// Writes fresh Instagram numbers into index.html, formatted exactly like the kit, and moves the rate.
// Usage (from the repo root): node tools/refresh-numbers.js numbers.json [--dry]
// numbers.json:
// {
//   "date": "2026-11-01",                 // refresh day, India time
//   "followers": 71317,                    // total followers
//   "views30": 1716567,                    // Views, last 30 days
//   "reached30": 1077201,                  // Viewers (accounts reached), last 30 days
//   "nonFollowerPct": 93.2,                // % of views from non-followers
//   "last10": [{"views": 258000, "interactions": 12000}, ...],   // 10 most recent non-pinned Reels
//   "mostLoved": {"Video: Matte Paint Care": 2750000, ...}        // optional, keyed by data-label
// }
// Rate rule (same as app.js): median views x data-cpv, kept within 5% of the last published price,
// rounded to the nearest 500 minus 1. data-prev becomes the price that was live before this refresh.
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'index.html');
const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const dry = process.argv.includes('--dry');
let html = fs.readFileSync(file, 'utf8');
const changes = [];

function need(cond, msg) { if (!cond) { console.error('STOP: ' + msg); process.exit(2); } }
const trim1 = (n) => n.toFixed(1).replace(/\.0$/, '');
function shortK(n) { return n >= 1e6 ? trim1(n / 1e6) + 'M' : Math.round(n / 1e3) + 'K'; }
function num(text) {
  const m = String(text).trim().match(/^([\d.]+)\s*([KM%]?)$/i);
  if (!m) return NaN;
  const n = parseFloat(m[1]), s = m[2].toUpperCase();
  return s === 'K' ? n * 1e3 : s === 'M' ? n * 1e6 : s === '%' ? n / 100 : n;
}
function priceFor(median, cpv, prev) {
  let raw = median * cpv;
  if (prev > 0) raw = Math.max(prev * 0.95, Math.min(prev * 1.05, raw));
  return Math.round(raw / 500) * 500 - 1;
}
function setRow(label, value) {
  const re = new RegExp('(<span>' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</span><span class="v"[^>]*>)([^<]*)(</span>)');
  const m = html.match(re);
  need(m, 'row not found: ' + label);
  if (m[2] !== value) changes.push(label + ': ' + m[2] + ' -> ' + value);
  html = html.replace(re, '$1' + value + '$3');
}

// Checks before touching anything
need(input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date), 'date missing');
need(input.followers > 1000, 'followers missing');
need(input.views30 > 0 && input.reached30 > 0, 'views or reach missing');
need(input.nonFollowerPct > 0 && input.nonFollowerPct <= 100, 'non-follower % missing');
need(Array.isArray(input.last10) && input.last10.length === 10, 'need exactly 10 Reels');
input.last10.forEach((r, i) => need(r.views > 0 && r.interactions >= 0, 'Reel ' + (i + 1) + ' incomplete'));

const oldFollowers = num(html.match(/<span>Followers<\/span><span class="v">([^<]*)</)[1]);
need(Math.abs(input.followers - oldFollowers) / oldFollowers < 0.2, 'followers moved more than 20%, check by hand');

// Numbers
const views = input.last10.map((r) => r.views).sort((a, b) => a - b);
const median = (views[4] + views[5]) / 2;
const eng = input.last10.reduce((s, r) => s + r.interactions, 0) / input.last10.reduce((s, r) => s + r.views, 0);
const medianText = shortK(median);
const engText = (eng * 100).toFixed(1) + '%';

setRow('Followers', trim1(input.followers / 1e3) + 'K');
setRow('Views, last 30 days', input.views30 >= 1e6 ? trim1(input.views30 / 1e6) + 'M' : Math.round(input.views30 / 1e3) + 'K');
setRow('Accounts reached, last 30 days', input.reached30 >= 1e6 ? (input.reached30 / 1e6).toFixed(2) + 'M' : Math.round(input.reached30 / 1e3) + 'K');
setRow('Views from non-followers', input.nonFollowerPct.toFixed(1) + '%');
setRow('Median views, last 10 Reels', medianText);
setRow('Engagement, last 10 Reels', engText);

// Dates
const d = new Date(input.date + 'T12:00:00+05:30');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateText = months[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
html = html.replace(/Last refresh [A-Z][a-z]{2} \d{1,2}, \d{4}\./, 'Last refresh ' + dateText + '.');
html = html.replace(/Updated [A-Z][a-z]{2} \d{1,2}, \d{4}\. Refreshed every 10 days\./, 'Updated ' + dateText + '. Refreshed every 10 days.');
changes.push('Refresh date: ' + dateText);

// Rate
const pm = html.match(/<span class="price" id="reelPrice" data-cpv="([\d.]+)" data-prev="(\d+)">from ₹([\d,]+)<\/span>/);
need(pm, 'price element not found');
const cpv = parseFloat(pm[1]);
const oldMedian = num(html.match(/id="medianViews">([^<]*)</)[1]);
const livePrice = parseInt(pm[3].replace(/,/g, ''), 10);
const newPrice = priceFor(num(medianText), cpv, livePrice);
html = html.replace(pm[0], '<span class="price" id="reelPrice" data-cpv="' + pm[1] + '" data-prev="' + livePrice + '">from ₹' + newPrice.toLocaleString('en-IN') + '</span>');
const medianN = num(medianText), engN = num(engText);
const mathText = 'Based on ' + medianText + ' median views across my last 10 Reels. Works out to ₹' + (newPrice / medianN).toFixed(2) + ' per view and ₹' + (newPrice / (medianN * engN)).toFixed(2) + ' per engagement.';
html = html.replace(/(<p class="honest" id="rateMath">)[^<]*(<\/p>)/, '$1' + mathText + '$2');
if (newPrice !== livePrice) changes.push('Starting rate: ₹' + livePrice.toLocaleString('en-IN') + ' -> ₹' + newPrice.toLocaleString('en-IN'));
void oldMedian;

// Most loved videos
Object.entries(input.mostLoved || {}).forEach(([label, v]) => {
  const re = new RegExp('(data-label="' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[\\s\\S]*?<div class="reel-meta">)([^<]*)(</div>)');
  const m = html.match(re);
  if (!m || !(v > 0)) return;
  const text = shortK(v) + ' views';
  if (m[2] !== text) changes.push(label.replace('Video: ', '') + ': ' + m[2] + ' -> ' + text);
  html = html.replace(re, '$1' + text + '$3');
});

if (!dry) fs.writeFileSync(file, html);
console.log((dry ? 'DRY RUN, nothing written\n' : '') + changes.join('\n'));
