/* Branch portal, office: Fees and payments (branch ledger, payment claims), Approvals (head decides; manager follows own requests),
   Team (head manages the branch's manager, content managers, student and parent logins within the staffing limits; manager reads),
   Reports (head only), Audit (branch), Settings (office details, read). */
(function () {
  "use strict";
  var K = window.K, A = K.api, esc = K.esc, S = K.state, BR = window.BR, E = BR.E;
  function bad(field, msg) { var e = new Error("x"); e.details = {}; e.details[field] = msg; return e; }

  /* ================= Fees and payments ================= */
  K.view("finance", { title: "Fees and payments", eyebrow: E, lead: "The branch ledger. Record payments and handle reductions on the client file.",
    render: function (c) {
      var p = c.params, tab = p.tab || "fees";
      var seg = K.seg("tab", [["fees", "Fees"], ["claims", "Payments reported by families"]], tab, "Show");
      if (tab === "claims") return A.get("/api/claims", { status: p.status || "pending" }).then(function (r) {
        return seg + K.seg("status", [["pending", "Waiting"], ["confirmed", "Confirmed"], ["rejected", "Rejected"]], p.status || "pending", "Status") +
          K.table([{ t: "Client", f: function (x) { return BR.ref(x); } }, { t: "Amount", f: function (x) { return esc(K.money(x.amount, x.currency)); }, cls: "r" }, { t: "Method", f: function (x) { return esc(x.method) + "<small>" + esc(x.reference || "") + "</small>"; } },
            { t: "Reported", f: function (x) { return esc(K.ago(x.created_at)); } }, { t: "State", f: function (x) { return K.st(K.lab(x.status), x.status === "pending" ? "i" : "m"); } }],
            r.items, { act: "cf-open", id: "student_id", label: "Payment reports", empty: "No payment reports in this view. Families report eSewa, Khalti or bank payments from their portal." }) +
          '<p class="k-mute k-small">Open the client file to confirm a report (a receipt is issued) or reject it with a reason.</p>';
      });
      return A.get("/api/fees", { status: p.status || undefined }).then(function (r) {
        var sm = r.summary || {};
        return seg + K.kpis([["Invoiced", K.money(sm.invoiced, sm.currency)], ["Collected", K.money(sm.collected, sm.currency)], ["Balance", K.money(sm.balance, sm.currency)], ["Overdue", K.money(sm.overdue, sm.currency), (sm.overdue_count || 0) + " lines"]]) +
          K.seg("status", [["", "All"], ["open", "Unpaid"], ["part", "Part paid"], ["paid", "Paid"]], p.status || "", "Status") +
          K.table([{ t: "Client", f: function (x) { return BR.ref(x); } }, { t: "Fee", f: function (x) { return esc(x.label); } }, { t: "Amount", f: function (x) { return esc(K.money(x.amount, x.currency)); }, cls: "r" },
            { t: "Paid", f: function (x) { return esc(K.money(x.paid, x.currency)); }, cls: "r" }, { t: "Due", f: function (x) { return esc(x.due_at ? K.date(x.due_at) : "") + (x.overdue ? "<small>Overdue</small>" : ""); } }, { t: "State", f: function (x) { return K.st(K.lab(x.status), x.status === "paid" ? "m" : x.overdue ? "" : "i"); } }],
            r.items, { act: "cf-open", id: "student_id", label: "Fees", empty: "No fees in this view." });
      });
    } });

  /* ================= Approvals ================= */
  K.view("approvals", { title: "Approvals", eyebrow: E, lead: "Sensitive changes the branch manager asks for: fee reductions and refunds, archiving or merging files, unlocking profiles.",
    render: function (c) {
      var p = c.params, st = p.status == null ? "pending" : p.status, head = BR.isHead();
      return A.get("/api/approvals", { status: st || undefined, mine: head ? undefined : 1 }).then(function (r) {
        S.apprRows = {}; r.items.forEach(function (x) { S.apprRows[x.id] = x; });
        return K.seg("status", [["pending", "Waiting"], ["approved", "Approved"], ["rejected", "Rejected"], ["cancelled", "Cancelled"], ["", "All"]], st, "Status") +
          K.table([{ t: "Request", f: function (x) { return esc(x.kind_label || K.lab(x.kind)) + "<small>" + esc(x.entity_label || "") + "</small>"; } },
            { t: "Asked by", f: function (x) { return esc(x.requested_by_name || "") + "<small>" + esc(K.ago(x.created_at)) + "</small>"; } }, { t: "Reason", f: function (x) { return esc(x.reason || ""); } },
            { t: "State", f: function (x) { return K.st(K.lab(x.status === "pending" ? "waiting" : x.status), x.status === "pending" ? "i" : "m"); } }],
            r.items, { act: "ar-open", label: "Approval requests", emptyTitle: "Nothing here", empty: head ? "No requests with this status." : "You have no requests with this status." });
      });
    } });
  function payload(x) {
    var p = x.payload || {};
    if (x.kind === "fee_waiver") return "New total " + K.money(p.amount);
    if (x.kind === "fee_refund") return "Refund " + K.money(p.amount) + (p.method ? " by " + p.method : "");
    if (x.kind === "client_merge") return "Merge file " + (p.merge_id || "") + " into this one";
    return "";
  }
  K.acts["ar-open"] = function (b) {
    var x = S.apprRows[b.getAttribute("data-id")], head = BR.isHead(), mine = +x.requested_by === +S.me.id;
    K.drawer({ title: x.kind_label || K.lab(x.kind), cap: x.entity_label, body: K.dl([["Asked by", x.requested_by_name], ["Asked on", K.dt(x.created_at)], ["Reason", x.reason], ["What would happen", payload(x)],
      ["State", K.lab(x.status === "pending" ? "waiting" : x.status)], ["Decided by", x.decided_by_name], ["Decided on", x.decided_at ? K.dt(x.decided_at) : ""], ["Decision note", x.decision_note]]) +
      (x.status === "pending" ? '<div class="k-acts br-acts">' + (head ? '<button type="button" class="k-b p sm" data-act="ar-do" data-k="approve" data-id="' + x.id + '">Approve and do it</button><button type="button" class="k-b soft sm" data-act="ar-do" data-k="reject" data-id="' + x.id + '">Reject</button>' : "") +
        (mine ? '<button type="button" class="k-b soft sm" data-act="ar-do" data-k="cancel" data-id="' + x.id + '">Cancel my request</button>' : "") + "</div>" : "") +
      (x.entity === "student" ? '<div class="k-acts br-acts"><button type="button" class="k-b soft sm" data-act="cf-open" data-id="' + x.entity_id + '">Open the client file</button></div>' : "") });
  };
  K.acts["ar-do"] = function (b) {
    var id = b.getAttribute("data-id"), k = b.getAttribute("data-k");
    var p = k === "cancel" ? K.run(b, A.post("/api/approvals/" + id + "/cancel", {}), "Request cancelled") :
      K.dialog({ title: k === "approve" ? "Approve this request" : "Reject this request", submit: k === "approve" ? "Approve and do it" : "Reject",
        body: (k === "approve" ? '<p class="k-mute">The change is made at once and recorded in the audit log. The branch manager is told.</p>' : "") + K.field({ name: "note", label: k === "approve" ? "Note (optional)" : "Why (shown to the branch manager)", type: "textarea", required: k === "reject", max: 1000 }),
        onSubmit: function (d) { if (k === "reject" && !(d.note || "").trim()) throw bad("note", "Say why you reject it."); return A.post("/api/approvals/" + id + "/" + k, { note: d.note || undefined }); } });
    Promise.resolve(p).then(function (r) { if (r) { if (k !== "cancel") K.toast(k === "approve" ? "Approved and done" : "Rejected"); var dr = K.drawerOpen(); if (dr) dr.close(true); BR.badges(); K.render(); } }, function () { });
  };

  /* ================= Team ================= */
  var TEAM_ROLES = [["branch_manager", "Branch manager"], ["content_manager", "Content manager"], ["student", "Student"], ["parent", "Parent"]];
  K.view("team", { title: "Team", eyebrow: E, lead: "People with a login in the branch. Each branch has one branch head, one branch manager and at most two content managers.",
    render: function (c) {
      var p = c.params;
      return A.get("/api/users", { role: p.role || undefined, active: p.active || undefined, q: p.q, page: p.page, limit: 50 }).then(function (r) {
        S.teamRows = {}; r.items.forEach(function (u) { S.teamRows[u.id] = u; }); S.teamLimits = r.limits || {};
        var lim = r.limits || {}, staffN = {}; r.items.forEach(function (u) { if (u.active) staffN[u.role] = (staffN[u.role] || 0) + 1; });
        return K.kpis([["Branch head", (staffN.branch_head || 0) + " of " + (lim.branch_head || 1)], ["Branch manager", (staffN.branch_manager || 0) + " of " + (lim.branch_manager || 1)], ["Content managers", (staffN.content_manager || 0) + " of " + (lim.content_manager || 2)]]) +
          K.filters([{ name: "q", label: "Search", type: "search", ph: "Name or email", w: 1 }, { name: "role", label: "Role", type: "select", options: K.opts([["branch_head", "Branch head"]].concat(TEAM_ROLES), "Any role") }, { name: "active", label: "Status", type: "select", options: [["", "Any"], ["1", "Active"], ["0", "Deactivated"]] }], p) +
          K.table([{ t: "Name", f: function (u) { return esc(u.name) + "<small>" + esc(u.email) + "</small>"; } }, { t: "Role", f: function (u) { return esc(K.role(u.role)); } },
            { t: "Status", f: function (u) { return u.active ? (u.online ? K.st("Online", "i") : K.st("Active", "m")) : K.st("Deactivated"); } }, { t: "Last seen", f: function (u) { return esc(u.last_seen_at ? K.ago(u.last_seen_at) : "Not yet"); } }],
            r.items, { act: "tm-open", label: "Team", empty: "No people match these filters." }) + K.pager(r, "people");
      });
    } });
  K.acts["tm-new"] = function () {
    Promise.all([A.get("/api/students", { limit: 100 })]).then(function (r) {
      var st = r[0].items;
      return K.dialog({ title: "Add a person", cap: BR.branchName(), submit: "Create the login",
        body: '<div class="k-fr">' + K.field({ name: "name", label: "Full name", required: true }) + K.field({ name: "email", label: "Email", type: "email", required: true }) + "</div>" +
          '<div class="k-fr">' + K.field({ name: "role", label: "Role", type: "select", options: TEAM_ROLES }) + K.field({ name: "phone", label: "Phone", type: "tel" }) + "</div>" +
          K.field({ name: "student_id", label: "Client file (students and parents)", type: "select", options: K.opts(st.map(function (s) { return [String(s.id), s.name + " (" + s.ref_no + ")"]; }), "Not needed for staff") }) +
          K.field({ name: "password", label: "First password", value: K.password(), required: true, hint: "At least 10 characters. Share it privately; they can change it after signing in." }),
        onSubmit: function (d) {
          if ((d.role === "student" || d.role === "parent") && !d.student_id) throw bad("student_id", "Choose the client file for this login.");
          var b = { name: d.name, email: d.email, role: d.role, password: d.password, phone: d.phone || undefined };
          if (d.student_id && (d.role === "student" || d.role === "parent")) b.student_id = +d.student_id;
          return A.post("/api/users", b);
        } });
    }).then(function (r) { if (r) { K.toast("Login created"); K.render(); } }, function (e) { K.toast(K.msg(e)); });
  };
  K.acts["tm-open"] = function (b) {
    var u = S.teamRows[b.getAttribute("data-id")], head = BR.isHead(), self = +u.id === +S.me.id, canManage = head && !self && u.role !== "branch_head";
    K.drawer({ title: u.name, cap: K.role(u.role), body: K.dl([["Email", u.email], ["Role", K.role(u.role)], ["Phone", u.phone], ["Status", u.active ? "Active" : "Deactivated"], ["Last seen", u.last_seen_at ? K.dt(u.last_seen_at) : "Not yet"], ["Login made", K.date(u.created_at)]]) +
      (canManage ? '<div class="k-acts br-acts"><button type="button" class="k-b soft sm" data-act="tm-edit" data-id="' + u.id + '">Edit</button><button type="button" class="k-b soft sm" data-act="tm-pass" data-id="' + u.id + '">Set a new password</button>' +
        (u.active ? '<button type="button" class="k-b soft sm d" data-act="tm-off" data-id="' + u.id + '">Deactivate</button>' : '<button type="button" class="k-b p sm" data-act="tm-on" data-id="' + u.id + '">Activate</button>') + "</div>" :
        !head && u.role === "content_manager" && u.active ? '<div class="k-acts br-acts"><button type="button" class="k-b soft sm" data-act="tm-ask" data-id="' + u.id + '">Ask the head to deactivate</button></div>' :
        '<p class="k-mute">' + esc(self ? "This is you. Change your password from the account menu." : head ? "Head office manages the branch head login." : "The branch head manages team logins.") + "</p>") });
  };
  K.acts["tm-edit"] = function (b) {
    var u = S.teamRows[b.getAttribute("data-id")], staff = u.role === "branch_manager" || u.role === "content_manager";
    K.dialog({ title: "Edit " + u.name, submit: "Save",
      body: K.field({ name: "name", label: "Full name", value: u.name, required: true }) + K.field({ name: "phone", label: "Phone", type: "tel", value: u.phone }) +
        (staff ? K.field({ name: "role", label: "Role", type: "select", value: u.role, options: TEAM_ROLES.slice(0, 2), hint: "Changing the role signs them out on every device." }) : ""),
      onSubmit: function (d) { var o = { name: d.name, phone: d.phone || null }; if (staff && d.role && d.role !== u.role) o.role = d.role; return A.patch("/api/users/" + u.id, o); } })
      .then(function (r) { if (r) { K.toast("Saved"); var dr = K.drawerOpen(); if (dr) dr.close(true); K.render(); } });
  };
  K.acts["tm-pass"] = function (b) {
    var u = S.teamRows[b.getAttribute("data-id")];
    K.dialog({ title: "Set a new password", cap: u.name, submit: "Set password", body: K.field({ name: "password", label: "New password", value: K.password(), required: true, hint: "They are signed out everywhere. Share the new password privately." }),
      onSubmit: function (d) { return A.post("/api/users/" + u.id + "/reset-password", { password: d.password }); } }).then(function (r) { if (r) K.toast("Password set"); });
  };
  K.acts["tm-off"] = function (b) {
    var u = S.teamRows[b.getAttribute("data-id")];
    K.confirm({ title: "Deactivate " + u.name + "?", text: "They are signed out at once and cannot sign in until activated again.", ok: "Deactivate", onSubmit: function () { return A.post("/api/users/" + u.id + "/deactivate", {}); } })
      .then(function (r) { if (r) { K.toast("Deactivated"); var dr = K.drawerOpen(); if (dr) dr.close(true); K.render(); } });
  };
  K.acts["tm-on"] = function (b) {
    var u = S.teamRows[b.getAttribute("data-id")];
    K.run(b, A.post("/api/users/" + u.id + "/activate", {}), "Activated").then(function () { var dr = K.drawerOpen(); if (dr) dr.close(true); K.render(); }, function () { });
  };
  K.acts["tm-ask"] = function (b) {
    var u = S.teamRows[b.getAttribute("data-id")];
    BR.ask({ kind: "staff_deactivate", entity: "user", entity_id: u.id, label: "Deactivate " + u.name }).then(function (r) { if (r) { var dr = K.drawerOpen(); if (dr) dr.close(true); } });
  };

  /* ================= Reports (head) ================= */
  K.view("reports", { title: "Reports", eyebrow: E, lead: "How the branch is doing, week by week.",
    render: function (c) {
      if (!BR.isHead()) return K.empty("For the branch head", "Branch reports are open to the branch head and head office.");
      var w = +(c.params.weeks || 8);
      return A.get("/api/reports/branch", { weeks: w }).then(function (r) {
        var s = r.snapshot || {}, t = r.trend || [], f = s.fees || {}, cr = r.chat_response_minutes;
        var pts = function (k) { return t.map(function (x) { return { x: K.date(x.week_start).replace(/ \d{4}$/, ""), t: "Week of " + K.date(x.week_start), y: x[k] || 0 }; }); };
        return K.seg("weeks", [["4", "4 weeks"], ["8", "8 weeks"], ["12", "12 weeks"], ["26", "26 weeks"]], String(w), "Range") +
          K.kpis([["Enquiries", K.num((s.enquiries || {}).total), (s.enquiries || {}).last_7_days + " in the last 7 days"], ["Conversion", (r.conversion_rate != null ? r.conversion_rate + "%" : "None"), "enquiries that became clients"],
            ["Fees collected", K.money(f.collected, f.currency), "of " + K.money(f.invoiced, f.currency)], ["Chat reply time", cr && cr.samples ? (cr.median < 1 ? "Under 1 min" : K.dur(cr.median * 60)) : "Not enough data", cr && cr.samples ? "median of " + cr.samples + " chats" : ""]]) +
          '<div class="k-charts br-grid">' + K.mini("Enquiries", K.num(t.length ? t[t.length - 1].enquiries : 0), pts("enquiries")) + K.mini("New clients", K.num(t.length ? t[t.length - 1].conversions : 0), pts("conversions")) +
            K.mini("Fees collected", K.money(t.length ? t[t.length - 1].fees_collected : 0), pts("fees_collected"), { fmt: function (v) { return K.money(v); } }) + K.mini("Website chats", K.num(t.length ? t[t.length - 1].chats : 0), pts("chats")) + "</div>" +
          K.sec("Clients by stage", "", K.bars(Object.keys(s.students_by_stage || {}).map(function (k) { return { label: K.lab(k), value: s.students_by_stage[k] }; }), { label: "Clients by stage" })) +
          K.sec("Work waiting", "", K.dl([["Open conversations", K.num(s.open_conversations)], ["Website chats waiting", K.num(s.waiting_public_chats)], ["Hand-overs open", K.num(s.forwards_open)], ["Approvals waiting", K.num(s.approvals_pending)],
            ["Visa steps overdue", K.num(s.visa_overdue)], ["Documents expiring in 90 days", K.num(s.documents_expiring_90d)], ["Stories waiting", K.num(s.stories_pending)], ["Fees due", K.money(f.due, f.currency)]]));
      });
    } });

  /* ================= Audit ================= */
  K.view("audit", { title: "Audit", eyebrow: E, lead: "Every change made by people in the branch: who, what, before and after.",
    render: function (c) {
      var p = c.params;
      return Promise.all([A.get("/api/users", { limit: 100 }), A.get("/api/audit", { user_id: p.user_id, entity: p.entity, page: p.page, limit: 50 })]).then(function (r) {
        var users = r[0].items.filter(function (u) { return u.role !== "student" && u.role !== "parent"; });
        S.auditRows = {}; (r[1].items || []).forEach(function (a) { S.auditRows[a.id] = a; });
        return K.filters([{ name: "user_id", label: "Person", type: "select", options: K.opts(users.map(function (u) { return [String(u.id), u.name]; }), "Anyone") },
          { name: "entity", label: "About", type: "select", options: K.opts([["student", "Client files"], ["document", "Documents"], ["fee", "Fees"], ["payment", "Payments"], ["user", "Logins"], ["approval", "Approvals"], ["lead", "Leads"], ["conversation", "Conversations"]], "Everything") }], p) +
          K.table([{ t: "What", f: function (a) { return esc(K.lab(a.action)) + "<small>" + esc(K.lab(a.entity) + (a.entity_id ? " " + a.entity_id : "")) + "</small>"; } }, { t: "Who", f: function (a) { return esc(a.user_name || "System") + "<small>" + esc(K.role(a.user_role)) + "</small>"; } }, { t: "When", f: function (a) { return esc(K.dt(a.at)); } }],
            r[1].items || [], { act: "au-open", label: "Audit", empty: "No changes recorded in this view." }) + K.pager(r[1], "changes");
      });
    } });
  K.acts["au-open"] = function (b) {
    var a = S.auditRows[b.getAttribute("data-id")];
    K.drawer({ title: K.lab(a.action), cap: (a.user_name || "System") + ", " + K.dt(a.at), body: K.diff(a.before, a.after) });
  };

  /* ================= Settings ================= */
  K.view("settings", { title: "Settings", eyebrow: E, lead: "Office details printed on receipts. Head office edits them.",
    render: function () {
      return A.get("/api/settings").then(function (r) {
        var s = r.settings || {}, b = (S.view && S.view.branch) || {};
        return K.sec("Your branch", "", K.dl([["Branch", b.name], ["Your role", K.role(S.me.role)], ["Signed in as", S.me.email]])) +
          K.sec("On receipts", "", K.dl([["Office name", s.office_name], ["Address", s.office_address], ["Phone", s.office_phone], ["WhatsApp", s.office_whatsapp], ["Email", s.office_email], ["Receipt line", s.receipt_note]])) +
          K.sec("Your account", "", '<div class="k-acts"><button type="button" class="k-b soft" data-act="br-pass">Change password</button></div>');
      });
    } });
})();
