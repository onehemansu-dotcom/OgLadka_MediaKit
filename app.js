// ---------- Analytics (GA4 + Clarity load in index.html) ----------
// Same events as the link-in-bio site, so both show up the same way in GA4:
//   link_click   fires for every element with data-label (+ data-category)
//   section_view fires once per section (data-section) the visitor scrolls to
(function () {
  function track(label, url, category, eventName) {
    if (typeof gtag === 'function') {
      gtag('event', eventName || 'link_click', {
        click_label: label || 'unknown',
        link_url: url || '',
        click_category: category || 'General'
      });
    }
  }
  window.ogTrack = track;

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-label]');
    if (!a) return;
    track(a.getAttribute('data-label'), a.getAttribute('href') || '', a.getAttribute('data-category') || 'General');
  });

  var sections = document.querySelectorAll('[data-section]');
  if (!sections.length || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var name = en.target.getAttribute('data-section');
      if (typeof gtag === 'function') gtag('event', 'section_view', { section_name: name });
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -40% 0px', threshold: 0 });
  sections.forEach(function (s) { io.observe(s); });
})();

// ---------- Brand open tracking ----------
// A link like ...?b=acko tells me that brand opened the kit, for how long,
// which sections they reached and what they tapped. Saved to my Google Sheet.
// Opening the kit once with ?owner=1 marks that device as mine so my own visits don't count.
(function () {
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbx9f7u2SH-1THYGTdrqR1QUgxoNfD6T_UKiLgssP8Zp3-HpH8KDJcEgOy8mATVKxyPc/exec';
  if (ENDPOINT.indexOf('https://') !== 0) return;
  var q = new URLSearchParams(location.search);
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  // Clarity recordings: tag each visit so they can be filtered by brand (Filters > Custom tags > brand).
  function tag(k, v) { try { if (typeof clarity === 'function') clarity('set', k, v); } catch (e) {} }
  if (q.get('owner') === '1') set('og_owner', '1');
  if (get('og_owner') === '1') { tag('owner', 'yes'); return; }
  var brand = (q.get('b') || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
  if (!brand) return;

  function rid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  var vid = get('og_vid');
  if (!vid) { vid = rid(); set('og_vid', vid); }
  var visit = rid();
  tag('brand', brand);
  tag('visit', visit);
  try { if (typeof clarity === 'function') clarity('upgrade', 'brand link'); } catch (e) {}

  var ua = navigator.userAgent;
  var device = /iPhone|iPad|iPod/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Other';
  var app = /Instagram/.test(ua) ? 'Instagram' : /FBAN|FBAV/.test(ua) ? 'Facebook' : /LinkedInApp/.test(ua) ? 'LinkedIn' : 'Browser';

  var activeMs = 0, since = document.hidden ? 0 : Date.now();
  var seen = [], clicks = [];
  function secs() { return Math.round((activeMs + (since ? Date.now() - since : 0)) / 1000); }

  // Where they spend their time: every second the page is on screen counts towards the section
  // under the reading line (40% down the screen). "left at" is the section they were on last.
  var secEls = Array.prototype.slice.call(document.querySelectorAll('[data-section]'));
  var dwell = {}, current = '';
  function sectionNow() {
    var line = window.innerHeight * 0.4, name = '';
    secEls.forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) name = s.getAttribute('data-section');
    });
    return name;
  }
  setInterval(function () {
    if (document.hidden) return;
    var name = sectionNow();
    if (!name) return;
    current = name;
    dwell[name] = (dwell[name] || 0) + 1;
    if (seen.indexOf(name) === -1) seen.push(name);
  }, 1000);
  // Sent in the Sections column, e.g. "About 2s, Numbers 6s, Rates 20s | left at Numbers"
  function journey() {
    var parts = seen.map(function (n) { return n + ' ' + (dwell[n] || 0) + 's'; });
    var tail = current ? ' | left at ' + current : '';
    var text = parts.join(', ') + tail;
    if (text.length > 195) text = parts.filter(function (p) { return !/ 0s$/.test(p); }).join(', ') + tail;
    return text.slice(0, 200);
  }

  // end = the visit is over for now (closed or switched away): the tracker emails Hemansu once per visit.
  function send(end) {
    var body = JSON.stringify({
      brand: brand, visit: visit, vid: vid, device: device, app: app,
      secs: secs(), sections: journey(), clicks: clicks.join(', '), end: end === true ? 1 : 0
    });
    try { if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, body)) return; } catch (e) {}
    try { fetch(ENDPOINT, { method: 'POST', body: body, mode: 'no-cors', keepalive: true }); } catch (e) {}
  }

  send();

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (since) { activeMs += Date.now() - since; since = 0; } send(true); }
    else { since = Date.now(); }
  });
  window.addEventListener('pagehide', function () { send(true); });

  // Keeps the time accurate even if the browser closes without warning.
  var beats = 0, beat = setInterval(function () {
    if (document.hidden) return;
    if (++beats > 20) { clearInterval(beat); return; }
    send(beats === 20);
  }, 30000);

  document.querySelectorAll('[data-section]').forEach(function (s) {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      var name = s.getAttribute('data-section');
      if (seen.indexOf(name) === -1) seen.push(name);
      io.disconnect();
    }, { rootMargin: '0px 0px -40% 0px' });
    io.observe(s);
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-label]');
    if (!a) return;
    var label = a.getAttribute('data-label');
    if (/^Nav:/.test(label)) return;
    if (clicks.indexOf(label) === -1) clicks.push(label);
    send();
  });
})();

// Starting rate: Hemansu sets it himself (data-price on #reelPrice); nothing here changes it.
// The line under it works out what that rate means per view and per engagement.
// Runs before the count-up animation so it reads the final figures.
(function () {
  var priceEl = document.getElementById('reelPrice');
  var medEl = document.getElementById('medianViews');
  var engEl = document.getElementById('engRate');
  var mathEl = document.getElementById('rateMath');
  if (!priceEl || !medEl || !engEl) return;
  function num(text) {
    var m = text.trim().match(/^([\d.]+)\s*([KM%]?)$/i);
    if (!m) return NaN;
    var n = parseFloat(m[1]), s = m[2].toUpperCase();
    return s === 'K' ? n * 1e3 : s === 'M' ? n * 1e6 : s === '%' ? n / 100 : n;
  }
  var median = num(medEl.textContent), eng = num(engEl.textContent);
  var price = parseFloat(priceEl.getAttribute('data-price'));
  if (!(median > 0) || !(eng > 0) || !(price > 0)) return;
  priceEl.textContent = 'from \u20B9' + price.toLocaleString('en-IN');
  if (mathEl) {
    mathEl.textContent = 'Based on ' + medEl.textContent.trim() + ' median views across my last 10 Reels. Works out to \u20B9' +
      (price / median).toFixed(2) + ' per view and \u20B9' + (price / (median * eng)).toFixed(2) + ' per engagement.';
  }
})();

// Motion: sections ease in as you scroll, numbers count up once.
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('js-motion');

  var targets = [];
  document.querySelectorAll('main > section:not(.hero)').forEach(function (s) {
    Array.prototype.forEach.call(s.children, function (c) {
      if (c.classList.contains('reels') || c.classList.contains('collabs')) {
        Array.prototype.forEach.call(c.children, function (r, i) { r.style.transitionDelay = (i * 80) + 'ms'; targets.push(r); });
      } else { targets.push(c); }
    });
  });
  targets.forEach(function (el) { el.classList.add('reveal'); });

  function countUp(el) {
    var raw = el.dataset.raw || el.textContent.trim(), m = raw.match(/^([\d.]+)([KM%]?)$/);
    if (!m) return;
    el.dataset.raw = raw;
    var end = parseFloat(m[1]), suffix = m[2], dec = (m[1].split('.')[1] || '').length, t0 = null, dur = 900;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (end * e).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(step); else el.textContent = raw;
    }
    requestAnimationFrame(step);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      if (e.target.classList.contains('group') && e.target.closest('#numbers')) {
        e.target.querySelectorAll('.v').forEach(countUp);
      }
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  targets.forEach(function (el) { io.observe(el); });

  // Printing or saving as PDF always shows the final numbers.
  window.addEventListener('beforeprint', function () {
    document.querySelectorAll('[data-raw]').forEach(function (el) { el.textContent = el.dataset.raw; });
  });
})();

// Segmented control: highlights the section you're viewing.
(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.seg a'));
  if (!tabs.length) return;
  function setActive(id) {
    tabs.forEach(function (t) {
      var on = t.dataset.tab === id;
      t.classList.toggle('on', on);
      if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
    });
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { setActive(t.dataset.tab); }); });
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
  }, { rootMargin: '-40% 0px -55% 0px' });
  tabs.forEach(function (t) { var s = document.getElementById(t.dataset.tab); if (s) io.observe(s); });
})();

// Most loved videos: each slot switches between its Reels every 3 seconds.
(function () {
  var wrap = document.querySelector('.reels-rotating');
  if (!wrap) return;
  var slots = Array.prototype.slice.call(wrap.querySelectorAll('.reel-slot'));
  wrap.classList.add('js-rot');
  var step = 0, paused = false;
  function show(i, stagger) {
    slots.forEach(function (s, n) {
      setTimeout(function () {
        var kids = s.children, k = i % kids.length;
        for (var c = 0; c < kids.length; c++) {
          var on = c === k;
          kids[c].classList.toggle('is-on', on);
          kids[c].setAttribute('aria-hidden', on ? 'false' : 'true');
          if (on) kids[c].removeAttribute('tabindex'); else kids[c].setAttribute('tabindex', '-1');
        }
      }, stagger ? n * 160 : 0);
    });
  }
  show(0, false);
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setInterval(function () {
    if (paused || document.hidden) return;
    step++; show(step, true);
  }, 3000);
  wrap.addEventListener('mouseenter', function () { paused = true; });
  wrap.addEventListener('mouseleave', function () { paused = false; });
  wrap.addEventListener('focusin', function () { paused = true; });
  wrap.addEventListener('focusout', function () { paused = false; });
})();

// Nav bar: fades out when you scroll down, comes back when you scroll up.
(function () {
  var bar = document.querySelector('.bar');
  if (!bar) return;
  var last = window.scrollY, ticking = false;
  function update() {
    var y = window.scrollY;
    if (y < 40 || y < last - 4) bar.classList.remove('bar-hidden');
    else if (y > last + 4) bar.classList.add('bar-hidden');
    last = y; ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
})();

// WhatsApp: opens a chat with a ready-to-send message.
(function () {
  var msg = "Hi Hemansu, I came across your media kit. This is ___ from ___. We'd like to discuss a collaboration.";
  var url = 'https://wa.me/917676337153?text=' + encodeURIComponent(msg);
  document.querySelectorAll('.js-wa').forEach(function (a) { a.href = url; });
})();

// Small confirmation message at the bottom of the screen.
function showToast(text) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(function () { t.classList.remove('show'); }, 2200);
}

// PDF: a normal download link on the live site. Inside the Claude preview, saves through the viewer.
(function () {
  var btn = document.getElementById('pdfBtn');
  if (!btn || !window.__PDF_B64 || !(window.claude && window.claude.use)) return;
  var downloads = null;
  window.claude.use('downloads').then(function (d) { downloads = d; });
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    if (!downloads) { showToast('Download isn\u2019t available here.'); return; }
    var bin = atob(window.__PDF_B64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    downloads.save({ filename: 'OG-Ladka-Media-Kit.pdf', data: new Blob([bytes]) }).catch(function () {});
  });
})();
