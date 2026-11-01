/* Dolphin Content Manager portal: core. Sign-in gate (/auth/me portal), shell (sidebar, top bar, phone tab bar, More sheet), hash router with
   an unsaved-changes guard, drawer, helpers, Alerts (js/portal/core/notify.js) and the live socket (PortalAPI.live). Views live in content-views.js,
   content-cms.js and content-clients.js and register on CM.V. API contract: HANDOFF_PHASE_A.md. */
(function () {
  "use strict";
  var api = window.PortalAPI, live = api.live, NS = window.NS, doc = document;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var S = { me: null, branch: null, counts: { inbox: 0, stories: 0, forwards: 0 }, leave: [], guard: null, cur: null, notify: null };
  var ROUTES = [
    ["today", "Today", "Work"], ["inbox", "Inbox", "Work"], ["forwards", "Forwards", "Work"],
    ["website", "Website content", "Website"], ["media", "Media library", "Website"], ["stories", "Stories", "Website"],
    ["clients", "Clients", "Clients"]
  ];
  var TABS = [["today", "Today"], ["inbox", "Inbox"], ["website", "Website"], ["clients", "Clients"]];

  var CM = window.CM = {
    api: api, live: live, S: S, V: {}, $: $, $$: $$, esc: esc,
    toast: function (t, tone) { window.Notify.toast(typeof t === "string" ? { title: t, tone: tone } : t); },
    dialog: function (o) { return window.Convo.dialog(o); },
    announce: function (t) { var a = $("#announce"); a.textContent = ""; setTimeout(function () { a.textContent = t; }, 30); },
    /* dates: "YYYY-MM-DD" -> "7 Oct 2026"; timestamps (UTC) -> local "7 Oct 2026, 14:05" */
    date: function (s) { if (!s) return ""; var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return s; return +m[3] + " " + MON[+m[2] - 1] + " " + m[1]; },
    ts: function (s) { return window.Convo.time.full(s); },
    ago: function (s) { return window.Notify.ago(s); },
    today: function () { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); },
    skel: function (rows) { var h = '<div class="sk" aria-busy="true" aria-label="Loading"><i class="h"></i>'; for (var i = 0; i < (rows || 6); i++) h += "<i></i>"; return h + "</div>"; },
    errBox: function (e, title) { return '<div class="errbox" role="alert"><b>' + esc(title || (e && e.status === 404 ? "Not found" : "This did not load")) + "</b><p>" + esc(e && e.status === 404 ? "It may belong to another branch, or it was removed." : api.message(e)) + '</p><button type="button" class="btn soft sm" data-act="retry">Try again</button></div>'; },
    empty: function (title, text, act) { return '<div class="empty"><b>' + esc(title) + "</b>" + esc(text || "") + (act ? '<div style="margin-top:14px">' + act + "</div>" : "") + "</div>"; },
    head: function (o) { return '<header class="pg-h"><div>' + (o.eb ? '<span class="eb">' + esc(o.eb) + "</span>" : "") + "<h1>" + (o.html || esc(o.title)) + "</h1>" + (o.lead ? "<p>" + esc(o.lead) + "</p>" : "") + "</div>" + (o.acts ? '<div class="pg-a">' + o.acts + "</div>" : "") + "</header>"; },
    busy: function (b, on) { api.busy(b, on); },
    onLeave: function (fn) { S.leave.push(fn); },
    setGuard: function (fn) { S.guard = fn; }, clearGuard: function () { S.guard = null; },
    go: function (h) { if (location.hash === h) render(); else location.hash = h; },
    /* change the address without re-rendering (the inbox opening a thread) */
    replace: function (h) { if (location.hash === h) return; history.replaceState(null, "", h); lastHash = location.hash; paintChrome(); },
    route: route, render: function () { render(); }, refreshCounts: refreshCounts, setCount: setCount,
    msgOf: function (e) { if (e && e.code === "validation" && e.details) return e.message || "Please check the highlighted fields."; return api.message(e); }
  };

  /* ---------------- router ---------------- */
  function route() { var p = (location.hash || "#/today").replace(/^#\/?/, "").split("/").map(decodeURIComponent); if (!p[0]) p[0] = "today"; return p; }
  function key() { var k = route()[0]; if (k === "conversations") return "inbox"; return ROUTES.some(function (r) { return r[0] === k; }) ? k : "today"; }
  function label(k) { var r = ROUTES.filter(function (x) { return x[0] === k; })[0]; return r ? r[1] : "Today"; }
  var view = null, lastHash = null, token = 0;
  function leave() { var l = S.leave; S.leave = []; l.forEach(function (f) { try { f(); } catch (e) { /* cleanup error */ } }); }
  function render() {
    if (!S.me) return;
    var r = route();
    /* old notification links: #conversations/12 */
    if (r[0] === "conversations") { location.replace("#/inbox" + (r[1] ? "/" + r[1] : "")); return; }
    var k = key(), my = ++token;
    if (S.cur && S.cur.key === k && S.cur.update && S.cur.update(r) !== false) { lastHash = location.hash; paintChrome(); return; }
    leave(); closeLayer(true);
    /* a dialog from the previous screen (pass on, media details) never stays open over the next one */
    $$("dialog.cv-dlg, dialog.mp-dlg").forEach(function (d) { try { d.close(); } catch (e) { /* closed */ } d.remove(); });
    /* every screen gets a fresh container, so listeners a view binds on it go away with it */
    var host = doc.createElement("div"); host.className = "vw"; host.innerHTML = CM.skel();
    view.innerHTML = ""; view.appendChild(host); S.cur = { key: k }; S.crumb = null;
    paintChrome();
    var fn = CM.V[k], out;
    try { out = fn ? fn(r, host, S.cur) : null; } catch (e) { out = Promise.reject(e); }
    lastHash = location.hash;
    if (out && out.then) out.then(function () { if (my === token) after(); }, function (e) { if (my !== token) return; host.innerHTML = '<div class="pg">' + CM.errBox(e) + "</div>"; if (window.console) console.warn("[content] view", k, e && e.message); });
    else after();
  }
  function after() { var h = $("h1", view); doc.title = (h ? h.textContent.trim() + " | " : "") + "Dolphin Content"; }
  function navTo() {
    if (S.guard && S.guard() && location.hash !== lastHash) {
      var want = location.hash; history.replaceState(null, "", lastHash || "#/today");
      CM.dialog({ title: "Leave without saving?", lead: "Your changes on this page are not saved yet.", ok: "Leave without saving", cancel: "Stay here", danger: true,
        submit: function () { S.guard = null; location.hash = want; } });
      return;
    }
    S.guard = null; render(); if (!S.cur || !S.cur.keepScroll) { window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
  }
  window.addEventListener("hashchange", function () { closeMenu(); navTo(); });
  window.addEventListener("beforeunload", function (e) { if (S.guard && S.guard()) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------------- chrome: sidebar, top bar, tab bar ---------------- */
  function badge(k) { return k === "inbox" ? S.counts.inbox : k === "stories" ? S.counts.stories : 0; }
  function paintNav() {
    var cur = key(), groups = [], by = {};
    ROUTES.forEach(function (r) { if (!by[r[2]]) { by[r[2]] = []; groups.push(r[2]); } by[r[2]].push(r); });
    $("#nav").innerHTML = groups.map(function (g, gi) {
      return '<div class="ns-grp" role="group" aria-labelledby="ng' + gi + '"><span class="gl" id="ng' + gi + '">' + esc(g) + "</span>" + by[g].map(function (r) {
        var b = badge(r[0]);
        return '<a href="#/' + r[0] + '"' + (cur === r[0] ? ' aria-current="page"' : "") + "><span>" + esc(r[1]) + "</span>" + (b ? '<span class="a-n" aria-label="' + b + (r[0] === "inbox" ? " unread" : " waiting") + '">' + b + "</span>" : "") + "</a>";
      }).join("") + "</div>";
    }).join("");
    var more = !TABS.some(function (t) { return t[0] === cur; });
    $("#tabbar").innerHTML = TABS.map(function (t) { var b = badge(t[0]); return '<a href="#/' + t[0] + '"' + (cur === t[0] ? ' aria-current="page"' : "") + "><span>" + t[1] + "</span>" + (b ? '<i aria-label="' + b + ' unread">' + b + "</i>" : "") + "</a>"; }).join("") +
      '<button type="button" id="moreBtn" data-act="menu" aria-controls="side" aria-expanded="' + $("#side").classList.contains("open") + '"' + (more ? ' aria-current="page"' : "") + "><span>More</span>" + (badge("stories") && more === false ? "" : "") + "</button>";
  }
  function crumbs() {
    var r = route(), k = key(), c = [{ t: "Content", href: "#/today" }];
    if (k === "today") c.push({ t: "Today" });
    else if (S.crumb && S.crumb.key === location.hash) c = c.concat(S.crumb.items);
    else c.push({ t: label(k) });
    return c;
  }
  CM.setCrumb = function (items) { S.crumb = { key: location.hash, items: items }; var el = $("#crumb"); if (el) el.innerHTML = NS.crumb(crumbs()); };
  function paintChrome() { paintNav(); var el = $("#crumb"); if (el) el.innerHTML = NS.crumb(crumbs()); }
  function liveText(s) { var el = $("#liveTxt"); if (!el) return; el.textContent = s === "live" ? "Online for chats" : s === "polling" ? "Offline, checking" : s === "off" ? "" : "Reconnecting"; el.className = "cm-live is-" + s; }
  function buildTop() {
    var m = S.me, role = "Content manager" + (S.branch ? ", " + S.branch.name : "");
    $("#top").innerHTML = '<button type="button" class="ns-menu-btn" id="menuBtn" data-act="menu" aria-expanded="false" aria-controls="side">Menu</button>' +
      '<a class="ns-brand" href="#/today" aria-label="Dolphin Education, content today"><img src="site/img/logo.png" alt="" class="logo-l" width="120" height="28"><img src="site/img/logo-light.png" alt="" class="logo-d" width="120" height="28"></a>' +
      '<div class="ns-lead" id="crumb"></div>' +
      '<div class="ns-tools"><span class="cm-live" id="liveTxt" aria-live="polite"></span><div id="alerts"></div>' + NS.themeBtn("ns-dt") +
      NS.user({ name: m.name, role: "Content manager", sub: m.email, note: m.is_demo ? "Demo account" : (S.branch ? S.branch.name : ""),
        items: [{ t: "Open the website", href: "/", hint: "New tab", attrs: ' target="_blank" rel="noopener"' }, { t: "Help", ns: "help" }, { theme: true, cls: "ns-ph" }, { sep: true }, { t: "Sign out", act: "signout", danger: true }] }) + "</div>";
    $("#aRole").textContent = role;
    $("#sheetTools").innerHTML = NS.themeRow();
    liveText(live.state());
    if (S.notify) S.notify.destroy();
    S.notify = window.Notify.mount($("#alerts"), { onOpen: openNotification, titleCount: true, onNew: function (n) { if (/^(conversation|story)/.test(n.type)) refreshCounts(); } });
  }
  function setCount(k, n) { if (S.counts[k] === n) return; S.counts[k] = n; paintNav(); }
  var ct = null;
  function refreshCounts() {
    clearTimeout(ct); ct = setTimeout(function () {
      api.get("/api/conversations", { limit: 1, status: "active" }).then(function (b) { setCount("inbox", b.unread_total || 0); }, function () { /* badge stays */ });
      api.get("/api/testimonials/moderation").then(function (b) { setCount("stories", (b.items || []).filter(function (t) { return t.consent_status === "pending"; }).length); }, function () { /* badge stays */ });
    }, 300);
  }
  function openNotification(n) {
    var e = n.entity, id = n.entity_id, t = n.type || "";
    if (e === "conversation" || /^conversation/.test(t)) { CM.go("#/inbox" + (id ? "/" + id : "")); return; }
    if (e === "forward" || /^forward/.test(t)) { CM.go("#/forwards"); return; }
    if (e === "testimonial" || t === "story.pending") { CM.go("#/stories"); return; }
    if (t === "event.registration") { CM.go("#/website/event" + (n.link && /\d+/.test(n.link) && e === "cms_item" ? "/" + id : "")); return; }
    if (e === "student") { CM.go("#/clients/" + id + (/^document/.test(t) ? "/documents" : "")); return; }
    if (e === "document" && n.link) { var m = String(n.link).match(/students?\/(\d+)/); if (m) { CM.go("#/clients/" + m[1] + "/documents"); return; } }
    if (n.link && n.link.charAt(0) === "#") { CM.go(n.link.indexOf("#/") === 0 ? n.link : "#/" + n.link.slice(1)); return; }
    return false;
  }
  CM.openNotification = openNotification;

  /* ---------------- menu drawer / More sheet ---------------- */
  function openMenu() { var s = $("#side"); s.classList.add("open"); $$("#menuBtn,#moreBtn").forEach(function (b) { b.setAttribute("aria-expanded", "true"); }); var a = $("#nav a[aria-current=page]") || $("#nav a"); if (a) a.focus(); }
  function closeMenu(refocus) { var s = $("#side"); if (!s || !s.classList.contains("open")) return; s.classList.remove("open"); $$("#menuBtn,#moreBtn").forEach(function (b) { b.setAttribute("aria-expanded", "false"); }); if (refocus) { var b = [$("#moreBtn"), $("#menuBtn")].filter(function (x) { return x && x.offsetParent !== null; })[0]; if (b) b.focus(); } }

  /* ---------------- drawer (right side panel) ---------------- */
  var layer, lastFocus = null, drawerClose = null;
  function closeLayer(silent) { if (!layer || !layer.innerHTML) return; var f = drawerClose; drawerClose = null; layer.innerHTML = ""; doc.body.style.overflow = ""; if (f) f(); if (!silent && lastFocus && doc.contains(lastFocus)) lastFocus.focus(); }
  CM.drawer = function (o) {
    lastFocus = doc.activeElement; drawerClose = o.onClose || null;
    layer.innerHTML = '<div class="scrim" data-act="drawer-x"></div><aside class="drw" role="dialog" aria-modal="true" aria-labelledby="drwT"><div class="drw-h"><div>' + (o.eb ? '<span class="eb">' + esc(o.eb) + "</span>" : "") + '<h2 id="drwT">' + esc(o.title) + '</h2></div><button type="button" class="btn soft sm" data-act="drawer-x">Close</button></div><div class="drw-b">' + (o.body || "") + "</div>" + (o.foot ? '<div class="drw-f">' + o.foot + "</div>" : "") + "</aside>";
    doc.body.style.overflow = "hidden";
    var el = $(".drw", layer), f = $("input:not([type=hidden]),select,textarea", el); (f || $("[data-act=drawer-x]", el)).focus();
    return { el: el, body: $(".drw-b", el), close: function () { closeLayer(); } };
  };
  CM.closeDrawer = function () { closeLayer(); };

  /* ---------------- global events ---------------- */
  CM.A = {};
  doc.addEventListener("click", function (e) {
    var a = e.target.closest("[data-act]"); if (!a) { if (e.target.closest("#nav a")) closeMenu(); return; }
    var k = a.dataset.act;
    if (k === "menu") { $("#side").classList.contains("open") ? closeMenu(true) : openMenu(); return; }
    if (k === "menu-close") { closeMenu(true); return; }
    if (k === "drawer-x") { closeLayer(); return; }
    if (k === "signout") { signout(); return; }
    if (k === "retry") { render(); return; }
    if (CM.A[k] && !a.disabled) CM.A[k](a, e);
  });
  doc.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (doc.querySelector("dialog[open]")) return;
      if (layer && layer.innerHTML) { e.preventDefault(); closeLayer(); return; }
      if ($("#side") && $("#side").classList.contains("open")) { e.preventDefault(); closeMenu(true); return; }
    }
    if (e.key === "Tab" && layer && layer.innerHTML && !doc.querySelector("dialog[open]")) {
      var box = $(".drw", layer); if (!box) return;
      var f = $$("a[href],button,input,select,textarea,[tabindex='0']", box).filter(function (x) { return !x.disabled && x.offsetParent !== null; }); if (!f.length) return;
      if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  NS.on("help", function () {
    CM.drawer({ eb: "Help", title: "How this portal works", body: '<dl class="dl"><div><dt>Inbox</dt><dd>Website chats and messages from students and parents arrive here live. Answer simple things; pass the rest to the branch manager with one click.</dd></div><div><dt>Website content</dt><dd>Save draft keeps your work private. Publish puts it on the website. Every save is kept in History, where you can restore it.</dd></div><div><dt>Languages</dt><dd>English is required. Nepali, Spanish, Korean and Chinese fall back to English when empty.</dd></div><div><dt>Media library</dt><dd>Photos are resized automatically, and gallery, banner, event and blog photos get the Dolphin watermark.</dd></div><div><dt>Clients</dt><dd>Keep profiles, education, tests, contacts and documents up to date. Fees and internal documents stay with the branch manager.</dd></div><div><dt>Keyboard</dt><dd>Escape closes a panel. Enter sends a message, Shift and Enter adds a line.</dd></div></dl>' });
  });

  /* ---------------- sign-in ---------------- */
  function showSignin(msg) {
    S.me = null; leave(); closeLayer(true); if (S.notify) { S.notify.destroy(); S.notify = null; } live.stop();
    $("#shell").hidden = true; $("#tabbar").hidden = true; $("#signin").hidden = false; doc.body.classList.add("signin");
    var gen = $(".err[data-for=form]", $("#siF")); gen.textContent = msg || ""; gen.hidden = !msg;
    doc.title = "Sign in | Dolphin Content";
    setTimeout(function () { var e = $("#siE"); if (e) e.focus(); }, 30);
  }
  function enter(b) {
    if (!b || !b.user) { showSignin(); return; }
    if (b.portal !== "content") { if (b.portal_page) { location.replace(b.portal_page); return; } showSignin("This account cannot open the content portal."); return; }
    S.me = b.user; S.branch = b.branch || null;
    $("#signin").hidden = true; $("#shell").hidden = false; $("#tabbar").hidden = false; doc.body.classList.remove("signin");
    live.start(); buildTop(); refreshCounts(); render();
  }
  function signout() { leave(); live.stop(); api.logout().then(function () { showSignin(); var n = $("#siNote"); if (n) n.textContent = "You are signed out."; }); }
  CM.boot = function () {
    view = $("#view"); layer = $("#layer");
    live.on("state", function (s) { liveText(s.state); });
    live.on("closed", function (c) { if (c.code === 4401 && S.me) showSignin("Your session has ended. Please sign in again."); });
    live.on("conv", function () { refreshCounts(); });
    api.on("unauth", function () { if (S.me) showSignin("Your session has ended. Please sign in again."); });
    $("#siF").addEventListener("submit", function (e) {
      e.preventDefault(); var f = e.target, d = api.formData(f), btn = $("#siB"), det = {};
      if (!d.email || !/^\S+@\S+\.\S+$/.test(d.email)) det.email = "Enter your work email, like name@dolphin.test."; if (!d.password) det.password = "Enter your password.";
      if (Object.keys(det).length) { api.showErrors(f, { details: det }); return; }
      api.busy(btn, true);
      api.login(d.email, d.password).then(function () { return api.get("/api/auth/me"); }).then(function (b) { api.busy(btn, false); f.reset(); enter(b); }, function (err) {
        api.busy(btn, false);
        if (err.status === 401) { api.showErrors(f, { details: { password: "That email and password do not match." } }); return; }
        if (err.code === "portal_paused") { api.showErrors(f, { message: err.message || "This portal is paused for now." }); return; }
        if (err.status === 429) { api.showErrors(f, { message: err.message || "Too many attempts. Wait 15 minutes and try again." }); return; }
        api.showErrors(f, err);
      });
    });
    api.get("/api/auth/me").then(enter, function (e) { showSignin(e && e.code === "portal_paused" ? e.message : e && e.offline ? "The server cannot be reached. Check the connection and try again." : ""); });
  };
})();
