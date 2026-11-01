/* System console (super.html): sign-in with password + one-time code (TOTP set-up shows the key as text and a QR code), shell, "view as" state.
   Screens live in js/portal/pages/super/super-views.js (watch, records) and js/portal/pages/super/super-ops.js (people, branches, assign, features, view as). Contract: HANDOFF_PHASE_A.md 4 and 11. */
(function () {
  "use strict";
  var K = window.K, A = K.api, esc = K.esc;
  var S = K.state;
  S.portal = "super";

  /* ---------------- sign-in steps ---------------- */
  function step(html) { K.$("#siStep").innerHTML = html; var f = K.$("#siStep input"); if (f) f.focus(); }
  function heading(t) { K.$("#siH").textContent = t; }
  function showSignin() {
    K.showOnly("k-signin");
    K.$("#siTheme").innerHTML = K.themeBtn();
    heading("Sign in");
    step('<form class="k-f" data-form="si-pass" novalidate><p class="k-mute">For the Dolphin developers only. Password first, then the code from your authenticator app.</p>' +
      K.field({ name: "email", label: "Email", type: "email", ac: "username", required: true, attrs: ' inputmode="email"' }) +
      K.field({ name: "password", label: "Password", type: "password", ac: "current-password", required: true }) +
      '<p class="k-err err" data-for="form" role="alert" hidden></p><button class="k-b p" type="submit">Continue</button></form>' +
      '<p class="k-mute k-small">System administrator accounts are made on the server only. Sessions last 12 hours.</p>');
  }
  function formErr(f, e) { A.showErrors(f, e); var g = f.querySelector(".err[data-for=form]"); if (g && (!e.details || g.hidden)) { g.textContent = K.msg(e); g.hidden = false; } }
  K.acts["si-pass"] = function (f) {
    var d = K.formData(f), b = f.querySelector("[type=submit]");
    if (!d.email || !d.password) return formErr(f, { details: Object.assign({}, d.email ? {} : { email: "Enter your email." }, d.password ? {} : { password: "Enter your password." }) });
    A.busy(b, true);
    A.post("/api/auth/login", { email: d.email, password: d.password }).then(function (r) {
      A.busy(b, false);
      if (r.need_totp) return r.totp_enrolled ? codeStep() : setupStep();
      afterAuth();
    }, function (e) { A.busy(b, false); formErr(f, e); });
  };
  function codeStep(note) {
    heading("Enter your code");
    step('<form class="k-f" data-form="si-code" novalidate><p class="k-mute">' + esc(note || "Open your authenticator app and type the 6-digit code for Dolphin Education.") + "</p>" +
      K.field({ name: "code", label: "6-digit code", ac: "one-time-code", cls: "k-otp", required: true, attrs: ' inputmode="numeric" pattern="[0-9]*" maxlength="6"' }) +
      '<p class="k-err err" data-for="form" role="alert" hidden></p><button class="k-b p" type="submit">Verify</button></form>' +
      '<div class="k-acts"><button type="button" class="k-b soft sm" data-act="si-setup">Set up the authenticator app</button><button type="button" class="k-b sm" data-act="si-other">Use another account</button></div>');
  }
  function setupStep() {
    heading("Set up your code");
    step(K.skel(4));
    A.post("/api/auth/totp/setup", {}).then(function (r) {
      var qr = "";
      try { qr = window.DolphinQR.svg(r.otpauth_url, { ecl: "M", scale: 4, label: "QR code for the authenticator app" }); } catch (e) { qr = ""; }
      var key = String(r.secret || "").replace(/(.{4})/g, "$1 ").trim();
      step('<form class="k-f" data-form="si-code" novalidate><p class="k-mute">Scan this with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, Aegis), then type the code it shows.</p>' +
        '<div class="k-qr">' + (qr ? '<div class="qrb">' + qr + "</div>" : "") + '<div><p class="k-lab">Or enter this key</p><p class="k-secret" id="siKey">' + esc(key) + '</p><p class="k-mute k-small">Time based, ' + esc(r.digits || 6) + " digits, every " + esc(r.period || 30) + ' seconds.</p><button type="button" class="k-b soft sm" data-act="si-copy">Copy key</button></div></div>' +
        K.field({ name: "code", label: "6-digit code", ac: "one-time-code", cls: "k-otp", required: true, attrs: ' inputmode="numeric" pattern="[0-9]*" maxlength="6"' }) +
        '<p class="k-err err" data-for="form" role="alert" hidden></p><button class="k-b p" type="submit">Verify and finish</button></form>' +
        '<div class="k-acts"><button type="button" class="k-b sm" data-act="si-other">Use another account</button></div>');
      S.secret = r.secret;
    }, function (e) {
      if (e.code === "already_enrolled") return codeStep("This account already has an authenticator. Type the code it shows. If the phone is lost, another system administrator can reset it.");
      step('<p class="k-err" role="alert">' + esc(K.msg(e)) + '</p><button type="button" class="k-b soft" data-act="si-other">Back to sign in</button>');
    });
  }
  K.acts["si-setup"] = setupStep;
  K.acts["si-copy"] = function () { try { navigator.clipboard.writeText(S.secret || "").then(function () { K.toast("Key copied"); }, function () { K.toast("Select the key and copy it"); }); } catch (e) { K.toast("Select the key and copy it"); } };
  K.acts["si-other"] = function () { A.logout().then(showSignin); };
  K.acts["si-code"] = function (f) {
    var d = K.formData(f), b = f.querySelector("[type=submit]"), code = String(d.code || "").replace(/\D/g, "");
    if (code.length !== 6) return formErr(f, { details: { code: "Type the 6 digits." } });
    A.busy(b, true);
    A.post("/api/auth/totp/verify", { code: code }).then(function () { A.busy(b, false); afterAuth(); }, function (e) { A.busy(b, false); formErr(f, e); var i = f.querySelector("[name=code]"); if (i) { i.value = ""; i.focus(); } });
  };

  /* ---------------- after sign-in ---------------- */
  function afterAuth() {
    return A.get("/api/auth/me").then(enter, function (e) {
      if (e.code === "totp_required") { K.showOnly("k-signin"); K.$("#siTheme").innerHTML = K.themeBtn(); return codeStep(); }
      showSignin();
    });
  }
  function notSuper(me) {
    K.showOnly("k-signin"); K.$("#siTheme").innerHTML = K.themeBtn(); heading("Not a system account");
    step('<p class="k-mute">You are signed in as ' + esc(me.user.name) + " (" + esc(K.role(me.user.role)) + "). The system console is only for the Dolphin developers.</p>" +
      '<div class="k-acts"><a class="k-b p" href="' + esc(me.portal_page || "/") + '">Open my portal</a><button type="button" class="k-b soft" data-act="si-other">Sign out</button></div>');
  }
  function enter(me) {
    var imp = me.impersonating || null;
    if (!imp && me.portal !== "super") return notSuper(me);
    var sa = imp ? { id: imp.by.id, name: imp.by.name, email: "" } : me.user;
    S.me = me; S.sa = sa; S.imp = imp;
    K.shell({
      appName: "Dolphin System console", roleLabel: "System console", user: sa,
      nav: [
        { g: "Watch", items: [["overview", "Overview"], ["live", "Live conversations"], ["visitors", "Visitors"], ["server", "Server"]] },
        { g: "Records", items: [["audit", "Audit"], ["signins", "Sign-ins and sessions"]] },
        { g: "Control", items: [["people", "People"], ["branches", "Branches"], ["assign", "Assign"], ["features", "Features"], ["viewas", "View as"], ["backups", "Backups"]] }
      ],
      menu: [{ t: "Dark theme", act: "k-theme", theme: true }, { t: "Sign out", act: "su-out", d: true }],
      foot: "<span>Every action here is recorded in the audit log.</span>"
    });
    notes(); loadFeatures();
    mountBell();
    K.start("overview");
  }
  S.notes = notes;
  function notes() {
    var h = "";
    if (S.imp) h += '<div class="k-note" role="status">' + K.st("View as") + "<span>This session is viewing the portal as <b>" + esc(S.imp.user.name) + "</b> (" + esc(K.role(S.imp.user.role)) + "), read only. The console still reads; changes wait until you stop.</span>" +
      '<a class="k-b soft sm" href="' + esc(S.me.portal_page || "/") + '" target="_blank" rel="noopener">Open their portal</a><button type="button" class="k-b p sm" data-act="va-stop">Stop view as</button></div>';
    if (S.features && S.features.maintenance) h += '<div class="k-note" role="status">' + K.st("Maintenance") + '<span>Maintenance mode is on: the public site shows a calm notice and every write is paused except yours.</span><a class="k-b soft sm" href="#/features">Features</a></div>';
    K.notes(h);
  }
  function loadFeatures() { return A.get("/api/sys/features").then(function (r) { S.features = r.features; notes(); return r.features; }, function () { return null; }); }
  S.loadFeatures = loadFeatures;
  K.acts["va-stop"] = function (b) {
    K.run(b, A.post("/api/sys/impersonate/stop", {}), "View as stopped").then(function () { location.hash = "#/viewas"; location.reload(); });
  };
  K.acts["su-out"] = function () { if (A.live) A.live.stop(); A.logout().then(function () { location.hash = ""; showSignin(); }); };

  function mountBell() {
    var host = K.$("#k-bell");
    if (!host || !window.Notify || S.imp) return;
    try {
      S.bell = window.Notify.mount(host, {
        label: "Alerts", emptyText: "Nothing new. System alerts (server errors, failed backups) appear here.",
        href: function (n) { return n.type === "system.alert" ? "#/server" : n.link && n.link.charAt(0) === "#" ? n.link : null; }
      });
    } catch (e) { host.innerHTML = ""; }
  }

  /* ---------------- boot ---------------- */
  A.on("unauth", function (d) {
    if (!K.started || (d && /\/auth\/(login|totp)/.test(d.path || ""))) return;
    K.started = false; showSignin(); K.toast("Your session has ended. Sign in again.");
  });
  A.get("/api/auth/me").then(function (me) { enter(me); }, function (e) {
    if (e.code === "totp_required") { K.showOnly("k-signin"); K.$("#siTheme").innerHTML = K.themeBtn(); return codeStep(); }
    if (e.offline) { showSignin(); var g = K.$("#siStep"); g.insertAdjacentHTML("afterbegin", '<p class="k-err" role="alert">The server cannot be reached from this address. Start the Dolphin server and reload.</p>'); return; }
    showSignin();
  });
})();
