/* banner-zoom.js (2026-11-01): scroll-linked zoom on every banner and full-bleed photo outside the home scenes (DX.bannerZoom).
   As a banner comes up the screen its photo eases from 1.14 to 1; it rests at 1 while centred (or held/pinned); as it leaves it eases to 1.08.
   Scrubbed from the real position (getBoundingClientRect each frame), both directions, eased toward the target with a short time constant, so the
   motion stays calm whatever the scroll pace. Only the img/video moves, through the individual `scale` property (css/core/banner-zoom.css), never below 1,
   so no edge can show; the frame, the watermark and the copy stay put. Home scenes are js/core/scenes.js's (they already scale their photos): skipped. */
(function () {
  'use strict';
  var W = window, D = document, DX = W.DX = W.DX || {};
  var RM = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SEL = ['.v7h-bg img', '.v7h-pan img',
    '.tp-hero .tp-ph img', '.ev-hero .ev-ph img', '.gl-hero .gl-ph img', '.bl-hero .bl-ph img', '.vd-hero .vd-fr img',
    '.v7cta>img', '.v7cta>video', '.v7s>img', '.v7p>figure img',
    '.ft-sea .ft-poster', '.ft-sea .ft-video', '.ft-sea .ft-ocean'].join(',');
  var SKIP = '[data-scene],section.scn,.scn-in,#voices,.vb';   /* not plain .scn: the home page puts that class on <html> */
  var CARD = '.tp-ph,.ev-ph,.gl-ph,.bl-ph,.vd-fr,.v7h-pan>figure';
  var items = [], booted = false, last = 0, rafOn = false, tm = 0, quiet = 0;

  function frameOf(m) { return m.closest(CARD) || m.closest('.ft-sea') || m.closest('section') || m.parentElement; }
  function origin(m) {
    var p = m.getAttribute('data-pos');
    if (!p) { try { p = getComputedStyle(m).objectPosition; } catch (e) { p = ''; } }
    return p && /%|px/.test(p) ? p : '50% 50%';
  }
  function ss(u) { return u * u * (3 - 2 * u); }
  function target(it, vh, rect) {
    var r = rect || it.r || it.f.getBoundingClientRect(); if (!r.height) return it.cur;
    var c = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
    c = Math.max(-1, Math.min(1, c));
    var a = Math.abs(c), u = Math.max(0, Math.min(1, (a - .12) / .88)), ph = W.innerWidth <= 700;
    return 1 + (c > 0 ? (ph ? .10 : .14) : (ph ? .06 : .08)) * ss(u);
  }
  function write(it, s) {
    if (Math.abs(s - it.shown) < .0004) return;
    it.shown = s; it.m.style.setProperty('--bz', s.toFixed(4));
  }
  /* all reads first, then all writes: a write between two reads would force a style + layout pass per photo every frame */
  function step() {
    var now = performance.now(), dt = Math.min(.1, Math.max(0, (now - (last || now)) / 1000)); last = now;
    var vh = W.innerHeight, moving = false, live = [];
    items.forEach(function (it) {
      if (!it.m.isConnected) return;
      var r = it.f.getBoundingClientRect();
      if (r.bottom < -vh || r.top > 2 * vh || !r.height) { it.far = true; return; }   /* far off screen: left as it is until it comes near */
      it.far = false; it.r = r; live.push(it);
    });
    live.forEach(function (it) {
      var t = target(it, vh), tau = it.slow ? .55 : .14, k = dt ? 1 - Math.exp(-dt / tau) : 0;
      if (it.wasFar) { it.cur = t; it.wasFar = false; }   /* arriving from far away: start on the curve, no catch-up glide */
      it.cur += (t - it.cur) * k;
      if (Math.abs(t - it.cur) < .0008) { it.cur = t; it.slow = false; } else moving = true;
    });
    items.forEach(function (it) { if (it.far) it.wasFar = true; });
    live.forEach(function (it) { write(it, Math.max(1, it.cur)); });
    return moving;
  }
  function loop() {
    rafOn = false;
    var moving = step();
    clearTimeout(tm);
    if (moving || performance.now() < quiet) {
      if (!rafOn) { rafOn = true; requestAnimationFrame(loop); }
      tm = setTimeout(loop, 120);   /* throttled or background tabs, where frames do not run */
    } else last = 0;
  }
  function kick() { quiet = performance.now() + 400; if (!rafOn) { rafOn = true; requestAnimationFrame(loop); } clearTimeout(tm); tm = setTimeout(loop, 120); }

  function scan() {
    var vh = W.innerHeight, fresh = [];
    [].slice.call(D.querySelectorAll(SEL)).forEach(function (m) {   /* reads only */
      if (m._bz || m.closest(SKIP)) return;
      var f = frameOf(m); if (!f) return;
      var it = { m: m, f: f, cur: 1, shown: 0, slow: false, o: origin(m) };
      var r = f.getBoundingClientRect(), on = r.bottom > 0 && r.top < vh;
      it.cur = on && !booted ? 1 + (W.innerWidth <= 700 ? .06 : .09) : target(it, vh, r);   /* on screen at load: a slow settle, like a first look */
      it.slow = on && !booted; fresh.push(it);
    });
    fresh.forEach(function (it) {   /* then the writes */
      it.m._bz = 1; it.m.classList.add('bz'); it.m.style.setProperty('--bzo', it.o); write(it, it.cur); items.push(it);
    });
    if (fresh.length) kick();
  }
  DX.bannerZoom = function () {
    if (RM) return;
    D.documentElement.classList.add('bz-on');
    scan(); booted = true;
  };
  if (RM) return;
  W.addEventListener('scroll', kick, { passive: true });
  W.addEventListener('resize', kick);
  W.addEventListener('dx:live', function () { setTimeout(scan, 60); });
  function boot() { DX.bannerZoom(); setTimeout(scan, 1500); W.addEventListener('load', function () { scan(); kick(); }); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
