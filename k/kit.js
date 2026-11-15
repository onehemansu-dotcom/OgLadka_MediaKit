// Brand kit page. Every brand gets its own page in k/<id>/ with its details encrypted inside it,
// because this repo is public. The key travels in the link after the # (browsers never send it
// to a server), so only someone with the link can read it.
// Built by tools/make-brand-kit.js. Numbers come from ../../numbers.json, so a refresh updates every kit.
(function () {
  var LIVE = location.hostname === 'onehemansu-dotcom.github.io';
  var PHONE = '+917676337153', PHONE_TEXT = '+91 76763 37153';
  var IMG = window.KIT_IMG || '../../images/';
  var root = document.getElementById('kit');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function b64(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  var trim1 = function (n) { return n.toFixed(1).replace(/\.0$/, ''); };
  function shortK(n) { return n >= 1e6 ? trim1(n / 1e6) + 'M' : Math.round(n / 1e3) + 'K'; }
  function fromShort(t) { var m = t.match(/^([\d.]+)([KM])$/); return m ? parseFloat(m[1]) * (m[2] === 'M' ? 1e6 : 1e3) : NaN; }
  function inr(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

  function load() {
    var el = document.getElementById('kit-data');
    var raw = el.textContent.trim();
    if (el.getAttribute('data-plain') === '1') return Promise.resolve(JSON.parse(raw));
    var key = location.hash.replace(/^#/, '');
    if (!key || !(window.crypto && crypto.subtle)) return Promise.reject(new Error('nokey'));
    var buf = b64(raw);
    return crypto.subtle.importKey('raw', b64(key), 'AES-GCM', false, ['decrypt']).then(function (k) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, k, buf.slice(12));
    }).then(function (pt) { return JSON.parse(new TextDecoder().decode(pt)); });
  }

  function fresh(fallback) {
    if (!LIVE || !window.fetch) return Promise.resolve(fallback);
    return fetch('../../numbers.json?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : fallback; })
      .then(function (n) { return n && n.median > 0 ? n : fallback; })
      .catch(function () { return fallback; });
  }

  function niceDate(iso) {
    var d = new Date(iso + 'T12:00:00+05:30');
    var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return m[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
  }

  function videos(list, n, group) {
    return '<div class="vids">' + list.map(function (w) {
      var views = w.views > 0 ? w.views : (w.label && n.mostLoved && n.mostLoved[w.label] > 0 ? n.mostLoved[w.label] : 0);
      return '<a data-label="' + group + ': ' + esc(w.title) + '" data-category="' + group + '" class="vid" href="' + esc(w.href) + '" target="_blank" rel="noopener">' +
        '<div class="thumb"><img src="' + IMG + esc(w.img) + '" alt="' + esc(w.title) + '" />' +
        (w.badge ? '<img class="badge" src="' + IMG + esc(w.badge) + '" alt="" />' : '') + '</div>' +
        '<div class="vid-meta">' + (views ? shortK(views) + ' views' : '&nbsp;') + '</div></a>';
    }).join('') + '</div>';
  }

  function render(k, n) {
    var medianText = shortK(n.median);
    var median = fromShort(medianText);
    var eng = Math.round(n.engagement * 10) / 1000;
    var price = k.reel.price;

    var total = price, priced = false;
    var rows = k.items.map(function (it) {
      if (it.price > 0) { total += it.price; priced = true; }
      return '<div class="q-row" data-label="Collab: ' + esc(it.title) + '" data-category="Collab"><div><div class="row-title">' + esc(it.title) + '</div>' +
        (it.desc ? '<div class="row-desc">' + esc(it.desc) + '</div>' : '') + '</div>' +
        (it.price > 0 ? '<span class="q-amt">' + inr(it.price) + '</span>' : '<span class="q-amt muted">' + esc(it.note || 'Included') + '</span>') + '</div>';
    }).join('') + (k.notOffered || []).map(function (it) {
      return '<div class="q-row" data-label="Collab: ' + esc(it.title) + '" data-category="Collab"><div class="row-title">' + esc(it.title) + '</div><span class="q-amt muted">Not offered</span></div>';
    }).join('');

    var contact = [
      ['Phone', '<a data-label="Contact: Call" data-category="Contact" href="tel:' + k.contact.phone.replace(/\s/g, '') + '">' + esc(k.contact.phone) + '</a>'],
      ['Email', '<span class="sel" data-label="Contact: Email" data-category="Contact">' + esc(k.contact.email) + '</span>']
    ].map(function (r) { return '<div class="c-row"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('');

    root.innerHTML =
      '<section data-section="Intro" class="kit-hero">' +
        '<h1 class="name">Hi, I’m Hemansu.</h1>' +
        '<p class="hello">The person behind OG Ladka, from Bengaluru.</p>' +
        '<p class="pitch">' + esc(k.pitch) + '</p>' +
      '</section>' +
      '<section data-section="Numbers">' +
        '<h2 class="h2-sm">Recent performance</h2>' +
        '<div class="band">' +
          '<div class="band-cell"><div class="band-num">' + medianText + '</div><div class="band-label">Median views per Reel</div></div>' +
          '<div class="band-cell"><div class="band-num">' + shortK(n.views30) + '</div><div class="band-label">Views in the last 30 days</div></div>' +
          '<div class="band-cell"><div class="band-num good">' + n.nonFollowerPct.toFixed(1) + '%</div><div class="band-label">Of views from new people</div></div>' +
          '<div class="band-cell"><div class="band-num good">' + (eng * 100).toFixed(1) + '%</div><div class="band-label">Engagement rate</div></div>' +
        '</div>' +
        '<p class="foot">Based on recent numbers, ' + esc(niceDate(n.date)) + '.</p>' +
      '</section>' +
      (k.partnerships && k.partnerships.length ?
        '<section data-section="Made For Brands"><h2 class="h2-sm">Made for brands recently</h2>' + videos(k.partnerships, n, 'Brand video') + '</section>' : '') +
      '<section data-section="Audience Favourites"><h2 class="h2-sm">Audience favourites</h2>' + videos(k.originals, n, 'Original') + '</section>' +
      '<section data-section="Collaboration">' +
        '<h2 class="h2-sm">This collaboration</h2>' +
        '<div class="deal">' +
          '<div class="deal-main" data-label="Collab: Reel" data-category="Collab"><div class="deal-label">' + esc(k.reel.title) + '</div>' +
            '<div class="deal-price">' + inr(price) + '</div><div class="deal-desc">' + esc(k.reel.desc) + '</div></div>' +
          (rows ? '<div class="deal-sub">Add-ons</div><div class="deal-rows">' + rows + '</div>' : '') +
          (priced ? '<div class="q-row q-total"><div class="row-title">Total</div><span class="q-amt">' + inr(total) + '</span></div>' : '') +
        '</div>' +
        '<p class="deal-note">Prices cover only what was asked for in your message or email. Anything added later is quoted separately.</p>' +
      '</section>' +
      '<section data-section="Value">' +
        '<h2 class="h2-sm">What it works out to</h2>' +
        '<div class="v-card">' +
          '<div class="v-three">' +
            '<div><b>₹' + (price / median).toFixed(2) + '</b><span>per view</span></div>' +
            '<div><b>₹' + (price / (median * eng)).toFixed(2) + '</b><span>per engagement</span></div>' +
            '<div><b>₹' + Math.round(price / median * 1000) + '</b><span>per 1,000 views</span></div>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<section data-section="Contact">' +
        '<h2 class="h2-sm">Contact details</h2>' +
        '<div class="c-rows">' + contact + '</div>' +
      '</section>' +
      '<footer class="kit-foot">' +
        '<a data-label="Social: Instagram" data-category="Social" href="https://www.instagram.com/' + esc(k.contact.instagram) + '/" target="_blank" rel="noopener">' + IG_ICON + 'Instagram</a>' +
        '<a data-label="Social: YouTube" data-category="Social" href="https://www.youtube.com/@' + esc(k.contact.youtube) + '" target="_blank" rel="noopener">' + YT_ICON + 'YouTube</a>' +
      '</footer>';
    root.classList.add('kit-in');
    document.title = 'OG Ladka media kit';
  }

  var IG_ICON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none"/></svg>';
  var YT_ICON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="4"/><path d="M10.2 9.4v5.2l4.4-2.6z" fill="currentColor"/></svg>';

  function broken() {
    root.innerHTML = '<section class="kit-state"><h1 class="h2">This link looks incomplete.</h1>' +
      '<p>Part of the link may have been cut off when it was copied. Call us and we’ll send it again.</p>' +
      '<a class="btn btn-primary" href="tel:' + PHONE + '">Call ' + PHONE_TEXT + '</a></section>';
  }

  // Same tracker as the main kit (app.js), so visits land in the same sheet and the same emails.
  // Extra here: lines of the collaboration they tap show up under Clicked.
  function track(k) {
    if (!LIVE) return;
    var ENDPOINT = 'https://script.google.com/macros/s/AKfycbx9f7u2SH-1THYGTdrqR1QUgxoNfD6T_UKiLgssP8Zp3-HpH8KDJcEgOy8mATVKxyPc/exec';
    function get(x) { try { return localStorage.getItem(x); } catch (e) { return null; } }
    function set(x, v) { try { localStorage.setItem(x, v); } catch (e) {} }
    function tag(a, v) { try { if (typeof clarity === 'function') clarity('set', a, v); } catch (e) {} }
    function ga(label, url, cat) {
      if (typeof gtag === 'function') gtag('event', 'link_click', { click_label: label, link_url: url || '', click_category: cat || 'General' });
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-label]');
      if (a) ga(a.getAttribute('data-label'), a.getAttribute('href'), a.getAttribute('data-category'));
    });
    if (get('og_owner') === '1') { tag('owner', 'yes'); return; }
    var brand = String(k.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (!brand) return;
    function rid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
    var vid = get('og_vid'); if (!vid) { vid = rid(); set('og_vid', vid); }
    var visit = rid();
    tag('brand', brand); tag('visit', visit); tag('kit', 'brand kit');
    var cu = '', cs = '';
    try { if (typeof clarity === 'function') clarity('metadata', function (m) { if (m) { cu = m.userId || ''; cs = m.sessionId || ''; } }, false, true); } catch (e) {}
    try { if (typeof clarity === 'function') clarity('upgrade', 'brand kit'); } catch (e) {}
    var ua = navigator.userAgent;
    var device = /iPhone|iPad|iPod/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Other';
    var app = /Instagram/.test(ua) ? 'Instagram' : /FBAN|FBAV/.test(ua) ? 'Facebook' : /LinkedInApp/.test(ua) ? 'LinkedIn' : /WhatsApp/.test(ua) ? 'WhatsApp' : 'Browser';
    var activeMs = 0, since = document.hidden ? 0 : Date.now(), seen = [], clicks = [], dwell = {}, current = '';
    function secs() { return Math.round((activeMs + (since ? Date.now() - since : 0)) / 1000); }
    var secEls = Array.prototype.slice.call(document.querySelectorAll('section[data-section]'));
    function sectionNow() {
      var line = window.innerHeight * 0.4, name = '';
      secEls.forEach(function (s) { var r = s.getBoundingClientRect(); if (r.top <= line && r.bottom > line) name = s.getAttribute('data-section'); });
      return name;
    }
    setInterval(function () {
      if (document.hidden) return;
      var name = sectionNow(); if (!name) return;
      current = name; dwell[name] = (dwell[name] || 0) + 1;
      if (seen.indexOf(name) === -1) seen.push(name);
    }, 1000);
    function journey() {
      var parts = seen.map(function (x) { return x + ' ' + (dwell[x] || 0) + 's'; });
      var tail = current ? ' | left at ' + current : '';
      var text = parts.join(', ') + tail;
      if (text.length > 195) text = parts.filter(function (p) { return !/ 0s$/.test(p); }).join(', ') + tail;
      return text.slice(0, 200);
    }
    function send(end) {
      var body = JSON.stringify({ brand: brand, visit: visit, vid: vid, device: device, app: app, secs: secs(),
        sections: journey(), clicks: clicks.join(', ').slice(0, 300), end: end === true ? 1 : 0, cu: cu, cs: cs });
      try { if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, body)) return; } catch (e) {}
      try { fetch(ENDPOINT, { method: 'POST', body: body, mode: 'no-cors', keepalive: true }); } catch (e) {}
    }
    send();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (since) { activeMs += Date.now() - since; since = 0; } send(true); } else { since = Date.now(); }
    });
    window.addEventListener('pagehide', function () { send(true); });
    var beats = 0, beat = setInterval(function () { if (document.hidden) return; if (++beats > 20) { clearInterval(beat); return; } send(beats === 20); }, 30000);
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-label]'); if (!a) return;
      var label = a.getAttribute('data-label');
      if (clicks.indexOf(label) === -1) clicks.push(label);
      send();
    });
  }

  load().then(function (k) {
    return fresh(k.numbers).then(function (n) { render(k, n); track(k); });
  }).catch(function () { broken(); });
})();
