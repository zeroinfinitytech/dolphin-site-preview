/* Head office screens, part 1: Overview, Clients, Leads, Applications, Visa, Documents, Finance. Every list follows the branch switcher
   (K.state.branch) and shows the branch on each row. Head office reads; client files and document views are recorded in the audit log by the server. */
(function () {
  "use strict";
  var K = window.K, A = K.api, esc = K.esc, S = K.state;
  function E() { return S.branchLabel ? S.branchLabel() : "All branches"; }
  var STAGES = [["counselling", "Counselling"], ["applying", "Applying"], ["offer", "Offer"], ["visa", "Visa"], ["departed", "Departed"]];
  var DEST = [["USA", "USA"], ["UK", "UK"], ["Canada", "Canada"], ["Australia", "Australia"], ["New Zealand", "New Zealand"]];
  function br(x) { return esc(x.branch_name || S.bname(S.branchList, x.branch_id)); }
  function ref(x, name, r) { return esc(x[name || "student_name"] || x.name || "") + "<small>" + esc(x[r || "student_ref"] || x.ref_no || "") + "</small>"; }

  /* ================= Overview ================= */
  K.acts["ho-pick"] = function (b) { var s = K.$("#hoBranch"); if (s) { s.value = b.getAttribute("data-id"); K.acts["ho-branch"](s); } };
  K.view("overview", { title: "Overview", eyebrow: E, lead: "Enquiries, clients, money and the work waiting in each branch.",
    render: function () {
      return Promise.all([A.get("/api/oversight/summary", { branch_id: S.B() }), A.get("/api/reports/branch", { weeks: 8, branch_id: S.B() }).catch(function () { return null; })]).then(function (r) {
        var o = r[0], rep = r[1], t = o.totals || {}, rows = o.branches || [];
        var sum = function (k) { return rows.reduce(function (a, x) { return a + (+x[k] || 0); }, 0); };
        var stages = {}; rows.forEach(function (x) { Object.keys(x.students_by_stage || {}).forEach(function (k) { stages[k] = (stages[k] || 0) + x.students_by_stage[k]; }); });
        var attn = [
          [sum("approvals_pending"), "approval request is waiting for a branch head", "approval requests are waiting for a branch head", "#/approvals"], [sum("visa_overdue"), "visa step is overdue", "visa steps are overdue", "#/visa"],
          [sum("documents_expiring_90d"), "document expires within 90 days", "documents expire within 90 days", "#/documents"], [sum("waiting_public_chats"), "website chat is waiting for a reply", "website chats are waiting for a reply", "#/conversations"],
          [sum("forwards_open"), "hand-over is open in the branches", "hand-overs are open in the branches", "#/conversations"], [sum("stories_pending"), "story waits for approval", "stories wait for approval", "#/website"]].filter(function (a) { return a[0] > 0; });
        var tr = rep && rep.trend || [];
        var ser = function (k) { return tr.map(function (w) { return { x: K.date(w.week_start).replace(/ \d{4}$/, ""), t: "Week of " + K.date(w.week_start), y: w[k] || 0 }; }); };
        return K.kpis([["Enquiries", K.num(t.enquiries), sum("enquiries_open") ? "" : rows.length ? K.num(rows.reduce(function (a, x) { return a + (x.enquiries ? x.enquiries.last_7_days : 0); }, 0)) + " in the last 7 days" : ""],
          ["Clients", K.num(t.students)], ["Open conversations", K.num(t.open_conversations)], ["Fees collected", K.money(t.fees_collected)], ["Fees due", K.money(t.fees_due), "of " + K.money(t.fees_invoiced) + " invoiced"],
          ["Visa overdue", K.num(t.visa_overdue)], ["Approvals waiting", K.num(t.approvals_pending)], ["Stories waiting", K.num(t.stories_pending)]]) +
          K.sec("Needs attention", "", attn.length ? '<ul class="k-list">' + attn.map(function (a) { return '<li class="k-rowx"><span><b>' + esc(K.num(a[0])) + "</b> " + esc(a[0] === 1 ? a[1] : a[2]) + '</span><a class="k-b soft sm" href="' + a[3] + '">Open</a></li>'; }).join("") + "</ul>" : K.empty("Nothing waiting", "No overdue visa steps, expiring documents or waiting approvals right now.")) +
          (rows.length > 1 ? K.sec("Branches", "Pick a branch to see only its numbers everywhere.", K.table([
            { t: "Branch", f: function (x) { return esc(x.branch_name) + (x.is_default ? "<small>Default</small>" : "") + (x.active ? "" : "<small>Closed</small>"); }, noLink: 1 },
            { t: "Enquiries", cls: "r", f: function (x) { return esc(K.num(x.enquiries.total)) + "<small>" + esc(K.num(x.enquiries.open)) + " open, " + esc(K.num(x.enquiries.last_7_days)) + " this week</small>"; } },
            { t: "Clients", f: function (x) { return esc(K.num(x.students)); }, cls: "r" }, { t: "Conversations", cls: "r", f: function (x) { return esc(K.num(x.open_conversations)) + (x.waiting_public_chats ? "<small>" + x.waiting_public_chats + " website chats waiting</small>" : ""); } },
            { t: "Fees due", f: function (x) { return esc(K.money(x.fees.due, x.fees.currency)); }, cls: "r" }, { t: "Visa overdue", f: function (x) { return esc(K.num(x.visa_overdue)); }, cls: "r" },
            { t: "Approvals", f: function (x) { return esc(K.num(x.approvals_pending)); }, cls: "r" }, { t: "", f: function (x) { return '<button type="button" class="k-b soft sm" data-act="ho-pick" data-id="' + x.branch_id + '">Show only this</button>'; } }],
            rows.map(function (x) { x.id = x.branch_id; return x; }), { label: "Branches" })) : "") +
          (tr.length ? K.sec("Last eight weeks", rep.conversion_rate != null ? "Enquiry to client conversion " + rep.conversion_rate + " %." + (rep.chat_response_minutes ? " Median first reply in chat " + K.dur(rep.chat_response_minutes.median * 60) + "." : "") : "", '<div class="k-sm">' +
            K.mini("Enquiries a week", K.num(tr.reduce(function (a, w) { return a + w.enquiries; }, 0)), ser("enquiries")) + K.mini("New clients a week", K.num(tr.reduce(function (a, w) { return a + w.conversions; }, 0)), ser("conversions")) +
            K.mini("Fees collected a week", K.money(tr.reduce(function (a, w) { return a + w.fees_collected; }, 0)), ser("fees_collected"), { fmt: function (v) { return K.money(v); } }) + K.mini("Website chats a week", K.num(tr.reduce(function (a, w) { return a + w.chats; }, 0)), ser("chats")) + "</div>") : "") +
          K.sec("Clients by stage", "", K.bars(STAGES.map(function (s) { return { label: s[1], value: stages[s[0]] || 0 }; }).concat(Object.keys(stages).filter(function (k) { return !STAGES.some(function (s) { return s[0] === k; }); }).map(function (k) { return { label: K.lab(k), value: stages[k] }; })), { label: "Clients by stage" }));
      });
    } });

  /* ================= Clients ================= */
  K.view("clients", { title: "Clients", eyebrow: E, lead: "Every client file. Opening a file is recorded in the audit log.",
    render: function (c) {
      var p = c.params, arch = p.tab === "archived";
      return A.get("/api/students", { branch_id: S.B(), q: p.q, stage: p.stage, destination: p.destination, archived: arch ? 1 : undefined, page: p.page, limit: 50 }).then(function (res) {
        S.clientRows = res.items;
        return K.seg("tab", [["", "Active files"], ["archived", "Archived"]], p.tab || "", "Files") +
          K.filters([{ name: "q", label: "Search", type: "search", ph: "Name, ref, phone, email, passport", w: 1 }, { name: "stage", label: "Stage", type: "select", options: K.opts(STAGES, "Any stage") }, { name: "destination", label: "Destination", type: "select", options: K.opts(DEST, "Anywhere") }], p) +
          '<div class="k-sh"><span class="k-count">' + esc(K.num(res.total)) + ' files</span><button type="button" class="k-b soft sm" data-act="cl-csv">Download this list</button></div>' +
          K.table([{ t: "Client", f: function (x) { return ref(x, "name", "ref_no"); } }, { t: "Branch", f: br }, { t: "Destination", k: "destination" }, { t: "Stage", f: function (x) { return esc(K.lab(x.stage)); } }, { t: "Intake", k: "intake" },
            { t: arch ? "Archived" : "Updated", f: function (x) { return esc(arch ? K.date(x.archived_at) : K.ago(x.updated_at)) + (x.merged_into_id ? "<small>Merged</small>" : ""); } }],
            res.items, { act: "cl-open", label: "Clients", empty: arch ? "No archived files in this view." : "No client files match these filters." }) + K.pager(res, "files");
      });
    },
    after: function (c) { if (c.params.open) S.openClient(c.params.open); } });
  K.acts["cl-csv"] = function () {
    K.csv("clients-" + K.today() + ".csv", [["Ref", function (x) { return x.ref_no; }], ["Name", function (x) { return x.name; }], ["Branch", function (x) { return x.branch_name; }], ["Destination", function (x) { return x.destination; }], ["Stage", function (x) { return x.stage; }], ["Intake", function (x) { return x.intake; }], ["Email", function (x) { return x.email; }], ["Phone", function (x) { return x.phone; }]], S.clientRows || []);
  };
  K.acts["cl-open"] = function (b) { S.openClient(b.getAttribute("data-id")); };
  S.openClient = function (id) {
    var dr = K.drawer({ title: "Client file", cap: "Recorded in the audit log" });
    A.get("/api/students/" + id).then(function (x) {
      dr.title(x.name);
      var apps = x.applications || [], visa = x.visa_steps || [], docs = x.documents || [], fees = x.fees || [];
      var exp = function (f, t) { return '<a class="k-b soft sm" href="/api/students/' + x.id + "/export?format=" + f + '"' + (f === "html" ? ' target="_blank" rel="noopener"' : " download") + ">" + t + "</a>"; };
      dr.set(K.dl([["Reference", x.ref_no], ["Branch", x.branch_name], ["Stage", K.lab(x.stage)], ["Destination", x.destination], ["Intake", x.intake], ["Email", x.email], ["Phone", x.phone], ["Branch manager", x.assigned_manager_name], ["Tags", x.tags],
        ["Profile", x.profile_locked ? "Locked by the branch" : "Open for the student"], x.archived_at ? ["Archived", K.date(x.archived_at) + (x.merged_into_id ? ", merged into another file" : "")] : null]) +
        '<div class="k-acts" style="margin-top:4px">' + (x.archived_at && !x.merged_into_id ? '<button type="button" class="k-b p sm" data-act="cl-restore" data-id="' + x.id + '">Restore file</button>' : "") +
        exp("html", "Printable summary") + exp("json", "Data (JSON)") + exp("zip", "Everything (ZIP)") + '<a class="k-b soft sm" href="/api/students/' + x.id + '/documents.zip" download>Verified documents (ZIP)</a></div>' +
        '<h3 class="k-h2" style="margin-top:16px">Applications</h3>' + (apps.length ? '<ul class="k-list">' + apps.map(function (a) { return '<li class="k-rowx"><span><b>' + esc(a.institution) + "</b> " + esc(a.course || "") + '<br><span class="k-mute k-small">' + esc([a.destination, a.intake].filter(Boolean).join(", ")) + "</span></span>" + K.st(K.lab(a.status), "i") + "</li>"; }).join("") + "</ul>" : '<p class="k-mute">No applications yet.</p>') +
        '<h3 class="k-h2" style="margin-top:16px">Visa steps</h3>' + (visa.length ? '<ul class="k-list">' + visa.map(function (v) { return '<li class="k-rowx"><span>' + esc(v.step_label || v.label || K.lab(v.step_key)) + (v.due_at && v.status !== "done" ? '<br><span class="k-mute k-small">Due ' + esc(K.date(v.due_at)) + "</span>" : "") + "</span>" + K.st(K.lab(v.status), v.status === "done" ? "m" : v.overdue ? "" : "i") + "</li>"; }).join("") + "</ul>" : '<p class="k-mute">No visa steps.</p>') +
        '<h3 class="k-h2" style="margin-top:16px">Documents</h3><p class="k-sub">Opening a document is recorded in the audit log.</p>' + (docs.length ? '<ul class="k-list">' + docs.map(function (d) {
          return '<li class="k-rowx"><span>' + esc(d.kind || d.label || K.lab(d.type_key)) + (d.version > 1 ? " (version " + d.version + ")" : "") + '<br><span class="k-mute k-small">' + esc([d.filename, d.expiry_date ? "expires " + K.date(d.expiry_date) : "", d.visibility === "internal" ? "internal" : ""].filter(Boolean).join(", ")) + "</span></span><span>" + K.st(K.lab(d.status), d.status === "rejected" ? "" : "m") + (d.has_file ? ' <a class="k-b soft sm" href="/api/documents/' + d.id + '/file" target="_blank" rel="noopener">Open</a>' : "") + "</span></li>";
        }).join("") + "</ul>" : '<p class="k-mute">No documents uploaded.</p>') +
        '<h3 class="k-h2" style="margin-top:16px">Fees</h3>' + (fees.length ? '<ul class="k-list">' + fees.map(function (f) { return '<li class="k-rowx"><span>' + esc(f.label) + '<br><span class="k-mute k-small">' + esc(K.money(f.paid, f.currency)) + " paid of " + esc(K.money(f.amount, f.currency)) + "</span></span>" + K.st(K.lab(f.status), f.status === "paid" ? "m" : "i") + "</li>"; }).join("") + "</ul>" : '<p class="k-mute">No fee lines.</p>'));
    }, function (e) { dr.set(K.fail(e)); });
  };
  K.acts["cl-restore"] = function (b) {
    var id = b.getAttribute("data-id");
    K.confirm({ title: "Restore this file?", text: "The file comes back into the branch lists and the branch team can work on it again.", ok: "Restore", onSubmit: function () { return A.post("/api/students/" + id + "/restore", {}); } })
      .then(function (r) { if (r) { K.toast("File restored"); var d = K.drawerOpen(); if (d) d.close(true); K.render(); } });
  };

  /* ================= Leads ================= */
  var LSTAT = [["lead", "New"], ["counselling", "Counselling"], ["applying", "Applying"], ["offer", "Offer"], ["visa", "Visa"], ["departed", "Departed"], ["lost", "Lost"]];
  var LSRC = [["web_booking", "Website booking"], ["web_contact", "Website contact"], ["web_chat", "Website chat"], ["event", "Event"], ["walk_in", "Walk in"], ["phone", "Phone"], ["referral", "Referral"], ["franchise_enquiry", "Franchise enquiry"]];
  function lsrc(s) { var x = LSRC.filter(function (o) { return o[0] === s; })[0]; return x ? x[1] : K.lab(s); }
  K.view("leads", { title: "Leads", eyebrow: E, lead: "Enquiries from the website, chats, events and the office. Branches work them; head office reads.",
    render: function (c) {
      var p = c.params;
      return A.get("/api/leads", { branch_id: S.B(), q: p.q, status: p.status, source: p.source, destination: p.destination, page: p.page, limit: 50 }).then(function (res) {
        S.leadRows = {}; res.items.forEach(function (l) { S.leadRows[l.id] = l; });
        return K.filters([{ name: "q", label: "Search", type: "search", ph: "Name, phone or email", w: 1 }, { name: "status", label: "Status", type: "select", options: K.opts(LSTAT, "Any status") }, { name: "source", label: "Source", type: "select", options: K.opts(LSRC, "Any source") }, { name: "destination", label: "Destination", type: "select", options: K.opts(DEST, "Anywhere") }], p) +
          K.table([{ t: "Lead", f: function (x) { return esc(x.name) + "<small>" + esc(x.phone || x.email || "") + "</small>"; } }, { t: "Branch", f: br }, { t: "Source", f: function (x) { return esc(lsrc(x.source)); } }, { t: "Status", f: function (x) { return K.st(K.lab(x.status === "lead" ? "new" : x.status), x.status === "lost" ? "m" : "i"); } },
            { t: "Destination", f: function (x) { return esc([x.destination, x.level].filter(Boolean).join(", ")); } }, { t: "Came in", f: function (x) { return esc(K.date(x.created_at)); } }], res.items, { act: "ld-open", label: "Leads", empty: "No leads match these filters." }) + K.pager(res, "leads");
      });
    } });
  K.acts["ld-open"] = function (b) {
    var x = S.leadRows[b.getAttribute("data-id")];
    K.drawer({ title: x.name, cap: "Lead", body: K.dl([["Branch", x.branch_name], ["Status", K.lab(x.status)], ["Source", lsrc(x.source)], ["Phone", x.phone], ["Email", x.email], ["Destination", x.destination], ["Level", x.level], ["Notes", x.notes], ["Came in", K.dt(x.created_at)], ["Updated", K.dt(x.updated_at)]]) +
      (x.student_id ? '<div class="k-acts" style="margin-top:8px"><button type="button" class="k-b soft sm" data-act="cl-open" data-id="' + x.student_id + '">Open the client file</button></div>' : '<p class="k-mute" style="margin-top:8px">Not a client file yet. The branch converts a lead when the person signs up.</p>') });
  };

  /* ================= Applications ================= */
  var ASTAT = [["draft", "Draft"], ["submitted", "Submitted"], ["conditional", "Conditional offer"], ["unconditional", "Unconditional offer"], ["accepted", "Accepted"], ["rejected", "Rejected"], ["withdrawn", "Withdrawn"]];
  K.view("applications", { title: "Applications", eyebrow: E, lead: "University applications and offers across the branches.",
    render: function (c) {
      var p = c.params;
      return A.get("/api/applications", { branch_id: S.B(), status: p.status, destination: p.destination, page: p.page, limit: 50 }).then(function (res) {
        return K.filters([{ name: "status", label: "Status", type: "select", options: K.opts(ASTAT, "Any status") }, { name: "destination", label: "Destination", type: "select", options: K.opts(DEST, "Anywhere") }], p) +
          K.table([{ t: "Client", f: function (x) { return ref(x); } }, { t: "Branch", f: br }, { t: "University and course", f: function (x) { return esc(x.institution) + "<small>" + esc(x.course || "") + "</small>"; } }, { t: "Destination", f: function (x) { return esc([x.destination, x.intake].filter(Boolean).join(", ")); } },
            { t: "Status", f: function (x) { return K.st(K.lab(x.status), x.status === "rejected" || x.status === "withdrawn" ? "m" : "i"); } }],
            res.items.map(function (x) { x.cid = x.student_id; return x; }), { act: "cl-open", id: "student_id", label: "Applications", empty: "No applications match these filters." }) + K.pager(res, "applications");
      });
    } });

  /* ================= Visa ================= */
  K.view("visa", { title: "Visa", eyebrow: E, lead: "Open visa steps, overdue first. Branch managers move them along on the client file.",
    render: function () {
      return A.get("/api/visa/due", { branch_id: S.B() }).then(function (r) {
        var items = r.items.slice().sort(function (a, b) { return (b.overdue ? 1 : 0) - (a.overdue ? 1 : 0) || String(a.due_at).localeCompare(String(b.due_at)); }), od = items.filter(function (x) { return x.overdue; }).length;
        return K.kpis([["Open steps", K.num(items.length)], ["Overdue", K.num(od)], ["Blocked", K.num(items.filter(function (x) { return x.status === "blocked"; }).length)]]) + '<div style="height:18px"></div>' +
          K.table([{ t: "Client", f: function (x) { return ref(x); } }, { t: "Branch", f: br }, { t: "Step", f: function (x) { return esc(x.step_label) + "<small>" + esc(x.destination) + "</small>"; } }, { t: "Due", f: function (x) { return esc(K.date(x.due_at)) + "<small>" + esc(K.ago(x.due_at)) + "</small>"; } },
            { t: "State", f: function (x) { return x.overdue ? K.st("Overdue") : K.st(K.lab(x.status), "i"); } }], items, { act: "cl-open", id: "student_id", label: "Visa steps", emptyTitle: "No open visa steps", empty: "Every visa file in this view is up to date." });
      });
    } });

  /* ================= Documents ================= */
  function codeMap() { var m = {}; (S.branchList || []).forEach(function (b) { if (b.code) m[b.code] = b.id; }); return m; }
  function inBranch(refNo, bid) { if (!S.B()) return true; var code = String(refNo || "").split("-")[0]; return String(codeMap()[code]) === String(S.branch) || (bid && String(bid) === String(S.branch)); }
  K.view("documents", { title: "Documents", eyebrow: E, lead: "Head office reads documents; the branches check and verify them. Opening a file is recorded in the audit log.",
    render: function (c) {
      var p = c.params, tab = p.tab || "expiring";
      var head = K.seg("tab", [["expiring", "Expiring"], ["requests", "Requested from clients"], ["client", "One client's documents"]], tab, "Documents");
      if (tab === "requests") return A.get("/api/document-requests", { status: p.status || "open" }).then(function (r) {
        var items = r.items.filter(function (x) { return inBranch(x.student_ref, x.branch_id); });
        return head + K.seg("status", [["open", "Open"], ["fulfilled", "Received"], ["cancelled", "Cancelled"]], p.status || "open", "Request status") +
          K.table([{ t: "Client", f: function (x) { return ref(x); } }, { t: "Document", f: function (x) { return esc(x.label) + (x.message ? "<small>" + esc(x.message) + "</small>" : ""); } }, { t: "Due", f: function (x) { return esc(x.due_at ? K.date(x.due_at) : "No date") + (x.overdue ? "<small>Overdue</small>" : ""); } },
            { t: "Asked by", f: function (x) { return esc(x.requested_by_name || "") + "<small>" + esc(K.date(x.created_at)) + "</small>"; } }], items, { act: "cl-open", id: "student_id", label: "Document requests", emptyTitle: "No requests here", empty: "No document requests with this status in this view." });
      });
      if (tab === "client") return A.get("/api/students", { branch_id: S.B(), limit: 100 }).then(function (st) {
        var sel = '<form class="k-filters" data-chg="k-filter" data-form="k-filter"><input type="hidden" name="tab" value="client"><div class="k-fld w"><label for="dcS">Client</label><select class="k-in" id="dcS" name="student_id">' +
          [["", "Choose a client"]].concat(st.items.map(function (s) { return [String(s.id), s.name + " (" + (s.ref_no || "") + ", " + (s.branch_name || "") + ")"]; })).map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(p.student_id || "") === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></div></form>";
        if (!p.student_id) return head + sel + K.empty("Pick a client", "Their checklist shows what is verified, received, expiring, rejected or missing.");
        return A.get("/api/students/" + p.student_id + "/checklist").then(function (ck) {
          var s = ck.summary || {};
          return head + sel + K.kpis([["Required", K.num(s.required)], ["Verified", K.num(s.verified)], ["Received", K.num(s.received)], ["Expiring", K.num(s.expiring)], ["Rejected", K.num(s.rejected)], ["Missing", K.num(s.missing)]]) + '<div style="height:16px"></div>' +
            K.table([{ t: "Document", f: function (x) { return esc(x.label) + "<small>" + esc(K.lab(x.category)) + (x.required ? ", required" : ", optional") + "</small>"; } }, { t: "State", f: function (x) { return K.st(K.lab(x.status), x.status === "verified" ? "m" : x.status === "received" ? "i" : ""); } },
              { t: "Expiry", f: function (x) { return esc(x.expiry_date ? K.date(x.expiry_date) : ""); } }, { t: "File", f: function (x) { var d = x.document; if (!d) return x.request ? '<span class="k-mute k-small">Requested</span>' : ""; return esc(d.filename || "") + (d.has_file ? ' <a class="k-b soft sm" href="/api/documents/' + d.id + '/file" target="_blank" rel="noopener">Open</a>' : '<small>No file stored (sample)</small>'); } }],
              ck.items.map(function (x, i) { x.id = i; return x; }), { label: "Checklist" });
        });
      });
      return A.get("/api/documents/expiring", { days: p.days || 90 }).then(function (r) {
        var items = r.items.filter(function (x) { return inBranch(x.student_ref, x.branch_id); });
        return head + K.seg("days", [["30", "30 days"], ["90", "90 days"], ["180", "180 days"]], String(p.days || 90), "Expiring within") +
          K.table([{ t: "Client", f: function (x) { return ref(x); } }, { t: "Document", f: function (x) { return esc(x.kind || K.lab(x.type_key)); } }, { t: "Expires", f: function (x) { return esc(K.date(x.expiry_date)) + "<small>" + esc(x.expired ? "Expired" : "in " + x.days_to_expiry + " days") + "</small>"; } },
            { t: "State", f: function (x) { return K.st(x.expired ? "Expired" : "Expiring", ""); } }], items, { act: "cl-open", id: "student_id", label: "Expiring documents", emptyTitle: "Nothing expiring", empty: "No document expires in this period in this view." });
      });
    } });

  /* ================= Finance ================= */
  K.view("finance", { title: "Finance", eyebrow: E, lead: "Fees, payments and payment claims, read only. Branch managers record payments and issue receipts.",
    render: function (c) {
      var p = c.params, tab = p.tab || "summary";
      var head = K.seg("tab", [["summary", "By branch"], ["fees", "Fee lines"], ["claims", "Payment claims"]], tab, "Finance");
      if (tab === "fees") return A.get("/api/fees", { branch_id: S.B(), status: p.status }).then(function (r) {
        var s = r.summary || {}, items = r.items || [];
        return head + K.seg("status", [["", "All"], ["open", "Unpaid"], ["part", "Part paid"], ["paid", "Paid"]], p.status || "", "Fee status") +
          K.kpis([["Invoiced", K.money(s.invoiced)], ["Collected", K.money(s.collected)], ["Balance", K.money(s.balance)], ["Overdue", s.overdue != null ? (typeof s.overdue === "number" && s.overdue > 1000 ? K.money(s.overdue) : K.num(s.overdue)) : null]]) + '<div style="height:16px"></div>' +
          K.table([{ t: "Client", f: function (x) { return ref(x); }, noLink: 1 }, { t: "Branch", f: br }, { t: "Fee", f: function (x) { return esc(x.label) + "<small>Due " + esc(K.date(x.due_at)) + "</small>"; } }, { t: "Amount", f: function (x) { return esc(K.money(x.amount, x.currency)); }, cls: "r" },
            { t: "Paid", f: function (x) { return esc(K.money(x.paid, x.currency)); }, cls: "r" }, { t: "Balance", f: function (x) { return esc(K.money(x.balance, x.currency)); }, cls: "r" }, { t: "State", f: function (x) { return x.overdue ? K.st("Overdue") : K.st(K.lab(x.status === "open" ? "unpaid" : x.status), x.status === "paid" ? "m" : "i"); } }],
            items, { label: "Fee lines", empty: "No fee lines match." });
      });
      if (tab === "claims") return A.get("/api/claims", { branch_id: S.B(), status: p.status || "pending" }).then(function (r) {
        return head + K.seg("status", [["pending", "Waiting"], ["confirmed", "Confirmed"], ["rejected", "Rejected"]], p.status || "pending", "Claim status") +
          K.table([{ t: "Client", f: function (x) { return ref(x); }, noLink: 1 }, { t: "Branch", f: br }, { t: "Amount", f: function (x) { return esc(K.money(x.amount, x.currency)); }, cls: "r" }, { t: "Paid with", f: function (x) { return esc(x.method || "") + "<small>" + esc(x.reference || "") + "</small>"; } },
            { t: "Reported", f: function (x) { return esc(K.dt(x.created_at)); } }, { t: "State", f: function (x) { return K.st(K.lab(x.status), x.status === "pending" ? "i" : "m"); } }], r.items || [], { label: "Payment claims", emptyTitle: "No claims here", empty: "Students and parents report payments here; none match this view." });
      });
      return A.get("/api/oversight/summary", { branch_id: S.B() }).then(function (o) {
        var rows = o.branches || [], t = o.totals || {};
        return head + K.kpis([["Invoiced", K.money(t.fees_invoiced)], ["Collected", K.money(t.fees_collected)], ["Due", K.money(t.fees_due)], ["Collected share", t.fees_invoiced ? Math.round(t.fees_collected / t.fees_invoiced * 100) + " %" : null]]) +
          K.sec("By branch", "", K.table([{ t: "Branch", f: function (x) { return esc(x.branch_name); } }, { t: "Invoiced", f: function (x) { return esc(K.money(x.fees.invoiced, x.fees.currency)); }, cls: "r" }, { t: "Collected", f: function (x) { return esc(K.money(x.fees.collected, x.fees.currency)); }, cls: "r" }, { t: "Due", f: function (x) { return esc(K.money(x.fees.due, x.fees.currency)); }, cls: "r" }],
            rows.map(function (x) { x.id = x.branch_id; return x; }), { label: "Fees by branch" }) + '<div style="height:20px"></div>' + K.bars(rows.map(function (x) { return { label: x.branch_name + ", collected", value: x.fees.collected }; }), { fmt: function (v) { return K.money(v); }, label: "Collected by branch" }));
      });
    } });
})();
