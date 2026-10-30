// Writes fresh Instagram numbers into index.html, formatted exactly like the kit, and compares
// them with the last refresh. It never changes the starting rate: Hemansu decides that
// (tools/set-rate.js). It only updates the "works out to" line under the rate.
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
// Every run is saved to tools/history.json so the next refresh can compare against it.
const fs = require('fs');
const path = require('path');
const { num, readPrice, writePrice } = require('./kit-rate');

const file = path.resolve(__dirname, '..', 'index.html');
const historyFile = path.resolve(__dirname, 'history.json');
const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const dry = process.argv.includes('--dry');
let html = fs.readFileSync(file, 'utf8');
const changes = [];

function need(cond, msg) { if (!cond) { console.error('STOP: ' + msg); process.exit(2); } }
const trim1 = (n) => n.toFixed(1).replace(/\.0$/, '');
function shortK(n) { return n >= 1e6 ? trim1(n / 1e6) + 'M' : Math.round(n / 1e3) + 'K'; }
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

setRow('Followers', trim1(input.followers / 1e3) + 'K');
setRow('Views, last 30 days', input.views30 >= 1e6 ? trim1(input.views30 / 1e6) + 'M' : Math.round(input.views30 / 1e3) + 'K');
setRow('Accounts reached, last 30 days', input.reached30 >= 1e6 ? (input.reached30 / 1e6).toFixed(2) + 'M' : Math.round(input.reached30 / 1e3) + 'K');
setRow('Views from non-followers', input.nonFollowerPct.toFixed(1) + '%');
setRow('Median views, last 10 Reels', shortK(median));
setRow('Engagement, last 10 Reels', (eng * 100).toFixed(1) + '%');

// Dates
const d = new Date(input.date + 'T12:00:00+05:30');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateText = months[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
html = html.replace(/Last refresh [A-Z][a-z]{2} \d{1,2}, \d{4}\./, 'Last refresh ' + dateText + '.');
html = html.replace(/Updated [A-Z][a-z]{2} \d{1,2}, \d{4}\. Refreshed every 10 days\./, 'Updated ' + dateText + '. Refreshed every 10 days.');
changes.push('Refresh date: ' + dateText);

// The rate stays exactly as Hemansu set it; only the line under it is recomputed.
const price = readPrice(html);
html = writePrice(html, price);

// Most loved videos
Object.entries(input.mostLoved || {}).forEach(([label, v]) => {
  const re = new RegExp('(data-label="' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[\\s\\S]*?<div class="reel-meta">)([^<]*)(</div>)');
  const m = html.match(re);
  if (!m || !(v > 0)) return;
  const text = shortK(v) + ' views';
  if (m[2] !== text) changes.push(label.replace('Video: ', '') + ': ' + m[2] + ' -> ' + text);
  html = html.replace(re, '$1' + text + '$3');
});

// Compare with the last refresh
const history = fs.existsSync(historyFile) ? JSON.parse(fs.readFileSync(historyFile, 'utf8')) : [];
// Compare with the newest refresh that's at least 7 days older, so an extra on-demand refresh
// doesn't turn the next scheduled comparison into a 1-day one. Falls back to the newest older refresh.
const daysBack = (d) => (new Date(input.date) - new Date(d)) / 864e5;
const older = history.filter((h) => h.date < input.date);
const prev = older.filter((h) => daysBack(h.date) >= 7).slice(-1)[0] || older.slice(-1)[0];
const entry = { date: input.date, followers: input.followers, views30: input.views30, reached30: input.reached30, nonFollowerPct: input.nonFollowerPct, median: median, engagement: +(eng * 100).toFixed(2), rate: price };
const report = [];
if (prev) {
  const pct = (a, b) => (b > 0 ? ((a - b) / b) * 100 : 0);
  const sign = (x, unit) => {
    const r = unit === 'pts' ? Math.round(x * 10) / 10 : Math.round(x);
    return (r > 0 ? '+' : '') + (r === 0 ? '0' : r.toFixed(unit === 'pts' ? 1 : 0)) + (unit === 'pts' ? ' pts' : '%');
  };
  const pv = pct(input.views30, prev.views30), pm = pct(median, prev.median);
  report.push('Compared with ' + prev.date + ':');
  report.push('Views, 30 days ' + sign(pv) + ', reach ' + sign(pct(input.reached30, prev.reached30)) + ', median views ' + sign(pm) +
    ', engagement ' + sign(eng * 100 - prev.engagement, 'pts') + ', followers ' + sign(pct(input.followers, prev.followers)));
  const score = (pv + pm) / 2;
  const verdict = score >= 15 ? 'Great' : score >= -5 ? 'Good' : 'Bad';
  report.push('Verdict: ' + verdict + ' (views and median views together ' + sign(score) + ')');
  entry.verdict = verdict;
} else {
  report.push('No earlier refresh saved yet, so nothing to compare.');
}
report.push('Rate unchanged at ₹' + price.toLocaleString('en-IN') + ', which now works out to ₹' + (price / num(shortK(median))).toFixed(2) + ' per view.');

if (!dry) {
  fs.writeFileSync(file, html);
  fs.writeFileSync(historyFile, JSON.stringify(history.filter((h) => h.date !== input.date).concat([entry]), null, 2) + '\n');
}
console.log((dry ? 'DRY RUN, nothing written\n' : '') + changes.join('\n') + '\n' + report.join('\n'));
