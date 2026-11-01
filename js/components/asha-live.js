/* Asha, the photo-real chat assistant. Pictures are made locally (see img/asha/README.md): per look a cut-out body photo per gesture
   (rest, namaste, and wave when a look has one) and, shared by every look because the face pixels are identical in every body photo:
   whole-face expressions (cross-faded), mouth-only lip-sync shapes and eye-only blink frames laid over them.
   She is live in real time: breathing and a slight sway, blinks every 2-6 s (now and then a double blink, a slow one when idle),
   expressions that cross-fade, and a namaste with a small bow and softly lowered eyes.
   Lip-sync (2026-11-01 night): lip(src, mood) makes her mouth follow her voice: src() is polled every 25 ms (js/dolphin.js
   sound.mouth: {open, bright} measured from the audio that is playing, or null once it has ended) and picks talk_a (wide), talk_e
   ("ee", bright sound) or talk_o ("oh"), and her own closed mouth in every pause; when src() returns null she stops at once.
   say(text, mood, {short:true}) is the "silent talk" for a text-only reply: a second or so of small mouth moves, then rest.
     DXAshaLive.mount(el, {view: 'bust'|'face', look}) -> {lip(src, mood), say(text, mood, opts), talkPlan(plan, mood), mood(name, ms),
       trick(name), setLook(look), destroy()}
   Reduced motion: no breathing, sway or bow, and no mouth movement (the voice may still read); faces change without fades. */
(function () {
  'use strict';
  var W = window, D = document;
  if (W.DXAshaLive) return;
  var M = W.DXAshaAssets;   /* js/asha-assets.js: {base, looks, faces, box, frame, mouths, mbox, eyes, ebox} */
  if (!M) return;
  var RM = !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var FACES = M.faces || [], MOUTHS = M.mouths || [], EYES = M.eyes || [];
  var LIPSYNC = false;   /* set true to turn the lip-sync mouths back on */
  var EXPR = { neutral: 'base', happy: 'happy', curious: 'thinking', thinking: 'thinking', surprised: 'surprised', sad: 'sorry', sorry: 'sorry', excited: 'laugh', laugh: 'laugh' };
  var POSE = { wave: 'wave', jump: 'wave', roll: 'wave', spin: 'wave', hi: 'wave', namaste: 'namaste', tailwalk: 'namaste', nod: 'namaste', bubble: 'rest', breath: 'rest', shake: 'rest' };
  /* blinks through 5 lid positions (blink0 .18, blink1 .38, blink2 .64, blink3 .86, blink closed); frames a manifest lacks are skipped */
  var BLINK = [['blink0', 16], ['blink1', 18], ['blink2', 18], ['blink3', 18], ['blink', 38], ['blink3', 20], ['blink2', 20], ['blink1', 22], ['blink0', 22]];
  var SLOW = [['blink0', 40], ['blink1', 45], ['blink2', 50], ['blink3', 55], ['blink', 170], ['blink3', 55], ['blink2', 50], ['blink1', 45], ['blink0', 40]];
  function url(p) { return M.base + p + '.webp'; }
  function box(b) { var f = M.frame; return 'left:' + b[0] / f[0] * 100 + '%;top:' + b[1] / f[1] * 100 + '%;width:' + (b[2] - b[0]) / f[0] * 100 + '%;height:' + (b[3] - b[1]) / f[1] * 100 + '%'; }
  /* a plan step -> a mouth: a viseme name as it is, or jaw degrees (wide open, teeth "ee", rounded "oh", closed = the expression's own mouth).
     The 7 visemes (2026-11-01 late): closed, talk_a, talk_e, talk_o, talk_u (oo/w), talk_m (m/b/p, lips pressed), talk_f (f/v, teeth on lip);
     a missing one falls back to the nearest of the original three. */
  var NEAR = { talk_u: 'talk_o', talk_m: null, talk_f: 'talk_e' };
  function has(m) { return m && MOUTHS.indexOf(m) > -1; }
  function pick(m) { return has(m) ? m : (m in NEAR && has(NEAR[m])) ? NEAR[m] : null; }
  function mouth(deg) { if (typeof deg === 'string') return pick(deg); var m = deg >= 11 ? 'talk_a' : deg >= 6 ? 'talk_e' : deg >= 3 ? 'talk_o' : null; return pick(m); }
  function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

  if (!D.getElementById('dxa-live-css')) {
    var st = D.createElement('style'); st.id = 'dxa-live-css';
    st.textContent = '.dxa .dxa-fig{animation:none!important;will-change:transform}' +
      '.dxa .dxa-face,.dxa .dxa-mouth,.dxa .dxa-eyes{position:absolute;display:block;visibility:visible;opacity:0;user-select:none;pointer-events:none}' +
      '.dxa .dxa-face{transition:opacity .24s ease-out}.dxa .dxa-mouth{transition:opacity .07s linear}.dxa .dxa-face.is-on,.dxa .dxa-mouth.is-on,.dxa .dxa-eyes.is-on{opacity:1}' +
      '@media (prefers-reduced-motion:reduce){.dxa .dxa-face,.dxa .dxa-mouth{transition:none}}';
    D.head.appendChild(st);
  }

  function Live(el, opts) {
    opts = opts || {};
    this.el = el; this.view = opts.view || 'bust'; this.alive = true;
    this.look = M.looks[opts.look] ? opts.look : Object.keys(M.looks)[0];
    this.pose = 'rest'; this.moodFace = 'base'; this.talk = null; this.moodT = 0; this.poseT = 0; this.bowAt = 0; this.blink = null;
    var b = this.box = D.createElement('span'); b.className = 'dxa dxa-v-' + this.view; b.setAttribute('aria-hidden', 'true');
    b.innerHTML = '<span class="dxa-fig"><img class="dxa-body is-on" alt="" draggable="false"><img class="dxa-body" alt="" draggable="false">' +
      '<img class="dxa-face" alt="" draggable="false" style="' + box(M.box) + '"><img class="dxa-face" alt="" draggable="false" style="' + box(M.box) + '">' +
      (M.mbox ? '<img class="dxa-mouth" alt="" draggable="false" style="' + box(M.mbox) + '"><img class="dxa-mouth" alt="" draggable="false" style="' + box(M.mbox) + '">' : '') +
      (M.ebox ? '<img class="dxa-eyes" alt="" draggable="false" style="' + box(M.ebox) + '">' : '') + '</span>';
    el.appendChild(b);
    this.fig = b.querySelector('.dxa-fig'); this.bodies = b.querySelectorAll('.dxa-body'); this.faces = b.querySelectorAll('.dxa-face');
    this.mouthImgs = b.querySelectorAll('.dxa-mouth'); this.mcur = 0; this.eyeImg = b.querySelector('.dxa-eyes'); this.cur = 0; this.fcur = 0;
    this.bodies[0].src = url(this.look + '/rest');
    this.preload();
    var now = Date.now(); this.t0 = now; this.blinkAt = now + 1600 + Math.random() * 2400; this.idleAt = now + 9000; this.lastAct = now;
    this.timer = setInterval(this.tick.bind(this), 25);
    var self = this; this.raf = 0;
    if (!RM) { var loop = function () { if (!self.alive) return; self.move(); self.raf = W.requestAnimationFrame(loop); }; this.raf = W.requestAnimationFrame(loop); }
    if (this.view === 'bust') setTimeout(function () { if (self.alive && !self.busy()) self.trick('namaste'); }, 700);   /* she greets with a namaste */
  }
  Live.prototype.preload = function () {
    var self = this, list = M.looks[this.look].map(function (p) { return self.look + '/' + p; })
      .concat(FACES.map(function (f) { return 'face/' + f; }), MOUTHS.map(function (f) { return 'mouth/' + f; }), EYES.map(function (f) { return 'eyes/' + f; }));
    list.forEach(function (p) { var i = new Image(); i.src = url(p); });
  };
  /* whole-face expression: cross-fade between two layers ('base' = the body photo's own face) */
  Live.prototype.setFace = function (f) {
    if (f !== 'base' && FACES.indexOf(f) < 0) f = 'base';
    if (f === 'base' && FACES.indexOf('neutral') > -1) f = 'neutral';   /* the 2x neutral face, so the face is always as sharp as the expressions */
    if (f === this.shown) return; this.shown = f;
    var prev = this.faces[this.fcur];
    if (f === 'base') { prev.classList.remove('is-on'); return; }
    var next = this.faces[1 - this.fcur], self = this;
    next.onload = function () { if (self.shown !== f) return; next.classList.add('is-on'); prev.classList.remove('is-on'); self.fcur = 1 - self.fcur; };
    next.src = url('face/' + f);
  };
  Live.prototype.layer = function (img, dir, name) {
    if (!img) return;
    if (!name) { img.classList.remove('is-on'); img._n = ''; return; }
    if (img._n !== name) { img.src = url(dir + '/' + name); img._n = name; }
    img.classList.add('is-on');
  };
  /* lip-sync mouth: two layers cross-fade in ~70 ms so shapes never pop; null fades fully out (her own closed mouth shows) */
  Live.prototype.setMouth = function (name) {
    if (!LIPSYNC) name = null;   /* lip-sync paused (user 2026-11-02: the talking mouths flash white); she keeps her own closed mouth */
    var L = this.mouthImgs; if (!L || !L.length) return;
    if (name === this.mname) return; this.mname = name;
    var cur = L[this.mcur];
    if (!name) { cur.classList.remove('is-on'); return; }
    var nx = L.length > 1 ? L[1 - this.mcur] : cur;
    if (nx._n !== name) { nx.src = url('mouth/' + name); nx._n = name; }
    nx.classList.add('is-on'); if (nx !== cur) { cur.classList.remove('is-on'); this.mcur = 1 - this.mcur; }
  };
  Live.prototype.setPose = function (p, hold) {
    if (this.view === 'face' || M.looks[this.look].indexOf(p) < 0) return false;
    this.poseT = hold ? Date.now() + hold : 0;
    if (p === this.pose) return true; this.pose = p;
    var next = this.bodies[1 - this.cur], prev = this.bodies[this.cur], self = this;
    next.onload = function () { next.classList.add('is-on'); prev.classList.remove('is-on'); self.cur = 1 - self.cur; };
    next.src = url(this.look + '/' + p);
    return true;
  };
  Live.prototype.setLook = function (look) {
    if (!M.looks[look] || look === this.look) return this;
    this.look = look; var p = this.pose; this.pose = ''; this.preload(); this.setPose(M.looks[look].indexOf(p) > -1 ? p : 'rest');
    if (this.view === 'face') this.bodies[this.cur].src = url(look + '/rest');
    return this;
  };
  /* breathing, a slight sway and the namaste bow, every frame */
  Live.prototype.move = function () {
    var now = Date.now(), t = (now - this.t0) / 1000;
    var breath = Math.sin(t * 2 * Math.PI / 4.8), sway = Math.sin(t * 2 * Math.PI / 7.3) * .3 + Math.sin(t * 2 * Math.PI / 3.1) * .12;
    var bow = 0;
    if (this.bowAt) { var k = now - this.bowAt; bow = k < 520 ? ease(k / 520) : k < 1900 ? 1 : ease(1 - (k - 1900) / 650); if (k > 2550) this.bowAt = 0; }
    var talkNod = this.busy() ? Math.sin(t * 2 * Math.PI / .9) * .18 : 0;
    var s = 1 + breath * .005, ty = -breath * .25 + bow * 1.6, rot = sway + talkNod + bow * .6, sy = 1 - bow * .012;
    this.fig.style.transform = (this.view === 'bust' ? 'translateX(-50%) ' : '') + 'translateY(' + (this.view === 'bust' ? ty : ty * .4).toFixed(3) + '%) rotate(' +
      (this.view === 'bust' ? rot : rot * .5).toFixed(3) + 'deg) scale(' + s.toFixed(4) + ',' + (s * sy).toFixed(4) + ')';
  };
  Live.prototype.startBlink = function (now, slow) {
    var ok = function (s) { return s.filter(function (f) { return !f[0] || EYES.indexOf(f[0]) > -1; }); };
    var seq = ok(slow ? SLOW : BLINK);
    if (!slow && Math.random() < .15) seq = seq.concat([[null, 110]], ok(BLINK));   /* now and then a double blink */
    this.blink = { seq: seq, i: 0, at: now };
    this.blinkAt = now + 2000 + Math.random() * 4000;
  };
  Live.prototype.tick = function () {
    if (!this.alive) return; if (!this.el.isConnected) return this.destroy();
    var now = Date.now(), face = this.moodFace, mo = null, eye = null;
    if (this.moodT && now > this.moodT && !this.busy()) { this.moodT = 0; this.moodFace = face = 'base'; }
    if (this.poseT && now > this.poseT) { this.poseT = 0; this.setPose('rest'); }
    if (this.talk) {
      var tk = this.talk;
      while (tk.i < tk.tl.length && now - tk.at >= tk.tl[tk.i][1]) { tk.at += tk.tl[tk.i][1]; tk.i++; }
      if (tk.i >= tk.tl.length) { this.talk = null; this.lastAct = now; } else if (!RM) mo = mouth(tk.tl[tk.i][0]);
    }
    if (this.lipSrc) {
      var lv = null; try { lv = this.lipSrc(); } catch (e) {}
      if (!lv) { this.lipSrc = null; this.lipM = null; this.moodT = now + 1500; this.lastAct = now; }   /* the voice ended: mouth shut now, the mood lingers a moment */
      else if (!RM) mo = this.lipShape(lv, now);
    }
    if (this.bowAt && now - this.bowAt > 380 && now - this.bowAt < 2100 && !this.busy()) eye = 'sleepy';   /* eyes softly lowered in the namaste */
    if (face === 'wink') { face = 'happy'; eye = 'wink'; }
    if (!LIPSYNC) face = 'base';   /* user 2026-11-02: only her closed-lip smile and the eye moves (blink, wink, lowered eyes); no mouth changes */
    if (!this.blink && now > this.blinkAt && !this.bowAt) this.startBlink(now, !this.busy() && now - this.lastAct > 8000 && Math.random() < .3);
    if (this.blink) {
      var bl = this.blink;
      while (bl.i < bl.seq.length && now - bl.at >= bl.seq[bl.i][1]) { bl.at += bl.seq[bl.i][1]; bl.i++; }
      if (bl.i >= bl.seq.length) this.blink = null; else eye = bl.seq[bl.i][0] || eye;
    }
    if (eye && EYES.indexOf(eye) < 0) eye = null;
    if (now > this.idleAt && !this.busy() && !this.poseT) this.idle(now);
    this.setFace(face);
    this.setMouth(mo);
    this.layer(this.eyeImg, 'eyes', eye);
  };
  /* small things she does when nobody is talking: a glance, a smile, now and then a namaste or a wink */
  Live.prototype.idle = function (now) {
    this.idleAt = now + 9000 + Math.random() * 8000; var r = Math.random();
    if (r < .3) this.mood('thinking', 1400);
    else if (r < .6) this.mood('happy', 1800);
    else if (r < .78 && this.view === 'bust') this.trick('namaste');
    else if (r < .88) { this.moodFace = 'wink'; this.moodT = now + 420; }
  };
  Live.prototype.mood = function (name, ms) { this.moodFace = EXPR[name] || 'base'; this.moodT = ms ? Date.now() + ms : 0; this.lastAct = Date.now(); return this; };
  Live.prototype.talkPlan = function (tl, mood) {
    var ms = 0; tl.forEach(function (x) { ms += x[1]; });
    this.lipSrc = null; this.talk = { tl: tl.concat([[0, 120]]), i: 0, at: Date.now() }; this.mood(mood || 'happy', ms + 1500); return this;
  };
  Live.prototype.busy = function () { return !!(this.talk || this.lipSrc); };
  /* talking along with her voice: src() -> {open, bright} | null (see the header) */
  Live.prototype.lip = function (src, mood) {
    this.talk = null; this.lipSrc = src || null; this.lipM = null; this.lastAct = Date.now();
    if (src) { this.moodFace = EXPR[mood] || 'happy'; this.moodT = 0; }   /* the reply's mood holds while she speaks */
    return this;
  };
  /* loudness + brightness -> one of the 7 visemes; a shape holds at least 70 ms so it never flickers, but closing is immediate.
     open: how loud now; bright: where the energy sits (high = ee / f, low = oo / oh). A short dip inside speech is the lips pressing (m/b/p). */
  Live.prototype.lipShape = function (lv, now) {
    var o = lv.open, b = lv.bright, want;
    if (o < .14) want = (this.lipM && this.lipM !== 'talk_m' && now - (this.loudAt || 0) < 110) ? 'talk_m' : null;
    else { this.loudAt = now; want = o > .62 ? 'talk_a' : (b > .8 && o < .36) ? 'talk_f' : b > .5 ? 'talk_e' : (b < .25 && o < .45) ? 'talk_u' : 'talk_o'; }
    want = pick(want);
    if (want !== this.lipM && (!want || now - (this.lipAt || 0) >= 70)) { this.lipM = want; this.lipAt = now; }
    return this.lipM;
  };
  Live.prototype.say = function (text, mood, opts) {
    var short = opts && opts.short, s = String(text || '').toLowerCase(), tl = [];
    if (short) s = s.slice(0, 26).replace(/\s+\S*$/, '');   /* the silent talk: just the first few words, small mouth moves */
    s.slice(0, 220).split('').forEach(function (c) {
      /* letters -> visemes (Latin and Devanagari): a, e/i, o, u/w, m/b/p, f/v; other letters a small "ee"; spaces and stops closed */
      var v = /[aाआ]/.test(c) ? 'talk_a' : /[o]|[ोौ]/.test(c) ? 'talk_o' : /[uw]|[उऊुू]/.test(c) ? 'talk_u' : /[ei]|[ेैिीइईए]/.test(c) ? 'talk_e' :
        /[mbpमबपभ]/.test(c) ? 'talk_m' : /[fvफ]/.test(c) ? 'talk_f' : /[a-z0-9ऀ-ॿ぀-鿿가-힯]/.test(c) ? 'talk_e' : 0;
      if (short && v === 'talk_a') v = 'talk_e';
      tl.push([v, /[.,!?।]/.test(c) ? 200 : c === ' ' ? 50 : 66]);
    });
    if (!tl.length) return this.mood(mood || 'happy', 1800);
    return this.talkPlan(tl, mood);
  };
  Live.prototype.surfaceSay = function (text, mood, fn) { if (fn) fn(); else this.say(text, mood); };
  Live.prototype.trick = function (name) {
    var p = POSE[name]; if (!p) return this;
    if (p === 'wave' && M.looks[this.look].indexOf('wave') < 0) p = 'namaste';   /* no wave picture for this look: greet with a namaste */
    var ok = this.setPose(p, p === 'rest' ? 0 : p === 'namaste' ? 2600 : 2200);
    if (p === 'namaste' && ok && !RM) this.bowAt = Date.now();
    if (!this.busy()) { this.moodFace = name === 'shake' ? 'sorry' : p === 'rest' ? 'base' : 'happy'; this.moodT = Date.now() + 2200; }
    this.lastAct = Date.now();
    return this;
  };
  Live.prototype.destroy = function () {
    this.alive = false; clearInterval(this.timer); if (this.raf) W.cancelAnimationFrame(this.raf);
    if (this.box.parentNode) this.box.parentNode.removeChild(this.box);
  };

  W.DXAshaLive = { mount: function (el, opts) { return new Live(el, opts); }, looks: Object.keys(M.looks) };
})();
