/* "Talk to a person" inside the Ask Dolphin support view (mounted by js/components/chat.js). A live chat with the branch's content managers:
   GET /api/live/status, /live/current (restore after a reload), POST /live/start, /live/:id/messages, /read, /close, /transcript (server/routes/live.js).
   New messages arrive over the WebSocket /ws (sub + typing); it reconnects after 1, 2, 5, 10, 30 s, and after two failed connects it also polls
   every 4 s (20 s while the tab is hidden). Live chat switched off, or nobody online and no chat open: the support view keeps its Leave a message form. */
(function () {
  'use strict';
  var W = window, D = document;
  if (W.DXChatLive) return;
  var FLAG = 'dxc-live', BACK = [1, 2, 5, 10, 30];

  function req(method, path, data) {
    var o = { method: method, credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } };
    if (data) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(data); }
    return fetch('/api' + path, o).then(function (r) {
      return r.json().then(function (j) {
        if (r.ok) return j;
        var e = new Error((j && j.error) || 'Something went wrong.'); e.status = r.status; e.code = j && j.code; throw e;
      }, function () { var e = new Error('no-api'); e.status = r.status; throw e; });
    });
  }
  function flag(on) { try { if (on) sessionStorage.setItem(FLAG, '1'); else sessionStorage.removeItem(FLAG); } catch (e) {} }
  function cid() { return 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function mount(root, H) {
    var el = H.el, st = { status: null, conv: null, ids: {}, last: 0, ws: null, tries: 0, fails: 0, rt: 0, pt: 0, tt: 0, typedAt: 0, ended: false };
    var box = el('div', 'dxc-lv'); box.hidden = true;
    box.innerHTML = '<div data-lv-intro><p class="dxc-lv-st" data-lv-st></p></div>'
      + '<form class="dxc-f" data-lv-start novalidate hidden aria-label="Chat with a counsellor">'
      + '<label>Your name<input name="name" autocomplete="name" maxlength="80"></label>'
      + '<label>Phone or email (optional)<input name="contact" autocomplete="tel" inputmode="email" maxlength="160"></label>'
      + '<label>Your question<textarea name="msg" maxlength="2000" required></textarea></label>'
      + '<input class="dxc-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">'
      + '<p class="dxc-cons">By starting a chat, you agree that Dolphin Education may keep this conversation to reply to you.</p>'
      + '<p class="dxc-err" role="alert" hidden></p><div><button class="dxc-send" type="submit">Start chat</button></div></form>'
      + '<div class="dxc-lv-t" data-lv-thread hidden><p class="dxc-lv-who">Chat with Dolphin Education</p>'
      + '<div class="dxc-msgs" role="log" aria-live="polite" aria-label="Chat with a counsellor" data-lv-log></div>'
      + '<p class="dxc-lv-typ" data-lv-typ aria-live="polite"></p>'
      + '<p class="dxc-err" data-lv-err role="alert" hidden></p>'
      + '<div class="dxc-row dxc-lv-tools"><button class="dxc-lnk" type="button" data-lv-mailb aria-expanded="false">Email me this chat</button><button class="dxc-lnk" type="button" data-lv-end>End chat</button></div>'
      + '<form class="dxc-f dxc-lv-mail" data-lv-mail novalidate hidden aria-label="Email me this chat"><label>Your email<input name="email" type="email" autocomplete="email" maxlength="160" required></label>'
      + '<p class="dxc-err" role="alert" hidden></p><div><button class="dxc-send" type="submit">Send the chat</button></div></form>'
      + '<form class="dxc-c dxc-lv-c" data-lv-comp novalidate><label for="dxcLvIn" class="dxc-vh">Your message</label>'
      + '<textarea id="dxcLvIn" rows="1" maxlength="2000" placeholder="Write a message" autocomplete="off"></textarea>'
      + '<button class="dxc-send dxc-send-i" type="submit" aria-label="Send" title="Send">' + H.ico('send') + '</button></form></div>';
    var hrs = root.querySelector('.dxc-hrs');
    if (hrs) hrs.insertAdjacentElement('afterend', box); else root.insertBefore(box, root.firstChild);
    var $ = function (s) { return box.querySelector(s); };
    var intro = $('[data-lv-intro]'), stL = $('[data-lv-st]'), startF = $('[data-lv-start]'), thread = $('[data-lv-thread]'), log = $('[data-lv-log]'), typ = $('[data-lv-typ]'),
      comp = $('[data-lv-comp]'), ta = $('#dxcLvIn'), errL = $('[data-lv-err]'), mailB = $('[data-lv-mailb]'), endB = $('[data-lv-end]'), mailF = $('[data-lv-mail]');
    var startB = H.pill('Chat with a counsellor now', null, 'support'); startB.classList.add('dxc-pill-p'); startB.setAttribute('aria-expanded', 'false'); intro.appendChild(startB);
    var againB = H.pill('Start a new chat', null, 'support'); againB.hidden = true; intro.appendChild(againB);

    /* ---------- what the support view shows ---------- */
    function view() {
      var on = st.status && st.status.enabled, open = st.conv && st.conv.status !== 'closed';
      box.hidden = !on && !st.conv;
      root.classList.toggle('is-live', !!open);
      thread.hidden = !st.conv;
      comp.hidden = !open; endB.hidden = !open;
      var canStart = on && st.status.online && !open;
      intro.hidden = !canStart && !(st.ended && on && st.status.online);
      startB.hidden = !canStart || st.ended; againB.hidden = !(st.ended && on && st.status.online);
      if (!canStart) { startF.hidden = true; startB.setAttribute('aria-expanded', 'false'); }
      stL.textContent = !on ? '' : st.status.online ? 'A counsellor is online now.' : '';
      stL.hidden = !stL.textContent;
      if (hrs && st.status && st.status.hours) hrs.textContent = 'Office hours: ' + st.status.hours + '.';
    }
    function status() {
      return req('GET', '/live/status').then(function (s) { st.status = s; view(); return s; }, function () { st.status = { enabled: false }; view(); });
    }

    /* ---------- messages ---------- */
    function add(m, quiet) {
      if (!m || st.ids[m.id]) return; st.ids[m.id] = 1; if (m.id > st.last) st.last = m.id;
      var who = m.sender || {}, n;
      if (m.kind === 'system' || who.type === 'system') n = el('p', 'dxc-note', m.body);
      else if (m.mine || who.type === 'visitor') n = el('div', 'dxc-m u', m.body);
      else { n = el('div', 'dxc-m b dxc-lv-b'); n.appendChild(el('span', 'dxc-lv-n', who.name || 'Dolphin Education')); n.appendChild(el('p', null, m.body)); }
      log.appendChild(n);
      if (!quiet && !(m.mine || who.type === 'visitor' || who.type === 'system')) { typing(null); H.reply(m); read(); }
      if (H.visible()) H.later(H.scrollEnd);
    }
    function addAll(list, quiet) { (list || []).forEach(function (m) { add(m, quiet); }); }
    function read() { if (st.conv && H.visible() && !D.hidden) req('POST', '/live/' + st.conv.id + '/read', {}).then(null, function () {}); }
    function catchUp() {
      if (!st.conv) return Promise.resolve();
      return req('GET', '/live/' + st.conv.id + '/messages?after=' + st.last).then(function (r) {
        addAll(r.items); if (r.status && r.status !== st.conv.status) { st.conv.status = r.status; if (r.status === 'closed') ended('The counsellor closed this chat.'); }
      });
    }
    function typing(who) {
      clearTimeout(st.tt);
      typ.textContent = who ? (who.name || 'A counsellor') + ' is typing' : '';
      if (who) st.tt = setTimeout(function () { typ.textContent = ''; }, 4500);
    }

    /* ---------- the socket, with backoff, and polling when it keeps failing ---------- */
    function connect() {
      clearTimeout(st.rt);
      if (!st.conv || st.conv.status === 'closed' || st.ws || !W.WebSocket) { if (!W.WebSocket) poll(); return; }
      var ws, opened = false;
      try { ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'); } catch (e) { st.fails++; return retry(); }
      st.ws = ws;
      ws.onopen = function () { opened = true; st.tries = 0; st.fails = 0; clearTimeout(st.pt); st.pt = 0; ws.send(JSON.stringify({ t: 'sub', conv: st.conv.id })); catchUp().then(null, function () {}); };
      ws.onmessage = function (e) {
        var f; try { f = JSON.parse(e.data); } catch (x) { return; }
        if (f.t === 'msg' && st.conv && f.conv === st.conv.id) add(f.message);
        else if (f.t === 'typing' && st.conv && f.conv === st.conv.id && f.who && f.who.type !== 'visitor') typing(f.who);
        else if (f.t === 'conv' && f.conversation && st.conv && f.conversation.id === st.conv.id) { var was = st.conv.status; st.conv.status = f.conversation.status; if (was !== 'closed' && st.conv.status === 'closed') ended('The counsellor closed this chat.'); }
        else if ((f.t === 'hello' && f.online != null) || f.t === 'presence') { if (st.status) { st.status.online = f.t === 'hello' ? !!f.online : !!f.online; view(); } }
      };
      ws.onclose = function (e) {
        st.ws = null; if (!opened) st.fails++;
        if (e.code === 4403) { st.conv = null; flag(false); view(); return; }
        retry();
      };
    }
    function retry() {
      if (!st.conv || st.conv.status === 'closed') return;
      if (st.fails >= 2) poll();
      st.rt = setTimeout(connect, BACK[Math.min(st.tries++, BACK.length - 1)] * 1000);
    }
    function poll() {
      if (st.pt || !st.conv) return;
      var tick = function () {
        if (!st.conv || st.conv.status === 'closed' || (st.ws && st.ws.readyState === 1)) { st.pt = 0; return; }
        catchUp().then(null, function () {}).then(function () { st.pt = setTimeout(tick, D.hidden ? 20000 : 4000); });
      };
      st.pt = setTimeout(tick, D.hidden ? 20000 : 4000);
    }
    function stop() { clearTimeout(st.rt); clearTimeout(st.pt); st.pt = 0; if (st.ws) { st.ws.onclose = null; try { st.ws.close(); } catch (e) {} st.ws = null; } }

    /* ---------- start, send, end, transcript ---------- */
    function begin(c, msgs, note) {
      st.conv = c; st.ended = false; st.ids = {}; st.last = 0; log.innerHTML = '';
      addAll(msgs, true); if (note) log.appendChild(el('p', 'dxc-note', note));
      flag(true); view(); connect();
    }
    function ended(t) {
      stop(); st.ended = true; flag(false); typing(null);
      log.appendChild(el('p', 'dxc-note', t)); view();
    }
    function showErr(p, t) { p.textContent = t; p.hidden = !t; }

    startB.addEventListener('click', function () {
      startF.hidden = false; startB.setAttribute('aria-expanded', 'true');
      H.later(function () { var f = startF.querySelector('input[name=name]'); f.focus(); startF.scrollIntoView({ block: 'nearest' }); });
    });
    againB.addEventListener('click', function () { st.conv = null; st.ended = false; log.innerHTML = ''; view(); startB.click(); });
    startF.addEventListener('submit', function (e) {
      e.preventDefault();
      var E = startF.elements, err = startF.querySelector('.dxc-err'), b = startF.querySelector('.dxc-send'), msg = E.namedItem('msg').value.trim(), ct = E.namedItem('contact').value.trim();
      [E.namedItem('msg'), E.namedItem('contact')].forEach(function (i) { i.removeAttribute('aria-invalid'); });
      if (!msg) { showErr(err, 'Write your question first.'); E.namedItem('msg').setAttribute('aria-invalid', 'true'); E.namedItem('msg').focus(); return; }
      if (ct && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ct) || /^\+?\d[\d\s-]{6,}$/.test(ct))) { showErr(err, 'Please check the phone number or email.'); E.namedItem('contact').setAttribute('aria-invalid', 'true'); E.namedItem('contact').focus(); return; }
      showErr(err, ''); b.disabled = true;
      var lg = H.lang(), data = { message: msg, page: H.page(), client_id: cid(), website: E.namedItem('website').value };
      if (/^(en|ne|es|ko|zh)$/.test(lg)) data.language = lg;
      if (E.namedItem('name').value.trim()) data.name = E.namedItem('name').value.trim();
      if (ct) data.contact = ct;
      req('POST', '/live/start', data).then(function (r) {
        b.disabled = false;
        if (!r.conversation) return;
        startF.reset(); startF.hidden = true;
        begin(r.conversation, r.messages, r.note);
        H.later(function () { ta.focus(); });
      }, function (x) {
        b.disabled = false;
        showErr(err, x.message === 'no-api' ? 'Live chat is not available right now. Please leave a message below.' : x.message);
        if (x.code === 'live_chat_off' || x.code === 'blocked') status();
      });
    });

    function grow() { ta.style.height = 'auto'; ta.style.height = Math.min(120, Math.max(48, ta.scrollHeight + 2)) + 'px'; }
    ta.addEventListener('input', function () {
      grow();
      if (st.ws && st.ws.readyState === 1 && Date.now() - st.typedAt > 3000) { st.typedAt = Date.now(); try { st.ws.send(JSON.stringify({ t: 'typing', conv: st.conv.id })); } catch (e) {} }
    });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); comp.requestSubmit ? comp.requestSubmit() : comp.dispatchEvent(new Event('submit', { cancelable: true })); } });
    comp.addEventListener('submit', function (e) {
      e.preventDefault();
      var t = ta.value.replace(/\s+$/, '').trim(), b = comp.querySelector('.dxc-send'); if (!t || !st.conv || b.disabled) return;
      b.disabled = true; showErr(errL, '');
      req('POST', '/live/' + st.conv.id + '/messages', { body: t, client_id: cid() }).then(function (m) {
        ta.value = ''; grow(); add(m, true); b.disabled = false; ta.focus();
      }, function (x) { b.disabled = false; showErr(errL, x.message === 'no-api' ? 'Your message did not send. Please try again.' : x.message); });
    });
    endB.addEventListener('click', function () {
      if (!st.conv) return;
      endB.disabled = true;
      req('POST', '/live/' + st.conv.id + '/close', {}).then(function () { endB.disabled = false; st.conv.status = 'closed'; ended('You ended the chat.'); mailB.focus(); },
        function (x) { endB.disabled = false; showErr(errL, x.message); });
    });
    mailB.addEventListener('click', function () {
      var on = mailF.hidden; mailF.hidden = !on; mailB.setAttribute('aria-expanded', String(on));
      if (on) H.later(function () { mailF.querySelector('input').focus(); mailF.scrollIntoView({ block: 'nearest' }); });
    });
    mailF.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = mailF.querySelector('input'), err = mailF.querySelector('.dxc-err'), b = mailF.querySelector('.dxc-send'), v = f.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { showErr(err, 'Please check the email address.'); f.setAttribute('aria-invalid', 'true'); f.focus(); return; }
      f.removeAttribute('aria-invalid'); showErr(err, ''); b.disabled = true;
      req('POST', '/live/' + st.conv.id + '/transcript', { email: v }).then(function (r) {
        b.disabled = false; mailF.hidden = true; mailB.setAttribute('aria-expanded', 'false');
        log.appendChild(el('p', 'dxc-note', r.emailed ? 'We sent this chat to ' + v + '.' : 'We could not send email right now. Please try again later.'));
        H.later(H.scrollEnd);
      }, function (x) { b.disabled = false; showErr(err, x.message === 'no-api' ? 'We could not send email right now. Please try again later.' : x.message); });
    });

    D.addEventListener('visibilitychange', function () { if (!D.hidden) read(); });
    /* while the support view is open with no chat going, the "online" line stays current */
    setInterval(function () { if (H.visible() && !(st.conv && st.conv.status !== 'closed') && !D.hidden) status(); }, 30000);

    /* boot: status + any chat this visitor already has open */
    Promise.all([status(), req('GET', '/live/current').then(null, function () { return null; })]).then(function (r) {
      var cur = r[1];
      if (cur && cur.conversation && cur.conversation.status !== 'closed') begin(cur.conversation, cur.messages);
      else { flag(false); view(); }
    });

    return {
      shown: function () { if (st.conv && st.conv.status !== 'closed') { read(); H.later(H.scrollEnd); } else status(); }
    };
  }

  W.DXChatLive = { mount: mount };
})();
