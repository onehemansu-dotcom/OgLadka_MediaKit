// Builds one brand's own media kit page: about two phone screens with the numbers, the brand's
// relevant partnerships and originals, what the Reel works out to, and only what they asked for.
// The page never says it was made for them. The repo is public, so the details are encrypted
// inside the page; the key goes in the link after the #, and only someone with the link can read it.
//
// Usage (from the repo root):
//   node tools/make-brand-kit.js spec.json                 new kit, prints the link to send
//   node tools/make-brand-kit.js spec.json --id X --key Y  rebuilds an existing kit at the same link
//   node tools/make-brand-kit.js spec.json --preview DIR   unencrypted, no tracking, for a preview only
//
// spec.json (never commit it: it holds the quote in plain text; keep it in the lead's Notion page):
// {
//   "brand": "Acme Lubes",              board name in Brand Leads; the tracking slug comes from it
//   "category": "care",                 care | insurance | auto (picks default videos and benchmarks)
//   "date": "2026-11-16",
//   "pitch": "Two lines on how this helps them, in OG Ladka's voice. Never echo their own words.",
//   "partnerships": ["car101"],         optional, branded work that fits them ([] for none)
//   "originals": ["matte", "iridium", "wrap"],   optional, exactly 3
//   "reel": 24999,                      reel price from the rate card
//   "reelDesc": "...",                  optional
//   "items": [ {"key": "story", "qty": 2}, {"key": "adrights"},           only what they asked for
//              {"title": "Amazon review", "note": "Product cost"}, {"title": "Other", "price": 4999} ],
//   "notOffered": [ {"title": "DM automation"} ]
// }
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://onehemansu-dotcom.github.io/OgLadka_MediaKit/';

// Originals: made independently. Views come from numbers.json (label) on every refresh.
const ORIGINALS = {
  matte:     { label: 'Video: Matte Paint Care', title: 'Matte paint care', img: 'reel-matte.webp', href: 'https://www.instagram.com/ogladkaa/reel/DVObL38CSEV/' },
  iridium:   { label: 'Video: Iridium Spark Plug', title: 'Iridium spark plug?', img: 'reel-iridium.webp', href: 'https://www.instagram.com/ogladkaa/reel/Da3FWCEpRuM/' },
  gear:      { label: 'Video: Gear Shifting Guide', title: 'Gear shifting guide', img: 'reel-gear.webp', href: 'https://www.instagram.com/ogladkaa/reel/DWRpaDoNwxY/' },
  engine:    { label: 'Video: Engine Braking Explained', title: 'Engine braking explained', img: 'reel-engine-braking.webp', href: 'https://www.instagram.com/ogladkaa/reel/DUyRCN9Es59/' },
  insurance: { label: 'Video: Insurance Rejected', title: 'Insurance rejected', img: 'reel-insurance.webp', href: 'https://www.instagram.com/ogladkaa/reel/DcObLzBJJzY/' },
  wrap:      { label: 'Video: How to Legally Wrap a Bike', title: 'How to legally wrap a bike', img: 'reel-wrap.webp', href: 'https://www.instagram.com/ogladkaa/reel/DVlsLxeCf6Q/' }
};
// Brand partnerships. views: fill in when known (numbers.json "partnerViews" overrides by key).
const PARTNERSHIPS = {
  ktm:     { title: 'KTM', sub: '160 Duke and RC launch', img: 'collab-ktm.webp', badge: 'brand-ktm.webp', href: 'https://www.instagram.com/reel/DTuy4o8Cfy8/' },
  triumph: { title: 'Triumph', sub: '400cc range launch', img: 'collab-triumph.webp', badge: 'brand-triumph.webp', href: 'https://www.instagram.com/reel/DLb-AX2pDCp/' },
  re:      { title: 'Royal Enfield', sub: 'Guerrilla 450 first ride', img: 'collab-re.webp', badge: 'brand-royalenfield.webp', href: 'https://www.instagram.com/reel/DcgdTK8hUYI/' },
  car101:  { title: 'Car101', sub: 'Tyre polish', img: 'collab-car101.webp', badge: 'brand-car101.webp', href: 'https://www.instagram.com/reel/DdMNz_6pp-P/' }
};

// Priced as a share of this brand's Reel (Hemansu's rate card, Mon, 16 Nov 2026). Only what they ask for goes on the kit.
const ADDONS = {
  story:       { title: 'Instagram story', plural: 'Instagram stories', pct: 0.15 },
  adrights:    { title: 'Ad rights, 30 days', pct: 0.30 },
  partnership: { title: 'Partnership ads, 30 days', pct: 0.30 },
  usage:       { title: 'Usage rights, 30 days', pct: 0.25 },
  excl30:      { title: 'Exclusivity, 30 days', pct: 0.30 },
  excl90:      { title: 'Exclusivity, 90 days', pct: 0.50 },
  shorts:      { title: 'YouTube Shorts repost', pct: 0.15 },
  linkbio:     { title: 'Link in bio, 7 days', pct: 0.10 },
  rush:        { title: 'Rush delivery, under 48 hours', pct: 0.25 },
  revision:    { title: 'Extra edit round', flat: 5999 },
  eventHalf:   { title: 'Event coverage, half day', pct: 0.40, desc: 'Travel and stay outside Bangalore at actuals.' },
  eventFull:   { title: 'Event coverage, full day', pct: 0.75, desc: 'Travel and stay outside Bangalore at actuals.' }
};

// What a brand would otherwise pay, per 1,000 views. Sources (checked Mon, 16 Nov 2026):
//  creator rate: Kofluence 2025 report (micro creators about Rs 100-150 per 1,000 views), upGrowth 2026
//    (creators fair up to 1.5x paid video views at Rs 25-180), finance creators 60-120% more (upGrowth 2026)
//  ads: upGrowth 2026, Instagram Reels ads Rs 45-140 per 1,000, fintech Rs 200-400 per 1,000
//  production: Boss Wallah 2026, agency shoot day from Rs 40,000 plus edit from Rs 10,000
const GENERAL_NOTE = 'Typical creator rate: about ₹150 per 1,000 views in India (Kofluence 2025, upGrowth 2026). Doing it yourself: an agency shoot and edit from ₹50,000 (Boss Wallah 2026) plus Instagram Reels ads from ₹45 per 1,000 views (upGrowth 2026).';
const BENCH = {
  care:      { creatorPer1k: 150, adPer1k: 45, productionFrom: 50000, note: GENERAL_NOTE },
  auto:      { creatorPer1k: 150, adPer1k: 45, productionFrom: 50000, note: GENERAL_NOTE },
  insurance: { creatorPer1k: 240, adPer1k: 200, productionFrom: 50000,
    note: 'Typical creator rate: finance creators charge 60 to 120% more than the ₹150 per 1,000 views most Indian creators get (upGrowth 2026, Kofluence 2025). Doing it yourself: an agency shoot and edit from ₹50,000 (Boss Wallah 2026) plus fintech ads on Instagram from ₹200 per 1,000 views (upGrowth 2026).' }
};
const DEFAULTS = {
  care:      { partnerships: ['car101'], originals: ['matte', 'iridium', 'wrap'] },
  auto:      { partnerships: ['ktm', 'triumph', 're'], originals: ['gear', 'engine', 'wrap'] },
  insurance: { partnerships: [], originals: ['insurance', 'wrap', 'engine'] }
};

// Prices end in 9, like the rate card: 5,999.70 becomes 5,999.
const r9 = (x) => Math.max(99, Math.round(x / 50) * 50 - 1);

function stop(msg) { console.error('STOP: ' + msg); process.exit(2); }
function arg(name) { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; }
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const spec = JSON.parse(fs.readFileSync(process.argv[2] || stop('give the spec file'), 'utf8'));
const cat = DEFAULTS[spec.category] || stop('category must be care, insurance or auto');
if (!spec.brand || !spec.pitch) stop('brand and pitch are needed');
if (!(spec.reel >= 1000)) stop('reel price missing');
if (!/^\d{4}-\d{2}-\d{2}$/.test(spec.date || '')) stop('date like 2026-11-16 needed');

const numbers = JSON.parse(fs.readFileSync(path.join(ROOT, 'numbers.json'), 'utf8'));
const slug = spec.brand.toLowerCase().replace(/[^a-z0-9]/g, '');

const items = (spec.items || []).map((it) => {
  if (it.key) {
    const a = ADDONS[it.key] || stop('unknown item key ' + it.key);
    const qty = it.qty > 1 ? it.qty : 1;
    const price = it.price > 0 ? it.price : (a.flat ? a.flat * qty : r9(spec.reel * a.pct * qty));
    const title = it.title || (qty > 1 ? qty + ' ' + (a.plural || a.title) : a.title);
    return { title: title, desc: it.desc || a.desc || '', price: price };
  }
  if (!it.title) stop('every item needs a key or a title');
  return { title: it.title, desc: it.desc || '', price: it.price > 0 ? it.price : 0, note: it.note || '' };
});

const partnerViews = numbers.partnerViews || {};
const partnerships = (spec.partnerships || cat.partnerships).map((k) => {
  const p = PARTNERSHIPS[k] || stop('unknown partnership ' + k);
  return Object.assign({}, p, { views: partnerViews[k] || 0 });
});
const originals = (spec.originals || cat.originals).map((k) => ORIGINALS[k] || stop('unknown original ' + k));
if (originals.length !== 3) stop('pick exactly 3 originals');
if (partnerships.length > 3) stop('3 partnerships at most');
const work = partnerships.concat(originals);

const payload = {
  v: 2,
  slug: slug,
  category: spec.category,
  date: spec.date,
  pitch: spec.pitch,
  partnerships: partnerships,
  originals: originals,
  reel: { title: 'Integrated Reel', desc: spec.reelDesc || 'Collab post on Instagram, up to 60 seconds.', price: spec.reel },
  items: items,
  notOffered: spec.notOffered || [],
  bench: BENCH[spec.category],
  numbers: numbers
};

function shell(opts) {
  const analytics = opts.preview ? '' : `<script async src="https://www.googletagmanager.com/gtag/js?id=G-GYS2RWZJ4T"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-GYS2RWZJ4T', { send_page_view: true, content_group: 'Brand Kit', page_location: location.origin + location.pathname });
</script>
<script>
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window,document,"clarity","script","xbnj8ij4lf");
  clarity("set", "site_section", "Brand Kit");
</script>
`;
  const css = opts.preview
    ? '<style>\n' + fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'k', 'kit.css'), 'utf8') + '\n</style>'
    : '<link rel="stylesheet" href="../../style.css" />\n<link rel="stylesheet" href="../kit.css" />';
  const js = opts.preview
    ? '<script>window.KIT_IMG = "images/";</script>\n<script>\n' + fs.readFileSync(path.join(ROOT, 'k', 'kit.js'), 'utf8') + '\n</script>'
    : '<script src="../kit.js"></script>';
  const icons = opts.preview ? '' : '<link rel="icon" href="../../favicon.ico" sizes="any" />\n<link rel="icon" href="../../favicon.svg" type="image/svg+xml" />\n<link rel="apple-touch-icon" href="../../apple-touch-icon.png" />\n';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="robots" content="noindex, nofollow" />
<meta name="referrer" content="no-referrer" />
<title>OG Ladka media kit</title>
<meta name="theme-color" content="#F4F4F4" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
<meta name="color-scheme" content="light dark" />
<meta property="og:type" content="website" />
<meta property="og:title" content="OG Ladka media kit" />
<meta property="og:description" content="Numbers, brand partnerships, originals and commercials." />
<meta property="og:image" content="${SITE}og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap" rel="stylesheet" />
${icons}${css}
${analytics}</head>
<body>
<main id="kit" class="single kit">
  <section class="kit-state"><p>Loading.</p></section>
</main>
<noscript><p style="padding:24px">This page needs JavaScript. Call +91 76763 37153.</p></noscript>
<script id="kit-data" type="application/octet-stream"${opts.preview ? ' data-plain="1"' : ''}>${opts.data}</script>
${js}
</body>
</html>
`;
}

const previewDir = arg('--preview');
if (previewDir) {
  fs.mkdirSync(path.join(previewDir, 'images'), { recursive: true });
  work.forEach((w) => [w.img, w.badge].filter(Boolean).forEach((f) => fs.copyFileSync(path.join(ROOT, 'images', f), path.join(previewDir, 'images', f))));
  const data = JSON.stringify(payload).replace(/</g, '\\u003c');
  fs.writeFileSync(path.join(previewDir, 'index.html'), shell({ preview: true, data: data }));
  console.log('Preview written to ' + path.join(previewDir, 'index.html') + ' (not encrypted, no tracking).');
  process.exit(0);
}

const id = arg('--id') || crypto.randomBytes(6).toString('hex').slice(0, 10);
if (!/^[a-z0-9]{6,16}$/.test(id)) stop('bad --id');
const keyText = arg('--key') || b64url(crypto.randomBytes(16));
const key = Buffer.from(keyText.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
if (key.length !== 16) stop('bad --key');
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-128-gcm', key, iv);
const ct = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final(), cipher.getAuthTag()]);
const data = b64url(Buffer.concat([iv, ct]));
const dir = path.join(ROOT, 'k', id);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'index.html'), shell({ preview: false, data: data }));

let total = spec.reel + items.reduce((s, it) => s + (it.price || 0), 0);
console.log('Kit for ' + spec.brand + ' (slug ' + slug + ')');
console.log('Link: ' + SITE + 'k/' + id + '/#' + keyText);
console.log('id ' + id + '  key ' + keyText);
console.log('Reel ₹' + spec.reel.toLocaleString('en-IN') + items.map((it) => ', ' + it.title + (it.price ? ' ₹' + it.price.toLocaleString('en-IN') : ' ' + (it.note || ''))).join('') + '. Total ₹' + total.toLocaleString('en-IN'));
