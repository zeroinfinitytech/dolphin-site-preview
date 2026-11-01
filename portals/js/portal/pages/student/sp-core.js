/* Dolphin student and parent portal (portal.html): core. Sign-in gate (/auth/me portal student|parent), shell (sidebar, top bar, phone tab
   bar + More sheet, same shell as the content portal: css/portal/core/content.css), hash router, drawer, helpers, Alerts (js/portal/core/notify.js), the live socket
   (PortalAPI.live) and the parent's student switcher. Views live in sp-views.js and register on SP.V. API contract: HANDOFF_PHASE_A.md. */
(function () {
  "use strict";
  var api = window.PortalAPI, live = api.live, NS = window.NS, doc = document;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var S = { me: null, role: "student", branch: null, sid: null, kids: [], counts: { messages: 0, family: 0, documents: 0 }, leave: [], cur: null, notify: null };
  var ROUTES = [
    ["home", "Home", "Your file"], ["messages", "Messages", "Your file"], ["family", "Family chat", "Your file"], ["documents", "Documents", "Your file"],
    ["applications", "Applications and visa", "Your file"], ["requests", "Requests", "Your file"], ["payments", "Payments", "Your file"],
    ["profile", "Profile", "You"], ["alerts", "Notifications", "You"]
  ];
  var TABS = [["home", "Home"], ["messages", "Messages"], ["documents", "Documents"], ["applications", "Visa"]];

  var SP = window.SP = {
    api: api, live: live, S: S, V: {}, $: $, $$: $$, esc: esc,
    parent: function () { return S.role === "parent"; },
    toast: function (t, tone) { window.Notify.toast(typeof t === "string" ? { title: t, tone: tone } : t); },
    dialog: function (o) { return window.Convo.dialog(o); },
    announce: function (t) { var a = $("#announce"); a.textContent = ""; setTimeout(function () { a.textContent = t; }, 30); },
    date: function (s) { if (!s) return ""; var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return s; return +m[3] + " " + MON[+m[2] - 1] + " " + m[1]; },
    ts: function (s) { return window.Convo.time.full(s); },
    ago: function (s) { return window.Notify.ago ? window.Notify.ago(s) : SP.date(s); },
    today: function () { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); },
    money: function (minor, cur) { var v = (Number(minor) || 0) / 100; return (cur || "NPR") + " " + v.toLocaleString("en-IN", { maximumFractionDigits: 2 }); },
    skel: function (rows) { var h = '<div class="sk" aria-busy="true" aria-label="Loading"><i class="h"></i>'; for (var i = 0; i < (rows || 6); i++) h += "<i></i>"; return h + "</div>"; },
    errBox: function (e, title) { return '<div class="errbox" role="alert"><b>' + esc(title || (e && e.status === 404 ? "Not found" : "This did not load")) + "</b><p>" + esc(e && e.status === 404 ? "It may have been moved or removed." : api.message(e)) + '</p><button type="button" class="btn soft sm" data-act="retry">Try again</button></div>'; },
    empty: function (title, text, act) { return '<div class="empty"><b>' + esc(title) + "</b>" + esc(text || "") + (act ? '<div style="margin-top:14px">' + act + "</div>" : "") + "</div>"; },
    head: function (o) { return '<header class="pg-h"><div>' + (o.eb ? '<span class="eb">' + esc(o.eb) + "</span>" : "") + "<h1>" + (o.html || esc(o.title)) + "</h1>" + (o.lead ? "<p>" + esc(o.lead) + "</p>" : "") + "</div>" + (o.acts ? '<div class="pg-a">' + o.acts + "</div>" : "") + "</header>"; },
    busy: function (b, on) { api.busy(b, on); },
    onLeave: function (fn) { S.leave.push(fn); },
    go: function (h) { if (location.hash === h) render(); else location.hash = h; },
    replace: function (h) { if (location.hash === h) return; history.replaceState(null, "", h); lastHash = location.hash; paintChrome(); },
    route: route, render: function () { render(); }, refreshCounts: refreshCounts,
    msgOf: function (e) { if (e && e.code === "validation" && e.details) return e.message || "Please check the highlighted fields."; return api.message(e); },
    /* the student this portal is about (a parent may follow more than one) */
    kid: function () { return S.kids.filter(function (k) { return k.id === S.sid; })[0] || null; },
    first: function (n) { return String(n || "").split(/\s+/)[0]; },
    /* file cache for the current student: views share one GET /students/:id per render cycle */
    file: function (fresh) { if (fresh || !S.fileP || S.fileSid !== S.sid) { S.fileSid = S.sid; S.fileP = api.get("/api/students/" + S.sid); S.fileP.catch(function () { S.fileP = null; }); } return S.fileP; },
    checklist: function () { return api.get("/api/students/" + S.sid + "/checklist"); }
  };

  /* ---------------- router ---------------- */
  function route() { var p = (location.hash || "#/home").replace(/^#\/?/, "").split("/").map(decodeURIComponent); if (!p[0]) p[0] = "home"; return p; }
  function key() { var k = route()[0]; if (k === "conversations" || k === "inbox") return "messages"; return ROUTES.some(function (r) { return r[0] === k; }) ? k : "home"; }
  function label(k) { var r = ROUTES.filter(function (x) { return x[0] === k; })[0]; return r ? r[1] : "Home"; }
  var view = null, lastHash = null, token = 0;
  function leave() { var l = S.leave; S.leave = []; l.forEach(function (f) { try { f(); } catch (e) { /* cleanup error */ } }); }
  function render() {
    if (!S.me) return;
    var r = route();
    if (r[0] === "conversations" || r[0] === "inbox") { location.replace("#/messages" + (r[1] ? "/" + r[1] : "")); return; }
    var k = key(), my = ++token;
    if (S.cur && S.cur.key === k && S.cur.update && S.cur.update(r) !== false) { lastHash = location.hash; paintChrome(); return; }
    leave(); closeLayer(true);
    var host = doc.createElement("div"); host.className = "vw"; host.innerHTML = SP.skel();
    view.innerHTML = ""; view.appendChild(host);
    doc.body.classList.toggle("is-inbox", k === "messages" || k === "family");
    S.cur = { key: k };
    paintChrome();
    var fn = SP.V[k], out;
    try { out = fn ? fn(r, host, S.cur) : null; } catch (e) { out = Promise.reject(e); }
    lastHash = location.hash;
    if (out && out.then) out.then(function () { if (my === token) after(); }, function (e) { if (my !== token) return; host.innerHTML = '<div class="pg">' + SP.errBox(e) + "</div>"; if (window.console) console.warn("[portal] view", k, e && e.message); });
    else after();
  }
  function after() { var h = $("h1", view); doc.title = (h ? h.textContent.trim() + " | " : "") + "Dolphin Portal"; }
  function navTo() { S.fileP = null; render(); if (!S.cur || !S.cur.keepScroll) { window.scrollTo(0, 0); view.focus({ preventScroll: true }); } }
  window.addEventListener("hashchange", function () { closeMenu(); navTo(); });

  /* ---------------- chrome: sidebar, top bar, tab bar ---------------- */
  function badge(k) { return k === "messages" ? S.counts.messages : k === "family" ? S.counts.family : k === "documents" ? S.counts.documents : 0; }
  function paintNav() {
    var cur = key(), groups = [], by = {};
    ROUTES.forEach(function (r) { if (!by[r[2]]) { by[r[2]] = []; groups.push(r[2]); } by[r[2]].push(r); });
    $("#nav").innerHTML = groups.map(function (g, gi) {
      var gt = g === "Your file" && SP.parent() && SP.kid() ? SP.first(SP.kid().name) + "'s file" : g;
      return '<div class="ns-grp" role="group" aria-labelledby="ng' + gi + '"><span class="gl" id="ng' + gi + '">' + esc(gt) + "</span>" + by[g].map(function (r) {
        var b = badge(r[0]);
        return '<a href="#/' + r[0] + '"' + (cur === r[0] ? ' aria-current="page"' : "") + "><span>" + esc(r[1]) + "</span>" + (b ? '<span class="a-n" aria-label="' + b + (r[0] === "messages" || r[0] === "family" ? " unread" : " to do") + '">' + b + "</span>" : "") + "</a>";
      }).join("") + "</div>";
    }).join("");
    var more = !TABS.some(function (t) { return t[0] === cur; });
    $("#tabbar").innerHTML = TABS.map(function (t) { var b = badge(t[0]); return '<a href="#/' + t[0] + '"' + (cur === t[0] ? ' aria-current="page"' : "") + "><span>" + t[1] + "</span>" + (b ? '<i aria-label="' + b + '">' + b + "</i>" : "") + "</a>"; }).join("") +
      '<button type="button" id="moreBtn" data-act="menu" aria-controls="side" aria-expanded="' + $("#side").classList.contains("open") + '"' + (more ? ' aria-current="page"' : "") + "><span>More</span></button>";
  }
  function crumbs() { var k = key(), c = [{ t: SP.parent() ? "Parent portal" : "Student portal", href: "#/home" }]; if (k !== "home") c.push({ t: label(k) }); else c.push({ t: "Home" }); return c; }
  function paintChrome() { paintNav(); var el = $("#crumb"); if (el) el.innerHTML = NS.crumb(crumbs()); }
  function paintWho() {
    var el = $("#who"); if (!el) return;
    if (!SP.parent()) { el.innerHTML = ""; return; }
    var k = SP.kid();
    if (S.kids.length > 1) {
      el.innerHTML = '<label class="lb" for="kidSel">Following</label><select class="in" id="kidSel">' + S.kids.map(function (x) { return '<option value="' + x.id + '"' + (x.id === S.sid ? " selected" : "") + ">" + esc(x.name) + (x.ref_no ? " · " + esc(x.ref_no) : "") + "</option>"; }).join("") + "</select>";
      $("#kidSel").addEventListener("change", function (e) { S.sid = +e.target.value; try { sessionStorage.setItem("sp-kid", S.sid); } catch (er) { /* private mode */ } S.fileP = null; paintChrome(); render(); SP.toast("Now showing " + (SP.kid() ? SP.kid().name : "the file")); });
    } else el.innerHTML = k ? '<span class="lb">Following</span><b>' + esc(k.name) + "</b>" + (k.ref_no ? "<small>" + esc(k.ref_no) + "</small>" : "") : "";
  }
  function liveText(s) { var el = $("#liveTxt"); if (!el) return; el.textContent = s === "polling" ? "Offline, checking" : s === "reconnecting" || s === "connecting" ? "" : ""; el.className = "cm-live is-" + s; }
  function buildTop() {
    var m = S.me, roleName = SP.parent() ? "Parent" : "Student";
    $("#top").innerHTML = '<button type="button" class="ns-menu-btn" id="menuBtn" data-act="menu" aria-expanded="false" aria-controls="side">Menu</button>' +
      '<a class="ns-brand" href="#/home" aria-label="Dolphin Education, home"><img src="site/img/logo.png" alt="" class="logo-l" width="120" height="28"><img src="site/img/logo-light.png" alt="" class="logo-d" width="120" height="28"></a>' +
      '<div class="ns-lead" id="crumb"></div>' +
      '<div class="ns-tools"><span class="cm-live" id="liveTxt" aria-live="polite"></span><div id="alerts"></div>' + NS.themeBtn("ns-dt") +
      NS.user({ name: m.name, role: roleName, sub: m.email, note: m.is_demo ? "Demo account" : (S.branch ? S.branch.name : ""),
        items: [{ t: "Profile and password", href: "#/profile" }, { t: "Open the website", href: "/", hint: "New tab", attrs: ' target="_blank" rel="noopener"' }, { theme: true, cls: "ns-ph" }, { sep: true }, { t: "Sign out", act: "signout", danger: true }] }) + "</div>";
    $("#aRole").textContent = roleName + (S.branch ? " · " + S.branch.name : "");
    $("#sheetTools").innerHTML = NS.themeRow();
    paintWho();
    liveText(live.state ? live.state() : "off");
    if (S.notify) S.notify.destroy();
    S.notify = window.Notify.mount($("#alerts"), { onOpen: openNotification, titleCount: true, onNew: function () { refreshCounts(); S.fileP = null; } });
  }
  function setCount(k, n) { if (S.counts[k] === n) return; S.counts[k] = n; paintNav(); }
  var ct = null;
  function refreshCounts() {
    clearTimeout(ct); ct = setTimeout(function () {
      api.get("/api/conversations", { limit: 1 }).then(function (b) { setCount("messages", b.unread_total || 0); }, function () { /* badge stays */ });
      api.get("/api/family").then(function (b) { setCount("family", b.unread_total || 0); }, function () { /* badge stays */ });
      if (!SP.parent()) api.get("/api/document-requests", { status: "open" }).then(function (b) { setCount("documents", (b.items || []).length); }, function () { /* badge stays */ });
    }, 300);
  }
  SP.setCount = setCount;
  function openNotification(n) {
    var e = n.entity, id = n.entity_id, t = n.type || "", link = String(n.link || "");
    if (e === "conversation" || /^conversation/.test(t)) { SP.go("#/messages" + (id ? "/" + id : "")); return; }
    if (/^document/.test(t) || e === "document" || e === "document_request" || /#documents/.test(link)) { SP.go("#/documents"); return; }
    if (/application|offer|letter/.test(t) || e === "application") { SP.go("#/applications"); return; }
    if (/visa/.test(t)) { SP.go("#/applications"); return; }
    if (/fee|claim|payment|receipt/.test(t) || e === "fee" || e === "claim") { SP.go("#/payments"); return; }
    if (/appointment/.test(t)) { SP.go("#/requests"); return; }
    var m = link.match(/#\/?([a-z-]+)/); if (m) { SP.go("#/" + m[1]); return; }
    return false;
  }
  SP.openNotification = openNotification;

  /* ---------------- menu drawer / More sheet ---------------- */
  function openMenu() { var s = $("#side"); s.classList.add("open"); $$("#menuBtn,#moreBtn").forEach(function (b) { b.setAttribute("aria-expanded", "true"); }); var a = $("#nav a[aria-current=page]") || $("#nav a"); if (a) a.focus(); }
  function closeMenu(refocus) { var s = $("#side"); if (!s || !s.classList.contains("open")) return; s.classList.remove("open"); $$("#menuBtn,#moreBtn").forEach(function (b) { b.setAttribute("aria-expanded", "false"); }); if (refocus) { var b = [$("#moreBtn"), $("#menuBtn")].filter(function (x) { return x && x.offsetParent !== null; })[0]; if (b) b.focus(); } }

  /* ---------------- drawer (right side panel) ---------------- */
  var layer, lastFocus = null, drawerClose = null;
  function closeLayer(silent) { if (!layer || !layer.innerHTML) return; var f = drawerClose; drawerClose = null; layer.innerHTML = ""; doc.body.style.overflow = ""; if (f) f(); if (!silent && lastFocus && doc.contains(lastFocus)) lastFocus.focus(); }
  SP.drawer = function (o) {
    lastFocus = doc.activeElement; drawerClose = o.onClose || null;
    layer.innerHTML = '<div class="scrim" data-act="drawer-x"></div><aside class="drw" role="dialog" aria-modal="true" aria-labelledby="drwT"><div class="drw-h"><div>' + (o.eb ? '<span class="eb">' + esc(o.eb) + "</span>" : "") + '<h2 id="drwT">' + esc(o.title) + '</h2></div><button type="button" class="btn quiet sm" data-act="drawer-x">Close</button></div><div class="drw-b">' + (o.body || "") + "</div>" + (o.foot ? '<div class="drw-f">' + o.foot + "</div>" : "") + "</aside>";
    doc.body.style.overflow = "hidden";
    var el = $(".drw", layer), f = $("input:not([type=hidden]),select,textarea", el); (f || $("[data-act=drawer-x]", el)).focus();
    return { el: el, body: $(".drw-b", el), close: function () { closeLayer(); } };
  };
  SP.closeDrawer = function () { closeLayer(); };

  /* ---------------- global events ---------------- */
  SP.A = {};
  doc.addEventListener("click", function (e) {
    var a = e.target.closest("[data-act]"); if (!a) { if (e.target.closest("#nav a")) closeMenu(); return; }
    var k = a.dataset.act;
    if (k === "menu") { $("#side").classList.contains("open") ? closeMenu(true) : openMenu(); return; }
    if (k === "menu-close") { closeMenu(true); return; }
    if (k === "drawer-x") { closeLayer(); return; }
    if (k === "signout") { signout(); return; }
    if (k === "retry") { S.fileP = null; render(); return; }
    if (SP.A[k] && !a.disabled) SP.A[k](a, e);
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

  /* ---------------- sign-in ---------------- */
  function showSignin(msg) {
    S.me = null; S.kids = []; S.sid = null; S.fileP = null; leave(); closeLayer(true); if (S.notify) { S.notify.destroy(); S.notify = null; } live.stop();
    $("#shell").hidden = true; $("#tabbar").hidden = true; $("#signin").hidden = false; doc.body.classList.add("signin");
    var gen = $(".err[data-for=form]", $("#siF")); gen.textContent = msg || ""; gen.hidden = !msg;
    doc.title = "Sign in | Dolphin Portal";
    setTimeout(function () { var e = $("#siE"); if (e) e.focus(); }, 30);
  }
  function enter(b) {
    if (!b || !b.user) { showSignin(); return; }
    if (b.portal !== "student" && b.portal !== "parent") { if (b.portal_page) { location.replace(b.portal_page); return; } showSignin("This account cannot open the student and parent portal."); return; }
    S.me = b.user; S.role = b.portal; S.branch = b.branch || null;
    doc.body.classList.toggle("is-parent", S.role === "parent");
    api.get("/api/students").then(function (l) {
      S.kids = (l.items || []).map(function (s) { return { id: s.id, name: s.name, ref_no: s.ref_no, destination: s.destination, stage: s.stage }; });
      var saved = null; try { saved = +sessionStorage.getItem("sp-kid"); } catch (e) { /* private mode */ }
      S.sid = S.kids.some(function (k) { return k.id === saved; }) ? saved : (S.me.student_id && S.kids.some(function (k) { return k.id === S.me.student_id; }) ? S.me.student_id : (S.kids[0] ? S.kids[0].id : null));
      if (!S.sid) { showSignin("No student file is linked to this login yet. Please contact your branch."); return; }
      $("#signin").hidden = true; $("#shell").hidden = false; $("#tabbar").hidden = false; doc.body.classList.remove("signin");
      live.start(); buildTop(); refreshCounts(); render();
    }, function (e) { showSignin(api.message(e)); });
  }
  function signout() { leave(); live.stop(); try { sessionStorage.removeItem("sp-kid"); } catch (e) { /* private mode */ } api.logout().then(function () { showSignin(); var n = $("#siNote"); if (n) n.textContent = "You are signed out."; }); }
  SP.boot = function () {
    view = $("#view"); layer = $("#layer");
    live.on("state", function (s) { liveText(s.state); });
    live.on("closed", function (c) { if (c.code === 4401 && S.me) showSignin("Your session has ended. Please sign in again."); });
    live.on("conv", function () { refreshCounts(); });
    live.on("family", function () { refreshCounts(); });
    api.on("unauth", function () { if (S.me) showSignin("Your session has ended. Please sign in again."); });
    $("#siF").addEventListener("submit", function (e) {
      e.preventDefault(); var f = e.target, d = api.formData(f), btn = $("#siB"), det = {};
      if (!d.email || !/^\S+@\S+\.\S+$/.test(d.email)) det.email = "Enter the email your branch gave you."; if (!d.password) det.password = "Enter your password.";
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
