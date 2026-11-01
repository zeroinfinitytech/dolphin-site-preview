/* Dolphin Content Manager portal: Clients (PLAN 2.4b with content-manager rights).
   Search (name, ref, phone, email, passport) -> client file with tabs: Profile, Education, Tests, Contacts, Work, Documents, Notes.
   Create a client with a duplicate warning. Not here (branch manager only): finance, internal documents, lock, merge, archive, ZIP/export. */
(function () {
  "use strict";
  var CM = window.CM, api = CM.api, esc = CM.esc, $ = CM.$, $$ = CM.$$, V = CM.V;
  var DEST = ["Canada", "UK", "USA", "Australia", "New Zealand"];
  var STAGE = { lead: "Enquiry", counselling: "Counselling", applying: "Applying", offer: "Offer", visa: "Visa", departed: "Departed", lost: "Closed" };
  var DOCST = { missing: "Missing", requested: "Requested", received: "Received", verified: "Verified", rejected: "Rejected", expiring: "Expiring", expired: "Expired", needed: "Needed" };
  var CAT = { identity: "Identity", academic: "Education", test: "English test", financial: "Funds", visa: "Visa and offers", other: "Other" };
  var TABS = [["profile", "Profile"], ["education", "Education"], ["tests", "Tests"], ["contacts", "Contacts"], ["work", "Work"], ["abroad", "Studies abroad"], ["documents", "Documents"], ["notes", "Notes and history"]];
  var ROWS = {
    education: { one: "education", label: "Education", fields: [["level", "Level", "enum", ["SEE", "+2", "A level", "Diploma", "Bachelor", "Master", "Other"], 1], ["institution", "School or college"], ["board", "Board or university"], ["stream", "Stream or subject"], ["year_from", "From (year)", "num"], ["year_to", "To (year)", "num"], ["grade", "Grade"], ["gpa", "GPA"], ["notes", "Notes", "area"]],
      sum: function (r) { return [r.level, r.institution].filter(Boolean).join(", "); }, sub: function (r) { return [r.board, r.stream, [r.year_from, r.year_to].filter(Boolean).join(" to "), r.gpa ? "GPA " + r.gpa : r.grade].filter(Boolean).join(" · "); } },
    tests: { one: "test score", label: "Tests", fields: [["test", "Test", "enum", ["IELTS", "PTE", "TOEFL", "Duolingo", "SAT", "GRE", "GMAT", "Other"], 1], ["overall", "Overall"], ["listening", "Listening"], ["reading", "Reading"], ["writing", "Writing"], ["speaking", "Speaking"], ["test_date", "Test date", "date"], ["expiry_date", "Valid until", "date"], ["trf_no", "Report number (TRF)"]],
      sum: function (r) { return r.test + (r.overall ? " " + r.overall : ""); }, sub: function (r) { return [["L", r.listening], ["R", r.reading], ["W", r.writing], ["S", r.speaking]].filter(function (x) { return x[1]; }).map(function (x) { return x[0] + " " + x[1]; }).join(", ") + (r.test_date ? " · taken " + CM.date(r.test_date) : "") + (r.expiry_date ? " · valid until " + CM.date(r.expiry_date) : ""); } },
    contacts: { one: "contact", label: "Contacts", fields: [["relation", "Relation", "enum", ["father", "mother", "guardian", "sponsor", "spouse", "sibling", "other"], 1], ["name", "Name", "", null, 1], ["phone", "Phone", "tel"], ["email", "Email", "email"], ["occupation", "Occupation"], ["is_sponsor", "Sponsors the studies", "bool"]],
      sum: function (r) { return r.name + ", " + cap(r.relation); }, sub: function (r) { return [r.phone, r.email, r.occupation, r.is_sponsor ? "Sponsor" : ""].filter(Boolean).join(" · "); } },
    work: { one: "job", label: "Work", fields: [["employer", "Employer", "", null, 1], ["role", "Role"], ["date_from", "From", "date"], ["date_to", "To", "date"], ["notes", "Notes", "area"]],
      sum: function (r) { return [r.role, r.employer].filter(Boolean).join(", "); }, sub: function (r) { return [r.date_from ? CM.date(r.date_from) : "", r.date_to ? "to " + CM.date(r.date_to) : "to now"].filter(Boolean).join(" ") + (r.notes ? " · " + r.notes : ""); } },
    /* after departure (2026-11-01): what and where the student studies now; the student can update it from the portal too */
    abroad: { one: "study abroad", label: "Studies abroad", fields: [["level", "Level", "enum", ["Bachelor", "Master", "Diploma", "Foundation", "Language", "PhD", "Other"], 1], ["course", "Course"], ["institution", "University or college"], ["country", "Country"], ["city", "City"],
        ["year_from", "From (year)", "num"], ["year_to", "To (year)", "num"], ["status", "Status", "enum", [["studying", "Studying"], ["completed", "Completed"], ["transferred", "Transferred"], ["deferred", "Deferred"], ["withdrew", "Withdrew"]]], ["notes", "Notes", "area"]],
      sum: function (r) { return [r.level, r.course].filter(Boolean).join(" · ") + (r.institution ? ", " + r.institution : ""); },
      sub: function (r) { return [[r.city, r.country].filter(Boolean).join(", "), [r.year_from, r.year_to].filter(Boolean).join(" to "), cap(r.status)].filter(Boolean).join(" · ") + (r.notes ? " · " + r.notes : ""); } }
  };
  var PROFILE = [
    ["Personal", [["dob", "Date of birth", "date"], ["gender", "Gender", "enum", [["female", "Female"], ["male", "Male"], ["other", "Other"], ["prefer_not", "Prefer not to say"]]], ["nationality", "Nationality"], ["marital_status", "Marital status", "enum", [["single", "Single"], ["married", "Married"], ["divorced", "Divorced"], ["widowed", "Widowed"], ["other", "Other"]]], ["citizenship_no", "Citizenship number"]]],
    ["Passport", [["passport_no", "Passport number"], ["passport_place", "Place of issue"], ["passport_issue", "Issued on", "date"], ["passport_expiry", "Expires on", "date"]]],
    ["Address", [["address_perm", "Permanent address", "area"], ["address_temp", "Current address", "area"], ["district", "District"]]],
    ["Other ways to reach them", [["phone_alt", "Other phone", "tel"], ["email_alt", "Other email", "email"]]],
    ["Emergency contact", [["emergency_name", "Name"], ["emergency_relation", "Relation"], ["emergency_phone", "Phone", "tel"]]],
    ["How they found us", [["source_note", "Note", "area"]]]
  ];
  function cap(s) { return s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : ""; }
  function opt(o) { return Array.isArray(o) ? o : [o, cap(o)]; }
  function ctl(f, v, pre) {
    var id = (pre || "c_") + f[0], ty = f[2] || "", req = f[4] ? " required" : "";
    if (ty === "enum") return '<select class="in" id="' + id + '" name="' + f[0] + '"' + req + '><option value="">' + (f[4] ? "Choose" : "Not given") + "</option>" + f[3].map(function (o) { o = opt(o); return '<option value="' + esc(o[0]) + '"' + (String(v) === String(o[0]) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>";
    if (ty === "area") return '<textarea class="in" id="' + id + '" name="' + f[0] + '" rows="2"' + req + ">" + esc(v || "") + "</textarea>";
    if (ty === "bool") return '<label class="ck"><input type="checkbox" id="' + id + '" name="' + f[0] + '"' + (v ? " checked" : "") + "> " + esc(f[1]) + "</label>";
    return '<input class="in" id="' + id + '" name="' + f[0] + '" type="' + (ty === "date" ? "date" : ty === "num" ? "number" : ty === "tel" ? "tel" : ty === "email" ? "email" : "text") + '" value="' + esc(v == null ? "" : v) + '"' + req + ">";
  }
  function fld(f, v, pre, cls) { if ((f[2] || "") === "bool") return '<div class="fld ' + (cls || "") + '">' + ctl(f, v, pre) + '<p class="err" data-for="' + f[0] + '" hidden></p></div>'; return '<div class="fld ' + (cls || "") + '"><label for="' + (pre || "c_") + f[0] + '">' + esc(f[1]) + (f[4] ? " <em>Required</em>" : "") + "</label>" + ctl(f, v, pre) + '<p class="err" data-for="' + f[0] + '" hidden></p></div>'; }
  function formObj(f, fields) { var o = {}; fields.forEach(function (x) { var el = f.elements[x[0]]; if (!el) return; if ((x[2] || "") === "bool") o[x[0]] = el.checked; else { var v = el.value.trim(); o[x[0]] = v === "" ? null : (x[2] === "num" ? Number(v) : v); } }); return o; }
  function fail(f, e) { if (e && e.details) api.showErrors(f, e); else { var g = $(".err[data-for=form]", f); if (g) { g.textContent = CM.msgOf(e); g.hidden = false; } else CM.toast(CM.msgOf(e), "error"); } }

  /* ================= list ================= */
  var LS = { q: "", stage: "", destination: "", flag: "" };
  V.clients = function (r, el, cur) {
    if (r[1] === "new") return create(el);
    if (r[1]) return file(el, +r[1], r[2] || "profile", cur);
    el.innerHTML = '<div class="pg">' + CM.head({ eb: "Clients", title: "Client files", lead: "Profiles, education, tests, contacts and documents for " + (CM.S.branch ? CM.S.branch.name : "your branch") + ". Fees and internal documents stay with the branch manager.", acts: '<a class="btn" href="#/clients/new">New client</a>' }) +
      '<div class="bar"><input type="search" class="q" id="clQ" placeholder="Search name, ref, phone, email or passport" aria-label="Search clients" value="' + esc(LS.q) + '">' +
      '<label><span class="cm-sr">Stage</span><select class="in" id="clStage"><option value="">Every stage</option>' + Object.keys(STAGE).map(function (k) { return '<option value="' + k + '"' + (LS.stage === k ? " selected" : "") + ">" + STAGE[k] + "</option>"; }).join("") + "</select></label>" +
      '<label><span class="cm-sr">Destination</span><select class="in" id="clDest"><option value="">Every country</option>' + DEST.map(function (d) { return '<option' + (LS.destination === d ? " selected" : "") + ">" + d + "</option>"; }).join("") + "</select></label>" +
      '<div class="pills" role="group" aria-label="Documents">' + [["", "All"], ["missing", "Missing documents"], ["expiring", "Expiring soon"]].map(function (p) { return '<button type="button" class="pill" data-cl="flag" data-v="' + p[0] + '" aria-pressed="' + (LS.flag === p[0]) + '">' + p[1] + "</button>"; }).join("") + "</div></div>" +
      '<div id="clBox">' + CM.skel(8) + "</div></div>";
    CM.setCrumb([{ t: "Clients" }]);
    var box = $("#clBox", el), page = 1, items = [];
    function load(more) {
      if (!more) { page = 1; box.innerHTML = CM.skel(8); } else page++;
      return api.get("/api/students", { q: LS.q || undefined, stage: LS.stage || undefined, destination: LS.destination || undefined, missing_docs: LS.flag === "missing" ? 1 : undefined, expiring: LS.flag === "expiring" ? 90 : undefined, page: page, limit: 30 }).then(function (b) {
        items = more ? items.concat(b.items || []) : (b.items || []);
        if (!items.length) { box.innerHTML = CM.empty(LS.q || LS.stage || LS.destination || LS.flag ? "No client matches" : "No client files yet", LS.q ? "Check the spelling, or search by phone, email, ref or passport number." : "Create the first file with New client.", '<a class="btn soft sm" href="#/clients/new">New client</a>'); return; }
        box.innerHTML = '<ul class="rows">' + items.map(function (s) {
          return '<li class="row nothumb"><a class="main-l" href="#/clients/' + s.id + '"><b>' + esc(s.name) + ' <span class="ref">' + esc(s.ref_no || "") + "</span></b><small>" + esc([s.destination, s.intake, s.phone, s.email].filter(Boolean).join(" · ")) + "</small></a>" +
            '<div class="ra"><span class="stw' + (s.stage === "visa" || s.stage === "offer" ? " on" : "") + '">' + esc(STAGE[s.stage] || s.stage || "") + "</span></div></li>";
        }).join("") + "</ul>" + (b.page < b.pages ? '<p style="text-align:center;margin:20px 0"><button type="button" class="btn soft sm" data-cl="more">Show more</button></p>' : "");
      }, function (e) { box.innerHTML = CM.errBox(e); });
    }
    var qt; el.addEventListener("input", function (e) { if (e.target.id === "clQ") { clearTimeout(qt); qt = setTimeout(function () { LS.q = e.target.value.trim(); load(); }, 300); } });
    el.addEventListener("change", function (e) { if (e.target.id === "clStage") { LS.stage = e.target.value; load(); } if (e.target.id === "clDest") { LS.destination = e.target.value; load(); } });
    el.addEventListener("click", function (e) { var b = e.target.closest("[data-cl]"); if (!b) return; if (b.dataset.cl === "more") load(true); if (b.dataset.cl === "flag") { LS.flag = b.dataset.v; $$("[data-cl=flag]", el).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); load(); } });
    return load();
  };

  /* ================= create (duplicate warning) ================= */
  var NEWF = [["name", "Full name", "", null, 1], ["destination", "Destination", "enum", DEST.map(function (d) { return [d, d]; }), 1], ["phone", "Phone", "tel"], ["email", "Email", "email"], ["passport_no", "Passport number"], ["intake", "Intake (for example Jan 2027)"], ["notes", "Notes", "area"]];
  function create(el) {
    var dirty = false; CM.setGuard(function () { return dirty; }); CM.onLeave(function () { CM.clearGuard(); });
    el.innerHTML = '<div class="pg">' + CM.head({ eb: "Clients", title: "New client file", lead: "We check for an existing file with the same phone, email or passport before creating a new one." }) +
      '<form id="nwF" novalidate style="max-width:720px"><div id="nwDup" aria-live="polite"></div><div class="grid2">' + NEWF.map(function (f) { return fld(f, "", "n_", f[2] === "area" ? "full" : ""); }).join("") + '</div><p class="err" data-for="form" role="alert" hidden></p>' +
      '<div class="pg-a"><a class="btn soft" href="#/clients">Cancel</a><button type="submit" class="btn">Create file</button></div></form></div>';
    CM.setCrumb([{ t: "Clients", href: "#/clients" }, { t: "New client" }]);
    var f = $("#nwF", el), force = false;
    function dupHtml(m, final) {
      if (!m || !m.length) return "";
      return '<div class="dup" role="status"><b>' + (final ? "This may be someone we already have" : "Possible existing file") + "</b><ul>" + m.map(function (x) { return '<li><a class="lnk" href="#/clients/' + x.id + '">' + esc(x.name) + "</a> " + esc((x.ref_no || "") + " · same " + (x.matched || []).join(" and ")) + "</li>"; }).join("") + "</ul>" + (final ? '<p class="hint">Open the existing file instead, or create a new one anyway.</p><div class="pg-a" style="margin-top:10px"><button type="button" class="btn soft sm" data-nw="force">Create anyway</button></div>' : "") + "</div>";
    }
    function check() {
      var d = formObj(f, NEWF); if (!d.phone && !d.email && !d.passport_no) { $("#nwDup", el).innerHTML = ""; return; }
      api.get("/api/students/duplicates", { phone: d.phone || undefined, email: d.email || undefined, passport: d.passport_no || undefined }).then(function (b) { $("#nwDup", el).innerHTML = dupHtml(b.items); }, function () { /* the server checks again on create */ });
    }
    f.addEventListener("input", function () { dirty = true; });
    f.addEventListener("focusout", function (e) { if (/^(phone|email|passport_no)$/.test(e.target.name || "")) check(); });
    function submit() {
      var d = formObj(f, NEWF), det = {};
      if (!d.name) det.name = "Add the client's name."; if (!d.destination) det.destination = "Choose a destination.";
      if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) det.email = "Enter an email address like name@example.com.";
      if (Object.keys(det).length) { api.showErrors(f, { details: det }); return; }
      Object.keys(d).forEach(function (k) { if (d[k] == null) delete d[k]; }); if (force) d.force = true;
      var btn = $("button[type=submit]", f); CM.busy(btn, true);
      api.post("/api/students", d).then(function (s) { dirty = false; CM.busy(btn, false); CM.toast("Client file " + (s.ref_no || "") + " created"); location.hash = "#/clients/" + s.id; }, function (e) {
        CM.busy(btn, false);
        if (e.code === "possible_duplicate") { $("#nwDup", el).innerHTML = dupHtml((e.details && e.details.matches) || [], true); $("#nwDup .dup", el).scrollIntoView({ block: "center" }); return; }
        fail(f, e);
      });
    }
    f.addEventListener("submit", function (e) { e.preventDefault(); force = false; submit(); });
    el.addEventListener("click", function (e) { if (e.target.closest("[data-nw=force]")) { force = true; submit(); } });
    setTimeout(function () { var n = $("#n_name", el); if (n) n.focus(); }, 30);
  }

  /* ================= client file ================= */
  function file(el, id, tab, cur) {
    if (!TABS.some(function (t) { return t[0] === tab; })) tab = "profile";
    var F = { id: id, s: null };
    return api.get("/api/students/" + id).then(function (s) {
      F.s = s;
      el.innerHTML = '<div class="pg"><header class="pg-h"><div><span class="eb">' + esc([s.ref_no, s.branch_name].filter(Boolean).join(" · ")) + "</span><h1>" + esc(s.name) + "</h1><p>" + esc([s.destination, s.intake ? "intake " + s.intake : "", STAGE[s.stage] || s.stage, s.assigned_manager_name ? "branch manager " + s.assigned_manager_name : ""].filter(Boolean).join(" · ")) + (s.profile_locked ? " · profile locked" : "") + "</p></div>" +
        '<div class="pg-a"><button type="button" class="btn soft sm" data-cf="edit">Edit details</button><button type="button" class="btn soft sm" data-cf="fwd">Pass to branch manager</button></div></header>' +
        '<nav class="tabs" aria-label="Client file">' + TABS.map(function (t) { return '<a href="#/clients/' + id + "/" + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : "") + ">" + t[1] + "</a>"; }).join("") + "</nav>" +
        '<div id="cfBody">' + CM.skel(6) + "</div></div>";
      CM.setCrumb([{ t: "Clients", href: "#/clients" }, { t: s.name }]);
      el.addEventListener("click", function (e) {
        var b = e.target.closest("[data-cf]"); if (!b) return;
        if (b.dataset.cf === "edit") editDetails(F);
        if (b.dataset.cf === "fwd") CM.forwardItem("student", id, s.name + "'s file");
      });
      cur.update = function (r2) {
        if (r2[1] !== String(id)) return false; var t2 = r2[2] || "profile"; if (!TABS.some(function (t) { return t[0] === t2; })) t2 = "profile";
        if (CM.S.guard && CM.S.guard()) return false;
        $$(".tabs a", el).forEach(function (a) { if (a.getAttribute("href") === "#/clients/" + id + "/" + t2) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
        showTab(el, F, t2); return true;
      };
      return showTab(el, F, tab);
    });
  }
  function showTab(el, F, tab) {
    var box = $("#cfBody", el); box.innerHTML = CM.skel(6); CM.clearGuard();
    var p = tab === "profile" ? profile(box, F) : ROWS[tab] ? rows(box, F, tab) : tab === "documents" ? docs(box, F) : notes(box, F);
    return p && p.catch ? p.catch(function (e) { box.innerHTML = CM.errBox(e); }) : p;
  }
  function editDetails(F) {
    var s = F.s, fs = [["name", "Full name", "", null, 1], ["phone", "Phone", "tel"], ["email", "Email", "email"], ["intake", "Intake"], ["tags", "Tags (separate with commas)"]];
    var D = CM.drawer({ eb: s.ref_no, title: "Edit details", body: '<form id="edF" novalidate>' + fs.map(function (f) { return fld(f, s[f[0]], "e_"); }).join("") + '<p class="err" data-for="form" role="alert" hidden></p></form>', foot: '<button type="button" class="btn soft" data-act="drawer-x">Cancel</button><button type="submit" form="edF" class="btn">Save</button>' });
    $("#edF", D.el).addEventListener("submit", function (e) {
      e.preventDefault(); var f = e.target, d = formObj(f, fs); if (!d.name) { api.showErrors(f, { details: { name: "Add the client's name." } }); return; }
      var btn = $("button[form=edF]", D.el); CM.busy(btn, true);
      api.patch("/api/students/" + F.id, { name: d.name, phone: d.phone || "", email: d.email || "", intake: d.intake || "", tags: d.tags || "" }).then(function () { CM.busy(btn, false); D.close(); CM.toast("Details saved"); CM.render(); }, function (x) { CM.busy(btn, false); fail(f, x); });
    });
  }

  /* ---------- profile ---------- */
  function profile(box, F) {
    return api.get("/api/students/" + F.id + "/profile").then(function (b) {
      var p = b.profile || {}, dirty = false, all = [];
      PROFILE.forEach(function (g) { all = all.concat(g[1]); });
      box.innerHTML = (b.locked ? '<p class="banner-msg">The profile is locked by the branch manager: the student can no longer change it. You can still keep it up to date.</p>' : "") +
        '<p class="mute" style="margin:0 0 20px">' + (b.completed ? "Profile complete." : "Still missing: " + esc((b.missing || []).map(function (k) { var f = all.filter(function (x) { return x[0] === k; })[0]; return f ? f[1] : k.replace(/_/g, " "); }).join(", ")) + ".") + (b.updated_at ? " Last updated " + esc(CM.ts(b.updated_at)) + "." : "") + "</p>" +
        '<form id="prF" novalidate style="max-width:880px">' + PROFILE.map(function (g) { return '<section class="sec"><h2>' + esc(g[0]) + '</h2><div class="grid2" style="margin-top:16px">' + g[1].map(function (f) { return fld(f, p[f[0]], "p_", f[2] === "area" && g[1].length < 3 ? "full" : ""); }).join("") + "</div></section>"; }).join("") +
        '<section class="sec"><h2>Consent</h2><label class="ck" style="margin-top:10px"><input type="checkbox" name="consent_data"' + (p.consent_data ? " checked" : "") + "> The student agreed that Dolphin keeps and uses these details for their application" + (p.consent_at ? " (recorded " + esc(CM.ts(p.consent_at)) + ")" : "") + "</label></section>" +
        '<p class="err" data-for="form" role="alert" hidden></p><div class="pg-a"><button type="submit" class="btn">Save profile</button></div></form>';
      var f = $("#prF", box);
      CM.setGuard(function () { return dirty; });
      f.addEventListener("input", function () { dirty = true; }); f.addEventListener("change", function () { dirty = true; });
      f.addEventListener("submit", function (e) {
        e.preventDefault(); var d = formObj(f, all); d.consent_data = f.elements.consent_data.checked;
        var btn = $("button[type=submit]", f); CM.busy(btn, true);
        api.patch("/api/students/" + F.id + "/profile", d).then(function () { dirty = false; CM.busy(btn, false); CM.toast("Profile saved"); profile(box, F); }, function (x) { CM.busy(btn, false); fail(f, x); });
      });
    });
  }

  /* ---------- education / tests / contacts / work ---------- */
  function rows(box, F, kind) {
    var R = ROWS[kind];
    return api.get("/api/students/" + F.id + "/" + kind).then(function (b) {
      var items = b.items || [];
      box.innerHTML = '<div class="bar" style="justify-content:space-between"><p class="mute" style="margin:0">' + esc(items.length ? "" : "Nothing recorded yet.") + '</p><button type="button" class="btn sm" data-rw="add">Add ' + esc(R.one) + "</button></div>" +
        (items.length ? '<ul class="rows">' + items.map(function (r) { return '<li class="row nothumb"><div class="main-l"><b>' + esc(R.sum(r)) + "</b><small>" + esc(R.sub(r)) + '</small></div><div class="ra"><button type="button" class="btn soft xs" data-rw="edit" data-id="' + r.id + '">Edit</button><button type="button" class="btn quiet xs" data-rw="del" data-id="' + r.id + '">Remove</button></div></li>'; }).join("") + "</ul>" : CM.empty("Nothing here yet", "Add the first " + R.one + " with the button above."));
      box.onclick = function (e) {
        var t = e.target.closest("[data-rw]"); if (!t) return; var row = items.filter(function (x) { return x.id === +t.dataset.id; })[0];
        if (t.dataset.rw === "add" || t.dataset.rw === "edit") form(row);
        if (t.dataset.rw === "del") CM.dialog({ title: "Remove this " + R.one + "?", lead: "The old entry is kept in the history.", ok: "Remove", danger: true, submit: function () { return api.delete("/api/students/" + F.id + "/" + kind + "/" + row.id).then(function () { CM.toast("Removed"); rows(box, F, kind); }); } });
      };
      function form(row) {
        var D = CM.drawer({ eb: F.s.name, title: (row ? "Edit " : "Add ") + R.one, body: '<form id="rwF" novalidate><div class="grid2">' + R.fields.map(function (f) { return fld(f, row ? row[f[0]] : (f[2] === "bool" ? false : ""), "r_", f[2] === "area" ? "full" : ""); }).join("") + '</div><p class="err" data-for="form" role="alert" hidden></p></form>', foot: '<button type="button" class="btn soft" data-act="drawer-x">Cancel</button><button type="submit" form="rwF" class="btn">Save</button>' });
        $("#rwF", D.el).addEventListener("submit", function (e) {
          e.preventDefault(); var f = e.target, d = formObj(f, R.fields), det = {};
          R.fields.forEach(function (x) { if (x[4] && (d[x[0]] == null || d[x[0]] === "")) det[x[0]] = x[1] + " is needed."; });
          if (Object.keys(det).length) { api.showErrors(f, { details: det }); return; }
          if (!row) Object.keys(d).forEach(function (k) { if (d[k] == null) delete d[k]; });
          var btn = $("button[form=rwF]", D.el); CM.busy(btn, true);
          (row ? api.patch("/api/students/" + F.id + "/" + kind + "/" + row.id, d) : api.post("/api/students/" + F.id + "/" + kind, d)).then(function () { CM.busy(btn, false); D.close(); CM.toast("Saved"); rows(box, F, kind); }, function (x) { CM.busy(btn, false); fail(f, x); });
        });
      }
    });
  }

  /* ---------- documents: checklist, upload, versions, verify / reject, expiry, requests ---------- */
  function docs(box, F) {
    return Promise.all([api.get("/api/students/" + F.id + "/checklist"), api.get("/api/students/" + F.id), api.get("/api/document-requests", { student_id: F.id, status: "open" })]).then(function (R) {
      var ck = R[0], s = R[1], reqs = (R[2].items || []), sum = ck.summary || {};
      var listed = {}; (ck.items || []).forEach(function (i) { if (i.document) listed[i.document.id] = 1; });
      var others = (s.documents || []).filter(function (d) { return d.current !== 0 && !listed[d.id] && !d.archived_at; });
      var cats = {}; (ck.items || []).forEach(function (i) { (cats[i.category] = cats[i.category] || []).push(i); });
      function reqOf(k) { return reqs.filter(function (q) { return q.type_key === k; })[0]; }
      function row(i) {
        var d = i.document, q = i.request || reqOf(i.type_key), st = i.status, info = [];
        if (d) info.push((d.filename || "File") + (d.version > 1 ? ", version " + d.version : "") + (d.created_at ? ", added " + CM.date(d.created_at) : "") + (d.uploaded_by_name ? " by " + d.uploaded_by_name : ""));
        if (d && d.verified_at && (d.status === "verified")) info.push("Verified " + CM.date(d.verified_at) + (d.verified_by_name ? " by " + d.verified_by_name : ""));
        if (i.expiry_date) info.push((i.days_to_expiry != null && i.days_to_expiry < 0 ? "Expired " : "Expires ") + CM.date(i.expiry_date) + (i.days_to_expiry != null && i.days_to_expiry >= 0 ? ", in " + i.days_to_expiry + " days" : ""));
        if (q) info.push("Requested" + (q.due_at ? ", due " + CM.date(q.due_at) : "") + (q.message ? ": " + q.message : ""));
        var a = [];
        a.push('<button type="button" class="btn ' + (d ? "soft" : "") + ' xs" data-dc="up" data-k="' + esc(i.type_key) + '"' + (q ? ' data-q="' + q.id + '"' : "") + ">" + (d ? "Upload new version" : "Upload") + "</button>");
        if (d && (d.status === "received" || d.status === "needed")) a.push('<button type="button" class="btn soft xs" data-dc="ok" data-id="' + d.id + '">Verify</button>');
        if (d && d.status !== "rejected") a.push('<button type="button" class="btn quiet xs" data-dc="no" data-id="' + d.id + '">Reject</button>');
        if (d && i.has_expiry) a.push('<button type="button" class="btn quiet xs" data-dc="exp" data-id="' + d.id + '" data-v="' + esc(d.expiry_date || "") + '">Expiry date</button>');
        if (d) a.push('<button type="button" class="btn quiet xs" data-dc="ver" data-id="' + d.id + '">Versions</button>');
        if (d && d.has_file) a.push('<a class="btn quiet xs" href="/api/documents/' + d.id + '/file">Download</a>');
        if (!q && (!d || st === "rejected" || st === "expired" || st === "expiring")) a.push('<button type="button" class="btn quiet xs" data-dc="req" data-k="' + esc(i.type_key) + '" data-l="' + esc(i.label) + '">Request</button>');
        if (q) a.push('<button type="button" class="btn quiet xs" data-dc="unreq" data-id="' + q.id + '">Cancel request</button>');
        return '<div class="doc-row"><div class="dn"><b>' + esc(i.label) + (i.required ? "" : ' <span class="mute" style="font-weight:400">(optional)</span>') + "</b>" + (info.length ? "<small>" + esc(info.join(" · ")) + "</small>" : "") + (d && d.reject_reason && st === "rejected" ? '<small class="rej">Rejected: ' + esc(d.reject_reason) + "</small>" : "") + "</div>" +
          '<div class="ra"><span class="stw' + (st === "verified" ? " on" : st === "rejected" || st === "expired" || st === "expiring" ? " warn" : "") + '">' + esc(DOCST[st] || st) + "</span>" + a.join("") + "</div></div>";
      }
      box.innerHTML = '<div class="ck-sum">' + [["required", "Required"], ["received", "Received"], ["verified", "Verified"], ["expiring", "Expiring"], ["missing", "Missing"], ["rejected", "Rejected"], ["requested", "Requested"]].filter(function (k) { return sum[k[0]] != null; }).map(function (k) { return "<div><b>" + (sum[k[0]] || 0) + "</b><span>" + k[1] + "</span></div>"; }).join("") + "</div>" +
        '<p class="hint" style="margin:0 0 8px">Checklist for ' + esc(ck.destination || F.s.destination || "the destination") + ". PDF, JPG or PNG up to 10 MB. A new upload of the same document keeps the old one as an earlier version.</p>" +
        Object.keys(CAT).filter(function (c) { return cats[c]; }).map(function (c) { return '<h3 class="cat">' + esc(CAT[c]) + "</h3>" + cats[c].map(row).join(""); }).join("") +
        (others.length ? '<h3 class="cat">Other documents</h3>' + others.map(function (d) { return '<div class="doc-row"><div class="dn"><b>' + esc(d.kind || d.filename) + "</b><small>" + esc((d.filename || "") + (d.created_at ? ", added " + CM.date(d.created_at) : "")) + '</small></div><div class="ra"><span class="stw">' + esc(DOCST[d.status] || d.status) + '</span><button type="button" class="btn quiet xs" data-dc="ver" data-id="' + d.id + '">Versions</button>' + (d.has_file ? '<a class="btn quiet xs" href="/api/documents/' + d.id + '/file">Download</a>' : "") + "</div></div>"; }).join("") : "") +
        '<input type="file" id="dcFile" accept="application/pdf,image/jpeg,image/png" hidden>';
      var pick = null, input = $("#dcFile", box);
      input.onchange = function () {
        var file = input.files[0]; input.value = ""; if (!file || !pick) return;
        if (!/^(application\/pdf|image\/jpeg|image\/png)$/.test(file.type) && !/\.(pdf|jpe?g|png)$/i.test(file.name)) { CM.toast("Only PDF, JPG or PNG files are accepted.", "error"); return; }
        if (file.size > 10 * 1048576) { CM.toast("That file is larger than 10 MB.", "error"); return; }
        var b = pick.btn; CM.busy(b, true);
        api.uploadProgress("/api/students/" + F.id + "/documents", file, { type_key: pick.k, filename: file.name, request_id: pick.q || undefined }, null).then(function (d) { CM.toast((d.version > 1 ? "New version uploaded" : "Uploaded") + ": " + (d.kind || file.name)); docs(box, F); }, function (e) { CM.busy(b, false); CM.toast(e.status === 403 ? "You cannot upload this kind of document." : CM.msgOf(e), "error"); });
      };
      box.onclick = function (e) {
        var t = e.target.closest("[data-dc]"); if (!t) return; var k = t.dataset.dc, id = +t.dataset.id;
        if (k === "up") { pick = { k: t.dataset.k, q: t.dataset.q, btn: t }; input.click(); return; }
        if (k === "ok") { CM.busy(t, true); api.patch("/api/documents/" + id, { status: "verified" }).then(function () { CM.toast("Marked as verified. The student sees it."); docs(box, F); }, function (x) { CM.busy(t, false); CM.toast(CM.msgOf(x), "error"); }); return; }
        if (k === "no") { CM.dialog({ title: "Reject this document", ok: "Reject", danger: true, lead: "The student sees the reason and can upload a new copy.", body: '<label class="cv-fl"><span>Reason, shown to the student</span><textarea class="cv-in" name="reason" rows="3" maxlength="300" required placeholder="For example: the scan is blurred, please upload a clear copy"></textarea></label>', submit: function (f) { var r = f.elements.reason.value.trim(); if (!r) throw new Error("Write the reason the student will see."); return api.patch("/api/documents/" + id, { status: "rejected", reject_reason: r }).then(function () { CM.toast("Document rejected"); docs(box, F); }); } }); return; }
        if (k === "exp") { CM.dialog({ title: "Expiry date", ok: "Save", lead: "The branch manager is reminded 90 and 30 days before.", body: '<label class="cv-fl"><span>Valid until</span><input class="cv-in" type="date" name="d" value="' + esc(t.dataset.v) + '" required></label>', submit: function (f) { var v = f.elements.d.value; if (!v) throw new Error("Choose a date."); return api.patch("/api/documents/" + id, { expiry_date: v }).then(function () { CM.toast("Expiry date saved"); docs(box, F); }); } }); return; }
        if (k === "ver") { api.get("/api/documents/" + id + "/versions").then(function (b) { CM.drawer({ eb: "Versions", title: (b.items && b.items[0] && b.items[0].kind) || "Document", body: (b.items || []).length ? '<ul class="revs">' + b.items.map(function (v, i) { return "<li><div><b>Version " + esc(v.version || b.items.length - i) + (i === 0 ? ", current" : "") + "</b><small>" + esc((v.filename || "") + (v.created_at ? ", " + CM.ts(v.created_at) : "")) + "</small><small>" + esc((DOCST[v.status] || v.status || "") + (v.reject_reason ? ": " + v.reject_reason : "")) + '</small></div><div class="ra">' + (v.has_file ? '<a class="btn quiet xs" href="/api/documents/' + v.id + '/file">Download</a>' : "") + "</div></li>"; }).join("") + "</ul>" : CM.empty("No versions", "") }); }, function (x) { CM.toast(CM.msgOf(x), "error"); }); return; }
        if (k === "req") { CM.dialog({ title: "Request " + t.dataset.l, ok: "Send request", lead: "The student is notified and gets an upload button for exactly this document.", body: '<label class="cv-fl"><span>Message to the student (optional)</span><textarea class="cv-in" name="m" rows="3" maxlength="500"></textarea></label><label class="cv-fl"><span>Due by (optional)</span><input class="cv-in" type="date" name="due" min="' + CM.today() + '"></label>', submit: function (f) { return api.post("/api/students/" + F.id + "/document-requests", { type_key: t.dataset.k, message: f.elements.m.value.trim() || undefined, due_at: f.elements.due.value || undefined }).then(function () { CM.toast("Request sent to the student"); docs(box, F); }); } }); return; }
        if (k === "unreq") { CM.busy(t, true); api.post("/api/document-requests/" + id + "/cancel", {}).then(function () { CM.toast("Request cancelled"); docs(box, F); }, function (x) { CM.busy(t, false); CM.toast(CM.msgOf(x), "error"); }); return; }
      };
    });
  }

  /* ---------- notes + history ---------- */
  function notes(box, F) {
    return Promise.all([api.get("/api/students/" + F.id), api.get("/api/students/" + F.id + "/history")]).then(function (R) {
      var s = R[0], h = R[1], dirty = false, ev = [];
      (h.status || []).forEach(function (x) { ev.push({ at: x.at, t: x.from_stage ? "Stage " + (STAGE[x.from_stage] || x.from_stage) + " to " + (STAGE[x.to_stage] || x.to_stage) : "File opened", by: x.by_name, n: x.note }); });
      (h.audit || []).forEach(function (x) { ev.push({ at: x.at, t: String(x.action || "").replace(/[._]/g, " "), by: x.user_name }); });
      ev.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
      box.innerHTML = '<div class="two"><form id="ntF" novalidate><section class="sec"><h2>Notes</h2><div class="fld" style="margin-top:14px"><label for="ntT">Notes for the branch team (not shown to the student)</label><textarea class="in" id="ntT" name="notes" rows="8" maxlength="4000">' + esc(s.notes || "") + '</textarea></div><p class="err" data-for="form" role="alert" hidden></p><button type="submit" class="btn sm">Save notes</button></section></form>' +
        '<section class="sec"><h2>History</h2>' + (ev.length ? '<ul class="revs">' + ev.slice(0, 40).map(function (x) { return "<li><div><b>" + esc(cap(x.t)) + "</b><small>" + esc(CM.ts(x.at)) + (x.by ? ", " + esc(x.by) : "") + "</small>" + (x.n ? "<small>" + esc(x.n) + "</small>" : "") + "</div><div></div></li>"; }).join("") + "</ul>" : CM.empty("No history yet", "")) + "</section></div>";
      var f = $("#ntF", box); CM.setGuard(function () { return dirty; });
      f.addEventListener("input", function () { dirty = true; });
      f.addEventListener("submit", function (e) { e.preventDefault(); var btn = $("button[type=submit]", f); CM.busy(btn, true); api.patch("/api/students/" + F.id, { notes: f.elements.notes.value.trim() }).then(function () { dirty = false; CM.busy(btn, false); CM.toast("Notes saved"); }, function (x) { CM.busy(btn, false); fail(f, x); }); });
    });
  }
})();
