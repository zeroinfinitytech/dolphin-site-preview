/* Head office portal (admin.html): sign-in, shell, branch switcher (All branches or one branch, remembered per user), alerts.
   Screens: js/portal/pages/admin/admin-views.js (overview, clients, leads, applications, visa, documents, finance), js/portal/pages/admin/admin-manage.js (conversations, approvals, users,
   website, audit, settings, backups, paused features), js/portal/core/admin-branches.js (branches). Contract: HANDOFF_PHASE_A.md. */
(function () {
  "use strict";
  var K = window.K, A = K.api, esc = K.esc, S = K.state;
  S.portal = "head_office";
  S.api = { branches: "/api/branches", users: "/api/users" };
  S.branches = function (force) { if (!S._b || force) S._b = A.get("/api/branches").then(function (r) { return r.items; }); return S._b; };
  S.bname = function (bs, id) { var b = (bs || []).filter(function (x) { return +x.id === +id; })[0]; return b ? b.name : id ? "Branch " + id : "All branches"; };
  S.branchOpts = function (bs, all) { return K.opts(bs.map(function (b) { return [String(b.id), b.name + (b.active ? "" : " (closed)")]; }), all); };

  /* ---------- the branch switcher: K.state.branch is "" (all) or a branch id; every screen reads it ---------- */
  function bkey() { return "dolphin-ho-branch:" + (S.me ? S.me.id : "x"); }
  function readBranch() { try { return localStorage.getItem(bkey()) || ""; } catch (e) { return ""; } }
  S.branch = "";
  S.B = function () { return S.branch || undefined; };
  S.branchLabel = function () { return S.branch ? S.bname(S.branchList, S.branch) : "All branches"; };
  function switcher(bs) {
    return '<div class="k-bsw"><label for="hoBranch">Branch</label><select class="k-in" id="hoBranch" data-chg="ho-branch" aria-label="Branch shown on every screen">' +
      [["", "All branches"]].concat(bs.map(function (b) { return [String(b.id), b.name + (b.active ? "" : " (closed)")]; })).map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(S.branch) === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></div>";
  }
  K.acts["ho-branch"] = function (el) {
    S.branch = el.value; try { localStorage.setItem(bkey(), S.branch); } catch (e) { /* storage off: still works for this visit */ }
    K.toast(S.branch ? "Showing " + S.branchLabel() : "Showing all branches");
    if (K.cur && K.cur.params && K.cur.params.page) K.go(K.cur.id, {}); else K.render();
  };

  /* ---------- sign-in ---------- */
  function step(html) { K.$("#siStep").innerHTML = html; var f = K.$("#siStep input"); if (f) f.focus(); }
  function showSignin(note) {
    K.showOnly("k-signin"); K.$("#siTheme").innerHTML = K.themeBtn(); K.$("#siH").textContent = "Sign in";
    step((note ? '<p class="k-err" role="alert">' + esc(note) + "</p>" : "") + '<form class="k-f" data-form="si-pass" novalidate><p class="k-mute">Every branch at a glance: clients, money, conversations and people.</p>' +
      K.field({ name: "email", label: "Email", type: "email", ac: "username", required: true, attrs: ' inputmode="email"' }) +
      K.field({ name: "password", label: "Password", type: "password", ac: "current-password", required: true }) +
      '<p class="k-err err" data-for="form" role="alert" hidden></p><button class="k-b p" type="submit">Sign in</button></form><p class="k-mute k-small">Head office accounts only. Branch staff sign in on the branch portal.</p>');
  }
  K.acts["si-pass"] = function (f) {
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
    step('<p class="k-mute">You are signed in as ' + esc(me.user.name) + " (" + esc(K.role(me.user.role)) + "). This portal is for head office.</p>" +
      '<div class="k-acts"><a class="k-b p" href="' + esc(me.portal_page || "/") + '">Open my portal</a><button type="button" class="k-b soft" data-act="ho-out">Sign out</button></div>');
  }

  /* ---------- enter ---------- */
  function enter(me) {
    if (me.portal !== "head_office") return otherPortal(me);
    S.me = me.user; S.view = me;
    S.branch = readBranch();
    return S.branches().then(function (bs) {
      S.branchList = bs;
      if (S.branch && !bs.some(function (b) { return String(b.id) === String(S.branch); })) S.branch = "";
      K.shell({
        appName: "Dolphin Head office", roleLabel: "Head office", user: me.user, tools: switcher(bs),
        nav: [
          { items: [["overview", "Overview"]] },
          { g: "Clients and money", items: [["clients", "Clients"], ["leads", "Leads"], ["applications", "Applications"], ["visa", "Visa"], ["documents", "Documents"], ["finance", "Finance"]] },
          { g: "Branches and people", items: [["conversations", "Conversations", "nbConv"], ["approvals", "Approvals", "nbAppr"], ["branches", "Branches"], ["users", "Users"]] },
          { g: "System", items: [["website", "Website"], ["audit", "Audit"], ["settings", "Settings"], ["backups", "Backups"], ["paused", "Paused features"]] }
        ],
        menu: [{ t: "Dark theme", act: "k-theme", theme: true }, { t: "Sign out", act: "ho-out", d: true }],
        foot: me.user.is_demo ? "<span>Demo account with sample data.</span>" : ""
      });
      badges();
      mountBell();
      K.start("overview");
    });
  }
  function badges() {
    A.get("/api/dashboard").then(function (d) { K.badge("nbAppr", d.approvals_pending || 0); K.badge("nbConv", d.conversations_open || 0); }, function () { });
  }
  S.badges = badges;
  function mountBell() {
    var host = K.$("#k-bell"); if (!host || !window.Notify) return;
    try {
      S.bell = window.Notify.mount(host, {
        label: "Alerts",
        onOpen: function (n) {
          if (n.entity === "conversation") { location.hash = "#/conversations?open=" + n.entity_id; return; }
          if (n.entity === "approval") { location.hash = "#/approvals"; return; }
          if (n.entity === "student") { location.hash = "#/clients?open=" + n.entity_id; return; }
          if (n.entity === "lead") { location.hash = "#/leads"; return; }
          if (n.entity === "document") { location.hash = "#/documents"; return; }
          return false;
        }
      });
    } catch (e) { host.innerHTML = ""; }
  }
  K.acts["ho-out"] = function () { if (A.live) A.live.stop(); A.logout().then(function () { location.hash = ""; K.started = false; showSignin(); }); };

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
  boot();
})();
