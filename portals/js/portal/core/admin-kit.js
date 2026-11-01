/* Dolphin consoles kit (window.K): shared by admin.html (Head office) and super.html (System console).
   Formatting, theme, hash router with async views, shell (sidebar, top bar, user menu, phone drawer), tables that stack on phones,
   filters, pager, dialogs, drawer, confirm, toast, skeleton/empty/error states, single-series SVG charts with hover, bar lists, audit diff.
   Needs js/portal/core/portal-api.js (window.PortalAPI). No dependencies, no icons except the theme sun/moon. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement, A = window.PortalAPI;
  var K = { api: A, views: {}, acts: {}, state: {} };
  var TZ = "Asia/Kathmandu";

  /* ---------------- text + format ---------------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  K.esc = esc;
  K.$ = function (s, el) { return (el || doc).querySelector(s); };
  K.$$ = function (s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); };
  function toDate(s) {
    if (!s) return null; if (s instanceof Date) return s;
    var t = String(s);
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(t)) return new Date(t.replace(" ", "T") + "Z");
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return new Date(t + "T12:00:00+05:45");
    var d = new Date(t); return isNaN(d) ? null : d;
  }
  K.toDate = toDate;
  var fD = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
  var fDT = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  var fDTY = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  var fT = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  var fDay = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
  K.today = function () { return fDay.format(new Date()); };
  K.dayOf = function (s) { var d = toDate(s); return d ? fDay.format(d) : ""; };
  K.date = function (s) { var d = toDate(s); return d ? fD.format(d) : ""; };
  K.dt = function (s) { var d = toDate(s); if (!d) return ""; return (fDay.format(d).slice(0, 4) === K.today().slice(0, 4) ? fDT : fDTY).format(d).replace(",", ","); };
  K.time = function (s) { var d = toDate(s); return d ? fT.format(d) : ""; };
  K.ago = function (s) {
    var d = toDate(s); if (!d) return ""; var x = (Date.now() - d.getTime()) / 1000;
    if (x < 0) return K.dt(s); if (x < 50) return "just now"; if (x < 3600) return Math.round(x / 60) + " min ago";
    if (x < 86400) return Math.round(x / 3600) + " h ago"; if (x < 86400 * 7) return Math.round(x / 86400) + " d ago"; return K.date(s);
  };
  K.num = function (n) { return n == null || n === "" ? "" : Number(n).toLocaleString("en-IN"); };
  K.money = function (n, cur) { if (n == null) return ""; return (cur || "NPR") + " " + Number(n).toLocaleString("en-IN"); };
  K.bytes = function (b) { if (b == null) return "Unknown"; var u = ["bytes", "KB", "MB", "GB", "TB"], i = 0, n = Number(b); while (n >= 1024 && i < 4) { n /= 1024; i++; } return (i ? n.toFixed(n < 10 ? 1 : 0) : n) + " " + u[i]; };
  K.dur = function (s) { s = Math.max(0, Math.round(s || 0)); var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); if (d) return d + " d " + h + " h"; if (h) return h + " h " + m + " min"; if (m) return m + " min"; return s + " s"; };
  K.lab = function (s) { s = String(s == null ? "" : s).replace(/[_.]+/g, " ").trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; };
  var ROLE = { super_admin: "System admin", head_office: "Head office", branch_head: "Branch head", branch_manager: "Branch manager", content_manager: "Content manager", student: "Student", parent: "Parent", staff: "Staff desk (paused)", university: "University (paused)", visitor: "Website visitor", support: "Dolphin support" };
  K.role = function (r) { return ROLE[r] || K.lab(r); };
  K.ROLES = ROLE;
  K.initials = function (n) { return String(n || "").replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase() || "D"; };
  K.st = function (t, tone) { return '<span class="k-st' + (tone ? " " + tone : "") + '">' + esc(t) + "</span>"; };
  K.msg = function (e) {
    if (!e) return "Something went wrong.";
    if (!e.offline && e.status && e.status < 500 && e.body && e.body.error) return e.body.error;
    return A.message(e);
  };
  K.uid = function () { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };

  /* ---------------- theme ---------------- */
  var TKEY = "dolphin-proto-theme";
  K.theme = function (t) { root.setAttribute("data-theme", t); try { localStorage.setItem(TKEY, t); } catch (e) { /* storage off */ } syncTheme(); };
  function isDark() { return root.getAttribute("data-theme") === "dark"; }
  var SVG = 'viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
  K.themeBtn = function () {
    return '<button type="button" class="k-ib k-thm" data-act="k-theme" aria-label="' + (isDark() ? "Switch to light theme" : "Switch to dark theme") + '">' +
      '<svg class="moon" ' + SVG + '><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>' +
      '<svg class="sun" ' + SVG + '><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg></button>';
  };
  function syncTheme() {
    K.$$(".k-thm").forEach(function (b) { b.setAttribute("aria-label", isDark() ? "Switch to light theme" : "Switch to dark theme"); });
    K.$$("[data-theme-label]").forEach(function (b) { b.textContent = isDark() ? "Light theme" : "Dark theme"; });
  }
  K.acts["k-theme"] = function () { K.theme(isDark() ? "light" : "dark"); };

  /* ---------------- events: data-act clicks, data-chg changes, data-form submits ---------------- */
  doc.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-act]") : null;
    if (t && !t.disabled) {
      var f = K.acts[t.getAttribute("data-act")];
      if (f) { if (t.tagName === "A" || t.type === "submit") e.preventDefault(); f(t, e); return; }
    }
    var row = e.target.closest ? e.target.closest("tr[data-row]") : null;
    if (row && !e.target.closest("a,button,input,select,label,textarea")) { var b = row.querySelector("[data-act]"); if (b) b.click(); }
    if (umOpen && !e.target.closest(".k-um")) closeUM();
  });
  doc.addEventListener("change", function (e) {
    var t = e.target; if (!t.closest) return;
    var c = t.closest("[data-chg]"); if (c && K.acts[c.getAttribute("data-chg")]) K.acts[c.getAttribute("data-chg")](t, e);
  });
  doc.addEventListener("submit", function (e) {
    var f = e.target, k = f.getAttribute("data-form");
    if (k && K.acts[k]) { e.preventDefault(); K.acts[k](f, e); }
  });
  doc.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (umOpen) { closeUM(true); e.preventDefault(); } var app = K.$(".k-app.nav-open"); if (app) { app.classList.remove("nav-open"); var m = K.$(".k-menu"); if (m) m.focus(); } }
    if (umOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      var it = K.$$(".k-pop .k-mi"), i = it.indexOf(doc.activeElement); e.preventDefault();
      (it[(i + (e.key === "ArrowDown" ? 1 : -1) + it.length) % it.length] || it[0]).focus();
    }
    if (e.key === "Enter" && e.target.matches && e.target.matches("tr[data-row]")) { var b = e.target.querySelector("[data-act]"); if (b) b.click(); }
  });

  /* ---------------- router ---------------- */
  K.view = function (id, def) { def.id = id; K.views[id] = def; };
  K.parse = function () {
    var h = location.hash.replace(/^#\/?/, ""), q = h.indexOf("?"), id = q < 0 ? h : h.slice(0, q), params = {};
    if (q >= 0) h.slice(q + 1).split("&").forEach(function (p) { if (!p) return; var i = p.indexOf("="); params[decodeURIComponent(i < 0 ? p : p.slice(0, i))] = i < 0 ? "" : decodeURIComponent(p.slice(i + 1).replace(/\+/g, " ")); });
    return { id: id, params: params };
  };
  K.href = function (id, params) { var q = A.qs(params || {}); return "#/" + id + q; };
  K.go = function (id, params) { var h = K.href(id, params); if (location.hash === h) K.render(); else location.hash = h; };
  var token = 0;
  K.cur = null;
  K.render = function () {
    var r = K.parse(), def = K.views[r.id] || K.views[K.home];
    if (!def) return;
    if (def.id !== r.id) { history.replaceState(null, "", K.href(def.id)); r = { id: def.id, params: {} }; }
    var my = ++token, main = K.$("#k-main");
    var lv = K._leave || []; K._leave = []; lv.forEach(function (f) { try { f(); } catch (e) { /* teardown must not block the next view */ } });
    K.cur = r;
    K.$$(".k-nav a").forEach(function (a) { if (a.getAttribute("data-v") === (def.nav || def.id)) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    var app = K.$(".k-app"); if (app) app.classList.remove("nav-open");
    doc.title = def.title + " · " + K.appName;
    var ctx = {
      params: r.params, id: def.id,
      alive: function () { return my === token; },
      set: function (p, replace) { var n = {}; Object.keys(r.params).forEach(function (k) { n[k] = r.params[k]; }); Object.keys(p).forEach(function (k) { n[k] = p[k]; }); if (!("page" in p)) delete n.page; K.go(def.id, n); },
      head: function (o) { main.innerHTML = K.head(o || {}) + '<div id="k-body"></div>'; },
      body: function (html) { if (my !== token) return; var b = K.$("#k-body"); if (b) b.innerHTML = html; },
      el: function () { return K.$("#k-body"); },
      leave: function (f) { K._leave.push(f); }
    };
    K.ctx = ctx;
    ctx.head({ eyebrow: typeof def.eyebrow === "function" ? def.eyebrow() : def.eyebrow, title: def.title, lead: def.lead, acts: def.acts });
    ctx.body(K.skel(6));
    var focusMain = K.state.navigated; K.state.navigated = true;
    Promise.resolve().then(function () { return def.render(ctx); }).then(function (html) {
      if (typeof html === "string") ctx.body(html);
      if (def.after && my === token) def.after(ctx);
    }).catch(function (e) {
      if (my !== token) return;
      if (e && e.status === 401) return;
      ctx.body(K.fail(e));
    });
    if (focusMain && main) { main.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  };
  K.acts["k-retry"] = function () { K.render(); };
  window.addEventListener("hashchange", function () { if (K.started) K.render(); });

  /* ---------------- page pieces ---------------- */
  K.head = function (o) {
    return '<header class="k-ph"><div>' + (o.eyebrow ? '<p class="k-eyebrow">' + esc(o.eyebrow) + "</p>" : "") + "<h1>" + esc(o.title || "") + "</h1>" +
      (o.lead ? '<p class="k-lead">' + esc(o.lead) + "</p>" : "") + "</div>" + (o.acts ? '<div class="k-acts">' + o.acts + "</div>" : "") + "</header>";
  };
  K.skel = function (n, big) { var s = ""; for (var i = 0; i < (n || 5); i++) s += "<i></i>"; return '<div class="k-skel' + (big ? " big" : "") + '" aria-busy="true" aria-label="Loading">' + s + "</div>"; };
  K.empty = function (title, text, btn) { return '<div class="k-empty"><b>' + esc(title) + "</b>" + (text ? "<p>" + esc(text) + "</p>" : "") + (btn || "") + "</div>"; };
  K.fail = function (e) {
    var t = e && e.offline ? "The server cannot be reached" : e && e.status === 403 ? "This is not open to your account" : "That did not load";
    return '<div class="k-empty" role="alert"><b>' + esc(t) + "</b><p>" + esc(K.msg(e)) + '</p><button type="button" class="k-b soft" data-act="k-retry">Try again</button></div>';
  };
  K.sec = function (title, sub, inner, right) {
    return '<section class="k-sec">' + (title ? '<div class="k-sh"><div><h2>' + esc(title) + "</h2>" + (sub ? '<p class="k-sub">' + esc(sub) + "</p>" : "") + "</div>" + (right || "") + "</div>" : "") + inner + "</section>";
  };
  K.kpis = function (items) {
    return '<dl class="k-kpis">' + items.filter(Boolean).map(function (k) { return "<div><dt>" + esc(k[0]) + "</dt><dd>" + (k[1] == null || k[1] === "" ? "None" : esc(k[1])) + (k[2] ? "<small>" + esc(k[2]) + "</small>" : "") + "</dd></div>"; }).join("") + "</dl>";
  };
  K.dl = function (rows) {
    return '<dl class="k-dl">' + rows.filter(Boolean).map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + (r[2] ? r[1] : esc(r[1] == null || r[1] === "" ? "Not given" : r[1])) + "</dd>"; }).join("") + "</dl>";
  };
  /* table: cols [{t, k|f(row) -> html, cls, pri}], rows, o {act, id, empty, select, selected:{}} */
  K.table = function (cols, rows, o) {
    o = o || {};
    if (!rows || !rows.length) return K.empty(o.emptyTitle || "Nothing to show", o.empty || "Nothing matches these filters.", o.emptyAct);   /* emptyAct (optional): HTML of the next action */
    var sel = o.select, chosen = o.selected || {};
    var h = '<div class="k-tw"><table class="k-t"' + (o.label ? ' aria-label="' + esc(o.label) + '"' : "") + "><thead><tr>" + (sel ? '<th class="k-cb"><span class="k-vh">Select</span></th>' : "") +
      cols.map(function (c) { return '<th scope="col"' + (c.cls ? ' class="' + c.cls + '"' : "") + ">" + esc(c.t) + "</th>"; }).join("") + "</tr></thead><tbody>";
    rows.forEach(function (r) {
      var id = r[o.id || "id"];
      var rc = (o.act ? "k-rc " : "") + (chosen[id] ? "is-sel" : "");
      h += "<tr" + (rc ? ' class="' + rc.trim() + '"' : "") + (o.act ? ' data-row="' + esc(id) + '"' : "") + ">" +
        (sel ? '<td class="k-cb"><label class="k-chk"><input type="checkbox" data-sel="' + esc(id) + '"' + (chosen[id] ? " checked" : "") + '><span class="k-vh">Select ' + esc(r.name || r.subject || id) + "</span></label></td>" : "") +
        cols.map(function (c, i) {
          var v = c.f ? c.f(r) : esc(r[c.k] == null ? "" : r[c.k]);
          if (i === 0 && o.act && !c.noLink) v = '<button type="button" class="k-link" data-act="' + o.act + '" data-id="' + esc(id) + '">' + v + "</button>";
          return '<td data-l="' + esc(c.t) + '"' + ((c.cls || i === 0) ? ' class="' + (i === 0 ? "k-pri " : "") + (c.cls || "") + '"' : "") + ">" + (v == null ? "" : v) + "</td>";
        }).join("") + "</tr>";
    });
    return h + "</tbody></table></div>";
  };
  /* pager for {page, pages, total}: Previous / Next only */
  K.pager = function (res, noun) {
    if (!res || res.page == null) return "";
    var p = res.page, n = res.pages || 1;
    /* QA 2026-11-01: house rule "no visible counts" (and "1 items" read wrong): the total is announced to screen readers only, singular for 1 */
    var nn = noun || "rows", tot = res.total || 0; if (tot === 1) nn = nn.replace(/s$/, "");
    return '<nav class="k-pager" aria-label="Pages"><span class="k-sp"><span class="k-vh">' + esc(K.num(tot) + " " + nn) + "</span></span>" +
      (p > 1 ? '<button type="button" class="k-b soft sm" data-act="k-page" data-p="' + (p - 1) + '">Previous</button>' : "") +
      (p < n ? '<button type="button" class="k-b soft sm" data-act="k-page" data-p="' + (p + 1) + '">Next</button>' : "") + "</nav>";
  };
  K.acts["k-page"] = function (b) { if (K.ctx) K.ctx.set({ page: b.getAttribute("data-p") }); };
  /* filters: fields [{name, label, type: select|text|date|search, options:[[v,t]], w}] -> form that updates the hash */
  K.filters = function (fields, params) {
    return '<form class="k-filters" data-form="k-filter" data-chg="k-filter" role="search">' + fields.map(function (f) {
      var id = "f-" + f.name, v = params[f.name] || "";
      var inp = f.type === "select" ? '<select class="k-in" id="' + id + '" name="' + f.name + '">' + f.options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>"
        : '<input class="k-in" id="' + id + '" name="' + f.name + '" type="' + (f.type === "date" ? "date" : "search") + '" value="' + esc(v) + '"' + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : "") + ">";
      return '<div class="k-fld' + (f.w ? " w" : "") + '"><label for="' + id + '">' + esc(f.label) + "</label>" + inp + "</div>";
    }).join("") + '<button type="submit" class="k-vh">Apply filters</button></form>';
  };
  function readFilters(f) { var o = {}; K.$$("[name]", f).forEach(function (el) { o[el.name] = (el.value || "").trim(); }); return o; }
  K.acts["k-filter"] = function (el) { var f = el.closest ? el.closest("form") : el; if (!f) return; if (el.type === "search" && el.tagName === "INPUT" && el !== f) return; if (K.ctx) K.ctx.set(readFilters(f)); };
  /* segmented pills that set one hash param */
  K.seg = function (name, opts, cur, label) {
    return '<div class="k-seg" role="group" aria-label="' + esc(label || name) + '">' + opts.map(function (o) {
      return '<button type="button" data-act="k-seg" data-k="' + esc(name) + '" data-v="' + esc(o[0]) + '" aria-pressed="' + (String(cur || "") === String(o[0])) + '">' + esc(o[1]) + "</button>";
    }).join("") + "</div>";
  };
  K.acts["k-seg"] = function (b) { var p = {}; p[b.getAttribute("data-k")] = b.getAttribute("data-v"); if (K.ctx) K.ctx.set(p); };
  K.opts = function (list, all) { return (all ? [["", all]] : []).concat(list); };

  /* ---------------- fields ---------------- */
  K.field = function (f) {
    var id = "d-" + f.name + "-" + (++fieldN), v = f.value == null ? "" : f.value, req = f.required ? " required" : "", inp;
    if (f.type === "select") inp = '<select class="k-in" id="' + id + '" name="' + f.name + '"' + req + ">" + f.options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? " selected" : "") + (o[2] ? " disabled" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>";
    else if (f.type === "textarea") inp = '<textarea class="k-in" id="' + id + '" name="' + f.name + '"' + req + (f.max ? ' maxlength="' + f.max + '"' : "") + ">" + esc(v) + "</textarea>";
    else if (f.type === "check") return '<label class="k-chk"><input type="checkbox" name="' + f.name + '"' + (v ? " checked" : "") + "><span>" + esc(f.label) + (f.hint ? '<br><span class="k-mute k-small">' + esc(f.hint) + "</span>" : "") + '</span></label><p class="k-err err" data-for="' + f.name + '" hidden></p>';
    else inp = '<input class="k-in' + (f.cls ? " " + f.cls : "") + '" id="' + id + '" name="' + f.name + '" type="' + (f.type || "text") + '" value="' + esc(v) + '"' + req + (f.ac ? ' autocomplete="' + f.ac + '"' : "") + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : "") + (f.attrs || "") + ">";
    return '<div class="k-fld"' + (f.wrap ? " " + f.wrap : "") + '><label for="' + id + '">' + esc(f.label) + "</label>" + inp + (f.hint ? '<p class="k-hint">' + esc(f.hint) + "</p>" : "") + '<p class="k-err err" data-for="' + f.name + '" hidden></p></div>';
  };
  var fieldN = 0;
  K.formData = function (f) { var o = A.formData(f); K.$$("input[type=checkbox][name]", f).forEach(function (c) { o[c.name] = c.checked; }); return o; };
  K.password = function () { var a = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "", r = new Uint32Array(14); (window.crypto || window.msCrypto).getRandomValues(r); for (var i = 0; i < 14; i++) s += a[r[i] % a.length]; return s.slice(0, 5) + "-" + s.slice(5, 10) + "-" + s.slice(10); };

  /* CSV download built in the browser from rows already loaded: cols [[header, fn(row)]] (formula-safe cells) */
  K.csv = function (name, cols, rows) {
    function cell(v) { var t = v == null ? "" : String(v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }
    var txt = "\ufeff" + [cols.map(function (c) { return cell(c[0]); }).join(",")].concat(rows.map(function (r) { return cols.map(function (c) { return cell(c[1](r)); }).join(","); })).join("\r\n");
    var a = doc.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/csv;charset=utf-8" })); a.download = name; doc.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };

  /* ---------------- dialog / confirm / drawer / toast ---------------- */
  function layer() { var l = K.$("#k-layer"); if (!l) { l = doc.createElement("div"); l.id = "k-layer"; doc.body.appendChild(l); } return l; }
  var lastFocus = null;
  /* o: {title, cap, body, submit, danger, wide, cancel, onSubmit(data, form) -> promise (resolve value closes; throw shows errors), onOpen(dlg)} */
  K.dialog = function (o) {
    return new Promise(function (resolve) {
      lastFocus = doc.activeElement;
      var d = doc.createElement("dialog"); d.className = "k-dlg" + (o.wide ? " wide" : ""); d.setAttribute("aria-labelledby", "k-dlg-t");
      d.innerHTML = '<form class="k-f" novalidate><div class="k-dh"><div>' + (o.cap ? '<p class="k-eyebrow">' + esc(o.cap) + "</p>" : "") + '<h2 id="k-dlg-t" tabindex="-1">' + esc(o.title) + '</h2></div><button type="button" class="k-b sm" data-x>Close</button></div>' +
        '<div class="k-db">' + (o.body || "") + '<p class="k-err err" data-for="form" role="alert" hidden></p></div>' +
        '<div class="k-df">' + (o.cancel === false ? "" : '<button type="button" class="k-b soft" data-x>' + esc(o.cancelText || "Cancel") + "</button>") +
        (o.submit ? '<button type="submit" class="k-b p">' + esc(o.submit) + "</button>" : "") + "</div></form>";
      layer().appendChild(d);
      var done = false;
      function close(v) { if (done) return; done = true; if (d.open) d.close(); d.remove(); if (lastFocus && doc.contains(lastFocus)) lastFocus.focus(); resolve(v); }
      d.addEventListener("cancel", function (e) { e.preventDefault(); close(null); });
      d.addEventListener("click", function (e) { if (e.target.closest("[data-x]")) close(null); else if (e.target === d) close(null); });
      var form = d.querySelector("form");
      form.addEventListener("submit", function (e) {
        e.preventDefault(); if (!o.onSubmit) return close(true);
        var btn = form.querySelector("[type=submit]"); A.busy(btn, true);
        var gen = form.querySelector(".err[data-for=form]"); gen.hidden = true;
        Promise.resolve().then(function () { return o.onSubmit(K.formData(form), form, d); }).then(function (v) { A.busy(btn, false); if (v !== false) close(v === undefined ? true : v); }, function (err) {
          A.busy(btn, false);
          if (err && err.keepOpen) return;
          A.showErrors(form, err); var g = form.querySelector(".err[data-for=form]"); if (!g.hidden || !err.details) { g.textContent = K.msg(err); g.hidden = false; }
        });
      });
      d.showModal();
      var first = form.querySelector(".k-db input:not([type=hidden]),.k-db select,.k-db textarea");
      (first || d.querySelector("h2")).focus();
      if (o.onOpen) o.onOpen(d, close);
    });
  };
  K.confirm = function (o) {
    return K.dialog({ title: o.title, cap: o.cap, body: "<p>" + esc(o.text) + "</p>" + (o.more || ""), submit: o.ok || "Confirm", onSubmit: o.onSubmit });
  };
  /* drawer: one side sheet; returns {el, set(html), close()} */
  var drw = null;
  K.drawer = function (o) {
    if (drw) drw.close(true);
    lastFocus = doc.activeElement;
    var d = doc.createElement("dialog"); d.className = "k-drw"; d.setAttribute("aria-labelledby", "k-drw-t");
    d.innerHTML = '<div class="k-drw-in"><div class="k-dh"><div>' + (o.cap ? '<p class="k-eyebrow">' + esc(o.cap) + "</p>" : "") + '<h2 id="k-drw-t" tabindex="-1">' + esc(o.title) + '</h2></div><button type="button" class="k-b sm" data-x>Close</button></div><div class="k-db">' + (o.body || K.skel(6)) + "</div></div>";
    layer().appendChild(d);
    var api = {
      el: d, body: function () { return d.querySelector(".k-db"); },
      set: function (html) { if (d.isConnected) d.querySelector(".k-db").innerHTML = html; },
      title: function (t) { d.querySelector("h2").textContent = t; },
      close: function (silent) { if (!d.isConnected) return; if (d.open) d.close(); d.remove(); if (drw === api) drw = null; if (!silent && lastFocus && doc.contains(lastFocus)) lastFocus.focus(); if (o.onClose) o.onClose(); }
    };
    d.addEventListener("cancel", function (e) { e.preventDefault(); api.close(); });
    d.addEventListener("click", function (e) { if (e.target.closest("[data-x]")) api.close(); else if (e.target === d) api.close(); });
    d.showModal(); d.querySelector("h2").focus();
    drw = api; return api;
  };
  K.drawerOpen = function () { return drw; };
  K.toast = function (m) {
    var t = K.$(".k-toast"); if (!t) { t = doc.createElement("div"); t.className = "k-toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); doc.body.appendChild(t); }
    t.textContent = m; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("on"); }, 2800);
  };
  /* run a write with a busy button, toast on success, friendly toast on failure */
  K.run = function (btn, p, ok) {
    A.busy(btn, true);
    return Promise.resolve(p).then(function (v) { A.busy(btn, false); if (ok) K.toast(ok); return v; }, function (e) { A.busy(btn, false); K.toast(K.msg(e)); throw e; });
  };

  /* ---------------- charts (single series; the title names it; hover shows the value) ---------------- */
  function niceMax(m) { if (m <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
  function compact(n) { n = Number(n); if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + "M"; if (Math.abs(n) >= 1000) return (n / 1000).toFixed(n % 1000 ? 1 : 0) + "K"; return String(Math.round(n * 10) / 10); }
  K.compact = compact;
  /* pts: [{x: label, y: number, t?: tooltip label}] */
  K.line = function (pts, o) {
    o = o || {};
    if (!pts || !pts.length) return '<p class="k-mute k-small">No data for this range yet.</p>';
    var W = 640, H = o.h || 180, L = 40, R = 12, T = 12, B = 26, n = pts.length;
    var max = niceMax(Math.max.apply(null, pts.map(function (p) { return +p.y || 0; })) * 1.05), w = W - L - R, h = H - T - B;
    function X(i) { return L + (n === 1 ? w / 2 : i * w / (n - 1)); } function Y(v) { return T + h - (v / max) * h; }
    var d = pts.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(+p.y || 0).toFixed(1); }).join("");
    var area = d + "L" + X(n - 1).toFixed(1) + "," + (T + h) + "L" + X(0).toFixed(1) + "," + (T + h) + "Z";
    var g = "";
    [0, .5, 1].forEach(function (f) { var y = T + h - f * h; g += '<line class="' + (f ? "gl" : "ax") + '" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text class="tx" x="' + (L - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + compact(max * f) + "</text>"; });
    var step = Math.max(1, Math.ceil(n / 6)), xl = "";
    pts.forEach(function (p, i) { if (i % step === 0 || i === n - 1) xl += '<text class="tx" x="' + X(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + (i === 0 ? "start" : i === n - 1 ? "end" : "middle") + '">' + esc(p.x) + "</text>"; });
    if (n > 1) { /* thin the last label if it collides */ }
    var last = pts[n - 1];
    var data = esc(JSON.stringify(pts.map(function (p, i) { return [X(i) / W, Y(+p.y || 0) / H, p.t || p.x, o.fmt ? o.fmt(p.y) : K.num(p.y)]; })));
    return '<div class="k-chart" data-line="' + data + '"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(o.label || "Chart") + ", latest " + esc(o.fmt ? o.fmt(last.y) : K.num(last.y)) + '" preserveAspectRatio="none">' + g +
      '<path class="ar" d="' + area + '"/><path class="ln" d="' + d + '"/><circle class="dot" cx="' + X(n - 1).toFixed(1) + '" cy="' + Y(+last.y || 0).toFixed(1) + '" r="4"/>' + xl +
      '<line class="xh" x1="0" x2="0" y1="' + T + '" y2="' + (T + h) + '" visibility="hidden"/><circle class="dot hv" r="4" visibility="hidden"/><rect class="hit" x="' + L + '" y="0" width="' + w + '" height="' + H + '"/></svg><div class="k-tip" hidden></div>' +
      '<details class="k-dt"><summary>Show as a table</summary>' + K.table([{ t: "When", k: "x" }, { t: o.label || "Value", f: function (p) { return esc(o.fmt ? o.fmt(p.y) : K.num(p.y)); }, cls: "r" }], pts.map(function (p, i) { return { id: i, x: p.t || p.x, y: p.y }; })) + "</details></div>";
  };
  function lineHover(e) {
    var c = e.target.closest && e.target.closest(".k-chart[data-line]"); if (!c) return;
    var svg = c.querySelector("svg"), rc = svg.getBoundingClientRect(), pts = JSON.parse(c.getAttribute("data-line")), fx = (e.clientX - rc.left) / rc.width;
    var best = 0; pts.forEach(function (p, i) { if (Math.abs(p[0] - fx) < Math.abs(pts[best][0] - fx)) best = i; });
    var p = pts[best], vb = svg.viewBox.baseVal, xh = svg.querySelector(".xh"), dot = svg.querySelector(".hv"), tip = c.querySelector(".k-tip");
    xh.setAttribute("x1", p[0] * vb.width); xh.setAttribute("x2", p[0] * vb.width); xh.setAttribute("visibility", "visible");
    dot.setAttribute("cx", p[0] * vb.width); dot.setAttribute("cy", p[1] * vb.height); dot.setAttribute("visibility", "visible");
    tip.textContent = p[2] + ": " + p[3]; tip.hidden = false; tip.style.left = Math.min(Math.max(p[0] * rc.width, 60), rc.width - 60) + "px"; tip.style.top = (p[1] * rc.height) + "px";
  }
  doc.addEventListener("pointermove", function (e) { if (e.target.closest && e.target.closest(".k-chart[data-line] svg")) lineHover(e); });
  doc.addEventListener("pointerout", function (e) {
    var c = e.target.closest && e.target.closest(".k-chart[data-line]"); if (!c || (e.relatedTarget && c.contains(e.relatedTarget))) return;
    var t = c.querySelector(".k-tip"); if (t) t.hidden = true; K.$$(".xh,.hv", c).forEach(function (x) { x.setAttribute("visibility", "hidden"); });
  });
  /* small multiple: title + current value + line */
  K.mini = function (title, value, pts, o) { return '<section><div class="k-ch-h"><h3>' + esc(title) + "</h3><span>" + esc(value) + "</span></div>" + K.line(pts, Object.assign({ label: title, h: 150 }, o || {})) + "</section>"; };
  /* horizontal bars, values labelled: items [{label, value, sub?}] */
  K.bars = function (items, o) {
    o = o || {};
    if (!items || !items.length) return '<p class="k-mute k-small">' + esc(o.empty || "Nothing yet.") + "</p>";
    var max = Math.max.apply(null, items.map(function (i) { return +i.value || 0; })) || 1;
    return '<ul class="k-bl"' + (o.label ? ' aria-label="' + esc(o.label) + '"' : "") + ">" + items.map(function (i) {
      return '<li><span class="k-bl-l" title="' + esc(i.label) + '">' + esc(i.label) + '</span><span class="k-bl-v">' + esc(o.fmt ? o.fmt(i.value) : K.num(i.value)) + '</span><span class="k-bl-t" aria-hidden="true"><i style="width:' + Math.max(0.5, (+i.value || 0) / max * 100).toFixed(1) + '%"></i></span></li>';
    }).join("") + "</ul>";
  };

  /* ---------------- audit diff ---------------- */
  function show(v) { if (v === undefined) return ""; if (v === null) return "empty"; if (typeof v === "object") return JSON.stringify(v); return String(v); }
  K.diff = function (before, after) {
    if (!before && !after) return '<p class="k-mute">No details were recorded for this action.</p>';
    var b = before && typeof before === "object" ? before : { value: before }, a = after && typeof after === "object" ? after : { value: after };
    if (before == null) b = {}; if (after == null) a = {};
    var keys = []; Object.keys(b).concat(Object.keys(a)).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
    keys.sort(function (x, y) { var cx = show(b[x]) !== show(a[x]), cy = show(b[y]) !== show(a[y]); return cx === cy ? 0 : cx ? -1 : 1; });
    return '<div class="k-tw"><table class="k-diff"><thead><tr><th scope="col">Field</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>' + keys.map(function (k) {
      var x = show(b[k]), y = show(a[k]), ch = x !== y;
      return '<tr class="' + (ch ? "chg" : "same") + '"><td>' + esc(k) + "</td><td>" + (ch && x ? "<del>" + esc(x) + "</del>" : esc(x)) + "</td><td>" + esc(y) + "</td></tr>";
    }).join("") + "</tbody></table></div>";
  };

  /* ---------------- shell ---------------- */
  var umOpen = false;
  function closeUM(refocus) { var w = K.$(".k-um"); umOpen = false; if (!w) return; w.classList.remove("on"); var p = w.querySelector(".k-pop"), b = w.querySelector(".k-umb"); if (p) p.hidden = true; if (b) { b.setAttribute("aria-expanded", "false"); if (refocus) b.focus(); } }
  K.acts["k-um"] = function (b) { var w = b.closest(".k-um"), p = w.querySelector(".k-pop"); if (umOpen) return closeUM(); umOpen = true; w.classList.add("on"); p.hidden = false; b.setAttribute("aria-expanded", "true"); var f = p.querySelector(".k-mi"); if (f) f.focus(); };
  K.acts["k-menu"] = function () { var app = K.$(".k-app"); app.classList.toggle("nav-open"); if (app.classList.contains("nav-open")) { var a = K.$(".k-nav a[aria-current]") || K.$(".k-nav a"); if (a) a.focus(); } };
  K.acts["k-scrim"] = function () { K.$(".k-app").classList.remove("nav-open"); };
  /* o: {appName, roleLabel, nav:[{g, items:[[id, label, badgeId?]]}], user, tools (html before theme), menu: [{t, act, d}], foot} */
  K.shell = function (o) {
    K.appName = o.appName;
    var app = K.$("#k-app");
    var nav = o.nav.map(function (g) {
      return (g.g ? '<p class="k-ng">' + esc(g.g) + "</p>" : "") + g.items.map(function (it) {
        return '<a href="#/' + it[0] + '" data-v="' + it[0] + '"><span>' + esc(it[1]) + "</span>" + (it[2] ? '<b class="k-badge" id="' + it[2] + '"></b>' : "") + "</a>";
      }).join("");
    }).join("");
    var u = o.user;
    app.innerHTML = '<aside class="k-side" id="k-side" aria-label="' + esc(o.appName) + ' sections"><div class="k-brand"><img src="site/img/logo.png" alt="Dolphin Education" class="logo-l" width="140" height="32"><img src="site/img/logo-light.png" alt="Dolphin Education" class="logo-d" width="140" height="32"><small>' + esc(o.roleLabel) + '</small></div>' +
      '<nav class="k-nav" aria-label="Sections">' + nav + '</nav><div class="k-side-f">' + (o.foot || "") + "</div></aside>" +
      '<div class="k-scrim" data-act="k-scrim" aria-hidden="true"></div>' +
      '<div class="k-main"><div id="k-notes"></div><header class="k-top"><button type="button" class="k-b soft sm k-menu" data-act="k-menu" aria-controls="k-side">Menu</button><span class="k-sp"></span>' + (o.tools || "") +
      '<span id="k-bell"></span>' + K.themeBtn() +
      '<div class="k-um"><button type="button" class="k-umb" data-act="k-um" aria-haspopup="menu" aria-expanded="false"><span class="k-av" aria-hidden="true" data-i="' + esc(K.initials(u.name)) + '"></span><span class="k-who"><b>' + esc(u.name) + "</b><small>" + esc(o.roleLabel) + '</small><span class="ns-sr">, account menu</span></span></button>' +
      '<div class="k-pop" role="menu" aria-label="Account" hidden><div class="k-ph2" role="presentation"><b>' + esc(u.name) + "</b><small>" + esc(u.email || "") + "</small></div>" +
      (o.menu || []).map(function (m) { return '<button type="button" role="menuitem" class="k-mi' + (m.d ? " d" : "") + '" data-act="' + m.act + '"' + (m.theme ? " data-theme-label" : "") + ">" + esc(m.t) + "</button>"; }).join("") +
      '</div></div></header><main id="k-main" tabindex="-1"></main></div>';
    K.showOnly("k-app");
    syncTheme();
  };
  K.notes = function (html) { var n = K.$("#k-notes"); if (n) n.innerHTML = html || ""; };
  K.badge = function (id, n) { var b = K.$("#" + id); if (b) { b.textContent = n ? String(n) : ""; b.setAttribute("aria-label", n ? n + " waiting" : ""); } };
  K.start = function (home) { K.home = home; K.started = true; if (!K.views[K.parse().id]) history.replaceState(null, "", K.href(home)); K.render(); };

  /* refresh timer for live screens: runs fn every ms while the view is current and the tab is visible */
  K.every = function (ctx, ms, fn) {
    var t = setInterval(function () { if (!ctx.alive()) return clearInterval(t); if (doc.visibilityState === "visible" && !K.drawerOpen() && !K.$("dialog.k-dlg[open]")) fn(); }, ms);
  };

  /* signs-in common: hide app, show a section */
  K.showOnly = function (id) { ["k-signin", "k-app"].forEach(function (x) { var el = K.$("#" + x); if (el) el.hidden = x !== id; }); };

  window.K = K;
})();
