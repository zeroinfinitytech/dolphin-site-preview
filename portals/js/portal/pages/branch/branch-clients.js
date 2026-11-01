/* Branch portal, client files: list (search, filters, new file with the duplicate check) and the client file drawer with tabs:
   Overview (details, lock/unlock, export, documents ZIP, archive, merge, message), Profile, Documents (checklist: upload, verify, reject, expiry, request),
   Applications, Visa, Fees (fees, payments with receipts, payment claims, waive/refund/delete), History. Plus the Documents screen (requests, expiring).
   A branch manager's archive, merge, unlock, waive, refund and fee delete become requests to the branch head (BR.act -> BR.ask). */
(function () {
  "use strict";
  var K = window.K, A = K.api, esc = K.esc, S = K.state, BR = window.BR, E = BR.E;
  var TABS = [["overview", "Overview"], ["profile", "Profile"], ["documents", "Documents"], ["applications", "Applications"], ["visa", "Visa"], ["fees", "Fees"], ["abroad", "Studies abroad"], ["history", "History"]];
  var DOCST = { missing: ["Missing", ""], requested: ["Requested", "i"], received: ["To check", "i"], verified: ["Verified", "m"], rejected: ["Rejected", ""], expiring: ["Expiring", ""], expired: ["Expired", ""], needed: ["Needed", ""] };
  var ASTAT = [["draft", "Draft"], ["submitted", "Submitted"], ["conditional", "Conditional offer"], ["unconditional", "Unconditional offer"], ["accepted", "Accepted"], ["rejected", "Rejected"], ["withdrawn", "Withdrawn"]];
  var PAY = [["Cash at the office", "Cash at the office"], ["Bank transfer", "Bank transfer"], ["eSewa", "eSewa"], ["Khalti", "Khalti"], ["Card", "Card"]];
  function li(main, sub, right) { return '<li class="k-rowx"><span>' + main + (sub ? '<br><span class="k-mute k-small">' + sub + "</span>" : "") + "</span>" + (right ? '<span class="br-r">' + right + "</span>" : "") + "</li>"; }
  function bad(field, msg) { var e = new Error("x"); e.details = {}; e.details[field] = msg; return e; }
  function btn(act, t, id, extra, cls) { return '<button type="button" class="k-b ' + (cls || "soft") + ' sm" data-act="' + act + '" data-id="' + esc(id) + '"' + (extra || "") + ">" + esc(t) + "</button>"; }

  /* ================= Client files list ================= */
  K.view("clients", { title: "Client files", eyebrow: E, lead: "Every client file in the branch. Open a file to work on documents, applications, visa and fees.",
    acts: '<button type="button" class="k-b p" data-act="cf-new">New client file</button>',
    render: function (c) {
      var p = c.params, arch = p.tab === "archived";
      return A.get("/api/students", { q: p.q, stage: p.stage, destination: p.destination, missing_docs: p.flag === "missing" ? 1 : undefined, expiring: p.flag === "expiring" ? 90 : undefined, archived: arch ? 1 : undefined, page: p.page, limit: 50 }).then(function (res) {
        return K.seg("tab", [["", "Active files"], ["archived", "Archived"]], p.tab || "", "Files") +
          K.filters([{ name: "q", label: "Search", type: "search", ph: "Name, ref, phone, email, passport", w: 1 }, { name: "stage", label: "Stage", type: "select", options: K.opts(BR.STAGES, "Any stage") },
            { name: "destination", label: "Destination", type: "select", options: K.opts(BR.DEST, "Anywhere") }, { name: "flag", label: "Show", type: "select", options: [["", "All files"], ["missing", "Missing documents"], ["expiring", "Documents expiring"]] }], p) +
          '<div class="k-sh"><span class="k-count">' + esc(K.num(res.total)) + " files</span></div>" +
          K.table([{ t: "Client", f: function (x) { return BR.ref(x, "name", "ref_no"); } }, { t: "Destination", k: "destination" }, { t: "Stage", f: function (x) { return BR.stage(x.stage); } }, { t: "Intake", k: "intake" },
            { t: arch ? "Archived" : "Updated", f: function (x) { return esc(arch ? K.date(x.archived_at) : K.ago(x.updated_at)) + (x.merged_into_id ? "<small>Merged</small>" : x.profile_locked ? "<small>Profile locked</small>" : ""); } }],
            res.items, { act: "cf-open", label: "Client files", empty: arch ? "No archived files." : "No client files match these filters." }) + K.pager(res, "files");
      });
    },
    after: function (c) { if (c.params.open) BR.openClient(c.params.open); } });
  K.acts["cf-open"] = function (b) { BR.openClient(b.getAttribute("data-id")); };
  K.acts["cf-new"] = function () {
    var force = false;
    K.dialog({ title: "New client file", submit: "Create the file",
      body: '<div class="k-fr">' + K.field({ name: "name", label: "Full name", required: true }) + K.field({ name: "destination", label: "Destination", type: "select", required: true, options: K.opts(BR.DEST, "Choose") }) + "</div>" +
        '<div class="k-fr">' + K.field({ name: "phone", label: "Phone", type: "tel" }) + K.field({ name: "email", label: "Email", type: "email" }) + "</div>" +
        '<div class="k-fr">' + K.field({ name: "intake", label: "Intake", ph: "Sep 2027" }) + K.field({ name: "passport_no", label: "Passport number" }) + "</div>" + K.field({ name: "notes", label: "Notes", type: "textarea", max: 2000 }),
      onSubmit: function (d, f) {
        if (!d.name) throw bad("name", "Enter the client's name."); if (!d.destination) throw bad("destination", "Choose the destination.");
        if (force) d.force = true;
        return A.post("/api/students", d).catch(function (e) {
          if (e && e.body && e.body.code === "possible_duplicate") {
            var m = (e.body.details && e.body.details.matches) || [], g = f.querySelector(".err[data-for=form]");
            g.innerHTML = "This may already be a client: " + m.map(function (x) { return esc(x.name + " (" + x.ref_no + ", same " + (x.matched || []).join(" and ") + ")"); }).join("; ") + ". Press Create the file again to make a new file anyway.";
            g.hidden = false; force = true; var k = new Error("x"); k.keepOpen = true; throw k;
          }
          throw e;
        });
      } }).then(function (r) { if (r) { K.toast("Client file " + (r.ref_no || "") + " created"); K.render(); if (r.id) BR.openClient(r.id); } });
  };

  /* ================= the client file drawer ================= */
  BR.openClient = function (id, tab) {
    var dr = K.drawer({ title: "Client file", cap: BR.branchName(), onClose: function () { S.cf = null; } });
    S.cf = { id: +id, tab: tab || "overview", dr: dr };
    load();
  };
  function load() {
    var cf = S.cf; if (!cf) return;
    return A.get("/api/students/" + cf.id).then(function (x) {
      cf.x = x; cf.dr.title(x.name);
      cf.dr.el.querySelector(".k-eyebrow").textContent = x.ref_no + ", " + (x.branch_name || BR.branchName());
      paint();
    }, function (e) { cf.dr.set(K.fail(e)); });
  }
  function paint() {
    var cf = S.cf; if (!cf) return;
    cf.dr.set('<div class="k-seg br-tabs" role="tablist" aria-label="Client file">' + TABS.map(function (t) { return '<button type="button" role="tab" data-act="cf-tab" data-t="' + t[0] + '" aria-pressed="' + (cf.tab === t[0]) + '" aria-selected="' + (cf.tab === t[0]) + '">' + esc(t[1]) + "</button>"; }).join("") + '</div><div id="cfBody">' + K.skel(5) + "</div>");
    Promise.resolve(PANES[cf.tab](cf.x)).then(function (html) { var b = K.$("#cfBody"); if (b && S.cf === cf) b.innerHTML = html; }, function (e) { var b = K.$("#cfBody"); if (b) b.innerHTML = K.fail(e); });
  }
  K.acts["cf-tab"] = function (b) { if (!S.cf) return; S.cf.tab = b.getAttribute("data-t"); paint(); };
  function reload(msg) { if (msg) K.toast(msg); BR.badges(); return load(); }

  /* studies abroad (2026-11-01): what and where the student studies after leaving; the student can update it from the portal too */
  var ABL = [["Bachelor", "Bachelor"], ["Master", "Master"], ["Diploma", "Diploma"], ["Foundation", "Foundation"], ["Language", "Language"], ["PhD", "PhD"], ["Other", "Other"]];
  var ABS = [["studying", "Studying"], ["completed", "Completed"], ["transferred", "Transferred"], ["deferred", "Deferred"], ["withdrew", "Withdrew"]];
  function abLine(r) { return [[r.level, r.course].filter(Boolean).join(" · ") + (r.institution ? ", " + r.institution : ""), [[r.city, r.country].filter(Boolean).join(", "), [r.year_from, r.year_to].filter(Boolean).join(" to "), K.lab(r.status)].filter(Boolean).join(" · ") + (r.notes ? " · " + r.notes : "")]; }
  var PANES = {
    abroad: function (x) {
      return A.get("/api/students/" + x.id + "/abroad").then(function (r) {
        S.cfAbroad = {}; r.items.forEach(function (i) { S.cfAbroad[i.id] = i; });
        return '<p class="k-mute">After the student leaves: course, university and years. The student can keep this up to date from the portal.</p>' +
          (r.items.length ? '<ul class="k-list">' + r.items.map(function (i) { var l = abLine(i); return li(esc(l[0]), esc(l[1]), btn("ab-edit", "Edit", i.id) + " " + btn("ab-del", "Remove", i.id, "", "soft d")); }).join("") + "</ul>" : '<p class="k-mute">Nothing recorded yet.</p>') +
          '<div class="k-acts br-acts">' + btn("ab-edit", "Add studies abroad", "", "", "p") + "</div>";
      });
    },
    overview: function (x) {
      var head = BR.isHead(), arch = !!x.archived_at;
      var exp = function (f, t) { return '<a class="k-b soft sm" href="/api/students/' + x.id + "/export?format=" + f + '"' + (f === "html" ? ' target="_blank" rel="noopener"' : " download") + ">" + esc(t) + "</a>"; };
      return K.dl([["Reference", x.ref_no], ["Stage", K.lab(x.stage)], ["Destination", x.destination], ["Intake", x.intake], ["Email", x.email], ["Phone", x.phone], ["Branch manager", x.assigned_manager_name], ["Tags", x.tags], ["Notes", x.notes],
        ["Profile", x.profile_locked ? "Locked: the student can no longer edit it" : "Open: the student can still edit it"], arch ? ["Archived", K.date(x.archived_at) + (x.merged_into_id ? ", merged into another file" : "")] : null]) +
        (arch ? '<p class="k-mute">This file is archived. Head office can restore it.</p>' :
        '<div class="k-acts br-acts">' + btn("cf-edit", "Edit details", x.id, "", "p") + btn("cf-msg", "Message the student", x.id) + btn("cf-req", "Request a document", x.id) +
          (x.profile_locked ? btn("cf-unlock", head ? "Unlock profile" : "Ask to unlock profile", x.id) : btn("cf-lock", "Lock profile", x.id)) + "</div>" +
        '<h3 class="k-h2 br-h">Export</h3><div class="k-acts br-acts">' + exp("html", "Printable summary") + exp("json", "Data (JSON)") + exp("zip", "Everything (ZIP)") + '<a class="k-b soft sm" href="/api/students/' + x.id + '/documents.zip" download>Verified documents (ZIP)</a></div>' +
        '<h3 class="k-h2 br-h">' + (head ? "Branch head actions" : "Needs the branch head") + '</h3><p class="k-sub">' + (head ? "Done at once and recorded in the audit log." : "Sent to the branch head as a request.") + '</p><div class="k-acts br-acts">' +
          btn("cf-merge", head ? "Merge another file into this one" : "Ask to merge a file", x.id) + btn("cf-arch", head ? "Archive this file" : "Ask to archive", x.id, "", "soft d") + "</div>");
    },
    profile: function (x) {
      return A.get("/api/students/" + x.id + "/profile").then(function (r) {
        var p = r.profile || {};
        S.cfProfile = p;
        return '<p class="k-mute">' + esc((r.completed ? "Profile complete." : "Profile not complete yet.") + (r.missing && r.missing.length ? " Missing: " + r.missing.map(K.lab).join(", ") + "." : "") + (r.locked ? " Locked: the student cannot edit it." : "")) + "</p>" +
          K.dl([["Date of birth", p.dob], ["Gender", K.lab(p.gender)], ["Nationality", p.nationality], ["Citizenship no.", p.citizenship_no], ["Passport no.", p.passport_no], ["Passport issued", p.passport_issue], ["Passport expires", p.passport_expiry], ["Passport place", p.passport_place],
            ["Permanent address", p.address_perm], ["Current address", p.address_temp], ["District", p.district], ["Other phone", p.phone_alt], ["Other email", p.email_alt], ["Marital status", K.lab(p.marital_status)],
            ["Emergency contact", [p.emergency_name, p.emergency_relation, p.emergency_phone].filter(Boolean).join(", ")], ["Heard about us", p.source_note], ["Data consent", p.consent_data ? "Given" + (p.consent_at ? " on " + K.date(p.consent_at) : "") : "Not given"]]) +
          '<div class="k-acts br-acts">' + btn("cf-prof", "Edit profile", x.id, "", "p") + "</div>";
      });
    },
    documents: function (x) {
      return A.get("/api/students/" + x.id + "/checklist").then(function (r) {
        var s = r.summary || {};
        S.cfDocs = {}; r.items.forEach(function (i) { S.cfDocs[i.type_key] = i; });
        return K.kpis([["Required", s.required], ["Verified", s.verified], ["To check", (s.received || 0) - (s.verified || 0)], ["Missing", s.missing], ["Expiring", s.expiring]]) +
          '<ul class="k-list br-docs">' + r.items.map(function (i) {
            var st = DOCST[i.status] || [K.lab(i.status), ""], d = i.document;
            var sub = [i.required ? "Required" : "Optional", d ? (d.filename || "") + (d.version > 1 ? ", version " + d.version : "") : "", i.expiry_date ? "expires " + K.date(i.expiry_date) : "", d && d.visibility === "internal" ? "internal" : "", d && d.reject_reason ? "rejected: " + d.reject_reason : "", i.request ? "requested" + (i.request.due_at ? ", due " + K.date(i.request.due_at) : "") : ""].filter(Boolean).join(", ");
            var acts = (d ? (d.status !== "verified" ? btn("dc-ok", "Verify", d.id) : "") + (d.status !== "rejected" ? btn("dc-no", "Reject", d.id) : "") + (i.has_expiry ? btn("dc-exp", "Expiry", d.id) : "") + (d.has_file ? '<a class="k-b soft sm" href="/api/documents/' + d.id + '/file" download>Download</a>' : "") : "") +
              btn("dc-up", d ? "Upload new version" : "Upload", i.type_key) + (!d && !i.request ? btn("dc-ask", "Request", i.type_key) : "");
            return li("<b>" + esc(i.label) + "</b> " + K.st(st[0], st[1]), esc(sub), '<span class="br-docacts">' + acts + "</span>");
          }).join("") + '</ul><input type="file" id="cfFile" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" hidden>';
      });
    },
    applications: function (x) {
      var apps = x.applications || [];
      S.cfApps = {}; apps.forEach(function (a) { S.cfApps[a.id] = a; });
      return (apps.length ? '<ul class="k-list">' + apps.map(function (a) { return li("<b>" + esc(a.institution) + "</b> " + esc(a.course || ""), esc([a.destination, a.intake, "updated " + K.ago(a.updated_at)].filter(Boolean).join(", ")), K.st(K.lab(a.status), "i") + btn("ap-st", "Change", a.id)); }).join("") + "</ul>" : '<p class="k-mute">No applications yet.</p>') +
        '<div class="k-acts br-acts">' + btn("ap-add", "Add an application", x.id, "", "p") + "</div>";
    },
    visa: function (x) {
      return A.get("/api/students/" + x.id + "/visa").then(function (r) {
        var steps = r.steps || [], cur = steps.filter(function (s) { return s.status === "in_progress" || s.status === "blocked"; })[0];
        return '<p class="k-mute">' + esc((r.destination || x.destination) + " visa" + (r.sla_days ? ", about " + r.sla_days + " days in total" : "")) + "</p>" +
          '<ul class="k-list">' + steps.map(function (s) { return li(esc(s.step_label || K.lab(s.step_key)), esc([s.due_at && s.status !== "done" ? "due " + K.date(s.due_at) : "", s.done_at ? "done " + K.date(s.done_at) : "", s.note].filter(Boolean).join(", ")), K.st(K.lab(s.status === "in_progress" ? "current" : s.status), s.status === "done" ? "m" : s.overdue ? "" : "i")); }).join("") + "</ul>" +
          (cur ? '<div class="k-acts br-acts">' + btn("vs-adv", "Step done", x.id, ' data-o="done"', "p") + btn("vs-adv", "Blocked", x.id, ' data-o="blocked"') + "</div>" : '<p class="k-mute">All steps are complete.</p>');
      });
    },
    fees: function (x) {
      return A.get("/api/fees", { student_id: x.id }).then(function (res) {
        var fees = res.items || [], sm = res.summary || {}, pays = x.payments || [];
        var claims = (x.claims || []).filter(function (c) { return c.status === "pending"; }).map(function (c) { return Object.assign({ amount: Math.round((c.amount_minor || 0) / 100) }, c); });
        S.cfFees = {}; fees.forEach(function (f) { S.cfFees[f.id] = f; });
        return K.kpis([["Invoiced", K.money(sm.invoiced, sm.currency)], ["Collected", K.money(sm.collected, sm.currency)], ["Balance", K.money(sm.balance, sm.currency)], ["Overdue", K.money(sm.overdue, sm.currency)]]) +
          (fees.length ? '<ul class="k-list">' + fees.map(function (f) {
            return li("<b>" + esc(f.label) + "</b> " + K.st(K.lab(f.status), f.status === "paid" ? "m" : f.overdue ? "" : "i"), esc(K.money(f.paid, f.currency) + " paid of " + K.money(f.amount, f.currency) + (f.due_at ? ", due " + K.date(f.due_at) : "")),
              (f.balance > 0 ? btn("fe-pay", "Record payment", f.id, "", "p") + btn("fe-waive", "Waive or reduce", f.id) : "") + (f.paid > 0 ? btn("fe-ref", "Refund", f.id) : "") + (!f.paid ? btn("fe-del", "Remove", f.id, "", "soft d") : ""));
          }).join("") + "</ul>" : '<p class="k-mute">No fees on this file.</p>') +
          '<div class="k-acts br-acts">' + btn("fe-add", "Add a fee", x.id, "", "p") + "</div>" +
          (claims.length ? '<h3 class="k-h2 br-h">Payments reported by the family</h3><ul class="k-list">' + claims.map(function (c) { var fe = S.cfFees[c.fee_id]; return li(esc(K.money(c.amount) + " by " + c.method), esc((fe ? fe.label + ", " : "") + "reference " + c.reference + ", " + K.ago(c.created_at)), btn("cl-ok", "Confirm", c.id, "", "p") + btn("cl-no", "Reject", c.id)); }).join("") + "</ul>" : "") +
          (pays.length ? '<h3 class="k-h2 br-h">Receipts</h3><ul class="k-list">' + pays.map(function (p) { return li(esc(p.receipt_no + ", " + K.money((p.amount_minor || 0) / 100)), esc((p.method || "") + ", " + K.date(p.paid_at)), '<button type="button" class="k-b soft sm" data-act="br-rcpt" data-id="' + p.id + '">Receipt</button>'); }).join("") + "</ul>" : "");
      });
    },
    history: function (x) {
      return A.get("/api/students/" + x.id + "/history").then(function (r) {
        return '<h3 class="k-h2 br-h">Stage changes</h3>' + ((r.status || []).length ? '<ul class="k-list">' + r.status.map(function (s) { return li(esc(K.lab(s.from_stage || "new") + " to " + K.lab(s.to_stage)), esc([s.by_name, K.dt(s.at), s.note].filter(Boolean).join(", "))); }).join("") + "</ul>" : '<p class="k-mute">No stage changes yet.</p>') +
          '<h3 class="k-h2 br-h">Changes</h3>' + ((r.audit || []).length ? '<ul class="k-list">' + r.audit.slice(0, 60).map(function (a) { return li(esc(K.lab(a.action)), esc([a.user_name, K.role(a.user_role), K.dt(a.at)].filter(Boolean).join(", "))); }).join("") + "</ul>" : '<p class="k-mute">Nothing recorded yet.</p>');
      });
    }
  };

  /* ---------- overview actions ---------- */
  K.acts["cf-edit"] = function () {
    var x = S.cf.x;
    K.dialog({ title: "Edit details", cap: x.name, submit: "Save",
      body: '<div class="k-fr">' + K.field({ name: "name", label: "Full name", value: x.name, required: true }) + K.field({ name: "stage", label: "Stage", type: "select", value: x.stage, options: BR.STAGES }) + "</div>" +
        '<div class="k-fr">' + K.field({ name: "phone", label: "Phone", type: "tel", value: x.phone }) + K.field({ name: "email", label: "Email", type: "email", value: x.email }) + "</div>" +
        '<div class="k-fr">' + K.field({ name: "intake", label: "Intake", value: x.intake }) + K.field({ name: "tags", label: "Tags", value: x.tags, hint: "Separate with commas." }) + "</div>" +
        K.field({ name: "stage_note", label: "Note on the stage change (optional)" }) + K.field({ name: "notes", label: "Notes", type: "textarea", value: x.notes, max: 4000 }),
      onSubmit: function (d) { if (!d.stage_note) delete d.stage_note; return A.patch("/api/students/" + x.id, d); } })
      .then(function (r) { if (r) reload("Saved"); });
  };
  K.acts["cf-lock"] = function (b) { K.run(b, A.post("/api/students/" + S.cf.id + "/profile/lock", {}), "Profile locked").then(function () { reload(); }, function () { }); };
  K.acts["cf-unlock"] = function (b) {
    BR.act(b, A.post("/api/students/" + S.cf.id + "/profile/unlock", {}), "Profile unlocked", { kind: "profile_unlock", entity: "student", entity_id: S.cf.id, label: "Unlock the profile of " + S.cf.x.name })
      .then(function (r) { if (r) reload(); }, function () { });
  };
  K.acts["cf-arch"] = function (b) {
    var x = S.cf.x;
    if (!BR.isHead()) return BR.ask({ kind: "client_archive", entity: "student", entity_id: x.id, label: "Archive " + x.name, text: "Archiving hides the file from the branch lists. It stays readable and head office can restore it." });
    K.dialog({ title: "Archive this file?", cap: x.name, submit: "Archive", body: '<p class="k-mute">The file leaves the branch lists. It stays readable, and head office can restore it.</p>' + K.field({ name: "reason", label: "Reason", type: "textarea", max: 1000 }),
      onSubmit: function (d) { return A.post("/api/students/" + x.id + "/archive", { reason: d.reason || undefined }); } })
      .then(function (r) { if (r) { reload("File archived"); K.render(); } });
  };
  K.acts["cf-merge"] = function () {
    var x = S.cf.x;
    A.get("/api/students", { limit: 100 }).then(function (st) {
      var others = st.items.filter(function (s) { return +s.id !== +x.id; });
      return K.dialog({ title: BR.isHead() ? "Merge another file into this one" : "Ask to merge a file", cap: "Keep " + x.name + " (" + x.ref_no + ")", submit: BR.isHead() ? "Merge" : "Send the request",
        body: '<p class="k-mute">Applications, documents, fees, appointments, messages and logins move into this file. The other file is archived. Both histories are kept.</p>' +
          K.field({ name: "merge_id", label: "File to merge in", type: "select", required: true, options: K.opts(others.map(function (s) { return [String(s.id), s.name + " (" + s.ref_no + ")"]; }), "Choose a file") }) + K.field({ name: "reason", label: "Reason", type: "textarea", required: !BR.isHead(), max: 1000 }),
        onSubmit: function (d) {
          if (!d.merge_id) throw bad("merge_id", "Choose the file to merge in.");
          if (!BR.isHead()) { if (!(d.reason || "").trim()) throw bad("reason", "Give a short reason for the branch head."); return A.post("/api/approvals", { kind: "client_merge", entity: "student", entity_id: x.id, payload: { merge_id: +d.merge_id }, reason: d.reason.trim() }).then(function (r) { r._req = 1; return r; }); }
          return A.post("/api/students/merge", { keep_id: x.id, merge_id: +d.merge_id, reason: d.reason || undefined });
        } });
    }).then(function (r) { if (r) { reload(r._req ? "Request sent to the branch head" : "Files merged"); if (!r._req) K.render(); } }, function (e) { K.toast(K.msg(e)); });
  };
  K.acts["cf-msg"] = function () {
    var x = S.cf.x;
    K.dialog({ title: "Message the student", cap: x.name, submit: "Send",
      body: K.field({ name: "subject", label: "Subject", value: "From " + BR.branchName() }) + K.field({ name: "body", label: "Message", type: "textarea", required: true, max: 2000 }) + K.field({ name: "include_parents", label: "Include the parents on this file", type: "check", value: true }),
      onSubmit: function (d) { if (!(d.body || "").trim()) throw bad("body", "Write the message."); return A.post("/api/conversations", { kind: "member", student_id: x.id, subject: d.subject, body: d.body, include_parents: !!d.include_parents }); } })
      .then(function (r) { if (r) { K.toast("Message sent"); var c = r.conversation; if (c && c.id) location.hash = "#/conversations?open=" + c.id; } });
  };
  K.acts["cf-req"] = function () { askDoc(S.cf.x.id); };
  K.acts["dc-ask"] = function (b) { askDoc(S.cf.x.id, b.getAttribute("data-id")); };
  function askDoc(sid, key) {
    A.get("/api/document-types", { destination: S.cf.x.destination }).then(function (t) {
      return K.dialog({ title: "Request a document", cap: S.cf.x.name, submit: "Send the request",
        body: K.field({ name: "type_key", label: "Document", type: "select", value: key, required: true, options: t.items.map(function (i) { return [i.key, i.label]; }) }) +
          K.field({ name: "message", label: "Message to the student", type: "textarea", max: 1000 }) + K.field({ name: "due_at", label: "Needed by", type: "date" }),
        onSubmit: function (d) { if (!d.due_at) delete d.due_at; return A.post("/api/students/" + sid + "/document-requests", d); } });
    }).then(function (r) { if (r) reload("Request sent to the student"); }, function (e) { K.toast(K.msg(e)); });
  }
  K.acts["cf-prof"] = function () {
    var p = S.cfProfile || {}, x = S.cf.x;
    var f = function (n, l, t, o) { return K.field(Object.assign({ name: n, label: l, type: t || "text", value: p[n] }, o || {})); };
    K.dialog({ title: "Edit profile", cap: x.name, submit: "Save", wide: true,
      body: '<div class="k-fr">' + f("dob", "Date of birth", "date") + f("gender", "Gender", "select", { options: K.opts([["female", "Female"], ["male", "Male"], ["other", "Other"], ["prefer_not", "Prefer not to say"]], "Not given") }) + "</div>" +
        '<div class="k-fr">' + f("nationality", "Nationality") + f("citizenship_no", "Citizenship no.") + "</div>" +
        '<div class="k-fr">' + f("passport_no", "Passport no.") + f("passport_place", "Passport place") + "</div>" +
        '<div class="k-fr">' + f("passport_issue", "Passport issued", "date") + f("passport_expiry", "Passport expires", "date") + "</div>" +
        '<div class="k-fr">' + f("address_perm", "Permanent address") + f("address_temp", "Current address") + "</div>" +
        '<div class="k-fr">' + f("district", "District") + f("marital_status", "Marital status", "select", { options: K.opts([["single", "Single"], ["married", "Married"], ["divorced", "Divorced"], ["widowed", "Widowed"], ["other", "Other"]], "Not given") }) + "</div>" +
        '<div class="k-fr">' + f("phone_alt", "Other phone", "tel") + f("email_alt", "Other email", "email") + "</div>" +
        '<div class="k-fr">' + f("emergency_name", "Emergency contact") + f("emergency_relation", "Relation") + "</div>" + f("emergency_phone", "Emergency phone", "tel") + f("source_note", "How they heard about us"),
      onSubmit: function (d) { var o = {}; Object.keys(d).forEach(function (k) { o[k] = d[k] === "" ? null : d[k]; }); return A.patch("/api/students/" + x.id + "/profile", o); } })
      .then(function (r) { if (r) reload("Profile saved"); });
  };

  K.acts["ab-edit"] = function (b) {
    var x = S.cf.x, id = b.getAttribute("data-id"), p = (id && S.cfAbroad[id]) || { status: "studying", country: x.destination };
    var f = function (n, l, t, o) { return K.field(Object.assign({ name: n, label: l, type: t || "text", value: p[n] == null ? "" : p[n] }, o || {})); };
    K.dialog({ title: id ? "Edit studies abroad" : "Add studies abroad", cap: x.name, submit: "Save", wide: true,
      body: '<div class="k-fr">' + f("level", "Level", "select", { options: K.opts(ABL, "Choose"), required: true }) + f("status", "Status", "select", { options: ABS }) + "</div>" +
        '<div class="k-fr">' + f("course", "Course") + f("institution", "University or college") + "</div>" +
        '<div class="k-fr">' + f("country", "Country") + f("city", "City") + "</div>" +
        '<div class="k-fr">' + f("year_from", "From (year)", "number") + f("year_to", "To (year)", "number") + "</div>" + f("notes", "Notes", "textarea", { max: 500 }),
      onSubmit: function (d) {
        if (!d.level) throw bad("level", "Choose the level.");
        var o = {}; Object.keys(d).forEach(function (k) { o[k] = d[k] === "" ? null : (k === "year_from" || k === "year_to" ? +d[k] : d[k]); });
        return id ? A.patch("/api/students/" + x.id + "/abroad/" + id, o) : A.post("/api/students/" + x.id + "/abroad", o);
      } }).then(function (r) { if (r) { S.cf.tab = "abroad"; reload("Saved"); } });
  };
  K.acts["ab-del"] = function (b) {
    var x = S.cf.x, i = S.cfAbroad[b.getAttribute("data-id")]; if (!i) return;
    K.confirm({ title: "Remove this entry?", text: abLine(i)[0] + ". The audit log keeps a copy.", ok: "Remove", onSubmit: function () { return A.delete("/api/students/" + x.id + "/abroad/" + i.id); } })
      .then(function (r) { if (r) reload("Removed"); });
  };

  /* ================= Alumni (2026-11-01): students who have left, and what and where they study now ================= */
  K.view("alumni", { title: "Alumni", eyebrow: E, lead: "Students who have left, with their course, university and years. Students update their own entry from the portal.",
    render: function (c) {
      var p = c.params;
      return A.get("/api/alumni", { q: p.q, country: p.country, status: p.status }).then(function (res) {
        var bs = res.by_status || {};
        return K.kpis([["Alumni", res.total], ["Studying", bs.studying || 0], ["Completed", bs.completed || 0], ["Not recorded yet", bs.unknown || 0]]) +
          K.filters([{ name: "q", label: "Search", type: "search", ph: "Name, ref, university, course", w: 1 }, { name: "country", label: "Country", type: "select", options: K.opts(BR.DEST, "Anywhere") },
            { name: "status", label: "Status", type: "select", options: [["", "Any status"]].concat(ABS, [["unknown", "Not recorded yet"]]) }], p) +
          K.table([{ t: "Student", f: function (x) { return BR.ref(x, "name", "ref_no"); } },
            { t: "Studying", f: function (x) { return x.institution || x.course ? esc([x.level, x.course].filter(Boolean).join(" · ")) + "<small>" + esc(x.institution || "") + "</small>" : '<span class="k-mute">Not recorded yet</span>'; } },
            { t: "Where", f: function (x) { return esc([x.city, x.country || x.destination].filter(Boolean).join(", ")); } },
            { t: "Years", f: function (x) { return esc([x.year_from, x.year_to].filter(Boolean).join(" to ")); } },
            { t: "Status", f: function (x) { return esc(x.status ? K.lab(x.status) : "Unknown") + (x.entries > 1 ? "<small>" + esc(x.entries + " entries") + "</small>" : ""); } }],
            res.items, { act: "ab-open", label: "Alumni", empty: "No alumni match these filters." });
      });
    } });
  K.acts["ab-open"] = function (b) { BR.openClient(b.getAttribute("data-id"), "abroad"); };

  /* ---------- documents ---------- */
  K.acts["dc-ok"] = function (b) { K.run(b, A.patch("/api/documents/" + b.getAttribute("data-id"), { status: "verified" }), "Verified").then(function () { reload(); }, function () { }); };
  K.acts["dc-no"] = function (b) {
    var id = b.getAttribute("data-id");
    K.dialog({ title: "Reject this document", submit: "Reject", body: K.field({ name: "reject_reason", label: "Reason (shown to the student)", type: "textarea", required: true, max: 500 }),
      onSubmit: function (d) { if (!(d.reject_reason || "").trim()) throw bad("reject_reason", "Tell the student what is wrong."); return A.patch("/api/documents/" + id, { status: "rejected", reject_reason: d.reject_reason.trim() }); } })
      .then(function (r) { if (r) reload("Rejected, the student is told"); });
  };
  K.acts["dc-exp"] = function (b) {
    var id = b.getAttribute("data-id");
    K.dialog({ title: "Expiry date", submit: "Save", body: K.field({ name: "expiry_date", label: "Expires on", type: "date", required: true }), onSubmit: function (d) { return A.patch("/api/documents/" + id, { expiry_date: d.expiry_date }); } })
      .then(function (r) { if (r) reload("Expiry saved"); });
  };
  K.acts["dc-up"] = function (b) {
    var key = b.getAttribute("data-id"), item = S.cfDocs[key], inp = K.$("#cfFile"); if (!inp) return;
    inp.value = "";
    inp.onchange = function () {
      var file = inp.files && inp.files[0]; if (!file) return;
      if (file.size > 10 * 1024 * 1024) { K.toast("That file is larger than 10 MB."); return; }
      K.dialog({ title: "Upload " + (item ? item.label : "document"), cap: file.name + ", " + K.bytes(file.size), submit: "Upload",
        body: (item && item.has_expiry ? K.field({ name: "expiry_date", label: "Expires on", type: "date" }) : "") + K.field({ name: "visibility", label: "Internal only (the student and parents do not see it)", type: "check" }) + K.field({ name: "note", label: "Note", max: 300 }),
        onSubmit: function (d) { return A.upload("/api/students/" + S.cf.id + "/documents", file, { type_key: key, filename: file.name, visibility: d.visibility ? "internal" : "student", expiry_date: d.expiry_date || undefined, note: d.note || undefined, request_id: item && item.request ? item.request.id : undefined }); } })
        .then(function (r) { if (r) reload("Uploaded"); });
    };
    inp.click();
  };

  /* ---------- applications and visa ---------- */
  K.acts["ap-add"] = function () {
    var x = S.cf.x;
    K.dialog({ title: "Add an application", cap: x.name, submit: "Add",
      body: K.field({ name: "institution", label: "Institution", required: true }) + K.field({ name: "course", label: "Course", required: true }) +
        '<div class="k-fr">' + K.field({ name: "destination", label: "Destination", type: "select", value: x.destination, options: BR.DEST }) + K.field({ name: "intake", label: "Intake", value: x.intake }) + "</div>" + K.field({ name: "status", label: "Status", type: "select", value: "draft", options: ASTAT }),
      onSubmit: function (d) { if (!d.institution) throw bad("institution", "Enter the institution."); if (!d.course) throw bad("course", "Enter the course."); if (!d.intake) delete d.intake; d.student_id = x.id; return A.post("/api/applications", d); } })
      .then(function (r) { if (r) reload("Application added"); });
  };
  K.acts["ap-st"] = function (b) {
    var a = S.cfApps[b.getAttribute("data-id")];
    K.dialog({ title: "Application", cap: a.institution, submit: "Save",
      body: K.field({ name: "status", label: "Status", type: "select", value: a.status, options: ASTAT }) + K.field({ name: "course", label: "Course", value: a.course }) + K.field({ name: "intake", label: "Intake", value: a.intake }),
      onSubmit: function (d) { return A.patch("/api/applications/" + a.id, d); } }).then(function (r) { if (r) reload("Saved"); });
  };
  K.acts["vs-adv"] = function (b) {
    var o = b.getAttribute("data-o");
    K.dialog({ title: o === "done" ? "Mark this step done" : "Mark this step blocked", submit: o === "done" ? "Step done" : "Blocked",
      body: K.field({ name: "note", label: o === "done" ? "Note (optional)" : "What is blocking it", type: "textarea", required: o !== "done", max: 1000 }) + (o === "done" ? K.field({ name: "due_days", label: "Next step due in (days)", type: "number", value: 7 }) : ""),
      onSubmit: function (d) { if (o !== "done" && !(d.note || "").trim()) throw bad("note", "Say what is blocking the step."); return A.post("/api/students/" + S.cf.id + "/visa/advance", { outcome: o, note: d.note || undefined, due_days: d.due_days ? +d.due_days : undefined }); } })
      .then(function (r) { if (r) reload(r.complete ? "Visa steps complete" : "Visa step updated"); });
  };

  /* ---------- fees ---------- */
  function money(n) { return Math.round(Number(String(n || "").replace(/[, ]/g, ""))); }
  K.acts["fe-add"] = function () {
    var x = S.cf.x;
    K.dialog({ title: "Add a fee", cap: x.name, submit: "Add",
      body: K.field({ name: "label", label: "What it is for", required: true }) + '<div class="k-fr">' + K.field({ name: "amount", label: "Amount (NPR)", type: "number", required: true, attrs: ' min="1" inputmode="numeric"' }) + K.field({ name: "due_at", label: "Due on", type: "date", required: true, value: K.dayOf(new Date(Date.now() + 14 * 864e5).toISOString()) }) + "</div>",
      onSubmit: function (d) { if (!d.label) throw bad("label", "Say what the fee is for."); if (!(money(d.amount) > 0)) throw bad("amount", "Enter the amount."); if (!d.due_at) throw bad("due_at", "Choose the due date."); return A.post("/api/students/" + x.id + "/fees", { label: d.label, amount: money(d.amount), due_at: d.due_at }); } })
      .then(function (r) { if (r) reload("Fee added"); });
  };
  K.acts["fe-pay"] = function (b) {
    var f = S.cfFees[b.getAttribute("data-id")];
    K.dialog({ title: "Record a payment", cap: f.label + ", balance " + K.money(f.balance, f.currency), submit: "Record and issue receipt",
      body: '<div class="k-fr">' + K.field({ name: "amount", label: "Amount (NPR)", type: "number", value: f.balance, required: true, attrs: ' min="1" inputmode="numeric"' }) + K.field({ name: "method", label: "Method", type: "select", options: PAY }) + "</div>" + K.field({ name: "reference", label: "Reference (optional)" }),
      onSubmit: function (d) { if (!(money(d.amount) > 0)) throw bad("amount", "Enter the amount."); return A.post("/api/fees/" + f.id + "/payments", { amount: money(d.amount), method: d.method, reference: d.reference || undefined }); } })
      .then(function (r) { var no = r && (r.payment ? r.payment.receipt_no : r.receipt_no); if (r) reload("Payment recorded" + (no ? ", receipt " + no : "")); });
  };
  K.acts["fe-waive"] = function (b) {
    var f = S.cfFees[b.getAttribute("data-id")], head = BR.isHead();
    K.dialog({ title: head ? "Waive or reduce this fee" : "Ask to waive or reduce", cap: f.label + ", " + K.money(f.amount, f.currency), submit: head ? "Change the fee" : "Send the request",
      body: '<p class="k-mute">Enter the new total. It cannot go below what is already paid (' + esc(K.money(f.paid, f.currency)) + "). Enter " + esc(K.num(f.paid)) + " to waive the rest.</p>" +
        K.field({ name: "amount", label: "New total (NPR)", type: "number", required: true, value: f.paid, attrs: ' min="0" inputmode="numeric"' }) + K.field({ name: "reason", label: "Reason", type: "textarea", required: true, max: 1000 }),
      onSubmit: function (d) {
        var amt = money(d.amount); if (!(amt >= 0)) throw bad("amount", "Enter the new total."); if (!(d.reason || "").trim()) throw bad("reason", "Give a reason.");
        if (!head) return A.post("/api/approvals", { kind: "fee_waiver", entity: "fee", entity_id: f.id, payload: { amount: amt }, reason: d.reason.trim() }).then(function (r) { r._req = 1; return r; });
        return A.post("/api/fees/" + f.id + "/waive", { amount: amt, reason: d.reason.trim() });
      } }).then(function (r) { if (r) reload(r._req ? "Request sent to the branch head" : "Fee changed"); });
  };
  K.acts["fe-ref"] = function (b) {
    var f = S.cfFees[b.getAttribute("data-id")], head = BR.isHead();
    K.dialog({ title: head ? "Refund" : "Ask for a refund", cap: f.label + ", paid " + K.money(f.paid, f.currency), submit: head ? "Refund" : "Send the request",
      body: '<div class="k-fr">' + K.field({ name: "amount", label: "Refund amount (NPR)", type: "number", required: true, attrs: ' min="1" inputmode="numeric"' }) + K.field({ name: "method", label: "Paid back by", type: "select", options: PAY }) + "</div>" + K.field({ name: "reason", label: "Reason", type: "textarea", required: true, max: 1000 }),
      onSubmit: function (d) {
        var amt = money(d.amount); if (!(amt > 0)) throw bad("amount", "Enter the amount."); if (!(d.reason || "").trim()) throw bad("reason", "Give a reason.");
        if (!head) return A.post("/api/approvals", { kind: "fee_refund", entity: "fee", entity_id: f.id, payload: { amount: amt, method: d.method }, reason: d.reason.trim() }).then(function (r) { r._req = 1; return r; });
        return A.post("/api/fees/" + f.id + "/refund", { amount: amt, method: d.method, reason: d.reason.trim() });
      } }).then(function (r) { if (r) reload(r._req ? "Request sent to the branch head" : "Refund recorded"); });
  };
  K.acts["fe-del"] = function (b) {
    var f = S.cfFees[b.getAttribute("data-id")];
    if (!BR.isHead()) return BR.ask({ kind: "fee_delete", entity: "fee", entity_id: f.id, label: "Remove " + f.label, text: "Removing a fee line needs the branch head." }).then(function (r) { if (r) reload(); });
    K.confirm({ title: "Remove this fee?", text: f.label + ", " + K.money(f.amount, f.currency) + ". It has no payments.", ok: "Remove", onSubmit: function () { return A.delete("/api/fees/" + f.id); } })
      .then(function (r) { if (r) reload("Fee removed"); });
  };
  /* receipt: GET /payments/:id/receipt answers JSON, so it is shown in a dialog that prints on its own (css/portal/pages/branch.css @media print) */
  K.acts["br-rcpt"] = function (b) {
    A.get("/api/payments/" + b.getAttribute("data-id") + "/receipt").then(function (r) {
      return K.dialog({ title: "Receipt " + r.receipt_no, cap: r.office || "Dolphin Education", submit: "Print", cancelText: "Close",
        body: K.dl([["Received from", r.student_name + (r.student_ref ? " (" + r.student_ref + ")" : "")], ["Branch", r.branch_name], ["For", r.label], ["Amount", K.money(r.amount, r.currency)], ["Method", r.method + (r.reference ? ", " + r.reference : "")],
          ["Paid on", K.dt(r.paid_at)], ["Balance after", K.money(r.balance_after, r.currency) + " of " + K.money(r.fee_total, r.currency)], ["Received by", r.received_by]]) + (r.note ? '<p class="k-mute k-small">' + esc(r.note) + "</p>" : ""),
        onOpen: function (d) { d.classList.add("br-rcpt"); },
        onSubmit: function () { window.print(); return false; } });
    }, function (e) { K.toast(K.msg(e)); });
  };
  K.acts["cl-ok"] = function (b) { K.run(b, A.post("/api/claims/" + b.getAttribute("data-id") + "/confirm", {}), "Payment confirmed, receipt issued").then(function () { reload(); }, function () { }); };
  K.acts["cl-no"] = function (b) {
    var id = b.getAttribute("data-id");
    K.dialog({ title: "Reject this payment report", submit: "Reject", body: K.field({ name: "reason", label: "Reason (shown to the family)", type: "textarea", required: true, max: 500 }),
      onSubmit: function (d) { if (!(d.reason || "").trim()) throw bad("reason", "Tell the family why."); return A.post("/api/claims/" + id + "/reject", { reason: d.reason.trim() }); } })
      .then(function (r) { if (r) reload("Rejected, the family is told"); });
  };

  /* ================= Documents screen ================= */
  K.view("documents", { title: "Documents", eyebrow: E, lead: "Documents asked from students, and documents about to expire. Open a file to check, verify or upload.",
    render: function (c) {
      var tab = c.params.tab || "requests";
      var seg = K.seg("tab", [["requests", "Requested"], ["expiring", "Expiring in 90 days"], ["missing", "Files with missing documents"]], tab, "Show");
      if (tab === "expiring") return A.get("/api/documents/expiring", { days: 90 }).then(function (r) {
        return seg + K.table([{ t: "Client", f: function (x) { return BR.ref(x); } }, { t: "Document", f: function (x) { return esc(x.kind || K.lab(x.type_key)); } }, { t: "Expires", f: function (x) { return esc(K.date(x.expiry_date)) + "<small>" + esc(x.days_to_expiry + " days") + "</small>"; } }],
          r.items.map(function (x) { return Object.assign({ rid: x.student_id }, x); }), { act: "cf-open", id: "student_id", label: "Expiring documents", empty: "Nothing expires in the next 90 days." });
      });
      if (tab === "missing") return A.get("/api/students", { missing_docs: 1, limit: 100 }).then(function (r) {
        return seg + K.table([{ t: "Client", f: function (x) { return BR.ref(x, "name", "ref_no"); } }, { t: "Destination", k: "destination" }, { t: "Stage", f: function (x) { return BR.stage(x.stage); } }], r.items, { act: "cf-open", label: "Files with missing documents", empty: "Every file has its required documents." });
      });
      return A.get("/api/document-requests", { status: "open" }).then(function (r) {
        S.reqRows = {}; r.items.forEach(function (x) { S.reqRows[x.id] = x; });
        return seg + K.table([{ t: "Client", f: function (x) { return BR.ref(x); } }, { t: "Document", f: function (x) { return esc(x.label) + (x.message ? "<small>" + esc(x.message) + "</small>" : ""); } },
          { t: "Needed by", f: function (x) { return esc(x.due_at ? K.date(x.due_at) : "No date") + (x.overdue ? "<small>Overdue</small>" : ""); } }, { t: "Asked by", f: function (x) { return esc(x.requested_by_name || "") + "<small>" + esc(K.ago(x.created_at)) + "</small>"; } },
          { t: "", noLink: true, f: function (x) { return btn("rq-cancel", "Cancel", x.id); } }],
          r.items, { act: "cf-open", id: "student_id", label: "Document requests", empty: "No open document requests." });
      });
    } });
  K.acts["rq-cancel"] = function (b) { K.run(b, A.post("/api/document-requests/" + b.getAttribute("data-id") + "/cancel", {}), "Request cancelled").then(function () { K.render(); }, function () { }); };
})();
