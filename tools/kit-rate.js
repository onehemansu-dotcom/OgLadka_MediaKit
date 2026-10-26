// Shared helpers for the starting rate. Hemansu decides the rate; these only write it and the
// "works out to" line under it, using the same maths as app.js.
function num(text) {
  const m = String(text).trim().match(/^([\d.]+)\s*([KM%]?)$/i);
  if (!m) return NaN;
  const n = parseFloat(m[1]), s = m[2].toUpperCase();
  return s === 'K' ? n * 1e3 : s === 'M' ? n * 1e6 : s === '%' ? n / 100 : n;
}

const PRICE_RE = /<span class="price" id="reelPrice" data-price="(\d+)">from ₹([\d,]+)<\/span>/;

function readPrice(html) {
  const m = html.match(PRICE_RE);
  if (!m) throw new Error('price element not found');
  return parseInt(m[1], 10);
}

// Writes the price and recomputes the line under it from the median and engagement on the page.
function writePrice(html, price) {
  if (!(price > 0)) throw new Error('bad price');
  html = html.replace(PRICE_RE, '<span class="price" id="reelPrice" data-price="' + price + '">from ₹' + price.toLocaleString('en-IN') + '</span>');
  const medianText = html.match(/id="medianViews">([^<]*)</)[1];
  const median = num(medianText), eng = num(html.match(/id="engRate">([^<]*)</)[1]);
  const line = 'Based on ' + medianText + ' median views across my last 10 Reels. Works out to ₹' + (price / median).toFixed(2) + ' per view and ₹' + (price / (median * eng)).toFixed(2) + ' per engagement.';
  return html.replace(/(<p class="honest" id="rateMath">)[^<]*(<\/p>)/, '$1' + line + '$2');
}

module.exports = { num, readPrice, writePrice };
