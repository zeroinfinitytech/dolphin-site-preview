/* System console screens, part 2: People, Branches, Assign, Features, View as. API: HANDOFF_PHASE_A.md section 11 and 3 (staffing limits). */
(function () {
  "use strict";
  var K = window.K, A = K.api, esc = K.esc, S = K.state;
  var STAFF_ROLES = ["branch_head", "branch_manager", "content_manager"];
  var CREATE_ROLES = [["head_office", "Head office"], ["branch_head", "Branch head"], ["branch_manager", "Branch manager"], ["content_manager", "Content manager"], ["student", "Student"], ["parent", "Parent"], ["staff", "Staff desk (paused role)"], ["university", "University (paused role)"]];
  var LIMIT_T = { branch_head: "branch head", branch_manager: "branch manager", content_manager: "content managers" };

  /* ---------- staffing-limit override: the 409 explains, a written reason lets the super admin go over ---------- */
  function ovBlock() {
    return '<div data-ov hidden><p class="k-mute">The branch is at its staffing limit (1 branch head, 1 branch manager, at most 2 content managers). Only a system administrator can go over it, with a written reason that is kept in the audit log.</p>' +
      K.field({ name: "override_reason", label: "Why go over the limit", type: "textarea", max: 300 }) + "</div>";
  }
  function withOverride(form, payload) {
    var ov = form.querySelector("[data-ov]");
    if (ov && !ov.hidden) {
      var r = (form.querySelector("[name=override_reason]").value || "").trim();
      if (r.length < 5) { var e = new Error("x"); e.details = { override_reason: "Write the reason (5 or more characters)." }; throw e; }
      payload.override_limit = true; payload.reason = r;
    }
    return payload;
  }
  function limitCatch(form) {
    return function (e) {
      if (e && e.code === "branch_limit") {
        var ov = form.querySelector("[data-ov]"); if (ov) { ov.hidden = false; var t = ov.querySelector("textarea"); if (t) setTimeout(function () { t.focus(); }, 0); }
        var d = e.details || {}, msg = (e.body && e.body.error) || "This branch is at its staffing limit.";
        if (d.role) msg += " Limit for " + (LIMIT_T[d.role] || K.role(d.role).toLowerCase()) + ": " + d.limit + "; active now: " + d.active + ". Write a reason below to override, or deactivate someone first.";
        var x = new Error(msg); x.status = 409; x.body = { error: msg }; throw x;
      }
      throw e;
    };
  }
  S.students = function () { if (!S._s) S._s = A.get("/api/students", { limit: 100 }).then(function (r) { return r.items; }); return S._s; };

  /* ================= People ================= */
  K.view("people", { title: "People", eyebrow: "Control", lead: "Every account in every branch and role. System administrator accounts are made on the server command line only.",
    acts: '<button type="button" class="k-b p" data-act="pp-new">New person</button>',
    render: function (c) {
      var p = c.params;
      return Promise.all([S.branches(), A.get("/api/sys/users", { role: p.role, branch_id: p.branch_id, active: p.active, q: p.q, page: p.page, limit: 50 })]).then(function (r) {
        var bs = r[0], res = r[1]; S.peopleRows = {}; res.items.forEach(function (u) { S.peopleRows[u.id] = u; });
        var lim = bs.map(function (b) { var s = b.staff || {}, l = b.limits || {}; return "<li class=\"k-rowx\"><b>" + esc(b.name) + "</b><span class=\"k-mute k-small\">" + STAFF_ROLES.map(function (k) { var full = (s[k] || 0) >= (l[k] || 0); return esc(K.role(k)) + ": " + (s[k] || 0) + ", limit " + (l[k] || 0) + (full ? " " + K.st("Full", "m") : ""); }).join(" &nbsp;·&nbsp; ") + "</span></li>"; }).join("");
        return K.filters([{ name: "q", label: "Search", type: "search", ph: "Name or email", w: 1 },
          { name: "role", label: "Role", type: "select", options: K.opts([["super_admin", "System admin"]].concat(CREATE_ROLES), "Any role") },
          { name: "branch_id", label: "Branch", type: "select", options: S.branchOpts(bs, "All branches") },
          { name: "active", label: "Status", type: "select", options: [["", "Any status"], ["1", "Active"], ["0", "Inactive"]] }], p) +
          K.table([{ t: "Name", f: function (u) { return esc(u.name) + "<small>" + esc(u.email) + "</small>"; } }, { t: "Role", f: function (u) { return esc(K.role(u.role)); } },
            { t: "Branch", f: function (u) { return esc(u.branch_name || (u.role === "head_office" || u.role === "super_admin" ? "All branches" : "None")); } },
            { t: "Status", f: function (u) { return [u.active ? K.st("Active", "i") : K.st("Inactive"), u.online ? K.st("Online") : "", u.role === "super_admin" ? (u.totp_enabled_at ? K.st("Code set up", "m") : K.st("No code yet")) : "", u.is_demo ? K.st("Demo", "m") : ""].filter(Boolean).join("<br>"); } },
            { t: "Last seen", f: function (u) { return esc(u.last_seen_at ? K.ago(u.last_seen_at) : "Never"); } }, { t: "Sessions", f: function (u) { return esc(K.num(u.sessions)); }, cls: "r" }],
            res.items, { act: "pp-open", label: "People", empty: "Nobody matches these filters." }) + K.pager(res, "people") +
          K.sec("Staffing limits", "Per branch, enforced by the server.", '<ul class="k-list">' + lim + "</ul>");
      });
    } });

  function roleNeedsBranch(r) { return STAFF_ROLES.indexOf(r) > -1 || r === "staff"; }
  function toggleRoleFields(form) {
    var r = form.querySelector("[name=role]").value;
    K.$$("[data-show]", form).forEach(function (el) { el.hidden = el.getAttribute("data-show").split(" ").indexOf(r) < 0; K.$$("input,select,textarea", el).forEach(function (i) { i.disabled = el.hidden; }); });
  }
  K.acts["pp-new"] = function () {
    Promise.all([S.branches(), S.students()]).then(function (r) {
      var bs = r[0].filter(function (b) { return b.active; }), st = r[1];
      K.dialog({ title: "New person", cap: "People", submit: "Create account", wide: true,
        body: '<div class="k-fr">' + K.field({ name: "name", label: "Full name", required: true, ac: "off" }) + K.field({ name: "email", label: "Email", type: "email", required: true, ac: "off" }) + "</div>" +
          '<div class="k-fr">' + K.field({ name: "role", label: "Role", type: "select", options: CREATE_ROLES, value: "content_manager" }) +
          '<div data-show="branch_head branch_manager content_manager staff">' + K.field({ name: "branch_id", label: "Branch", type: "select", options: bs.map(function (b) { return [String(b.id), b.name]; }) }) + "</div>" +
          '<div data-show="student parent">' + K.field({ name: "student_id", label: "Client file", type: "select", options: st.map(function (s) { return [String(s.id), s.name + " (" + (s.ref_no || "") + ", " + (s.branch_name || "") + ")"]; }), hint: "The login belongs to this file and its branch." }) + "</div>" +
          '<div data-show="university">' + K.field({ name: "institution", label: "Institution", ac: "off" }) + "</div></div>" +
          '<div class="k-fr">' + K.field({ name: "password", label: "First password", value: K.password(), required: true, ac: "off", hint: "At least 10 characters. Share it privately and ask them to change it." }) + K.field({ name: "phone", label: "Phone (optional)", type: "tel", ac: "off" }) + "</div>" + ovBlock(),
        onOpen: function (d) { var f = d.querySelector("form"); toggleRoleFields(f); f.querySelector("[name=role]").addEventListener("change", function () { toggleRoleFields(f); f.querySelector("[data-ov]").hidden = true; }); },
        onSubmit: function (d, form) {
          var p = { name: d.name, email: d.email, role: d.role, password: d.password, phone: d.phone };
          if (roleNeedsBranch(d.role)) p.branch_id = +d.branch_id;
          if (d.role === "student" || d.role === "parent") p.student_id = +d.student_id;
          if (d.role === "university") p.institution = d.institution;
          withOverride(form, p);
          return A.post("/api/sys/users", p).catch(limitCatch(form));
        }
      }).then(function (u) { if (u) { K.toast(u.name + " can now sign in" + (u.limit_overridden ? " (limit overridden)" : "")); S.users(true); S.branches(true); K.render(); } });
    }, function (e) { K.toast(K.msg(e)); });
  };

  K.acts["pp-open"] = function (b) { openPerson(b.getAttribute("data-id")); };
  var dirty = false;
  function openPerson(id) {
    var u = S.peopleRows && S.peopleRows[id];
    var dr = K.drawer({ title: u ? u.name : "Person", cap: u ? K.role(u.role) : "", onClose: function () { if (dirty) { dirty = false; S.users(true); S.branches(true); K.render(); } } });
    A.get("/api/sys/users", { q: u ? u.email : "", limit: 100 }).then(function (r) {
      var x = r.items.filter(function (y) { return String(y.id) === String(id); })[0] || u; if (!x) return dr.set(K.empty("Not found", "This account no longer exists."));
      S.peopleRows[x.id] = x; dr.title(x.name);
      var sa = x.role === "super_admin", self = S.sa && +S.sa.id === +x.id, branchStaff = STAFF_ROLES.indexOf(x.role) > -1 || x.role === "staff";
      var acts = [];
      if (!sa) acts.push(["pp-edit", "Edit details", "soft"]);
      if (!sa && branchStaff) acts.push(["pp-move", "Move to another branch", "soft"]);
      if (!sa) acts.push(["pp-role", "Change role", "soft"]);
      acts.push(["pp-pass", "Reset password", "soft"]);
      if (sa || x.totp_enabled_at) acts.push(["pp-2fa", "Reset one-time code", "soft"]);
      if (!self) acts.push(["pp-signout", "Sign out everywhere", "soft"]);
      if (!sa && x.active) acts.push(["pp-viewas", "View as this person", "soft"]);
      if (!self) acts.push([x.active ? "pp-off" : "pp-on", x.active ? "Deactivate" : "Reactivate", x.active ? "d" : "p"]);
      dr.set(K.dl([["Email", x.email], ["Role", K.role(x.role)], ["Branch", x.branch_name || (x.role === "head_office" || sa ? "All branches" : "None")], ["Phone", x.phone],
        ["Status", (x.active ? "Active" : "Inactive") + (x.online ? ", online now" : "")], ["Sessions", K.num(x.sessions)], ["Last seen", x.last_seen_at ? K.dt(x.last_seen_at) : "Never"],
        ["One-time code", sa ? (x.totp_enabled_at ? "Set up " + K.date(x.totp_enabled_at) : "Not set up yet") : "Not used for this role"], ["Created", K.dt(x.created_at)], x.is_demo ? ["Demo account", "Yes, remove before go-live"] : null]) +
        (self ? '<p class="k-mute">This is your own account. Some actions are not offered on yourself.</p>' : "") +
        '<div class="k-acts" style="margin-top:8px">' + acts.map(function (a) { return '<button type="button" class="k-b ' + a[2] + ' sm" data-act="' + a[0] + '" data-id="' + x.id + '">' + esc(a[1]) + "</button>"; }).join("") + "</div>" +
        '<h3 class="k-h2" style="margin-top:18px">Recent activity</h3><div id="ppAudit">' + K.skel(3) + "</div>");
      A.get("/api/sys/audit", { user_id: x.id, limit: 8 }).then(function (a) {
        var el = K.$("#ppAudit"); if (!el) return;
        el.innerHTML = a.items.length ? '<ul class="k-list">' + a.items.map(function (y) { return '<li class="k-rowx"><span>' + esc(K.lab(y.action)) + " " + esc(K.lab(y.entity)) + (y.entity_id != null ? " " + esc(y.entity_id) : "") + '</span><span class="k-mute k-small">' + esc(K.dt(y.at)) + "</span></li>"; }).join("") + "</ul>" : '<p class="k-mute">No recorded actions by this person.</p>';
      }, function () { });
    }, function (e) { dr.set(K.fail(e)); });
  }
  function after(id, msg) { return function (r) { if (r) { dirty = true; K.toast(msg); openPerson(id); } }; }
  function P(id) { return S.peopleRows[id]; }
  K.acts["pp-edit"] = function (b) {
    var u = P(b.getAttribute("data-id"));
    K.dialog({ title: "Edit details", cap: u.name, submit: "Save", body: K.field({ name: "name", label: "Full name", value: u.name, required: true }) + K.field({ name: "email", label: "Email", type: "email", value: u.email, required: true }) + K.field({ name: "phone", label: "Phone", type: "tel", value: u.phone || "" }),
      onSubmit: function (d) { return A.patch("/api/sys/users/" + u.id, { name: d.name, email: d.email, phone: d.phone || undefined }); } }).then(after(u.id, "Saved"));
  };
  K.acts["pp-move"] = function (b) {
    var u = P(b.getAttribute("data-id"));
    S.branches().then(function (bs) {
      K.dialog({ title: "Move to another branch", cap: u.name, submit: "Move",
        body: "<p class=\"k-mute\">Their sessions end and they sign in again in the new branch. Their clients and conversations stay where they are (use Assign to move those).</p>" +
          K.field({ name: "branch_id", label: "New branch", type: "select", options: bs.filter(function (x) { return x.active && +x.id !== +u.branch_id; }).map(function (x) { return [String(x.id), x.name]; }) }) + ovBlock(),
        onSubmit: function (d, form) { return A.post("/api/sys/users/" + u.id + "/move", withOverride(form, { branch_id: +d.branch_id })).catch(limitCatch(form)); } }).then(after(u.id, "Moved"));
    });
  };
  K.acts["pp-role"] = function (b) {
    var u = P(b.getAttribute("data-id")), member = u.role === "student" || u.role === "parent";
    S.branches().then(function (bs) {
      var roles = CREATE_ROLES.filter(function (r) { return (r[0] === "student" || r[0] === "parent") === member && r[0] !== u.role; });
      K.dialog({ title: "Change role", cap: u.name, submit: "Change role",
        body: "<p class=\"k-mute\">Their sessions end; the next sign-in opens the portal of the new role." + (member ? " Student and parent accounts can only switch between those two." : " Staff accounts cannot become student or parent accounts.") + "</p>" +
          K.field({ name: "role", label: "New role", type: "select", options: roles }) +
          (member ? "" : '<div data-show="branch_head branch_manager content_manager staff">' + K.field({ name: "branch_id", label: "Branch", type: "select", options: bs.filter(function (x) { return x.active; }).map(function (x) { return [String(x.id), x.name]; }), value: String(u.branch_id || "") }) + "</div>") + ovBlock(),
        onOpen: function (d) { var f = d.querySelector("form"); if (!member) { toggleRoleFields(f); f.querySelector("[name=role]").addEventListener("change", function () { toggleRoleFields(f); }); } },
        onSubmit: function (d, form) { var p = { role: d.role }; if (d.branch_id && roleNeedsBranch(d.role)) p.branch_id = +d.branch_id; return A.post("/api/sys/users/" + u.id + "/role", withOverride(form, p)).catch(limitCatch(form)); } }).then(after(u.id, "Role changed"));
    });
  };
  K.acts["pp-pass"] = function (b) {
    var u = P(b.getAttribute("data-id"));
    K.dialog({ title: "Reset password", cap: u.name, submit: "Set password", body: "<p class=\"k-mute\">Every session of this person ends. Share the new password privately.</p>" + K.field({ name: "password", label: "New password", value: K.password(), required: true, ac: "off", hint: "At least 10 characters." }),
      onSubmit: function (d) { return A.post("/api/sys/users/" + u.id + "/reset-password", { password: d.password }); } }).then(after(u.id, "Password changed"));
  };
  K.acts["pp-2fa"] = function (b) {
    var u = P(b.getAttribute("data-id"));
    K.confirm({ title: "Reset the one-time code?", cap: u.name, text: "Their authenticator link is removed and their sessions end. At the next sign-in they scan a new QR code.", ok: "Reset code",
      onSubmit: function () { return A.post("/api/sys/users/" + u.id + "/reset-2fa", {}); } }).then(after(u.id, "One-time code reset"));
  };
  K.acts["pp-signout"] = function (b) { var u = P(b.getAttribute("data-id")); S.signOutUser(u.id, u.name).then(function (r) { if (r) { dirty = true; openPerson(u.id); } }); };
  K.acts["pp-viewas"] = function (b) { var d = K.drawerOpen(); if (d) d.close(true); K.go("viewas", { user_id: b.getAttribute("data-id") }); };
  K.acts["pp-off"] = function (b) {
    var u = P(b.getAttribute("data-id"));
    K.confirm({ title: "Deactivate " + u.name + "?", text: "They are signed out at once and cannot sign in. Their records stay. You can reactivate the account later.", ok: "Deactivate",
      onSubmit: function () { return A.patch("/api/sys/users/" + u.id, { active: false }); } }).then(after(u.id, "Deactivated"));
  };
  K.acts["pp-on"] = function (b) {
    var u = P(b.getAttribute("data-id"));
    K.dialog({ title: "Reactivate " + u.name + "?", submit: "Reactivate", body: "<p>They can sign in again with their current password.</p>" + ovBlock(),
      onSubmit: function (d, form) { return A.patch("/api/sys/users/" + u.id, withOverride(form, { active: true })).catch(limitCatch(form)); } }).then(after(u.id, "Reactivated"));
  };

  /* ================= Assign ================= */
  var ENT = { students: "Client files", leads: "Leads", conversations: "Conversations" };
  S.assignSel = {};
  K.view("assign", { title: "Assign", eyebrow: "Control", lead: "Move client files, leads or conversations to another branch or owner. Pick rows, choose where they go, and add a reason for the audit log.",
    render: function (c) {
      var p = c.params, ent = ENT[p.entity] ? p.entity : "students";
      if (S.assignKey !== ent + "|" + (p.branch_id || "") + "|" + (p.q || "")) { S.assignSel = {}; S.assignKey = ent + "|" + (p.branch_id || "") + "|" + (p.q || ""); }
      var q = { branch_id: p.branch_id, q: p.q || undefined, limit: 100 };
      var load = ent === "students" ? A.get("/api/students", q) : ent === "leads" ? A.get("/api/leads", q) : A.get("/api/conversations", Object.assign({ status: "active" }, q));
      return Promise.all([S.branches(), S.users(), load]).then(function (r) {
        var bs = r[0], us = r[1], rows = r[2].items || [];
        S.assignRows = rows; S.assignBranches = bs; S.assignUsers = us;
        var cols = ent === "students" ? [{ t: "Client", f: function (x) { return esc(x.name) + "<small>" + esc(x.ref_no || "") + "</small>"; } }, { t: "Branch", f: function (x) { return esc(x.branch_name || ""); } }, { t: "Stage", f: function (x) { return esc(K.lab(x.stage)); } }, { t: "Manager", f: function (x) { return esc(nameOf(us, x.assigned_manager_id)); } }]
          : ent === "leads" ? [{ t: "Lead", f: function (x) { return esc(x.name) + "<small>" + esc(x.phone || x.email || "") + "</small>"; } }, { t: "Branch", f: function (x) { return esc(x.branch_name || ""); } }, { t: "Status", f: function (x) { return esc(K.lab(x.status)); } }, { t: "Owner", f: function (x) { return esc(nameOf(us, x.counsellor_id)); } }]
            : [{ t: "Conversation", f: function (x) { return esc(x.subject || (x.visitor && x.visitor.name) || "Conversation") + "<small>" + esc(K.lab(x.kind)) + "</small>"; } }, { t: "Branch", f: function (x) { return esc(x.branch_name || ""); } }, { t: "Status", f: function (x) { return esc(K.lab(x.status)); } }, { t: "Owner", f: function (x) { return esc(x.owner_name || K.role(x.owner_role)); } }];
        cols.forEach(function (col) { col.noLink = 1; });
        return K.seg("entity", Object.keys(ENT).map(function (k) { return [k, ENT[k]]; }), ent, "What to move") +
          K.filters([{ name: "branch_id", label: "From branch", type: "select", options: S.branchOpts(bs, "All branches") }, { name: "q", label: "Search", type: "search", ph: "Name, ref or phone", w: 1 }], p) +
          '<div data-chg="as-sel">' + K.table(cols, rows, { select: true, selected: S.assignSel, label: ENT[ent], empty: "Nothing to move here." }) + "</div>" +
          K.sec("Move the selected rows", "", '<form class="k-f" data-form="as-go" id="asForm"><p class="k-mute" id="asCount" aria-live="polite">' + selText() + "</p>" +
            '<div class="k-fr">' + K.field({ name: "branch_id", label: "To branch", type: "select", options: K.opts(bs.filter(function (b) { return b.active; }).map(function (b) { return [String(b.id), b.name]; }), "Keep the branch") }) +
            K.field({ name: "owner_user_id", label: "New owner", type: "select", options: ownerOpts(us, "") }) + "</div>" +
            K.field({ name: "reason", label: "Reason (kept in the audit log)", type: "textarea", max: 300 }) + '<p class="k-err err" data-for="form" role="alert" hidden></p>' +
            '<div class="k-acts"><button type="submit" class="k-b p">Move selected</button><button type="button" class="k-b soft" data-act="as-all">Select all shown</button><button type="button" class="k-b" data-act="as-none">Clear selection</button></div></form>');
      });
    },
    after: function () { var f = K.$("#asForm"); if (f) f.querySelector("[name=branch_id]").addEventListener("change", function (e) { f.querySelector("[name=owner_user_id]").innerHTML = ownerOpts(S.assignUsers, e.target.value, true); }); } });
  function nameOf(us, id) { var u = us.filter(function (x) { return +x.id === +id; })[0]; return u ? u.name : id ? "User " + id : "Nobody"; }
  function ownerOpts(us, branch, html) {
    var list = [["", "Keep the owner (or none when the branch changes)"]].concat(us.filter(function (u) { return u.active && STAFF_ROLES.indexOf(u.role) > -1 && (!branch || +u.branch_id === +branch); }).map(function (u) { return [String(u.id), u.name + ", " + K.role(u.role) + (branch ? "" : ", " + (u.branch_name || ""))]; }));
    if (!html) return list;
    return list.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + "</option>"; }).join("");
  }
  function selText() { var n = Object.keys(S.assignSel).length; return n ? n + " selected." : "Nothing selected yet. Tick the rows above."; }
  function syncSel() { K.$$("[data-sel]").forEach(function (c) { c.checked = !!S.assignSel[c.getAttribute("data-sel")]; var tr = c.closest("tr"); if (tr) tr.classList.toggle("is-sel", c.checked); }); var t = K.$("#asCount"); if (t) t.textContent = selText(); }
  K.acts["as-sel"] = function (el) { if (!el.hasAttribute("data-sel")) return; var id = el.getAttribute("data-sel"); if (el.checked) S.assignSel[id] = true; else delete S.assignSel[id]; syncSel(); };
  K.acts["as-all"] = function () { (S.assignRows || []).forEach(function (r) { S.assignSel[r.id] = true; }); syncSel(); };
  K.acts["as-none"] = function () { S.assignSel = {}; syncSel(); };
  K.acts["as-go"] = function (f) {
    var d = K.formData(f), ids = Object.keys(S.assignSel).map(Number), b = f.querySelector("[type=submit]"), g = f.querySelector(".err[data-for=form]"), ent = ENT[K.cur.params.entity] ? K.cur.params.entity : "students";
    g.hidden = true;
    if (!ids.length) { g.textContent = "Tick at least one row first."; g.hidden = false; return; }
    if (!d.branch_id && !d.owner_user_id) { g.textContent = "Choose a branch, a new owner, or both."; g.hidden = false; return; }
    var p = { entity: ent, ids: ids, reason: d.reason }; if (d.branch_id) p.branch_id = +d.branch_id; if (d.owner_user_id) p.owner_user_id = +d.owner_user_id;
    var to = d.branch_id ? S.bname(S.assignBranches, d.branch_id) : nameOf(S.assignUsers, d.owner_user_id);
    K.confirm({ title: "Move " + ids.length + " " + (ids.length === 1 ? ENT[ent].toLowerCase().replace(/s$/, "") : ENT[ent].toLowerCase()) + "?", text: "They go to " + to + ". The branch teams see the change at once, and every move is recorded.", ok: "Move",
      onSubmit: function () { return A.post("/api/sys/assign", p); } }).then(function (r) { if (r) { K.toast((r.moved || []).length + " moved"); S.assignSel = {}; K.render(); } });
    void b;
  };

  /* ================= Features ================= */
  var FEAT = [
    ["live_chat", "Live chat on the website", "Visitors can start a chat with the branch team. When off, the chat window shows the contact form and phone numbers instead.", "Turning it off stops new website chats at once. Chats already open stay readable."],
    ["maintenance", "Maintenance mode", "The public site shows a calm notice and every write (forms, chats, portal changes) is paused for everyone except system administrators. Sign-in stays open.", "Everyone except you becomes read only until you switch it off."],
    ["cms_freeze", "Freeze website publishing", "Content managers can still edit and save drafts, but nothing is published or unpublished until the freeze ends.", "Publishing stops for every content manager."],
    ["staff_portal", "Staff desks (paused role)", "The old counsellor and visa desks. Off: their accounts cannot sign in and see a friendly paused message.", "Switching this changes who can sign in. Turning it off signs those accounts out."],
    ["university_portal", "University portal (paused role)", "Partner universities' own portal (applicants, courses, partner chat, commission). Off: their accounts cannot sign in.", "Switching this changes who can sign in. Turning it off signs those accounts out."]];
  K.view("features", { title: "Features", eyebrow: "Control", lead: "Switches for the whole system. Each change takes effect at once and is recorded.",
    render: function () {
      return A.get("/api/sys/features").then(function (r) {
        S.features = r.features; if (S.notes) S.notes();
        return FEAT.map(function (f) {
          var on = !!r.features[f[0]], id = "ft-" + f[0];
          return '<div class="k-feat"><div><h3 id="' + id + '">' + esc(f[1]) + "</h3><p>" + esc(f[2]) + "</p>" + K.st(on ? "On" : "Off", on ? "" : "m") + "</div>" +
            '<button type="button" class="k-sw" role="switch" aria-checked="' + on + '" aria-labelledby="' + id + '" data-act="ft" data-k="' + f[0] + '"></button></div>';
        }).join("");
      });
    } });
  K.acts.ft = function (b) {
    var k = b.getAttribute("data-k"), f = FEAT.filter(function (x) { return x[0] === k; })[0], next = b.getAttribute("aria-checked") !== "true", body = {}; body[k] = next;
    K.confirm({ title: (next ? "Turn on: " : "Turn off: ") + f[1].toLowerCase() + "?", text: f[3], ok: next ? "Turn on" : "Turn off",
      onSubmit: function () { return A.patch("/api/sys/features", body); } }).then(function (r) { if (r) { S.features = r.features; if (S.notes) S.notes(); K.toast(f[1] + (next ? " on" : " off")); K.render(); } });
  };

  /* ================= View as ================= */
  K.view("viewas", { title: "View as", eyebrow: "Control", lead: "Open someone's portal exactly as they see it, read only, to check a report or a problem. Their portal shows a banner, nothing can be changed, and it is recorded.",
    render: function (c) {
      return Promise.all([S.users(), A.get("/api/sys/impersonations")]).then(function (r) {
        var us = r[0].filter(function (u) { return u.active && u.role !== "super_admin"; }), hist = r[1].items;
        var cur = S.imp ? K.sec("Viewing now", "", "<p>This session is viewing as <b>" + esc(S.imp.user.name) + "</b> (" + esc(K.role(S.imp.user.role)) + ") since " + esc(K.dt(S.imp.started_at)) + ". Reason: " + esc(S.imp.reason) + "</p>" +
          '<div class="k-acts" style="margin-top:14px"><a class="k-b soft" href="' + esc(S.me.portal_page || "/") + '" target="_blank" rel="noopener">Open their portal</a><button type="button" class="k-b p" data-act="va-stop">Stop view as</button></div>') : "";
        var order = ["head_office", "branch_head", "branch_manager", "content_manager", "student", "parent", "staff", "university"];
        us.sort(function (a, b) { return order.indexOf(a.role) - order.indexOf(b.role) || String(a.name).localeCompare(b.name); });
        return cur + (S.imp ? "" : K.sec("", "", '<form class="k-f" data-form="va-go" style="max-width:640px">' +
          K.field({ name: "user_id", label: "Person", type: "select", options: us.map(function (u) { return [String(u.id), u.name + ", " + K.role(u.role) + (u.branch_name ? ", " + u.branch_name : "")]; }), value: c.params.user_id || "" }) +
          K.field({ name: "reason", label: "Why (shown in the audit log)", type: "textarea", max: 300, required: true, hint: "For example: check the fee report the branch manager asked about." }) +
          '<p class="k-err err" data-for="form" role="alert" hidden></p><div class="k-acts"><button type="submit" class="k-b p">Open read-only view</button></div>' +
          '<p class="k-mute k-small">Their portal opens in a new tab. While you view, this console still reads but cannot change anything; stop to make changes again.</p></form>')) +
          K.sec("History", "", K.table([{ t: "Started", f: function (x) { return esc(K.dt(x.started_at)); } }, { t: "Viewed", f: function (x) { return esc(x.target_name || "") + "<small>" + esc(K.role(x.target_role)) + "</small>"; } }, { t: "By", f: function (x) { return esc(x.super_name || ""); } }, { t: "Reason", k: "reason" }, { t: "Ended", f: function (x) { return x.ended_at ? esc(K.dt(x.ended_at)) : K.st("Still open"); } }],
            hist, { emptyTitle: "Nobody viewed yet", empty: "Each view as is listed here." }));
      });
    } });
  K.acts["va-go"] = function (f) {
    var d = K.formData(f), b = f.querySelector("[type=submit]"), g = f.querySelector(".err[data-for=form]");
    if (!d.reason || d.reason.length < 5) return A.showErrors(f, { details: { reason: "Write why (5 or more characters)." } });
    var w = window.open("", "_blank"); /* opened inside the click so the browser allows it */
    A.busy(b, true);
    A.post("/api/sys/impersonate", { user_id: +d.user_id, reason: d.reason }).then(function (r) {
      if (w) { try { w.opener = null; } catch (e) { /* ignore */ } w.location.href = r.portal_page; }
      location.reload();
    }, function (e) { A.busy(b, false); if (w) w.close(); A.showErrors(f, e); g.textContent = K.msg(e); g.hidden = false; });
  };
})();
