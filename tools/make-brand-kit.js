// Builds one brand's own kit page: two screens, their numbers, work that fits, and their quote.
// The repo is public, so the brand's details and quote are encrypted inside the page. The key goes
// in the link after the #, and only the person with the link can read it.
//
// Usage (from the repo root):
//   node tools/make-brand-kit.js spec.json                 new kit, prints the link to send
//   node tools/make-brand-kit.js spec.json --id X --key Y  rebuilds an existing kit at the same link
//   node tools/make-brand-kit.js spec.json --preview DIR   unencrypted, no tracking, for a preview only
//
// spec.json (never commit it: it holds the quote in plain text; keep it in the lead's Notion page):
// {
//   "brand": "Acme Lubes",              board name in Brand Leads; the tracking slug comes from it
//   "forName": "Acme Lubes",            shown as "Prepared for ..." (agency name if the brand isn't named)
//   "category": "care",                 care | insurance | auto (picks default work and add-ons)
//   "date": "2026-11-16",
//   "pitch": "One or two lines on why this fits them.",
//   "work": ["matte", "car101", "iridium"],          optional, 3 keys from WORK below
//   "reel": 24999,                                    reel price from the rate card
//   "reelDesc": "Up to 60 seconds, collab post",      optional
//   "items": [ {"key": "story", "qty": 2}, {"key": "shorts"},
//              {"title": "Amazon review", "desc": "...", "note": "Product cost at actuals"},
//              {"title": "Anything else", "desc": "...", "price": 4999} ],
//   "notOffered": [ {"title": "DM automation"} ],
//   "addons": ["partnership", "usage"],               optional, default by category
//   "quoteLead": "...", "closer": "...", "wa": "..."  optional
// }
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://onehemansu-dotcom.github.io/OgLadka_MediaKit/';

// Public work, the same Reels and collaborations as the main kit.
const WORK = {
  matte:     { label: 'Video: Matte Paint Care', title: 'Matte paint care', img: 'reel-matte.webp', href: 'https://www.instagram.com/ogladkaa/reel/DVObL38CSEV/', meta: '2.8M views' },
  iridium:   { label: 'Video: Iridium Spark Plug', title: 'Iridium spark plug?', img: 'reel-iridium.webp', href: 'https://www.instagram.com/ogladkaa/reel/Da3FWCEpRuM/', meta: '971K views' },
  gear:      { label: 'Video: Gear Shifting Guide', title: 'Gear shifting guide', img: 'reel-gear.webp', href: 'https://www.instagram.com/ogladkaa/reel/DWRpaDoNwxY/', meta: '2.4M views' },
  engine:    { label: 'Video: Engine Braking Explained', title: 'Engine braking explained', img: 'reel-engine-braking.webp', href: 'https://www.instagram.com/ogladkaa/reel/DUyRCN9Es59/', meta: '1.6M views' },
  insurance: { label: 'Video: Insurance Rejected', title: 'Insurance rejected', img: 'reel-insurance.webp', href: 'https://www.instagram.com/ogladkaa/reel/DcObLzBJJzY/', meta: '394K views' },
  wrap:      { label: 'Video: How to Legally Wrap a Bike', title: 'How to legally wrap a bike', img: 'reel-wrap.webp', href: 'https://www.instagram.com/ogladkaa/reel/DVlsLxeCf6Q/', meta: '918K views' },
  ktm:       { title: 'KTM', meta: '160 Duke and RC launch', img: 'collab-ktm.webp', badge: 'brand-ktm.webp', href: 'https://www.instagram.com/reel/DTuy4o8Cfy8/' },
  triumph:   { title: 'Triumph', meta: '400cc range launch', img: 'collab-triumph.webp', badge: 'brand-triumph.webp', href: 'https://www.instagram.com/reel/DLb-AX2pDCp/' },
  re:        { title: 'Royal Enfield', meta: 'Guerrilla 450 first ride', img: 'collab-re.webp', badge: 'brand-royalenfield.webp', href: 'https://www.instagram.com/reel/DcgdTK8hUYI/' },
  car101:    { title: 'Car101', meta: 'Tyre polish collab', img: 'collab-car101.webp', badge: 'brand-car101.webp', href: 'https://www.instagram.com/reel/DdMNz_6pp-P/' }
};

// Add-ons as a share of this brand's Reel price (Hemansu's rate card, Mon, 16 Nov 2026).
const ADDONS = {
  partnership: { title: 'Partnership ads, 30 days', pct: 0.30, desc: 'Run the Reel as an ad from my handle for 30 days.' },
  usage:       { title: 'Usage rights, 30 days', pct: 0.25, desc: 'Use the video in your own ads, website or stores for 30 days.' },
  excl30:      { title: 'Exclusivity, 30 days', pct: 0.30, desc: 'No competing brand in your category on my page for 30 days.' },
  excl90:      { title: 'Exclusivity, 90 days', pct: 0.50, desc: 'No competing brand in your category on my page for 90 days.' },
  story:       { title: 'Instagram story', pct: 0.15, desc: 'Each story, with your link on it.' },
  shorts:      { title: 'YouTube Shorts repost', pct: 0.15, desc: 'The same Reel posted on my YouTube Shorts.' },
  linkbio:     { title: 'Link in bio, 7 days', pct: 0.10, desc: 'Your link in my Instagram bio for 7 days.' },
  rush:        { title: 'Rush delivery', pct: 0.25, desc: 'Live within 48 hours of the brief.' },
  revision:    { title: 'Extra edit round', flat: 5999, desc: 'Two rounds of changes are included. Each round after that.' },
  eventHalf:   { title: 'Event coverage, half day', pct: 0.40, desc: 'Up to 4 hours on site in Bangalore. Travel and stay outside Bangalore at actuals.' },
  eventFull:   { title: 'Event coverage, full day', pct: 0.75, desc: 'A full day on site in Bangalore. Travel and stay outside Bangalore at actuals.' }
};
const BASE_ADDONS = ['partnership', 'usage', 'excl30', 'excl90', 'story', 'shorts', 'linkbio', 'rush', 'revision'];
const DEFAULTS = {
  care:      { work: ['matte', 'car101', 'iridium'], addons: BASE_ADDONS },
  insurance: { work: ['insurance', 'wrap', 'ktm'], addons: BASE_ADDONS },
  auto:      { work: ['ktm', 'triumph', 're'], addons: BASE_ADDONS.concat(['eventHalf', 'eventFull']) }
};
const ITEM_DESC = { story: 'With your link on it.', shorts: '' };

// Prices end in 9, like the rate card: 3,749.85 becomes 3,749.
const r9 = (x) => Math.max(99, Math.round(x / 50) * 50 - 1);
const addonPrice = (a, reel) => (a.flat ? a.flat : r9(reel * a.pct));

function stop(msg) { console.error('STOP: ' + msg); process.exit(2); }
function arg(name) { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; }
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const spec = JSON.parse(fs.readFileSync(process.argv[2] || stop('give the spec file'), 'utf8'));
const cat = DEFAULTS[spec.category] || stop('category must be care, insurance or auto');
if (!spec.brand || !spec.forName || !spec.pitch) stop('brand, forName and pitch are needed');
if (!(spec.reel >= 1000)) stop('reel price missing');
if (!/^\d{4}-\d{2}-\d{2}$/.test(spec.date || '')) stop('date like 2026-11-16 needed');

const numbers = JSON.parse(fs.readFileSync(path.join(ROOT, 'numbers.json'), 'utf8'));
const slug = spec.brand.toLowerCase().replace(/[^a-z0-9]/g, '');

const usedKeys = [];
const items = (spec.items || []).map((it) => {
  if (it.key) {
    const a = ADDONS[it.key] || stop('unknown item key ' + it.key);
    usedKeys.push(it.key);
    const qty = it.qty > 1 ? it.qty : 1;
    const price = it.price > 0 ? it.price : addonPrice(a, spec.reel) * qty;
    const title = it.title || (qty > 1 ? a.title.replace(/y$/, 'ie') + 's, ' + qty : a.title);
    return { title: title, desc: it.desc != null ? it.desc : (ITEM_DESC[it.key] != null ? ITEM_DESC[it.key] : a.desc), price: price };
  }
  if (!it.title) stop('every item needs a key or a title');
  return { title: it.title, desc: it.desc || '', price: it.price > 0 ? it.price : 0, note: it.note || '' };
});

const addonKeys = (spec.addons || cat.addons).filter((k) => usedKeys.indexOf(k) === -1);
const addons = addonKeys.map((k) => {
  const a = ADDONS[k] || stop('unknown add-on ' + k);
  return { title: a.title, desc: a.desc, price: addonPrice(a, spec.reel) };
});

const work = (spec.work || cat.work).map((k) => WORK[k] || stop('unknown work ' + k));
if (work.length !== 3) stop('pick exactly 3 pieces of work');

const payload = {
  v: 1,
  slug: slug,
  forName: spec.forName,
  category: spec.category,
  date: spec.date,
  pitch: spec.pitch,
  work: work,
  workTitle: spec.workTitle || '',
  reel: { title: 'Integrated Reel', desc: spec.reelDesc || 'Up to 60 seconds, collab post', price: spec.reel },
  items: items,
  notOffered: spec.notOffered || [],
  addons: addons,
  quoteLead: spec.quoteLead || '',
  closer: spec.closer || '',
  wa: spec.wa || ('Hi Hemansu, this is ___ from ' + spec.forName + '. We went through the quote and would like to talk.'),
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
<meta property="og:title" content="Hi, I'm Hemansu. Your OG Ladka media kit" />
<meta property="og:description" content="Numbers, work that fits, and your quote." />
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
<header class="bar">
  <nav class="seg seg-2" aria-label="Sections">
    <a data-label="Nav: Why me" href="#why" data-tab="why" class="on">Why me</a>
    <a data-label="Nav: Your quote" href="#quote" data-tab="quote">Your quote</a>
  </nav>
</header>
<main id="kit" class="single kit">
  <section class="kit-state"><p>Loading your kit.</p></section>
</main>
<noscript><p style="padding:24px">This page needs JavaScript. Message me on WhatsApp at +91 76763 37153.</p></noscript>
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
console.log('Kit for ' + spec.forName + ' (slug ' + slug + ')');
console.log('Link: ' + SITE + 'k/' + id + '/#' + keyText);
console.log('id ' + id + '  key ' + keyText);
console.log('Reel ₹' + spec.reel.toLocaleString('en-IN') + items.map((it) => ', ' + it.title + (it.price ? ' ₹' + it.price.toLocaleString('en-IN') : ' ' + (it.note || ''))).join('') + '. Total ₹' + total.toLocaleString('en-IN'));
