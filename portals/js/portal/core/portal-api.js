/* Dolphin portals: shared API helper. window.PortalAPI
   - same-origin fetch with the session cookie, JSON in/out, 8 s timeout
   - keeps the CSRF token from /api/auth/login and /api/auth/me and sends it as X-CSRF-Token on writes
   - rejects with an Error carrying .status, .code, .details, .body; .offline = true when the API is unreachable
     (static preview on :5750 answers HTML, not JSON) ; 401 also fires the "unauth" event so the page can show sign-in
   - PortalAPI.message(err) gives a friendly sentence (403 -> "Your role cannot do this", 429, 5xx, offline) */
(function () {
  "use strict";
  var CSRF = null, USER = null, BASE = "", EV = {};
  function emit(k, d) { (EV[k] || []).forEach(function (f) { try { f(d); } catch (e) { /* listener error must not break the call */ } }); }
  function err(status, body, offline) {
    var e = new Error((body && body.error) || (offline ? "The server cannot be reached." : "Request failed (" + status + ")."));
    e.status = status; e.code = body && body.code || (offline ? "offline" : "error"); e.details = body && body.details || null; e.body = body || null; e.offline = !!offline;
    return e;
  }
  function call(method, path, data) {
    if (location.protocol === "file:") return Promise.reject(err(0, null, true));
    var h = { Accept: "application/json" };
    if (data !== undefined) h["Content-Type"] = "application/json";
    if (CSRF && method !== "GET") h["X-CSRF-Token"] = CSRF;
    var ctl = "AbortController" in window ? new AbortController() : null, t = ctl && setTimeout(function () { ctl.abort(); }, 8000);
    return fetch(BASE + path, { method: method, headers: h, body: data === undefined ? undefined : JSON.stringify(data), credentials: "same-origin", signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        if (t) clearTimeout(t);
        return r.text().then(function (txt) {
          var b = null, json = true;
          try { b = txt ? JSON.parse(txt) : null; } catch (e) { json = false; }
          if (!json) throw err(r.status, null, true);
          if (b && b.csrf) CSRF = b.csrf;
          if (r.status === 401) { USER = null; emit("unauth", { path: path }); throw err(401, b); }
          if (!r.ok) throw err(r.status, b);
          return b;
        });
      }, function (e) { if (t) clearTimeout(t); throw err(0, null, true); });
  }
  function qs(o) {
    var p = []; Object.keys(o || {}).forEach(function (k) { var v = o[k]; if (v === undefined || v === null || v === "") return; p.push(encodeURIComponent(k) + "=" + encodeURIComponent(v)); });
    return p.length ? "?" + p.join("&") : "";
  }
  window.PortalAPI = {
    get: function (p, q) { return call("GET", p + qs(q)); },
    post: function (p, d) { return call("POST", p, d || {}); },
    patch: function (p, d) { return call("PATCH", p, d || {}); },
    delete: function (p) { return call("DELETE", p); },
    put: function (p, d) { return call("PUT", p, d || {}); },
    /* raw file upload (PDF, JPG or PNG up to 10 MB): the bytes are the body, details go in the query string */
    upload: function (path, file, query) {
      var h = { Accept: "application/json", "Content-Type": "application/octet-stream" }; if (CSRF) h["X-CSRF-Token"] = CSRF;
      return fetch(BASE + path + qs(query), { method: "POST", headers: h, body: file, credentials: "same-origin" }).then(function (r) {
        return r.text().then(function (txt) {
          var b = null; try { b = txt ? JSON.parse(txt) : null; } catch (e) { /* non-JSON error page */ }
          if (r.status === 401) { USER = null; emit("unauth", { path: path }); throw err(401, b); }
          if (!r.ok) throw err(r.status, b || { error: r.status === 413 ? "That file is larger than 10 MB." : "Upload failed (" + r.status + ")." });
          return b;
        });
      }, function () { throw err(0, null, true); });
    },
    login: function (email, password) { return call("POST", "/api/auth/login", { email: email, password: password }).then(function (b) { USER = b.user; CSRF = b.csrf; emit("auth", USER); return USER; }); },
    logout: function () { return call("POST", "/api/auth/logout", {}).then(function () { USER = null; CSRF = null; emit("signout"); }, function () { USER = null; CSRF = null; emit("signout"); }); },
    me: function () { return call("GET", "/api/auth/me").then(function (b) { USER = b.user; CSRF = b.csrf; return USER; }); },
    user: function () { return USER; },
    on: function (k, f) { (EV[k] = EV[k] || []).push(f); },
    qs: qs,
    message: function (e) {
      if (!e) return "Something went wrong.";
      if (e.offline) return "The server cannot be reached. Check the connection and try again.";
      if (e.status === 401) return "Your session has ended. Please sign in again.";
      if (e.status === 403) return e.code === "csrf" ? "The page is out of date. Reload and try again." : "Your role cannot do this. Ask a head office administrator.";
      if (e.status === 413) return "That file is larger than 10 MB.";
      if (e.status === 415) return "Only PDF, JPG or PNG files are accepted.";
      if (e.status === 404) return e.message || "Not found.";
      if (e.status === 409) return e.message || "That already exists.";
      if (e.status === 429) return "Too many attempts. Wait a minute and try again.";
      if (e.status >= 500) return "Something went wrong on our side. Try again in a moment.";
      return e.message || "Something went wrong.";
    },
    /* loading state on a button: label hidden, spinner shown, no layout shift */
    busy: function (btn, on) { if (!btn) return; if (on) { btn.classList.add("is-loading"); btn.setAttribute("aria-busy", "true"); btn.disabled = true; } else { btn.classList.remove("is-loading"); btn.removeAttribute("aria-busy"); btn.disabled = false; } },
    /* form -> object; empty strings dropped; checkboxes true/false */
    formData: function (f) { var o = {}; Array.prototype.forEach.call(f.elements, function (el) { if (!el.name || el.disabled) return; if (el.type === "checkbox") o[el.name] = el.checked; else if (el.type === "radio") { if (el.checked) o[el.name] = el.value; } else { var v = (el.value || "").trim(); if (v !== "") o[el.name] = v; } }); return o; },
    /* show {details:{field:msg}} next to the fields (.err[data-for]) or on the form's general error line */
    showErrors: function (f, e) {
      var d = e && e.details || {}, first = null, gen = f.querySelector(".err[data-for=form]");
      Array.prototype.forEach.call(f.querySelectorAll(".err[data-for]"), function (p) { if (p.dataset.for !== "form") { p.textContent = ""; p.hidden = true; } });
      Array.prototype.forEach.call(f.querySelectorAll("[aria-invalid]"), function (i) { i.removeAttribute("aria-invalid"); });
      Object.keys(d).forEach(function (k) { var i = f.querySelector('[name="' + k + '"]'), p = f.querySelector('.err[data-for="' + k + '"]'); if (p) { p.textContent = d[k]; p.hidden = false; } if (i) { i.setAttribute("aria-invalid", "true"); if (!first) first = i; } });
      if (gen) { gen.textContent = first ? "" : window.PortalAPI.message(e); gen.hidden = !!first; }
      if (first) first.focus();
    }
  };
  /* ===== ADDITIVE (2026-11-01, Content Manager build): shared by js/portal/core/convo.js, js/portal/core/notify.js, js/portal/core/media-picker.js and every portal =====
     PortalAPI.csrf()                      current CSRF token (or null)
     PortalAPI.uploadProgress(path, file, query, onProgress(0..1)) -> Promise  (XHR so the bar can move; same errors as upload)
     PortalAPI.live                        one WebSocket per page (HANDOFF_PHASE_A.md section 8), see below */
  window.PortalAPI.csrf = function () { return CSRF; };
  window.PortalAPI.uploadProgress = function (path, file, query, onProgress) {
    if (location.protocol === "file:") return Promise.reject(err(0, null, true));
    return new Promise(function (res, rej) {
      var x = new XMLHttpRequest();
      x.open("POST", BASE + path + qs(query));
      x.setRequestHeader("Accept", "application/json"); x.setRequestHeader("Content-Type", "application/octet-stream");
      if (CSRF) x.setRequestHeader("X-CSRF-Token", CSRF);
      x.withCredentials = true;
      if (x.upload && onProgress) x.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      x.onload = function () {
        var b = null; try { b = x.responseText ? JSON.parse(x.responseText) : null; } catch (e) { /* not JSON */ }
        if (x.status === 401) { USER = null; emit("unauth", { path: path }); rej(err(401, b)); return; }
        if (x.status < 200 || x.status >= 300) { rej(err(x.status, b || { error: x.status === 413 ? "That file is too large." : "Upload failed (" + x.status + ")." })); return; }
        if (onProgress) onProgress(1); res(b);
      };
      x.onerror = function () { rej(err(0, null, true)); };
      x.send(file);
    });
  };

  /* PortalAPI.live: push-only socket. Writes always go through REST.
     live.start()  open after sign-in (idempotent)         live.stop()  on sign-out
     live.on(type, fn)  type = msg | conv | typing | notify | presence | hello | features | state | closed
       "state" gives {state: "connecting" | "live" | "reconnecting" | "polling" | "off"}; "closed" gives {code} for 4401 (signed out) / 4403 (blocked)
     live.sub(conv) / live.unsub(conv)   kept across reconnects      live.typing(conv)  throttled 1 per 3 s      live.read(conv, id)
     live.poll(key, fn)  registers a fallback poller: runs every 4 s (visible tab) / 20 s (hidden) only while the socket is down (state polling)
     live.unpoll(key)    live.state()  live.isLive()
     Reconnect backoff 1, 2, 5, 10, 30 s. After two failed connects in a row the page polls and keeps trying the socket every 30 s. */
  window.PortalAPI.live = (function () {
    var ws = null, want = false, st = "off", fails = 0, tries = 0, timer = null, ping = null, subs = {}, polls = {}, pt = null, LEV = {}, lastTyping = {};
    var BACK = [1, 2, 5, 10, 30];
    function fire(k, d) { (LEV[k] || []).forEach(function (f) { try { f(d); } catch (e) { /* listener error */ } }); }
    function set(s) { if (st === s) return; st = s; fire("state", { state: s }); schedulePoll(); }
    function send(o) { if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(o)); return true; } catch (e) { return false; } } return false; }
    function url() { return (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws"; }
    function connect() {
      clearTimeout(timer); timer = null;
      if (!want || !("WebSocket" in window) || location.protocol === "file:") { if (want) set("polling"); return; }
      var opened = false, s;
      try { s = new WebSocket(url()); } catch (e) { onFail(); return; }
      ws = s; if (st !== "polling") set(tries ? "reconnecting" : "connecting");
      s.onopen = function () { opened = true; fails = 0; tries = 0; set("live"); Object.keys(subs).forEach(function (c) { send({ t: "sub", conv: +c }); });
        clearInterval(ping); ping = setInterval(function () { send({ t: "ping" }); }, 25000); };
      s.onmessage = function (e) { var f; try { f = JSON.parse(e.data); } catch (x) { return; } if (f && f.t) fire(f.t, f); };
      s.onclose = function (e) {
        clearInterval(ping); if (ws === s) ws = null;
        if (e.code === 4401 || e.code === 4403) { want = false; set("off"); fire("closed", { code: e.code }); return; }
        if (!want) { set("off"); return; }
        if (!opened) fails++; onFail();
      };
      s.onerror = function () { /* onclose follows */ };
    }
    function onFail() {
      if (!want) return;
      var wait = BACK[Math.min(tries, BACK.length - 1)]; tries++;
      if (fails >= 2) { set("polling"); wait = Math.max(wait, 30); } else set("reconnecting");
      timer = setTimeout(connect, wait * 1000);
    }
    function schedulePoll() {
      clearTimeout(pt); pt = null;
      if (st !== "polling") return;
      pt = setTimeout(function run() {
        Object.keys(polls).forEach(function (k) { try { polls[k](); } catch (e) { /* poller error */ } });
        if (st === "polling") pt = setTimeout(run, document.hidden ? 20000 : 4000);
      }, document.hidden ? 20000 : 4000);
    }
    document.addEventListener("visibilitychange", function () { if (st === "polling") schedulePoll(); });
    window.addEventListener("online", function () { if (want && !ws) { tries = 0; connect(); } });
    return {
      start: function () { if (want && (ws || timer)) return; want = true; fails = 0; tries = 0; connect(); },
      stop: function () { want = false; clearTimeout(timer); timer = null; clearInterval(ping); subs = {}; if (ws) { try { ws.close(1000); } catch (e) { /* closed */ } ws = null; } set("off"); },
      on: function (k, f) { (LEV[k] = LEV[k] || []).push(f); return function () { LEV[k] = (LEV[k] || []).filter(function (x) { return x !== f; }); }; },
      sub: function (c) { if (!c) return; subs[c] = 1; send({ t: "sub", conv: +c }); },
      unsub: function (c) { if (!c) return; delete subs[c]; send({ t: "unsub", conv: +c }); },
      typing: function (c) { var n = Date.now(); if (lastTyping[c] && n - lastTyping[c] < 3000) return; lastTyping[c] = n; send({ t: "typing", conv: +c }); },
      read: function (c, id) { send({ t: "read", conv: +c, id: id }); },
      poll: function (k, f) { polls[k] = f; },
      unpoll: function (k) { delete polls[k]; },
      state: function () { return st; },
      isLive: function () { return st === "live"; }
    };
  })();
})();

/* ===== ADDITIVE (2026-11-01, System console build): "view as" banner on every portal =====
   When a system administrator opens someone's portal with "View as" (POST /api/sys/impersonate), /api/auth/me returns the viewed user with
   impersonated_by set and the session is read only (writes answer 403 read_only_view). Every portal calls PortalAPI.me() at start, so this
   wraps it: the page gets a fixed banner "Viewing as <name>, read only" with "Stop viewing" (POST /api/sys/impersonate/stop -> back to
   /super.html), and PortalAPI.message() explains read_only_view. Nothing else changes; no effect for normal sessions. */
(function () {
  "use strict";
  var A = window.PortalAPI; if (!A || A._viewAsBanner) return; A._viewAsBanner = true;
  var me0 = A.me, msg0 = A.message;
  A.message = function (e) { if (e && e.code === "read_only_view") return "You are viewing this portal as someone else, read only. Stop viewing to make changes."; return msg0(e); };
  A.me = function () { return me0.apply(A, arguments).then(function (u) { if (u && u.impersonated_by) banner(u); return u; }); };
  function banner(u) {
    if (document.getElementById("dx-viewas")) return;
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    var b = document.createElement("div"); b.id = "dx-viewas"; b.setAttribute("role", "status");
    b.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:2147483000;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 16px;min-height:48px;padding:8px 16px;" +
      "font:500 14px/1.35 'Rethink Sans','Segoe UI',system-ui,sans-serif;background:" + (dark ? "#eaa3cf" : "#6D1428") + ";color:" + (dark ? "#161616" : "#fff") + ";text-align:center";
    var t = document.createElement("span"); t.textContent = "Viewing as " + (u.name || "this user") + ", read only. Nothing can be changed while you view.";
    var s = document.createElement("button"); s.type = "button"; s.textContent = "Stop viewing";
    s.style.cssText = "min-height:36px;padding:0 16px;border:0;border-radius:999px;cursor:pointer;font-weight:600;font-size:13.5px;font-family:inherit;background:" + (dark ? "#161616" : "#fff") + ";color:" + (dark ? "#fff" : "#6D1428");
    s.addEventListener("click", function () { s.disabled = true; A.post("/api/sys/impersonate/stop", {}).then(go, go); });
    function go() { location.href = "/super.html#/viewas"; }
    b.appendChild(t); b.appendChild(s);
    document.body.appendChild(b);
    document.body.style.paddingTop = "48px";
  }
})();
