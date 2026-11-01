/* Ask Dolphin chat with Asha. Loaded by the small loader in js/core/site.js on idle or on the first launcher click; exposes window.DXChat
   ({open(mode), close(), toggle(), isOpen(), ask(q)}), which the loader's window.DolphinChat delegates to.
   Two modes, switchable from the header: 'assist' asks POST /api/chat (server/routes/chat.js, answers from server/chat-kb.json), or, when the
   API is unreachable (static preview, offline), the same engine in the browser (js/chat-kb.js + js/chat-kb-data.js, loaded only then);
   'support' shows WhatsApp, phone, email, a Leave a message form (POST /api/forms/contact) and the live chat (js/components/chat-live.js).
   Asha: the photo-real character (js/components/asha-live.js + img/asha, manifest js/components/asha-assets.js). Her voice and lip-sync: js/asha-voice.js.
   If her pictures can't load, the chat stays fully usable with her static face. Nothing the visitor types is logged; the conversation
   lives in sessionStorage for this tab only. */
(function () {
  'use strict';
  var W = window, D = document;
  if (W.DXChat) return;

  /* ---------- config ---------- */
  var DEF = { phone: '+977-1-4797331', tel: '+97714797331', whatsapp: '9779801045116', email: 'nb@dolphin.edu.np', days: '',
    waText: 'Hello Dolphin Education, I would like to ask about studying abroad.' };
  var C = (function () { var c = {}, k, x = (W.DX && W.DX.contact) || {}; for (k in DEF) c[k] = x[k] != null ? x[k] : DEF[k]; c.wa = 'https://wa.me/' + c.whatsapp + '?text=' + encodeURIComponent(c.waText); return c; })();
  var KEY = 'dxc-v1', MAX = 500, FACE = 'img/asha-face.webp', MARK = 'img/logo-mark-96.webp', reduce = W.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* the chat's own short labels in the page language (ne, es, ko, zh) */
  var TX = {
    'Listen': ['सुन्नुहोस्', 'Escuchar', '듣기', '收听'],
    'Stop': ['रोक्नुहोस्', 'Detener', '중지', '停止'],
    'Listen to this reply': ['यो जवाफ सुन्नुहोस्', 'Escuchar esta respuesta', '이 답변 듣기', '收听这条回复'],
    'Stop reading': ['पढ्न रोक्नुहोस्', 'Dejar de leer', '읽기 중지', '停止朗读'],
    'Speaking…': ['बोल्दै…', 'Hablando…', '말하는 중…', '正在说话…'],
    'Asha · Online': ['आशा · अनलाइन', 'Asha · En línea', '아샤 · 온라인', 'Asha · 在线'],
    'Outfit': ['पहिरन', 'Atuendo', '의상', '服装']
  };
  /* her spoken welcome, in the page's language */
  var WELCOME = {
    en: 'Namaste! I am Asha from Dolphin Education. How can I help you study abroad today?',
    ne: 'नमस्ते! म डल्फिन एजुकेसनकी आशा हुँ। विदेशमा पढ्ने बारेमा आज म तपाईंलाई कसरी सहयोग गर्न सक्छु?',
    es: '¡Namaste! Soy Asha, de Dolphin Education. ¿Cómo puedo ayudarte hoy a estudiar en el extranjero?',
    ko: '나마스테! 저는 돌핀 에듀케이션의 아샤예요. 오늘 유학에 대해 무엇을 도와드릴까요?',
    zh: 'Namaste！我是 Dolphin Education 的 Asha。今天我可以怎样帮你规划留学呢？'
  };
  var LOOKS = { modern: 'Modern', kurta: 'Kurtha', kurtha: 'Kurtha', sari: 'Sari' };
  var SRL = { en: 'en-US', ne: 'ne-NP', es: 'es-ES', ko: 'ko-KR', zh: 'zh-CN' };
  /* one icon set: 24 px grid, 1.8 stroke, round caps, currentColor (WhatsApp is its own filled mark) */
  var IC = {
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    support: '<path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2"/><path d="M4.5 13.5h2.2c.6 0 1 .4 1 1v3.2c0 .6-.4 1-1 1h-1.2c-.6 0-1-.4-1-1z"/><path d="M19.5 13.5h-2.2c-.6 0-1 .4-1 1v3.2c0 .6.4 1 1 1h1.2c.6 0 1-.4 1-1z"/><path d="M19.5 17.5c0 1.9-1.8 3-4.5 3h-1.5"/>',
    assist: '<path d="M20 11.5c0 4.1-3.6 7.5-8 7.5-1.2 0-2.3-.2-3.3-.6L4.5 20l1.2-3.6C4.6 15 4 13.3 4 11.5 4 7.4 7.6 4 12 4s8 3.4 8 7.5z"/><path d="M8.5 10h7M8.5 13.5h4.5"/>',
    send: '<path d="M20.5 3.5L10 14"/><path d="M20.5 3.5l-6.3 17-4.2-6.5-6.5-4.2z"/>',
    mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>',
    spk: '<path d="M4 9.5h3l4.5-4v13l-4.5-4H4z"/>',
    spkOn: '<path d="M15 9.2a4 4 0 0 1 0 5.6M17.6 6.6a7.6 7.6 0 0 1 0 10.8"/>',
    spkOff: '<path d="M15.5 9.5l5 5M20.5 9.5l-5 5"/>',
    stop: '<rect x="7" y="7" width="10" height="10" rx="2.2"/>',
    call: '<path d="M6.2 4h2.6l1.4 3.7-1.9 1.3a10.5 10.5 0 0 0 4.7 4.7l1.3-1.9 3.7 1.4v2.6c0 1-.8 1.8-1.8 1.8A14.2 14.2 0 0 1 4.4 5.8C4.4 4.8 5.2 4 6.2 4z"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4.5 7.5l7.5 5.5 7.5-5.5"/>',
    note: '<path d="M4.5 19.5h4l10-10a2.1 2.1 0 0 0-3-3l-10 10z"/><path d="M14 8l3 3"/>',
    wa: '<path fill="currentColor" stroke="none" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>'
  };

  /* ---------- state ---------- */
  var S = load();                            /* {mode, msgs, sent}; S.open is per page view */
  var L = D.getElementById('dxcL'), opener = null, busy = false, local = null, apiP = null, liveP = null;
  var V = null;                              /* js/components/asha-voice.js once loaded */
  var DF = null, VO = false, greeted = false, RD = null, statusT = 0;
  var LOOK = (function () { try { return localStorage.getItem('dxc-look') || ''; } catch (e) { return ''; } })();
  S.open = false;

  /* ---------- helpers ---------- */
  function load() { try { var s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.msgs)) return s; } catch (e) {} return { mode: 'start', msgs: [], sent: false }; }
  function save() { S.msgs = S.msgs.slice(-40); if (P) P.classList.toggle('has-msgs', S.msgs.length > 0); try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function el(tag, cls, txt) { var e = D.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ico(n, cls) { return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (IC[n] || '') + '</svg>'; }
  function pill(label, attrs, icon) { var a = attrs && attrs.href ? el('a', 'dxc-pill', label) : el('button', 'dxc-pill', label); if (!attrs || !attrs.href) a.type = 'button'; for (var k in attrs || {}) a.setAttribute(k, attrs[k]); if (icon) { a.insertAdjacentHTML('afterbegin', ico(icon)); a.classList.add('has-i'); } return a; }
  function page() { var p = D.body.dataset.page || 'home'; if (p === 'country') { var m = /[?&]c=([\w-]+)/.exec(location.search); if (m) p = 'country:' + m[1]; } return p; }
  function lang() { return String(D.documentElement.lang || 'en').slice(0, 2); }
  function tx(t) { var i = ['ne', 'es', 'ko', 'zh'].indexOf(lang()); return i > -1 && TX[t] ? TX[t][i] : t; }
  function script(src) { return new Promise(function (res, rej) { var s = D.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; D.head.appendChild(s); }); }
  function later(f) { (W.requestAnimationFrame || setTimeout)(function () { setTimeout(f, 0); }); }
  var phone = function () { return W.matchMedia && matchMedia('(max-width:640px)').matches; };

  /* ---------- DOM build ---------- */
  var P = el('section', 'dxc-p'); P.id = 'dxcP'; P.setAttribute('role', 'dialog'); P.setAttribute('aria-labelledby', 'dxcT'); P.setAttribute('data-lenis-prevent', ''); P.tabIndex = -1;
  P.innerHTML = '<header class="dxc-h" role="none"><span class="dxc-brand" aria-hidden="true"><img src="' + MARK + '" alt="" width="32" height="32"></span><div class="dxc-ht"><h2 id="dxcT">Ask Dolphin</h2><p></p></div>'
    + '<div class="dxc-hb"><button class="dxc-tb" type="button" data-sw>' + ico('support', 'i-sup') + ico('assist', 'i-ast') + '</button><button class="dxc-tb" type="button" data-x aria-label="Close chat" title="Close chat">' + ico('close') + '</button></div></header>'
    + '<div class="dxc-stage" data-stage><span class="dxc-hav" aria-hidden="true" data-hav><img class="dxc-hav-img" src="' + FACE + '" alt="" width="64" height="64"></span></div>'
    + '<div class="dxc-b" data-body><div data-assist><div class="dxc-start"><h3>Namaste. How can we help?</h3><p>Ask a question about studying abroad, or reach a counsellor directly.</p>'
    + '<div class="dxc-row"><button class="dxc-pill" type="button" data-go="assist">Ask assistance</button><button class="dxc-pill" type="button" data-go="support">Talk with support</button></div></div>'
    + '<div class="dxc-msgs" role="log" aria-live="polite" aria-label="Conversation" data-log></div></div>'
    + '<div class="dxc-sv" data-support hidden><h3>Talk with a counsellor</h3><p>Message us any time on WhatsApp, call the office, or leave a message here. A counsellor replies in office hours.</p>'
    + '<p class="dxc-hrs">' + (C.days ? esc(C.days) + ', office' : 'Office') + ' hours to be confirmed.</p><div class="dxc-row" data-sacts></div><div data-lead></div></div></div>'
    + '<form class="dxc-c" data-comp novalidate><label class="dxc-vh" for="dxcIn" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Your question</label>'
    + '<button class="dxc-vb" type="button" data-voice hidden>' + ico('spk').replace('</svg>', '<g class="dxc-v-on">' + IC.spkOn + '</g><g class="dxc-v-off">' + IC.spkOff + '</g></svg>') + '</button>'
    + '<textarea id="dxcIn" rows="1" maxlength="' + MAX + '" placeholder="Ask a question" autocomplete="off"></textarea>'
    + '<button class="dxc-vb dxc-mic" type="button" data-mic hidden aria-label="Speak your question" title="Speak your question" aria-pressed="false">' + ico('mic') + '</button>'
    + '<button class="dxc-send dxc-send-i" type="submit" aria-label="Send" title="Send">' + ico('send') + '</button></form>';
  var scrim = el('div', 'dxc-scrim'); scrim.setAttribute('aria-hidden', 'true');
  D.body.appendChild(scrim); D.body.appendChild(P);
  var $ = function (s) { return P.querySelector(s); };
  var body = $('[data-body]'), log = $('[data-log]'), assistV = $('[data-assist]'), supportV = $('[data-support]'), comp = $('[data-comp]'),
    ta = $('#dxcIn'), sendB = $('.dxc-send'), sw = $('[data-sw]'), vb = $('[data-voice]'), mic = $('[data-mic]'), stage = $('[data-stage]'), hav = $('[data-hav]');

  /* support actions (one set, used in the support view and under answers) */
  function act(kind) {
    if (kind === 'whatsapp') return pill('WhatsApp', { href: C.wa, target: '_blank', rel: 'noopener' }, 'wa');
    if (kind === 'call') return pill('Call ' + C.phone, { href: 'tel:' + C.tel }, 'call');
    if (kind === 'email') return pill('Email', { href: 'mailto:' + C.email }, 'mail');
    if (kind === 'lead') { var b = pill('Leave your number', null, 'note'); b.addEventListener('click', function () { mode('support', true); }); return b; }
    return null;
  }
  var sa = $('[data-sacts]'); ['whatsapp', 'call', 'email'].forEach(function (k) { sa.appendChild(act(k)); });
  var lb = pill('Leave a message', null, 'note'); lb.setAttribute('aria-expanded', 'false'); lb.addEventListener('click', function () { leadForm(true); }); sa.appendChild(lb);

  /* ---------- modes ---------- */
  function mode(m, withForm) {
    S.mode = m; save();
    var sup = m === 'support';
    if (sup) quiet();
    supportV.hidden = !sup; assistV.hidden = sup; comp.hidden = sup;
    swUi();
    if (sup) {
      if (withForm) leadForm(true); else { body.scrollTop = 0; if (S.open) focusFirst(supportV); }
      live().then(function (lv) { if (lv && S.mode === 'support') lv.shown(); });
    } else {
      if (m === 'assist' && !S.msgs.length) greet();
      later(function () { scrollEnd(); if (S.open && !phone()) ta.focus(); });
    }
  }
  /* the header toggle: a headset (talk with support) in the assistant, a chat bubble (back to the assistant) in support */
  function swUi() {
    var sup = S.mode === 'support', t = sup ? 'Back to the assistant' : 'Talk with support';
    sw.classList.toggle('is-sup', sup); sw.setAttribute('aria-label', t + (sw.classList.contains('has-new') ? ', new reply' : '')); sw.title = t;
    if (sup) sw.classList.remove('has-new');
    P.classList.toggle('has-msgs', S.msgs.length > 0);
  }
  function kb() { return W.DolphinChatKBData || null; }
  function greet() {
    var g = kb() ? kb().greeting : null;
    bot({ type: 'text', intro: g ? g.intro[0] : 'Namaste! I am Asha from Dolphin Education. I can help with studying in the UK, USA, Canada, Australia and New Zealand, using what Dolphin has published. For anything about your own case, a counsellor is one tap away.',
      suggest: [{ label: 'How it works', q: 'How does counselling work?' }, { label: 'Costs', q: 'How much does it cost to study abroad?' }, { label: 'Documents', q: 'Which documents will I need?' }], acts: [] });
  }

  /* ---------- messages ----------
     answer = {type:'cards'|'list'|'text', intro, cards:[{title, rows:[{label,value,muted}], body, link}], items:[text|[lead,text]], caveat, next,
     links:[{label,href}], suggest:[{label,q}|q], acts:[...]} (see js/chat-kb.js), rendered as DOM nodes, never innerHTML from text.
     Older stored messages ({t,l,tl,g,a,s}) are converted. */
  function shape(a) {
    if (a && a.intro != null) return a;
    a = a || {};
    return { type: 'text', intro: a.text || a.t || '', cards: [], items: a.list || a.l || [], caveat: a.tail || a.tl || '', next: '', links: (a.go || a.g) ? [a.go || a.g] : [], suggest: a.suggest || a.s || [], acts: a.acts || a.a || [] };
  }
  function safeHref(h) { h = String(h || ''); return /^(https:\/\/|tel:|mailto:|#|[\w-]+\.html([?#][\w=&#.-]*)?$)/i.test(h) ? h : '#'; }
  function render(m, last, fresh) {
    if (m.r === 'u') { log.appendChild(el('div', 'dxc-m u', m.t)); return null; }
    if (m.r === 'n') { log.appendChild(el('p', 'dxc-note', m.t)); return null; }
    var x = m.x || shape(m), R = el('div', 'dxc-r' + (fresh ? '' : ' is-old')), n = 0;
    var stag = function (node) { if (fresh && !reduce) node.style.animationDelay = (n++ * 60) + 'ms'; return node; };
    var b = stag(el('div', 'dxc-m b')); b.appendChild(el('p', null, x.intro));
    if (x.items && x.items.length) {
      var ul = el('ul', 'dxc-ls');
      x.items.forEach(function (it) { var li = el('li'); if (Array.isArray(it)) { li.appendChild(el('strong', null, it[0] + ':')); li.appendChild(D.createTextNode(' ' + it[1])); } else li.textContent = it; ul.appendChild(li); });
      b.appendChild(ul);
    }
    R.appendChild(b);
    if (x.cards && x.cards.length) {
      var cs = el('div', 'dxc-cards');
      x.cards.forEach(function (c) {
        var card = stag(el('article', 'dxc-card')), hd = el('div', 'dxc-ch'); hd.appendChild(el('h4', null, c.title));
        if (c.link && c.link.href) hd.appendChild(pill(c.link.label, { href: safeHref(c.link.href), 'class': 'dxc-pill dxc-pill-s' }));
        card.appendChild(hd);
        if (c.rows && c.rows.length) {
          var dl = el('dl');
          c.rows.forEach(function (r) { var row = el('div', 'dxc-kv' + (r.muted ? ' is-muted' : '') + (String(r.value).length <= 30 ? ' is-short' : '')); row.appendChild(el('dt', null, r.label)); row.appendChild(el('dd', null, r.value)); dl.appendChild(row); });
          card.appendChild(dl);
        }
        if (c.body) card.appendChild(el('p', 'dxc-cb', c.body));
        cs.appendChild(card);
      });
      R.appendChild(cs);
    }
    if (x.caveat || x.next) {
      var b2 = stag(el('div', 'dxc-m b dxc-m2'));
      if (x.caveat) b2.appendChild(el('p', 'dxc-cav', x.caveat));
      if (x.next) b2.appendChild(el('p', null, x.next));
      R.appendChild(b2);
    }
    if ((x.links && x.links.length) || (x.acts && x.acts.length)) {
      var row2 = stag(el('div', 'dxc-acts'));
      (x.links || []).forEach(function (l) { row2.appendChild(pill(l.label, { href: safeHref(l.href) })); });
      (x.acts || []).forEach(function (k) { var a2 = act(k); if (a2) row2.appendChild(a2); });
      R.appendChild(row2);
    }
    /* Listen / Stop reads this reply aloud (shown once a voice is available: .can-read on the panel) */
    R._x = x;
    var lb3 = el('button', 'dxc-listen'); lb3.type = 'button'; lb3.setAttribute('aria-pressed', 'false'); lb3.setAttribute('aria-label', tx('Listen to this reply'));
    lb3.innerHTML = ico('spk', 'i-l').replace('</svg>', IC.spkOn + '</svg>') + ico('stop', 'i-s') + '<span>' + esc(tx('Listen')) + '</span>';
    lb3.addEventListener('click', function () { listen(R); });
    R.appendChild(lb3);
    log.appendChild(R);
    if (last && x.suggest && x.suggest.length) {
      var s = stag(el('div', 'dxc-sug')); s.setAttribute('aria-label', 'Suggested questions');
      x.suggest.forEach(function (q) { var lab = typeof q === 'string' ? q : q.label, qq = typeof q === 'string' ? q : q.q; var p = pill(lab); p.addEventListener('click', function () { ask(qq); }); s.appendChild(p); });
      log.appendChild(s);
    }
    return R;
  }
  function drawAll() { log.innerHTML = ''; S.msgs.forEach(function (m, i) { render(m, i === S.msgs.length - 1, false); }); }
  function clearSug() { var s = log.querySelectorAll('.dxc-sug'); for (var i = 0; i < s.length; i++) s[i].remove(); }
  function bot(a) {
    clearSug(); var m = { r: 'b', x: shape(a) }; S.msgs.push(m); save();
    var R = render(m, true, true);
    react(m.x, false, R);
    /* a reply taller than the panel is read from its start; a short one simply lands at the bottom */
    later(function () {
      if (!R) return scrollEnd();
      var br = body.getBoundingClientRect(), rr = R.getBoundingClientRect(), sg = log.querySelector('.dxc-sug'), h = (sg ? sg.getBoundingClientRect().bottom : rr.bottom) - rr.top;
      if (h > body.clientHeight - 24) body.scrollTop += rr.top - br.top - 12; else scrollEnd();
    });
  }
  function scrollEnd() { body.scrollTop = body.scrollHeight; }
  function typing(on) {
    var t = log.querySelector('.dxc-typing');
    if (on && !t) {
      t = el('div', 'dxc-m b dxc-typing'); t.setAttribute('aria-label', 'Asha is typing'); t.setAttribute('role', 'status'); t.innerHTML = '<i></i><i></i><i></i>';
      log.appendChild(t); if (DF) DF.mood('curious'); scrollEnd();
    }
    if (!on && t) t.remove();
  }
  function history() {
    return S.msgs.filter(function (m) { return m.r === 'u' || m.r === 'b'; }).slice(-8)
      .map(function (m) { var x = m.r === 'b' ? (m.x || shape(m)) : null; return { role: m.r === 'u' ? 'user' : 'bot', text: String(x ? (x.text || x.intro) : m.t).slice(0, 600) }; });
  }
  function ask(text) {
    text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, MAX);
    if (!text || busy) return;
    quiet();
    if (S.mode !== 'assist') mode('assist');
    var hist = history();
    clearSug(); var m = { r: 'u', t: text }; S.msgs.push(m); save(); render(m); scrollEnd();
    busy = true; sendB.disabled = true; typing(true);
    var t0 = Date.now();
    remote(text, hist).then(null, function () { return localAnswer(text, hist); }).then(function (a) {
      var wait = reduce ? 0 : Math.max(0, 520 - (Date.now() - t0));
      setTimeout(function () { typing(false); bot(a); done(); }, wait);
    }, function () { typing(false); bot({ text: 'Something went wrong on our side. Please message us on WhatsApp or call the office.', acts: ['whatsapp', 'call'] }); done(); });
  }
  function done() { busy = false; sendB.disabled = false; if (S.open && D.activeElement !== ta && !P.contains(D.activeElement)) ta.focus(); }

  /* ---------- answers: server, else the local engine ----------
     Is the Dolphin server behind this page? It always sends security headers (helmet); a plain static server does not. Asking with a
     HEAD of this page avoids a failing POST (and a console error) on every message in a static preview. Cached per tab. */
  function api() {
    if (apiP) return apiP;
    var c = null; try { c = sessionStorage.getItem('dxc-api'); } catch (e) {}
    if (c) return (apiP = Promise.resolve(c === '1'));
    if (location.protocol === 'file:' || !W.fetch) return (apiP = Promise.resolve(false));
    apiP = fetch(location.pathname, { method: 'HEAD', credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return !!(r.headers.get('content-security-policy') || r.headers.get('x-content-type-options')); }, function () { return false; })
      .then(function (ok) { try { sessionStorage.setItem('dxc-api', ok ? '1' : '0'); } catch (e) {} return ok; });
    return apiP;
  }
  /* any network error, a non-JSON reply or a missing route rejects -> the local engine */
  function remote(text, hist) { return api().then(function (ok) { if (!ok) throw new Error('no-api'); return post(text, hist); }); }
  function post(text, hist) {
    var ctl = W.AbortController ? new AbortController() : null, tm = ctl && setTimeout(function () { ctl.abort(); }, lang() === 'en' ? 9000 : 15000); /* other languages wait for the model's translation */
    return fetch('/api/chat', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ message: text, history: hist, page: page(), lang: lang() }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        if (tm) clearTimeout(tm);
        if ((r.headers.get('content-type') || '').indexOf('json') < 0) throw new Error('no-api');
        return r.json().then(function (b) {
          if (r.ok && b && b.text) return b;
          if (r.status === 429) return { text: (b && b.error) || 'You have sent a lot of messages. Please wait a few minutes.', acts: ['whatsapp', 'call'] };
          if (r.status === 400) return { text: (b && b.error) || 'Please type a question.', acts: [] };
          throw new Error('api ' + r.status);
        });
      }, function (e) { if (tm) clearTimeout(tm); throw e; });
  }
  function localAnswer(text, hist) {
    if (!local) local = (W.DolphinChatKB ? Promise.resolve() : script('js/chat-kb.js')).then(function () { return W.DolphinChatKBData ? 0 : script('js/chat-kb-data.js'); });
    return local.then(function () { return W.DolphinChatKB.answer(W.DolphinChatKBData, text, { history: hist, page: page(), contact: C }); });
  }

  /* ---------- leave a message ---------- */
  function leadForm(show) {
    var box = $('[data-lead]');
    if (S.sent) { box.innerHTML = ''; var ok = el('div', 'dxc-ok'); ok.appendChild(el('strong', null, 'Thank you.')); ok.appendChild(el('p', null, 'Your message is with the office. A counsellor replies in office hours.')); box.appendChild(ok); lb.hidden = true; return; }
    if (!show) return;
    lb.setAttribute('aria-expanded', 'true'); lb.setAttribute('aria-pressed', 'true');
    if (!box.firstChild) {
      box.innerHTML = '<form class="dxc-f" novalidate aria-label="Leave a message">'
        + '<label>Your name<input name="name" autocomplete="name" maxlength="120" required></label>'
        + '<label>Phone or email<input name="reach" autocomplete="tel" inputmode="email" maxlength="160" required></label>'
        + '<label>Message<textarea name="msg" maxlength="1000" placeholder="What would you like to ask?"></textarea></label>'
        + '<input class="dxc-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">'
        + '<p class="dxc-cons">By sending, you agree that Dolphin Education may contact you about this enquiry, using the details above.</p>'
        + '<p class="dxc-err" role="alert" hidden></p><div><button class="dxc-send" type="submit">Send message</button></div></form>';
      box.querySelector('form').addEventListener('submit', submitLead);
    }
    later(function () { var f = box.querySelector('input[name=name]'); if (f) { f.focus(); f.scrollIntoView({ block: 'nearest' }); } });
  }
  function submitLead(e) {
    e.preventDefault();
    var f = e.target, err = f.querySelector('.dxc-err'), b = f.querySelector('.dxc-send'), E = f.elements;
    var fN = E.namedItem('name'), fR = E.namedItem('reach'), fM = E.namedItem('msg'), fW = E.namedItem('website');
    var name = fN.value.trim(), reach = fR.value.trim(), msg = fM.value.trim(), bad = null;
    [fN, fR].forEach(function (i) { i.removeAttribute('aria-invalid'); });
    var isMail = reach.indexOf('@') > -1;
    if (!name) bad = [fN, 'Please add your name.'];
    else if (!reach) bad = [fR, 'Please add a phone number or an email so we can reply.'];
    else if (isMail ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reach) : !/^\+?\d[\d\s-]{6,}$/.test(reach)) bad = [fR, isMail ? 'Please check the email address.' : 'Please check the phone number.'];
    if (bad) { err.textContent = bad[1]; err.hidden = false; bad[0].setAttribute('aria-invalid', 'true'); bad[0].focus(); return; }
    err.hidden = true; b.disabled = true; b.textContent = 'Sending';
    var data = { name: name, msg: '[Ask Dolphin chat, page ' + page() + '] ' + (msg || 'Please contact me.'), kind: 'contact', website: fW.value };
    if (isMail) data.email = reach; else data.phone = reach;
    api().then(function (ok) { if (!ok) throw new Error('no-api'); return fetch('/api/forms/contact', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) }); })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }, function () { throw new Error('no-api'); }); })
      .then(function (x) {
        if (x.ok) {
          S.sent = true; save(); leadForm(); var ok = $('.dxc-ok'); if (ok) { ok.setAttribute('tabindex', '-1'); ok.focus(); }
          S.msgs.push({ r: 'n', t: 'Your message was sent to the office. A counsellor replies in office hours.' }); save(); drawAll();
          return;
        }
        var d = x.j && x.j.details, first = d && Object.keys(d)[0];
        err.textContent = (d && (d.email || d.phone || d.name)) || (x.j && x.j.error) || 'Please check the form.'; err.hidden = false;
        if (first === 'name') fN.setAttribute('aria-invalid', 'true'); else if (first) fR.setAttribute('aria-invalid', 'true');
        b.disabled = false; b.textContent = 'Send message';
      })
      .catch(function () {
        err.textContent = 'This preview cannot send messages. Please use WhatsApp or call ' + C.phone + '.'; err.hidden = false;
        b.disabled = false; b.textContent = 'Send message';
      });
  }

  /* ---------- open / close / focus ---------- */
  /* phones: the sheet follows the visible viewport (css/components/chat.css --dxc-vvh / --dxc-vvt), so an open keyboard never covers the field */
  function fitVV() {
    var vv = W.visualViewport; if (!vv) return;
    if (!S.open || !phone()) { P.style.removeProperty('--dxc-vvh'); P.style.removeProperty('--dxc-vvt'); return; }
    P.style.setProperty('--dxc-vvh', Math.round(vv.height) + 'px'); P.style.setProperty('--dxc-vvt', Math.round(vv.offsetTop) + 'px');
  }
  function focusFirst(root) { var f = root.querySelector('a[href],button:not([disabled]),textarea,input:not([tabindex="-1"])'); if (f) f.focus(); }
  function open(m) {
    if (m === 'assist' || m === 'support') mode(m); else mode(S.mode || 'start');
    if (S.open) return;
    S.open = true; opener = D.activeElement && D.activeElement !== D.body ? D.activeElement : L;
    P.classList.add('is-open'); D.documentElement.classList.add('dxc-on');
    hello();
    if (L) { L.setAttribute('aria-expanded', 'true'); L.setAttribute('aria-label', 'Close chat'); L.classList.remove('has-new'); }
    var ping = D.querySelector('#dxcN .dxc-ping'); if (ping) { ping.parentNode.hidden = true; ping.parentNode.innerHTML = ''; }
    if (phone()) { P.setAttribute('aria-modal', 'true'); if (W.DX && DX.lock) DX.lock(true); } else P.setAttribute('aria-modal', 'false');
    fitVV();
    later(function () {
      scrollEnd();
      if (S.mode === 'support') focusFirst(supportV);
      else if (S.mode === 'start' && !S.msgs.length) $('[data-go=assist]').focus();
      else if (phone()) P.focus();   /* phones: no keyboard popping up over Asha on open; focus is in the dialog */
      else ta.focus();
    });
  }
  function close() {
    if (!S.open) return;
    S.open = false; P.classList.remove('is-open'); D.documentElement.classList.remove('dxc-on'); fitVV();
    quiet();
    if (L) { L.setAttribute('aria-expanded', 'false'); L.setAttribute('aria-label', 'Chat with Dolphin'); }
    if (W.DX && DX.lock && P.getAttribute('aria-modal') === 'true') DX.lock(false);
    var o = opener && opener !== L && D.contains(opener) && opener.getClientRects().length ? opener : L;
    if (o === L && L) { L.style.transition = 'none'; void L.offsetWidth; L.style.transition = ''; }   /* phones hide the launcher under the sheet: show it at once so it can take focus */
    if (o && o.focus) o.focus();
    /* on phones the launcher may still be hidden at this instant (under the sheet): retry once it is shown */
    if (o && o.focus && D.activeElement !== o) setTimeout(function () { if (!S.open && D.activeElement !== o) o.focus(); }, 320);
    tuck();
  }

  /* ---------- Asha ----------
     The header carries the Dolphin mark; Asha stands on her own stage under it (head to chest, the Pujalaya cut-out), with her outfit
     thumbnails beside her, and her small picture sits beside every reply. Until her pictures load, the stage shows her static face. */
  function ashaPic(k) { return 'url("' + new URL(((W.DXAshaAssets && DXAshaAssets.base) || 'img/asha/') + k + '/rest.webp', location.href).href + '")'; }   /* a full address: a url() in a CSS variable is otherwise read from css/ */
  function setAva(k) { P.style.setProperty('--asha-ava', ashaPic(k)); }
  /* the status line under the title: "Asha · Online", and "Speaking..." while her voice plays */
  function status(t, ms) {
    var p = $('.dxc-ht p'); if (!p) return;
    p.textContent = t || tx('Asha · Online');
    clearTimeout(statusT); if (t && ms) statusT = setTimeout(function () { status(); }, ms);
  }
  function asha() {
    var A = W.DXAshaLive; if (!A || DF) return;
    hav.innerHTML = ''; P.classList.add('is-asha');
    DF = A.mount(hav, { view: 'bust', look: LOOK });
    setAva(LOOK || A.looks[0]); looks(A);
    if (S.open) hello();
  }
  /* her outfits: round thumbnails beside her, the choice kept on this device */
  function looks(A) {
    if (!A.looks || A.looks.length < 2 || $('.dxc-looks')) return;
    var row = el('div', 'dxc-looks'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', "Asha's outfit");
    row.appendChild(el('span', 'dxc-looks-l', tx('Outfit')));
    A.looks.forEach(function (k) {
      var b = el('button', 'dxc-thumb'); b.type = 'button'; b.style.backgroundImage = ashaPic(k);
      b.setAttribute('aria-label', LOOKS[k] || k); b.title = LOOKS[k] || k;
      b.setAttribute('aria-pressed', String(k === (LOOK || A.looks[0])));
      b.addEventListener('click', function () {
        LOOK = k; try { localStorage.setItem('dxc-look', k); } catch (e) {}
        DF.setLook(k); setAva(k);
        row.querySelectorAll('[aria-pressed]').forEach(function (y) { y.setAttribute('aria-pressed', String(y === b)); });
        DF.trick('tailwalk');
      });
      row.appendChild(b);
    });
    stage.appendChild(row);
  }
  /* first open: namaste with a smile; with sound on she also says her welcome (the open is the visitor's own tap) */
  function hello() {
    if (!DF) return; DF.mood('happy', 2500);
    if (greeted) return; greeted = true;
    DF.trick('tailwalk'); setTimeout(function () { if (DF) DF.trick('wave'); }, 2100);
    if (VO && !S.msgs.length) react({ intro: WELCOME[lang()] || WELCOME.en }, true);
  }
  function moodFor(txt) { return V ? V.moodOf(txt) : 'happy'; }
  /* a new reply: she speaks it (sound on) or does a short silent talk, with a nod or a little shake for sorry */
  function react(x, calm, R) {
    if (!x) return; var txt = x.intro || x.text || '', md = moodFor(txt);
    var silent = function () { if (DF) DF.say(txt, md, { short: true }); };
    if (VO) readAloud(x, R, md, silent); else silent();
    if (calm || !DF) return;
    DF.trick(md === 'sad' ? 'shake' : 'nod');
  }

  /* ---------- voice ----------
     Off until the visitor turns it on (a site should not start talking by itself); the choice is kept on this device. With sound on every
     new reply is read when it arrives; each reply has its own Listen / Stop (works with sound off too). What is read: the intro, list items,
     card notes, the caveat and the next step. While the voice plays her mouth follows it, the status line reads "Speaking..." and the reply
     being read is marked (.is-reading). If no voice can play, the reply stays text only with her short silent talk. */
  function quiet() { if (V) V.stop(); }
  function voiceUi() {
    vb.title = VO ? 'Voice on: tap to mute' : 'Tap to hear Asha'; vb.setAttribute('aria-pressed', VO ? 'true' : 'false'); vb.setAttribute('aria-label', VO ? 'Mute Asha' : 'Hear Asha');
  }
  function voiceReady() {
    V = W.DXAshaVoice; if (!V || !V.ok) return;
    try { VO = localStorage.getItem('dxc-voice') === '1'; } catch (e) {}
    vb.hidden = false; voiceUi(); P.classList.add('can-read');
  }
  function spoken(x) {
    var parts = [x.intro || x.text || ''];
    (x.items || []).forEach(function (it) { parts.push(Array.isArray(it) ? it[0] + ': ' + it[1] : it); });
    (x.cards || []).forEach(function (c) { if (c.body) parts.push(c.body); });
    parts.push(x.caveat || '', x.next || '');
    return parts.map(function (t) {
      t = String(t || '').replace(/https?:\/\/\S+|www\.\S+/g, ' ').replace(/[*_#`>|•·–—]+/g, ' ').replace(/\s+/g, ' ').trim();
      return t && !/[.!?।。！？:;]$/.test(t) ? t + (/[぀-鿿]/.test(t) ? '。' : '.') : t;
    }).filter(Boolean).join(' ');
  }
  function mark(R, on) {
    if (!R) return; R.classList.toggle('is-reading', on);
    var b = R.querySelector('.dxc-listen'); if (!b) return;
    b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', tx(on ? 'Stop reading' : 'Listen to this reply'));
    b.querySelector('span').textContent = tx(on ? 'Stop' : 'Listen');
  }
  function readAloud(x, R, md, onFail) {
    if (!V) { if (onFail) onFail(); return; }
    md = md || moodFor(x.intro || x.text || '');
    var me = { R: R || null };
    RD = me; mark(me.R, true);
    V.read(spoken(x), { lang: lang(), mood: md,   /* read() first stops the reply before it: its onEnd clears its own marks */
      onStart: function () {
        if (RD !== me) return; status(tx('Speaking…'));
        if (DF) DF.lip(V.mouth, md);
      },
      onEnd: function (why) {
        mark(me.R, false);
        if (RD !== me) return; RD = null; status();
        if (why === 'failed' && onFail) onFail();
      } });
  }
  function listen(R) {
    if (!V || !R._x) return;
    V.unlock();   /* the tap itself primes the audio */
    if (RD && RD.R === R) { V.stop(); return; }
    readAloud(R._x, R);
  }
  vb.addEventListener('click', function () {
    VO = !VO; voiceUi(); try { localStorage.setItem('dxc-voice', VO ? '1' : '0'); } catch (e) {}
    if (!VO) { quiet(); return; }
    V.unlock();
    if (DF) DF.trick('tailwalk');
    react({ intro: WELCOME[lang()] || WELCOME.en }, true);
  });

  /* ---------- mic: speak a question (browser speech recognition); the words land in the field to check before sending ---------- */
  var SR = W.SpeechRecognition || W.webkitSpeechRecognition, rec = null;
  function micUi(on) { mic.setAttribute('aria-pressed', on ? 'true' : 'false'); var t = on ? 'Stop listening' : 'Speak your question'; mic.setAttribute('aria-label', t); mic.title = t; }
  if (SR) {
    mic.hidden = false;
    mic.addEventListener('click', function () {
      if (rec) { rec.stop(); return; }
      quiet();
      var before = ta.value.trim();
      try { rec = new SR(); } catch (e) { rec = null; return; }
      rec.lang = SRL[lang()] || 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1;
      rec.onresult = function (e) { var s = ''; for (var i = 0; i < e.results.length; i++) s += e.results[i][0].transcript; ta.value = (before ? before + ' ' : '') + s.trim(); grow(); };
      rec.onerror = function (e) { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { mic.hidden = true; ta.placeholder = 'Microphone is blocked. Type your question'; } };
      rec.onend = function () { rec = null; micUi(false); ta.focus(); };
      micUi(true);
      try { rec.start(); } catch (e) { rec = null; micUi(false); }
    });
  }

  /* ---------- live chat: "Talk to a person" (js/components/chat-live.js), loaded with the support view or when this tab already has a chat going ---------- */
  function live() {
    if (liveP) return liveP;
    liveP = api().then(function (ok) {
      if (!ok) return null;
      return (W.DXChatLive ? Promise.resolve() : script('js/components/chat-live.js')).then(function () {
        return W.DXChatLive ? W.DXChatLive.mount(supportV, { el: el, pill: pill, ico: ico, esc: esc, lang: lang, page: page, body: body, scrollEnd: scrollEnd, later: later, phone: phone,
          visible: function () { return !!S.open && S.mode === 'support'; },
          reply: function (m) {
            if (!S.open || S.mode !== 'support') { sw.classList.add('has-new'); swUi(); }
            if (!S.open && W.DX && DX.chatPing && m) DX.chatPing((m.sender && m.sender.name) || 'Dolphin Education', m.body);
          } }) : null;
      });
    }).then(null, function () { return null; });
    return liveP;
  }

  /* ---------- the launcher never covers what you are about to tap ----------
     It lives in the bottom dock (#dxDock, js/core/site.js), which decides when it shows (DX.dockSync). The footer bar (copyright, socials, Privacy,
     Terms) is never covered: once it rises under the dock, the launcher lifts just above it (desktop; on phones the dock steps aside). */
  function tuck() { if (L) L.classList.remove('tuck'); if (W.DX && DX.dockSync) DX.dockSync(true); }
  (function () {
    var bar = D.querySelector('.ft-bar'), dock = D.getElementById('dxDock'), R = D.documentElement, raf = 0, rest = 0, wide = W.matchMedia ? matchMedia('(min-width:701px)') : null;
    if (!bar || !dock || !L) return;
    function lift() {
      raf = 0;
      var y = 0, e = bar; while (e) { y += e.offsetTop; e = e.offsetParent; }   /* layout position: the footer's reveal transform does not count */
      var b = { top: y - W.scrollY, bottom: y - W.scrollY + bar.offsetHeight }, d = dock.getBoundingClientRect(), lb2 = L.offsetParent === dock ? d.top + L.offsetTop + L.offsetHeight : d.bottom;
      var up = (!wide || wide.matches) && b.top < lb2 + 12 && b.bottom > d.top - 12 ? Math.ceil(lb2 + 16 - b.top) : 0;
      R.style.setProperty('--dxc-lift', up + 'px'); R.classList.toggle('dxc-lift', up > 0);
    }
    function soon() { if (!raf) raf = (W.requestAnimationFrame || setTimeout)(lift); clearTimeout(rest); rest = setTimeout(lift, 400); }   /* again once the page has settled */
    W.addEventListener('scroll', soon, { passive: true }); W.addEventListener('resize', soon); lift();
  })();

  /* ---------- events ---------- */
  $('[data-x]').addEventListener('click', close);
  scrim.addEventListener('click', close);
  sw.addEventListener('click', function () { mode(S.mode === 'support' ? 'assist' : 'support'); });
  P.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { mode(b.getAttribute('data-go')); }); });
  comp.addEventListener('submit', function (e) { e.preventDefault(); var v = ta.value; ta.value = ''; grow(); ask(v); });
  ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); comp.requestSubmit ? comp.requestSubmit() : comp.dispatchEvent(new Event('submit', { cancelable: true })); } });
  function grow() { ta.style.height = 'auto'; ta.style.height = Math.min(120, Math.max(44, ta.scrollHeight + 2)) + 'px'; }
  ta.addEventListener('input', grow);
  if (W.visualViewport) { W.visualViewport.addEventListener('resize', fitVV); W.visualViewport.addEventListener('scroll', fitVV); }
  D.addEventListener('keydown', function (e) {
    if (!S.open) return;
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key === 'Tab' && phone()) {   /* the sheet is modal on phones: focus stays inside */
      var f = Array.prototype.filter.call(P.querySelectorAll('a[href],button:not([disabled]),textarea,input:not([tabindex="-1"])'), function (x) { return x.offsetParent !== null; });
      if (!f.length) return; var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && D.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && D.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  }, true);

  /* ---------- boot ---------- */
  drawAll();
  if (S.mode === 'support') { supportV.hidden = false; assistV.hidden = true; comp.hidden = true; leadForm(); }
  swUi();
  try { if (sessionStorage.getItem('dxc-live') === '1') live(); } catch (e) {}
  tuck();
  status();
  /* her voice first (small), then her pictures; if they can't load she stays as the static face and the chat works as text */
  (W.DXAshaVoice ? Promise.resolve() : script('js/components/asha-voice.js')).then(voiceReady, function () {});
  (W.DXAshaAssets ? Promise.resolve() : script('js/components/asha-assets.js'))
    .then(function () { return W.DXAshaLive ? 0 : script('js/components/asha-live.js'); })
    .then(asha, function () {});
  W.DXChat = { open: open, close: close, toggle: function (m) { if (S.open) close(); else open(m); }, isOpen: function () { return !!S.open; }, ask: function (q) { open('assist'); ask(q); } };
})();
