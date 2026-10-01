// Motion: sections ease in as you scroll, numbers count up once.
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('js-motion');

  var targets = [];
  document.querySelectorAll('main > section:not(.hero)').forEach(function (s) {
    Array.prototype.forEach.call(s.children, function (c) {
      if (c.classList.contains('reels')) {
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
