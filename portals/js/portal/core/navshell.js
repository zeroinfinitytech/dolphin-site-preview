/* Dolphin portals: the shared app-shell navbar (window.NS). One component for head office, staff, student/parent and university.
   Builds: theme icon button, compact alerts badge, user menu (initials avatar + name + role, dropdown), breadcrumb, dialog helper for the px portals.
   Behaviour (bound once): menus open on click, Esc closes and returns focus, arrow keys / Home / End move between items, Tab or an outside click closes,
   theme labels follow the current theme, items with data-ns="<name>" call the handler a page registers with NS.on(name, fn).
   No icons except the sun/moon of the public site's theme button; no arrows; flat surfaces (css/portal/core/navshell.css). */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement, H = {};
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function dark() { return root.getAttribute("data-theme") === "dark"; }
  function initials(n) { return String(n || "").replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase() || "D"; }
  var SVG = 'viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
  var MOON = '<svg class="ns-moon" ' + SVG + '><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>';
  var SUN = '<svg class="ns-sun" ' + SVG + '><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>';
  function themeLabel() { return dark() ? "Switch to light theme" : "Switch to dark theme"; }
  function themeText() { return dark() ? "Light theme" : "Dark theme"; }

  /* links out of the portals: on the Node server "/" and index.html are the public site and the hub is /hub.html; on the static preview (:5750, file:) index.html is the hub */
  var STATIC = location.protocol === "file:" || location.port === "5750";
  var NS = {
    esc: esc, initials: initials, hub: STATIC ? "index.html" : "hub.html", site: "site/index.html",
    on: function (k, f) { H[k] = f; },
    /* small round icon button, the only icon in the shell (same sun/moon as the public site header) */
    themeBtn: function (cls) { return '<button type="button" class="ns-ib ns-theme ' + (cls || "") + '" data-theme-toggle aria-label="' + themeLabel() + '" title="' + themeLabel() + '">' + MOON + SUN + "</button>"; },
    /* a full-width text row for sheets and menus (phones) */
    themeRow: function (cls) { return '<button type="button" class="' + (cls || "ns-row") + '" data-theme-toggle><span class="ns-tt">' + themeText() + "</span></button>"; },
    /* alerts: text plus a compact count badge. o = {count, act, href, id, expanded, label, cls} */
    alerts: function (o) {
      var n = o.count || 0, lab = (o.label || "Alerts") + ", " + (n ? n + " waiting" : "nothing waiting");
      var inner = '<span class="ns-al-t">Alerts</span><b class="ns-badge' + (o.badgeCls ? " " + o.badgeCls : "") + '"' + (o.badgeId ? ' id="' + o.badgeId + '"' : "") + ">" + (n || "") + "</b>";
      var at = ' class="ns-alerts ' + (o.cls || "") + '"' + (o.id ? ' id="' + o.id + '"' : "") + ' aria-label="' + esc(lab) + '"';
      if (o.href) return '<a href="' + o.href + '"' + at + ">" + inner + "</a>";
      return '<button type="button"' + at + (o.act ? ' data-act="' + o.act + '"' : "") + ' aria-expanded="' + !!o.expanded + '" aria-haspopup="dialog">' + inner + "</button>";
    },
    /* breadcrumb: [{t, href}] the last item is the current page */
    crumb: function (items) {
      return '<nav class="ns-crumb" aria-label="Breadcrumb"><ol>' + items.map(function (c, i) {
        var last = i === items.length - 1;
        return "<li>" + (last ? '<span aria-current="page">' + esc(c.t) + "</span>" : c.href ? '<a href="' + c.href + '">' + esc(c.t) + "</a>" : "<span>" + esc(c.t) + "</span>") + "</li>";
      }).join("") + "</ol></nav>";
    },
    /* user menu. o = {name, role, sub, note, init, items:[{t, ns, act, v, href, attrs, group, radio, checked, cls, danger}]} */
    user: function (o) {
      var id = "nsUM", grp = null, list = (o.items || []).map(function (it) {
        var h = "";
        if (it.group !== grp && it.group) h += '<p class="ns-mg" role="presentation">' + esc(it.group) + "</p>";
        if (it.sep) { grp = null; return h + '<hr class="ns-ms" role="separator">'; }
        grp = it.group || null;
        var role = it.radio ? "menuitemradio" : "menuitem", cls = "ns-mi" + (it.cls ? " " + it.cls : "") + (it.danger ? " ns-out" : "");
        var at = ' role="' + role + '"' + (it.radio ? ' aria-checked="' + !!it.checked + '"' : "") + (it.ns ? ' data-ns="' + it.ns + '"' : "") + (it.act ? ' data-act="' + it.act + '"' : "") + (it.v != null ? ' data-v="' + esc(it.v) + '"' : "") + (it.attrs || "") + ' tabindex="-1"';
        if (it.theme) return h + '<button type="button" class="' + cls + '" role="menuitem" data-theme-toggle tabindex="-1"><span class="ns-tt">' + themeText() + "</span></button>";
        if (it.href) return h + '<a class="' + cls + '" href="' + it.href + '"' + at + '><span>' + esc(it.t) + "</span>" + (it.hint ? "<small>" + esc(it.hint) + "</small>" : "") + "</a>";
        return h + '<button type="button" class="' + cls + '"' + at + '><span>' + esc(it.t) + "</span>" + (it.hint ? "<small>" + esc(it.hint) + "</small>" : "") + "</button>";
      }).join("");
      var ini = esc(o.init || initials(o.name));
      return '<div class="ns-um">' +
        '<button type="button" class="ns-umb" aria-haspopup="menu" aria-expanded="false" aria-controls="' + id + '">' +   /* name = its visible text (WCAG 2.5.3); initials drawn by CSS so they are not text */
        '<span class="ns-av" aria-hidden="true" data-i="' + ini + '"></span><span class="ns-who"><b>' + esc(o.name) + "</b><small>" + esc(o.role || "") + '</small><span class="ns-sr">, account menu</span></span></button>' +
        '<div class="ns-menu" id="' + id + '" role="menu" aria-label="Account" hidden>' +
        '<div class="ns-mh" role="presentation"><span class="ns-av lg" aria-hidden="true">' + ini + "</span><div><b>" + esc(o.name) + "</b><small>" + esc(o.sub || o.role || "") + "</small>" + (o.note ? '<small class="ns-note">' + esc(o.note) + "</small>" : "") + "</div></div>" +
        list + "</div></div>";
    },
    /* dialog helper for the px portals (they own <dialog id="dlg"> and its close handling via data-act="close") */
    dialog: function (title, cap, body) {
      var d = doc.getElementById("dlg"); if (!d) return;
      delete d.dataset.app;
      d.innerHTML = '<div class="px-dh"><div><p class="px-cap">' + esc(cap) + '</p><h2 id="dlgT">' + esc(title) + '</h2></div><button class="btn quiet xs" data-act="close" aria-label="Close">Close</button></div>' + body;
      if (!d.open) { if (d.showModal) d.showModal(); else d.setAttribute("open", ""); }
      var h = d.querySelector("h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus(); }
    },
    close: closeAll
  };

  /* ---------------- menu behaviour ---------------- */
  var open = null;
  function items(m) { return Array.prototype.slice.call(m.querySelectorAll(".ns-mi")).filter(function (x) { return x.offsetParent !== null && !x.disabled; }); }
  function openMenu(wrap, focusLast) {
    closeAll(); var b = wrap.querySelector(".ns-umb"), m = wrap.querySelector(".ns-menu"); if (!b || !m) return;
    m.hidden = false; b.setAttribute("aria-expanded", "true"); wrap.classList.add("on"); open = wrap;
    var it = items(m); if (it.length) (focusLast ? it[it.length - 1] : it[0]).focus();
  }
  function closeAll(refocus) {
    if (!open) return; var w = open, b = w.querySelector(".ns-umb"), m = w.querySelector(".ns-menu");
    open = null; w.classList.remove("on"); if (m) m.hidden = true; if (b) { b.setAttribute("aria-expanded", "false"); if (refocus && doc.contains(b)) b.focus(); }
  }
  doc.addEventListener("click", function (e) {
    var t = e.target, ub = t.closest && t.closest(".ns-umb");
    if (ub) { var w = ub.closest(".ns-um"); if (open === w) closeAll(); else openMenu(w); return; }
    if (!open) return;
    var mi = t.closest && t.closest(".ns-mi");
    if (mi && open.contains(mi)) {
      var k = mi.getAttribute("data-ns"), keepFocus = !mi.hasAttribute("data-theme-toggle");
      closeAll(!k && keepFocus && !mi.getAttribute("href") && !mi.hasAttribute("data-act"));
      if (k && H[k]) { e.preventDefault(); H[k](mi.dataset, e); }
      return;
    }
    if (!open.contains(t)) closeAll();
  });
  doc.addEventListener("keydown", function (e) {
    var ub = e.target.closest && e.target.closest(".ns-umb");
    if (ub && !open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); openMenu(ub.closest(".ns-um"), e.key === "ArrowUp"); return; }
    if (!open) return;
    var m = open.querySelector(".ns-menu"), it = items(m), i = it.indexOf(doc.activeElement);
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); closeAll(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); (it[(i + 1) % it.length] || it[0]).focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); (it[(i - 1 + it.length) % it.length] || it[0]).focus(); }
    else if (e.key === "Home") { e.preventDefault(); it[0].focus(); }
    else if (e.key === "End") { e.preventDefault(); it[it.length - 1].focus(); }
    else if (e.key === "Tab") closeAll();
  }, true);
  window.addEventListener("hashchange", function () { closeAll(); });
  window.addEventListener("resize", function () { closeAll(); });

  /* theme labels follow the theme (proto.js does the toggling) */
  function syncTheme() {
    Array.prototype.forEach.call(doc.querySelectorAll(".ns-theme"), function (b) { b.setAttribute("aria-label", themeLabel()); b.setAttribute("title", themeLabel()); });
    Array.prototype.forEach.call(doc.querySelectorAll(".ns-tt"), function (s) { s.textContent = themeText(); });
  }
  if ("MutationObserver" in window) new MutationObserver(syncTheme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  /* sign-in screens of head office and staff: the text "Theme" pill becomes the same icon button */
  Array.prototype.forEach.call(doc.querySelectorAll("button.si-theme[data-theme-toggle]"), function (b) { b.className = "ns-ib ns-theme si-theme"; b.innerHTML = MOON + SUN; b.setAttribute("aria-label", themeLabel()); b.setAttribute("title", themeLabel()); });
  window.NS = NS;
})();
