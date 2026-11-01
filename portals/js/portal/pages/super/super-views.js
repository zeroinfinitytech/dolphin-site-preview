/* System console screens, part 1: Overview, Audit, Sign-ins and sessions, Visitors, Server, Live conversations, Backups.
   API: HANDOFF_PHASE_A.md section 11 (/api/sys/*) and 6 (/api/admin/backups). */
(function () {
  "use strict";
  var K = window.K, A = K.api, esc = K.esc, S = K.state;

  /* ---------- shared lookups (cached for the session) ---------- */
  S.api = { branches: "/api/sys/branches", users: "/api/sys/users" };
  S.users = function (force) { if (!S._u || force) S._u = A.get("/api/sys/users", { limit: 100 }).then(function (r) { var all = r.items; if ((r.pages || 1) > 1) { var ps = []; for (var p = 2; p <= r.pages; p++) ps.push(A.get("/api/sys/users", { limit: 100, page: p })); return Promise.all(ps).then(function (rs) { rs.forEach(function (x) { all = all.concat(x.items); }); return all; }); } return all; }); return S._u; };
  S.branches = function (force) { if (!S._b || force) S._b = A.get("/api/sys/branches").then(function (r) { return r.items; }); return S._b; };
  S.bname = function (bs, id) { var b = (bs || []).filter(function (x) { return +x.id === +id; })[0]; return b ? b.name : id ? "Branch " + id : "All branches"; };
  S.branchOpts = function (bs, all) { return K.opts(bs.map(function (b) { return [String(b.id), b.name + (b.active ? "" : " (closed)")]; }), all); };
  function who(r) { return r.user_name ? esc(r.user_name) + "<small>" + esc(K.role(r.user_role)) + "</small>" : '<span class="k-mute">System</span>'; }

  /* ================= Overview ================= */
  function overview(c) {
    return Promise.all([A.get("/api/sys/overview"), A.get("/api/sys/visitors/live").catch(function () { return null; }), A.get("/api/sys/logins", { outcome: "ok", limit: 100 }).catch(function () { return null; }),
      A.get("/api/notifications", { type: "system.alert", limit: 10 }).catch(function () { return null; })]).then(function (r) {
      var o = r[0], live = r[1], lg = r[2], nt = r[3], n = o.now || {}, f = o.features || {}, today = K.today();
      S.features = f; if (S.notes) S.notes();
      var signins = lg ? lg.items.filter(function (x) { return K.dayOf(x.at) === today; }).length : null;
      var al = [];
      if (o.errors_24h) al.push(["Server errors", o.errors_24h + " server error" + (o.errors_24h === 1 ? "" : "s") + " in the last 24 hours.", "#/server"]);
      var lb = o.latest_backup, age = lb ? (Date.now() - K.toDate(lb.created_at || lb.date).getTime()) / 864e5 : null;
      if (!lb) al.push(["Backups", "No backup has been made yet.", "#/backups"]); else if (age > 2) al.push(["Backups", "The newest backup is " + Math.floor(age) + " days old.", "#/backups"]);
      if (o.logins_failed_24h >= 10) al.push(["Sign-ins", o.logins_failed_24h + " failed sign-ins in 24 hours.", "#/signins"]);
      if (f.maintenance) al.push(["Maintenance", "Maintenance mode is on. Public writes are paused.", "#/features"]);
      if (f.cms_freeze) al.push(["Website", "Publishing is frozen. Content managers can save drafts only.", "#/features"]);
      if (!f.live_chat) al.push(["Live chat", "Live chat is off. Visitors cannot start chats.", "#/features"]);
      if (o.image_processing && o.image_processing !== "ok") al.push(["Images", "Image processing is unavailable: uploads of photos fail.", "#/server"]);
      if (o.mail !== "configured") al.push(["Mail", "Mail is not configured: form emails and chat transcripts are not sent.", null, "m"]);
      (nt && nt.items || []).forEach(function (x) { al.push([x.title || "System alert", (x.body || "") + " " + K.ago(x.created_at), "#/server"]); });
      var roles = Object.keys(o.users_by_role || {}).map(function (k) { return { label: K.role(k), value: o.users_by_role[k] }; }).sort(function (a, b) { return b.value - a.value; });
      return K.sec("Alerts", al.length ? "Things that may need you." : "", al.length ? '<ul class="k-list">' + al.map(function (a) {
        return '<li class="k-rowx"><span>' + K.st(a[0], a[3]) + " &nbsp;" + esc(a[1]) + "</span>" + (a[2] ? '<a class="k-b soft sm" href="' + a[2] + '">Look</a>' : "") + "</li>";
      }).join("") + "</ul>" : K.empty("All clear", "No errors, backups are current and every feature is in its usual state.")) +
        K.sec("Health", "Sampled now. Version " + o.version + ", Node " + o.node + ".", K.kpis([
          ["Uptime", K.dur(o.uptime_s)], ["CPU", n.cpu != null ? n.cpu + " %" : null], ["Memory", n.rss_mb != null ? n.rss_mb + " MB" : null, n.heap_mb != null ? "heap " + n.heap_mb + " MB" : ""],
          ["Event loop lag", n.loop_lag_ms != null ? n.loop_lag_ms + " ms" : null], ["Requests a minute", K.num(n.req)], ["Errors this minute", (n.err4 || 0) + " / " + (n.err5 || 0), "client 4xx / server 5xx"],
          ["Slowest 5 %", n.p95_ms != null ? n.p95_ms + " ms" : null, "response time, p95"], ["Live sockets", K.num(o.sockets)], ["Database", K.bytes(o.db_bytes)],
          ["Latest backup", lb ? K.date(lb.date) : "None", lb ? K.bytes(lb.bytes) : ""], ["Mail", o.mail === "configured" ? "Configured" : "Not set up"], ["Image processing", o.image_processing === "ok" ? "Working" : "Unavailable"]])) +
        K.sec("People and traffic", "", K.kpis([["Visitors on the site now", live ? K.num(live.now) : null, "last 5 minutes"], ["Visitors today", K.num(o.visitors_today)], ["Page views today", K.num(o.page_views_today)],
          ["Sign-ins today", signins == null ? null : K.num(signins)], ["Failed sign-ins", K.num(o.logins_failed_24h), "last 24 hours"], ["Active sessions", K.num(o.sessions_active)],
          ["Open conversations", K.num(o.open_conversations), "all branches"], ["Branches", K.num((o.branches || []).filter(function (b) { return b.active; }).length), "open"]]) +
          '<div class="k-cols" style="margin-top:24px"><section><h3 class="k-h2">Accounts by role</h3>' + K.bars(roles, { label: "Accounts by role" }) + "</section>" +
          '<section><h3 class="k-h2">Features</h3>' + K.dl([["Live chat", f.live_chat ? "On" : "Off"], ["Maintenance mode", f.maintenance ? "On" : "Off"], ["Website publishing", f.cms_freeze ? "Frozen" : "Open"],
            ["Staff desks", f.staff_portal ? "On" : "Paused"], ["University portal", f.university_portal ? "On" : "Paused"]]) + '<p style="margin-top:12px"><a class="k-a" href="#/features">Change features</a></p></section></div>');
    });
  }
  K.view("overview", { title: "Overview", eyebrow: "System console", lead: "The server and the system right now. This page refreshes every 15 seconds.", render: overview,
    after: function (c) { K.every(c, 15000, function () { overview(c).then(c.body, function () { }); }); } });

  /* ================= Audit ================= */
  var ENT = ["user", "student", "lead", "application", "document", "fee", "payment", "claim", "approval", "conversation", "forward", "branch", "settings", "cms_item", "media", "testimonial", "session", "backup", "audit_log", "visa_step"];
  K.view("audit", { title: "Audit", eyebrow: "Records", lead: "Every write in the system: who, what, before and after. Pick a row for the full change.",
    render: function (c) {
      var p = c.params;
      return Promise.all([S.users(), S.branches(), A.get("/api/sys/audit", { user_id: p.user_id, branch_id: p.branch_id, entity: p.entity, action: p.action, from: p.from, to: p.to, page: p.page, limit: 50 })]).then(function (r) {
        var us = r[0], bs = r[1], res = r[2]; S.auditRows = {}; res.items.forEach(function (x) { S.auditRows[x.id] = x; });
        var q = A.qs({ user_id: p.user_id, branch_id: p.branch_id, entity: p.entity, action: p.action, from: p.from, to: p.to });
        return K.filters([
          { name: "user_id", label: "Person", type: "select", options: K.opts(us.map(function (u) { return [String(u.id), u.name + " (" + K.role(u.role) + ")"]; }), "Anyone"), w: 1 },
          { name: "branch_id", label: "Branch", type: "select", options: S.branchOpts(bs, "All branches") },
          { name: "entity", label: "Record", type: "select", options: K.opts(ENT.map(function (e) { return [e, K.lab(e)]; }), "Any record") },
          { name: "action", label: "Action", type: "search", ph: "e.g. user.* or sys.*" },
          { name: "from", label: "From", type: "date" }, { name: "to", label: "To", type: "date" }], p) +
          '<div class="k-sh"><span class="k-count">' + esc(K.num(res.total)) + ' entries</span><a class="k-b soft sm" href="/api/sys/audit.csv' + esc(q) + '" download>Export CSV</a></div>' +
          K.table([{ t: "Action", f: function (x) { return esc(K.lab(x.action)) + "<small>" + esc(K.dt(x.at)) + "</small>"; } }, { t: "Who", f: who },
            { t: "Record", f: function (x) { return esc(K.lab(x.entity)) + (x.entity_id != null ? " " + esc(x.entity_id) : ""); } }, { t: "Branch", f: function (x) { return esc(x.branch_name || "All"); } }],
            res.items, { act: "au-open", label: "Audit entries", empty: "Nothing was recorded with these filters." }) + K.pager(res, "entries");
      });
    } });
  K.acts["au-open"] = function (b) {
    var x = S.auditRows[b.getAttribute("data-id")]; if (!x) return;
    K.drawer({ title: K.lab(x.action), cap: "Audit entry " + x.id, body: K.dl([["When", K.dt(x.at)], ["Who", x.user_name ? x.user_name + ", " + K.role(x.user_role) : "System"], ["Branch", x.branch_name || "All branches"], ["Record", K.lab(x.entity) + (x.entity_id != null ? " " + x.entity_id : "")], ["Action code", x.action]]) +
      '<h3 class="k-h2" style="margin-top:12px">Before and after</h3>' + K.diff(x.before, x.after) });
  };

  /* ================= Sign-ins and sessions ================= */
  var OUT = { ok: "Signed in", need_totp: "Password right, code next", bad_password: "Wrong password", no_user: "Unknown email", inactive: "Inactive account", paused: "Portal paused", locked: "Locked out", totp_fail: "Wrong code" };
  K.view("signins", { title: "Sign-ins and sessions", eyebrow: "Records", lead: "Every sign-in attempt, and who is signed in now. Emails and network addresses are stored only as hashes.",
    render: function (c) {
      var p = c.params, tab = p.tab || "logins";
      var head = K.seg("tab", [["logins", "Sign-in attempts"], ["sessions", "Active sessions"]], tab, "View");
      if (tab === "sessions") return A.get("/api/sys/sessions").then(function (r) {
        S.sessions = {}; r.items.forEach(function (s) { S.sessions[s.id] = s; });
        return head + '<div class="k-sh"><span class="k-count">' + esc(K.num(r.items.length)) + ' active sessions</span><button type="button" class="k-b soft sm d" data-act="ss-all">Sign out everyone</button></div>' +
          K.table([{ t: "Person", f: function (s) { return esc(s.name) + "<small>" + esc(s.email) + "</small>"; }, noLink: 1 }, { t: "Role", f: function (s) { return esc(K.role(s.role)) + (s.branch_name ? "<small>" + esc(s.branch_name) + "</small>" : ""); } },
            { t: "Started", f: function (s) { return esc(K.dt(s.created_at)) + "<small>ends " + esc(K.dt(s.expires_at)) + "</small>"; } }, { t: "Device", f: function (s) { return esc(s.ua_family || "Unknown"); } },
            { t: "State", f: function (s) { return [s.current ? K.st("This session", "i") : "", s.online ? K.st("Online") : K.st("Not connected", "m"), s.impersonate_user_id ? K.st("View as") : "", s.role === "super_admin" ? (s.totp_ok ? K.st("Code passed", "m") : K.st("Code missing")) : ""].filter(Boolean).join("<br>"); } },
            { t: "Actions", f: function (s) { return s.current ? '<span class="k-mute k-small">Yours</span>' : '<button type="button" class="k-b soft sm" data-act="ss-end" data-id="' + esc(s.id) + '">End session</button> <button type="button" class="k-b sm d" data-act="ss-user" data-id="' + esc(s.user_id) + '" data-n="' + esc(s.name) + '">Sign out person</button>'; } }],
            r.items, { label: "Active sessions", empty: "Nobody is signed in." });
      });
      return Promise.all([S.users(), S.branches(), A.get("/api/sys/logins", { outcome: p.outcome, user_id: p.user_id, branch_id: p.branch_id, page: p.page, limit: 50 })]).then(function (r) {
        var us = r[0], bs = r[1], res = r[2];
        return head + K.seg("outcome", [["", "All"]].concat(Object.keys(OUT).map(function (k) { return [k, OUT[k]]; })), p.outcome || "", "Outcome") +
          K.filters([{ name: "user_id", label: "Person", type: "select", options: K.opts(us.map(function (u) { return [String(u.id), u.name]; }), "Anyone"), w: 1 }, { name: "branch_id", label: "Branch", type: "select", options: S.branchOpts(bs, "All branches") }], p) +
          K.table([{ t: "When", f: function (x) { return esc(K.dt(x.at)) + "<small>" + esc(K.ago(x.at)) + "</small>"; } },
            { t: "Person", f: function (x) { return x.user_name ? esc(x.user_name) + "<small>" + esc(x.user_email || "") + "</small>" : '<span class="k-mute">Unknown email</span><small class="k-mono">' + esc(String(x.email_hash || "").slice(0, 12)) + "</small>"; } },
            { t: "Outcome", f: function (x) { return K.st(OUT[x.outcome] || K.lab(x.outcome), x.outcome === "ok" ? "i" : x.outcome === "need_totp" ? "m" : ""); } },
            { t: "Device", f: function (x) { return esc(x.ua_family || "Unknown"); } }, { t: "Network", f: function (x) { return '<span class="k-mono">' + esc(String(x.ip_hash || "").slice(0, 10)) + "</span>"; } },
            { t: "Branch", f: function (x) { return esc(x.branch_id ? S.bname(bs, x.branch_id) : "None"); } }], res.items, { label: "Sign-in attempts", empty: "No sign-in attempts match." }) + K.pager(res, "attempts");
      });
    } });
  K.acts["ss-end"] = function (b) {
    var s = S.sessions[b.getAttribute("data-id")];
    K.confirm({ title: "End this session?", text: s.name + " is signed out on " + (s.ua_family || "that device") + ". Other sessions of this person stay.", ok: "End session",
      onSubmit: function () { return A.delete("/api/sys/sessions/" + encodeURIComponent(s.id)); } }).then(function (ok) { if (ok) { K.toast("Session ended"); K.render(); } });
  };
  K.acts["ss-user"] = function (b) { S.signOutUser(b.getAttribute("data-id"), b.getAttribute("data-n")); };
  S.signOutUser = function (id, name) {
    return K.confirm({ title: "Sign out " + name + "?", text: "Every session of this person ends now and their open pages disconnect. They can sign in again.", ok: "Sign out",
      onSubmit: function () { return A.post("/api/sys/users/" + id + "/signout", {}); } }).then(function (r) { if (r) { K.toast(r.sessions_ended != null ? r.sessions_ended + " session" + (r.sessions_ended === 1 ? "" : "s") + " ended" : "Signed out"); if (!K.drawerOpen()) K.render(); } return r; });
  };
  K.acts["ss-all"] = function () {
    K.dialog({ title: "Sign out everyone?", cap: "All portals", submit: "Sign out everyone",
      body: "<p>Every session except this one ends now: head office, branches, content managers, students and parents. Open pages disconnect and people must sign in again.</p>" +
        K.field({ name: "confirm", label: 'Type "everyone" to confirm', required: true, ac: "off" }),
      onSubmit: function (d) { if (String(d.confirm || "").toLowerCase() !== "everyone") { var e = new Error("x"); e.details = { confirm: 'Type the word "everyone".' }; throw e; } return A.post("/api/sys/signout-all", {}); }
    }).then(function (r) { if (r) { K.toast(r.sessions_ended + " sessions ended"); K.render(); } });
  };

  /* ================= Visitors ================= */
  function daysBetween(from, to) { var out = [], d = new Date(from + "T00:00:00Z"), e = new Date(to + "T00:00:00Z"); while (d <= e && out.length < 400) { out.push(d.toISOString().slice(0, 10)); d = new Date(d.getTime() + 864e5); } return out; }
  function dayShort(s) { return K.date(s).replace(/ \d{4}$/, ""); }
  function visitors(c) {
    var range = c.params.range || "7d";
    return Promise.all([A.get("/api/sys/visitors", { range: range }), A.get("/api/sys/visitors/live")]).then(function (r) {
      var v = r[0], lv = r[1], map = {};
      (v.by_day || []).forEach(function (d) { map[d.day] = d; });
      var days = daysBetween(v.from, v.to);
      var views = days.map(function (d) { return { x: dayShort(d), t: K.date(d), y: map[d] ? map[d].views : 0 }; }), vis = days.map(function (d) { return { x: dayShort(d), t: K.date(d), y: map[d] ? map[d].visitors : 0 }; });
      var obj = function (o, lab) { return Object.keys(o || {}).map(function (k) { return { label: lab ? lab(k) : k, value: o[k] }; }).sort(function (a, b) { return b.value - a.value; }); };
      return K.seg("range", [["today", "Today"], ["7d", "7 days"], ["30d", "30 days"]], range, "Range") +
        K.kpis([["Live now", K.num(lv.now), "visitors in the last 5 minutes"], ["Page views", K.num(v.views)], ["Visitors", K.num(v.visitors), "one per device per day"], ["Chats started", K.num(v.chat_starts)],
          ["Forms sent", K.num(v.form_submissions)], ["Enquiries", K.num(v.enquiries)], ["Visit to enquiry", v.conversion_pct == null ? "Not enough visits" : v.conversion_pct + " %"]]) +
        K.sec("By day", "", '<div class="k-sm">' + K.mini("Page views", K.num(v.views), views) + K.mini("Visitors", K.num(v.visitors), vis) + "</div>") +
        '<div class="k-cols">' + K.sec("Pages", "Most viewed", K.bars((v.pages || []).slice(0, 12).map(function (x) { return { label: x.path, value: x.views }; }), { empty: "No page views in this range yet.", label: "Page views by page" })) +
        K.sec("Entry pages", "Where visits start", K.bars((v.entry_pages || []).slice(0, 12).map(function (x) { return { label: x.path, value: x.entries }; }), { empty: "No visits yet.", label: "Entry pages" })) +
        K.sec("Referrers", "Sites that sent visitors", K.bars((v.referrers || []).map(function (x) { return { label: x.ref_host, value: x.views }; }), { empty: "No referring sites yet (direct visits and search apps send none).", label: "Referrers" })) +
        K.sec("Devices and languages", "", K.bars(obj(v.devices, K.lab), { empty: "No data yet.", label: "Devices" }) + '<div style="height:18px"></div>' + K.bars(obj(v.languages, function (k) { return ({ en: "English", ne: "Nepali", es: "Spanish", ko: "Korean", zh: "Chinese", unknown: "Not known" })[k] || k; }), { empty: "", label: "Languages" })) + "</div>" +
        K.sec("On the site now", "Pages seen in the last five minutes. Visitors are shown by a short daily code, never by address.",
          K.table([{ t: "Visitor", f: function (x) { return '<span class="k-mono">' + esc(x.visitor) + "</span>"; } }, { t: "Page", k: "path" }, { t: "Language", f: function (x) { return esc(x.lang || ""); } }, { t: "Device", f: function (x) { return esc(K.lab(x.device)); } }, { t: "Last seen", f: function (x) { return esc(K.ago(x.last_at)); } }],
            lv.recent.map(function (x, i) { x.id = i; return x; }), { empty: "Nobody is browsing the site right now.", emptyTitle: "Quiet right now" }) +
          (lv.chat_visitors && lv.chat_visitors.length ? '<p class="k-mute" style="margin-top:12px">' + esc(lv.chat_visitors.length) + " visitor chat window" + (lv.chat_visitors.length === 1 ? " is" : "s are") + " open.</p>" : "")) +
        ((v.monthly || []).length ? K.sec("Monthly", "Kept for 13 months", K.bars(v.monthly.map(function (m) { return { label: m.month, value: m.views }; }), { label: "Monthly page views" })) : "") +
        '<p class="k-mute k-small" style="margin-top:20px">First-party counting only: no third-party trackers, Do-Not-Track honoured, raw hits kept 30 days.</p>';
    });
  }
  K.view("visitors", { title: "Visitors", eyebrow: "Watch", lead: "Traffic on the public website, counted on our own server.", render: visitors,
    after: function (c) { K.every(c, 20000, function () { visitors(c).then(c.body, function () { }); }); } });

  /* ================= Server ================= */
  function bucket(items, max) { if (items.length <= max) return items; var size = Math.ceil(items.length / max), out = []; for (var i = 0; i < items.length; i += size) { var g = items.slice(i, i + size), o = { at: g[g.length - 1].at }; ["cpu", "rss_mb", "heap_mb", "loop_lag_ms", "req", "err4", "err5", "ws", "p95_ms"].forEach(function (k) { var s = 0, n = 0; g.forEach(function (x) { if (x[k] != null) { s += +x[k]; n++; } }); o[k] = n ? Math.round(s / n * 10) / 10 : 0; }); out.push(o); } return out; }
  K.view("server", { title: "Server", eyebrow: "Watch", lead: "Samples every minute, kept for seven days. Errors list only server-side failures, never message text.",
    render: function (c) {
      var range = c.params.range || "24h";
      return Promise.all([A.get("/api/sys/metrics", { range: range }), A.get("/api/sys/errors", { limit: 100 }), A.get("/api/sys/ws")]).then(function (r) {
        var m = r[0], er = r[1].items, ws = r[2].items, n = m.now || {};
        var rows = bucket((m.items || []).map(function (x) { x.at = String(x.at); return x; }), 120);
        var lab = function (x) { var d = K.toDate(x.at.length === 16 ? x.at + ":00" : x.at); return range === "7d" ? K.date(d).replace(/ \d{4}$/, "") : K.time(d); };
        var tip = function (x) { var d = K.toDate(x.at.length === 16 ? x.at + ":00" : x.at); return K.dt(d); };
        var ser = function (k) { return rows.map(function (x) { return { x: lab(x), t: tip(x), y: x[k] || 0 }; }); };
        /* the latest value of a series: "now" first, else the newest sample that has it; never a bare unit */
        var cur = function (k, unit) { var v = n[k]; for (var i = rows.length - 1; v == null && i >= 0; i--) v = rows[i][k]; return v == null ? "Not measured yet" : K.num(v) + (unit ? " " + unit : ""); };
        var lb = (m.backups || [])[0];
        return K.seg("range", [["1h", "Last hour"], ["24h", "24 hours"], ["7d", "7 days"]], range, "Range") +
          K.kpis([["Uptime", K.dur(m.uptime_s)], ["Version", m.version], ["Live sockets", K.num(m.sockets)], ["Database", K.bytes(m.db_bytes)], ["Client uploads", K.bytes(m.uploads_bytes)], ["Website media", K.bytes(m.media_bytes)],
            ["Latest backup", lb ? K.date(lb.date) : "None", lb ? K.bytes(lb.bytes) : ""], ["Mail", m.mail === "configured" ? "Configured" : "Not set up"]]) +
          K.sec("Load", rows.length ? "" : "The first samples appear a minute after the server starts.", '<div class="k-sm">' +
            K.mini("CPU", cur("cpu", "%"), ser("cpu"), { fmt: function (v) { return v + " %"; } }) +
            K.mini("Memory", cur("rss_mb", "MB"), ser("rss_mb"), { fmt: function (v) { return v + " MB"; } }) +
            K.mini("Requests a minute", K.num(n.req), ser("req")) +
            K.mini("Slowest 5 % of responses", cur("p95_ms", "ms"), ser("p95_ms"), { fmt: function (v) { return v + " ms"; } }) +
            K.mini("Event loop lag", cur("loop_lag_ms", "ms"), ser("loop_lag_ms"), { fmt: function (v) { return v + " ms"; } }) +
            K.mini("Server errors a minute", K.num(n.err5 || 0), ser("err5")) +
            K.mini("Client errors a minute", K.num(n.err4 || 0), ser("err4")) +
            K.mini("Live sockets", K.num(n.ws || 0), ser("ws")) + "</div>") +
          K.sec("Slowest endpoints", "Since the server started", K.table([{ t: "Endpoint", f: function (x) { return '<span class="k-mono">' + esc(x.endpoint) + "</span>"; } }, { t: "Calls", f: function (x) { return esc(K.num(x.count)); }, cls: "r" }, { t: "Average", f: function (x) { return esc(x.avg_ms + " ms"); }, cls: "r" }, { t: "Slowest", f: function (x) { return esc(x.max_ms + " ms"); }, cls: "r" }],
            (m.slowest || []).map(function (x, i) { x.id = i; return x; }), { empty: "No requests timed yet." })) +
          K.sec("Error log", "Server failures (5xx) with their request id, for the last 30 days.", K.table([{ t: "When", f: function (x) { return esc(K.dt(x.at)); } }, { t: "Request", f: function (x) { return '<span class="k-mono">' + esc(x.method + " " + x.path) + "</span><small class=\"k-mono\">" + esc(x.request_id || "") + "</small>"; } },
            { t: "Status", f: function (x) { return K.st(String(x.status)) + (x.code ? "<small>" + esc(x.code) + "</small>" : ""); } }, { t: "Message", f: function (x) { return esc(x.message_safe || ""); } }],
            er.map(function (x, i) { x.id = x.id || i; return x; }), { emptyTitle: "No server errors", empty: "Nothing failed on the server in the kept period." })) +
          K.sec("Connected sockets", "Open real-time connections now.", K.table([{ t: "Who", f: function (x) { return x.user ? esc(x.user.name) + "<small>" + esc(K.role(x.user.role)) + "</small>" : '<span class="k-mono">' + esc(String(x.visitor && x.visitor.id || "").slice(0, 8)) + "</span><small>" + esc(x.visitor && x.visitor.name || "Website visitor") + "</small>"; } },
            { t: "Portal", f: function (x) { return esc(K.lab(x.portal)) + (x.read_only ? "<small>View as, read only</small>" : ""); } }, { t: "Open conversations", f: function (x) { return esc(K.num(x.rooms)); }, cls: "r" }, { t: "Since", f: function (x) { return esc(K.ago(x.since)); } }],
            ws.map(function (x, i) { x.id = i; return x; }), { emptyTitle: "No sockets open", empty: "Nobody has a portal or a chat window open right now." }));
      });
    },
    /* silent refresh (no skeleton flash): re-run the render into the body */
    after: function (c) { K.every(c, 60000, function () { Promise.resolve(K.views.server.render(c)).then(c.body, function () { }); }); } });

  /* ================= Backups ================= */
  K.view("backups", { title: "Backups", eyebrow: "Control", lead: "A copy of the database and uploaded files is made every day and kept for 30 days.",
    acts: '<button type="button" class="k-b p" data-act="bk-run">Back up now</button>',
    render: function () {
      return A.get("/api/admin/backups").then(function (r) {
        return K.table([{ t: "Date", f: function (x) { return esc(K.date(x.date)) + "<small>" + esc(K.dt(x.created_at)) + "</small>"; } }, { t: "Database", cls: "r", f: function (x) { return x.db ? esc(K.bytes(x.bytes)) : K.st("Missing"); } }, { t: "Uploaded files", f: function (x) { return esc(K.num(x.upload_files)); }, cls: "r" }],
          r.items.map(function (x) { x.id = x.date; return x; }), { emptyTitle: "No backups yet", empty: "Run the first backup with Back up now." }) +
          K.sec("Where they are", "", K.dl([["Folder on the server", r.root], ["Kept for", r.keep_days + " days"]]) +
            '<p class="k-mute" style="margin-top:14px">Download is not offered here: the API has no backup download yet, so copy the folder from the server. Restore is a manual step: stop the server, copy <span class="k-mono">dolphin.db</span> from a dated folder over the live database (remove the -wal and -shm files), copy uploads and media back, start the server.</p>');
      });
    } });
  K.acts["bk-run"] = function (b) { K.run(b, A.post("/api/admin/backups", {}), "Backup made").then(function () { K.render(); }, function () { }); };

  /* ================= Live conversations ================= */
  K.view("live", { title: "Live conversations", eyebrow: "Watch", lead: "Every open conversation in every branch, read only. Join only when a branch needs help: you post as Dolphin support (system), and it is audited.",
    render: function (c) {
      if (!window.Convo) return K.empty("Conversations did not load", "The shared conversation component (js/portal/core/convo.js) is missing. Reload the page.");
      return S.branches().then(function (bs) {
        return K.filters([{ name: "branch_id", label: "Branch", type: "select", options: S.branchOpts(bs, "All branches") }], c.params) +
          '<div class="k-convo" id="sysConvo"></div>' +
          '<form class="k-join" id="sysJoin" data-form="lv-join" hidden><h2 class="k-h2">Join this conversation</h2><p class="k-mute">Your message appears to everyone in it as "Dolphin support (system)". Use it only to unblock the branch team; it is recorded in the audit log.</p>' +
          K.field({ name: "body", label: "Message", type: "textarea", max: 2000, required: true }) + '<p class="k-err err" data-for="form" role="alert" hidden></p><div class="k-acts"><button type="submit" class="k-b p">Post as Dolphin support</button></div></form>';
      });
    },
    after: function (c) {
      var host = K.$("#sysConvo"); if (!host || !window.Convo) return;
      host.style.setProperty("--cv-h", "max(520px, calc(100dvh - 330px))");
      var me = S.imp ? { id: S.sa.id, name: S.sa.name, role: "super_admin" } : S.me.user;
      var inst = window.Convo.mount(host, { me: me, staff: true, title: c.params.branch_id ? "One branch" : "All branches", showBranch: true, forwardTo: [], canned: false, canLead: false, canBlock: false,
        statuses: [{ k: "active", t: "Open" }, { k: "open", t: "Waiting" }, { k: "forwarded", t: "Passed on" }, { k: "closed", t: "Closed" }],
        query: c.params.branch_id ? { branch_id: c.params.branch_id } : {}, emptyText: "No conversations in this view right now. New ones appear the moment they start.",
        onRoute: function (id) { S.liveCur = id || null; var f = K.$("#sysJoin"); if (f) f.hidden = !id; } });
      S.liveInst = inst;
      c.leave(function () { try { inst.destroy(); } catch (e) { /* already gone */ } S.liveInst = null; S.liveCur = null; });
    } });
  K.acts["lv-join"] = function (f) {
    var d = K.formData(f), b = f.querySelector("[type=submit]");
    if (!S.liveCur) return;
    if (!d.body) return A.showErrors(f, { details: { body: "Write the message first." } });
    A.busy(b, true);
    A.post("/api/sys/conversations/" + S.liveCur + "/join", { body: d.body, client_id: K.uid() }).then(function () {
      A.busy(b, false); f.reset(); K.toast("Posted as Dolphin support"); if (S.liveInst) S.liveInst.open(S.liveCur);
    }, function (e) { A.busy(b, false); A.showErrors(f, e); var g = f.querySelector(".err[data-for=form]"); g.textContent = K.msg(e); g.hidden = false; });
  };
})();
