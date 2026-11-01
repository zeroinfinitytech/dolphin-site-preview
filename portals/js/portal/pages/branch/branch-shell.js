/* Branch portal (staff.html) for the branch head ("head" view) and the branch manager ("manager" view). Built on the consoles kit (js/portal/core/admin-kit.js).
   Everything is the signed-in user's own branch: the server scopes every list and answers 404 for another branch's ids, so the UI never asks for
   a branch. Sensitive actions a manager cannot do answer 403 approval_required; BR.ask() then offers "Ask the branch head" (POST /api/approvals).
   Screens: js/portal/pages/branch/branch-desk.js (today, leads, conversations, hand-overs, calendar), js/portal/pages/branch/branch-clients.js (client files),
   js/portal/pages/branch/branch-office.js (finance, approvals, team, reports, audit, settings). Contract: HANDOFF_PHASE_A.md. */
(function () {
  "use strict";
  var K = window.K, A = K.api, esc = K.esc, S = K.state;
  var BR = window.BR = { K: K };
  S.portal = "branch";
  BR.DEST = [["USA", "USA"], ["UK", "UK"], ["Canada", "Canada"], ["Australia", "Australia"], ["New Zealand", "New Zealand"]];
  BR.STAGES = [["counselling", "Counselling"], ["applying", "Applying"], ["offer", "Offer"], ["visa", "Visa"], ["departed", "Departed"], ["lost", "Closed"]];
  BR.isHead = function () { return S.view && S.view.view === "head"; };
  BR.branchName = function () { return (S.view && S.view.branch && S.view.branch.name) || "Your branch"; };
  BR.E = function () { return BR.branchName(); };

  /* ---------- approvals: a manager asks the head (kind, entity, entity_id, payload); the head acts directly ---------- */
  BR.ask = function (o) {
    return K.dialog({ title: "Ask the branch head", cap: o.label || "Needs the branch head", submit: "Send the request",
      body: '<p class="k-mute">' + esc(o.text || "Only the branch head can do this. Send a request with your reason; the head decides and you are told at once.") + "</p>" +
        K.field({ name: "reason", label: "Reason", type: "textarea", required: true, max: 1000 }),
      onSubmit: function (d) {
        if (!d.reason || d.reason.trim().length < 3) { var e = new Error("x"); e.details = { reason: "Give a short reason for the branch head." }; throw e; }
        return A.post("/api/approvals", { kind: o.kind, entity: o.entity, entity_id: o.entity_id, payload: o.payload || undefined, reason: d.reason.trim() });
      } }).then(function (r) { if (r) { K.toast("Request sent to the branch head"); BR.badges(); } return r; });
  };
  /* run a write; when the server answers approval_required, offer the request instead of failing */
  BR.act = function (btn, promise, ok, ask) {
    A.busy(btn, true);
    return Promise.resolve(promise).then(function (v) { A.busy(btn, false); if (ok) K.toast(ok); return v; }, function (e) {
      A.busy(btn, false);
      if (e && e.body && e.body.code === "approval_required" && ask) return BR.ask(ask).then(function () { return null; });
      K.toast(K.msg(e)); throw e;
    });
  };
  /* stage as a chip: closed files muted, departed done, the rest in progress */
  BR.stage = function (st) { var t = (BR.STAGES.filter(function (x) { return x[0] === st; })[0] || [st, K.lab(st)])[1]; return K.st(t, st === "lost" || st === "departed" ? "m" : "i"); };
  BR.ref = function (x, name, r) { return esc(x[name || "student_name"] || x.name || "") + "<small>" + esc(x[r || "student_ref"] || x.ref_no || "") + "</small>"; };

  /* ---------- sign-in ---------- */
  function step(html) { K.$("#siStep").innerHTML = html; var f = K.$("#siStep input"); if (f) f.focus(); }
  function showSignin(note) {
    K.showOnly("k-signin"); K.$("#siTheme").innerHTML = K.themeBtn(); K.$("#siH").textContent = "Sign in";
    step((note ? '<p class="k-err" role="alert">' + esc(note) + "</p>" : "") + '<form class="k-f" data-form="br-si" novalidate><p class="k-mute">Your branch at a glance: clients, documents, money, conversations and the team.</p>' +
      K.field({ name: "email", label: "Email", type: "email", ac: "username", required: true, attrs: ' inputmode="email"' }) +
      K.field({ name: "password", label: "Password", type: "password", ac: "current-password", required: true }) +
      '<p class="k-err err" data-for="form" role="alert" hidden></p><button class="k-b p" type="submit">Sign in</button></form><p class="k-mute k-small">For branch heads and branch managers. Content managers, students and head office have their own portals.</p>');
  }
  K.acts["br-si"] = function (f) {
    var d = K.formData(f), b = f.querySelector("[type=submit]");
    if (!d.email || !d.password) { A.showErrors(f, { details: Object.assign({}, d.email ? {} : { email: "Enter your email." }, d.password ? {} : { password: "Enter your password." }) }); return; }
    A.busy(b, true);
    A.post("/api/auth/login", { email: d.email, password: d.password }).then(function (r) {
      A.busy(b, false);
      if (r.need_totp) { location.href = "/super.html"; return; }
      boot();
    }, function (e) { A.busy(b, false); A.showErrors(f, e); var g = f.querySelector(".err[data-for=form]"); g.textContent = K.msg(e); g.hidden = false; });
  };
  function otherPortal(me) {
    K.showOnly("k-signin"); K.$("#siTheme").innerHTML = K.themeBtn(); K.$("#siH").textContent = "Wrong portal";
    step('<p class="k-mute">You are signed in as ' + esc(me.user.name) + " (" + esc(K.role(me.user.role)) + "). This portal is for branch heads and branch managers.</p>" +
      '<div class="k-acts"><a class="k-b p" href="' + esc(me.portal_page || "/") + '">Open my portal</a><button type="button" class="k-b soft" data-act="br-out">Sign out</button></div>');
  }

  /* ---------- enter ---------- */
  function enter(me) {
    if (me.portal !== "branch" && me.portal !== "staff") return otherPortal(me);
    S.me = me.user; S.view = me;
    var head = BR.isHead();
    /* role-dependent titles and header buttons live on the view definitions, so the page title and the tab title agree */
    if (K.views.handovers) K.views.handovers.title = head ? "Escalations" : "Hand-overs";
    if (K.views.approvals) K.views.approvals.title = head ? "Approvals" : "My requests";
    if (K.views.team) K.views.team.acts = head ? '<button type="button" class="k-b p" data-act="tm-new">Add a person</button>' : "";
    K.shell({
      appName: "Dolphin " + BR.branchName(), roleLabel: (head ? "Branch head, " : "Branch manager, ") + BR.branchName(), user: me.user,
      nav: [
        { items: [["today", "Today"]] },
        { g: "Clients", items: [["clients", "Client files"], ["leads", "Leads"], ["documents", "Documents"], ["alumni", "Alumni"], ["calendar", "Calendar"]] },
        { g: "Conversations", items: [["conversations", "Conversations", "nbConv"], ["handovers", head ? "Escalations" : "Hand-overs", "nbFwd"]] },
        { g: "Money", items: [["finance", "Fees and payments"]] },
        { g: "Branch", items: [["approvals", head ? "Approvals" : "My requests", "nbAppr"], ["team", "Team"]].concat(head ? [["reports", "Reports"]] : []).concat([["audit", "Audit"], ["settings", "Settings"]]) }
      ],
      menu: [{ t: "Change password", act: "br-pass" }, { t: "Dark theme", act: "k-theme", theme: true }, { t: "Sign out", act: "br-out", d: true }],
      foot: me.user.is_demo ? "<span>Demo account with sample data.</span>" : ""
    });
    BR.badges(); mountBell();
    K.every({ alive: function () { return K.started; } }, 60000, BR.badges);
    K.start("today");
  }
  BR.badges = function () {
    A.get("/api/dashboard").then(function (d) {
      S.dash = d;
      K.badge("nbAppr", d.approvals_pending || 0); K.badge("nbConv", d.conversations_open || 0); K.badge("nbFwd", d.forwards_open || 0);
    }, function () { });
  };
  function mountBell() {
    var host = K.$("#k-bell"); if (!host || !window.Notify) return;
    try {
      S.bell = window.Notify.mount(host, {
        label: "Alerts",
        /* live: a new hand-over, approval or report updates the badges at once, and an open Hand-overs / Approvals list refreshes */
        onNew: function () {
          BR.badges();
          if (K.cur && (K.cur.id === "handovers" || K.cur.id === "approvals") && !K.drawerOpen() && !K.$("dialog.k-dlg[open]")) K.render();
        },
        onOpen: function (n) {
          if (n.entity === "conversation") { location.hash = "#/conversations?open=" + n.entity_id; return; }
          if (n.entity === "approval") { location.hash = "#/approvals"; return; }
          if (n.entity === "forward") { location.hash = "#/handovers"; return; }
          if (n.entity === "student") { location.hash = "#/clients?open=" + n.entity_id; return; }
          if (n.entity === "lead") { location.hash = "#/leads"; return; }
          if (n.entity === "document" || n.entity === "document_request") { location.hash = "#/documents"; return; }
          if (n.entity === "application") { location.hash = "#/clients"; return; }
          if (n.entity === "claim" || n.entity === "fee") { location.hash = "#/finance?tab=claims"; return; }
          return false;
        }
      });
    } catch (e) { host.innerHTML = ""; }
  }
  K.acts["br-out"] = function () { if (A.live) A.live.stop(); A.logout().then(function () { location.hash = ""; K.started = false; showSignin(); }); };
  K.acts["br-pass"] = function () {
    K.dialog({ title: "Change password", submit: "Change password",
      body: K.field({ name: "current", label: "Current password", type: "password", ac: "current-password", required: true }) +
        K.field({ name: "next", label: "New password", type: "password", ac: "new-password", required: true, hint: "At least 10 characters. Other devices are signed out." }),
      onSubmit: function (d) { return A.post("/api/auth/password", { current: d.current, next: d.next }); } })
      .then(function (r) { if (r) K.toast("Password changed"); });
  };

  function boot() {
    return A.me().then(function () { return A.get("/api/auth/me"); }).then(enter, function (e) {
      if (e.code === "totp_required") { location.href = "/super.html"; return; }
      if (e.code === "portal_paused") return showSignin(K.msg(e));
      if (e.offline) return showSignin("The server cannot be reached from this address. Start the Dolphin server and reload.");
      showSignin();
    });
  }
  A.on("unauth", function (d) {
    if (!K.started || (d && /\/auth\/login/.test(d.path || ""))) return;
    K.started = false; showSignin("Your session has ended. Please sign in again.");
  });
  BR.boot = boot;
})();
