/* Dolphin Content Manager portal: Website (CMS). One screen per editable type from GET /api/cms/types:
   type index -> list (thumbnails, status filter, search, drag reorder) -> editor (schema-driven form, language tabs EN · ने · ES · 한 · 中,
   structured block editor for blog posts, media fields from js/portal/core/media-picker.js, banner live hero preview, event registrations,
   Save draft / Preview / Publish / Unpublish / Archive / Delete, revision drawer with restore, inline validation, CMS freeze (423), unsaved-changes guard). */
(function () {
  "use strict";
  var CM = window.CM, api = CM.api, esc = CM.esc, $ = CM.$, $$ = CM.$$, V = CM.V, MP = window.MediaPicker;
  var LANGS = [["en", "EN", "English"], ["ne", "ने", "Nepali"], ["es", "ES", "Spanish"], ["ko", "한", "Korean"], ["zh", "中", "Chinese"]];
  var LNAME = { en: "English", ne: "Nepali", es: "Spanish", ko: "Korean", zh: "Chinese" };
  var ORDER = ["notice", "banner", "event", "post", "gallery", "video", "team", "university", "faq", "country_facts", "test_class", "site_settings"];
  var PLURAL = { notice: "Site notices", banner: "Page banners", event: "Events", post: "Blog posts", gallery: "Gallery", video: "Videos", team: "Team", university: "Partner universities", faq: "FAQs", country_facts: "Country key facts", test_class: "Test-prep classes", site_settings: "Office details" };
  var HELP = { notice: "A thin line under the header on every page. One notice shows at a time: the first live one in this list, so drag to choose.", banner: "The hero at the top of each page. Several on one page play as slides, in this order.", gallery: "Photos on the Gallery page, by chapter.", video: "Clips on the Videos page.", team: "People on the About page.", university: "Partner universities on the Universities and country pages.", country_facts: "Costs, intakes and work rights on each country page and in the chat.", test_class: "Class times and fees on Test Preparation.", post: "Articles on the Blog.", event: "Events page, homepage and the event pop-up. Registration is built in.", notice: "A thin line under the header on every page.", faq: "Questions on the site and in the chat.", site_settings: "Address, phones, hours, map and social links in the header, footer, contact page and chat." };
  var NEW = { notice: "New notice", banner: "New banner", event: "New event", post: "New blog post", gallery: "Add a photo", video: "Add a video", team: "Add a person", university: "Add a university", faq: "New question", country_facts: "Add a country", test_class: "New class" };
  var COUNTRY = { "united-kingdom": "United Kingdom", usa: "USA", canada: "Canada", australia: "Australia", "new-zealand": "New Zealand" };
  var ENUM = {
    type: { roadshow: "Roadshow", admission: "Admission day", info: "Information session", online: "Online session", university: "University visit" },
    chapter: { counsel: "Counselling", apply: "Applying", life: "Student life", campus: "Campus", grad: "Graduation" },
    test: { ielts: "IELTS", pte: "PTE", toefl: "TOEFL" },
    page: { home: "Home", destinations: "Destinations", "test-prep": "Test preparation", events: "Events", gallery: "Gallery", videos: "Videos", blog: "Blog", about: "About", contact: "Contact", stories: "Stories", universities: "Universities", general: "General" }
  };
  function enumLabel(key, v) { if (v == null || v === "") return ""; if (/^country:/.test(v)) return "Country page: " + (COUNTRY[v.slice(8)] || v.slice(8)); if (COUNTRY[v] && (key === "country" || key === "slug")) return COUNTRY[v]; return (ENUM[key] && ENUM[key][v]) || (ENUM.page[v] && (key === "page")) && ENUM.page[v] || COUNTRY[v] || String(v).replace(/[-_]/g, " ").replace(/^./, function (c) { return c.toUpperCase(); }); }
  var STATUS = { draft: "Draft", published: "Published", hidden: "Hidden", archived: "Archived" };
  var ACTION = { create: "Created", save: "Saved", publish: "Published", unpublish: "Hidden", archive: "Archived", restore: "Restored", seed: "Imported from the site" };

  var TYPES = null;
  var BL = { heading: "Heading", paragraph: "Paragraph", list: "List", quote: "Quote", image: "Image", faq: "Question" };
  function types() { if (TYPES) return Promise.resolve(TYPES); return api.get("/api/cms/types").then(function (t) { var by = {}; (t.types || []).forEach(function (x) { by[x.type] = x; }); TYPES = { raw: t, by: by, blocks: t.block_types || {} }; return TYPES; }); }

  /* ---------- small utils ---------- */
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function parts(p) { return String(p).split(".").map(function (k) { return /^\d+$/.test(k) ? +k : k; }); }
  function getP(o, p) { return parts(p).reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
  function setP(o, p, v) { var ks = parts(p), a = o; for (var i = 0; i < ks.length - 1; i++) { if (a[ks[i]] == null) a[ks[i]] = typeof ks[i + 1] === "number" ? [] : {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; }
  function tr(v, l) { if (v == null) return ""; if (typeof v === "string") return l === "en" ? v : ""; return v[l] || ""; }
  function trf(v, l) { return tr(v, l) || tr(v, "en"); }
  function norm(k) { return String(k).replace(/\[(\d+)\]/g, ".$1"); }

  /* ---------- pointer + keyboard reordering (lists and blocks) ---------- */
  function sortable(box, itemSel, onMove) {
    var drag = null;
    box.addEventListener("pointerdown", function (e) {
      var h = e.target.closest(".handle"); if (!h || !box.contains(h)) return;
      var it = h.closest(itemSel); if (!it) return; e.preventDefault();
      drag = { el: it, from: $$(itemSel, box).indexOf(it), over: null, after: false }; it.classList.add("dragging"); h.setPointerCapture && h.setPointerCapture(e.pointerId);
    });
    box.addEventListener("pointermove", function (e) {
      if (!drag) return; var t = document.elementFromPoint(e.clientX, e.clientY), o = t && t.closest(itemSel);
      $$(itemSel, box).forEach(function (x) { x.classList.remove("drop-a", "drop-b"); });
      if (!o || o === drag.el || !box.contains(o)) { drag.over = null; return; }
      var r = o.getBoundingClientRect(); drag.over = o; drag.after = e.clientY > r.top + r.height / 2; o.classList.add(drag.after ? "drop-b" : "drop-a");
    });
    function end() {
      if (!drag) return; var d = drag; drag = null; d.el.classList.remove("dragging"); $$(itemSel, box).forEach(function (x) { x.classList.remove("drop-a", "drop-b"); });
      if (!d.over) return; var all = $$(itemSel, box), to = all.indexOf(d.over); if (d.after) to++; if (to > d.from) to--; if (to !== d.from) onMove(d.from, to);
    }
    box.addEventListener("pointerup", end); box.addEventListener("pointercancel", end);
    box.addEventListener("keydown", function (e) {
      var h = e.target.closest(".handle"); if (!h || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
      e.preventDefault(); var all = $$(itemSel, box), i = all.indexOf(h.closest(itemSel)), to = i + (e.key === "ArrowUp" ? -1 : 1);
      if (to < 0 || to >= all.length) return; onMove(i, to, true);
    });
  }
  function move(arr, from, to) { var x = arr.splice(from, 1)[0]; arr.splice(to, 0, x); return arr; }

  /* =====================================================================
     Router entry: #/website, #/website/<type>, #/website/<type>/<id|new>
     ===================================================================== */
  V.website = function (r, el, cur) {
    return types().then(function (T) {
      var type = r[1], id = r[2];
      if (!type) return index(el, T);
      var t = T.by[type]; if (!t) { el.innerHTML = '<div class="pg">' + CM.errBox({ status: 404 }, "No such kind of content") + "</div>"; return; }
      if (t.singleton) return api.get("/api/cms/items", { type: type, limit: 1 }).then(function (b) { var it = (b.items || [])[0]; return editor(el, T, t, it ? it.id : null, cur); });
      if (!id) return list(el, T, t);
      return editor(el, T, t, id === "new" ? null : +id, cur);
    });
  };

  /* ---------- type index ---------- */
  function index(el, T) {
    var list = ORDER.filter(function (k) { return T.by[k]; }).concat(Object.keys(T.by).filter(function (k) { return ORDER.indexOf(k) < 0; }));
    el.innerHTML = '<div class="pg">' + CM.head({ eb: "Website", title: "Website content", lead: "The parts of the website that change. Layout, colours and animations stay as designed. Save draft keeps your work private until you publish." }) +
      '<ul class="types">' + list.map(function (k) { var t = T.by[k]; return '<li><a href="#/website/' + k + '"><b>' + esc(PLURAL[k] || t.label) + "</b><span>" + esc(HELP[k] || t.help || "") + '</span><small data-count="' + k + '">&nbsp;</small></a></li>'; }).join("") +
      '<li><a href="#/stories"><b>Stories</b><span>Student and parent stories, approved before they go live.</span><small>&nbsp;</small></a></li><li><a href="#/media"><b>Media library</b><span>Every photo, video and PDF used on the site.</span><small>&nbsp;</small></a></li></ul></div>';
    CM.setCrumb([{ t: "Website content" }]);
    list.forEach(function (k) {
      if (T.by[k].singleton) { var s0 = $('[data-count="' + k + '"]', el); if (s0) s0.textContent = "One page of details"; return; }
      Promise.all([api.get("/api/cms/items", { type: k, limit: 1 }), api.get("/api/cms/items", { type: k, status: "draft", limit: 1 })]).then(function (b) {
        var s = $('[data-count="' + k + '"]', el); if (!s) return; var n = b[0].total || 0, d = b[1].total || 0;
        s.textContent = n ? n + (n === 1 ? " item" : " items") + (d ? ", " + d + (d === 1 ? " draft" : " drafts") : "") : "Nothing yet";
      }, function () { /* counts are a nicety */ });
    });
  }

  /* ---------- list ---------- */
  var LS = {};
  function list(el, T, t) {
    var st = LS[t.type] = LS[t.type] || { status: "", q: "", page_key: "" }, items = [];
    var pageF = t.type === "banner" || t.type === "faq";
    var pageVals = pageF ? (t.fields.filter(function (f) { return f.key === "page"; })[0] || {}).values || [] : [];
    el.innerHTML = '<div class="pg">' + CM.head({ eb: "Website content", title: PLURAL[t.type] || t.label, lead: HELP[t.type] || t.help || "", acts: '<a class="btn" href="#/website/' + t.type + '/new">' + esc(NEW[t.type] || "New") + "</a>" }) +
      '<div class="bar"><input type="search" class="q" id="lsQ" placeholder="Search ' + esc((PLURAL[t.type] || t.label).toLowerCase()) + '" aria-label="Search" value="' + esc(st.q) + '">' +
      (pageF ? '<label><span class="cm-sr">Page</span><select class="in" id="lsPage"><option value="">Every page</option>' + pageVals.map(function (v) { return '<option value="' + esc(v) + '"' + (st.page_key === v ? " selected" : "") + ">" + esc(enumLabel("page", v)) + "</option>"; }).join("") + "</select></label>" : "") +
      '<div class="pills" role="group" aria-label="Status">' + [["", "All"], ["draft", "Drafts"], ["published", "Published"], ["hidden", "Hidden"], ["archived", "Archived"]].map(function (s) { return '<button type="button" class="pill" data-ls="status" data-v="' + s[0] + '" aria-pressed="' + (st.status === s[0]) + '">' + s[1] + "</button>"; }).join("") + "</div></div>" +
      '<p class="hint" id="lsHint"></p><div id="lsBox">' + CM.skel(8) + "</div></div>";
    CM.setCrumb([{ t: "Website content", href: "#/website" }, { t: PLURAL[t.type] || t.label }]);
    var box = $("#lsBox", el);
    function canSort() { return !st.q && !st.status; }
    function paint() {
      $("#lsHint", el).textContent = items.length > 1 ? (canSort() ? "Drag the handle, or focus it and use the arrow keys, to change the order on the website." : "Clear the search and status filter to change the order.") : "";
      if (!items.length) { box.innerHTML = CM.empty(st.q || st.status ? "Nothing matches" : "Nothing here yet", st.q || st.status ? "Try another search or status." : "Add the first one with the button above.", st.q || st.status ? "" : '<a class="btn soft sm" href="#/website/' + t.type + '/new">' + esc(NEW[t.type] || "New") + "</a>"); return; }
      var sortOn = canSort() && items.length > 1;
      box.innerHTML = '<ul class="rows" id="lsRows">' + items.map(function (it) {
        var sub = [it.updated_at ? "Updated " + CM.ago(it.updated_at) + (it.updated_by_name ? " by " + it.updated_by_name : "") : ""];
        if (it.has_unpublished_changes && it.status === "published") sub.push("Unpublished changes");
        if (t.type === "event" && it.starts_at) sub.unshift(CM.date(it.starts_at));
        if (t.type === "event" && it.registrations && it.registrations.n) sub.push(it.registrations.n + (it.registrations.n === 1 ? " registration" : " registrations"));
        if (it.branch_name) sub.push(it.branch_name + " only");
        return '<li class="row' + (sortOn ? " rowg" : "") + '" data-id="' + it.id + '">' + (sortOn ? '<button type="button" class="handle" aria-label="Reorder ' + esc(it.title || "item") + '" title="Drag to reorder">⠇</button>' : "") +
          (it.thumb ? '<img class="thumb" src="' + esc(it.thumb) + '" alt="" loading="lazy">' : '<span class="thumb none" aria-hidden="true">' + esc((it.title || "?").charAt(0)) + "</span>") +
          '<a class="main-l" href="#/website/' + t.type + "/" + it.id + '"><b>' + esc(it.title || "Untitled") + "</b><small>" + esc(sub.filter(Boolean).join(" · ")) + "</small></a>" +
          '<div class="ra"><span class="stw' + (it.status === "published" ? " on" : "") + '">' + esc(STATUS[it.status] || it.status) + "</span></div></li>";
      }).join("") + "</ul>";
      if (sortOn) sortable($("#lsRows", box), ".row", function (from, to, kb) {
        move(items, from, to); paint();
        var h = $$("#lsRows .handle", box)[to]; if (h && kb) h.focus();
        CM.announce("Moved " + (kb ? (to < from ? "up" : "down") : "") + ". Saving the order.");
        api.post("/api/cms/reorder", { type: t.type, ids: items.map(function (x) { return x.id; }) }).then(function () { CM.toast("Order saved"); }, function (e) { CM.toast(CM.msgOf(e), "error"); load(); });
      });
    }
    function load() {
      box.innerHTML = CM.skel(8);
      var q = { type: t.type, status: st.status || undefined, q: st.q || undefined, page_key: st.page_key || undefined, limit: 100 };
      function page(p, acc) { return api.get("/api/cms/items", Object.assign({ page: p }, q)).then(function (b) { acc = acc.concat(b.items || []); return b.pages > p && p < 6 ? page(p + 1, acc) : acc; }); }
      return page(1, []).then(function (a) { items = a; paint(); }, function (e) { box.innerHTML = CM.errBox(e); });
    }
    el.addEventListener("click", function (e) { var b = e.target.closest("[data-ls=status]"); if (!b) return; st.status = b.dataset.v; $$("[data-ls=status]", el).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); load(); });
    var qt; el.addEventListener("input", function (e) { if (e.target.id === "lsQ") { clearTimeout(qt); qt = setTimeout(function () { st.q = e.target.value.trim(); load(); }, 300); } });
    el.addEventListener("change", function (e) { if (e.target.id === "lsPage") { st.page_key = e.target.value; load(); } });
    return load();
  }

  /* =====================================================================
     Editor
     ===================================================================== */
  function blank(t) { var d = {}; t.fields.forEach(function (f) { if (f.type === "bool") d[f.key] = f.key === "registration_open"; else if (f.type === "blocks") d[f.key] = [{ t: "paragraph", text: {} }]; else if (f.type === "list") d[f.key] = []; }); return d; }
  function editor(el, T, t, id, cur) {
    var E = { t: t, id: id, item: null, data: null, lang: "en", dirty: false, errs: {}, banner: "", media: {}, branch_id: null };
    var me = CM.S.me, branch = CM.S.branch;
    CM.setGuard(function () { return E.dirty; });
    CM.onLeave(function () { CM.clearGuard(); });
    var load = id ? api.get("/api/cms/items/" + id) : Promise.resolve(null);
    /* the listeners further down must be bound before returning (a return here left them unreachable: Save/Publish did nothing) */
    var ready = load.then(function (it) {
      E.item = it; E.data = it ? clone(it.data) || {} : blank(t); E.branch_id = it ? it.branch_id : null;
      t.fields.forEach(function (f) { if (f.type === "blocks" && !Array.isArray(E.data[f.key])) E.data[f.key] = []; });
      paint(); cur.update = function (r2) { return r2[1] === t.type && (r2[2] === String(E.id) || (!r2[2] && t.singleton)) ? true : false; };
    });

    function title() { var f = t.fields[0], v = E.data[f.key]; return trf(v, "en") || (typeof v === "string" ? v : "") || (E.id ? "Untitled" : (NEW[t.type] || "New " + t.label.toLowerCase())); }
    function stateText() {
      var it = E.item; if (!it) return E.dirty ? "Not saved yet" : "New, not saved";
      var s = STATUS[it.status] || it.status;
      if (E.dirty) return s + ", unsaved changes";
      if (it.status === "published" && it.has_unpublished_changes) return "Published, draft changes not live yet";
      return s;
    }
    function paint() {
      var it = E.item, isPub = it && it.status === "published";
      el.innerHTML = '<div class="pg">' +
        CM.head({ eb: PLURAL[t.type] || t.label, title: title(), lead: t.singleton ? HELP[t.type] : "" }) +
        (E.banner ? '<p class="banner-msg" role="alert">' + esc(E.banner) + "</p>" : "") +
        '<div class="ed-bar"><div class="lt" role="tablist" aria-label="Language">' + LANGS.map(function (l) { var bad = Object.keys(E.errs).some(function (k) { return new RegExp("\\." + l[0] + "$").test(k); }); return '<button type="button" class="pill' + (bad ? " has-err" : "") + '" role="tab" data-ed="lang" data-v="' + l[0] + '" aria-selected="' + (E.lang === l[0]) + '" title="' + l[2] + '" aria-label="' + l[2] + (bad ? ", has errors" : "") + '">' + l[1] + "</button>"; }).join("") + "</div>" +
        '<div class="ed-acts"><span class="ed-state" id="edState" aria-live="polite">' + esc(stateText()) + "</span>" +
          (it ? '<button type="button" class="btn quiet sm" data-ed="history">History</button>' : "") +
          '<button type="button" class="btn soft sm" data-ed="preview">Preview</button>' +
          '<button type="button" class="btn soft sm" data-ed="save">Save draft</button>' +
          '<button type="button" class="btn sm" data-ed="publish">' + (isPub && !(it.has_unpublished_changes || E.dirty) ? "Publish again" : "Publish") + "</button>" +
        "</div></div>" +
        '<div class="ed' + (t.type === "banner" ? " wide" : "") + '"><form class="ed-form" id="edForm" novalidate autocomplete="off">' +
          (E.lang !== "en" ? '<p class="lang-note">Writing in ' + esc(LNAME[E.lang]) + ". Empty fields show the English text on the website.</p>" : "") +
          fieldRows(t.fields) +
        '</form><aside class="ed-side">' + side() + "</aside></div></div>";
      CM.setCrumb(t.singleton ? [{ t: "Website content", href: "#/website" }, { t: PLURAL[t.type] }] : [{ t: "Website content", href: "#/website" }, { t: PLURAL[t.type] || t.label, href: "#/website/" + t.type }, { t: E.id ? title() : (NEW[t.type] || "New") }]);
      document.title = title() + " | Dolphin Content";
      fillMedia(); if (t.type === "banner") heroPreview();
      if (t.type === "post") $$(".blks", el).forEach(function (b) { sortable(b, ".blk", function (from, to, kb) { var p = b.dataset.p, arr = getP(E.data, p); move(arr, from, to); dirty(); paint(); if (kb) { var h = $$('.blks[data-p="' + p + '"] .handle', el)[to]; if (h) h.focus(); } }); });
    }
    /* runs of short fields (date, time, numbers, choices) share one responsive row instead of a full-width line each */
    function fieldRows(fs) {
      var SHORT = { date: 1, time: 1, datetime: 1, int: 1, number: 1, enum: 1 }, out = "", run = [];
      function flush() { if (!run.length) return; var h = run.map(function (f) { return field(f, f.key, E.data[f.key]); }).join(""); out += run.length > 1 ? '<div class="ed-row">' + h + "</div>" : h; run = []; }
      fs.forEach(function (f) { if (SHORT[f.type]) run.push(f); else { flush(); out += field(f, f.key, E.data[f.key]); } });
      flush(); return out;
    }
    function side() {
      var it = E.item, h = "";
      h += '<section class="sec"><h2>Status</h2><dl class="dl">' +
        "<div><dt>Now</dt><dd>" + esc(it ? STATUS[it.status] : "Not saved") + "</dd></div>" +
        (it && it.published_at ? "<div><dt>Last published</dt><dd>" + esc(CM.ts(it.published_at)) + "</dd></div>" : "") +
        (it && it.updated_at ? "<div><dt>Last saved</dt><dd>" + esc(CM.ts(it.updated_at)) + (it.updated_by_name ? ", " + esc(it.updated_by_name) : "") + "</dd></div>" : "") +
        (it && it.slug && t.slug !== "none" && t.slug !== "fixed:main" ? "<div><dt>Address</dt><dd>" + esc(it.slug) + "</dd></div>" : "") + "</dl>";
      if (t.branch_taggable && branch) h += '<div class="fld" style="margin-top:16px"><label for="edBranch">Shown for</label><select class="in" id="edBranch"><option value=""' + (E.branch_id ? "" : " selected") + '>The whole website</option><option value="' + branch.id + '"' + (E.branch_id === branch.id ? " selected" : "") + ">" + esc(branch.name) + " branch</option></select></div>";
      if (it) {
        var acts = [];
        if (it.status === "published") acts.push('<button type="button" class="btn soft sm" data-ed="unpublish">Hide from the website</button>');
        if (it.status !== "archived") acts.push('<button type="button" class="btn soft sm" data-ed="archive">Archive</button>');
        if (!it.published_at || it.status === "archived") acts.push('<button type="button" class="btn bad sm" data-ed="delete">Delete</button>');
        if (acts.length && !t.singleton) h += '<div class="pg-a" style="margin-top:16px">' + acts.join("") + "</div>";
      }
      h += "</section>";
      if (t.type === "banner") h += '<section class="sec"><h2>Live preview</h2><div class="hero-pv" id="heroPv"></div><p class="pv-cap">How the top of the page will look, in ' + esc(LNAME[E.lang]) + ".</p></section>";
      if (t.type === "event" && it) {
        var rg = it.registrations;
        h += '<section class="sec"><h2>Registrations</h2><p id="regSum" class="mute" style="margin:8px 0 12px">' + (rg ? esc(rg.n + (rg.n === 1 ? " registration, " : " registrations, ") + rg.people + (rg.people === 1 ? " person" : " people")) : "Loading") + '</p><button type="button" class="btn soft sm" data-ed="regs">See registrations</button></section>';
        if (!rg) api.get("/api/cms/events/" + it.id + "/registrations").then(function (b) { var p = $("#regSum", el); if (p) { var s = b.summary || {}; p.textContent = (s.registrations || 0) + (s.registrations === 1 ? " registration, " : " registrations, ") + (s.people || 0) + (s.people === 1 ? " person" : " people") + (b.event && b.event.seat_limit ? ". Seat limit " + b.event.seat_limit + ", " + Math.max(0, b.event.seat_limit - (s.people || 0)) + " seats left." : "."); } }, function () { var p = $("#regSum", el); if (p) p.textContent = "Registrations did not load."; });
      }
      if (t.type === "post") h += '<section class="sec"><h2>Writing tips</h2><p class="hint">Start with a short paragraph that answers the question. Use headings every few paragraphs. Images need alt text. The body is stored as blocks, so the site keeps its design.</p></section>';
      return h;
    }

    /* ---------- fields ---------- */
    function errFor(p) { var k = Object.keys(E.errs).filter(function (x) { return x === p || x.indexOf(p + ".") === 0; }); return k.map(function (x) { var m = x.match(/\.(en|ne|es|ko|zh)$/); return (m && m[1] !== E.lang ? LNAME[m[1]] + ": " : "") + E.errs[x]; }).join(" "); }
    function errHtml(p) { var e = errFor(p); return '<p class="err" data-e="' + esc(p) + '"' + (e ? "" : " hidden") + ">" + esc(e) + "</p>"; }
    function inv(p) { return errFor(p) ? ' aria-invalid="true"' : ""; }
    function fid(p) { return "f_" + p.replace(/[^a-z0-9]/gi, "_"); }
    function lab(f, p, extra) { var req = f.required && (!/^i18n/.test(f.type) || E.lang === "en"); return '<label for="' + fid(p) + '">' + esc(f.label || f.key) + (req ? " <em>Required</em>" : "") + (extra || "") + "</label>"; }
    function field(f, p, v) {
      var id = fid(p), ph, en;
      switch (f.type) {
        case "i18n": case "i18n_text": {
          var val = tr(v, E.lang); en = tr(v, "en"); ph = E.lang !== "en" && en ? "English: " + en : "";
          var ctl = f.type === "i18n" ? '<input class="in" id="' + id + '" data-p="' + p + '" data-ty="' + f.type + '" maxlength="' + (f.max || 2000) + '" value="' + esc(val) + '" placeholder="' + esc(ph) + '"' + inv(p) + ">" :
            '<textarea class="in" id="' + id + '" data-p="' + p + '" data-ty="' + f.type + '" maxlength="' + (f.max || 2000) + '" rows="' + ((f.max || 0) > 600 ? 5 : 3) + '" placeholder="' + esc(ph) + '"' + inv(p) + ">" + esc(val) + "</textarea>";
          return '<div class="fld">' + lab(f, p) + ctl + left(f, val) + errHtml(p) + "</div>";
        }
        case "text": case "url": case "email": case "phone":
          return '<div class="fld">' + lab(f, p) + '<input class="in" id="' + id + '" data-p="' + p + '" data-ty="' + f.type + '" type="' + (f.type === "email" ? "email" : f.type === "phone" ? "tel" : f.type === "url" ? "text" : "text") + '"' + (f.type === "url" ? ' inputmode="url" placeholder="https://... or /contact.html"' : "") + ' maxlength="' + (f.max || 500) + '" value="' + esc(v == null ? "" : v) + '"' + inv(p) + ">" + errHtml(p) + "</div>";
        case "enum":
          return '<div class="fld">' + lab(f, p) + '<select class="in" id="' + id + '" data-p="' + p + '" data-ty="enum"' + inv(p) + ">" + (f.required && v ? "" : '<option value="">' + (f.required ? "Choose" : "None") + "</option>") + f.values.map(function (x) { return '<option value="' + esc(x) + '"' + (v === x ? " selected" : "") + ">" + esc(enumLabel(f.key, x)) + "</option>"; }).join("") + "</select>" + errHtml(p) + "</div>";
        case "date": case "time":
          return '<div class="fld">' + lab(f, p) + '<input class="in" id="' + id + '" type="' + f.type + '" data-p="' + p + '" data-ty="' + f.type + '" value="' + esc(v || "") + '"' + inv(p) + ">" + errHtml(p) + "</div>";
        case "datetime":
          return '<div class="fld">' + lab(f, p) + '<input class="in" id="' + id + '" type="datetime-local" data-p="' + p + '" data-ty="datetime" value="' + esc(v ? String(v).replace(" ", "T").slice(0, 16) : "") + '"' + inv(p) + "><p class=\"hint\">Nepal time. Leave empty for no limit.</p>" + errHtml(p) + "</div>";
        case "bool":
          return '<div class="fld"><label class="ck" for="' + id + '"><input type="checkbox" id="' + id + '" data-p="' + p + '" data-ty="bool"' + (v ? " checked" : "") + "> " + esc(f.label || f.key) + "</label>" + errHtml(p) + "</div>";
        case "int": case "number":
          return '<div class="fld">' + lab(f, p) + '<input class="in" id="' + id + '" type="number" inputmode="' + (f.type === "int" ? "numeric" : "decimal") + '"' + (f.type === "number" ? ' step="any"' : ' step="1"') + (f.min != null ? ' min="' + f.min + '"' : "") + (f.max != null ? ' max="' + f.max + '"' : "") + ' data-p="' + p + '" data-ty="' + f.type + '" value="' + esc(v == null ? "" : v) + '"' + inv(p) + ">" + (f.key === "seat_limit" ? '<p class="hint">Leave empty for no limit.</p>' : "") + errHtml(p) + "</div>";
        case "media":
          return '<div class="fld"><span class="lb" id="' + id + '_l">' + esc(f.label || f.key) + (f.required ? " <em>Required</em>" : "") + "</span>" + mediaField(f, p, v) + errHtml(p) + "</div>";
        case "focal": {
          var mid = E.data.media_id;
          return '<div class="fld"><span class="lb">' + esc(f.label || "Focal point") + '</span><div data-focal="' + p + '">' + (mid ? '<p class="hint">Loading the picture</p>' : '<p class="hint">Choose a picture first, then click its most important part.</p>') + "</div>" + errHtml(p) + "</div>";
        }
        case "list": {
          var arr = Array.isArray(v) ? v : [], of = f.of || { type: "text" };
          return '<fieldset class="fset"><legend>' + esc(f.label || f.key) + "</legend>" + arr.map(function (x, i) {
            var ip = p + "." + i;
            return '<div class="lst-row">' + (of.type === "i18n" ? '<input class="in" aria-label="' + esc((of.label || "Item") + " " + (i + 1)) + '" data-p="' + ip + '" data-ty="i18n" value="' + esc(tr(x, E.lang)) + '" placeholder="' + esc(E.lang !== "en" && tr(x, "en") ? "English: " + tr(x, "en") : "") + '"' + inv(ip) + ">" :
              '<input class="in" aria-label="' + esc((of.label || "Item") + " " + (i + 1)) + '" type="' + (of.type === "phone" ? "tel" : "text") + '" data-p="' + ip + '" data-ty="' + of.type + '" value="' + esc(x == null ? "" : x) + '"' + inv(ip) + ">") +
              '<button type="button" class="btn quiet xs" data-ed="li-del" data-p="' + p + '" data-i="' + i + '">Remove</button></div>' + errHtml(ip);
          }).join("") + ((arr.length < (f.max_items || 50)) ? '<button type="button" class="btn soft xs" data-ed="li-add" data-p="' + p + '" data-of="' + esc(of.type) + '">Add ' + esc((of.label || "item").toLowerCase()) + "</button>" : "") + errHtml(p) + "</fieldset>";
        }
        case "object": {
          var o = v || {};
          return '<fieldset class="fset"><legend>' + esc(f.label || f.key) + '</legend><div class="sub ' + (f.fields.length > 2 ? "grid2" : "grid2") + '">' + f.fields.map(function (sf) { return field(sf, p + "." + sf.key, o[sf.key]); }).join("") + "</div>" + errHtml(p) + "</fieldset>";
        }
        case "blocks": return blocks(f, p, Array.isArray(v) ? v : []);
      }
      return "";
    }
    function left(f, val) { var mx = f.max || 0, n = (val || "").length; if (!mx || n < mx * 0.8) return ""; return '<p class="hint">' + (mx - n) + " characters left</p>"; }
    function mediaField(f, p, v) {
      var kind = f.kind || "image";
      return '<div class="mf" data-mf="' + p + '" data-kind="' + kind + '"><div class="mf-ph">' + (v ? "" : "None") + '</div><div class="mf-t">' + (v ? "<b>Loading</b>" : "<b>No file chosen</b><span>" + esc(kind === "video" ? "MP4 video" : kind === "image_or_video" ? "Image or MP4 video" : "JPG, PNG or WebP") + "</span>") + "</div>" +
        '<div class="mf-a"><button type="button" class="btn soft xs" data-ed="mf-pick" data-p="' + p + '" data-kind="' + kind + '" aria-describedby="' + fid(p) + '_l">' + (v ? "Change" : "Choose") + "</button>" + (v ? '<button type="button" class="btn quiet xs" data-ed="mf-edit" data-p="' + p + '">Alt text and focus</button>' + (f.required ? "" : '<button type="button" class="btn quiet xs" data-ed="mf-del" data-p="' + p + '">Remove</button>') : "") + "</div></div>";
    }
    function purpose() { return { banner: "banner", event: "event", post: "post", gallery: "gallery", video: "video", team: "team", university: "logo" }[t.type] || "other"; }
    function fillMedia() {
      $$("[data-mf]", el).forEach(function (box) {
        var id = getP(E.data, box.dataset.mf); if (!id) return;
        MP.get(id).then(function (m) {
          if (!m || !document.contains(box)) return; E.media[m.id] = m;
          $(".mf-ph", box).innerHTML = m.kind === "image" ? '<img src="' + esc(MP.src(m, 400)) + '" alt="" style="object-position:' + (m.focal.x * 100) + "% " + (m.focal.y * 100) + '%">' : m.kind === "video" ? '<video src="' + esc(m.src) + '#t=0.5" muted playsinline preload="metadata" aria-hidden="true"></video>' : "PDF";
          var alt = m.alt && (m.alt.en || (typeof m.alt === "string" ? m.alt : ""));
          $(".mf-t", box).innerHTML = "<b>" + esc(m.filename || "File") + "</b><span>" + esc(m.kind === "image" ? (alt ? "Alt text: " + alt : "No alt text yet") : m.kind) + "</span>";
        }, function () { $(".mf-t", box).innerHTML = "<b>File " + esc(id) + "</b><span>Could not load its details</span>"; });
      });
      $$("[data-focal]", el).forEach(function (box) {
        var mid = E.data.media_id; if (!mid) return;
        MP.get(mid).then(function (m) {
          if (!document.contains(box)) return;
          if (m.kind !== "image") { box.innerHTML = '<p class="hint">Videos fill the banner from the centre.</p>'; return; }
          MP.focal(box, m, getP(E.data, box.dataset.focal) || m.focal, function (v) { setP(E.data, box.dataset.focal, v); dirty(); heroPreview(); });
        });
      });
    }
    function heroPreview() {
      var box = $("#heroPv", el); if (!box) return; var d = E.data, l = E.lang;
      var head = trf(d.headline, l), acc = trf(d.accent, l), eb = trf(d.eyebrow, l), lead = trf(d.lead, l), cta = trf(d.cta_label, l), fo = d.focal || null;
      function text() { return '<div class="hp-in">' + (eb ? '<span class="hp-eb">' + esc(eb) + "</span>" : "") + "<h3>" + esc(head || "Headline") + (acc ? " <em>" + esc(acc) + "</em>" : "") + "</h3>" + (lead ? "<p>" + esc(lead) + "</p>" : "") + (cta ? '<span class="hp-cta">' + esc(cta) + "</span>" : "") + "</div>"; }
      if (!d.media_id) { box.innerHTML = '<span class="hp-none">Choose an image or video</span>' + text(); return; }
      MP.get(d.media_id).then(function (m) {
        var f = fo || m.focal || { x: 0.5, y: 0.5 }, pos = (f.x * 100) + "% " + (f.y * 100) + "%";
        box.innerHTML = (m.kind === "video" ? '<video src="' + esc(m.src) + '" muted autoplay loop playsinline aria-hidden="true" style="object-position:' + pos + '"></video>' : '<img src="' + esc(MP.src(m, 1200)) + '" alt="" style="object-position:' + pos + '">') + text();
        if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) { var vv = $("video", box); if (vv) vv.removeAttribute("autoplay"); }
      }, function () { box.innerHTML = text(); });
    }

    /* ---------- block editor (blog body) ---------- */
    /* BL (block labels) lives at module level: paint() runs before this point of editor() is reached */
    function blocks(f, p, arr) {
      var allowed = f.blocks || Object.keys(T.blocks);
      return '<fieldset class="fset"><legend>' + esc(f.label || "Body") + (f.required ? " (required)" : "") + '</legend><ol class="blks" data-p="' + p + '">' + arr.map(function (b, i) { return block(b, p + "." + i, i, arr.length); }).join("") + "</ol>" +
        '<div class="blk-add"><span>Add</span>' + allowed.map(function (k) { return '<button type="button" class="pill" data-ed="bl-add" data-p="' + p + '" data-v="' + k + '">' + esc(BL[k] || k) + "</button>"; }).join("") + "</div>" + errHtml(p) + "</fieldset>";
    }
    function block(b, p, i, n) {
      var h = '<li class="blk" data-i="' + i + '"><div class="blk-h"><button type="button" class="handle" aria-label="Reorder ' + esc(BL[b.t] || b.t) + " block " + (i + 1) + '" title="Drag to reorder">⠇</button><span class="stw">' + esc(BL[b.t] || b.t) + "</span>" +
        '<button type="button" class="btn quiet xs" data-ed="bl-up" data-p="' + p + '"' + (i === 0 ? " disabled" : "") + ">Up</button>" + '<button type="button" class="btn quiet xs" data-ed="bl-down" data-p="' + p + '"' + (i === n - 1 ? " disabled" : "") + ">Down</button>" +
        '<button type="button" class="btn quiet xs" data-ed="bl-del" data-p="' + p + '">Remove</button></div>';
      var fs = T.blocks[b.t] || [];
      if (b.t === "heading") h += input1(p + ".text", "i18n", "Heading", tr(b.text, E.lang), tr(b.text, "en"), "h");
      else if (b.t === "paragraph") h += input1(p + ".text", "i18n_text", "Paragraph", tr(b.text, E.lang), tr(b.text, "en"));
      else if (b.t === "quote") h += input1(p + ".text", "i18n_text", "Quote", tr(b.text, E.lang), tr(b.text, "en"), "q") + '<div class="fld"><label for="' + fid(p + ".cite") + '">Who said it</label><input class="in" id="' + fid(p + ".cite") + '" data-p="' + p + '.cite" data-ty="text" maxlength="120" value="' + esc(b.cite || "") + '"></div>';
      else if (b.t === "faq") h += input1(p + ".q", "i18n", "Question", tr(b.q, E.lang), tr(b.q, "en")) + input1(p + ".a", "i18n_text", "Answer", tr(b.a, E.lang), tr(b.a, "en"));
      else if (b.t === "list") {
        var items = Array.isArray(b.items) ? b.items : [];
        h += '<div class="fld"><label class="ck"><input type="checkbox" data-p="' + p + '.ordered" data-ty="bool"' + (b.ordered ? " checked" : "") + "> Numbered list</label></div>" + items.map(function (x, k) {
          return '<div class="lst-row"><input class="in" aria-label="List item ' + (k + 1) + '" data-p="' + p + ".items." + k + '" data-ty="i18n" maxlength="500" value="' + esc(tr(x, E.lang)) + '" placeholder="' + esc(E.lang !== "en" && tr(x, "en") ? "English: " + tr(x, "en") : "") + '"' + inv(p + ".items." + k) + '><button type="button" class="btn quiet xs" data-ed="li-del" data-p="' + p + '.items" data-i="' + k + '">Remove</button></div>' + errHtml(p + ".items." + k);
        }).join("") + '<button type="button" class="btn soft xs" data-ed="li-add" data-p="' + p + '.items" data-of="i18n">Add item</button>' + errHtml(p + ".items");
      } else if (b.t === "image") {
        var mf = fs.filter(function (x) { return x.key === "media_id"; })[0] || { key: "media_id", type: "media", kind: "image", required: true, label: "Image" };
        h += '<div class="fld"><span class="lb" id="' + fid(p + ".media_id") + '_l">Image <em>Required</em></span>' + mediaField(mf, p + ".media_id", b.media_id) + errHtml(p + ".media_id") + "</div>" + input1(p + ".caption", "i18n", "Caption", tr(b.caption, E.lang), tr(b.caption, "en")) + input1(p + ".alt", "i18n", "Alt text (what the picture shows)", tr(b.alt, E.lang), tr(b.alt, "en"));
      }
      return h + errHtml(p) + "</li>";
    }
    function input1(p, ty, label, val, en, cls) {
      var id = fid(p), ph = E.lang !== "en" && en ? "English: " + en : "";
      return '<div class="fld"><label for="' + id + '">' + esc(label) + "</label>" + (ty === "i18n" ? '<input class="in' + (cls ? " " + cls : "") + '" id="' + id + '" data-p="' + p + '" data-ty="i18n" value="' + esc(val) + '" placeholder="' + esc(ph) + '"' + inv(p) + ">" : '<textarea class="in' + (cls ? " " + cls : "") + '" id="' + id + '" data-p="' + p + '" data-ty="i18n_text" rows="' + (cls === "q" ? 2 : 4) + '" placeholder="' + esc(ph) + '"' + inv(p) + ">" + esc(val) + "</textarea>") + errHtml(p) + "</div>";
    }
    function blankBlock(k) { return k === "list" ? { t: k, items: [{}], ordered: false } : k === "quote" ? { t: k, text: {}, cite: "" } : k === "image" ? { t: k } : k === "faq" ? { t: k, q: {}, a: {} } : { t: k, text: {} }; }

    /* ---------- state ---------- */
    function dirty() { if (!E.dirty) { E.dirty = true; var s = $("#edState", el); if (s) s.textContent = stateText(); } }
    function readInput(inp) {
      var p = inp.dataset.p, ty = inp.dataset.ty, v;
      if (/^i18n/.test(ty)) { var o = getP(E.data, p); if (!o || typeof o !== "object") o = typeof o === "string" ? { en: o } : {}; o[E.lang] = inp.value; setP(E.data, p, o); }
      else if (ty === "bool") setP(E.data, p, inp.checked);
      else if (ty === "int" || ty === "number") { v = inp.value.trim(); setP(E.data, p, v === "" ? null : Number(v)); }
      else if (ty === "datetime") setP(E.data, p, inp.value ? inp.value.replace("T", " ").slice(0, 16) : null);
      else setP(E.data, p, inp.value === "" ? null : inp.value);
      if (E.errs[p] || Object.keys(E.errs).some(function (k) { return k.indexOf(p + ".") === 0; })) { Object.keys(E.errs).forEach(function (k) { if (k === p || k.indexOf(p + ".") === 0) delete E.errs[k]; }); var er = $('[data-e="' + p + '"]', el); if (er) er.hidden = true; inp.removeAttribute("aria-invalid"); }
      dirty();
    }
    /* the payload: every schema field (null when empty) so clearing a field clears it on the server */
    function cleanV(f, v) {
      if (v === undefined || v === null || v === "") return null;
      if (/^i18n/.test(f.type)) { if (typeof v === "string") v = { en: v }; var o = {}; LANGS.forEach(function (l) { var x = (v[l[0]] || "").trim(); if (x) o[l[0]] = x; }); return Object.keys(o).length ? o : null; }
      if (f.type === "list") { var a = (Array.isArray(v) ? v : []).map(function (x) { return cleanV(f.of || { type: "text" }, x); }).filter(function (x) { return x != null; }); return a; }
      if (f.type === "object") { var oo = {}, any = false; f.fields.forEach(function (sf) { var x = cleanV(sf, v[sf.key]); if (x != null) { oo[sf.key] = x; any = true; } }); return any ? oo : null; }
      if (f.type === "blocks") return (Array.isArray(v) ? v : []).map(function (b) { var out = { t: b.t }; (T.blocks[b.t] || []).forEach(function (sf) { var x = cleanV(sf, b[sf.key]); if (x != null) out[sf.key] = x; }); return out; });
      if (f.type === "text" || f.type === "url" || f.type === "email" || f.type === "phone") { var s = String(v).trim(); return s || null; }
      return v;
    }
    function payload() { var d = {}; t.fields.forEach(function (f) { d[f.key] = cleanV(f, E.data[f.key]); if (f.type === "bool") d[f.key] = !!E.data[f.key]; }); return d; }
    function showErrs(e) {
      E.errs = {}; Object.keys(e.details || {}).forEach(function (k) { E.errs[norm(k)] = e.details[k]; });
      var langs = {}; Object.keys(E.errs).forEach(function (k) { var m = k.match(/\.(en|ne|es|ko|zh)$/); if (m) langs[m[1]] = 1; });
      if (Object.keys(langs).length && !langs[E.lang]) E.lang = Object.keys(langs)[0];
      E.banner = e.message || "Please check the highlighted fields."; paint();
      var first = $('[aria-invalid="true"]', el) || $(".err:not([hidden])", el); if (first) { first.focus && first.focus(); first.scrollIntoView({ block: "center", behavior: "auto" }); }
    }
    function after(it, msg) {
      E.item = it; E.data = clone(it.data) || E.data; E.id = it.id; E.dirty = false; E.errs = {}; E.banner = ""; E.branch_id = it.branch_id;
      if (location.hash !== "#/website/" + t.type + "/" + it.id && !t.singleton) CM.replace("#/website/" + t.type + "/" + it.id);
      paint(); if (msg) CM.toast(msg);
    }
    function save(quiet) {
      var body = { data: payload() };
      if (t.branch_taggable) body.branch_id = E.branch_id || null;
      var p = E.id ? api.patch("/api/cms/items/" + E.id, body) : api.post("/api/cms/items", Object.assign({ type: t.type }, body));
      return p.then(function (it) { after(it, quiet ? null : "Draft saved. The website still shows the published version."); return it; }, function (e) {
        if (e.code === "validation" || e.status === 400) showErrs(e);
        else if (e.status === 409) { E.banner = e.message || "That already exists."; paint(); }
        else CM.toast(CM.msgOf(e), "error");
        throw e;
      });
    }
    function act(btn, fn) { CM.busy(btn, true); return fn().then(function (x) { CM.busy(btn, false); return x; }, function (e) { if (document.contains(btn)) CM.busy(btn, false); throw e; }); }
    function frozen(e) { if (e && (e.code === "cms_frozen" || e.status === 423)) { E.banner = "Publishing is paused for now (content freeze). Your draft is saved; publish when the freeze ends."; paint(); return true; } return false; }
    function publish(btn) {
      act(btn, function () {
        return (E.dirty || !E.id ? save(true) : Promise.resolve(E.item)).then(function (it) { return api.post("/api/cms/items/" + it.id + "/publish", {}); }).then(function (it) { after(it, "Published. It is on the website now."); });
      }).catch(function (e) { if (!frozen(e) && e && e.status && e.code !== "validation" && e.status !== 400 && e.status !== 409) CM.toast(CM.msgOf(e), "error"); });
    }
    function simple(btn, path, msg, confirmO) {
      function run() { return act(btn, function () { return api.post("/api/cms/items/" + E.id + "/" + path, {}).then(function (it) { after(it, msg); }); }).catch(function (e) { if (!frozen(e)) CM.toast(CM.msgOf(e), "error"); }); }
      if (!confirmO) { run(); return; }
      CM.dialog({ title: confirmO.title, lead: confirmO.lead, ok: confirmO.ok, danger: true, submit: function () { return api.post("/api/cms/items/" + E.id + "/" + path, {}).then(function (it) { after(it, msg); }, function (e) { if (frozen(e)) return; throw e; }); } });
    }
    function del() {
      CM.dialog({ title: "Delete for good?", lead: "This removes it and its history. It cannot be undone.", ok: "Delete", danger: true,
        submit: function () { return api.delete("/api/cms/items/" + E.id).then(function () { E.dirty = false; CM.clearGuard(); CM.toast("Deleted"); location.hash = "#/website/" + t.type; }); } });
    }
    function preview(btn) {
      act(btn, function () { return (E.dirty || !E.id ? save(true) : Promise.resolve(E.item)).then(function (it) { return api.get("/api/cms/preview/" + it.id, { lang: E.lang }); }); }).then(function (pv) {
        var url = location.origin + pv.url, exp = pv.expires_at ? new Date(pv.expires_at) : null;
        var D = CM.drawer({ eb: "Preview, " + LNAME[E.lang], title: title(), body: '<div class="pvw" id="pvw">' + render(pv.item) + "</div>" +
          '<section class="sec" style="margin-top:28px"><h2>Signed preview link</h2><p class="hint">Shows this draft, not the live website. It works for 15 minutes' + (exp ? ", until " + ("0" + exp.getHours()).slice(-2) + ":" + ("0" + exp.getMinutes()).slice(-2) : "") + '.</p><p style="overflow-wrap:anywhere;font-size:13.5px;margin:10px 0">' + esc(url) + '</p><div class="pg-a"><button type="button" class="btn soft sm" id="pvCopy">Copy link</button><a class="btn quiet sm" href="' + esc(pv.url) + '" target="_blank" rel="noopener">Open the preview data</a></div></section>',
          foot: '<button type="button" class="btn soft" data-act="drawer-x">Close</button><button type="button" class="btn" id="pvPub">Publish</button>' });
        $("#pvCopy", D.el).addEventListener("click", function () { (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { CM.toast("Preview link copied"); }, function () { CM.toast("Select the link and copy it"); }); });
        $("#pvPub", D.el).addEventListener("click", function () { D.close(); publish($("[data-ed=publish]", el)); });
      }, function (e) { if (e && e.status && e.code !== "validation" && e.status !== 400) CM.toast(CM.msgOf(e), "error"); });
    }
    function mediaSrc(m, w) { return m && typeof m === "object" ? MP.src(m, w || 1200) : ""; }
    function render(it) {
      it = it || {}; var x = function (v) { return esc(v == null ? "" : v); }, h = "";
      if (t.type === "banner") return '<div class="hero-pv" style="aspect-ratio:16/11">' + (it.media ? (it.media.kind === "video" ? '<video src="' + x(it.media.src) + '" muted playsinline autoplay loop></video>' : '<img src="' + x(mediaSrc(it.media)) + '" alt="">') : "") + '<div class="hp-in">' + (it.eyebrow ? '<span class="hp-eb">' + x(it.eyebrow) + "</span>" : "") + "<h3>" + x(it.headline) + (it.accent ? " <em>" + x(it.accent) + "</em>" : "") + "</h3>" + (it.lead ? "<p>" + x(it.lead) + "</p>" : "") + (it.cta_label ? '<span class="hp-cta">' + x(it.cta_label) + "</span>" : "") + "</div></div><p class=\"pv-cap\">Page: " + x(enumLabel("page", it.page)) + "</p>";
      if (t.type === "event") return (it.media ? '<img src="' + x(mediaSrc(it.media)) + '" alt="">' : "") + '<p class="meta">' + x(enumLabel("type", it.type)) + " · " + x(CM.date(it.date)) + (it.time_from ? ", " + x(it.time_from) + (it.time_to ? " to " + x(it.time_to) : "") : "") + (it.venue ? " · " + x(it.venue) : "") + (it.online ? " · Online" : "") + "</p><h1>" + x(it.title) + "</h1><p>" + x(it.summary) + "</p>" + (it.what ? "<h2>What happens</h2><p>" + x(it.what) + "</p>" : "") + (it.who ? "<h2>Who it is for</h2><p>" + x(it.who) + "</p>" : "") + (it.bring ? "<h2>What to bring</h2><p>" + x(it.bring) + "</p>" : "") + '<p class="meta">' + (it.registration_open ? "Registration open" + (it.seats_left != null ? ", " + it.seats_left + " seats left" : "") : "Registration closed") + "</p>";
      if (t.type === "post") return (it.cover ? '<img src="' + x(mediaSrc(it.cover)) + '" alt="">' : "") + '<p class="meta">' + x(it.category) + (it.author ? " · " + x(it.author) : "") + (it.reading_minutes ? " · " + it.reading_minutes + " min read" : "") + "</p><h1>" + x(it.title) + "</h1>" + (it.standfirst ? '<p style="font-size:18px">' + x(it.standfirst) + "</p>" : "") + (it.body || []).map(function (b) {
        if (b.t === "heading") return "<h2>" + x(b.text) + "</h2>"; if (b.t === "paragraph") return "<p>" + x(b.text) + "</p>"; if (b.t === "quote") return "<blockquote>" + x(b.text) + (b.cite ? '<br><small style="font:500 13px var(--sans)">' + x(b.cite) + "</small>" : "") + "</blockquote>";
        if (b.t === "list") return (b.ordered ? "<ol>" : "<ul>") + (b.items || []).map(function (i) { return "<li>" + x(i) + "</li>"; }).join("") + (b.ordered ? "</ol>" : "</ul>");
        if (b.t === "image") return (b.media ? '<img src="' + x(mediaSrc(b.media)) + '" alt="' + x(b.alt) + '">' : "") + (b.caption ? '<p class="meta">' + x(b.caption) + "</p>" : ""); if (b.t === "faq") return "<h2>" + x(b.q) + "</h2><p>" + x(b.a) + "</p>"; return "";
      }).join("");
      var med = it.media || it.photo || it.logo || it.poster;
      if (med && typeof med === "object") h += med.kind === "video" ? '<video src="' + x(med.src) + '" controls playsinline style="width:100%;border-radius:14px;margin-bottom:16px"></video>' : '<img src="' + x(mediaSrc(med)) + '" alt="">';
      var skip = { id: 1, type: 0, slug: 1, branch_id: 1, position: 1, published_at: 1, preview: 1, media: 1, photo: 1, logo: 1, poster: 1 };
      h += '<dl class="dl">' + t.fields.map(function (f) { var k = f.key.replace(/_media_id$/, "").replace(/^media_id$/, "media"); var v = it[f.key] != null ? it[f.key] : it[k]; if (skip[k] || v == null || v === "" || typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length) return ""; if (typeof v === "object" && !Array.isArray(v)) v = Object.keys(v).map(function (kk) { return kk + ": " + v[kk]; }).join(", "); if (Array.isArray(v)) v = v.join(", "); if (f.type === "enum") v = enumLabel(f.key, v); if (f.type === "bool") v = v ? "Yes" : "No"; return "<div><dt>" + x(f.label || f.key) + "</dt><dd>" + x(v) + "</dd></div>"; }).join("") + "</dl>";
      return h;
    }
    function showHistory(btn) {
      act(btn, function () { return api.get("/api/cms/items/" + E.id + "/revisions"); }).then(function (b) {
        var revs = b.items || [];
        var D = CM.drawer({ eb: "History", title: title(), body: '<p class="hint" style="margin:0 0 12px">Every save and publish is kept. Restoring copies that version into the draft; the website changes only when you publish.</p><ul class="revs">' + revs.map(function (r, i) {
          return "<li><div><b>" + esc(ACTION[r.action] || r.action) + (i === 0 ? ", latest" : "") + "</b><small>" + esc(CM.ts(r.created_at)) + (r.author_name ? ", " + esc(r.author_name) : "") + "</small>" + (r.title ? "<small>" + esc(r.title) + "</small>" : "") + "</div>" +
            '<div class="ra">' + (i === 0 ? "" : '<button type="button" class="btn soft xs" data-rev="' + r.id + '">Restore</button><button type="button" class="btn quiet xs" data-rev="' + r.id + '" data-pub="1">Restore and publish</button>') + "</div></li>";
        }).join("") + "</ul>" });
        D.el.addEventListener("click", function (e) {
          var rb = e.target.closest("[data-rev]"); if (!rb) return;
          function go() { CM.busy(rb, true); api.post("/api/cms/items/" + E.id + "/restore", { revision_id: +rb.dataset.rev, publish: !!rb.dataset.pub }).then(function (it) { D.close(); after(it, rb.dataset.pub ? "Version restored and published" : "Version restored into the draft"); }, function (x) { CM.busy(rb, false); if (!frozen(x)) CM.toast(CM.msgOf(x), "error"); else D.close(); }); }
          if (E.dirty) CM.dialog({ title: "Replace your unsaved changes?", lead: "Restoring replaces what you typed since the last save.", ok: "Restore", danger: true, submit: function () { go(); } }); else go();
        });
      }, function (e) { CM.toast(CM.msgOf(e), "error"); });
    }
    function regs(btn) {
      act(btn, function () { return api.get("/api/cms/events/" + E.id + "/registrations"); }).then(function (b) {
        var s = b.summary || {}, ev = b.event || {};
        var ST = [["registered", "Registered"], ["confirmed", "Confirmed"], ["attended", "Attended"], ["no_show", "Did not come"], ["cancelled", "Cancelled"]];
        var D = CM.drawer({ eb: "Registrations", title: ev.title || title(), body: '<p class="mute" style="margin:0 0 16px">' + esc((s.registrations || 0) + (s.registrations === 1 ? " registration, " : " registrations, ") + (s.people || 0) + (s.people === 1 ? " person" : " people") + (ev.seat_limit ? ". Seat limit " + ev.seat_limit + ", " + Math.max(0, ev.seat_limit - (s.people || 0)) + " seats left." : ". No seat limit.")) + "</p>" +
          ((b.items || []).length ? '<ul class="rows">' + b.items.map(function (r) {
            return '<li class="row nothumb"><div class="main-l"><b>' + esc(r.name) + (r.attendees > 1 ? ", " + r.attendees + " people" : "") + "</b><small>" + esc([r.phone, r.email].filter(Boolean).join(" · ")) + "</small><small>" + esc(CM.ts(r.created_at)) + (r.lead_id ? " · lead linked" : "") + "</small></div>" +
              '<div class="ra"><label><span class="cm-sr">Status for ' + esc(r.name) + '</span><select class="in" style="min-height:40px;width:auto" data-reg="' + r.id + '">' + ST.map(function (o) { return '<option value="' + o[0] + '"' + (r.status === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + '</select></label><button type="button" class="btn quiet xs" data-regfwd="' + r.id + '" data-name="' + esc(r.name) + '">Pass on</button></div></li>';
          }).join("") + "</ul>" : CM.empty("No registrations yet", "People register from the event page on the website.")) });
        D.el.addEventListener("change", function (e) { var sel = e.target.closest("[data-reg]"); if (!sel) return; api.patch("/api/event-registrations/" + sel.dataset.reg, { status: sel.value }).then(function () { CM.toast("Registration updated"); }, function (x) { CM.toast(CM.msgOf(x), "error"); }); });
        D.el.addEventListener("click", function (e) { var fb = e.target.closest("[data-regfwd]"); if (fb) CM.forwardItem("event_registration", +fb.dataset.regfwd, "Registration from " + fb.dataset.name); });
      }, function (e) { CM.toast(CM.msgOf(e), "error"); });
    }

    /* ---------- events (bound once per editor; el is replaced by the next view) ---------- */
    el.addEventListener("input", function (e) { var i = e.target.closest("[data-p]"); if (i && i.closest("#edForm")) { readInput(i); if (t.type === "banner") heroPreview(); if (i === e.target && /^(i18n)/.test(i.dataset.ty) && t.fields[0].key === i.dataset.p && E.lang === "en") { var h1 = $(".pg-h h1", el); if (h1) h1.textContent = title(); } } });
    el.addEventListener("change", function (e) {
      var i = e.target.closest("[data-p]"); if (i && i.closest("#edForm") && (i.type === "checkbox" || i.tagName === "SELECT" || i.type === "date" || i.type === "time" || i.type === "datetime-local")) { readInput(i); if (t.type === "banner") heroPreview(); }
      if (e.target.id === "edBranch") { E.branch_id = e.target.value ? +e.target.value : null; dirty(); }
    });
    el.addEventListener("submit", function (e) { e.preventDefault(); });
    el.addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); var b = $("[data-ed=save]", el); if (b) b.click(); } });
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ed]"); if (!b || b.disabled) return; var k = b.dataset.ed, p = b.dataset.p;
      if (k === "lang") { E.lang = b.dataset.v; paint(); var tb = $('[data-ed=lang][data-v="' + E.lang + '"]', el); if (tb) tb.focus(); return; }
      if (k === "save") { act(b, function () { return save(false); }).catch(function () { /* shown */ }); return; }
      if (k === "publish") { publish(b); return; }
      if (k === "preview") { preview(b); return; }
      if (k === "history") { showHistory(b); return; }
      if (k === "regs") { regs(b); return; }
      if (k === "unpublish") { simple(b, "unpublish", "Hidden from the website. It stays here as Hidden."); return; }
      if (k === "archive") { simple(b, "archive", "Archived. Find it under Archived.", { title: "Archive this?", lead: "It leaves the website and the lists. You can find it under Archived and restore it from History.", ok: "Archive" }); return; }
      if (k === "delete") { del(); return; }
      if (k === "li-add") { var arr = getP(E.data, p); if (!Array.isArray(arr)) { arr = []; setP(E.data, p, arr); } arr.push(b.dataset.of === "i18n" ? {} : ""); dirty(); paint(); var ins = $$('[data-p^="' + p + '."]', el).filter(function (x) { return x.tagName === "INPUT"; }); if (ins.length) ins[ins.length - 1].focus(); return; }
      if (k === "li-del") { getP(E.data, p).splice(+b.dataset.i, 1); dirty(); paint(); return; }
      if (k === "bl-add") { var a2 = getP(E.data, p) || []; a2.push(blankBlock(b.dataset.v)); setP(E.data, p, a2); dirty(); paint(); var last = $$(".blks .blk", el).pop(); if (last) { var fi = $("input:not([type=checkbox]),textarea", last) || $("button[data-ed=mf-pick]", last); if (fi) fi.focus(); last.scrollIntoView({ block: "center" }); } return; }
      if (k === "bl-del" || k === "bl-up" || k === "bl-down") {
        var ps = parts(p), i = ps.pop(), ap = ps.join("."), a3 = getP(E.data, ap);
        if (k === "bl-del") { var bb = a3[i], has = bb && Object.keys(bb).some(function (kk) { return kk !== "t" && bb[kk] && (typeof bb[kk] !== "object" || Object.keys(bb[kk]).length); }); function rm() { a3.splice(i, 1); dirty(); paint(); } if (has) CM.dialog({ title: "Remove this block?", lead: "Its text goes too. You can get it back from History after saving.", ok: "Remove", danger: true, submit: function () { rm(); } }); else rm(); return; }
        var to = k === "bl-up" ? i - 1 : i + 1; if (to < 0 || to >= a3.length) return; move(a3, i, to); dirty(); paint(); var nb = $$(".blks .blk", el)[to]; if (nb) { var bt = $("[data-ed=" + k + "]", nb); (bt && !bt.disabled ? bt : $(".handle", nb)).focus(); } return;
      }
      if (k === "mf-pick") { MP.open({ kind: b.dataset.kind || "image", purpose: purpose(), selected: getP(E.data, p) }).then(function (m) { if (!m) return; setP(E.data, p, m.id); E.media[m.id] = m; if (p === "media_id" && E.data.focal) { /* new picture: start from its own focus */ E.data.focal = m.focal; } dirty(); paint(); var nb2 = $('[data-ed=mf-pick][data-p="' + p + '"]', el); if (nb2) nb2.focus(); }); return; }
      if (k === "mf-del") { setP(E.data, p, null); dirty(); paint(); return; }
      if (k === "mf-edit") { MP.details(getP(E.data, p), {}).then(function (r) { if (r && r.deleted) { setP(E.data, p, null); dirty(); } paint(); }); return; }
    });
    return ready;
  }
})();
