/* Branch portal, desk: Today, Leads, Conversations (shared js/portal/core/convo.js), Hand-overs / Escalations (forwards), Calendar (appointments). */
(function () {
  "use strict";
  var K = window.K, A = K.api, esc = K.esc, S = K.state, BR = window.BR;
  var E = BR.E;
  function li(main, sub, right) { return '<li class="k-rowx"><span>' + main + (sub ? '<br><span class="k-mute k-small">' + sub + "</span>" : "") + "</span>" + (right || "") + "</li>"; }
  function list(items, empty) { return items.length ? '<ul class="k-list">' + items.join("") + "</ul>" : '<p class="k-mute">' + esc(empty) + "</p>"; }

  /* ================= Today ================= */
  K.view("today", { title: "Today", eyebrow: E, lead: "What is waiting for you in the branch.",
    render: function () {
      var head = BR.isHead(), today = K.today();
      return Promise.all([
        A.get("/api/dashboard"),
        A.get("/api/approvals", { status: "pending", mine: head ? undefined : 1 }).catch(function () { return { items: [] }; }),
        A.get("/api/forwards", { direction: "received", status: "open", limit: 6 }).catch(function () { return { items: [] }; }),
        A.get("/api/visa/due").catch(function () { return { items: [] }; }),
        A.get("/api/document-requests", { status: "open" }).catch(function () { return { items: [] }; }),
        A.get("/api/documents/expiring", { days: 90 }).catch(function () { return { items: [] }; }),
        A.get("/api/appointments", { from: today, to: today }).catch(function () { return { items: [] }; })
      ]).then(function (r) {
        var d = r[0], ap = r[1].items || [], fw = r[2].items || [], vd = (r[3].items || []).filter(function (v) { return v.overdue; }), rq = (r[4].items || []).filter(function (x) { return x.overdue; }), ex = r[5].items || [], appt = r[6].items || [];
        S.dash = d; BR.badges();
        return K.kpis([["Open conversations", K.num(d.conversations_open || 0)], [head ? "Escalations waiting" : "Hand-overs waiting", K.num(d.forwards_open || 0)],
          [head ? "Approvals to decide" : "Requests waiting", K.num(d.approvals_pending || 0)], ["Documents to check", K.num(d.documents_to_check || 0)],
          ["Visa steps overdue", K.num(d.visa_overdue || 0)], ["New website forms", K.num(d.new_forms_24h || 0), "last 24 hours"]]).replace('class="k-kpis"', 'class="k-kpis br-k6"') +
          '<div class="br-grid">' +
          K.sec(head ? "Approvals to decide" : "My requests", head ? "Sensitive requests from the branch manager." : "Waiting for the branch head.",
            list(ap.slice(0, 5).map(function (x) { return li(esc(x.kind_label || K.lab(x.kind)), esc(x.entity_label || "") + ", " + esc(K.ago(x.created_at)), '<a class="k-b soft sm" href="#/approvals">Open</a>'); }), "Nothing waiting.")) +
          K.sec(head ? "Escalations" : "Hand-overs", "Passed to you and not finished.",
            list(fw.slice(0, 5).map(function (x) { return li(esc(x.entity_label || K.lab(x.entity)), esc(x.from_name || "") + ", " + esc(K.ago(x.created_at)), K.st(K.lab(x.status), "i")); }), "Nothing passed to you.")) +
          K.sec("Today's appointments", K.date(today),
            list(appt.map(function (a) { return li(esc(a.time + "  " + (a.who || a.student_name || "")), esc([a.type, a.mode, a.staff_name].filter(Boolean).join(", ")), K.st(K.lab(a.status), a.status === "scheduled" ? "i" : "m")); }), "No appointments today.")) +
          K.sec("Visa steps overdue", "Move them along on the client file.",
            list(vd.slice(0, 6).map(function (v) { return li('<button type="button" class="k-link" data-act="br-file" data-id="' + v.student_id + '">' + esc(v.student_name) + "</button>", esc(v.step_label) + ", due " + esc(K.date(v.due_at))); }), "No overdue steps.")) +
          K.sec("Document requests overdue", "Asked from students and not yet received.",
            list(rq.slice(0, 6).map(function (x) { return li('<button type="button" class="k-link" data-act="br-file" data-id="' + x.student_id + '">' + esc(x.student_name) + "</button>", esc(x.label) + ", due " + esc(K.date(x.due_at))); }), "Nothing overdue.")) +
          K.sec("Documents expiring", "Within 90 days.",
            list(ex.slice(0, 6).map(function (x) { return li('<button type="button" class="k-link" data-act="br-file" data-id="' + x.student_id + '">' + esc(x.student_name || "") + "</button>", esc(x.kind || K.lab(x.type_key)) + ", " + esc(x.days_to_expiry) + " days left"); }), "Nothing expiring soon.")) +
          "</div>";
      });
    } });
  K.acts["br-file"] = function (b) { BR.openClient(b.getAttribute("data-id")); };

  /* ================= Leads ================= */
  var LSTAT = [["lead", "New"], ["counselling", "Counselling"], ["applying", "Applying"], ["offer", "Offer"], ["visa", "Visa"], ["departed", "Departed"], ["lost", "Lost"]];
  var LSRC = [["web_booking", "Website booking"], ["web_contact", "Website contact"], ["web_chat", "Website chat"], ["event", "Event"], ["walk_in", "Walk in"], ["phone", "Phone"], ["referral", "Referral"]];
  function lsrc(s) { var x = LSRC.filter(function (o) { return o[0] === s; })[0]; return x ? x[1] : K.lab(s); }
  K.view("leads", { title: "Leads", eyebrow: E, lead: "Enquiries from the website, chats, events and the office. Convert a lead when the person signs up.",
    acts: '<button type="button" class="k-b p" data-act="ld-new">New lead</button>',
    render: function (c) {
      var p = c.params;
      return A.get("/api/leads", { q: p.q, status: p.status, source: p.source, destination: p.destination, page: p.page, limit: 50 }).then(function (res) {
        S.leadRows = {}; res.items.forEach(function (l) { S.leadRows[l.id] = l; });
        return K.filters([{ name: "q", label: "Search", type: "search", ph: "Name, phone or email", w: 1 }, { name: "status", label: "Status", type: "select", options: K.opts(LSTAT, "Any status") }, { name: "source", label: "Source", type: "select", options: K.opts(LSRC, "Any source") }, { name: "destination", label: "Destination", type: "select", options: K.opts(BR.DEST, "Anywhere") }], p) +
          K.table([{ t: "Lead", f: function (x) { return esc(x.name) + "<small>" + esc(x.phone || x.email || "") + "</small>"; } }, { t: "Source", f: function (x) { return esc(lsrc(x.source)); } }, { t: "Status", f: function (x) { return K.st(K.lab(x.status === "lead" ? "new" : x.status), x.status === "lost" ? "m" : "i"); } },
            { t: "Destination", f: function (x) { return esc([x.destination, x.level].filter(Boolean).join(", ")); } }, { t: "Came in", f: function (x) { return esc(K.date(x.created_at)); } }], res.items, { act: "ld-open", label: "Leads", empty: "No leads match these filters." }) + K.pager(res, "leads");
      });
    } });
  function leadForm(x) {
    x = x || {};
    return '<div class="k-fr">' + K.field({ name: "name", label: "Name", value: x.name, required: true }) + K.field({ name: "phone", label: "Phone", type: "tel", value: x.phone }) + "</div>" +
      '<div class="k-fr">' + K.field({ name: "email", label: "Email", type: "email", value: x.email }) + K.field({ name: "destination", label: "Destination", type: "select", value: x.destination, options: K.opts(BR.DEST, "Not decided") }) + "</div>" +
      '<div class="k-fr">' + K.field({ name: "level", label: "Level", value: x.level, ph: "Bachelor, Master, Diploma" }) + (x.id ? K.field({ name: "status", label: "Status", type: "select", value: x.status, options: LSTAT }) : K.field({ name: "source", label: "Source", type: "select", value: "walk_in", options: LSRC })) + "</div>" +
      K.field({ name: "notes", label: "Notes", type: "textarea", value: x.notes, max: 2000 });
  }
  K.acts["ld-new"] = function () {
    K.dialog({ title: "New lead", submit: "Save lead", body: leadForm(), onSubmit: function (d) { return A.post("/api/leads", d); } })
      .then(function (r) { if (r) { K.toast("Lead saved"); K.render(); } });
  };
  K.acts["ld-open"] = function (b) {
    var x = S.leadRows[b.getAttribute("data-id")];
    K.drawer({ title: x.name, cap: "Lead", body: K.dl([["Status", K.lab(x.status === "lead" ? "new" : x.status)], ["Source", lsrc(x.source)], ["Phone", x.phone], ["Email", x.email], ["Destination", x.destination], ["Level", x.level], ["Notes", x.notes], ["Came in", K.dt(x.created_at)], ["Updated", K.dt(x.updated_at)]]) +
      '<div class="k-acts br-acts"><button type="button" class="k-b soft sm" data-act="ld-edit" data-id="' + x.id + '">Edit</button>' +
      (x.student_id ? '<button type="button" class="k-b soft sm" data-act="br-file" data-id="' + x.student_id + '">Open the client file</button>' : '<button type="button" class="k-b p sm" data-act="ld-conv" data-id="' + x.id + '">Convert to a client file</button>') + "</div>" });
  };
  K.acts["ld-edit"] = function (b) {
    var x = S.leadRows[b.getAttribute("data-id")];
    K.dialog({ title: "Edit lead", cap: x.name, submit: "Save", body: leadForm(x), onSubmit: function (d) { return A.patch("/api/leads/" + x.id, d); } })
      .then(function (r) { if (r) { K.toast("Lead saved"); var dr = K.drawerOpen(); if (dr) dr.close(true); K.render(); } });
  };
  K.acts["ld-conv"] = function (b) {
    var x = S.leadRows[b.getAttribute("data-id")];
    K.dialog({ title: "Convert to a client file", cap: x.name, submit: "Create the file",
      body: '<p class="k-mute">Creates a client file with a reference number and the visa steps for the destination.</p><div class="k-fr">' +
        K.field({ name: "destination", label: "Destination", type: "select", value: x.destination, required: true, options: K.opts(BR.DEST, "Choose") }) + K.field({ name: "intake", label: "Intake", ph: "Sep 2027" }) + "</div>",
      onSubmit: function (d) { if (!d.destination) { var e = new Error("x"); e.details = { destination: "Choose the destination." }; throw e; } return A.post("/api/leads/" + x.id + "/convert", d); } })
      .then(function (r) { if (r) { K.toast("Client file created"); var dr = K.drawerOpen(); if (dr) dr.close(true); K.render(); if (r.id) BR.openClient(r.id); } });
  };

  /* ================= Conversations ================= */
  K.view("conversations", { title: "Conversations", eyebrow: E, lead: "Students, parents, website chats passed to you, and the team.",
    render: function () {
      if (!window.Convo) return K.empty("Conversations did not load", "The shared conversation component (js/portal/core/convo.js) is missing. Reload the page.");
      return '<div class="k-convo" id="brConvo"></div>';
    },
    after: function (c) {
      var host = K.$("#brConvo"); if (!host) return;
      /* the inbox fills the rest of the screen: the page itself never scrolls on this view */
      document.body.classList.add("br-conv");
      var fit = function () { var top = host.getBoundingClientRect().top + window.scrollY; host.style.setProperty("--cv-h", Math.max(420, Math.floor(window.innerHeight - top - 16)) + "px"); };
      fit(); window.addEventListener("resize", fit);
      c.leave(function () { window.removeEventListener("resize", fit); document.body.classList.remove("br-conv"); });
      var fwd = BR.isHead() ? [{ role: "branch_manager", label: "Branch manager", action: "Pass to the branch manager" }] : [{ role: "branch_head", label: "Branch head", action: "Escalate to the branch head" }];
      var inst = window.Convo.mount(host, { me: S.me, staff: true, title: BR.branchName(), forwardTo: fwd,
        forwardedText: "Passed on. Follow it under " + (BR.isHead() ? "Escalations" : "Hand-overs") + ", Passed on by me.",
        emptyText: "No conversations in this view. Client messages and website chats passed to you appear here the moment they arrive.",
        onUnread: function () { BR.badges(); }, onOpenStudent: function (id) { BR.openClient(id); }, onForward: function () { BR.badges(); } });
      if (c.params.open) inst.open(+c.params.open);
      c.leave(function () { try { inst.destroy(); } catch (e) { /* gone */ } });
    } });

  /* ================= Hand-overs / Escalations ================= */
  K.view("handovers", { title: "Hand-overs", eyebrow: E, lead: "What the team passed to you, and what you passed on. Accept, finish or return each one.",
    render: function (c) {
      var p = c.params, dir = p.dir || "received", st = p.status == null ? "open" : p.status;
      return A.get("/api/forwards", { direction: dir, status: st || undefined, page: p.page, limit: 50 }).then(function (res) {
        S.fwdRows = {}; res.items.forEach(function (x) { S.fwdRows[x.id] = x; });
        return K.seg("dir", [["received", "Passed to me"], ["sent", "Passed on by me"]], dir, "Direction") +
          K.seg("status", [["open", "Not finished"], ["done", "Done"], ["returned", "Returned"], ["", "All"]], st, "Status") +
          K.table([{ t: "About", f: function (x) { return esc(x.entity_label || K.lab(x.entity)) + "<small>" + esc(K.lab(x.entity)) + "</small>"; } },
            { t: dir === "sent" ? "To" : "From", f: function (x) { return esc(dir === "sent" ? (x.to_name || K.role(x.to_role)) : x.from_name) + "<small>" + esc(K.ago(x.created_at)) + "</small>"; } },
            { t: "Note", f: function (x) { return esc(x.note || ""); } }, { t: "State", f: function (x) { return K.st(K.lab(x.status), x.status === "done" ? "m" : "i"); } }],
            res.items, { act: "fw-open", label: "Hand-overs", emptyTitle: "Nothing here", empty: dir === "sent" ? "You have not passed anything on in this view." : "Nothing passed to you in this view." }) + K.pager(res, "items");
      });
    } });
  K.acts["fw-open"] = function (b) {
    var x = S.fwdRows[b.getAttribute("data-id")], mine = String(S.me.role) === String(x.to_role) || +x.to_user_id === +S.me.id;
    var go = x.entity === "conversation" ? '<a class="k-b soft sm" href="#/conversations?open=' + x.entity_id + '">Open the conversation</a>' : x.entity === "student" ? '<button type="button" class="k-b soft sm" data-act="br-file" data-id="' + x.entity_id + '">Open the client file</button>' : x.entity === "lead" ? '<a class="k-b soft sm" href="#/leads">Open leads</a>' : "";
    K.drawer({ title: x.entity_label || K.lab(x.entity), cap: K.lab(x.entity) + " passed on", body: K.dl([["From", x.from_name + ", " + K.role(x.from_role)], ["To", x.to_name || K.role(x.to_role)], ["Note", x.note], ["Passed on", K.dt(x.created_at)], ["State", K.lab(x.status)], ["Decided by", x.decided_by_name], ["Decided", x.decided_at ? K.dt(x.decided_at) : ""], ["Decision note", x.decision_note]]) +
      '<div class="k-acts br-acts">' + go + (mine && x.status === "sent" ? '<button type="button" class="k-b p sm" data-act="fw-do" data-k="accept" data-id="' + x.id + '">Accept</button>' : "") +
      (mine && (x.status === "sent" || x.status === "accepted") ? '<button type="button" class="k-b soft sm" data-act="fw-do" data-k="done" data-id="' + x.id + '">Mark done</button><button type="button" class="k-b soft sm" data-act="fw-do" data-k="return" data-id="' + x.id + '">Return</button>' : "") + "</div>" });
  };
  K.acts["fw-do"] = function (b) {
    var id = b.getAttribute("data-id"), k = b.getAttribute("data-k");
    var p = k === "accept" ? K.run(b, A.post("/api/forwards/" + id + "/accept", {}), "Accepted") :
      K.dialog({ title: k === "done" ? "Mark done" : "Return to the sender", submit: k === "done" ? "Mark done" : "Return",
        body: K.field({ name: "note", label: k === "done" ? "Note (optional)" : "Why it goes back", type: "textarea", required: k === "return", max: 1000 }),
        onSubmit: function (d) { if (k === "return" && !(d.note || "").trim()) { var e = new Error("x"); e.details = { note: "Say why it goes back." }; throw e; } return A.post("/api/forwards/" + id + "/" + k, { note: d.note || undefined }); } });
    Promise.resolve(p).then(function (r) { if (r) { if (k !== "accept") K.toast(k === "done" ? "Marked done" : "Returned"); var dr = K.drawerOpen(); if (dr) dr.close(true); BR.badges(); K.render(); } }, function () { });
  };

  /* ================= Calendar ================= */
  /* the server's lists (APPT_TYPES, APPT_MODES in server/routes/portal.js); anything else answers 400 */
  var ATYPES = ["First counselling", "Second counselling", "Document check", "Application review", "Visa preparation", "Fee discussion", "Embassy interview", "Medical", "Other"].map(function (t) { return [t, t]; });
  var AMODE = ["In person", "Video", "Phone", "Embassy", "External"].map(function (t) { return [t, t]; });
  var ASTAT = [["scheduled", "Scheduled"], ["attended", "Attended"], ["no_show", "Did not come"], ["cancelled", "Cancelled"]];
  function addDays(day, n) { var d = new Date(day + "T12:00:00+05:45"); d.setDate(d.getDate() + n); return K.dayOf(d.toISOString()); }
  K.view("calendar", { title: "Calendar", eyebrow: E, lead: "Appointments in the branch, two weeks at a time.",
    acts: '<button type="button" class="k-b p" data-act="ap-new">New appointment</button>',
    render: function (c) {
      var from = c.params.from || K.today(), to = addDays(from, 13);
      return A.get("/api/appointments", { from: from, to: to }).then(function (r) {
        var items = (r.items || []).slice().sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
        S.apptRows = {}; items.forEach(function (a) { S.apptRows[a.id] = a; });
        var days = {}; items.forEach(function (a) { (days[a.date] = days[a.date] || []).push(a); });
        var nav = '<div class="k-acts br-acts"><button type="button" class="k-b soft sm" data-act="ap-wk" data-from="' + addDays(from, -14) + '">Earlier</button><span class="k-mute">' + esc(K.date(from)) + " to " + esc(K.date(to)) + '</span><button type="button" class="k-b soft sm" data-act="ap-wk" data-from="' + addDays(from, 14) + '">Later</button></div>';
        return nav + (items.length ? Object.keys(days).map(function (d) {
          return K.sec(K.date(d), "", '<ul class="k-list">' + days[d].map(function (a) {
            return li('<button type="button" class="k-link" data-act="ap-open" data-id="' + a.id + '">' + esc(a.time + "  " + (a.who || a.student_name || "")) + "</button>", esc([a.type, a.mode, a.staff_name].filter(Boolean).join(", ")), K.st(K.lab(a.status), a.status === "scheduled" ? "i" : "m"));
          }).join("") + "</ul>");
        }).join("") : K.empty("No appointments", "Nothing booked in these two weeks."));
      });
    } });
  K.acts["ap-wk"] = function (b) { if (K.ctx) K.ctx.set({ from: b.getAttribute("data-from") }); };
  function apptForm(a, students) {
    a = a || {};
    return (a.id ? "" : K.field({ name: "student_id", label: "Client file", type: "select", options: K.opts(students.map(function (s) { return [String(s.id), s.name + " (" + s.ref_no + ")"]; }), "Not a client yet") }) + K.field({ name: "who", label: "Name, if not a client", hint: "For a walk-in visitor without a file." })) +
      '<div class="k-fr">' + K.field({ name: "date", label: "Date", type: "date", value: a.date || K.today(), required: true }) + K.field({ name: "time", label: "Time", type: "time", value: a.time || "10:00", required: true }) + "</div>" +
      '<div class="k-fr">' + K.field({ name: "type", label: "Type", type: "select", value: a.type, options: ATYPES }) + K.field({ name: "mode", label: "How", type: "select", value: a.mode, options: AMODE }) + "</div>" +
      (a.id ? K.field({ name: "status", label: "Status", type: "select", value: a.status, options: ASTAT }) : "") + K.field({ name: "note", label: "Staff note", type: "textarea", value: a.note, max: 1000 });
  }
  function saveAppt(path, method, d) {
    var body = {}; Object.keys(d).forEach(function (k) { if (d[k] !== "") body[k] = d[k]; });
    if (body.student_id) { body.student_id = +body.student_id; delete body.who; }
    return A[method](path, body).catch(function (e) {
      if (e && e.body && e.body.code === "clash") return K.confirm({ title: "That slot is taken", text: K.msg(e) + " Book it anyway?", ok: "Book anyway" }).then(function (ok) { if (!ok) { var x = new Error("x"); x.keepOpen = true; throw x; } body.force = true; return A[method](path, body); });
      throw e;
    });
  }
  K.acts["ap-new"] = function () {
    A.get("/api/students", { limit: 100 }).then(function (st) {
      return K.dialog({ title: "New appointment", submit: "Book", body: apptForm(null, st.items), onSubmit: function (d) { if (!d.student_id && !(d.who || "").trim()) { var e = new Error("x"); e.details = { who: "Choose a client file or give a name." }; throw e; } return saveAppt("/api/appointments", "post", d); } });
    }).then(function (r) { if (r) { K.toast("Appointment booked"); K.render(); } }, function (e) { K.toast(K.msg(e)); });
  };
  K.acts["ap-open"] = function (b) {
    var a = S.apptRows[b.getAttribute("data-id")];
    K.dialog({ title: "Appointment", cap: a.who || a.student_name, submit: "Save", body: apptForm(a), onSubmit: function (d) { if (d.date === a.date) delete d.date; if (d.time === a.time) delete d.time; return saveAppt("/api/appointments/" + a.id, "patch", d); } })
      .then(function (r) { if (r) { K.toast("Saved"); K.render(); } });
  };
})();
