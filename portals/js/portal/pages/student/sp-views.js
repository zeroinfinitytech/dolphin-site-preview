/* Dolphin student and parent portal: the screens (registered on SP.V). Students act on their own file; parents follow the child's file
   read only (they may message the office and report a payment). The server enforces every rule; the UI only hides what a role cannot do. */
(function () {
  "use strict";
  var SP = window.SP, api = SP.api, esc = SP.esc, $ = SP.$, $$ = SP.$$, S = SP.S;
  var STAGES = [["counselling", "Counselling"], ["applying", "Applying"], ["offer", "Offer"], ["visa", "Visa"], ["departed", "Departed"]];
  var DOC_WORD = { missing: "Still needed", requested: "Requested by the office", received: "Received, being checked", verified: "Verified", rejected: "Please upload again", expiring: "Expiring soon", expired: "Expired", needed: "Still needed" };
  /* an open offer is "conditional" or "unconditional" (server APP_STATUS); "withdrawn" is how a declined offer is stored */
  var APP_WORD = { draft: "Being prepared", submitted: "Submitted", conditional: "Conditional offer", unconditional: "Unconditional offer", accepted: "Offer accepted", rejected: "Not successful", withdrawn: "Withdrawn or declined" };
  function isOffer(s) { return s === "conditional" || s === "unconditional"; }
  function word(s) { s = String(s || "").replace(/_/g, " "); return s.charAt(0).toUpperCase() + s.slice(1); }
  function stw(text, tone) { return '<span class="stw' + (tone ? " " + tone : "") + '">' + esc(text) + "</span>"; }
  function sid() { return S.sid; }
  function kidFirst() { var k = SP.kid(); return k ? SP.first(k.name) : "the student"; }
  function ro() { return SP.parent() ? '<p class="sp-ro">You are viewing ' + esc(kidFirst()) + "'s file. Parents can read everything here; " + esc(kidFirst()) + " uploads documents and answers offers, and the office keeps the file up to date.</p>" : ""; }
  function dl(id, label) { return '<a class="btn soft sm" href="/api/documents/' + id + '/file">' + esc(label || "Download") + "</a>"; }

  /* ------------------------------------------------ Home ------------------------------------------------ */
  SP.V.home = function (r, host) {
    return Promise.all([SP.file(), SP.checklist().catch(function () { return null; }), api.get("/api/appointments").catch(function () { return { items: [] }; })]).then(function (res) {
      var f = res[0], ck = res[1], ap = (res[2].items || []), me = S.me, parent = SP.parent();
      var stage = f.stage || "counselling", idx = STAGES.map(function (s) { return s[0]; }).indexOf(stage);
      var todo = [];
      (f.requests || []).filter(function (q) { return q.status === "open"; }).forEach(function (q) { todo.push({ t: "The office asked for: " + (labelOf(ck, q.type_key) || word(q.type_key)), s: (q.message || "") + (q.due_at ? " Due " + SP.date(q.due_at) + "." : ""), h: "#/documents", tone: "warn" }); });
      if (ck) ck.items.forEach(function (i) {
        if (i.status === "rejected") todo.push({ t: i.label + ": please upload again", s: i.document && i.document.reject_reason ? "Reason: " + i.document.reject_reason : "", h: "#/documents", tone: "warn" });
        if (i.status === "expiring" || i.status === "expired") todo.push({ t: i.label + (i.status === "expired" ? " has expired" : " expires " + SP.date(i.expiry_date)), s: "Renew it and upload the new copy.", h: "#/documents", tone: "warn" });
      });
      (f.applications || []).forEach(function (a) { if (isOffer(a.status)) todo.push({ t: "Offer from " + a.institution, s: parent ? kidFirst() + " can accept or decline it here." : "Read it and give your answer.", h: "#/applications", tone: "on" }); });
      (f.fees || []).forEach(function (x) { var due = (x.amount_minor || 0) - (x.paid_minor || 0); if (due > 0) todo.push({ t: x.label + ": " + SP.money(due, x.currency) + " to pay", s: x.due_at ? "Due " + SP.date(x.due_at) + "." : "", h: "#/payments" }); });
      var vs = (f.visa_steps || []).filter(function (v) { return v.status === "in_progress" || v.status === "blocked"; })[0];
      if (vs) todo.push({ t: "Visa: " + vs.step_label + (vs.status === "blocked" ? " is waiting on something" : " is in progress"), s: vs.due_at ? "Expected by " + SP.date(vs.due_at) + "." : "", h: "#/applications" });
      if (ck && ck.summary && ck.summary.missing) todo.push({ t: ck.summary.missing + " required document" + (ck.summary.missing === 1 ? "" : "s") + " still to give", s: "See the list and upload what you have.", h: "#/documents" });
      var next = ap.filter(function (a) { return a.status === "scheduled" && a.date >= SP.today(); }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); })[0];
      var hello = parent ? "Namaste, " + esc(SP.first(me.name)) + "." : "Namaste, " + esc(SP.first(f.name)) + ".";
      host.innerHTML = '<div class="pg">' + SP.head({ eb: (f.ref_no ? f.ref_no + " · " : "") + (f.branch_name || ""), html: hello.replace(/\.$/, "") + "<em>.</em>",
        lead: parent ? "Following " + f.name + "'s journey to " + (f.destination || "study abroad") + (f.intake ? ", " + f.intake : "") + "." : "Your journey to " + (f.destination || "study abroad") + (f.intake ? ", " + f.intake : "") + ", in one place." }) + ro() +
        '<section class="sec sp-journey" aria-label="Journey"><h2>Where ' + (parent ? esc(kidFirst()) + " is" : "you are") + '</h2><ol class="sp-steps">' + STAGES.map(function (s, i) {
          return '<li class="' + (i < idx ? "done" : i === idx ? "now" : "") + '"' + (i === idx ? ' aria-current="step"' : "") + "><b>" + esc(s[1]) + "</b><small>" + (i < idx ? "Done" : i === idx ? "Now" : "Next") + "</small></li>";
        }).join("") + "</ol></section>" +
        '<div class="two"><section class="sec"><h2>Next steps</h2>' + (todo.length ? '<div class="rows">' + todo.slice(0, 8).map(function (t) {
          return '<a class="row link nothumb" href="' + t.h + '"><div class="main-l"><b>' + esc(t.t) + "</b>" + (t.s ? "<small>" + esc(t.s) + "</small>" : "") + "</div>" + (t.tone ? '<div class="ra">' + stw(t.tone === "warn" ? "To do" : "New", t.tone) + "</div>" : "") + "</a>";
        }).join("") + "</div>" : SP.empty("Nothing waiting", "You are up to date. Your team will message you when something is needed.")) + "</section>" +
        '<section class="sec"><h2>Your Dolphin team</h2><dl class="dl"><div><dt>Branch</dt><dd>' + esc(f.branch_name || "") + "</dd></div>" +
        (f.assigned_manager_name ? "<div><dt>Branch manager</dt><dd>" + esc(f.assigned_manager_name) + "</dd></div>" : "") +
        (f.counsellor_name ? "<div><dt>Counsellor</dt><dd>" + esc(f.counsellor_name) + "</dd></div>" : "") +
        "<div><dt>Next appointment</dt><dd>" + (next ? esc(SP.date(next.date) + ", " + next.time + " · " + next.type + (next.mode ? " · " + next.mode : "")) : "None booked") + "</dd></div></dl>" +
        '<div class="sp-acts"><a class="btn sm" href="#/messages">Message the office</a><a class="btn soft sm" href="#/requests">Ask for something</a></div></section></div></div>';
    });
  };
  function labelOf(ck, key) { var i = ck && ck.items.filter(function (x) { return x.type_key === key; })[0]; return i ? i.label : ""; }

  /* ------------------------------------------------ Messages ------------------------------------------------ */
  SP.V.messages = function (r, host, cur) {
    host.innerHTML = '<div class="cm-inbox sp-inbox" id="inbox"></div>';
    var inst = window.Convo.mount($("#inbox", host), {
      me: api.user(), staff: false, title: "Messages", kinds: [], statuses: [], allowNew: true, search: false, forwardTo: [],
      emptyText: "No messages yet. Start one and your branch replies in office hours.",
      onRoute: function (id) { SP.replace(id ? "#/messages/" + id : "#/messages"); },
      onUnread: function (n) { SP.setCount("messages", n); }
    });
    if (r[1]) inst.open(+r[1]);
    SP.onLeave(function () { inst.destroy(); });
    cur.keepScroll = true;
    cur.update = function (rr) { if (rr[1]) inst.open(+rr[1]); else inst.close(); };
    return Promise.resolve();
  };

  /* ------------------------------------------------ Family chat ------------------------------------------------
     (2026-11-01) a private thread for the student and the parents linked to them; Dolphin staff cannot read it (server/routes/family.js).
     Live over the portal socket ({t:"family"}), polled while the socket is down. Questions for the office stay in Messages. */
  SP.V.family = function (r, host, cur) {
    var sid = SP.S.sid, msgs = [], sending = false, data = null;
    host.innerHTML = '<div class="sp-inbox sp-fam"><div class="cv" id="fam">' + SP.skel(4) + "</div></div>";
    var box = $("#fam", host), T = window.Convo.time;
    function names(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
    function line(m) {
      var who = m.mine ? "You" : SP.first(m.sender_name) + (m.sender_role === "parent" ? ", parent" : "");
      return '<li class="cv-m' + (m.mine ? " me" : "") + '" data-id="' + m.id + '">' + (m.mine ? "" : "<small><b>" + esc(who) + "</b> · " + esc(T.short(m.at)) + "</small>") +
        "<p>" + esc(m.body) + "</p>" + (m.mine ? '<small class="cv-mt">' + esc(T.short(m.at)) + "</small>" : "") + "</li>";
    }
    function list() {
      var el = $("#famMsgs", box); if (!el) return;
      el.innerHTML = msgs.length ? msgs.map(line).join("") : '<li class="cv-none">No messages yet. Only your family will see what you write here.</li>';
      el.scrollTop = el.scrollHeight;
    }
    function paint() {
      var others = data.members.filter(function (m) { return !m.me; }), kid = SP.first(data.student.name), hasKid = data.members.some(function (m) { return m.role === "student"; });
      var who = others.length ? "Only you and " + names(others.map(function (m) { return m.name; })) + " can read this." : "Only your family can read this.";
      var note = SP.parent() && !hasKid ? " " + kid + " has no portal account yet; messages wait here until the office opens one." : "";
      box.innerHTML = '<header class="cv-th"><div class="cv-tt"><h1>' + esc(SP.parent() ? "Family chat with " + kid : "Family chat") + "</h1><p>" + esc(who + " Dolphin staff cannot see it." + note) + "</p></div>" +
          '<div class="cv-ta"><a class="cv-btn soft sm" href="#/messages">Ask the office</a></div></header>' +
        '<ol class="cv-msgs" id="famMsgs" aria-label="Family messages"></ol>' +
        '<footer class="cv-comp"><label class="cv-sr" for="famBox">Message to your family</label>' +
          '<textarea id="famBox" class="cv-box" rows="1" maxlength="2000" placeholder="Write to your family"></textarea>' +
          '<div class="cv-cr"><div class="cv-tools"><span class="cv-hint cv-kb">Enter to send, Shift and Enter for a new line</span></div><button type="button" class="cv-btn" id="famSend">Send</button></div></footer>';
      list();
      var ta = $("#famBox", box);
      ta.addEventListener("input", function () { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 180) + "px"; });
      ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
      $("#famSend", box).addEventListener("click", send);
    }
    function add(m) { if (msgs.some(function (x) { return x.id === m.id; })) return; msgs.push(m); list(); }
    function send() {
      var ta = $("#famBox", box), t = ta.value.trim(), b = $("#famSend", box); if (!t || sending) return;
      sending = true; api.busy(b, true);
      api.post("/api/family/" + sid + "/messages", { body: t }).then(function (m) { ta.value = ""; ta.style.height = ""; add(m); SP.announce("Sent"); },
        function (e) { SP.toast({ title: SP.msgOf(e), tone: "error" }); }).then(function () { sending = false; api.busy(b, false); ta.focus(); });
    }
    /* a fresh GET also marks the thread read, so the badge clears while the screen is open */
    function load() { return api.get("/api/family/" + sid).then(function (d) { var first = !data; data = d; msgs = d.messages; if (first) paint(); else list(); SP.refreshCounts(); }); }
    var off = SP.live.on("family", function (f) { if (f.student_id === sid) load(); });
    SP.live.poll("family", load);
    SP.onLeave(function () { off(); SP.live.unpoll("family"); });
    cur.keepScroll = true;
    return load();
  };

  /* ------------------------------------------------ Documents ------------------------------------------------ */
  var CAT = { identity: "Identity", academic: "Academic", test: "English test", financial: "Money and sponsor", application: "University and visa letters", health: "Health and police", other: "Other" };
  SP.V.documents = function (r, host) {
    return SP.checklist().then(function (ck) {
      var parent = SP.parent(), sum = ck.summary || {}, by = {}, order = [];
      ck.items.forEach(function (i) { var c = i.category || "other"; if (!by[c]) { by[c] = []; order.push(c); } by[c].push(i); });
      host.innerHTML = '<div class="pg">' + SP.head({ eb: "Documents", title: parent ? kidFirst() + "'s documents" : "Your documents",
        lead: parent ? "What the office has received and checked." : "Upload a clear PDF, JPG or PNG (up to 10 MB). The office checks each one and tells you if anything is wrong." }) + ro() +
        '<div class="ck-sum">' + [["required", "Required"], ["verified", "Verified"], ["received", "Being checked"], ["missing", "Still needed"], ["expiring", "Expiring"], ["rejected", "To upload again"]].map(function (k) { return "<div><b>" + (sum[k[0]] || 0) + "</b><span>" + k[1] + "</span></div>"; }).join("") + "</div>" +
        order.map(function (c) {
          return '<section class="sec"><h2>' + esc(CAT[c] || word(c)) + "</h2>" + by[c].map(function (i) { return docRow(i, parent); }).join("") + "</section>";
        }).join("") + "</div>";
    });
  };
  function docRow(i, parent) {
    var d = i.document, st = i.status, info = [];
    if (d) info.push(d.filename + (d.version > 1 ? " · version " + d.version : "") + " · " + SP.date(d.created_at));
    if (i.expiry_date) info.push("Valid until " + SP.date(i.expiry_date));
    var tone = st === "verified" ? "on" : /rejected|expir|requested/.test(st) ? "warn" : "";
    var acts = "";
    if (d) acts += dl(d.id) + (d.version > 1 ? ' <button type="button" class="btn quiet sm" data-act="versions" data-id="' + d.id + '" data-label="' + esc(i.label) + '">Versions</button>' : "");
    if (!parent && st !== "verified") acts += ' <label class="btn sm sp-up"' + (d ? "" : "") + '><input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" data-up="' + esc(i.type_key) + '"' + (i.request ? ' data-req="' + i.request.id + '"' : "") + (i.has_expiry ? ' data-exp="1"' : "") + ">" + (d ? "Upload new version" : "Upload") + "</label>";
    return '<div class="doc-row"><div class="dn"><b>' + esc(i.label) + (i.required ? "" : ' <span class="mute" style="font-weight:400">(optional)</span>') + "</b>" +
      (info.length ? "<small>" + esc(info.join(" · ")) + "</small>" : "") +
      (d && d.reject_reason && st === "rejected" ? '<small class="rej">' + esc(d.reject_reason) + "</small>" : "") +
      (i.request ? '<small class="rej">' + esc((i.request.message || "The office asked for this.") + (i.request.due_at ? " Due " + SP.date(i.request.due_at) + "." : "")) + "</small>" : "") +
      '<div class="sp-bar" hidden><i></i></div></div><div class="ra">' + stw(DOC_WORD[st] || word(st), tone) + '<span class="sp-da">' + acts + "</span></div></div>";
  }
  document.addEventListener("change", function (e) {
    var inp = e.target.closest && e.target.closest("input[data-up]"); if (!inp || !inp.files || !inp.files[0]) return;
    var file = inp.files[0], key = inp.dataset.up, row = inp.closest(".doc-row"), bar = $(".sp-bar", row), lab = inp.closest("label");
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) { SP.toast({ title: "Only PDF, JPG or PNG files are accepted.", tone: "error" }); inp.value = ""; return; }
    if (file.size > 10 * 1024 * 1024) { SP.toast({ title: "That file is larger than 10 MB.", tone: "error" }); inp.value = ""; return; }
    var q = { type_key: key, filename: file.name }; if (inp.dataset.req) q.request_id = inp.dataset.req;
    bar.hidden = false; lab.classList.add("is-loading"); lab.setAttribute("aria-busy", "true");
    api.uploadProgress("/api/students/" + sid() + "/documents", file, q, function (p) { $("i", bar).style.width = Math.round(p * 100) + "%"; }).then(function () {
      SP.toast("Uploaded. The office will check it."); SP.announce("Upload complete"); SP.refreshCounts(); SP.render();
    }, function (err) { bar.hidden = true; lab.classList.remove("is-loading"); lab.removeAttribute("aria-busy"); inp.value = ""; SP.toast({ title: SP.msgOf(err), tone: "error" }); });
  });
  SP.A.versions = function (b) {
    var d = SP.drawer({ eb: "Versions", title: b.dataset.label, body: SP.skel(3) });
    api.get("/api/documents/" + b.dataset.id + "/versions").then(function (v) {
      d.body.innerHTML = '<div class="rows">' + (v.items || []).map(function (x) {
        return '<div class="row nothumb"><div class="main-l"><b>Version ' + x.version + (x.current ? " (current)" : "") + "</b><small>" + esc(x.filename + " · " + SP.date(x.created_at) + " · " + (DOC_WORD[x.status] || word(x.status))) + '</small></div><div class="ra">' + dl(x.id) + "</div></div>";
      }).join("") + "</div>";
    }, function (e) { d.body.innerHTML = SP.errBox(e); });
  };

  /* ------------------------------------------------ Applications and visa ------------------------------------------------ */
  SP.V.applications = function (r, host) {
    return Promise.all([SP.file(), api.get("/api/students/" + sid() + "/visa").catch(function () { return null; })]).then(function (res) {
      var f = res[0], visa = res[1], parent = SP.parent(), apps = f.applications || [], letters = f.letters || [];
      var steps = visa ? visa.steps || [] : [];
      host.innerHTML = '<div class="pg">' + SP.head({ eb: "Applications and visa", title: parent ? kidFirst() + "'s applications" : "Your applications",
        lead: "Where each application stands, your letters, and every visa step for " + (f.destination || "your destination") + "." }) + ro() +
        '<section class="sec"><h2>Applications</h2>' + (apps.length ? '<div class="rows">' + apps.map(function (a) {
          var mine = letters.filter(function (l) { return l.application_id === a.id; });
          var canAnswer = !parent && isOffer(a.status);
          return '<div class="row nothumb sp-app"><div class="main-l"><b>' + esc(a.institution) + "</b><small>" + esc([a.course, a.intake, a.destination].filter(Boolean).join(" · ")) + "</small>" +
            (mine.length ? '<span class="sp-letters">' + mine.map(function (l) { return '<a class="lnk" href="/api/letters/' + l.id + '/file">' + esc(l.kind || "Letter") + "</a>"; }).join(" ") + "</span>" : "") +
            '</div><div class="ra">' + stw(APP_WORD[a.status] || word(a.status), a.status === "accepted" || isOffer(a.status) ? "on" : /rejected|withdrawn/.test(a.status) ? "warn" : "") +
            (canAnswer ? ' <button type="button" class="btn sm" data-act="answer" data-id="' + a.id + '" data-v="accept" data-n="' + esc(a.institution) + '">Accept</button> <button type="button" class="btn soft sm" data-act="answer" data-id="' + a.id + '" data-v="decline" data-n="' + esc(a.institution) + '">Decline</button>' : "") + "</div></div>";
        }).join("") + "</div>" : SP.empty("No applications yet", "Your counsellor adds them here as soon as they are sent.")) + "</section>" +
        '<section class="sec"><h2>Visa steps' + (visa && visa.destination ? " · " + esc(visa.destination) : "") + '</h2>' + (steps.length ? '<ol class="sp-visa">' + steps.map(function (v) {
          var t = v.status === "done" ? "Done" + (v.done_at ? " · " + SP.date(v.done_at) : "") : v.status === "in_progress" ? "In progress" + (v.due_at ? " · expected by " + SP.date(v.due_at) : "") : v.status === "blocked" ? "Waiting on something" + (v.note ? " · " + v.note : "") : "Later";
          return '<li class="' + esc(v.status) + (v.overdue ? " late" : "") + '"><b>' + esc(v.step_label) + "</b><small>" + esc(t) + "</small></li>";
        }).join("") + "</ol>" : SP.empty("No visa steps yet", "They start once your offer is accepted.")) + "</section></div>";
    });
  };
  SP.A.answer = function (b) {
    var acc = b.dataset.v === "accept";
    SP.dialog({ title: (acc ? "Accept the offer from " : "Decline the offer from ") + b.dataset.n + "?", lead: acc ? "Your branch starts the next steps (deposit, visa) once you accept." : "Declining cannot be undone here. Talk to your counsellor first if you are not sure.",
      ok: acc ? "Accept the offer" : "Decline the offer", danger: !acc,
      submit: function () { return api.post("/api/applications/" + b.dataset.id + "/respond", { response: b.dataset.v }).then(function () { SP.toast(acc ? "Offer accepted." : "Offer declined."); SP.file(true); SP.render(); }); } });
  };

  /* ------------------------------------------------ Requests ------------------------------------------------ */
  var ASK = [["letter", "A letter (enrolment, recommendation or reference)"], ["appointment", "An appointment with my counsellor"], ["document", "Help with a document"], ["other", "Something else"]];
  SP.V.requests = function (r, host) {
    return Promise.all([api.get("/api/document-requests", { status: "open" }).catch(function () { return { items: [] }; }), api.get("/api/appointments").catch(function () { return { items: [] }; }), api.get("/api/conversations", { limit: 50 }).catch(function () { return { items: [] }; })]).then(function (res) {
      var reqs = (res[0].items || []).filter(function (q) { return q.student_id === sid(); }), ap = (res[1].items || []).filter(function (a) { return a.student_id === sid(); }).sort(function (a, b) { return (b.date + b.time).localeCompare(a.date + a.time); }),
        mine = (res[2].items || []).filter(function (c) { return /^Request:/.test(c.subject || ""); }), parent = SP.parent();
      host.innerHTML = '<div class="pg">' + SP.head({ eb: "Requests", title: "Requests", lead: "What the office asked for, your appointments, and anything you asked the office for." }) +
        '<div class="two"><section class="sec"><h2>Ask the office</h2><form id="askF" novalidate>' +
        '<div class="fld"><label for="askT">What do you need?</label><select class="in" id="askT" name="type">' + ASK.map(function (a) { return '<option value="' + a[0] + '">' + esc(a[1]) + "</option>"; }).join("") + "</select></div>" +
        '<div class="fld"><label for="askB">Details</label><textarea class="in" id="askB" name="body" rows="4" maxlength="2000" placeholder="For example: a letter for my bank by Friday, or a time next week that suits me."></textarea><p class="err" data-for="body" hidden></p></div>' +
        '<p class="err" data-for="form" role="alert" hidden></p><button class="btn" type="submit" id="askS">Send to the office</button><p class="hint">It arrives with your branch as a message; the answer comes back in Messages.</p></form></section>' +
        '<section class="sec"><h2>Your requests</h2>' + (mine.length ? '<div class="rows">' + mine.map(function (c) {
          return '<a class="row link nothumb" href="#/messages/' + c.id + '"><div class="main-l"><b>' + esc(c.subject.replace(/^Request:\s*/, "")) + "</b><small>" + esc(SP.date(c.created_at)) + '</small></div><div class="ra">' + stw(c.status === "closed" ? "Done" : c.status === "forwarded" ? "With your branch manager" : "Sent", c.status === "closed" ? "on" : "") + (c.unread ? " " + stw("New reply", "warn") : "") + "</div></a>";
        }).join("") + "</div>" : SP.empty("Nothing asked yet", "Use the form to ask for a letter, an appointment or anything else.")) + "</section></div>" +
        '<div class="two"><section class="sec"><h2>Asked by the office</h2>' + (reqs.length ? '<div class="rows">' + reqs.map(function (q) {
          return '<a class="row link nothumb" href="#/documents"><div class="main-l"><b>' + esc(q.label || word(q.type_key)) + "</b><small>" + esc((q.message || "") + (q.due_at ? " Due " + SP.date(q.due_at) + "." : "")) + '</small></div><div class="ra">' + stw(q.overdue ? "Overdue" : "Open", "warn") + "</div></a>";
        }).join("") + "</div>" : SP.empty("Nothing asked", parent ? "The office has not asked for anything right now." : "The office has not asked you for anything right now.")) + "</section>" +
        '<section class="sec"><h2>Appointments</h2>' + (ap.length ? '<div class="rows">' + ap.map(function (a) {
          return '<div class="row nothumb"><div class="main-l"><b>' + esc(a.type || "Appointment") + "</b><small>" + esc(SP.date(a.date) + ", " + a.time + (a.mode ? " · " + a.mode : "") + (a.staff_name ? " · with " + a.staff_name : "")) + '</small></div><div class="ra">' + stw(word(a.status), a.status === "scheduled" ? "on" : "") + "</div></div>";
        }).join("") + "</div>" : SP.empty("No appointments", "Ask for one with the form above.")) + "</section></div></div>";
      $("#askF", host).addEventListener("submit", function (e) {
        e.preventDefault(); var f = e.target, d = api.formData(f), btn = $("#askS", f);
        if (!d.body || d.body.trim().length < 3) { api.showErrors(f, { details: { body: "Write a few words so the office knows what you need." } }); return; }
        var t = ASK.filter(function (a) { return a[0] === d.type; })[0];
        api.busy(btn, true);
        api.post("/api/conversations", { subject: "Request: " + (t ? t[1] : "Something else"), body: d.body.trim(), student_id: SP.kid() ? SP.kid().id : undefined }).then(function (b) {   /* a parent with two children: the request is about the child chosen in the switcher */
          api.busy(btn, false); SP.toast("Sent. Your branch replies in Messages."); SP.go("#/messages/" + b.conversation.id);
        }, function (err) { api.busy(btn, false); api.showErrors(f, err); });
      });
    });
  };

  /* ------------------------------------------------ Payments ------------------------------------------------ */
  SP.V.payments = function (r, host) {
    return Promise.all([SP.file(), api.get("/api/claims").catch(function () { return { items: [] }; })]).then(function (res) {
      var f = res[0], fees = f.fees || [], pays = f.payments || [], claims = (res[1].items || []).filter(function (c) { return fees.some(function (x) { return x.id === c.fee_id; }); });
      var open = fees.filter(function (x) { return (x.amount_minor || 0) - (x.paid_minor || 0) > 0; });
      host.innerHTML = '<div class="pg">' + SP.head({ eb: "Payments", title: "Fees and receipts", lead: "What is paid, what is still due, and your receipts. Paid online or by bank? Report it here and the office confirms it." }) +
        '<section class="sec"><h2>Fees</h2>' + (fees.length ? '<div class="rows">' + fees.map(function (x) {
          var due = (x.amount_minor || 0) - (x.paid_minor || 0);
          return '<div class="row nothumb"><div class="main-l"><b>' + esc(x.label) + "</b><small>" + esc(SP.money(x.amount_minor, x.currency) + (x.due_at ? " · due " + SP.date(x.due_at) : "") + (x.paid_minor ? " · paid " + SP.money(x.paid_minor, x.currency) : "")) + '</small></div><div class="ra">' +
            stw(due > 0 ? SP.money(due, x.currency) + " to pay" : "Paid", due > 0 ? "warn" : "on") + (due > 0 ? ' <button type="button" class="btn sm" data-act="claim" data-id="' + x.id + '" data-n="' + esc(x.label) + '" data-due="' + due + '" data-cur="' + esc(x.currency || "NPR") + '">I have paid</button>' : "") + "</div></div>";
        }).join("") + "</div>" : SP.empty("No fees", "Nothing is charged on this file yet.")) + "</section>" +
        '<div class="two"><section class="sec"><h2>Receipts</h2>' + (pays.length ? '<div class="rows">' + pays.map(function (p) {
          return '<div class="row nothumb"><div class="main-l"><b>' + esc(p.receipt_no || "Receipt") + "</b><small>" + esc(SP.money(p.amount_minor, p.currency) + " · " + (p.method || "") + " · " + SP.date(p.paid_at)) + '</small></div><div class="ra"><button type="button" class="btn soft sm" data-act="receipt" data-id="' + p.id + '">Receipt</button></div></div>';
        }).join("") + "</div>" : SP.empty("No receipts yet", "Each payment the office records gets a receipt here.")) + "</section>" +
        '<section class="sec"><h2>Payments you reported</h2>' + (claims.length ? '<div class="rows">' + claims.map(function (c) {
          return '<div class="row nothumb"><div class="main-l"><b>' + esc(c.fee_label || "Payment") + "</b><small>" + esc((c.amount != null ? (fees[0] && fees[0].currency || "NPR") + " " + Number(c.amount).toLocaleString("en-IN") : "") + " · " + (c.method || "") + " · ref " + (c.reference || "")) + (c.reason ? " · " + esc(c.reason) : "") + '</small></div><div class="ra">' + stw(c.status === "confirmed" ? "Confirmed" : c.status === "rejected" ? "Not confirmed" : "Being checked", c.status === "confirmed" ? "on" : c.status === "rejected" ? "warn" : "") + "</div></div>";
        }).join("") + "</div>" : SP.empty("None reported", open.length ? "Paid by eSewa, Khalti, bank or card? Use “I have paid” on the fee." : "")) + "</section></div></div>";
    });
  };
  /* receipt: the endpoint answers JSON, so it opens in a dialog that prints on its own (css/portal/pages/sp.css @media print) */
  SP.A.receipt = function (b) {
    api.get("/api/payments/" + b.dataset.id + "/receipt").then(function (r) {
      var m = function (n) { return (r.currency || "NPR") + " " + Number(n || 0).toLocaleString("en-IN"); };
      var rows = [["Received from", r.student_name + (r.student_ref ? " · " + r.student_ref : "")], ["For", r.label], ["Amount", m(r.amount)], ["Paid by", r.method + (r.reference ? " · " + r.reference : "")], ["Date", SP.date(r.paid_at)], ["Balance after", m(r.balance_after) + " of " + m(r.fee_total)], ["Received by", r.received_by]];
      var d = SP.dialog({ title: "Receipt " + r.receipt_no, lead: r.office || "Dolphin Education", ok: "Print", cancel: "Close",
        body: '<dl class="dl sp-rcpt">' + rows.map(function (x) { return "<div><dt>" + esc(x[0]) + "</dt><dd>" + esc(x[1] || "") + "</dd></div>"; }).join("") + "</dl>" + (r.note ? '<p class="hint">' + esc(r.note) + "</p>" : ""),
        submit: function () { window.print(); return false; } });
      if (d && d.el) d.el.classList.add("sp-rcpt-dlg");
    }, function (e) { SP.toast({ title: SP.msgOf(e), tone: "error" }); });
  };
  SP.A.claim = function (b) {
    var due = +b.dataset.due / 100, cur = b.dataset.cur;
    SP.dialog({ title: "Report a payment", lead: b.dataset.n + ". The office checks it and sends you a receipt.",
      body: '<div class="fld"><label for="clA">Amount (' + esc(cur) + ")</label><input class=\"in\" id=\"clA\" name=\"amount\" type=\"number\" min=\"1\" step=\"1\" inputmode=\"numeric\" max=\"" + Math.floor(due) + '" value="' + Math.floor(due) + '" required><p class="err" data-for="amount" hidden></p></div>' +
        '<div class="fld"><label for="clM">Paid by</label><select class="in" id="clM" name="method"><option>eSewa</option><option>Khalti</option><option>Bank transfer</option><option>Card</option></select></div>' +
        '<div class="fld"><label for="clR">Reference or transaction ID</label><input class="in" id="clR" name="reference" required minlength="3" maxlength="60"><p class="err" data-for="reference" hidden></p></div>',
      ok: "Send", submit: function (form) { var d = api.formData(form); var amt = Math.round(+d.amount); if (!(amt >= 1)) { var e1 = new Error("Enter the amount you paid."); throw e1; } if (!d.reference || d.reference.trim().length < 3) throw new Error("Enter the transaction or voucher number.");
        return api.post("/api/fees/" + b.dataset.id + "/claims", { amount: amt, method: d.method, reference: d.reference.trim() }).then(function () { SP.toast("Reported. The office will confirm it."); SP.render(); }); } });
  };

  /* ------------------------------------------------ Profile ------------------------------------------------ */
  var PF = [["dob", "Date of birth", "date"], ["gender", "Gender", ["", "female", "male", "other", "prefer_not"]], ["nationality", "Nationality"], ["citizenship_no", "Citizenship number"],
    ["passport_no", "Passport number"], ["passport_issue", "Passport issued", "date"], ["passport_expiry", "Passport expiry", "date"], ["passport_place", "Passport issued at"],
    ["address_perm", "Permanent address"], ["address_temp", "Current address"], ["district", "District"], ["phone_alt", "Another phone"], ["email_alt", "Another email", "email"],
    ["marital_status", "Marital status", ["", "single", "married", "divorced", "widowed", "other"]], ["emergency_name", "Emergency contact"], ["emergency_relation", "Their relation to you"], ["emergency_phone", "Their phone"]];
  var SUB = {
    education: { t: "Education", f: [["level", "Level", ["SEE", "+2", "A level", "Diploma", "Bachelor", "Master", "Other"]], ["institution", "School or college"], ["board", "Board or university"], ["year_from", "From (year)", "number"], ["year_to", "To (year)", "number"], ["grade", "Grade"], ["gpa", "GPA"], ["stream", "Stream"]], show: function (x) { return [x.level + " · " + (x.institution || ""), [x.board, x.year_to, x.gpa ? "GPA " + x.gpa : x.grade].filter(Boolean).join(" · ")]; } },
    tests: { t: "Test scores", f: [["test", "Test", ["IELTS", "PTE", "TOEFL", "Duolingo", "SAT", "GRE", "GMAT", "Other"]], ["overall", "Overall"], ["listening", "Listening"], ["reading", "Reading"], ["writing", "Writing"], ["speaking", "Speaking"], ["test_date", "Test date", "date"], ["expiry_date", "Valid until", "date"], ["trf_no", "Report number"]], show: function (x) { return [x.test + " " + (x.overall || ""), [x.test_date ? "Taken " + SP.date(x.test_date) : "", x.expiry_date ? "valid until " + SP.date(x.expiry_date) : ""].filter(Boolean).join(" · ")]; } },
    contacts: { t: "Family and sponsor", f: [["relation", "Relation", ["father", "mother", "guardian", "sponsor", "spouse", "sibling", "other"]], ["name", "Name"], ["phone", "Phone"], ["email", "Email", "email"], ["occupation", "Occupation"], ["is_sponsor", "Sponsors the studies", "check"]], show: function (x) { return [x.name + " · " + word(x.relation), [x.phone, x.occupation, x.is_sponsor ? "Sponsor" : ""].filter(Boolean).join(" · ")]; } },
    work: { t: "Work", f: [["employer", "Employer"], ["role", "Role"], ["date_from", "From", "date"], ["date_to", "To", "date"], ["notes", "Notes"]], show: function (x) { return [(x.role || "") + " · " + (x.employer || ""), [x.date_from && SP.date(x.date_from), x.date_to ? SP.date(x.date_to) : "now"].filter(Boolean).join(" to ")]; } },
    /* after departure (2026-11-01): the student keeps this up to date even when the profile is locked */
    abroad: { t: "Studies abroad", lead: "After you leave Nepal: your course, university and years. Keep it up to date so Dolphin can stay in touch.",
      f: [["level", "Level", ["Bachelor", "Master", "Diploma", "Foundation", "Language", "PhD", "Other"]], ["course", "Course"], ["institution", "University or college"], ["country", "Country"], ["city", "City"],
        ["year_from", "From (year)", "number"], ["year_to", "To (year)", "number"], ["status", "Status", ["studying", "completed", "transferred", "deferred", "withdrew"]], ["notes", "Notes"]],
      show: function (x) { return [[x.level, x.course].filter(Boolean).join(" · ") + (x.institution ? ", " + x.institution : ""), [[x.city, x.country].filter(Boolean).join(", "), [x.year_from, x.year_to].filter(Boolean).join(" to "), word(x.status)].filter(Boolean).join(" · ")]; } }
  };
  function inputFor(k, lab, type, val, dis) {
    var id = "pf_" + k, v = val == null ? "" : val;
    if (Array.isArray(type)) return '<div class="fld"><label for="' + id + '">' + esc(lab) + '</label><select class="in" id="' + id + '" name="' + k + '"' + (dis ? " disabled" : "") + ">" + type.map(function (o) { return '<option value="' + esc(o) + '"' + (String(v) === o ? " selected" : "") + ">" + esc(o ? word(o === "prefer_not" ? "prefer not to say" : o) : "Choose") + "</option>"; }).join("") + '</select><p class="err" data-for="' + k + '" hidden></p></div>';
    if (type === "check") return '<label class="ck"><input type="checkbox" name="' + k + '"' + (v ? " checked" : "") + (dis ? " disabled" : "") + "> " + esc(lab) + "</label>";
    return '<div class="fld"><label for="' + id + '">' + esc(lab) + '</label><input class="in" id="' + id + '" name="' + k + '" type="' + (type || "text") + '" value="' + esc(v) + '"' + (dis ? " disabled" : "") + '><p class="err" data-for="' + k + '" hidden></p></div>';
  }
  SP.V.profile = function (r, host) {
    var base = "/api/students/" + sid();
    return Promise.all([api.get(base + "/profile"), api.get(base + "/education"), api.get(base + "/tests"), api.get(base + "/contacts"), api.get(base + "/work"), api.get(base + "/abroad")]).then(function (res) {
      var pr = res[0], parent = SP.parent(), locked = !!pr.locked, edit = !parent && !locked, p = pr.profile || {}, subs = { education: res[1].items, tests: res[2].items, contacts: res[3].items, work: res[4].items, abroad: res[5].items };
      S.subs = subs;
      host.innerHTML = '<div class="pg">' + SP.head({ eb: pr.ref_no || "Profile", title: parent ? kidFirst() + "'s profile" : "Your profile",
        lead: parent ? "The details on " + kidFirst() + "'s file." : locked ? "Your profile is locked while the office checks it. Message the office if something needs to change." : "Keep these up to date: your counsellor uses them for every application." }) + ro() +
        (!parent && pr.missing && pr.missing.length && !locked ? '<p class="sp-ro">Still to fill in: ' + esc(pr.missing.map(function (m) { var f = PF.filter(function (x) { return x[0] === m; })[0]; return f ? f[1] : word(m); }).join(", ")) + ".</p>" : "") +
        '<section class="sec"><h2>Personal details</h2><form id="pfF" novalidate><div class="grid2">' + PF.map(function (f) { return inputFor(f[0], f[1], f[2], p[f[0]], !edit); }).join("") + "</div>" +
        (edit ? '<label class="ck"><input type="checkbox" name="consent_data"' + (p.consent_data ? " checked" : "") + "> I agree that Dolphin Education keeps these details to process my applications.</label>" +
          '<p class="err" data-for="form" role="alert" hidden></p><div class="sp-acts"><button class="btn" type="submit" id="pfS">Save details</button></div>' : "") + "</form></section>" +
        Object.keys(SUB).map(function (k) {
          var c = SUB[k], items = subs[k] || [], ed = k === "abroad" ? !parent : edit;
          return '<section class="sec"><h2>' + esc(c.t) + (ed ? ' <button type="button" class="lnk" data-act="sub-add" data-k="' + k + '">Add</button>' : "") + "</h2>" + (items.length ? '<div class="rows">' + items.map(function (x) {
            var s = c.show(x); return '<div class="row nothumb"><div class="main-l"><b>' + esc(s[0]) + "</b><small>" + esc(s[1]) + "</small></div>" + (ed ? '<div class="ra"><button type="button" class="btn quiet sm" data-act="sub-edit" data-k="' + k + '" data-id="' + x.id + '">Edit</button> <button type="button" class="btn quiet sm" data-act="sub-del" data-k="' + k + '" data-id="' + x.id + '">Remove</button></div>' : "") + "</div>";
          }).join("") + "</div>" : '<p class="mute">' + esc(c.lead || "Nothing added yet.") + "</p>") + "</section>";
        }).join("") +
        '<section class="sec"><h2>Password</h2><form id="pwF" novalidate class="grid2">' + inputFor("current", "Current password", "password", "") + inputFor("next", "New password (10 characters or more)", "password", "") +
        '<p class="err full" data-for="form" role="alert" hidden></p><div class="sp-acts full"><button class="btn soft" type="submit" id="pwS">Change password</button></div></form></section></div>';
      var pf = $("#pfF", host);
      if (edit) pf.addEventListener("submit", function (e) {
        e.preventDefault(); var d = api.formData(pf), out = {}, btn = $("#pfS", pf);
        PF.forEach(function (f) { out[f[0]] = d[f[0]] == null ? null : d[f[0]]; }); out.consent_data = !!d.consent_data;
        api.busy(btn, true);
        api.patch(base + "/profile", out).then(function () { api.busy(btn, false); SP.toast("Details saved."); SP.render(); }, function (err) { api.busy(btn, false); api.showErrors(pf, err); });
      });
      var pw = $("#pwF", host);
      pw.addEventListener("submit", function (e) {
        e.preventDefault(); var d = api.formData(pw), btn = $("#pwS", pw);
        if (!d.next || d.next.length < 10) { api.showErrors(pw, { details: { next: "Use 10 characters or more." } }); return; }
        api.busy(btn, true);
        api.post("/api/auth/password", { current: d.current || "", next: d.next }).then(function () { api.busy(btn, false); pw.reset(); SP.toast("Password changed."); }, function (err) { api.busy(btn, false); api.showErrors(pw, err); });
      });
    });
  };
  function subForm(k, row) {
    var c = SUB[k], d = SP.drawer({ eb: c.t, title: row ? "Edit" : "Add", body: '<form id="subF" novalidate>' + c.f.map(function (f) { return inputFor(f[0], f[1], f[2], row ? row[f[0]] : (Array.isArray(f[2]) ? f[2][0] : "")); }).join("") + '<p class="err" data-for="form" role="alert" hidden></p></form>',
      foot: '<button type="button" class="btn quiet" data-act="drawer-x">Cancel</button><button type="submit" form="subF" class="btn" id="subS">Save</button>' });
    var f = $("#subF", d.el);
    f.addEventListener("submit", function (e) {
      e.preventDefault(); var v = api.formData(f), btn = $("#subS", d.el);
      c.f.forEach(function (x) { if (x[2] === "number" && v[x[0]] != null) v[x[0]] = +v[x[0]]; if (x[2] === "check") v[x[0]] = !!v[x[0]]; });
      api.busy(btn, true);
      var p = "/api/students/" + sid() + "/" + k + (row ? "/" + row.id : "");
      (row ? api.patch(p, v) : api.post(p, v)).then(function () { api.busy(btn, false); d.close(); SP.toast("Saved."); SP.render(); }, function (err) { api.busy(btn, false); api.showErrors(f, err); });
    });
  }
  SP.A["sub-add"] = function (b) { subForm(b.dataset.k, null); };
  SP.A["sub-edit"] = function (b) { var row = (S.subs[b.dataset.k] || []).filter(function (x) { return String(x.id) === b.dataset.id; })[0]; if (row) subForm(b.dataset.k, row); };
  SP.A["sub-del"] = function (b) {
    SP.dialog({ title: "Remove this entry?", lead: "The office keeps a record of the change.", ok: "Remove", danger: true,
      submit: function () { return api.delete("/api/students/" + sid() + "/" + b.dataset.k + "/" + b.dataset.id).then(function () { SP.toast("Removed."); SP.render(); }); } });
  };

  /* ------------------------------------------------ Notifications ------------------------------------------------ */
  SP.V.alerts = function (r, host) {
    return api.get("/api/notifications", { limit: 50 }).then(function (b) {
      var items = b.items || [];
      host.innerHTML = '<div class="pg">' + SP.head({ eb: "Notifications", title: "Notifications", lead: "Everything the office sent you, newest first.", acts: b.unread ? '<button type="button" class="btn soft sm" data-act="read-all">Mark all as read</button>' : "" }) +
        (items.length ? '<div class="rows">' + items.map(function (n) {
          return '<button type="button" class="row link nothumb sp-note' + (n.read ? "" : " un") + '" data-act="note" data-i="' + items.indexOf(n) + '"><div class="main-l"><b>' + esc(n.title || word(n.type)) + "</b><small>" + esc((n.body ? n.body + " · " : "") + SP.ts(n.created_at)) + "</small></div>" + (n.read ? "" : '<div class="ra">' + stw("New", "on") + "</div>") + "</button>";
        }).join("") + "</div>" : SP.empty("No notifications", "When the office asks for something or answers you, it shows here."));
      S.notes = items;
    });
  };
  SP.A["read-all"] = function () { api.post("/api/notifications/read", { all: true }).then(function () { if (S.notify) S.notify.refresh(); SP.render(); }); };
  SP.A.note = function (b) {
    var n = S.notes[+b.dataset.i]; if (!n) return;
    (n.read ? Promise.resolve() : api.post("/api/notifications/read", { ids: [n.id] })).then(function () { if (S.notify) S.notify.refresh(); if (SP.openNotification(n) === false) SP.render(); });
  };
})();
