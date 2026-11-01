/* Asha's voice: reads a chat reply aloud and measures the audio for her lip-sync. window.DXAshaVoice =
   { ok, unlock, read(text, {lang, mood, onStart, onEnd}), stop, mouth, reading, chunks, moodOf }.
   Voice order (user rule): the server voice (POST /api/dolphin/voice: Microsoft neural voices, cached on the server and here) -> a natural
   browser voice (Natural / Online / Google / Enhanced only, never David or Zira) -> nothing: onEnd('failed') and the chat stays text only.
   read() reads the WHOLE text in up to 3 sentence chunks (the first one short so she starts soon); the next chunk is fetched while one plays.
   A new read() or stop() ends the previous one. onStart(engine) fires with the first sound; onEnd(why): done | stopped | failed.
   mouth() is how open her mouth should be right now, {open 0..1, bright 0..1}: the loudness of the audio actually playing (one AnalyserNode,
   sampled ~30 times a second); bright = where the energy sits (high "ee", low "oh"). null before the voice starts and after it ends.
   A browser voice gives no audio to measure, so its mouth follows the voice's start / word / end events instead. */
(function () {
  'use strict';
  var W = window, D = document;
  if (W.DXAshaVoice) return;
  var AC = W.AudioContext || W.webkitAudioContext, ac = null;
  var an = null, td = null, fd = null, mo = { open: 0, bright: .5 }, live = null, cur = null, turn = 0, pk = .05, mT = 0;
  var natOn = null, VC = {}, vcKeys = [];
  function noop() {}

  /* ---------- audio graph ---------- */
  function ctx() { if (!ac && AC) { try { ac = new AC(); } catch (e) { ac = null; } } if (ac && ac.state === 'suspended') ac.resume(); return ac; }
  /* every voice plays through this one analyser, so its loudness can be measured */
  function out() {
    var a = ctx(); if (!a) return null;
    if (!an) {
      an = a.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = .15; an.connect(a.destination);
      td = new Float32Array(an.fftSize); fd = new Uint8Array(an.frequencyBinCount);
    }
    return an;
  }
  function sample() {
    var target = 0, br = mo.bright, L = live;
    if (L && L.kind === 'audio' && an && ac && ac.state === 'running') {
      an.getFloatTimeDomainData(td);
      var s = 0, i; for (i = 0; i < td.length; i++) s += td[i] * td[i];
      var rms = Math.sqrt(s / td.length);
      pk = Math.max(pk * .996, rms, .03);   /* follows the voice's own level, so a quiet or a loud voice both open fully */
      target = rms < .01 ? 0 : Math.min(1, rms / (pk * .7));
      an.getByteFrequencyData(fd);
      var bin = ac.sampleRate / an.fftSize, lo = Math.max(1, Math.round(250 / bin)), hi = Math.round(4000 / bin), w = 0, sw = 0;
      for (i = lo; i < hi; i++) { w += fd[i] * i; sw += fd[i]; }
      if (sw > 0) br = Math.max(0, Math.min(1, ((w / sw) * bin - 800) / 1200));
    } else if (L && L.kind === 'tts') {
      var t = Date.now() - L.t0, word = Date.now() - L.bAt < 240;   /* a fresh word boundary opens a little wider */
      target = (.28 + .42 * Math.abs(Math.sin(t / 82))) * (word ? 1 : .8); br = (Math.sin(t / 290) + 1) / 2;
    }
    mo.open += (target - mo.open) * (target > mo.open ? .7 : .45); if (mo.open < .03) mo.open = 0;   /* opens fast, closes a touch slower */
    if (!L || !L.kind) mo.open = 0;   /* nothing playing (between chunks, at the end): shut at once */
    mo.bright += (br - mo.bright) * .35;
  }
  function mouth() { return live && live.began ? mo : null; }
  function reading() { return !!live; }

  /* ---------- the server voice ---------- */
  function voiceOn() {   /* asked once per page */
    if (!W.fetch || location.protocol === 'file:') return Promise.resolve(false);
    if (!natOn) natOn = fetch('/api/dolphin/voice', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { return !!(j && j.enabled); }, function () { return false; });
    return natOn;
  }
  /* one chunk -> a decoded AudioBuffer; the last 40 are kept so Listen again plays at once */
  function fetchVoice(text, lang) {
    var k = (lang || '') + '|' + text;
    if (VC[k]) return VC[k];
    var p = VC[k] = voiceOn().then(function (on) {
      if (!on) throw new Error('off');
      var ctl = W.AbortController ? new AbortController() : null, tm = ctl && setTimeout(function () { ctl.abort(); }, 20000);
      return fetch('/api/dolphin/voice', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, lang: lang }), signal: ctl ? ctl.signal : undefined })
        .then(function (r) {
          if (tm) clearTimeout(tm);
          if (r.status === 503) { natOn = Promise.resolve(false); setTimeout(function () { natOn = null; }, 120000); }   /* off or resting: don't ask again for 2 min */
          if (!r.ok || (r.headers.get('content-type') || '').indexOf('audio') < 0) throw new Error('voice ' + r.status);
          return r.arrayBuffer();
        }, function (e) { if (tm) clearTimeout(tm); throw e; })
        .then(function (ab) { return ctx().decodeAudioData(ab); });
    });
    vcKeys.push(k); if (vcKeys.length > 40) delete VC[vcKeys.shift()];
    p.then(null, function () { if (VC[k] === p) delete VC[k]; });
    return p;
  }
  /* play one buffer through the analyser; resolves when it ends (or is stopped) */
  function playBuf(buf) {
    return new Promise(function (res) {
      var a = ctx(), src = a.createBufferSource(), hp = a.createBiquadFilter(), g = a.createGain(), t0 = a.currentTime + .03;
      src.buffer = buf; hp.type = 'highpass'; hp.frequency.value = 70; g.gain.value = 1;
      src.connect(hp); hp.connect(g); g.connect(out());
      var fin = false, end = function (why) { if (fin) return; fin = true; if (live && live.kind === 'audio') live.kind = null; if (cur && cur.src === src) cur = null; res(why || 'done'); };
      src.onended = function () { end('done'); };
      cur = { g: g, nodes: [src], src: src, end: end };
      if (live) live.kind = 'audio';
      src.start(t0);
    });
  }
  /* fade out whatever is playing */
  function hush() {
    if (!cur || !ac) return; var n = ac.currentTime, c = cur; cur = null;
    try { c.g.gain.cancelScheduledValues(n); c.g.gain.setTargetAtTime(0, n, .02); c.nodes.forEach(function (x) { x.stop(n + .12); }); } catch (e) {}
    if (c.end) c.end('stopped');
  }

  /* ---------- the browser voice (fallback) ----------
     natural voices only (user 2026-10-31), warm female first; Nepali may use a natural Hindi voice (same script) */
  var GOOD = /natural|neural|online|google|premium|enhanced|siri/i,
    WARM = /aria|jenny|libby|sonia|maisie|natasha|clara|emma|ava|michelle|female|samantha|karen|moira|serena|tessa|neerja|swara|hemkala|heami|sunhi|xiaoxiao|huihui|elvira/i;
  function goodVoice(lang) {
    var ss = W.speechSynthesis, best = null, top = 0, want = (lang || 'en').slice(0, 2); if (!ss) return null;
    (ss.getVoices() || []).forEach(function (v) {
      var l = String(v.lang || '').toLowerCase();
      if (!GOOD.test(v.name) || /david|zira|mark\b/i.test(v.name)) return;
      if (l.indexOf(want) !== 0 && !(want === 'ne' && l.indexOf('hi') === 0)) return;
      var sc = 1 + (WARM.test(v.name) ? 3 : 0) + (/en[-_](GB|IN|AU|NZ)/i.test(v.lang) ? 1 : 0) + (l.indexOf(want) === 0 ? 4 : 0);
      if (sc > top) { top = sc; best = v; }
    });
    return best;
  }
  if (W.speechSynthesis) { try { W.speechSynthesis.getVoices(); } catch (e) {} }
  function sayTTS(part, v, L) {
    return new Promise(function (res, rej) {
      var u = new SpeechSynthesisUtterance(part), started = false,
        wd = setTimeout(function () { if (started) return; try { W.speechSynthesis.cancel(); } catch (e) {} rej(new Error('no start')); }, 3500);
      u.voice = v; u.lang = v.lang; u.rate = 1; u.pitch = 1.04;
      u.onstart = function () { started = true; clearTimeout(wd); if (live === L) { L.kind = 'tts'; L.t0 = Date.now(); L.bAt = 0; begin(L, 'browser'); } };
      u.onboundary = function () { if (live === L) L.bAt = Date.now(); };
      u.onend = function () { clearTimeout(wd); if (live === L) L.kind = null; res('done'); };
      u.onerror = function (e) { clearTimeout(wd); if (live === L) L.kind = null; if (e && (e.error === 'canceled' || e.error === 'interrupted')) return res('stopped'); rej(e); };
      try { if (W.speechSynthesis.paused) W.speechSynthesis.resume(); W.speechSynthesis.speak(u); } catch (e) { clearTimeout(wd); rej(e); }
    });
  }

  /* ---------- reading ---------- */
  /* sentences -> at most 3 chunks: the first up to ~200 characters (so she starts soon), the rest grouped up to 290 */
  function chunks(text) {
    var MAXC = 290, t = String(text || '').replace(/\s+/g, ' ').trim(); if (!t) return [];
    var sents = t.replace(/([.!?।॥]+["'”’)]?)\s+/g, '$1\n').replace(/([。！？]+)(?=\S)/g, '$1\n').split('\n'), flat = [], outp = [];
    sents.forEach(function (s) {
      s = s.trim();
      while (s.length > MAXC) {
        var at = Math.max(s.lastIndexOf(', ', MAXC), s.lastIndexOf('，', MAXC), s.lastIndexOf('、', MAXC), s.lastIndexOf(' ', MAXC));
        if (at < MAXC * .4) at = MAXC;
        flat.push(s.slice(0, at + 1).trim()); s = s.slice(at + 1).trim();
      }
      if (s) flat.push(s);
    });
    flat.forEach(function (s) {
      var n = outp.length, last = outp[n - 1];
      if (n && last.length + 1 + s.length <= (n === 1 ? 200 : MAXC)) outp[n - 1] = last + (/[。！？]$/.test(last) ? '' : ' ') + s; else outp.push(s);
    });
    return outp.slice(0, 3);
  }
  function begin(L, engine) { if (L.began || live !== L) return; L.began = true; if (L.o.onStart) try { L.o.onStart(engine); } catch (e) {} }
  function finish(L, why) {
    if (L.done) return; L.done = true;
    if (live === L) { live = null; mo.open = 0; clearInterval(mT); mT = 0; }
    if (L.o.onEnd) try { L.o.onEnd(why); } catch (e) {}
  }
  /* stop ends the current read (its onEnd gets 'stopped') and cancels the browser voice */
  function stop() {
    turn++;
    try { if (W.speechSynthesis) W.speechSynthesis.cancel(); } catch (e) {}
    hush();
    if (live) finish(live, 'stopped');
  }
  function read(text, o) {
    stop(); o = o || {};
    var my = turn, lang = String(o.lang || 'en').slice(0, 2), parts = chunks(text), L = live = { o: o, kind: null, began: false, done: false };
    if (!parts.length || !ctx()) { finish(L, 'failed'); return L; }
    if (!mT) mT = setInterval(sample, 33);
    var mine = function () { return my === turn && live === L; };
    function server(k) {
      return fetchVoice(parts[k], lang).then(function (buf) {
        if (!mine()) return 'stopped';
        if (k + 1 < parts.length) fetchVoice(parts[k + 1], lang).then(null, noop);   /* the next chunk loads while this one plays */
        begin(L, 'server'); return playBuf(buf);
      });
    }
    function browser(k) { var v = goodVoice(lang); if (!v) return Promise.reject(new Error('no natural voice')); return sayTTS(parts[k], v, L); }
    function run(k, eng) {
      if (!mine()) return;
      if (k >= parts.length) return finish(L, 'done');
      (eng === 'server' ? server(k) : browser(k)).then(function (why) {
        if (!mine() || why === 'stopped') return;
        setTimeout(function () { run(k + 1, eng); }, /[?？]$/.test(parts[k]) ? 220 : 120);   /* a short breath between chunks */
      }, function () {
        if (!mine()) return;
        if (eng === 'server' && goodVoice(lang)) return run(k, 'browser');
        finish(L, L.began ? 'done' : 'failed');
      });
    }
    run(0, 'server');
    return L;
  }

  /* a reply's mood, for her expression while she speaks */
  function moodOf(text) {
    var t = String(text || '').toLowerCase();
    if (/sorry|cannot|can't|not sure|don't know|went wrong|unable/.test(t)) return 'sad';
    if (/thank|great|congrat|धन्यवाद|gracias|감사|谢谢/.test(t)) return 'excited';
    if (/\bnpr\b|cost|fee|\$|£|visa|document|ielts|deadline/.test(t)) return 'curious';
    return 'happy';
  }

  W.DXAshaVoice = { ok: !!AC, unlock: ctx, read: read, stop: stop, mouth: mouth, reading: reading, chunks: chunks, moodOf: moodOf };
})();
