// Sets the starting rate on the kit to the amount Hemansu chose.
// Usage (from the repo root): node tools/set-rate.js 29999
// Then rebuild the PDF with tools/make-pdf.js and publish.
const fs = require('fs');
const path = require('path');
const { readPrice, writePrice } = require('./kit-rate');

const price = parseInt(String(process.argv[2] || '').replace(/[^\d]/g, ''), 10);
if (!(price >= 1000 && price <= 10000000)) { console.error('STOP: give the rate in rupees, like 29999'); process.exit(2); }
const file = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(file, 'utf8');
const before = readPrice(html);
const after = writePrice(html, price);
fs.writeFileSync(file, after);
console.log('Starting rate: ₹' + before.toLocaleString('en-IN') + ' -> ₹' + price.toLocaleString('en-IN'));
console.log(after.match(/id="rateMath">([^<]*)</)[1]);
