/* Dolphin university partner portal (institution.html). Live against the API when it is reachable (own institution's applications, decisions,
   offer letters, courses, commission, messages); falls back to a sample preview only when there is no server (static hosting). */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var NS = window.NS;
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  function store(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function T(m) { if (window.DP) DP.toast(m); }
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var S = { in: store("in_in") === "1" };
  var NAV = [["apps", "Applications"], ["courses", "Courses and intakes"], ["comm", "Commission"], ["testi", "Testimonial"], ["msg", "Messages"]];

  /* ---------- live data (API) ---------- */
  var API = window.PortalAPI;
  var D = { live: false, api: false, inst: "University of Lancashire", init: "UL" };
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function dt(x) { if (!x) return ""; var d = new Date(String(x).replace(" ", "T") + "Z"); return isNaN(d) ? "" : d.getUTCDate() + " " + MONTHS[d.getUTCMonth()]; }
  function nameInit(n) { return String(n || "").replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(function (w) { return !/^(of|the|and|for|at|in)$/i.test(w); }).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase(); }
  var LABEL = { draft: ["Draft", "m"], submitted: ["Submitted", "m"], conditional: ["Conditional offer", "m"], unconditional: ["Offer issued", "a"], accepted: ["Accepted by student", "a"], rejected: ["Declined", "b"], withdrawn: ["Withdrawn", "b"] };
  function loadApps() {
    return API.get("/api/applications", { limit: 100 }).then(function (r) {
      apps = (r.items || []).map(function (a) {
        var l = LABEL[a.status] || [a.status, "m"];
        return { id: a.id, n: a.student_name, course: a.course, intake: a.intake || "To be confirmed", st: l[0], c: l[1], raw: a.status, date: dt(a.created_at), dest: a.destination, ref: a.student_ref || "", branch: a.branch_name || "", upd: dt(a.updated_at), docs: [], up: [] };
      });
      return apps;
    });
  }
  function loadCourses() {
    return API.get("/api/courses").then(function (r) {
      courses = (r.items || []).map(function (c) { return { id: c.id, n: c.name, lv: c.level, int: c.intakes, fee: c.fee, open: c.open }; });
    });
  }
  function liveStart(user) {
    D.live = true; D.api = true; D.user = user; D.inst = user.institution || user.name; D.init = nameInit(D.inst);
    msgs = [];
    return Promise.all([loadApps(), loadCourses(), loadComm()]);
  }
  function courseById(id) { return courses.filter(function (x) { return x.id == id; })[0]; }
  function saveCourse(c, patch, okMsg) {
    return API.patch("/api/courses/" + c.id, patch).then(function (r) { c.n = r.name; c.lv = r.level; c.int = r.intakes; c.fee = r.fee; c.open = r.open; if (okMsg) T(okMsg); return r; },
      function (er) { T(API.message(er)); return loadCourses().then(function () { if (cur === "courses") route(); }); });
  }

  /* ---------- sample data ---------- */
  var apps = [
    { id: 1, n: "Bibek Joshi", course: "BSc Computing", intake: "Jan 2027", st: "Conditional offer", c: "m", ielts: "6.5", date: "12 Oct", docs: ["Passport", "Transcripts", "IELTS", "Personal statement"], up: [] },
    { id: 2, n: "Kiran Thapa", course: "MSc International Business", intake: "Jan 2027", st: "Under review", c: "m", ielts: "7.0", date: "18 Oct", docs: ["Passport", "Transcripts", "IELTS", "References (2)"], up: [] },
    { id: 3, n: "Kiran Thapa", course: "MA Marketing Management", intake: "Jan 2027", st: "Needs documents", c: "b", ielts: "7.0", date: "18 Oct", docs: ["Passport", "Transcripts", "IELTS"], up: [] },
    { id: 4, n: "Rohan Basnet", course: "BA Business Management", intake: "Sep 2026", st: "CAS issued", c: "a", ielts: "6.0", date: "4 Jun", docs: ["Passport", "Transcripts", "IELTS", "Financial evidence"], up: [{ t: "CAS", f: "Basnet-CAS.pdf", d: "3 Aug" }] },
    { id: 5, n: "Maya Shrestha", course: "BSc Nursing Studies", intake: "May 2027", st: "Submitted", c: "m", ielts: "6.5", date: "26 Oct", docs: ["Passport", "Transcripts"], up: [] },
    { id: 6, n: "Sujal Adhikari", course: "MSc Data Analytics", intake: "Jan 2027", st: "Offer issued", c: "a", ielts: "6.5", date: "9 Oct", docs: ["Passport", "Transcripts", "IELTS", "CV"], up: [{ t: "Offer letter", f: "Adhikari-offer.pdf", d: "21 Oct" }] }
  ];
  var courses = [
    { id: 1, n: "BSc Computing", lv: "Undergraduate", int: ["Jan", "Sep"], fee: 15900, open: true },
    { id: 2, n: "BA Business Management", lv: "Undergraduate", int: ["Jan", "Sep"], fee: 15200, open: true },
    { id: 3, n: "BSc Nursing Studies", lv: "Undergraduate", int: ["May", "Sep"], fee: 16400, open: true },
    { id: 4, n: "MSc International Business", lv: "Postgraduate", int: ["Jan", "Sep"], fee: 17800, open: true },
    { id: 5, n: "MSc Data Analytics", lv: "Postgraduate", int: ["Jan"], fee: 18200, open: false }
  ];
  var comm = [
    { n: "Rohan Basnet", c: "BA Business Management", t: "Sep 2026", fee: 15200, rate: 12, rc: true },
    { n: "Aarti Lama", c: "MSc International Business", t: "Sep 2026", fee: 17800, rate: 12, rc: true },
    { n: "Pratik Rai", c: "BSc Computing", t: "Sep 2026", fee: 15900, rate: 12, rc: true },
    { n: "Sujal Adhikari", c: "MSc Data Analytics", t: "Jan 2027", fee: 18200, rate: 12, rc: false },
    { n: "Bibek Joshi", c: "BSc Computing", t: "Jan 2027", fee: 15900, rate: 12, rc: false }
  ];
  var msgs = [
    { me: false, w: "Dolphin admissions, 9:05", t: "Good morning. Two applications from Kiran Thapa are with you. May we have a decision on the MSc by 5 November?" },
    { me: true, w: "You, 9:30", t: "Yes, we will confirm by Friday." }
  ];
  var replies = ["Thank you, we have noted that and will tell the student today.", "Understood. Our visa team will plan the timeline around it.", "Received. Please upload the letter in the application and we will take it from there."];
  var rI = 0;
  var testi = null, consentName = "", logoName = "";
  var filt = { st: "All", q: "" };
  var gbp = function (n) { return "GBP " + Math.round(n).toLocaleString("en-US"); };

  function footer() {
    /* live (server reachable): a quiet footer with no prototype links or sample-data notes */
    if (D.api) return '<footer class="px-foot in-foot"><div><span>Dolphin Education, university partner portal</span><a href="site/index.html">Public website</a></div></footer>';
    return '<footer class="px-foot"><div><a href="' + NS.site + '">Public website</a><a href="admin.html">Head office</a><a href="staff.html">Staff</a><a href="portal.html">Student and parent</a><a href="institution.html">University</a><a href="blueprint.html">Blueprint</a><a href="' + NS.hub + '">Prototype home</a><span class="smp">Prototype with sample data. Institution names and applicants are sample data.</span></div></footer>'; }
  function themeBtn() { return NS.themeBtn("ns-login"); }
  function stw(t, c) { return '<span class="chip in-st' + (c === "b" ? " off" : "") + '">' + t + "</span>"; }
  function initials(n) { return String(n).trim().split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase(); }
  function countUp(scope) {
    $$("[data-count]", scope).forEach(function (el) {
      var to = +el.dataset.count, pre = el.dataset.pre || "";
      var fmt = function (v) { return pre + Math.round(v).toLocaleString("en-US"); };
      if (reduce) { el.textContent = fmt(to); return; }
      var t0 = null; el.textContent = fmt(0);
      (function f(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 200), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(to * e); if (p < 1) requestAnimationFrame(f); })(performance.now());
    });
  }
  var PH = "website/library/web/";
  function head(h, p, extra) { return '<header class="px-h in-ph"><div><h1>' + h + "</h1>" + (p ? "<p>" + p + "</p>" : "") + "</div>" + (extra ? '<div class="in-ph-a">' + extra + "</div>" : "") + "</header>"; }
  /* key figures: [label, value, note, countTo?, prefix?] */
  function figs(list) { return '<div class="in-figs">' + list.map(function (f) { return "<div><em>" + f[0] + "</em><b" + (f[3] != null ? ' data-count="' + f[3] + '"' + (f[4] ? ' data-pre="' + f[4] + '"' : "") : "") + ">" + f[1] + "</b><span>" + f[2] + "</span></div>"; }).join("") + "</div>"; }
  function emptyBox(text, act) { return '<div class="in-empty"><p>' + text + "</p>" + (act || "") + "</div>"; }

  /* ---------- shell ---------- */
  var app = function () { return $("#app"); };
  function renderLogin() {
    app().innerHTML =
      '<main class="px-login" id="main" tabindex="-1"><div class="l"><img class="ph" src="' + PH + 'library-trinity-college-long-room-04.webp" alt=""><img class="in-pill" src="site/img/logo.png" alt="Dolphin Education"><div><h1><span class="m"><span style="--d:.15s">Your students,</span></span><span class="m"><span style="--d:.3s">in good hands.</span></span></h1><p>Applications from Dolphin, offers and CAS letters, courses and commission statements, all in one place.</p></div><p class="small">' + (D.api ? "Only your own institution's applicants are shown." : "Prototype. Every name and amount on this site is sample data.") + '</p></div>' +
      '<div class="r"><div class="top">' + themeBtn() + '</div><div class="px-lcard"><div><p class="px-cap">University partner portal</p><h2>Sign in</h2></div>' +
      '<form class="px-f" id="loginF" novalidate style="max-width:none"><label class="px-fl"><span>Work email</span><input class="px-in" id="lEmail" type="email" autocomplete="username" inputmode="email" aria-describedby="lErr"></label><label class="px-fl"><span>Password</span><input class="px-in" id="lPass" type="password" autocomplete="current-password" aria-describedby="lErr"></label><p class="px-err" id="lErr" role="alert"></p><div class="px-act"><button class="btn go" type="submit" style="flex:1">Sign in</button></div></form>' +
      (D.api ? '<p class="px-hint" style="margin-top:1.2rem">Use the email and password Dolphin Education gave your admissions office.</p>' : '<div class="px-cred"><div><p class="px-cap">Sample sign-in</p><p style="margin:.3rem 0 0"><code>admissions@lancashire.example</code><br><code>sample-1234</code></p></div><button class="btn soft sm" type="button" data-act="fill">Fill these in for me</button></div>') + '</div></div></main>' + footer();
    $("#lEmail").focus({ preventScroll: true });
  }
  var SHORT = { apps: "Applications", courses: "Courses", comm: "Commission", testi: "Testimonial", msg: "Messages" };
  /* phone tab bar: three sections plus More (commission, testimonial, theme, sign out), so no label wraps */
  var TABS = ["apps", "courses", "msg"], MORE = ["comm", "testi"];
  function moreSheet() {
    NS.dialog("More", "University portal", '<div class="px-more">' + MORE.map(function (k) { return '<a href="#' + k + '" data-act="close">' + SHORT[k] + "</a>"; }).join("") + NS.themeRow("ns-row") + '</div><div class="px-act"><button class="btn ghost" data-act="out">Sign out</button></div>');
  }
  /* applications still waiting on the university's decision feed the alerts badge */
  function waiting() { return apps.filter(function (a) { return D.live ? a.raw === "submitted" : (a.st === "Submitted" || a.st === "Under review"); }).length; }
  function userMenu() {
    return NS.user({ name: D.inst, init: D.init, role: "Admissions office", sub: "Admissions office" + (D.live ? (D.user && D.user.email ? ", " + D.user.email : "") : ", sample data"),
      items: [{ t: "Profile", ns: "profile" }, { t: "Help", ns: "help" }, { theme: true, cls: "ns-ph" }].concat(D.api ? [] : [{ t: "All portals", href: NS.hub, hint: "Prototype hub" }]).concat([{ sep: true }, { t: "Sign out", act: "out", danger: true }]) });
  }
  NS.on("profile", function () {
    $("#dlg").className = "px-dlg";
    NS.dialog("Profile", "University partner", '<dl class="px-kv"><dt>Institution</dt><dd>' + esc(D.inst) + "</dd>" + (D.live && D.user && D.user.email ? "<dt>Email</dt><dd>" + esc(D.user.email) + "</dd>" : "") + '<dt>Team</dt><dd>Admissions office</dd><dt>Partner office</dt><dd>Dolphin Education, New Baneshwor, Kathmandu</dd></dl><p class="px-hint">' + (D.live ? "To change the email or password, message Dolphin admissions." : "Sample institution. Nothing here is real.") + '</p><div class="px-act"><a class="btn ghost" href="#msg" data-act="close">Message Dolphin</a><button class="btn" data-act="close">Done</button></div>');
  });
  NS.on("help", function () {
    $("#dlg").className = "px-dlg";
    NS.dialog("Help", "University portal", '<dl class="px-kv"><dt>Applications</dt><dd>Open one to record a decision and add offer or CAS letters</dd><dt>Alerts</dt><dd>Applications still waiting on your decision</dd><dt>Questions</dt><dd>Message Dolphin admissions from Messages</dd><dt>Close a window</dt><dd>Escape</dd></dl><div class="px-act"><a class="btn ghost" href="#msg" data-act="close">Message Dolphin</a><button class="btn" data-act="close">Done</button></div>');
  });
  function renderShell() {
    app().innerHTML =
      '<header class="px-head ns-px"><div class="px-bar"><a class="px-logo" href="#apps" aria-label="Dolphin Education, applications"><img class="lg-l" src="site/img/logo.png" alt="Dolphin Education"><img class="lg-d" src="site/img/logo-light.png" alt=""><small>University portal</small></a>' +
      '<nav class="px-nav" id="nav" aria-label="Portal sections">' + NAV.map(function (n) { return '<a href="#' + n[0] + '" data-k="' + n[0] + '"' + (MORE.indexOf(n[0]) >= 0 ? ' class="ns-x"' : "") + ">" + n[1] + "</a>"; }).join("") + '<button type="button" class="ns-navmore" data-act="more" aria-haspopup="dialog">More</button></nav>' +
      '<div class="px-tools ns-tools">' + NS.alerts({ href: "#apps", id: "bell", count: waiting(), label: "Applications waiting on your decision" }) + NS.themeBtn("ns-dt") + userMenu() + '</div></div></header>' +
      '<main class="px-main" id="main" tabindex="-1"><div id="view" class="px-view"></div></main>' + footer() +
      '<nav class="px-tabbar" id="tabbar" aria-label="Quick tabs">' + TABS.map(function (k) { return '<a href="#' + k + '" data-k="' + k + '">' + SHORT[k] + "</a>"; }).join("") + '<button type="button" id="moreBtn" data-act="more" aria-haspopup="dialog">More</button></nav>' +
      '<dialog class="px-dlg" id="dlg" aria-labelledby="dlgT"></dialog><div class="px-undo" id="undo" role="status"><span id="undoT"></span><button type="button" data-act="undo">Undo</button></div>';
  }
  var cur = "apps";
  function route() {
    if (!S.in) return;
    var k = (location.hash || "#apps").slice(1); if (!NAV.some(function (n) { return n[0] === k; })) k = "apps"; cur = k;
    $$("#nav a,#tabbar a").forEach(function (a) { if (a.dataset.k === k) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    var cu = $('#nav a[aria-current="page"]'); if (cu && cu.scrollIntoView) cu.scrollIntoView({ inline: "nearest", block: "nearest", behavior: reduce ? "auto" : "smooth" });
    var v = $("#view"); v.className = ""; void v.offsetWidth; v.className = "px-view"; v.innerHTML = V[k]();
    document.title = NAV.filter(function (n) { return n[0] === k; })[0][1] + " · Dolphin University Portal";
    countUp(v); if (AFTER[k]) AFTER[k]();
    var bb = $("#bell .ns-badge"); if (bb) bb.textContent = waiting() || "";
    $$("#moreBtn,.ns-navmore").forEach(function (mb) { if (MORE.indexOf(k) >= 0) mb.setAttribute("aria-current", "page"); else mb.removeAttribute("aria-current"); });
  }
  window.addEventListener("hashchange", function () { route(); window.scrollTo(0, 0); if (S.in) $("#main").focus({ preventScroll: true }); });
  var V = {}, AFTER = {};

  /* ---------- applications ---------- */
  var STS_SAMPLE = ["All", "Submitted", "Under review", "Needs documents", "Conditional offer", "Offer issued", "CAS issued"], STS_LIVE = ["All", "Submitted", "Conditional offer", "Offer issued", "Accepted by student", "Declined"];
  function STSL() { return D.live ? STS_LIVE : STS_SAMPLE; }
  function appRows() {
    var rows = apps.filter(function (a) { return (filt.st === "All" || a.st === filt.st) && (!filt.q || (a.n + " " + a.course + " " + (a.ref || "")).toLowerCase().indexOf(filt.q.toLowerCase()) >= 0); });
    if (!rows.length) return apps.length ? emptyBox("No application matches this status or search.", '<button class="btn soft sm" data-act="fst" data-v="All">Show all applications</button>')
      : emptyBox("No applications from Dolphin yet. They appear here as soon as Dolphin submits a student to " + esc(D.inst) + ".", '<a class="btn soft sm" href="#msg">Message Dolphin</a>');
    return '<div class="in-tw"><table class="in-t in-at"><thead><tr><th>Student</th><th>Course and intake</th><th>Received</th><th>Status</th><th><span class="sr">Action</span></th></tr></thead><tbody>' + rows.map(function (a) {
      var sub = D.live ? [a.ref, a.dest].filter(Boolean).join(" · ") : "IELTS " + a.ielts + " · " + a.docs.length + " documents";
      return '<tr><td class="who"><b>' + esc(a.n) + "</b><small>" + esc(sub) + '</small></td><td class="crs"><b>' + esc(a.course) + "</b><small>" + esc(a.intake) + '</small></td><td class="rcv" data-l="Received">' + esc(a.date) + '</td><td class="st" data-l="Status">' + stw(a.st, a.c) + '</td><td class="act"><button class="btn soft sm" data-act="open" data-id="' + a.id + '" aria-label="Review the application of ' + esc(a.n) + ", " + esc(a.course) + '">Review</button></td></tr>';
    }).join("") + "</tbody></table></div>";
  }
  V.apps = function () {
    var need = apps.filter(function (a) { return D.live ? a.raw === "submitted" : a.st === "Needs documents"; }).length, off = apps.filter(function (a) { return /offer|CAS|Accepted/i.test(a.st); }).length;
    var next = apps.filter(function (a) { return D.live ? a.raw === "submitted" : a.st === "Submitted"; })[0];
    return head("Applications from Dolphin", "Students Dolphin Education has put forward to " + esc(D.inst) + ".", next ? '<button class="btn" data-act="next" data-id="' + next.id + '">Review the next one</button>' : '<a class="btn soft" href="#msg">Message Dolphin</a>') +
      figs([[D.live ? "Waiting for your decision" : "Waiting on documents", need, need ? (D.live ? "submitted, no decision yet" : "students being chased") : "nothing waiting", need],
        [D.live ? "Offers made" : "Offers and CAS", off, "conditional, unconditional or accepted", off], ["All applications", apps.length, "from Dolphin Education", apps.length]]) +
      '<section class="in-sec"><div class="in-tools"><div class="px-seg in-seg" role="group" aria-label="Filter by status" id="stSeg">' + STSL().map(function (s) { var n = s === "All" ? apps.length : apps.filter(function (a) { return a.st === s; }).length; return '<button class="pill" data-act="fst" data-v="' + s + '" aria-pressed="' + (filt.st === s) + '">' + s + "<small>" + n + "</small></button>"; }).join("") +
      '</div><label class="px-fl in-search"><span class="sr">Search</span><input class="px-in" id="fq" type="search" placeholder="Search name, ref or course" value="' + esc(filt.q) + '"></label></div><div id="appTbl" aria-live="polite">' + appRows() + "</div></section>";
  };
  function refreshApps() { var t = $("#appTbl"); if (t && cur === "apps") { t.innerHTML = appRows();  } }
  var DT = ["Offer letter", "CAS", "I-20", "COE", "LOA"];
  var upDoc = "CAS";
  function liveDialog(a) {
    var d = $("#dlg"); d.dataset.app = a.id; upDoc = "Offer letter";
    var can = a.raw === "submitted" || a.raw === "conditional" || a.raw === "unconditional" || a.raw === "rejected" || a.raw === "draft";
    d.className = "px-dlg in-review";
    d.innerHTML = '<div class="px-dh in-rh"><div><p class="px-cap">Application ' + String(a.id).padStart(4, "0") + " · received " + esc(a.date) + '</p><h2 id="dlgT">' + esc(a.n) + '</h2><p class="in-rsub">' + esc(a.course) + " · " + esc(a.intake) + '</p></div><button class="btn quiet sm" data-act="close" aria-label="Close">Close</button></div>' +
      '<dl class="in-facts"><div><dt>Status</dt><dd id="aSt">' + stw(a.st, a.c) + '</dd></div><div><dt>Student ref</dt><dd>' + esc(a.ref || "Not given") + "</dd></div><div><dt>Destination</dt><dd>" + esc(a.dest || "Not given") + "</dd></div><div><dt>Intake</dt><dd>" + esc(a.intake) + "</dd></div><div><dt>Sent by</dt><dd>Dolphin Education" + (a.branch ? ", " + esc(a.branch) : "") + "</dd></div>" + (a.upd && a.upd !== a.date ? "<div><dt>Last change</dt><dd>" + esc(a.upd) + "</dd></div>" : "") + "</dl>" +
      '<section class="in-rs"><h3>Your decision</h3>' + (can ? '<p>Dolphin and the student see it at once.</p><div class="in-dec" id="decBtns">' + decBtns(a) + '</div><p class="px-err" id="decE" role="alert"></p>' : "<p>Closed to decisions: the student has already " + (a.raw === "accepted" ? "accepted" : "withdrawn from") + " it.</p>") + "</section>" +
      '<section class="in-rs"><h3>Offer letters</h3><p>PDF up to 10 MB. The student can download it straight away.</p><div class="in-types" role="group" aria-label="Letter type">' + DT.map(function (t) { return '<button class="pill" data-act="ltype" data-v="' + t + '" aria-pressed="' + (t === upDoc) + '">' + t + "</button>"; }).join("") + "</div>" +
      '<label class="in-upl"><span class="in-upl-t">Add the <i id="dtn">' + upDoc + '</i></span><span class="btn soft sm">Choose PDF</span><input type="file" id="ltIn" accept="application/pdf,.pdf" aria-label="Choose a PDF letter"></label><p class="px-err" id="ltE" role="alert"></p><ul class="in-letters" id="upList" aria-live="polite"><li class="none">Loading letters</li></ul></section>' +
      '<div class="px-act"><button class="btn" data-act="close">Done</button></div>';
    if (d.showModal) d.showModal(); else d.setAttribute("open", ""); $("h2", d).setAttribute("tabindex", "-1"); $("h2", d).focus();
    refreshLetters(a);
  }
  /* decision buttons: the decision already recorded shows as pressed (and cannot be sent again) */
  var DEC = [["conditional", "Conditional offer"], ["unconditional", "Unconditional offer"], ["rejected", "Decline"]];
  function decBtns(a) {
    return DEC.map(function (d, i) { var on = a.raw === d[0]; return '<button class="btn sm ' + (on ? "in-on" : i === 0 && a.raw === "submitted" ? "go" : "soft") + '" data-act="decide" data-v="' + d[0] + '" aria-pressed="' + on + '"' + (on ? " disabled" : "") + ">" + d[1] + "</button>"; }).join("");
  }
  function refreshLetters(a) {
    API.get("/api/applications/" + a.id + "/letters").then(function (r) {
      var l = $("#upList"); if (!l || $("#dlg").dataset.app != a.id) return;
      l.innerHTML = r.items.length ? r.items.map(function (x) { return '<li><b class="k">' + esc(x.kind) + '</b><a href="/api/letters/' + x.id + '/file" download>' + esc(x.filename) + '</a><span class="d">' + esc(dt(x.created_at)) + "</span></li>"; }).join("") : '<li class="none">No letters yet. Add the offer letter once you have decided.</li>';
    }, function () {});
  }
  function openApp(a) {
    if (D.live) return liveDialog(a);
    var d = $("#dlg"); d.dataset.app = a.id; d.className = "px-dlg";
    d.innerHTML = '<div class="px-dh"><div><p class="px-cap">Application ' + String(a.id).padStart(4, "0") + '</p><h2 id="dlgT">' + esc(a.n) + '</h2><p class="mute" style="margin:.2rem 0 0">' + esc(a.course) + " · " + a.intake + '</p></div><button class="btn quiet xs" data-act="close" aria-label="Close">Close</button></div>' +
      '<dl class="px-kv"><dt>Status</dt><dd id="aSt">' + stw(a.st, a.c) + '</dd><dt>English</dt><dd>IELTS overall ' + a.ielts + '</dd><dt>Received</dt><dd>' + a.date + ' 2026 from Ramesh Karki, Baneshwor</dd><dt>Documents</dt><dd>' + a.docs.map(esc).join(", ") + '</dd></dl>' +
      '<p class="px-cap" style="margin-top:1.4rem">Upload to this application</p><div class="in-types" role="group" aria-label="Document type">' + DT.map(function (t) { return '<button class="pill" data-act="dtype" data-v="' + t + '" aria-pressed="' + (t === upDoc) + '">' + t + "</button>"; }).join("") + '</div>' +
      '<label class="px-drop" style="margin-top:.4rem"><b>Add <span id="dtn">' + upDoc + '</span></b><span>PDF up to 10 MB. Sample: nothing is uploaded.</span><span class="btn soft sm">Choose file</span><input type="file" id="upIn" aria-label="Choose a file to upload"></label><ul class="in-up" id="upList" aria-live="polite">' + upHtml(a) + '</ul><div class="px-act"><button class="btn" data-act="close">Done</button></div>';
    if (d.showModal) d.showModal(); else d.setAttribute("open", ""); $("h2", d).setAttribute("tabindex", "-1"); $("h2", d).focus();
  }
  function upHtml(a) {
    if (!a.up.length) return '<li><span class="mute">Nothing uploaded yet.</span></li>';
    return a.up.map(function (u) { return "<li><span><b>" + esc(u.t) + "</b> · " + esc(u.f) + '</span><span class="mute">' + (u.p != null ? Math.round(u.p) + "%" : u.d) + "</span>" + (u.p != null ? '<div class="px-prog"><i style="--v:' + u.p / 100 + '"></i></div>' : "") + "</li>"; }).join("");
  }
  function doUpload(a, file) {
    var u = { t: upDoc, f: file || (upDoc.toLowerCase().replace(/ /g, "-") + "-" + a.n.split(" ")[1] + ".pdf"), p: 0 }; a.up.unshift(u);
    var iv = setInterval(function () {
      u.p = reduce ? 100 : Math.min(100, u.p + 7 + Math.random() * 15);
      var l = $("#upList"); if (l && $("#dlg").dataset.app == a.id) l.innerHTML = upHtml(a);
      if (u.p >= 100) {
        clearInterval(iv); delete u.p; u.d = "27 Oct";
        var map = { "Offer letter": ["Offer issued", "a"], CAS: ["CAS issued", "a"] }; if (map[u.t]) { a.st = map[u.t][0]; a.c = map[u.t][1]; }
        var l2 = $("#upList"); if (l2 && $("#dlg").dataset.app == a.id) { l2.innerHTML = upHtml(a); $("#aSt").innerHTML = stw(a.st, a.c); }
        T(u.t + " sent to Dolphin and " + a.n.split(" ")[0] + ".");
        if (cur === "apps") refreshApps();
      }
    }, 150);
  }

  /* ---------- courses ---------- */
  var removed = null;
  function courseRows() {
    return '<div class="in-crow in-chead" aria-hidden="true"><span>Course</span><span>Level</span><span>Fee per year</span><span>Intakes</span><span>Applications</span><span></span></div>' + courses.map(function (c) {
      return '<div class="in-crow" data-id="' + c.id + '"><textarea class="px-in in-name" rows="1" data-f="n" aria-label="Course name">' + esc(c.n) + "</textarea>" +
        '<label class="in-cf"><span class="in-cl">Level</span><select class="px-in" data-f="lv" aria-label="Level"><option' + (c.lv === "Undergraduate" ? " selected" : "") + '>Undergraduate</option><option' + (c.lv === "Postgraduate" ? " selected" : "") + ">Postgraduate</option></select></label>" +
        '<label class="in-cf in-fee"><span class="in-cl">Fee per year</span><span class="in-cur" aria-hidden="true">GBP</span><input class="px-in" inputmode="numeric" value="' + c.fee + '" data-f="fee" aria-label="Annual fee in pounds"></label>' +
        '<div class="in-cf"><span class="in-cl">Intakes</span><div class="in-int" role="group" aria-label="Intakes">' + ["Jan", "May", "Sep"].map(function (m) { return '<button type="button" class="pill" data-act="intake" data-m="' + m + '" aria-pressed="' + (c.int.indexOf(m) >= 0) + '">' + m + "</button>"; }).join("") + "</div></div>" +
        '<div class="in-cf in-open"><span class="in-cl">Applications</span><span class="sws"><button class="sw" data-act="open_c" aria-pressed="' + c.open + '" aria-label="' + (c.open ? "Open for applications" : "Closed") + '"></button><span class="in-ol">' + (c.open ? "Open" : "Closed") + "</span></span></div>" +
        '<button class="btn quiet sm in-rm" data-act="rmc" aria-label="Remove ' + esc(c.n) + '">Remove</button></div>';
    }).join("");
  }
  V.courses = function () {
    return head("Courses and intakes", "The courses Dolphin may apply to, with fees and intakes." + (D.live ? " Changes save as you make them." : ""), '<button class="btn" data-act="addc">Add a course</button>') +
      (courses.length ? '<div class="in-clist" id="cBody">' + courseRows() + "</div>" : emptyBox("No courses listed yet. Add the courses Dolphin may apply to, with their fees and intakes, so counsellors match students to them.", '<button class="btn soft sm" data-act="addc">Add a course</button>'));
  };
  function addCourseDlg() {
    NS.dialog("Add a course", "Courses and intakes", '<form class="px-f in-form" id="addC" novalidate><label class="px-fl"><span>Course name</span><input class="px-in" id="acN" autocomplete="off" aria-describedby="acE" placeholder="MSc International Business"></label>' +
      '<div class="in-g2"><label class="px-fl"><span>Level</span><select class="px-in" id="acL"><option>Undergraduate</option><option>Postgraduate</option></select></label><label class="px-fl"><span>Fee per year, GBP</span><input class="px-in" id="acF" inputmode="numeric" aria-describedby="acE"></label></div>' +
      '<div class="px-fl"><span>Intakes</span><div class="in-int" role="group" aria-label="Intakes" id="acI">' + ["Jan", "May", "Sep"].map(function (m) { return '<button type="button" class="pill" data-act="acint" data-m="' + m + '" aria-pressed="' + (m === "Sep") + '">' + m + "</button>"; }).join("") + "</div></div>" +
      '<p class="px-err" id="acE" role="alert"></p><div class="px-act"><button class="btn" type="submit">Add course</button><button class="btn soft" type="button" data-act="close">Cancel</button></div></form>');
    var d = $("#dlg"); d.className = "px-dlg in-small"; setTimeout(function () { var n = $("#acN"); if (n) n.focus(); }, 30);
  }
  function showUndo(msg) { var u = $("#undo"); $("#undoT").textContent = msg; u.classList.add("on"); clearTimeout(showUndo.h); showUndo.h = setTimeout(function () { u.classList.remove("on"); removed = null; }, 6000); }

  /* ---------- commission ---------- */
  function cm(x) { var e = x.fee * x.rate / 100; return [e, x.rc ? e : 0]; }
  var commData = null;
  function loadComm() { return API.get("/api/commission").then(function (r) { commData = r; return r; }, function () { commData = { items: [], summary: { expected: 0, received: 0, outstanding: 0, count: 0, currency: "GBP" } }; }); }
  function commLive() {
    var d = commData || { items: [], summary: { expected: 0, received: 0, outstanding: 0, count: 0, currency: "GBP" } }, sm = d.summary, cur = sm.currency || "GBP", f = function (n) { return n == null ? "Not listed" : cur + " " + Math.round(n).toLocaleString("en-US"); };
    var unconf = d.items.some(function (i) { return !i.rate_confirmed; });
    return head("Commission statements", "What Dolphin Education owes you for students who accepted an offer: the agreed rate times first-year tuition.", d.items.length ? '<button class="btn" data-act="dls">Download statement</button>' : "") +
      (d.items.length ? figs([["Expected", f(sm.expected), "across " + sm.count + (sm.count === 1 ? " student" : " students")], ["Received", f(sm.received), "paid by Dolphin"], ["Outstanding", f(sm.outstanding), "still to come"]]) +
        (unconf ? '<p class="in-note">Dolphin head office has not confirmed the agreed rate yet, so these figures may still change.</p>' : "") +
        '<section class="in-sec"><h2 class="in-h2">By student</h2><div class="in-tw"><table class="in-t in-ct"><thead><tr><th>Student</th><th>Course</th><th>Intake</th><th class="n">Tuition</th><th class="n">Rate</th><th class="n">Expected</th><th class="n">Received</th><th>Status</th></tr></thead><tbody>' + d.items.map(function (x) {
          return "<tr><td><b>" + esc(x.student_name) + "</b></td><td>" + esc(x.course) + "</td><td class=\"nw\">" + esc(x.intake || "") + '</td><td class="n">' + f(x.tuition) + '</td><td class="n">' + x.rate_pct + "%" + (x.rate_confirmed ? "" : '<small>unconfirmed</small>') + '</td><td class="n">' + f(x.expected) + '</td><td class="n">' + (x.received ? f(x.received) : "None yet") + "</td><td>" + (x.status === "received" ? stw("Paid", "a") : x.status === "no_tuition" ? stw("Add tuition", "b") : stw("Awaiting", "m")) + "</td></tr>";
        }).join("") + "</tbody></table></div>" + (d.items.some(function (x) { return x.status === "no_tuition"; }) ? '<p class="in-note">Some courses are missing from your course list, so their tuition is not known. Add them under Courses and intakes.</p>' : "") + "</section>"
        : emptyBox("No commission yet. It appears here once a student you received accepts an offer.", '<a class="btn soft sm" href="#apps">See applications</a>'));
  }
  V.comm = function () {
    if (D.live) return commLive();
    var ex = 0, rc = 0; comm.forEach(function (x) { var c = cm(x); ex += c[0]; rc += c[1]; });
    return head("Commission statements", "Autumn 2026 and January 2027 intakes. Rates follow your agreement with Dolphin (sample: 12 percent of first-year tuition).", '<button class="btn go" data-act="dls">Download statement</button>') +
      '<div class="px-kband"><div><em>Expected</em><b data-count="' + Math.round(ex) + '" data-pre="GBP ">' + gbp(ex) + '</b><span>across ' + comm.length + ' students</span></div><div><em>Received</em><b data-count="' + Math.round(rc) + '" data-pre="GBP ">' + gbp(rc) + '</b><span>paid by Dolphin</span></div><div><em>Outstanding</em><b data-count="' + Math.round(ex - rc) + '" data-pre="GBP ">' + gbp(ex - rc) + '</b><span>due after tuition is paid</span></div></div>' +
      '<div class="px-card px-sec"><h2>Expected against received</h2><div class="in-bar"><span>Expected</span><i data-w="100"></i><b>' + gbp(ex) + '</b></div><div class="in-bar r"><span>Received</span><i data-w="' + Math.round(rc / ex * 100) + '"></i><b>' + gbp(rc) + '</b></div></div>' +
      '<div class="px-card flush px-sec"><h2 style="padding:1.3rem 1.5rem 0;margin:0">By student</h2><div class="px-tw"><table class="px-t stack"><thead><tr><th>Student</th><th>Course</th><th>Term</th><th class="n">Tuition</th><th class="n">Expected</th><th class="n">Received</th><th>Status</th></tr></thead><tbody>' + comm.map(function (x) {
        var c = cm(x); return "<tr><td><b>" + esc(x.n) + '</b></td><td data-l="Course">' + esc(x.c) + '</td><td data-l="Term">' + x.t + '</td><td class="n" data-l="Tuition">' + gbp(x.fee) + '</td><td class="n" data-l="Expected">' + gbp(c[0]) + '</td><td class="n" data-l="Received">' + (c[1] ? gbp(c[1]) : "None yet") + '</td><td data-l="Status">' + (x.rc ? stw("Paid", "a") : stw("Awaiting", "m")) + "</td></tr>";
      }).join("") + "</tbody></table></div></div>";
  };
  AFTER.comm = function () { if (D.live) { loadComm().then(function () { if (cur === "comm") { var v = $("#view"); if (v) v.innerHTML = commLive(); } }); return; }  $$(".in-bar i").forEach(function (i) { var go = function () { i.style.transform = "scaleX(" + i.dataset.w / 100 + ")"; }; if (reduce) go(); else requestAnimationFrame(function () { requestAnimationFrame(go); }); }); };

  /* ---------- testimonial ---------- */
  V.testi = function () {
    if (testi) return head("Thank you", "Your testimonial is with Dolphin Education. Nothing is published until they approve it.") + '<section class="px-card flush px-stg"><div class="px-q"><span class="av">Q</span><div><h4>“' + esc(testi.q) + '”</h4><p>' + esc(testi.s) + ", " + esc(testi.r) + ', ' + esc(D.inst) + '</p></div><div class="acts"><span class="chip">Awaiting approval</span></div></div><div class="px-q"><span class="av o">C</span><div><h4>Signed consent</h4><p>' + esc(testi.c) + '</p></div><div class="acts">' + (D.live ? '<span class="chip">To follow</span>' : '<span class="chip good">Received</span>') + '</div></div></section><p class="px-hint" style="margin-top:1.4rem">Nothing is published until Dolphin approves it and the signed consent is on file.</p>';
    return head("Testimonial for Dolphin", "A few words about working with Dolphin Education. It may appear on the Dolphin website.") +
      '<div class="px-card" style="max-width:44rem"><form class="px-f" id="tForm" novalidate style="max-width:none"><label class="px-fl"><span>Quote</span><textarea class="px-in" id="tQ" maxlength="320" aria-describedby="tErr"></textarea><span id="tCnt" style="margin-top:.4rem;font-weight:400;letter-spacing:0;text-transform:none">0 of 320</span></label>' +
      '<div class="in-g2"><label class="px-fl"><span>Signatory</span><input class="px-in" id="tS" autocomplete="name" aria-describedby="tErr"></label><label class="px-fl"><span>Role</span><input class="px-in" id="tR" placeholder="Admissions Manager" aria-describedby="tErr"></label></div>' +
      (D.live ? '<label class="in-chk"><input type="checkbox" id="tC" aria-describedby="tErr"><span>The signatory agrees that Dolphin Education may publish this quote with their name, role and institution. Dolphin asks for the signed consent form by email before anything goes live.</span></label>' :
      '<label class="px-drop" style="margin:0"><b id="lgN">Institution logo (optional)</b><span>PNG or SVG. Placeholder: nothing is uploaded.</span><span class="btn soft sm">Choose logo</span><input type="file" id="lgF" accept="image/*"></label>' +
      '<label class="px-drop" style="margin:0"><b id="cN">Signed consent form (required)</b><span>Signed PDF from your institution. Dolphin cannot publish without it.</span><span class="btn soft sm">Choose file</span><input type="file" id="cF" accept=".pdf,image/*" aria-describedby="tErr"></label>') +
      '<p class="px-err" id="tErr" role="alert"></p><div class="px-act"><button class="btn go" type="submit">Submit for approval</button></div></form></div>';
  };

  /* ---------- messages ---------- */
  function chatHtml() {
    if (D.live && !msgs.length) return emptyBox("No messages yet. Write the first one below; Dolphin admissions sees it straight away.");
    var day = null;
    return msgs.map(function (m) {
      var sep = m.d && m.d !== day ? '<p class="in-day">' + esc(m.d) + "</p>" : ""; if (m.d) day = m.d;
      return sep + '<div class="px-msg' + (m.me ? " me" : "") + (m.typing ? " typing" : "") + '"><small>' + esc(m.w) + "</small><p>" + esc(m.t) + "</p></div>";
    }).join("");
  }
  V.msg = function () {
    return head("Messages", "One conversation with the Dolphin admissions team at New Baneshwor.") +
      '<div class="in-mwrap"><aside class="in-mside" aria-label="About this conversation"><span class="av">DA</span><h2>Dolphin admissions</h2><p>New Baneshwor, Kathmandu</p>' +
      '<dl><dt>Replies</dt><dd>During office hours</dd><dt>Good to send here</dt><dd>Decision dates, missing documents, CAS and visa timelines</dd><dt>Decisions and letters</dt><dd>Record them on the application itself</dd></dl><a class="btn soft sm" href="#apps">Open applications</a></aside>' +
      '<section class="in-thread" aria-label="Conversation with Dolphin admissions"><div class="px-chat" id="chat" role="log" aria-live="polite" tabindex="0" aria-label="Messages">' + chatHtml() + '</div><form class="px-send" id="sendF"><label class="px-fl"><span>Message</span><input class="px-in" id="sendT" autocomplete="off" placeholder="Write a message"></label><button class="btn" type="submit">Send</button></form></section></div>';
  };
  function stampTime(x) { var d = new Date(String(x).replace(" ", "T") + "Z"); if (isNaN(d)) return ""; var h = d.getHours(), m = d.getMinutes(); return d.getDate() + " " + MONTHS[d.getMonth()] + ", " + (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m; }
  function loadThread(force) {
    if (!D.live) return;
    API.get("/api/institution/messages").then(function (r) {
      var next = r.items.map(function (m) { var st = stampTime(m.created_at).split(", "); return { me: !!m.mine, d: st[0], w: (m.mine ? "You" : m.sender_name) + (st[1] ? " · " + st[1] : ""), t: m.body }; });
      if (next.length !== msgs.length || force) { msgs = next; refreshChat(); }
    }, function () {});
  }
  var chatTimer = null;
  AFTER.msg = function () {
    var c = $("#chat"); if (c) c.scrollTop = c.scrollHeight;
    if (innerWidth <= 900 && c && c.querySelector(".px-msg")) setTimeout(function () { window.scrollTo(0, document.documentElement.scrollHeight); }, 60);   /* phones: the thread flows with the page; open at the newest message */
    clearInterval(chatTimer);
    if (D.live) { loadThread(true); chatTimer = setInterval(function () { if (cur === "msg" && D.live && S.in) loadThread(); else clearInterval(chatTimer); }, 15000); }
  };
  function refreshChat() { var c = $("#chat"); if (c && cur === "msg") { c.innerHTML = chatHtml(); c.scrollTop = c.scrollHeight; if (innerWidth <= 900 && c.querySelector(".px-msg")) window.scrollTo(0, document.documentElement.scrollHeight); } }

  /* ---------- events ---------- */
  function acInt() { return $$('#acI [aria-pressed="true"]').map(function (x) { return x.dataset.m; }); }
  function curApp() { return apps.filter(function (a) { return a.id == $("#dlg").dataset.app; })[0]; }
  function closeDlg() { var d = $("#dlg"); if (d.open) d.close ? d.close() : d.removeAttribute("open"); }
  document.addEventListener("click", function (e) {
    var d = $("#dlg"); if (d && e.target === d) { closeDlg(); return; }
    var b = e.target.closest("[data-act]"); if (!b) return; var a = b.dataset.act;
    if (a === "pz-back") { renderLogin(); return; }
    if (a === "fill") { $("#lEmail").value = "admissions@lancashire.example"; $("#lPass").value = "sample-1234"; T("Sample sign-in filled"); }
    else if (a === "out") { closeDlg(); if (D.live) { API.logout(); D.live = false; } S.in = false; store("in_in", null); location.hash = ""; renderLogin(); }
    else if (a === "fst") { filt.st = b.dataset.v; $$("#stSeg .pill").forEach(function (p) { p.setAttribute("aria-pressed", p.dataset.v === b.dataset.v); }); refreshApps(); }
    else if (a === "open" || a === "next") openApp(apps.filter(function (x) { return x.id == b.dataset.id; })[0]);
    else if (a === "addc") addCourseDlg();
    else if (a === "acint") { var on = b.getAttribute("aria-pressed") === "true"; if (on && $$('#acI [aria-pressed="true"]').length === 1) { T("Keep at least one intake."); return; } b.setAttribute("aria-pressed", !on); }
    else if (a === "close") closeDlg();
    else if (a === "more") { moreSheet(); $("#dlg").className = "px-dlg"; }
    else if (a === "ltype") { upDoc = b.dataset.v; $$('[data-act="ltype"]').forEach(function (p) { p.setAttribute("aria-pressed", p === b); }); $("#dtn").textContent = upDoc; }
    else if (a === "dtype") { upDoc = b.dataset.v; $$('[data-act="dtype"]').forEach(function (p) { p.setAttribute("aria-pressed", p === b); }); $("#dtn").textContent = upDoc; }
    else if (a === "intake") {
      var tr = b.closest("[data-id]"), c = courseById(tr.dataset.id), i = c.int.indexOf(b.dataset.m);
      if (D.live && i >= 0 && c.int.length === 1) { T("Keep at least one intake."); return; }
      if (i >= 0) c.int.splice(i, 1); else c.int.push(b.dataset.m); b.setAttribute("aria-pressed", i < 0);
      if (D.live) saveCourse(c, { intakes: c.int.slice() }, "Intakes saved.");
    }
    else if (a === "open_c") { var tr2 = b.closest("[data-id]"), c2 = courses.filter(function (x) { return x.id == tr2.dataset.id; })[0]; c2.open = !c2.open; if (D.live) saveCourse(c2, { open: c2.open }, c2.open ? "Open for applications." : "Closed to applications."); b.setAttribute("aria-pressed", c2.open); b.setAttribute("aria-label", c2.open ? "Open for applications" : "Closed"); b.nextElementSibling.textContent = c2.open ? "Open" : "Closed"; }
    else if (a === "rmc") {
      var tr3 = b.closest("[data-id]"), idx = -1; courses.forEach(function (x, k) { if (x.id == tr3.dataset.id) idx = k; });
      removed = { c: courses[idx], i: idx }; courses.splice(idx, 1); route(); showUndo("Removed " + removed.c.n);
      if (D.live) API.delete("/api/courses/" + removed.c.id).catch(function (er) { T(API.message(er)); loadCourses().then(function () { if (cur === "courses") route(); }); });
    }
    else if (a === "undo") {
      if (removed) {
        var rc = removed; removed = null; $("#undo").classList.remove("on");
        if (D.live) { API.post("/api/courses", { name: rc.c.n, level: rc.c.lv, fee: rc.c.fee, intakes: rc.c.int, open: rc.c.open }).then(function () { return loadCourses(); }).then(function () { route(); T("Course restored"); }, function (er) { T(API.message(er)); }); }
        else { courses.splice(rc.i, 0, rc.c); route(); T("Course restored"); }
      }
    }
    else if (a === "savec") T("Saved. Dolphin counsellors now see " + courses.length + " courses (sample).");
    else if (a === "dls" && D.live) {
      var rows = [["Student", "Course", "Intake", "Tuition", "Rate percent", "Rate confirmed", "Expected", "Received", "Currency"]].concat(((commData && commData.items) || []).map(function (x) { return [x.student_name, x.course, x.intake || "", x.tuition == null ? "" : x.tuition, x.rate_pct, x.rate_confirmed ? "yes" : "no", x.expected == null ? "" : x.expected, x.received, x.currency]; }));
      var csv = rows.map(function (r) { return r.map(function (c) { c = String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(","); }).join("\n");
      var a2 = document.createElement("a"); a2.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a2.download = "dolphin-commission-statement.csv"; document.body.appendChild(a2); a2.click(); a2.remove(); T("Statement downloaded.");
    }
    else if (a === "dls") T("Statement downloaded (sample PDF)");
    else if (a === "decide") {
      var ap = curApp(), st = b.dataset.v; if (!ap || ap.raw === st) return; API.busy(b, true); var de = $("#decE"); if (de) de.textContent = "";
      API.patch("/api/applications/" + ap.id, { status: st }).then(function (r) {
        var l = LABEL[r.status] || [r.status, "m"]; ap.raw = r.status; ap.st = l[0]; ap.c = l[1]; API.busy(b, false);
        $("#aSt").innerHTML = stw(ap.st, ap.c); var db2 = $("#decBtns"); if (db2) db2.innerHTML = decBtns(ap); T(ap.n.split(" ")[0] + ": " + l[0] + " recorded. Dolphin has been told."); if (cur === "apps") { refreshApps(); var bb2 = $("#bell .ns-badge"); if (bb2) bb2.textContent = waiting() || ""; }
      }, function (er) { API.busy(b, false); if (de) de.textContent = API.message(er); });
    }
  });
  document.addEventListener("input", function (e) {
    var t = e.target;
    if (t.id === "fq") { filt.q = t.value; refreshApps(); }
    else if (t.id === "tQ") $("#tCnt").textContent = t.value.length + " of 320";
    else if (t.dataset && t.dataset.f) { var tr = t.closest("[data-id]"), c = courses.filter(function (x) { return x.id == tr.dataset.id; })[0]; if (!c) return; if (t.dataset.f === "fee") { c.fee = parseInt(t.value.replace(/\D/g, ""), 10) || 0; } else c[t.dataset.f] = t.value; }
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.id === "ltIn" && t.files[0]) {
      var ap = curApp(), f = t.files[0], le = $("#ltE"); le.textContent = "";
      if (f.size > 10 * 1024 * 1024) { le.textContent = "That file is larger than 10 MB."; t.value = ""; return; }
      T("Uploading…");
      API.upload("/api/applications/" + ap.id + "/letters", f, { kind: upDoc, filename: f.name }).then(function () { T(upDoc + " sent. The student can download it now."); t.value = ""; refreshLetters(ap); }, function (er) { le.textContent = er && er.status === 415 ? "Letters must be PDF files." : API.message(er); t.value = ""; });
    }
    else if (t.id === "upIn" && t.files[0]) { doUpload(curApp(), t.files[0].name); t.value = ""; }
    else if (t.id === "lgF" && t.files[0]) { logoName = t.files[0].name; $("#lgN").textContent = logoName; }
    else if (t.id === "cF" && t.files[0]) { consentName = t.files[0].name; $("#cN").textContent = consentName; }
    else if (t.dataset && t.dataset.f === "lv") { var c = courseById(t.closest("[data-id]").dataset.id); if (c) { c.lv = t.value; if (D.live) saveCourse(c, { level: c.lv }, "Level saved."); } }
    else if (D.live && t.dataset && (t.dataset.f === "n" || t.dataset.f === "fee")) {
      var c3 = courseById(t.closest("[data-id]").dataset.id); if (!c3) return;
      if (t.dataset.f === "n") { if (!t.value.trim()) { T("A course needs a name."); t.value = c3.n; return; } saveCourse(c3, { name: t.value.trim() }, "Name saved."); }
      else saveCourse(c3, { fee: c3.fee }, "Fee saved.");
    }
  });
  document.addEventListener("submit", function (e) {
    var f = e.target; e.preventDefault();
    if (f.id === "loginF") {
      var em = $("#lEmail"), pw = $("#lPass"), er = $("#lErr"); em.removeAttribute("aria-invalid"); pw.removeAttribute("aria-invalid");
      if (!/^\S+@\S+\.\S+$/.test(em.value.trim())) { em.setAttribute("aria-invalid", "true"); er.textContent = "Enter your work email."; em.focus(); return; }
      if (!pw.value) { pw.setAttribute("aria-invalid", "true"); er.textContent = "Enter your password."; pw.focus(); return; }
      if (D.api) {
        var sb = f.querySelector("button[type=submit]"); API.busy(sb, true); er.textContent = "";
        API.login(em.value.trim(), pw.value).then(function (u) {
          if (u.role !== "university") { API.logout(); throw Object.assign(new Error("This sign-in is for university partners. Students, staff and head office have their own pages."), { plain: true }); }
          return liveStart(u);
        }).then(function () {
          S.in = true; store("in_in", "1"); API.busy(sb, false); renderShell(); location.hash = "#apps"; route(); T("Welcome, " + D.inst);
        }, function (e2) { API.busy(sb, false); if (e2 && e2.code === "portal_paused") { pausedView(); return; } pw.setAttribute("aria-invalid", "true"); er.textContent = e2.plain ? e2.message : (e2.status === 401 ? "That email and password do not match." : API.message(e2)); pw.focus(); });
        return;
      }
      if (em.value.trim().toLowerCase() !== "admissions@lancashire.example" || pw.value !== "sample-1234") { pw.setAttribute("aria-invalid", "true"); er.textContent = "That does not match the sample sign-in shown below."; pw.focus(); return; }
      S.in = true; store("in_in", "1"); renderShell(); location.hash = "#apps"; route(); T("Welcome, University of Lancashire");
    } else if (f.id === "addC") {
      var n = $("#acN"), fee = $("#acF"), er2 = $("#acE"); n.removeAttribute("aria-invalid"); fee.removeAttribute("aria-invalid");
      if (!n.value.trim()) { n.setAttribute("aria-invalid", "true"); er2.textContent = "Give the course a name."; n.focus(); return; }
      var fv = parseInt(fee.value.replace(/\D/g, ""), 10); if (!fv) { fee.setAttribute("aria-invalid", "true"); er2.textContent = "Enter the annual fee as a number."; fee.focus(); return; }
      if (D.live) {
        var sb2 = f.querySelector("button[type=submit]"); API.busy(sb2, true);
        API.post("/api/courses", { name: n.value.trim(), fee: fv, level: $("#acL").value, intakes: acInt() }).then(function () { return loadCourses(); }).then(function () { closeDlg(); route(); T("Course added"); var rows2 = $$("#cBody>[data-id]"); if (rows2.length) $("input", rows2[rows2.length - 1]).focus(); },
          function (er) { API.busy(sb2, false); er2.textContent = API.message(er); });
        return;
      }
      courses.push({ id: Date.now(), n: n.value.trim(), lv: $("#acL").value, int: acInt(), fee: fv, open: true }); closeDlg(); route(); T("Course added"); var rows = $$("#cBody>[data-id]"); if (rows.length) $("input", rows[rows.length - 1]).focus();
    } else if (f.id === "sendF") {
      var t = $("#sendT"); if (!t.value.trim()) { t.setAttribute("aria-invalid", "true"); t.focus(); return; } t.removeAttribute("aria-invalid");
      if (D.live) {
        var sbm = f.querySelector("button[type=submit]"); API.busy(sbm, true);
        API.post("/api/institution/messages", { body: t.value.trim() }).then(function () { t.value = ""; API.busy(sbm, false); loadThread(true); t.focus(); }, function (er) { API.busy(sbm, false); T(API.message(er)); });
        return;
      }
      msgs.push({ me: true, w: "You, now", t: t.value.trim() }); t.value = ""; var ty = { me: false, w: "Dolphin admissions", t: "is typing…", typing: true }; msgs.push(ty); refreshChat();
      setTimeout(function () { msgs.splice(msgs.indexOf(ty), 1); msgs.push({ me: false, w: "Dolphin admissions, now", t: replies[rI++ % replies.length] }); refreshChat(); }, reduce ? 200 : 1500);
    } else if (f.id === "tForm") {
      var q = $("#tQ"), s = $("#tS"), r = $("#tR"), er3 = $("#tErr"); [q, s, r].forEach(function (x) { x.removeAttribute("aria-invalid"); });
      var tc = $("#tC");
      var bad = !q.value.trim() ? [q, "Write the quote first."] : !s.value.trim() ? [s, "Add the signatory's name."] : !r.value.trim() ? [r, "Add the signatory's role."] : D.live ? (!tc.checked ? [tc, "Tick the consent line. We cannot publish without it."] : null) : !consentName ? [$("#cF"), "Upload the signed consent form. We cannot publish without it."] : null;
      if (bad) { if (bad[0] !== $("#cF") && bad[0] !== tc) bad[0].setAttribute("aria-invalid", "true"); er3.textContent = bad[1]; bad[0].focus(); return; }
      if (D.live) {
        if (q.value.trim().length < 40) { q.setAttribute("aria-invalid", "true"); er3.textContent = "Please write at least 40 characters."; q.focus(); return; }
        var cnt = {}; apps.forEach(function (x) { if (x.dest) cnt[x.dest] = (cnt[x.dest] || 0) + 1; });
        var ctry = Object.keys(cnt).sort(function (x, y) { return cnt[y] - cnt[x]; })[0] || "Other", sb = f.querySelector("button[type=submit]"); API.busy(sb, true);
        API.post("/api/forms/share-story", { name: s.value.trim() + ", " + r.value.trim(), role: "University staff", country: ctry, story: q.value.trim(), year: new Date().getFullYear(), consent: true }).then(function () {
          testi = { q: q.value.trim(), s: s.value.trim(), r: r.value.trim(), c: "Agreed in the form; signed copy to follow by email" }; T("Sent. Dolphin reviews it before anything is published."); route();
        }, function (er) { API.busy(sb, false); er3.textContent = API.message(er); });
        return;
      }
      testi = { q: q.value.trim(), s: s.value.trim(), r: r.value.trim(), c: consentName }; T("Sent. Awaiting approval by Dolphin head office."); route();
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.classList && e.target.classList.contains("in-name")) { e.preventDefault(); e.target.blur(); return; } if (e.key === "Escape") { var u = $("#undo"); if (u) u.classList.remove("on"); } });

  document.addEventListener("click", function (e) { $$("details.px-menu[open]").forEach(function (d) { if (!d.contains(e.target) || (e.target.closest && e.target.closest("[data-act]"))) d.open = false; }); });

  /* the university portal is switched off by Dolphin head office (roles.university.enabled = false): a calm notice instead of an error */
  function pausedView() {
    var c = $(".px-lcard"); if (!c) return;
    c.innerHTML = '<div><p class="px-cap">University partner portal</p><h2 tabindex="-1" id="pzH">Paused for now</h2></div><p class="in-pz">Your sign-in is correct, but Dolphin Education has paused the university portal for the moment. Applications, offers and messages continue by email with the Dolphin admissions team at New Baneshwor.</p><p class="in-pz mute">You will be told when the portal opens again.</p><div class="px-act"><button class="btn soft" type="button" data-act="pz-back">Back to sign-in</button></div>';
    $("#pzH").focus();
  }

  /* ---------- boot ---------- */
  function previewBoot() { if (S.in) { renderShell(); route(); } else renderLogin(); }
  if (API) {
    API.on("unauth", function () { if (D.live) { D.live = false; S.in = false; store("in_in", null); renderLogin(); } });
    API.me().then(function (u) {
      D.api = true;
      if (u.role === "university") return liveStart(u).then(function () { S.in = true; renderShell(); route(); });
      S.in = false; renderLogin();
    }, function (e) { if (e && !e.offline) { D.api = true; S.in = false; store("in_in", null); renderLogin(); if (e.code === "portal_paused") pausedView(); } else previewBoot(); });
  } else previewBoot();
})();
