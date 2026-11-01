/* Dolphin portals: shared conversation inbox (window.Convo). Used by the Content Manager, Branch, Head office, student and parent portals.
   Contract: HANDOFF_PHASE_A.md section 7 (REST) and section 8 (WebSocket). How to mount it: HANDOFF_PORTAL_SHARED.md.
   Needs js/portal/core/portal-api.js (PortalAPI + PortalAPI.live) and css/convo.css. No other dependency.
   Writes go through REST; the socket only pushes (msg, conv, typing, notify). When the socket is down the inbox polls (PortalAPI.live.poll).
   Everything user-written is set as text (escaped); links stay plain text. */
(function () {
  "use strict";
  var api = window.PortalAPI, live = api && api.live, doc = document;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function uid() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- time ---------- */
  function when(s) { if (!s) return null; var d = new Date(String(s).replace(" ", "T") + (/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? "" : "Z")); return isNaN(d) ? null : d; }
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function hm(d) { return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function short(s) { var d = when(s); if (!d) return ""; var n = new Date(), y = new Date(n - 864e5); if (sameDay(d, n)) return hm(d); if (sameDay(d, y)) return "Yesterday"; return d.getDate() + " " + MON[d.getMonth()] + (d.getFullYear() !== n.getFullYear() ? " " + d.getFullYear() : ""); }
  function dayLabel(d) { var n = new Date(), y = new Date(n - 864e5); if (sameDay(d, n)) return "Today"; if (sameDay(d, y)) return "Yesterday"; return d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear(); }
  function full(s) { var d = when(s); return d ? d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear() + ", " + hm(d) : ""; }

  var ROLE = { content_manager: "Content manager", branch_manager: "Branch manager", branch_head: "Branch head", head_office: "Head office", super_admin: "Dolphin support", student: "Student", parent: "Parent", visitor: "Website visitor", staff: "Staff" };
  var LANG = { en: "English", ne: "Nepali", es: "Spanish", ko: "Korean", zh: "Chinese" };
  var STATUS = { open: "Waiting", forwarded: "Passed on", closed: "Closed" };
  var KIND = { public: "Website chat", member: "Student or parent", internal: "Team" };
  var STAFF = ["content_manager", "branch_manager", "branch_head", "head_office", "super_admin", "staff"];
  var CANNED_DEFAULT = [
    { t: "Thanks", b: "Thank you for your message. A counsellor will reply here shortly." },
    { t: "Phone number", b: "Could you share a phone number so the branch can call you back?" },
    { t: "Office hours", b: "Our office is open Sunday to Friday, 10 am to 5 pm. You are welcome to visit." },
    { t: "Passed on", b: "I have passed your question to our branch manager, who will reply in this conversation." }
  ];

  function titleOf(c) {
    if (c.kind === "public") return (c.visitor && c.visitor.name) || "Website visitor";
    if (c.kind === "member") return c.student_name || c.subject || "Conversation";
    return c.subject || "Team thread";
  }
  function subOf(c, staff) {
    var p = [];
    if (c.kind === "member" && c.subject && c.student_name) p.push(c.subject);
    if (staff) { if (c.kind === "public") p.push("Website chat"); if (c.kind === "internal") p.push("Team"); if (c.student_ref) p.push(c.student_ref); }
    return p.join(" · ");
  }
  function snippet(m) {
    if (!m) return "";
    var b = String(m.body || "").replace(/\s+/g, " ");
    if (m.kind === "note") return "Internal note: " + b;
    if (m.kind === "system") return b;
    return (m.mine ? "You: " : "") + b;
  }

  /* ---------- tiny modal dialog (inside the component, so the portals need nothing else) ---------- */
  function dialog(o) {
    var d = doc.createElement("dialog"); d.className = "cv-dlg"; d.setAttribute("aria-labelledby", "cvDlgT");
    d.innerHTML = '<form method="dialog" class="cv-dlg-f" novalidate><div class="cv-dlg-h"><h2 id="cvDlgT">' + esc(o.title) + '</h2><button type="button" class="cv-x" data-cv="dlg-x" aria-label="Close">Close</button></div>' +
      (o.lead ? '<p class="cv-dlg-lead">' + esc(o.lead) + "</p>" : "") + '<div class="cv-dlg-b">' + (o.body || "") + '</div><p class="cv-err" data-err="form" role="alert" hidden></p>' +
      '<div class="cv-dlg-a"><button type="button" class="cv-btn soft" data-cv="dlg-x">' + esc(o.cancel || "Cancel") + '</button><button type="submit" class="cv-btn' + (o.danger ? " danger" : "") + '">' + esc(o.ok || "Save") + "</button></div></form>";
    doc.body.appendChild(d);
    var back = doc.activeElement, f = $("form", d);
    function close() { try { d.close(); } catch (e) { /* closed */ } d.remove(); if (back && doc.contains(back)) back.focus(); }
    d.addEventListener("click", function (e) { if (e.target.closest("[data-cv=dlg-x]") || e.target === d) { e.preventDefault(); close(); } });
    d.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
    f.addEventListener("submit", function (e) {
      e.preventDefault(); if (!o.submit) { close(); return; }
      var btn = $("button[type=submit]", f), er = $("[data-err=form]", f); er.hidden = true;
      var r; try { r = o.submit(f); } catch (x) { er.textContent = x.message; er.hidden = false; return; }
      if (!r || !r.then) { if (r !== false) close(); return; }
      btn.disabled = true; btn.classList.add("is-loading");
      r.then(function () { close(); }, function (x) { btn.disabled = false; btn.classList.remove("is-loading"); er.textContent = (x && x.code === "validation" && x.details) ? Object.keys(x.details).map(function (k) { return x.details[k]; }).join(" ") : api.message(x); er.hidden = false; });
    });
    if (d.showModal) d.showModal(); else d.setAttribute("open", "");
    var first = $("textarea,input:not([type=hidden]),select", d); (first || $("button[type=submit]", d)).focus();
    if (o.ready) o.ready(d);
    return { el: d, close: close };
  }

  /* ---------- toast (component-local, aria-live) ---------- */
  function toast(msg) {
    if (window.Notify && window.Notify.toast) { window.Notify.toast({ title: msg }); return; }
    var t = $(".cv-toast"); if (!t) { t = doc.createElement("div"); t.className = "cv-toast"; t.setAttribute("role", "status"); doc.body.appendChild(t); }
    t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("on"); }, 3200);
  }

  /* =====================================================================================
     mount(el, opts) -> instance
     ===================================================================================== */
  function mount(host, opts) {
    opts = opts || {};
    var me = opts.me || api.user() || {}, staff = opts.staff != null ? !!opts.staff : STAFF.indexOf(me.role) > -1;
    var KINDS = opts.kinds || (staff ? [{ k: "", t: "All" }, { k: "public", t: "Website" }, { k: "member", t: "Students and parents" }, { k: "internal", t: "Team" }] : []);
    var STATUSES = opts.statuses || (staff ? [{ k: "active", t: "Active" }, { k: "open", t: "Waiting" }, { k: "forwarded", t: "Passed on" }, { k: "closed", t: "Closed" }] : [{ k: "", t: "All" }]);
    var forwardTo = opts.forwardTo || [];
    var useCanned = opts.canned != null ? !!opts.canned : staff;
    var cannedKey = "dolphin-canned-" + (me.id || "x");
    var S = { kind: opts.kind != null ? opts.kind : (KINDS[0] ? KINDS[0].k : ""), status: opts.status != null ? opts.status : (STATUSES[0] ? STATUSES[0].k : ""), q: "", rows: [], unread: 0, loading: true, err: null,
      cur: null, conv: null, msgs: [], can: {}, threadErr: null, threadLoading: false, note: false, details: false, typingT: null, typingWho: null, pending: [], dead: false };
    var offs = [];

    host.classList.add("cv"); host.innerHTML =
      '<section class="cv-list" aria-label="Conversations">' +
        '<div class="cv-lh"><div class="cv-lh-row"><h2 class="cv-lt">' + esc(opts.title || "Inbox") + '</h2><span class="cv-live" data-cv="live" aria-live="polite"></span></div>' +
        (opts.allowNew ? '<button type="button" class="cv-btn sm" data-cv="new">New message</button>' : "") +
        (staff || opts.search ? '<label class="cv-search"><span class="cv-sr">Search conversations</span><input type="search" data-cv="q" placeholder="Search name, subject, message" autocomplete="off"></label>' : "") +
        (KINDS.length > 1 ? '<div class="cv-seg" role="group" aria-label="Kind">' + KINDS.map(function (k) { return '<button type="button" class="cv-pill" data-cv="kind" data-v="' + k.k + '" aria-pressed="' + (S.kind === k.k) + '">' + esc(k.t) + "</button>"; }).join("") + "</div>" : "") +
        (STATUSES.length > 1 ? '<div class="cv-seg cv-seg2" role="group" aria-label="Status">' + STATUSES.map(function (k) { return '<button type="button" class="cv-pill" data-cv="status" data-v="' + k.k + '" aria-pressed="' + (S.status === k.k) + '">' + esc(k.t) + "</button>"; }).join("") + "</div>" : "") +
        "</div>" +
        '<ul class="cv-rows" data-cv="rows" role="list"></ul>' +
      "</section>" +
      '<section class="cv-thread" data-cv="thread" aria-label="Conversation" tabindex="-1"></section>' +
      '<div class="cv-sr" aria-live="polite" data-cv="announce"></div>';
    var rowsEl = $("[data-cv=rows]", host), threadEl = $("[data-cv=thread]", host), liveEl = $("[data-cv=live]", host), ann = $("[data-cv=announce]", host);

    /* ---------- list ---------- */
    function paintLive() {
      var s = live ? live.state() : "off";
      liveEl.textContent = s === "live" ? "Live" : s === "polling" ? "Checking every few seconds" : s === "off" ? "" : "Reconnecting";
      liveEl.className = "cv-live is-" + s;
    }
    function rowHtml(c) {
      var t = c.last_message_at || c.updated_at, sel = S.cur === c.id, un = c.unread || 0, sub = subOf(c, staff);
      return '<li><button type="button" class="cv-row' + (sel ? " on" : "") + (un ? " un" : "") + '" data-cv="open" data-id="' + c.id + '"' + (sel ? ' aria-current="true"' : "") + ">" +
        '<span class="cv-rt"><b>' + esc(titleOf(c)) + "</b><time>" + esc(short(t)) + "</time></span>" +
        (sub ? '<span class="cv-rs">' + esc(sub) + "</span>" : "") +
        '<span class="cv-rm"><span class="cv-rx">' + esc(snippet(c.last_message)) + "</span>" + (un ? '<b class="cv-n" aria-label="' + un + ' unread">' + un + "</b>" : "") + "</span>" +
        (staff ? '<span class="cv-rst st-' + c.status + '">' + esc(c.visitor && c.visitor.blocked ? "Blocked" : (STATUS[c.status] || c.status)) + (c.status === "forwarded" && c.owner_name ? " to " + esc(c.owner_name) : "") + "</span>" : "") +
        "</button></li>";
    }
    function paintList() {
      if (S.loading && !S.rows.length) { rowsEl.innerHTML = '<li class="cv-sk" aria-hidden="true"><i></i><i></i><i></i></li><li class="cv-sk" aria-hidden="true"><i></i><i></i><i></i></li><li class="cv-sk" aria-hidden="true"><i></i><i></i><i></i></li>'; rowsEl.setAttribute("aria-busy", "true"); return; }
      rowsEl.removeAttribute("aria-busy");
      if (S.err && !S.rows.length) { rowsEl.innerHTML = '<li class="cv-empty"><p>' + esc(api.message(S.err)) + '</p><button type="button" class="cv-btn soft sm" data-cv="reload">Try again</button></li>'; return; }
      if (!S.rows.length) { rowsEl.innerHTML = '<li class="cv-empty"><p>' + esc(S.q ? "No conversation matches that search." : opts.emptyText || (staff ? "Nothing waiting here. New website chats and messages appear the moment they arrive." : "No messages yet. Write to Dolphin and the team will reply here.")) + "</p></li>"; return; }
      rowsEl.innerHTML = S.rows.map(rowHtml).join("");
    }
    function sortRows() { S.rows.sort(function (a, b) { return String(b.last_message_at || b.updated_at || "").localeCompare(String(a.last_message_at || a.updated_at || "")) || b.id - a.id; }); }
    function emitUnread() { if (opts.onUnread) opts.onUnread(S.unread); }
    var lt = 0;
    function loadList(quiet) {
      var my = ++lt; if (!quiet) { S.loading = true; paintList(); }
      var q = Object.assign({ limit: 100, kind: S.kind || undefined, status: S.status || undefined, q: S.q || undefined }, opts.query || {});
      return api.get("/api/conversations", q).then(function (b) {
        if (my !== lt || S.dead) return;
        S.loading = false; S.err = null; S.rows = b.items || []; S.unread = b.unread_total || 0; sortRows(); paintList(); emitUnread();
      }, function (e) { if (my !== lt || S.dead) return; S.loading = false; S.err = e; paintList(); });
    }
    var rt = null; function softReload() { clearTimeout(rt); rt = setTimeout(function () { loadList(true); }, 1200); }
    function matches(c) {
      if (S.kind && c.kind !== S.kind) return false;
      if (S.status === "active" && c.status === "closed") return false;
      if (S.status && S.status !== "active" && c.status !== S.status) return false;
      if (opts.query && opts.query.student_id && +c.student_id !== +opts.query.student_id) return false;
      return true;
    }
    function upsert(c) {
      var i = -1; S.rows.forEach(function (r, k) { if (r.id === c.id) i = k; });
      if (i > -1) { S.rows[i] = Object.assign({}, S.rows[i], c); if (!matches(S.rows[i])) S.rows.splice(i, 1); }
      else if (matches(c)) S.rows.push(c);
      if (S.cur === c.id) { var r0 = S.rows.filter(function (r) { return r.id === c.id; })[0]; if (r0) r0.unread = 0; }
      sortRows(); paintList();
    }

    /* ---------- thread ---------- */
    function convHead(c) {
      var who = titleOf(c), bits = [];
      if (staff) bits.push(KIND[c.kind] || c.kind);
      if (c.kind === "member" && c.subject && c.student_name) bits.push(c.subject);
      if (staff && c.student_ref) bits.push(c.student_ref);
      if (staff && c.branch_name && opts.showBranch) bits.push(c.branch_name);
      var st = c.visitor && c.visitor.blocked ? "Blocked" : (STATUS[c.status] || c.status) + (c.status === "forwarded" && c.owner_name ? " to " + c.owner_name : "");
      var acts = [];
      /* hide "pass on" while a hand-over to that same role is still open (the server answers 409 already_forwarded); escalation to another role stays */
      var fwOpen = c.forward && (c.forward.status === "sent" || c.forward.status === "accepted") && forwardTo.length === 1 && c.forward.to_role === forwardTo[0].role;
      if (staff && forwardTo.length && S.can.forward && c.status !== "closed" && !fwOpen) acts.push('<button type="button" class="cv-btn sm" data-cv="forward">' + esc(forwardTo.length === 1 ? (forwardTo[0].action || "Pass to " + forwardTo[0].label.toLowerCase()) : "Pass on") + "</button>");
      if (S.can.close) acts.push(c.status === "closed" ? '<button type="button" class="cv-btn soft sm" data-cv="reopen">Reopen</button>' : '<button type="button" class="cv-btn soft sm" data-cv="close">Close</button>');
      if (staff) acts.push('<button type="button" class="cv-btn soft sm" data-cv="details" aria-expanded="' + S.details + '" aria-controls="cvDetails">Details</button>');
      return '<header class="cv-th"><button type="button" class="cv-back" data-cv="back">Inbox</button>' +
        '<div class="cv-tt"><h2>' + esc(who) + '</h2><p>' + esc(bits.join(" · ")) + (bits.length ? " · " : "") + '<span class="cv-st st-' + c.status + '">' + esc(st) + "</span></p></div>" +
        '<div class="cv-ta">' + acts.join("") + "</div></header>";
    }
    function detailsHtml(c) {
      var v = c.visitor, rows = [];
      function r(k, val) { if (val == null || val === "") return; rows.push("<div><dt>" + esc(k) + "</dt><dd>" + esc(val) + "</dd></div>"); }
      if (v) {
        r("Name", v.name || "Not given"); r("Phone", v.phone); r("Email", v.email); r("Language", LANG[v.language] || v.language); r("Started on page", v.first_page); r("First seen", full(v.created_at)); r("Last seen", full(v.last_seen_at));
      }
      if (c.student_name) { r("Client", c.student_name + (c.student_ref ? ", " + c.student_ref : "")); }
      r("Owner", c.owner_name ? c.owner_name + " (" + (ROLE[c.owner_role] || c.owner_role) + ")" : ROLE[c.owner_role]);
      if (c.forward) r("Hand-over", (c.forward.status === "sent" ? "Sent" : c.forward.status === "accepted" ? "Accepted" : c.forward.status === "done" ? "Done" : c.forward.status === "returned" ? "Returned" : c.forward.status) + ", " + full(c.forward.created_at));
      if (c.forward && c.forward.note) r("Hand-over note", c.forward.note);
      if (c.lead_id) r("Lead", "Lead " + c.lead_id + " is linked");
      r("Started", full(c.created_at));
      var mem = (c.members || []).map(function (m) { return (m.name || (m.visitor_id ? "Visitor" : "Member")) + (m.role ? " (" + (ROLE[m.role] || m.role) + ")" : ""); });
      if (mem.length) r("In this conversation", mem.join(", "));
      var acts = [];
      if (c.kind === "public" && v && opts.canLead !== false && !c.lead_id) acts.push('<button type="button" class="cv-btn soft sm" data-cv="lead">Create lead</button>');
      if (c.kind === "public" && v && opts.canBlock !== false) acts.push(v.blocked ? '<button type="button" class="cv-btn soft sm" data-cv="unblock">Unblock visitor</button>' : '<button type="button" class="cv-btn soft sm danger" data-cv="block">Block visitor</button>');
      if (c.student_id && opts.onOpenStudent) acts.push('<button type="button" class="cv-btn soft sm" data-cv="student" data-id="' + c.student_id + '">Open client file</button>');
      return '<aside class="cv-det" id="cvDetails" aria-label="Details"><div class="cv-det-h"><h3>Details</h3><button type="button" class="cv-x" data-cv="details" aria-label="Close details">Close</button></div><dl>' + rows.join("") + "</dl>" + (acts.length ? '<div class="cv-det-a">' + acts.join("") + "</div>" : "") + "</aside>";
    }
    function msgHtml(m) {
      var d = when(m.created_at), t = d ? hm(d) : "", s = m.sender || {};
      if (m.kind === "system") return '<li class="cv-m sys" data-id="' + m.id + '"><p>' + esc(m.body) + "</p><time>" + esc(t) + "</time></li>";
      var name = m.mine ? "You" : (s.name || (s.type === "visitor" ? "Visitor" : "Dolphin")), role = !m.mine && staff && s.role ? (ROLE[s.role] || s.role) : (!m.mine && !staff && s.type === "user" && STAFF.indexOf(s.role) > -1 ? "Dolphin" : "");
      if (m.kind === "note") return '<li class="cv-m note' + (m.mine ? " me" : "") + '" data-id="' + m.id + '"><small><b>Internal note</b> · ' + esc(name) + (role ? ", " + esc(role) : "") + " · " + esc(t) + "</small><p>" + esc(m.body) + "</p></li>";
      var cls = m.mine ? " me" : "";
      return '<li class="cv-m' + cls + (m._pending ? " pend" : "") + (m._failed ? " fail" : "") + '" data-id="' + esc(m.id) + '">' +
        (m.mine ? "" : '<small><b>' + esc(name) + "</b>" + (role ? ", " + esc(role) : "") + " · " + esc(t) + "</small>") +
        "<p>" + esc(m.body) + "</p>" +
        (m.mine ? '<small class="cv-mt">' + (m._failed ? 'Not sent. <button type="button" class="cv-link" data-cv="retry" data-cid="' + esc(m.client_id) + '">Try again</button>' : m._pending ? "Sending" : esc(t)) + "</small>" : "") + "</li>";
    }
    function msgsHtml() {
      var all = S.msgs.concat(S.pending), out = [], last = null;
      if (!all.length) return '<li class="cv-none"><p>' + esc(staff ? "No messages yet." : "Write your first message below.") + "</p></li>";
      all.forEach(function (m) {
        var d = when(m.created_at) || new Date();
        if (!last || !sameDay(d, last)) out.push('<li class="cv-day" role="presentation"><span>' + esc(dayLabel(d)) + "</span></li>");
        last = d; out.push(msgHtml(m));
      });
      return out.join("");
    }
    function composerHtml(c) {
      var canReply = S.can.reply !== false, canNote = !!S.can.note && staff;
      if (!canReply && !canNote) return '<footer class="cv-comp"><p class="cv-hint">You can read this conversation.</p></footer>';
      if (c.status === "closed" && staff) return '<footer class="cv-comp cv-closed"><p class="cv-hint">This conversation is closed.' + (S.can.close ? ' Reopen it to write again.' : "") + "</p>" + (S.can.close ? '<button type="button" class="cv-btn sm" data-cv="reopen">Reopen</button>' : "") + "</footer>";
      if (c.visitor && c.visitor.blocked && !canNote) return '<footer class="cv-comp"><p class="cv-hint">This visitor is blocked.</p></footer>';
      var noteOnly = !canReply && canNote; if (noteOnly) S.note = true;
      return '<footer class="cv-comp' + (S.note ? " is-note" : "") + '">' +
        '<p class="cv-typing" data-cv="typing" aria-live="polite"></p>' +
        '<label class="cv-sr" for="cvBox">' + (S.note ? "Internal note" : "Message") + "</label>" +
        '<textarea id="cvBox" class="cv-box" data-cv="box" rows="1" maxlength="2000" placeholder="' + (S.note ? "Internal note, seen by staff only" : "Write a reply") + '"></textarea>' +
        '<div class="cv-cr"><div class="cv-tools">' +
          (canNote && !noteOnly ? '<button type="button" class="cv-pill" data-cv="note" aria-pressed="' + S.note + '">Internal note</button>' : "") +
          (useCanned ? '<button type="button" class="cv-pill" data-cv="canned" aria-expanded="false" aria-haspopup="true">Saved replies</button>' : "") +
          '<span class="cv-hint cv-kb">Enter to send, Shift and Enter for a new line</span>' +
        '</div><button type="button" class="cv-btn" data-cv="send">' + (S.note ? "Add note" : "Send") + "</button></div></footer>";
    }
    function paintThread() {
      host.classList.toggle("has-open", !!S.cur);
      if (!S.cur) { threadEl.innerHTML = '<div class="cv-pick"><p class="cv-pick-t">' + esc(staff ? "Choose a conversation" : "Your messages") + '</p><p>' + esc(staff ? "Website chats, students and parents. New messages appear here live." : "Pick a conversation, or start a new one.") + "</p></div>"; return; }
      if (S.threadLoading && !S.conv) { threadEl.innerHTML = '<div class="cv-tsk" aria-busy="true"><i></i><i></i><i class="r"></i><i></i><i class="r"></i></div>'; return; }
      if (S.threadErr && !S.conv) { threadEl.innerHTML = '<div class="cv-pick"><p class="cv-pick-t">This conversation cannot be opened</p><p>' + esc(S.threadErr.status === 404 ? "It may have been moved to another branch or removed." : api.message(S.threadErr)) + '</p><button type="button" class="cv-btn soft sm" data-cv="back">Back to inbox</button></div>'; return; }
      var c = S.conv, box = $("[data-cv=box]", threadEl), draft = box ? box.value : (S._draft || "");
      threadEl.innerHTML = convHead(c) + '<div class="cv-body' + (S.details ? " det-on" : "") + '"><ol class="cv-msgs" data-cv="msgs" aria-label="Messages">' + msgsHtml() + "</ol>" + (staff && S.details ? detailsHtml(c) : "") + "</div>" + composerHtml(c);
      var nb = $("[data-cv=box]", threadEl); if (nb) { nb.value = draft; grow(nb); }
      paintTyping(); scrollDown(true);
    }
    function paintMsgs(stick) {
      var ol = $("[data-cv=msgs]", threadEl); if (!ol) { paintThread(); return; }
      var near = ol.scrollHeight - ol.scrollTop - ol.clientHeight < 120;
      ol.innerHTML = msgsHtml(); if (near || stick) scrollDown(true);
    }
    function scrollDown(now) { var ol = $("[data-cv=msgs]", threadEl); if (ol) ol.scrollTop = ol.scrollHeight; }
    function grow(t) { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 180) + "px"; }
    function paintTyping() { var p = $("[data-cv=typing]", threadEl); if (p) p.textContent = S.typingWho ? S.typingWho + " is typing" : ""; }
    function lastId() { var m = S.msgs.filter(function (x) { return typeof x.id === "number"; }); return m.length ? m[m.length - 1].id : 0; }
    var readT = null;
    function markRead() {
      if (!S.cur || doc.hidden) return; var id = lastId(); if (!id) return;
      clearTimeout(readT); readT = setTimeout(function () {
        api.post("/api/conversations/" + S.cur + "/read", { id: id }).then(function () { var r = S.rows.filter(function (x) { return x.id === S.cur; })[0]; if (r && r.unread) { S.unread = Math.max(0, S.unread - r.unread); r.unread = 0; paintList(); emitUnread(); } }, function () { /* read receipts are best effort */ });
      }, 400);
    }
    var tt = 0;
    function open(id, focus) {
      id = +id || null; if (S.cur && S.cur !== id && live) live.unsub(S.cur);
      if (!id) { S.cur = null; S.conv = null; S.msgs = []; S.pending = []; paintThread(); paintList(); return Promise.resolve(); }
      var same = S.cur === id; S.cur = id; if (!same) { S.conv = null; S.msgs = []; S.pending = []; S.note = false; S.typingWho = null; S._draft = ""; }
      S.threadLoading = true; S.threadErr = null; paintList(); paintThread();
      if (live) live.sub(id);
      var my = ++tt;
      return api.get("/api/conversations/" + id).then(function (b) {
        if (my !== tt || S.dead) return;
        S.threadLoading = false; S.conv = b.conversation; S.msgs = (b.messages || []).slice(); S.can = b.can || {};
        if (!S.can.note && !staff) S.note = false;
        paintThread(); markRead();
        var r = S.rows.filter(function (x) { return x.id === id; })[0]; if (!r && matches(b.conversation)) upsert(b.conversation);
        if (focus) { var bx = $("[data-cv=box]", threadEl); if (bx && window.innerWidth > 760) bx.focus(); else threadEl.focus(); }
      }, function (e) { if (my !== tt || S.dead) return; S.threadLoading = false; S.threadErr = e; paintThread(); });
    }
    function pollThread() {
      if (!S.cur || !S.conv) return;
      var id = S.cur;
      api.get("/api/conversations/" + id + "/messages", { after: lastId() }).then(function (b) {
        if (S.cur !== id) return; var add = (b.items || []).filter(function (m) { return !S.msgs.some(function (x) { return x.id === m.id; }); });
        if (b.status && S.conv.status !== b.status) { S.conv.status = b.status; paintThread(); }
        if (add.length) { add.forEach(addMsg); }
      }, function () { /* next poll */ });
    }
    function addMsg(m) {
      if (S.msgs.some(function (x) { return x.id === m.id; })) return;
      if (m.client_id) S.pending = S.pending.filter(function (p) { return p.client_id !== m.client_id; });
      S.msgs.push(m); S.msgs.sort(function (a, b) { return a.id - b.id; });
      if (!m.mine && m.kind !== "system") { S.typingWho = null; ann.textContent = "New message from " + ((m.sender && m.sender.name) || "visitor") + ": " + String(m.body || "").slice(0, 140); }
      paintMsgs(m.mine); markRead();
    }

    /* ---------- sending ---------- */
    function send(retry) {
      var box = $("[data-cv=box]", threadEl), body = retry ? retry.body : (box ? box.value.trim() : "");
      if (!body || !S.cur) return;
      if (body.length > 2000) { toast("Keep a message under 2000 characters."); return; }
      var id = S.cur, note = retry ? retry.kind === "note" : S.note;
      if (note) {
        var b0 = $("[data-cv=send]", threadEl); if (b0) { b0.disabled = true; b0.classList.add("is-loading"); }
        api.post("/api/conversations/" + id + "/notes", { body: body }).then(function (m) { if (box) { box.value = ""; grow(box); } m.mine = true; if (S.cur === id) addMsg(m); if (b0) { b0.disabled = false; b0.classList.remove("is-loading"); } },
          function (e) { if (b0) { b0.disabled = false; b0.classList.remove("is-loading"); } toast(api.message(e)); });
        return;
      }
      var cid = retry ? retry.client_id : uid(), p = { id: cid, client_id: cid, body: body, kind: "text", mine: true, created_at: new Date().toISOString().replace("T", " ").slice(0, 19), _pending: true };
      S.pending = S.pending.filter(function (x) { return x.client_id !== cid; }).concat([p]);
      if (box && !retry) { box.value = ""; grow(box); }
      paintMsgs(true);
      api.post("/api/conversations/" + id + "/messages", { body: body, client_id: cid }).then(function (m) {
        m.mine = true; if (S.cur !== id) return; S.pending = S.pending.filter(function (x) { return x.client_id !== cid; }); addMsg(m);
        if (S.conv && S.conv.status === "closed") open(id);
      }, function (e) {
        var x = S.pending.filter(function (q) { return q.client_id === cid; })[0]; if (x) { x._pending = false; x._failed = true; } paintMsgs();
        if (e.status === 429) toast("Slow down a little: too many messages in a short time."); else if (e.status !== 401) toast(api.message(e));
      });
    }

    /* ---------- canned replies (saved per user in this browser) ---------- */
    function canned() { var v = store(cannedKey); if (v) { try { var a = JSON.parse(v); if (Array.isArray(a)) return a; } catch (e) { /* reset */ } } return CANNED_DEFAULT.slice(); }
    function cannedMenu(btn) {
      var old = $(".cv-pop", threadEl); if (old) { old.remove(); btn.setAttribute("aria-expanded", "false"); return; }
      var list = canned(), pop = doc.createElement("div"); pop.className = "cv-pop"; pop.setAttribute("role", "menu"); pop.setAttribute("aria-label", "Saved replies");
      pop.innerHTML = (list.length ? list.map(function (c, i) { return '<button type="button" role="menuitem" class="cv-pi" data-cv="canned-use" data-i="' + i + '"><b>' + esc(c.t) + "</b><span>" + esc(c.b) + "</span></button>"; }).join("") : '<p class="cv-hint">No saved replies yet.</p>') +
        '<button type="button" role="menuitem" class="cv-pi cv-pi-m" data-cv="canned-edit"><b>Edit saved replies</b></button>';
      btn.parentNode.appendChild(pop); btn.setAttribute("aria-expanded", "true");
      var f = $("button", pop); if (f) f.focus();
    }
    function cannedEdit() {
      var list = canned();
      function rowH(c, i) { return '<div class="cv-ce" data-i="' + i + '"><label><span>Short name</span><input class="cv-in" name="t" maxlength="40" value="' + esc(c.t) + '"></label><label><span>Reply</span><textarea class="cv-in" name="b" rows="2" maxlength="2000">' + esc(c.b) + '</textarea></label><button type="button" class="cv-link" data-cv="ce-del">Remove</button></div>'; }
      dialog({ title: "Saved replies", lead: "Kept in this browser for your account. Use them from Saved replies under the message box.", ok: "Save replies",
        body: '<div class="cv-ces">' + list.map(rowH).join("") + '</div><button type="button" class="cv-btn soft sm" data-cv="ce-add">Add a reply</button>',
        ready: function (d) {
          d.addEventListener("click", function (e) {
            if (e.target.closest("[data-cv=ce-add]")) { var w = $(".cv-ces", d); w.insertAdjacentHTML("beforeend", rowH({ t: "", b: "" }, w.children.length)); $(".cv-ce:last-child input", w).focus(); }
            var del = e.target.closest("[data-cv=ce-del]"); if (del) del.closest(".cv-ce").remove();
          });
        },
        submit: function (f) {
          var out = $$(".cv-ce", f).map(function (r) { return { t: $("[name=t]", r).value.trim(), b: $("[name=b]", r).value.trim() }; }).filter(function (c) { return c.b; }).map(function (c) { return { t: c.t || c.b.slice(0, 30), b: c.b }; });
          store(cannedKey, JSON.stringify(out)); toast("Saved replies updated");
        } });
    }

    /* ---------- actions ---------- */
    function forward() {
      var c = S.conv; if (!c) return;
      var many = forwardTo.length > 1;
      dialog({ title: forwardTo.length === 1 ? (forwardTo[0].action || "Pass to " + forwardTo[0].label.toLowerCase()) : "Pass on", ok: "Pass on",
        lead: "The whole conversation goes with it. You stay in the conversation and can still read and reply.",
        body: (many ? '<label class="cv-fl"><span>Pass to</span><select class="cv-in" name="to">' + forwardTo.map(function (f) { return '<option value="' + esc(f.role) + '">' + esc(f.label) + "</option>"; }).join("") + "</select></label>" : "") +
          '<label class="cv-fl"><span>Note for them (optional)</span><textarea class="cv-in" name="note" rows="3" maxlength="1000" placeholder="What they need to know, what you already said"></textarea></label>',
        submit: function (f) {
          var to = many ? f.elements.to.value : forwardTo[0].role;
          return api.post("/api/conversations/" + c.id + "/forward", { note: f.elements.note.value.trim() || undefined, to_role: to }).then(function (b) {
            toast(opts.forwardedText || "Passed on. You can follow it in Forwards."); if (b && b.conversation) upsert(b.conversation); if (opts.onForward) opts.onForward(b); open(c.id);
          });
        } });
    }
    function setStatus(act) {
      var c = S.conv; if (!c) return;
      api.post("/api/conversations/" + c.id + "/" + act, {}).then(function (b) { if (b && b.conversation) { S.conv = Object.assign(S.conv, b.conversation); upsert(b.conversation); } toast(act === "close" ? "Conversation closed" : "Conversation reopened"); open(c.id); }, function (e) { toast(api.message(e)); });
    }
    function block(on) {
      var c = S.conv; if (!c || !c.visitor) return;
      if (!on) { api.post("/api/visitors/" + c.visitor.id + "/unblock", {}).then(function () { toast("Visitor unblocked"); open(c.id); }, function (e) { toast(api.message(e)); }); return; }
      dialog({ title: "Block this visitor", ok: "Block visitor", danger: true, lead: "They will not be able to write again from this browser. Their chat stays in the inbox.",
        body: '<label class="cv-fl"><span>Reason (kept in the history)</span><input class="cv-in" name="reason" maxlength="300" placeholder="For example: abusive messages"></label>',
        submit: function (f) { return api.post("/api/visitors/" + c.visitor.id + "/block", { reason: f.elements.reason.value.trim() || undefined }).then(function () { toast("Visitor blocked"); open(c.id); loadList(true); }); } });
    }
    function lead() {
      var c = S.conv; if (!c) return;
      var b = $("[data-cv=lead]", threadEl); if (b) { b.disabled = true; b.classList.add("is-loading"); }
      api.post("/api/conversations/" + c.id + "/lead", {}).then(function (r) { toast(r.created ? "Lead created for the branch manager" : "This chat is already linked to a lead"); if (opts.onLead) opts.onLead(r, c); open(c.id); },
        function (e) { if (b) { b.disabled = false; b.classList.remove("is-loading"); } toast(e.status === 400 ? (e.message || "Ask the visitor for a phone number or email first.") : api.message(e)); });
    }
    function newConv() {
      dialog({ title: "New message", ok: "Send", lead: "The Dolphin team replies here. You will see the reply in this inbox.",
        body: '<label class="cv-fl"><span>Subject</span><input class="cv-in" name="subject" maxlength="160" required></label><label class="cv-fl"><span>Message</span><textarea class="cv-in" name="body" rows="4" maxlength="2000" required></textarea></label>',
        submit: function (f) {
          var s = f.elements.subject.value.trim(), b = f.elements.body.value.trim();
          if (!s || !b) throw new Error("Add a subject and a message.");
          return api.post("/api/conversations", { subject: s, body: b, client_id: uid() }).then(function (r) { loadList(true); open(r.conversation.id, true); if (opts.onRoute) opts.onRoute(r.conversation.id); });
        } });
    }

    /* ---------- events ---------- */
    host.addEventListener("click", function (e) {
      var t = e.target.closest("[data-cv]"); if (!t || !host.contains(t)) { var pop = $(".cv-pop", threadEl); if (pop && !e.target.closest(".cv-pop")) { pop.remove(); var cb = $("[data-cv=canned]", threadEl); if (cb) cb.setAttribute("aria-expanded", "false"); } return; }
      var k = t.getAttribute("data-cv");
      if (k !== "canned" && k !== "canned-use" && k !== "canned-edit") { var p0 = $(".cv-pop", threadEl); if (p0) p0.remove(); }
      if (k === "open") { var id = +t.dataset.id; if (opts.onRoute) opts.onRoute(id); open(id, true); return; }
      if (k === "back") { if (opts.onRoute) opts.onRoute(null); open(null); var r0 = $(".cv-row", rowsEl); if (r0) r0.focus(); return; }
      if (k === "kind" || k === "status") { S[k] = t.dataset.v; $$("[data-cv=" + k + "]", host).forEach(function (b) { b.setAttribute("aria-pressed", String(b === t)); }); loadList(); return; }
      if (k === "reload") { loadList(); return; }
      if (k === "send") { send(); return; }
      if (k === "retry") { var pm = S.pending.filter(function (x) { return x.client_id === t.dataset.cid; })[0]; if (pm) { pm._failed = false; pm._pending = true; paintMsgs(); send(pm); } return; }
      if (k === "note") { var bx = $("[data-cv=box]", threadEl); S._draft = bx ? bx.value : ""; S.note = !S.note; paintThread(); var nb = $("[data-cv=box]", threadEl); if (nb) nb.focus(); return; }
      if (k === "canned") { cannedMenu(t); return; }
      if (k === "canned-use") { var c = canned()[+t.dataset.i], box = $("[data-cv=box]", threadEl); if (c && box) { box.value = (box.value ? box.value.replace(/\s*$/, " ") : "") + c.b; grow(box); box.focus(); } var pp = $(".cv-pop", threadEl); if (pp) pp.remove(); return; }
      if (k === "canned-edit") { var p2 = $(".cv-pop", threadEl); if (p2) p2.remove(); cannedEdit(); return; }
      if (k === "forward") { forward(); return; }
      if (k === "close" || k === "reopen") { setStatus(k); return; }
      if (k === "details") { S.details = !S.details; var bx2 = $("[data-cv=box]", threadEl); S._draft = bx2 ? bx2.value : ""; paintThread(); var db = $(S.details ? ".cv-det .cv-x" : ".cv-ta [data-cv=details]", threadEl); if (db) db.focus(); return; }
      if (k === "block") { block(true); return; }
      if (k === "unblock") { block(false); return; }
      if (k === "lead") { lead(); return; }
      if (k === "student") { opts.onOpenStudent(+t.dataset.id); return; }
      if (k === "new") { newConv(); return; }
    });
    var qt = null;
    host.addEventListener("input", function (e) {
      if (e.target.matches("[data-cv=q]")) { clearTimeout(qt); qt = setTimeout(function () { S.q = e.target.value.trim(); loadList(); }, 300); return; }
      if (e.target.matches("[data-cv=box]")) { grow(e.target); if (S.cur && !S.note && live && e.target.value) live.typing(S.cur); }
    });
    host.addEventListener("keydown", function (e) {
      if (e.target.matches("[data-cv=box]") && e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); return; }
      if (e.key === "Escape") {
        var pop = $(".cv-pop", threadEl); if (pop) { e.preventDefault(); e.stopPropagation(); pop.remove(); var cb = $("[data-cv=canned]", threadEl); if (cb) { cb.setAttribute("aria-expanded", "false"); cb.focus(); } return; }
        if (S.details) { e.preventDefault(); S.details = false; paintThread(); return; }
      }
      /* arrow keys move through the conversation list */
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && e.target.matches(".cv-row")) {
        e.preventDefault(); var all = $$(".cv-row", rowsEl), i = all.indexOf(e.target), n = all[i + (e.key === "ArrowDown" ? 1 : -1)]; if (n) n.focus();
      }
    });
    function onVis() { if (!doc.hidden) markRead(); }
    doc.addEventListener("visibilitychange", onVis);

    /* ---------- live ---------- */
    if (live) {
      offs.push(live.on("state", function (s) { paintLive(); if (s.state === "live") { loadList(true); if (S.cur) pollThread(); } }));
      offs.push(live.on("msg", function (f) {
        var m = f.message; if (!m) return;
        if (m.kind === "note" && !staff) return;
        if (S.cur === f.conv) addMsg(m);
        var r = S.rows.filter(function (x) { return x.id === f.conv; })[0];
        if (r) { r.last_message = m; r.last_message_at = m.created_at; if (S.cur !== f.conv && !m.mine) r.unread = (r.unread || 0) + 1; sortRows(); paintList(); }
      }));
      offs.push(live.on("conv", function (f) {
        var c = f.conversation; if (!c) return;
        var had = S.rows.some(function (r) { return r.id === c.id; });
        if (!had && staff && !(c.last_message && c.last_message.mine)) ann.textContent = (c.kind === "public" ? "New website chat from " : "New message from ") + titleOf(c);
        upsert(c);
        if (S.cur === c.id && S.conv) { var st = S.conv.status, bl = S.conv.visitor && S.conv.visitor.blocked; Object.assign(S.conv, c); if (st !== c.status || (c.visitor && c.visitor.blocked) !== bl) open(c.id); }
        softReload();
      }));
      offs.push(live.on("typing", function (f) {
        if (f.conv !== S.cur || !f.who) return; if (f.who.type === "user" && f.who.id === me.id) return;
        S.typingWho = f.who.name || (f.who.type === "visitor" ? "The visitor" : "Someone"); paintTyping();
        clearTimeout(S.typingT); S.typingT = setTimeout(function () { S.typingWho = null; paintTyping(); }, 4000);
      }));
      live.poll("convo-list", function () { loadList(true); });
      live.poll("convo-thread", pollThread);
      live.start();
    }
    paintLive(); loadList(); paintThread();

    return {
      el: host,
      open: function (id) { return open(id, true); },
      close: function () { open(null); },
      refresh: function () { loadList(true); if (S.cur) open(S.cur); },
      current: function () { return S.cur; },
      unread: function () { return S.unread; },
      setFilter: function (o) { if (o.kind != null) S.kind = o.kind; if (o.status != null) S.status = o.status; $$("[data-cv=kind]", host).forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === S.kind)); }); $$("[data-cv=status]", host).forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === S.status)); }); loadList(); },
      destroy: function () {
        S.dead = true; if (S.cur && live) live.unsub(S.cur); offs.forEach(function (f) { f(); }); if (live) { live.unpoll("convo-list"); live.unpoll("convo-thread"); }
        doc.removeEventListener("visibilitychange", onVis); clearTimeout(rt); clearTimeout(readT); host.innerHTML = ""; host.classList.remove("cv", "has-open");
      }
    };
  }

  window.Convo = { mount: mount, dialog: dialog, toast: toast, time: { short: short, full: full, when: when }, labels: { role: ROLE, lang: LANG, status: STATUS, kind: KIND } };
})();
