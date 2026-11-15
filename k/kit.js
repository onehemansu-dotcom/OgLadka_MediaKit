// Brand kit page. Every brand gets its own page in k/<id>/ with the quote encrypted inside it,
// because this repo is public. The key travels in the link after the # (browsers never send it
// to a server), so only someone with the link can read the quote.
// Built by tools/make-brand-kit.js. Numbers come from ../../numbers.json, so a refresh updates every kit.
(function () {
  var LIVE = location.hostname === 'onehemansu-dotcom.github.io';
  var WA = '917676337153';
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

  var CHEV = '<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  var WA_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 19.5l1.2-3.6A8 8 0 1 1 8.4 18.6z"/><path d="M9.2 8.6c.2-.5.6-.5.9-.5l.6.1 1 2.1-.6.9c.5 1 1.3 1.8 2.3 2.3l.9-.6 2.1 1-.1.6c-.1.6-.9 1.3-1.7 1.3-2.6 0-5.9-3.3-5.9-5.9 0-.5.2-1 .5-1.3z" stroke-width="1.3"/></svg>';
  var IG_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none"/></svg>';

  function render(k, n) {
    var medianText = shortK(n.median);
    var median = fromShort(medianText);
    var eng = Math.round(n.engagement * 10) / 1000;
    var engText = (eng * 100).toFixed(1) + '%';
    var waUrl = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(k.wa);

    var work = k.work.map(function (w) {
      var meta = w.meta;
      if (w.label && n.mostLoved && n.mostLoved[w.label] > 0) meta = shortK(n.mostLoved[w.label]) + ' views';
      return '<a data-label="Work: ' + esc(w.title) + '" data-category="Work" class="reel" href="' + esc(w.href) + '" target="_blank" rel="noopener">' +
        '<div class="thumb"><img src="' + IMG + esc(w.img) + '" alt="' + esc(w.title) + ' Reel thumbnail" />' +
        (w.badge ? '<img class="badge" src="' + IMG + esc(w.badge) + '" alt="" />' : '') + '</div>' +
        '<div class="reel-title">' + esc(w.title) + '</div><div class="reel-meta">' + esc(meta) + '</div></a>';
    }).join('');

    var total = k.reel.price;
    var rows = '<div class="q-row" data-label="Quote: ' + esc(k.reel.title) + '" data-category="Quote"><div><div class="row-title">' + esc(k.reel.title) + '</div>' +
      '<div class="row-desc">' + esc(k.reel.desc) + '</div></div><span class="q-amt">' + inr(k.reel.price) + '</span></div>';
    k.items.forEach(function (it) {
      if (it.price > 0) total += it.price;
      rows += '<div class="q-row" data-label="Quote: ' + esc(it.title) + '" data-category="Quote"><div><div class="row-title">' + esc(it.title) + '</div>' +
        (it.desc ? '<div class="row-desc">' + esc(it.desc) + '</div>' : '') + '</div>' +
        (it.price > 0 ? '<span class="q-amt">' + inr(it.price) + '</span>' : '<span class="q-amt muted">' + esc(it.note || 'Included') + '</span>') + '</div>';
    });
    (k.notOffered || []).forEach(function (it) {
      rows += '<div class="q-row" data-label="Quote: ' + esc(it.title) + '" data-category="Quote"><div><div class="row-title">' + esc(it.title) + '</div>' +
        (it.desc ? '<div class="row-desc">' + esc(it.desc) + '</div>' : '') + '</div><span class="q-amt muted">Not offered</span></div>';
    });
    if (k.items.some(function (it) { return it.price > 0; })) {
      rows += '<div class="q-row q-total"><div class="row-title">Total</div><span class="q-amt">' + inr(total) + '</span></div>';
    }

    var addons = (k.addons || []).map(function (a) {
      return '<details class="addon"><summary data-label="Add-on: ' + esc(a.title) + '" data-category="Add-on"><span>' + esc(a.title) + '</span>' +
        '<span class="q-amt">' + inr(a.price) + '</span></summary><p>' + esc(a.desc) + '</p></details>';
    }).join('');

    root.innerHTML =
      '<section data-section="Intro" id="why" class="kit-hero">' +
        '<div class="for">Prepared for <b>' + esc(k.forName) + '</b></div>' +
        '<div><h1 class="name">Hi, I’m Hemansu.</h1><div class="place">Automotive creator, OG Ladka. Bangalore.</div></div>' +
        '<p class="pitch">' + esc(k.pitch) + '</p>' +
      '</section>' +
      '<section data-section="Numbers">' +
        '<div class="tiles">' +
          '<div class="tile"><div class="tile-num">' + medianText + '</div><div class="tile-label">Median views per Reel</div></div>' +
          '<div class="tile"><div class="tile-num">' + shortK(n.views30) + '</div><div class="tile-label">Views, last 30 days</div></div>' +
          '<div class="tile"><div class="tile-num">' + n.nonFollowerPct.toFixed(1) + '%</div><div class="tile-label">Non-follower views</div></div>' +
          '<div class="tile"><div class="tile-num">' + engText + '</div><div class="tile-label">Engagement rate</div></div>' +
        '</div>' +
        '<p class="foot">' + trim1(n.followers / 1e3) + 'K followers. Last 10 Reels and last 30 days, from Instagram insights on ' + esc(niceDate(n.date)) + '.</p>' +
      '</section>' +
      '<section data-section="Work">' +
        '<h2 class="h2-sm">' + esc(k.workTitle || 'Work that fits') + '</h2>' +
        '<div class="reels">' + work + '</div>' +
      '</section>' +
      '<section data-section="Quote" id="quote">' +
        '<h2 class="h2">Your quote</h2>' +
        (k.quoteLead ? '<p class="lead">' + esc(k.quoteLead) + '</p>' : '') +
        '<div class="group quote">' + rows + '</div>' +
        '<p class="honest">The Reel works out to ₹' + (k.reel.price / median).toFixed(2) + ' per view and ₹' +
          (k.reel.price / (median * eng)).toFixed(2) + ' per engagement, on ' + medianText + ' median views.</p>' +
        (addons ? '<details class="addons" data-section="Add-ons"><summary data-label="Add-ons: Opened" data-category="Add-on"><span>Add-ons, if you need them</span>' + CHEV + '</summary>' + addons + '</details>' : '') +
      '</section>' +
      '<section data-section="How It Works" aria-label="How it works">' +
        '<div class="steps4"><div><span>1</span>Brief</div><div><span>2</span>Script approval</div><div><span>3</span>Go live</div><div><span>4</span>Insights a week later</div></div>' +
      '</section>' +
      '<section data-section="Contact" class="contact">' +
        '<div><h2>' + esc(k.closer || 'Let’s make it happen.') + '</h2><p>WhatsApp is the quickest way to reach me.</p></div>' +
        '<div class="contact-actions"><a data-label="Contact: WhatsApp Button" data-category="Contact" class="btn btn-inv" href="' + waUrl + '" target="_blank" rel="noopener">' + WA_ICON + 'WhatsApp</a></div>' +
        '<div class="links">' +
          '<a data-label="Contact: WhatsApp Number" data-category="Contact" href="' + waUrl + '" target="_blank" rel="noopener">' + WA_ICON + '+91 76763 37153</a>' +
          '<a data-label="Social: Instagram" data-category="Social" href="https://instagram.com/ogladkaa" target="_blank" rel="noopener">' + IG_ICON + '@ogladkaa</a>' +
        '</div>' +
      '</section>' +
      '<footer>Prepared ' + esc(niceDate(k.date)) + '. Prices in INR.</footer>';
    root.classList.add('kit-in');
    document.title = 'OG Ladka for ' + k.forName;
  }

  function broken() {
    root.innerHTML = '<section class="kit-state"><h1 class="h2">This link looks incomplete.</h1>' +
      '<p>Part of the link may have been cut off when it was copied. Message me and I’ll send it again.</p>' +
      '<a class="btn btn-primary" href="https://wa.me/' + WA + '" target="_blank" rel="noopener">WhatsApp me</a></section>';
  }

  // Two tabs at the top: Why me, Your quote. They scroll without touching the address bar,
  // because "#quote" in the address would replace the key and break the link if it's forwarded.
  function tabs() {
    var t = Array.prototype.slice.call(document.querySelectorAll('.seg a'));
    if (!t.length) return;
    function on(id) { t.forEach(function (a) { a.classList.toggle('on', a.dataset.tab === id); }); }
    t.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var s = document.getElementById(a.dataset.tab);
        if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
        on(a.dataset.tab);
      });
    });
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) on(e.target.id); }); },
      { rootMargin: '-35% 0px -60% 0px' });
    ['why', 'quote'].forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  // Same tracker as the main kit (app.js), so visits land in the same sheet and the same emails.
  // Extra here: every add-on opened and every quote line tapped shows up under Clicked.
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
      var ad = document.querySelector('.addons[open]');
      if (ad && name === 'Quote') { var r2 = ad.getBoundingClientRect(); if (r2.top <= line && r2.bottom > line) name = 'Add-ons'; }
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
      if (/^Nav:/.test(label)) return;
      if (clicks.indexOf(label) === -1) clicks.push(label);
      send();
    });
  }

  load().then(function (k) {
    return fresh(k.numbers).then(function (n) { render(k, n); tabs(); track(k); });
  }).catch(function () { broken(); });
})();
