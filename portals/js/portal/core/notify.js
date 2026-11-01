/* Dolphin portals: shared notifications (window.Notify): the "Alerts" button with an unread count, its panel, and live toasts.
   Contract: HANDOFF_PHASE_A.md section 7 (GET /api/notifications, POST /api/notifications/read) and section 8 (frame {t:'notify'}).
   Needs js/portal/core/portal-api.js and css/notify.css. How to mount it: HANDOFF_PORTAL_SHARED.md.
   Notify.mount(host, opts) -> instance      Notify.toast({title, body?, action?:{label, fn}, timeout?})  (usable without mounting) */
(function () {
  "use strict";
  var api = window.PortalAPI, live = api && api.live, doc = document;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function when(s) { if (!s) return null; var d = new Date(String(s).replace(" ", "T") + (/[zZ]$/.test(s) ? "" : "Z")); return isNaN(d) ? null : d; }
  function ago(s) {
    var d = when(s); if (!d) return ""; var m = Math.round((Date.now() - d) / 60000);
    if (m < 1) return "Just now"; if (m < 60) return m + " min ago"; var h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? " hour ago" : " hours ago");
    var dd = Math.round(h / 24); if (dd < 7) return dd === 1 ? "Yesterday" : dd + " days ago";
    return d.getDate() + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  }
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- toasts: one stack per page, polite live region ---------- */
  function stack() {
    var s = $(".nt-toasts"); if (s) return s;
    s = doc.createElement("div"); s.className = "nt-toasts"; s.setAttribute("role", "region"); s.setAttribute("aria-label", "New alerts");
    s.innerHTML = '<div class="nt-tl" aria-live="polite" aria-relevant="additions"></div>'; doc.body.appendChild(s); return s;
  }
  function toast(o) {
    if (typeof o === "string") o = { title: o };
    var list = $(".nt-tl", stack()), t = doc.createElement("div"), ms = o.timeout || (o.action ? 7000 : 3600), h = null;
    t.className = "nt-toast" + (o.tone ? " " + o.tone : ""); t.setAttribute("role", o.tone === "error" ? "alert" : "status");
    t.innerHTML = '<div class="nt-tb"><b>' + esc(o.title) + "</b>" + (o.body ? "<span>" + esc(o.body) + "</span>" : "") + "</div>" +
      (o.action ? '<button type="button" class="nt-ta">' + esc(o.action.label || "Open") + "</button>" : "") + '<button type="button" class="nt-tx" aria-label="Dismiss">×</button>';
    function go() { clearTimeout(h); t.classList.add("out"); setTimeout(function () { t.remove(); }, reduce ? 0 : 180); }
    function arm() { clearTimeout(h); h = setTimeout(go, ms); }
    t.addEventListener("click", function (e) { if (e.target.closest(".nt-tx")) go(); else if (e.target.closest(".nt-ta")) { go(); o.action.fn(); } });
    t.addEventListener("mouseenter", function () { clearTimeout(h); }); t.addEventListener("mouseleave", arm);
    t.addEventListener("focusin", function () { clearTimeout(h); }); t.addEventListener("focusout", arm);
    list.appendChild(t); while (list.children.length > 4) list.firstChild.remove(); arm();
    return { close: go };
  }

  /* ---------- the Alerts button + panel ---------- */
  function mount(host, opts) {
    opts = opts || {};
    var S = { items: [], unread: 0, open: false, loading: true, err: null, maxId: 0, dead: false }, offs = [], id = "ntP" + Math.random().toString(36).slice(2, 7);
    host.classList.add("nt");
    host.innerHTML = '<button type="button" class="nt-bell" aria-haspopup="dialog" aria-expanded="false" aria-controls="' + id + '"><span class="nt-l">' + esc(opts.label || "Alerts") + '</span><b class="nt-n" aria-hidden="true"></b><span class="nt-sr"></span></button>' +
      '<div class="nt-panel" id="' + id + '" role="dialog" aria-label="' + esc(opts.label || "Alerts") + '" hidden><div class="nt-ph"><h2>' + esc(opts.label || "Alerts") + '</h2><button type="button" class="nt-all" data-nt="all">Mark all as read</button></div><ul class="nt-list" role="list"></ul></div>';
    var bell = $(".nt-bell", host), panel = $(".nt-panel", host), list = $(".nt-list", host);
    function hrefOf(n) { var h = opts.href ? opts.href(n) : null; return h || n.link || null; }
    function paintCount() {
      var n = S.unread; $(".nt-n", host).textContent = n ? (n > 99 ? "99+" : n) : ""; $(".nt-sr", host).textContent = n ? ", " + n + " unread" : ", nothing unread";
      bell.classList.toggle("has", !!n); if (opts.onCount) opts.onCount(n);
      if (opts.titleCount) { var base = doc.title.replace(/^\(\d+\+?\)\s*/, ""); doc.title = n ? "(" + n + ") " + base : base; }
    }
    function paintList() {
      if (S.loading && !S.items.length) { list.innerHTML = '<li class="nt-sk" aria-hidden="true"><i></i><i></i></li><li class="nt-sk" aria-hidden="true"><i></i><i></i></li>'; return; }
      if (S.err && !S.items.length) { list.innerHTML = '<li class="nt-empty">' + esc(api.message(S.err)) + "</li>"; return; }
      if (!S.items.length) { list.innerHTML = '<li class="nt-empty">' + esc(opts.emptyText || "Nothing new. Alerts for chats, hand-overs and stories appear here.") + "</li>"; return; }
      list.innerHTML = S.items.map(function (n) {
        return '<li><button type="button" class="nt-it' + (n.read ? "" : " un") + '" data-nt="open" data-id="' + n.id + '">' + (n.read ? "" : '<span class="nt-new">New</span>') + "<b>" + esc(n.title) + "</b>" + (n.body ? "<span>" + esc(n.body) + "</span>" : "") + "<time>" + esc(ago(n.created_at)) + "</time></button></li>";
      }).join("");
      $(".nt-all", host).hidden = !S.unread;
    }
    function load(quiet) {
      if (!quiet) { S.loading = true; paintList(); }
      return api.get("/api/notifications", { limit: opts.limit || 30 }).then(function (b) {
        if (S.dead) return; S.loading = false; S.err = null; S.items = b.items || []; S.unread = b.unread || 0;
        S.maxId = S.items.reduce(function (m, n) { return Math.max(m, n.id); }, S.maxId); paintCount(); paintList();
      }, function (e) { if (S.dead) return; S.loading = false; S.err = e; paintList(); });
    }
    function add(n, quiet) {
      if (S.items.some(function (x) { return x.id === n.id; })) return;
      S.items.unshift(n); S.maxId = Math.max(S.maxId, n.id); if (!n.read) S.unread++; paintCount(); paintList();
      if (!quiet && opts.toasts !== false && !S.open && (!opts.toastFilter || opts.toastFilter(n))) toast({ title: n.title, body: n.body, action: { label: "Open", fn: function () { openItem(n); } } });
      if (opts.onNew) opts.onNew(n);
    }
    function poll() { api.get("/api/notifications", { after: S.maxId, limit: 30 }).then(function (b) { (b.items || []).slice().reverse().forEach(function (n) { add(n); }); if (typeof b.unread === "number") { S.unread = b.unread; paintCount(); } }, function () { /* next poll */ }); }
    function markRead(ids) { return api.post("/api/notifications/read", ids ? { ids: ids } : { all: true }).then(function (b) { if (typeof b.unread === "number") S.unread = b.unread; paintCount(); }, function () { /* best effort */ }); }
    function openItem(n) {
      if (!n.read) { n.read = true; S.unread = Math.max(0, S.unread - 1); paintCount(); paintList(); markRead([n.id]); }
      setOpen(false, true);
      if (opts.onOpen) { if (opts.onOpen(n) !== false) return; }
      var h = hrefOf(n); if (!h) return;
      if (h.charAt(0) === "#") location.hash = h; else location.href = h;
    }
    function setOpen(o, keepFocus) {
      S.open = o; panel.hidden = !o; bell.setAttribute("aria-expanded", String(o)); host.classList.toggle("on", o);
      if (o) { load(true); var f = $(".nt-it,.nt-all:not([hidden])", panel); setTimeout(function () { (f || panel).focus(); }, 0); }
      else if (!keepFocus) bell.focus();
    }
    host.addEventListener("click", function (e) {
      if (e.target.closest(".nt-bell")) { setOpen(!S.open, true); return; }
      var a = e.target.closest("[data-nt]"); if (!a) return;
      if (a.dataset.nt === "all") { S.items.forEach(function (n) { n.read = true; }); S.unread = 0; paintCount(); paintList(); markRead(null); bell.focus(); return; }
      if (a.dataset.nt === "open") { var n = S.items.filter(function (x) { return x.id === +a.dataset.id; })[0]; if (n) openItem(n); }
    });
    function outside(e) { if (S.open && !host.contains(e.target)) setOpen(false, true); }
    function key(e) {
      if (!S.open) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); return; }
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && panel.contains(doc.activeElement)) { e.preventDefault(); var it = $$(".nt-it,.nt-all:not([hidden])", panel), i = it.indexOf(doc.activeElement); var nx = it[(i + (e.key === "ArrowDown" ? 1 : -1) + it.length) % it.length]; if (nx) nx.focus(); }
      if (e.key === "Tab" && panel.contains(doc.activeElement)) { var all = $$("button:not([hidden])", panel); if (!all.length) return; if (!e.shiftKey && doc.activeElement === all[all.length - 1]) { setOpen(false, true); } }
    }
    doc.addEventListener("click", outside, true); doc.addEventListener("keydown", key, true);
    if (live) {
      offs.push(live.on("notify", function (f) { if (f.notification) add(f.notification); }));
      offs.push(live.on("state", function (s) { if (s.state === "live") poll(); }));
      live.poll("notify", poll); live.start();
    }
    load();
    return {
      el: host, refresh: function () { return load(true); }, count: function () { return S.unread; }, open: function () { setOpen(true); }, close: function () { setOpen(false, true); },
      markAll: function () { return markRead(null).then(function () { S.items.forEach(function (n) { n.read = true; }); paintList(); }); },
      destroy: function () { S.dead = true; offs.forEach(function (f) { f(); }); if (live) live.unpoll("notify"); doc.removeEventListener("click", outside, true); doc.removeEventListener("keydown", key, true); host.innerHTML = ""; host.classList.remove("nt", "on"); }
    };
  }
  window.Notify = { mount: mount, toast: toast, ago: ago };
})();
