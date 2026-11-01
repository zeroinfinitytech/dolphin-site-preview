/* Ask Dolphin answer engine (UMD: the server requires it, the browser loads it as window.DolphinChatKB for the static-preview fallback).
   The knowledge base itself lives in server/chat-kb.json (single source). site/js/chat-kb-data.js is a generated copy for the browser:
   after editing the JSON run `node site/js/chat-kb.js --build` (npm test fails while the two differ).
   v2 (2026-10-30): answers are STRUCTURED so the widget can render them properly, and sound like a person:
     {id, type:'cards'|'list'|'text', intro, cards:[{title, slug, rows:[{label,value,muted}], body, link:{label,href}}], items:[string|[lead,text]],
      caveat, next, links:[{label,href}], suggest:[{label,q}], acts:['whatsapp'|'call'|'lead'], country, confident, source, text}
   `text` is the same answer as plain text for clients that cannot render the structure.
   Small talk (greetings, thanks, "are you a bot", "what can you do", complaints...) is answered warmly before any fact matching.
   Matching: canonical tokens (phrase + word synonyms, light plural stemming), TF-IDF over each entry's question + keywords, prefix and
   one/two-edit typo tolerance, a coverage check so an off-topic question gets the honest handoff instead of grabbing one shared word. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.DolphinChatKB = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var STOP = ' a an the is are am was be been i me my mine to for of in on at by do does did can could would should will shall what which how why who whom whose you your yours it its this that these those and or but if so with from as into there here any some please pls plz tell know want like need get got we our us they them their he she his her have has had just also very really much many more most about give let lets im ive id dont does doesnt isnt will would kindly sir madam maam dai didi hai ho cha chha ke ko ma ra ni ok okay yes no not bro dude buddy friend dolphin again then now well u ur r ';
  var GENERIC = ' study studying abroad info information go going option options detail details life student students overview general there country ';
  var CF = 'Confirm with your counsellor';
  var DEVA = /[ऀ-ॿ]/;
  function isStop(t) { return STOP.indexOf(' ' + t + ' ') > -1; }
  function stem(t) { return (t.length > 4 && /s$/.test(t) && !/(ss|us|is)$/.test(t)) ? t.slice(0, -1) : t; }
  function norm(s) { return ' ' + String(s || '').toLowerCase().replace(/<[^>]*>/g, ' ').replace(/[’']/g, '').replace(/[^a-z0-9ऀ-ॿ]+/g, ' ').replace(/[।॥]/g, ' ').replace(/([a-z])\1{2,}/g, '$1').replace(/\s+/g, ' ').trim() + ' '; }

  /* sweep v8.16: a country with "hidden": true in chat-kb.json (Canada, "4 countries for now") keeps its data but is never matched,
     listed or carded; its name then falls to the "other countries" entry. Delete the flag to bring it back. */
  function live(kb) { return (kb.countries || []).filter(function (c) { return !c.hidden; }); }
  function prep(kb) {
    if (kb._ix) return kb._ix;
    var syn = kb.synonyms || { phrases: {}, words: {} };
    var phrases = Object.keys(syn.phrases || {}).sort(function (a, b) { return b.length - a.length; });
    var words = syn.words || {};
    var ctok = {}; live(kb).forEach(function (c) { ctok[c.token] = c; });
    var htok = {}; (kb.countries || []).forEach(function (c) { if (c.hidden) htok[c.token] = c; });
    function toks(s) {
      s = norm(s);
      for (var i = 0; i < phrases.length; i++) { var p = ' ' + phrases[i] + ' '; while (s.indexOf(p) > -1) s = s.split(p).join(' ' + syn.phrases[phrases[i]] + ' '); }
      /* Nepali: a word may carry a postposition (भिसाको, अष्ट्रेलियामा); Devanagari words with no synonym carry no meaning for the matcher, so they drop out */
      return s.trim().split(' ').filter(Boolean).map(function (t) {
        var w = words[t];
        if (!w && DEVA.test(t)) w = words[t.replace(/(हरूको|हरुको|हरूलाई|हरूमा|हरू|हरु|को|का|की|मा|लाई|ले|बाट)$/, '')];
        w = w || t; w = stem(w); return words[w] || w;
      }).filter(function (t) { return !DEVA.test(t); });
    }
    var docs = (kb.entries || []).map(function (e) {
      var set = {}; toks(e.q + ' ' + (e.k || '')).forEach(function (t) { if (!isStop(t) && !ctok[t]) set[t] = 1; });
      var qt = toks(e.q), tset = {}; qt.forEach(function (t) { tset[t] = 1; });
      return { e: e, set: set, tset: tset, qn: qt.join(' ') };
    });
    var df = {}; docs.forEach(function (d) { Object.keys(d.set).forEach(function (t) { df[t] = (df[t] || 0) + 1; }); });
    var idf = {}, N = docs.length; Object.keys(df).forEach(function (t) { idf[t] = Math.log(1 + N / df[t]); });
    var byId = {}; docs.forEach(function (d) { byId[d.e.id] = d.e; });
    var small = (kb.smalltalk || []).map(function (s) { return { s: s, res: s.re.map(function (r) { return new RegExp(' (?:' + r + ')(?= )', 'g'); }) }; });
    kb._ix = { toks: toks, docs: docs, idf: idf, ctok: ctok, htok: htok, byId: byId, small: small };
    return kb._ix;
  }

  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur, i, j; for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i]; var lo = i;
      for (j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); if (cur[j] < lo) lo = cur[j]; }
      if (lo > max) return max + 1; prev = cur;
    }
    return prev[b.length];
  }
  function sim(t, d) {
    if (t === d) return 1;
    var m = Math.min(t.length, d.length);
    if (m >= 4 && (d.indexOf(t) === 0 || t.indexOf(d) === 0)) return 0.8;
    if (t.length >= 5 && d.length >= 4) { var max = t.length >= 8 ? 2 : 1; if (lev(t, d, max) <= max) return 0.7; }
    return 0;
  }
  function countryOf(tokens, ix) {
    for (var i = tokens.length - 1; i >= 0; i--) {
      var t = tokens[i]; if (ix.ctok[t]) return ix.ctok[t];
      if (t.length >= 5) for (var k in ix.ctok) if (k.length >= 5 && lev(t, k, 2) <= (k.length >= 8 ? 2 : 1)) return ix.ctok[k];
    }
    return null;
  }
  /* a misspelt word that is not in the vocabulary is corrected towards a synonym key ("tution" -> tuition -> cost) before matching */
  function fix(t, ix, kb) {
    if (t.length < 5 || ix.idf[t]) return t;
    var words = (kb.synonyms && kb.synonyms.words) || {}, max = t.length >= 8 ? 2 : 1;
    for (var w in words) if (w.length >= 5 && lev(t, w, max) <= max) return words[w];
    return t;
  }
  function contactOf(kb, over) { var c = {}, k; for (k in kb.contact) c[k] = kb.contact[k]; if (over) for (k in over) if (over[k] != null && typeof over[k] !== 'object') c[k] = over[k]; return c; }
  function rng(seed) { if (seed == null || isNaN(seed)) return Math.random; var a = (Number(seed) >>> 0) || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var NAME_RE = / (?:my name is|my names|name is|call me|i am called|im called|mero naam|mero nam|mero name) ([a-z]{2,20})(?= )/;
  var NOT_NAME = ' not a an the from looking interested student going planning very so too here there ';
  function nameIn(s) { var m = NAME_RE.exec(norm(s)); return m && NOT_NAME.indexOf(' ' + m[1] + ' ') < 0 ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : null; }

  /* answer(kb, message, {history:[{role,text}], page, contact, seed}) -> structured answer (see top) */
  function answer(kb, message, opts) {
    opts = opts || {}; var ix = prep(kb), C = contactOf(kb, opts.contact), R = rng(opts.seed), hist = opts.history || [];
    var pick = function (v) { if (v == null) return ''; if (typeof v === 'string') return v; return v.length ? v[Math.floor(R() * v.length)] : ''; };
    var name = nameIn(message), h, i;
    for (h = hist.length - 1; h >= 0 && !name; h--) if (hist[h] && hist[h].role === 'user') name = nameIn(hist[h].text);
    var nameNow = !!nameIn(message);

    /* small talk: which intent, and what is left once its phrases (and a "my name is ..." phrase) are taken out */
    var s = norm(message).replace(NAME_RE, ' '), st = null;
    for (i = 0; i < ix.small.length; i++) { var S2 = ix.small[i]; for (var j = 0; j < S2.res.length; j++) { S2.res[j].lastIndex = 0; if (S2.res[j].test(s)) { st = st || S2.s; break; } } }
    if (st) ix.small.forEach(function (S2) { S2.res.forEach(function (r) { s = s.replace(r, ' '); }); });
    var tokens = ix.toks(s);
    var meaningful = tokens.filter(function (t) { return !isStop(t) && !/^\d+$/.test(t) && GENERIC.indexOf(' ' + t + ' ') < 0; });
    if ((st || nameNow) && !meaningful.length) return small(st || byIntent('hello'));

    /* facts */
    var here = countryOf(tokens, ix), ctx = here;
    /* a hidden country asked about by name (and no live one): the honest "other countries" answer, never its old figures */
    if (!here && ix.byId.other && tokens.some(function (t) { return ix.htok[t]; })) return fin(entry(ix.byId.other, null, null));
    if (!ctx) for (h = hist.length - 1; h >= 0 && !ctx; h--) { var m = hist[h]; if (m && m.role === 'user') ctx = countryOf(ix.toks(m.text), ix); }
    if (!ctx && opts.page) { var pm = /country[:=]?([\w-]+)/.exec(String(opts.page)); if (pm) live(kb).forEach(function (c) { if (c.slug === pm[1]) ctx = c; }); }
    var q = tokens.filter(function (t) { return !isStop(t) && !/^\d+$/.test(t) && !ix.ctok[t] && !(here && countryOf([t], ix) === here); }).map(function (t) { return fix(t, ix, kb); });
    var qn = tokens.join(' '), best = null, bestS = 0, bestCov = 0, exact = null;
    ix.docs.forEach(function (d) { if (d.qn === qn) exact = d; });
    if (exact) { best = exact; bestS = 99; bestCov = 1; }
    else if (q.length) {
      var uq = q.filter(function (t, k) { return q.indexOf(t) === k; });
      ix.docs.forEach(function (d) {
        var sc = 0, hit = 0;
        uq.forEach(function (t) { var b = 0; for (var k in d.set) { var v = sim(t, k); if (v) { v *= ix.idf[k] * (d.tset[k] ? 1.25 : 1); if (v > b) b = v; } } if (b) { sc += b; hit++; } }); /* a word in the entry's own question counts a little more */
        if (sc > bestS) { bestS = sc; best = d; bestCov = hit / uq.length; }
      });
    }
    var generic = q.every(function (t) { return GENERIC.indexOf(' ' + t + ' ') > -1; });
    var out;
    if (here && (generic || !best || bestS < 1.6)) out = overview(here);
    else if (best && (exact || (bestS >= 1.6 && bestCov >= 0.6) || (bestS >= 3 && bestCov >= 0.34))) out = entry(best.e, ctx, here);
    else if (st) return small(st);
    else return fallback();
    if (st && st.id === 'hello') out.intro = 'Namaste' + (name ? ', ' + name : '') + '! ' + out.intro;
    return fin(out);

    /* ---- builders ---- */
    function byIntent(id) { return (kb.smalltalk || []).filter(function (x) { return x.id === id; })[0]; }
    function vars(c) { var v = {}, k; for (k in C) v[k] = C[k]; v.name = name ? ', ' + name : ''; if (c) { v.country = c.name; v.short = (kb.short || {})[c.slug] || c.name; v.tagline = c.tagline.charAt(0).toLowerCase() + c.tagline.slice(1); } return v; }
    function fill(str, c) { var v = vars(c); return String(str || '').replace(/\{(\w+)\}/g, function (mm, k) { return v[k] != null ? v[k] : mm; }); }
    function variant(x, c) { if (x && !Array.isArray(x) && typeof x === 'object') x = c ? x.one : x.all; return fill(pick(x), c); }
    function base(id) { return { id: id, type: 'text', intro: '', cards: [], items: [], caveat: '', next: '', links: [], suggest: [], acts: [], country: null, confident: true, source: 'engine' }; }
    function sugg(ids, extra) {
      var out2 = [], P = kb.pills || {};
      (ids || []).concat(extra || []).forEach(function (id) { var p = P[id] ? { label: P[id][0], q: P[id][1] } : ix.byId[id] ? { label: ix.byId[id].label || ix.byId[id].q, q: ix.byId[id].q } : null; if (p && !out2.some(function (o) { return o.q === p.q; })) out2.push(p); });
      return out2;
    }
    function shortCap(c) { var s3 = (kb.short || {})[c.slug] || c.name; return s3.charAt(0).toUpperCase() + s3.slice(1); }
    function link(c) { return { label: 'See ' + ((kb.short || {})[c.slug] || c.name), href: 'country.html?c=' + c.slug }; }
    function rows(c, re) { return c.glance.filter(function (g) { return !re || re.test(g[0]); }).map(function (g) { return { label: (kb.labels || {})[g[0]] || g[0], value: g[1], muted: g[1] === CF }; }); }
    function steps(c) { return c.visa.replace(/\.$/, '').split(/, /).map(function (x) { return x.charAt(0).toUpperCase() + x.slice(1); }); }
    function small(sm) {
      var o = base('st:' + sm.id); o.intro = fill(pick(sm.say)); o.suggest = sugg(sm.follow, sm.more); o.acts = (sm.acts || []).slice(); return fin(o);
    }
    function fallback() {
      var f = kb.fallback, o = base('fallback'); o.intro = fill(pick(f.intro)); o.next = fill(pick(f.next)); o.suggest = sugg(f.follow); o.acts = f.acts.slice(); o.confident = false; o.country = ctx ? ctx.slug : null; return fin(o);
    }
    function overview(c) {
      var o = base('country:' + c.slug); o.type = 'cards'; o.country = c.slug;
      o.intro = fill(pick(['{country} in brief: {tagline}.', 'Here is {short} at a glance. In short: {tagline}.']), c);
      o.cards = [{ title: c.name, slug: c.slug, rows: rows(c), link: link(c) }];
      o.caveat = 'Where it says confirm, your counsellor will check the details for your course.';
      o.next = fill('Shall I go through the visa steps for {short}, or the partner universities there?', c);
      o.suggest = [{ label: 'Visa steps', q: 'How does the student visa work in ' + c.name + '?' }, { label: 'Partner universities', q: 'Which universities does Dolphin work with in ' + c.name + '?' }, { label: 'Talk to a counsellor', q: 'How can I talk to a counsellor?' }];
      return o;
    }
    function entry(e, ctxC, hereC) {
      var o = base(e.id), one = null;
      if (e.facet) {
        one = ctxC || null; o.country = one ? one.slug : null;
        var cs = one ? [one] : live(kb);
        if (e.facet === 'visa') {
          if (one) { o.type = 'list'; o.items = steps(one); o.links = [link(one)]; }
          else { o.type = 'cards'; o.cards = cs.map(function (c) { return { title: c.name, slug: c.slug, rows: [], body: steps(c).join(', ') + '.', link: link(c) }; }); }
        } else {
          var re = new RegExp(e.facet); o.type = 'cards';
          o.cards = cs.map(function (c) { return { title: c.name, slug: c.slug, rows: rows(c, re), link: link(c) }; }).filter(function (c) { return c.rows.length; });
        }
      } else if (e.id === 'partners') {
        one = hereC || null; o.country = one ? one.slug : null;
        var by = (kb.partners || {}).byCountry || {};
        if (one) { var l = by[one.slug] || []; if (l.length) { o.type = 'list'; o.items = l.slice(); } else { o.intro = fill(e.empty, one); } }
        else { o.type = 'cards'; o.cards = live(kb).map(function (c) { var l2 = by[c.slug] || []; return { title: c.name, slug: c.slug, rows: [], body: l2.length ? l2.join(', ') + '.' : fill(e.empty, c), link: link(c) }; }); }
      } else if (e.items) { o.type = 'list'; o.items = e.items.map(function (x) { return Array.isArray(x) ? [fill(x[0]), fill(x[1])] : fill(x); }); }
      if (!o.intro) o.intro = variant(e.intro, one);
      o.caveat = variant(e.caveat, one); o.next = variant(e.next, one);
      o.links = o.links.concat((e.links || []).map(function (x) { return { label: x[0], href: x[1] }; }));
      o.suggest = sugg(e.follow).filter(function (p) { return p.q !== e.q; }).slice(0, 3);
      o.acts = (e.acts || []).slice();
      if (one && e.facet) o.suggest = o.suggest.map(function (p) { return p; });
      return o;
    }
    function fin(o) { o.text = plain(o); return o; }
  }

  /* the same answer as plain text (clients that cannot render the structure, the model's history, logs never) */
  function plain(o) {
    var L = [o.intro];
    (o.cards || []).forEach(function (c) { L.push(c.title + (c.body ? ': ' + c.body : '')); (c.rows || []).forEach(function (r) { L.push('  ' + r.label + ': ' + r.value); }); });
    (o.items || []).forEach(function (x) { L.push('- ' + (Array.isArray(x) ? x[0] + ': ' + x[1] : x)); });
    if (o.caveat) L.push(o.caveat); if (o.next) L.push(o.next);
    (o.links || []).forEach(function (l) { L.push(l.label + ': ' + l.href); });
    return L.filter(Boolean).join('\n');
  }

  /* plain-text rendering of every fact (the model's system prompt and the number guard use it) */
  function facts(kb, over) {
    var C = contactOf(kb, over), L = [], f = function (x) { x = Array.isArray(x) ? x.join(' / ') : (x && typeof x === 'object') ? [].concat(x.all || [], x.one || []).join(' / ') : (x || ''); return x.replace(/\{(\w+)\}/g, function (m, k) { return C[k] != null ? C[k] : m; }); };
    L.push('Head office: ' + C.address + '. Dolphin also has offices in Pokhara and Biratnagar (addresses not published yet, to be confirmed). Opening days and hours: not published yet, to be confirmed. Phone: +977-1-4797331 / +977-1-5909331. Mobile: +977-9801045116 / +977-9707098171. WhatsApp: +977-9801045116. Email: ' + C.email + '.');
    live(kb).forEach(function (c) { L.push(c.name + ': ' + c.tagline + '. ' + c.glance.map(function (g) { return g[0] + ': ' + g[1]; }).join('. ') + '. Visa steps (general, rules change): ' + c.visa); });
    var P = kb.partners || { byCountry: {} }; L.push('Partner institutions (from dolphin.edu.np): ' + live(kb).map(function (c) { return c.name + ': ' + ((P.byCountry[c.slug] || []).join(', ') || 'none listed'); }).join('. '));
    kb.entries.forEach(function (e) { if (e.facet || e.id === 'partners') return; L.push('Q: ' + e.q + ' A: ' + f(e.intro) + (e.items ? ' ' + e.items.map(function (x) { return Array.isArray(x) ? x.join(': ') : x; }).join('. ') : '') + ' ' + f(e.caveat) + ' ' + f(e.next)); });
    return L.join('\n');
  }
  function numbers(s) { return (String(s || '').match(/\d[\d,.]*\d|\d/g) || []).map(function (n) { return n.replace(/[,.]/g, ''); }); }

  var api = { answer: answer, plain: plain, facts: facts, numbers: numbers, _prep: prep };

  /* node site/js/chat-kb.js --build : regenerate the browser copy of the knowledge base */
  if (typeof module === 'object' && typeof require === 'function' && require.main === module && process.argv.indexOf('--build') > -1) {
    var fs = require('fs'), path = require('path');
    var src = path.join(__dirname, '..', '..', 'server', 'chat-kb.json'), dst = path.join(__dirname, 'chat-kb-data.js');
    var json = JSON.stringify(JSON.parse(fs.readFileSync(src, 'utf8')));
    fs.writeFileSync(dst, '/* GENERATED from server/chat-kb.json by `node site/js/chat-kb.js --build`. Do not edit. */\nwindow.DolphinChatKBData=' + json + ';\n');
    console.log('wrote ' + dst + ' (' + json.length + ' bytes)');
  }
  return api;
});
