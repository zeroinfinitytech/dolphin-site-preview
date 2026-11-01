/* Three steps panel: small aeroplanes leave the Dolphin mark, follow each dotted route and land on the flag.
   No library. One requestAnimationFrame loop that only runs while the panel is on screen and the tab is visible.
   Per route (every 9 s, staggered 0.9 s): plane fades in, flies 3.2 s ease-in-out along the path (rotated to the path tangent),
   fades out on arrival; the flag gives a tiny scale pulse and the route draws a little brighter. Phone: one plane along a short dotted line.
   Reduced motion: nothing moves, planes stay hidden. Planes are aria-hidden and carry no text (i18n untouched).
   Entrance (premium pass): the script marks the panel data-st="0" (css hides routes, flags, names), and when it first scrolls into view sets
   data-st="1" (routes draw in, flags and names rise in a soft stagger, see home-v8.css). The planes begin only after that (T starts at -ENTER).
   Without the script or under reduced motion the final state simply shows. */
(function () {
  'use strict';
  var box = document.querySelector('.hf');
  var svg = document.querySelector('.hf-svg');
  if (!box || !svg) return;

  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion:reduce)') : { matches: false };
  var paths = [].slice.call(svg.querySelectorAll('.hf-p'));
  var planes = [].slice.call(svg.querySelectorAll('.hf-pl'));
  var flags = [].slice.call(svg.querySelectorAll('.hf-pw'));
  var dot = svg.querySelector('.hf-dot');
  var mPath = box.querySelector('.hf-mpp');
  var mPlane = box.querySelector('.hf-mpl');

  var PERIOD = 9, FLY = 3.2, STAGGER = 0.9, END_GAP = 6, ENTER = 2.4;
  var ends = [].slice.call(svg.querySelectorAll('.hf-end'));
  var routes = [];
  paths.forEach(function (p, i) {
    if (!planes[i]) return;
    var fl = flags[i], rc = fl && fl.querySelector('.hf-r');
    routes.push({
      e: ends[i], p: p, g: planes[i], len: p.getTotalLength(), off: i * STAGGER, period: PERIOD, fly: FLY, gap: END_GAP,
      f: fl, cx: rc ? +rc.getAttribute('x') + rc.getAttribute('width') / 2 : 0, cy: rc ? +rc.getAttribute('y') + rc.getAttribute('height') / 2 : 0
    });
  });
  if (mPath && mPlane) routes.push({ p: mPath, g: mPlane, len: mPath.getTotalLength(), off: 0.6, period: 6.5, fly: 4.4, gap: 8, phone: true });
  if (!routes.length) return;

  function ease(u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  function bump(u) { return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function draw(r, T) {
    var t = T - r.off;
    var ph = t < 0 ? -1 : t % r.period;
    var fly = r.fly, op = 0, b = 0, pulse = 0;
    if (ph >= 0 && ph < fly) {
      var u = ph / fly, l = ease(u) * (r.len - r.gap);
      var a = Math.max(0, Math.min(r.len, l - 1.5)), c = Math.max(0, Math.min(r.len, l + 1.5));
      var p0 = r.p.getPointAtLength(a), p1 = r.p.getPointAtLength(c), pt = r.p.getPointAtLength(l);
      var ang = Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
      op = Math.min(clamp(u / .12), clamp((1 - u) / .16));
      r.g.setAttribute('transform', 'translate(' + pt.x.toFixed(2) + ' ' + pt.y.toFixed(2) + ') rotate(' + ang.toFixed(2) + ')');
    }
    r.g.setAttribute('opacity', op.toFixed(3));
    if (r.phone) return;
    /* arrival: flag pulse (transform only) + route glows for ~1.9 s around landing; departure: the mark's dot breathes */
    if (ph >= fly) pulse = bump((ph - fly) / .9);
    b = ph < 0 ? 0 : bump((ph - (fly - .5)) / 1.9);
    if (r.f) {
      var s = 1 + .07 * pulse;
      r.f.setAttribute('transform', pulse > 0 ? 'translate(' + r.cx + ' ' + r.cy + ') scale(' + s.toFixed(4) + ') translate(' + -r.cx + ' ' + -r.cy + ')' : '');
    }
    if (r.e) r.e.setAttribute('r', (4.5 + 1.8 * pulse).toFixed(2));
    r.p.style.opacity = (.85 + .15 * b).toFixed(3);
    r.p.style.strokeWidth = (1.6 + .9 * b).toFixed(2);
    r.dep = ph >= 0 ? bump(ph / .7) : 0;
  }

  /* entrance state: only when motion is allowed; 0 = hidden, 1 = revealed (planes wait ENTER seconds after the reveal) */
  var T = 0, last = 0, raf = 0, inView = false, shown = false;
  if (!mq.matches) box.setAttribute('data-st', '0'); else shown = true;
  function reveal() {
    if (shown) return; shown = true; T = -ENTER;
    box.setAttribute('data-st', '1');
  }
  function frame(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
    var d = 0;
    for (var i = 0; i < routes.length; i++) { if (!routes[i].on) continue; draw(routes[i], T); if (routes[i].dep > d) d = routes[i].dep; }
    if (dot) dot.setAttribute('r', (4 + 1.3 * d).toFixed(2));
    raf = requestAnimationFrame(frame);
  }
  function reset() {
    routes.forEach(function (r) {
      r.g.setAttribute('opacity', '0');
      if (r.f) r.f.removeAttribute('transform');
      if (r.e) r.e.setAttribute('r', '4.5');
      if (!r.phone) { r.p.style.opacity = ''; r.p.style.strokeWidth = ''; }
    });
    if (dot) dot.setAttribute('r', '4');
  }
  /* only the variant that is actually shown (desktop SVG or phone line) is drawn */
  function rendered() {
    routes.forEach(function (r) { r.on = (r.phone ? mPath : svg).getClientRects().length > 0; if (!r.on) { r.g.setAttribute('opacity', '0'); } });
  }
  window.addEventListener('resize', rendered);
  function sync() {
    rendered();
    var want = inView && !document.hidden && !mq.matches;
    box.classList.toggle('hf-live', want);
    if (want) reveal();
    if (want && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    else if (!want && raf) { cancelAnimationFrame(raf); raf = 0; if (mq.matches) reset(); }
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      inView = es.some(function (e) { return e.isIntersecting; }); sync();
    }, { threshold: .25 }).observe(box);
  } else { inView = true; }
  document.addEventListener('visibilitychange', sync);
  if (mq.addEventListener) mq.addEventListener('change', function () { if (mq.matches) reset(); sync(); });
  /* test hook: window.__hfDebug.seek(seconds) freezes the loop and draws that moment */
  window.__hfDebug = { seek: function (s) { inView = false; sync(); shown = true; box.setAttribute('data-st', '1'); T = s; routes.forEach(function (r) { if (r.on) draw(r, T); }); }, routes: routes };
  sync();
})();
