/* Head office screens, part 2: Conversations (shared js/convo.js: read all, internal notes, reassign owner), Approvals (read), Users (create and manage
   within the staffing limits), Website (read-only CMS preview, edit site settings), Audit, Settings (office, receipt line, paused roles), Backups (read),
   Paused features (commission and courses, read only). Contract: HANDOFF_PHASE_A.md 5, 7, 9, 10. */
(function () {
  "use strict";
  var K = window.K, A = K.api, esc = K.esc, S = K.state;
  function E() { return S.branchLabel ? S.branchLabel() : "All branches"; }
  var STAFF_ROLES = ["branch_head", "branch_manager", "content_manager"];
  var HO_ROLES = [["branch_head", "Branch head"], ["branch_manager", "Branch manager"], ["content_manager", "Content manager"], ["student", "Student"], ["parent", "Parent"], ["head_office", "Head office"]];

  /* ================= Conversations ================= */
  K.view("conversations", { title: "Conversations", eyebrow: E, lead: "Every conversation in the branches. Head office reads, adds internal notes for the team, and can hand a conversation to someone else.",
    render: function () {
      if (!window.Convo) return K.empty("Conversations did not load", "The shared conversation component (js/portal/core/convo.js) is missing. Reload the page.");
      return '<div class="k-convo" id="hoConvo"></div><div class="k-join" id="hoAssign" hidden><div class="k-rowx"><span class="k-mute">Hand this conversation to another person in its branch.</span><button type="button" class="k-b soft sm" data-act="cv-assign">Change owner</button></div></div>';
    },
    after: function (c) {
      var host = K.$("#hoConvo"); if (!host) return;
      host.style.setProperty("--cv-h", "max(520px, calc(100dvh - 300px))");
      var inst = window.Convo.mount(host, { me: S.me, staff: true, title: S.branchLabel(), showBranch: true, forwardTo: [], canned: false,
        query: S.B() ? { branch_id: S.B() } : {}, emptyText: "No conversations in this view. Website chats and client messages appear here the moment they arrive.",
        onUnread: function () { if (S.badges) S.badges(); },
        onOpenStudent: function (id) { S.openClient(id); },
        onRoute: function (id) { S.convCur = id || null; var a = K.$("#hoAssign"); if (a) a.hidden = !id; } });
      S.convInst = inst;
      if (c.params.open) inst.open(+c.params.open);
      c.leave(function () { try { inst.destroy(); } catch (e) { /* gone */ } S.convInst = null; S.convCur = null; });
    } });
  K.acts["cv-assign"] = function () {
    var id = S.convCur; if (!id) return;
    A.get("/api/conversations/" + id).then(function (r) {
      var cv = r.conversation;
      return A.get("/api/users", { branch_id: cv.branch_id, active: 1, limit: 100 }).then(function (u) {
        var staff = u.items.filter(function (x) { return STAFF_ROLES.indexOf(x.role) > -1; });
        return K.dialog({ title: "Change owner", cap: (cv.subject || "Conversation") + ", " + (cv.branch_name || ""), submit: "Hand over",
          body: "<p class=\"k-mute\">Now with " + esc(cv.owner_name || K.role(cv.owner_role)) + ". The new owner is told at once.</p>" +
            K.field({ name: "owner_user_id", label: "New owner", type: "select", options: [["", "Choose a person"]].concat(staff.map(function (x) { return [String(x.id), x.name + ", " + K.role(x.role)]; })) }),
          onSubmit: function (d) {
            var who = staff.filter(function (x) { return String(x.id) === d.owner_user_id; })[0];
            if (!who) { var e = new Error("x"); e.details = { owner_user_id: "Choose the new owner." }; throw e; }
            return A.post("/api/conversations/" + id + "/assign", { owner_role: who.role, owner_user_id: who.id });
          } });
      });
    }).then(function (r) { if (r) { K.toast("Owner changed"); if (S.convInst) { S.convInst.refresh(); S.convInst.open(id); } } }, function (e) { K.toast(K.msg(e)); });
  };

  /* ================= Approvals ================= */
  K.view("approvals", { title: "Approvals", eyebrow: E, lead: "Sensitive requests from branch managers and how each branch head decided. Read only for head office.",
    render: function (c) {
      var p = c.params, st = p.status == null ? "pending" : p.status;
      return A.get("/api/approvals", { status: st || undefined, branch_id: S.B() }).then(function (r) {
        S.apprRows = {}; r.items.forEach(function (x) { S.apprRows[x.id] = x; });
        return K.seg("status", [["pending", "Waiting"], ["approved", "Approved"], ["rejected", "Rejected"], ["cancelled", "Cancelled"], ["", "All"]], st, "Status") +
          K.table([{ t: "Request", f: function (x) { return esc(x.kind_label || K.lab(x.kind)) + "<small>" + esc(x.entity_label || "") + "</small>"; } }, { t: "Branch", f: function (x) { return esc(x.branch_name); } },
            { t: "Asked by", f: function (x) { return esc(x.requested_by_name || "") + "<small>" + esc(K.dt(x.created_at)) + "</small>"; } }, { t: "State", f: function (x) { return K.st(K.lab(x.status === "pending" ? "waiting" : x.status), x.status === "pending" ? "" : "m"); } },
            { t: "Decided by", f: function (x) { return x.decided_by_name ? esc(x.decided_by_name) + "<small>" + esc(K.dt(x.decided_at)) + "</small>" : ""; } }], r.items, { act: "ap-open", label: "Approval requests", emptyTitle: "Nothing here", empty: "No approval requests with this status in this view." });
      });
    } });
  /* approvals: say in plain words what approving would do (payload is JSON from the branch portal) */
  function apprPlain(o) {
    if (o == null || typeof o !== "object") return o == null ? "" : String(o);
    return Object.keys(o).map(function (k) { var v = o[k]; return K.lab(k) + ": " + (/amount|total|paid/.test(k) && typeof v === "number" ? K.money(v) : v && typeof v === "object" ? JSON.stringify(v) : v); }).join(", ");
  }
  function apprWhat(x) {
    var p = x.payload || {};
    switch (x.kind) {
      case "fee_waiver": return p.amount != null ? "The fee goes down to " + K.money(p.amount) + (+p.amount === 0 ? " (fully waived)" : "") + "." : "The fee is waived.";
      case "fee_refund": return "A refund of " + K.money(p.amount) + (p.method ? " by " + p.method : "") + " is recorded with its own receipt, and the fee is lowered by the same sum.";
      case "fee_delete": return "The fee line is deleted (it has no payments).";
      case "client_archive": return "The client file is archived: hidden from lists, kept, and restorable by head office.";
      case "client_merge": return "Client file " + (p.merge_id != null ? "#" + p.merge_id + " " : "") + "is merged into this one; both histories are kept.";
      case "profile_unlock": return "The student's profile is unlocked so they can edit it again.";
      case "staff_deactivate": return "This content manager's login is switched off and their sessions end.";
    }
    return apprPlain(x.payload);
  }
  K.acts["ap-open"] = function (b) {
    var x = S.apprRows[b.getAttribute("data-id")];
    K.drawer({ title: x.kind_label || K.lab(x.kind), cap: x.branch_name, body: K.dl([["About", x.entity_label], ["Asked by", x.requested_by_name], ["Asked on", K.dt(x.created_at)], ["Reason", x.reason], ["What would happen", apprWhat(x)],
      ["State", K.lab(x.status)], x.status === "pending" ? null : ["Decided by", x.decided_by_name], x.status === "pending" ? null : ["Decided on", x.decided_at ? K.dt(x.decided_at) : ""], x.decision_note ? ["Decision note", x.decision_note] : null, x.result ? ["Result", apprPlain(x.result)] : null]) +
      '<p class="k-mute" style="margin-top:10px">Branch heads decide these in the branch portal. Head office can read them here.</p>' });
  };

  /* ================= Users ================= */
  K.view("users", { title: "Users", eyebrow: E, lead: "Accounts in every branch. Each branch has one branch head, one branch manager and at most two content managers.",
    acts: '<button type="button" class="k-b p" data-act="us-new">New user</button>',
    render: function (c) {
      var p = c.params;
      return Promise.all([S.branches(true), A.get("/api/users", { branch_id: S.B(), role: p.role, active: p.active, q: p.q, page: p.page, limit: 50 })]).then(function (r) {
        var bs = r[0], res = r[1]; S.userRows = {}; res.items.forEach(function (u) { S.userRows[u.id] = u; });
        var shown = S.B() ? bs.filter(function (b) { return String(b.id) === String(S.branch); }) : bs;
        return K.filters([{ name: "q", label: "Search", type: "search", ph: "Name or email", w: 1 }, { name: "role", label: "Role", type: "select", options: K.opts(HO_ROLES, "Any role") }, { name: "active", label: "Status", type: "select", options: [["", "Any status"], ["1", "Active"], ["0", "Inactive"]] }], p) +
          K.table([{ t: "Name", f: function (u) { return esc(u.name) + "<small>" + esc(u.email) + "</small>"; } }, { t: "Role", f: function (u) { return esc(K.role(u.role)); } }, { t: "Branch", f: function (u) { return esc(u.branch_name || (u.role === "head_office" ? "All branches" : "")); } },
            { t: "Status", f: function (u) { return [u.active ? K.st("Active", "i") : K.st("Inactive"), u.online ? K.st("Online") : ""].filter(Boolean).join("<br>"); } }, { t: "Last seen", f: function (u) { return esc(u.last_seen_at ? K.ago(u.last_seen_at) : "Never"); } }],
            res.items, { act: "us-open", label: "Users", empty: "Nobody matches these filters." }) + K.pager(res, "people") +
          K.sec("Staffing per branch", "Limits are set by the system; a full branch needs someone deactivated first.", '<ul class="k-list">' + shown.map(function (b) {
            var s = b.staff || {}, l = b.limits || {};
            return '<li class="k-rowx"><b>' + esc(b.name) + '</b><span class="k-mute k-small">' + STAFF_ROLES.map(function (k) { return esc(K.role(k)) + ": " + (s[k] || 0) + ", limit " + (l[k] || 0) + ((s[k] || 0) >= (l[k] || 0) ? " " + K.st("Full", "m") : ""); }).join(" &nbsp;·&nbsp; ") + "</span></li>";
          }).join("") + "</ul>");
      });
    } });
  function limitMsg(e) {
    if (e && e.code === "branch_limit") { var d = e.details || {}; var m = ((e.body && e.body.error) || "This branch is at its staffing limit.") + (d.role ? " Limit " + d.limit + ", active now " + d.active + ". Deactivate that account first, or ask the developers if the branch truly needs more." : ""); var x = new Error(m); x.status = 409; x.body = { error: m }; throw x; }
    throw e;
  }
  function roleFields(form) { var r = form.querySelector("[name=role]").value; K.$$("[data-show]", form).forEach(function (el) { el.hidden = el.getAttribute("data-show").split(" ").indexOf(r) < 0; K.$$("input,select", el).forEach(function (i) { i.disabled = el.hidden; }); }); }
  K.acts["us-new"] = function () {
    Promise.all([S.branches(), A.get("/api/students", { branch_id: S.B(), limit: 100 })]).then(function (r) {
      var bs = r[0].filter(function (b) { return b.active; }), st = r[1].items;
      K.dialog({ title: "New user", cap: "Users", submit: "Create account", wide: true,
        body: '<div class="k-fr">' + K.field({ name: "name", label: "Full name", required: true, ac: "off" }) + K.field({ name: "email", label: "Email", type: "email", required: true, ac: "off" }) + "</div>" +
          '<div class="k-fr">' + K.field({ name: "role", label: "Role", type: "select", options: HO_ROLES, value: "branch_head" }) +
          '<div data-show="branch_head branch_manager content_manager">' + K.field({ name: "branch_id", label: "Branch", type: "select", options: bs.map(function (b) { return [String(b.id), b.name]; }), value: S.branch || "" }) + "</div>" +
          '<div data-show="student parent">' + K.field({ name: "student_id", label: "Client file", type: "select", options: st.map(function (s) { return [String(s.id), s.name + " (" + (s.ref_no || "") + ")"]; }), hint: "The login belongs to this file and its branch." }) + "</div></div>" +
          '<div class="k-fr">' + K.field({ name: "password", label: "First password", value: K.password(), required: true, ac: "off", hint: "At least 10 characters. Share it privately." }) + K.field({ name: "phone", label: "Phone (optional)", type: "tel", ac: "off" }) + "</div>",
        onOpen: function (d) { var f = d.querySelector("form"); roleFields(f); f.querySelector("[name=role]").addEventListener("change", function () { roleFields(f); }); },
        onSubmit: function (d) {
          var p = { name: d.name, email: d.email, role: d.role, password: d.password, phone: d.phone };
          if (STAFF_ROLES.indexOf(d.role) > -1) p.branch_id = +d.branch_id;
          if (d.role === "student" || d.role === "parent") p.student_id = +d.student_id;
          return A.post("/api/users", p).catch(limitMsg);
        } }).then(function (u) { if (u) { K.toast((u.name || "The account") + " can now sign in"); K.render(); } });
    }, function (e) { K.toast(K.msg(e)); });
  };
  K.acts["us-open"] = function (b) { openUser(b.getAttribute("data-id")); };
  var udirty = false;
  function openUser(id) {
    var u = S.userRows[id];
    var dr = K.drawer({ title: u.name, cap: K.role(u.role), onClose: function () { if (udirty) { udirty = false; K.render(); } } });
    var self = S.me && +S.me.id === +u.id, member = u.role === "student" || u.role === "parent";
    dr.set(K.dl([["Email", u.email], ["Role", K.role(u.role)], ["Branch", u.branch_name || (u.role === "head_office" ? "All branches" : "")], ["Phone", u.phone], ["Status", (u.active ? "Active" : "Inactive") + (u.online ? ", online now" : "")], ["Last seen", u.last_seen_at ? K.dt(u.last_seen_at) : "Never"], ["Created", K.dt(u.created_at)]]) +
      '<div class="k-acts" style="margin-top:8px"><button type="button" class="k-b soft sm" data-act="us-edit" data-id="' + u.id + '">Edit</button><button type="button" class="k-b soft sm" data-act="us-pass" data-id="' + u.id + '">Reset password</button>' +
      (self ? "" : u.active ? '<button type="button" class="k-b sm d" data-act="us-off" data-id="' + u.id + '">Deactivate</button>' : '<button type="button" class="k-b p sm" data-act="us-on" data-id="' + u.id + '">Reactivate</button>') + "</div>" +
      (member ? '<p class="k-mute" style="margin-top:10px">Student and parent logins follow their client file\'s branch.</p>' : ""));
  }
  function uAfter(id, msg) { return function (r) { if (r) { udirty = true; K.toast(msg); A.get("/api/users", { q: S.userRows[id].email, limit: 5 }).then(function (x) { x.items.forEach(function (y) { if (+y.id === +id) S.userRows[id] = y; }); openUser(id); }); } }; }
  K.acts["us-edit"] = function (b) {
    var u = S.userRows[b.getAttribute("data-id")], member = u.role === "student" || u.role === "parent";
    S.branches().then(function (bs) {
      var roles = HO_ROLES.filter(function (r) { return ((r[0] === "student" || r[0] === "parent") === member); });
      K.dialog({ title: "Edit " + u.name, cap: "Users", submit: "Save", body: K.field({ name: "name", label: "Full name", value: u.name, required: true }) + K.field({ name: "phone", label: "Phone", type: "tel", value: u.phone || "" }) +
        (u.role === "head_office" || member ? "" : '<div class="k-fr">' + K.field({ name: "role", label: "Role", type: "select", options: roles.filter(function (r) { return r[0] !== "head_office"; }), value: u.role }) + K.field({ name: "branch_id", label: "Branch", type: "select", options: bs.filter(function (x) { return x.active; }).map(function (x) { return [String(x.id), x.name]; }), value: String(u.branch_id || "") }) + "</div>" +
          '<p class="k-mute k-small">Changing the role or branch signs them out; staffing limits apply.</p>'),
        onSubmit: function (d) { var p = { name: d.name, phone: d.phone || undefined }; if (d.role && d.role !== u.role) p.role = d.role; if (d.branch_id && +d.branch_id !== +u.branch_id) p.branch_id = +d.branch_id; return A.patch("/api/users/" + u.id, p).catch(limitMsg); } }).then(uAfter(u.id, "Saved"));
    });
  };
  K.acts["us-pass"] = function (b) {
    var u = S.userRows[b.getAttribute("data-id")];
    K.dialog({ title: "Reset password", cap: u.name, submit: "Set password", body: "<p class=\"k-mute\">They are signed out everywhere. Share the new password privately.</p>" + K.field({ name: "password", label: "New password", value: K.password(), required: true, ac: "off", hint: "At least 10 characters." }),
      onSubmit: function (d) { return A.post("/api/users/" + u.id + "/reset-password", { password: d.password }); } }).then(uAfter(u.id, "Password changed"));
  };
  K.acts["us-off"] = function (b) {
    var u = S.userRows[b.getAttribute("data-id")];
    K.confirm({ title: "Deactivate " + u.name + "?", text: "They are signed out at once and cannot sign in. Their records stay; you can reactivate later.", ok: "Deactivate", onSubmit: function () { return A.post("/api/users/" + u.id + "/deactivate", {}); } }).then(uAfter(u.id, "Deactivated"));
  };
  K.acts["us-on"] = function (b) {
    var u = S.userRows[b.getAttribute("data-id")];
    K.confirm({ title: "Reactivate " + u.name + "?", text: "They can sign in again with their current password.", ok: "Reactivate", onSubmit: function () { return A.post("/api/users/" + u.id + "/activate", {}).catch(limitMsg); } }).then(uAfter(u.id, "Reactivated"));
  };

  /* ================= Website (read-only CMS preview + site settings) ================= */
  var TYPES = [["site_settings", "Office details"], ["banner", "Banners"], ["event", "Events"], ["post", "Blog posts"], ["gallery", "Gallery"], ["video", "Videos"], ["team", "Team"], ["university", "Universities"], ["faq", "Questions"], ["country_facts", "Country facts"], ["test_class", "Test classes"], ["notice", "Notice"]];
  function txt(v) { if (v == null) return ""; if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v); if (Array.isArray(v)) return v.map(txt).filter(Boolean).join(", "); if (v.en != null) return String(v.en); if (v.t) return txt(v.text || v.items || v.q); return JSON.stringify(v); }
  K.view("website", { title: "Website", eyebrow: "Whole site", lead: "What the content managers publish, read only. Head office edits the office details shown in the footer and on the contact page.",
    render: function (c) {
      var p = c.params, type = p.type || "site_settings";
      return A.get("/api/cms/items", { type: type, status: p.status, q: p.q, limit: 100, full: type === "site_settings" ? 1 : undefined }).then(function (r) {
        S.cmsRows = {}; r.items.forEach(function (x) { S.cmsRows[x.id] = x; });
        var head = K.filters([{ name: "type", label: "Content", type: "select", options: TYPES }, { name: "status", label: "State", type: "select", options: [["", "All but archived"], ["published", "Published"], ["draft", "Draft"], ["hidden", "Hidden"], ["archived", "Archived"]] }, { name: "q", label: "Search", type: "search", w: 1 }], Object.assign({}, p, { type: type }));
        if (type === "site_settings") {
          var s = r.items[0]; if (!s) return head + K.empty("No office details yet", "The content team has not created them.");
          var d = s.data || {};
          return head + K.sec("Office details", s.has_unpublished_changes ? "Saved changes are waiting to be published." : "Published " + K.dt(s.published_at) + ".", K.dl([["Address", txt(d.address)], ["Phones", txt(d.phones)], ["Mobiles", txt(d.mobiles)], ["WhatsApp", d.whatsapp], ["Email", d.email], ["Map", d.map ? d.map.lat + ", " + d.map.lng : ""]]) +
            '<div class="k-acts" style="margin-top:14px"><button type="button" class="k-b p" data-act="ws-edit" data-id="' + s.id + '">Edit office details</button>' + (s.has_unpublished_changes ? '<button type="button" class="k-b soft" data-act="ws-pub" data-id="' + s.id + '">Publish now</button>' : "") + '<a class="k-b soft" href="/contact.html" target="_blank" rel="noopener">Open the contact page</a></div>');
        }
        return head + K.table([{ t: "Title", f: function (x) { return esc(x.title || x.slug || "Untitled") + (x.slug ? "<small>" + esc(x.slug) + "</small>" : ""); } }, { t: "Branch", f: function (x) { return esc(x.branch_name || "Whole site"); } },
          { t: "State", f: function (x) { return K.st(K.lab(x.status), x.status === "published" ? "i" : "m") + (x.has_unpublished_changes ? "<small>Unpublished changes</small>" : ""); } }, { t: "Updated", f: function (x) { return esc(K.ago(x.updated_at)) + "<small>" + esc(x.updated_by_name || "") + "</small>"; } }],
          r.items, { act: "ws-open", label: "Website content", empty: "Nothing of this kind matches." });
      });
    } });
  K.acts["ws-open"] = function (b) {
    var x = S.cmsRows[b.getAttribute("data-id")];
    var dr = K.drawer({ title: x.title || "Item", cap: K.lab(x.type) + ", read only" });
    A.get("/api/cms/items/" + x.id).then(function (it) {
      var d = it.data || {};
      dr.set(K.dl([["State", K.lab(it.status) + (it.has_unpublished_changes ? ", with unpublished changes" : "")], ["Branch", it.branch_name || "Whole site"], ["Published", it.published_at ? K.dt(it.published_at) : "Never"], ["Last change", K.dt(it.updated_at) + (it.updated_by_name ? " by " + it.updated_by_name : "")]]) +
        '<h3 class="k-h2" style="margin-top:14px">Working copy</h3>' + K.dl(Object.keys(d).map(function (k) { var v = txt(d[k]); return [K.lab(k), v.length > 400 ? v.slice(0, 400) + "..." : v]; })) +
        '<p class="k-mute" style="margin-top:12px">Content managers edit and publish this in the content portal.</p>');
    }, function (e) { dr.set(K.fail(e)); });
  };
  K.acts["ws-edit"] = function (b) {
    var s = S.cmsRows[b.getAttribute("data-id")], d = s.data || {};
    K.dialog({ title: "Office details", cap: "Website", submit: "Save and publish", wide: true,
      body: K.field({ name: "address", label: "Address", type: "textarea", value: txt(d.address), required: true }) +
        '<div class="k-fr">' + K.field({ name: "phones", label: "Office phones", value: (d.phones || []).join(", "), hint: "Separate with commas." }) + K.field({ name: "mobiles", label: "Mobiles", value: (d.mobiles || []).join(", "), hint: "Separate with commas." }) + "</div>" +
        '<div class="k-fr">' + K.field({ name: "whatsapp", label: "WhatsApp", value: d.whatsapp || "" }) + K.field({ name: "email", label: "Email", type: "email", value: d.email || "" }) + "</div>" +
        '<div class="k-fr">' + K.field({ name: "lat", label: "Map latitude", value: d.map ? d.map.lat : "", attrs: ' inputmode="decimal"' }) + K.field({ name: "lng", label: "Map longitude", value: d.map ? d.map.lng : "", attrs: ' inputmode="decimal"' }) + "</div>",
      onSubmit: function (f) {
        var list = function (v) { return String(v || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean); };
        var addr = Object.assign({}, typeof d.address === "object" ? d.address : {}, { en: f.address });
        var data = { address: addr, phones: list(f.phones), mobiles: list(f.mobiles), whatsapp: f.whatsapp || "", email: f.email || "" };
        if (f.lat && f.lng) data.map = { lat: +f.lat, lng: +f.lng };
        return A.patch("/api/cms/items/" + s.id, { data: data }).then(function () { return A.post("/api/cms/items/" + s.id + "/publish", {}).catch(function (e) { if (e.code === "cms_frozen") { K.toast("Saved. Publishing is frozen right now; it goes live after the freeze."); return true; } throw e; }); });
      } }).then(function (r) { if (r) { K.toast("Office details saved"); K.render(); } });
  };
  K.acts["ws-pub"] = function (b) { K.run(b, A.post("/api/cms/items/" + b.getAttribute("data-id") + "/publish", {}), "Published").then(function () { K.render(); }, function () { }); };

  /* ================= Audit ================= */
  var ENT = ["user", "student", "lead", "application", "document", "fee", "payment", "claim", "approval", "conversation", "forward", "branch", "settings", "cms_item", "testimonial", "backup"];
  K.view("audit", { title: "Audit", eyebrow: E, lead: "Every change in the branches: who, what, before and after.",
    render: function (c) {
      var p = c.params;
      return Promise.all([A.get("/api/users", { branch_id: S.B(), limit: 100 }), A.get("/api/audit", { branch_id: S.B(), user_id: p.user_id, entity: p.entity, action: p.action, page: p.page, limit: 50 })]).then(function (r) {
        var us = r[0].items, res = r[1]; S.auditRows = {}; res.items.forEach(function (x) { S.auditRows[x.id] = x; });
        return K.filters([{ name: "user_id", label: "Person", type: "select", options: K.opts(us.map(function (u) { return [String(u.id), u.name + " (" + K.role(u.role) + ")"]; }), "Anyone"), w: 1 },
          { name: "entity", label: "Record", type: "select", options: K.opts(ENT.map(function (e) { return [e, K.lab(e)]; }), "Any record") }, { name: "action", label: "Action", type: "search", ph: "e.g. fee.*" }], p) +
          K.table([{ t: "Action", f: function (x) { return esc(K.lab(x.action)) + "<small>" + esc(K.dt(x.at)) + "</small>"; } }, { t: "Who", f: function (x) { return x.user_name ? esc(x.user_name) + "<small>" + esc(K.role(x.user_role)) + "</small>" : '<span class="k-mute">System</span>'; } },
            { t: "Record", f: function (x) { return esc(K.lab(x.entity)) + (x.entity_id != null ? " " + esc(x.entity_id) : ""); } }, { t: "Branch", f: function (x) { return esc(x.user_branch_id ? S.bname(S.branchList, x.user_branch_id) : "Head office"); } }],
            res.items, { act: "au-open", label: "Audit entries", empty: "Nothing was recorded with these filters." }) + K.pager(res, "entries");
      });
    } });
  K.acts["au-open"] = function (b) {
    var x = S.auditRows[b.getAttribute("data-id")]; if (!x) return;
    K.drawer({ title: K.lab(x.action), cap: "Audit entry " + x.id, body: K.dl([["When", K.dt(x.at)], ["Who", x.user_name ? x.user_name + ", " + K.role(x.user_role) : "System"], ["Record", K.lab(x.entity) + (x.entity_id != null ? " " + x.entity_id : "")], ["Action code", x.action]]) +
      '<h3 class="k-h2" style="margin-top:12px">Before and after</h3>' + K.diff(x.before, x.after) });
  };

  /* ================= Settings ================= */
  K.view("settings", { title: "Settings", eyebrow: "Whole organisation", lead: "Office details used on receipts, the receipt line, and paused portals.",
    render: function () {
      return Promise.all([A.get("/api/settings"), A.get("/api/roles").catch(function () { return null; })]).then(function (r) {
        var s = r[0].settings || {}, roles = r[0].roles || {}, rt = r[1];
        return K.sec("Receipts", "Printed on every receipt the branches issue.", '<form class="k-f" data-form="st-save" style="max-width:720px">' +
          '<div class="k-fr">' + K.field({ name: "office_name", label: "Organisation name", value: s.office_name }) + K.field({ name: "office_email", label: "Email", type: "email", value: s.office_email }) + "</div>" +
          K.field({ name: "office_address", label: "Address", value: s.office_address }) +
          '<div class="k-fr">' + K.field({ name: "office_phone", label: "Phone", value: s.office_phone }) + K.field({ name: "office_whatsapp", label: "WhatsApp", value: s.office_whatsapp }) + "</div>" +
          K.field({ name: "receipt_note", label: "Receipt line", type: "textarea", value: s.receipt_note, hint: "One or two sentences at the foot of each receipt, for example the refund policy." }) +
          '<p class="k-err err" data-for="form" role="alert" hidden></p><div class="k-acts"><button type="submit" class="k-b p">Save</button></div></form>') +
          K.sec("Paused portals", "Older portals kept for later. Switching one on lets those accounts sign in again.",
            '<div class="k-feat"><div><h3 id="rs1">Staff desks</h3><p>Counsellor and visa desks from the first version. Branch managers now do this work.</p></div><button type="button" class="k-sw" role="switch" aria-checked="' + !!(roles.staff && roles.staff.enabled) + '" aria-labelledby="rs1" data-act="st-role" data-k="staff"></button></div>' +
            '<div class="k-feat"><div><h3 id="rs2">University portal</h3><p>Partner universities\' own portal for applicants, courses and partner chat.</p></div><button type="button" class="k-sw" role="switch" aria-checked="' + !!(roles.university && roles.university.enabled) + '" aria-labelledby="rs2" data-act="st-role" data-k="university"></button></div>') +
          (rt ? K.sec("Who can do what", "As the server enforces it.", K.table([{ t: "Area", k: "name", noLink: 1 }].concat(rt.roles.map(function (ro) { return { t: K.role(ro), f: function (m) { return esc(m.access[ro] || ""); } }; })), rt.modules.map(function (m, i) { m.id = i; return m; }), { label: "Role access" })) : "");
      });
    } });
  K.acts["st-save"] = function (f) {
    var d = K.formData(f), b = f.querySelector("[type=submit]"), p = {};
    ["office_name", "office_email", "office_address", "office_phone", "office_whatsapp", "receipt_note"].forEach(function (k) { p[k] = d[k] || ""; });
    A.busy(b, true);
    A.patch("/api/settings", p).then(function () { A.busy(b, false); K.toast("Settings saved"); }, function (e) { A.busy(b, false); A.showErrors(f, e); var g = f.querySelector(".err[data-for=form]"); g.textContent = K.msg(e); g.hidden = false; });
  };
  K.acts["st-role"] = function (b) {
    var k = b.getAttribute("data-k"), next = b.getAttribute("aria-checked") !== "true", body = {}; body[k] = next;
    var name = k === "staff" ? "staff desks" : "the university portal";
    K.confirm({ title: (next ? "Switch on " : "Pause ") + name + "?", text: next ? "Those accounts can sign in again straight away." : "Those accounts are signed out and see a friendly paused message.", ok: next ? "Switch on" : "Pause",
      onSubmit: function () { return A.patch("/api/settings/roles", body); } }).then(function (r) { if (r) { K.toast(next ? "Switched on" : "Paused"); K.render(); } });
  };

  /* ================= Backups (read) ================= */
  K.view("backups", { title: "Backups", eyebrow: "Whole organisation", lead: "A copy of the database and uploaded files is made every day and kept for 30 days. The developers run and restore backups.",
    render: function () {
      return A.get("/api/admin/backups").then(function (r) {
        var lb = r.items[0];
        return K.kpis([["Latest", lb ? K.date(lb.date) : "None yet", lb ? K.ago(lb.created_at) : ""], ["Kept for", r.keep_days + " days"], ["Copies", K.num(r.items.length)]]) + '<div style="height:16px"></div>' +
          K.table([{ t: "Date", f: function (x) { return esc(K.date(x.date)) + "<small>" + esc(K.dt(x.created_at)) + "</small>"; } }, { t: "Database", cls: "r", f: function (x) { return x.db ? esc(K.bytes(x.bytes)) : K.st("Missing"); } }, { t: "Uploaded files", f: function (x) { return esc(K.num(x.upload_files)); }, cls: "r" }],
            r.items.map(function (x) { x.id = x.date; return x; }), { emptyTitle: "No backups yet", empty: "The first daily backup appears here." });
      });
    } });

  /* ================= Paused features (read only) ================= */
  K.view("paused", { title: "Paused features", eyebrow: "Kept for later", lead: "Partner commission and university courses from the first version. Paused for now; shown read only so nothing is lost.",
    render: function (c) {
      var tab = c.params.tab || "commission";
      var head = K.seg("tab", [["commission", "Commission"], ["courses", "Courses"]], tab, "Paused feature");
      if (tab === "courses") return A.get("/api/courses").then(function (r) {
        return head + K.table([{ t: "Course", f: function (x) { return esc(x.name) + "<small>" + esc(x.institution) + "</small>"; } }, { t: "Level", k: "level" }, { t: "Intakes", f: function (x) { return esc((x.intakes || []).join(", ")); } }, { t: "Fee", f: function (x) { return esc(K.money(x.fee, x.currency)); }, cls: "r" }, { t: "State", f: function (x) { return K.st(x.open ? "Open" : "Closed", x.open ? "i" : "m"); } }],
          r.items, { label: "Courses", emptyTitle: "No courses", empty: "Partner universities have not listed courses." });
      });
      return A.get("/api/commission").then(function (r) {
        var s = r.summary || {};
        return head + K.kpis([["Expected", K.money(s.expected, s.currency)], ["Received", K.money(s.received, s.currency)], ["Outstanding", K.money(s.outstanding, s.currency)], ["Rates", s.rate_confirmed ? "Signed" : "Not signed yet"]]) + '<div style="height:16px"></div>' +
          K.table([{ t: "Student", f: function (x) { return esc(x.student_name) + "<small>" + esc(x.course || "") + "</small>"; } }, { t: "University", f: function (x) { return esc(x.institution) + "<small>" + esc(x.intake || "") + "</small>"; } }, { t: "Rate", f: function (x) { return esc(x.rate_pct + " %") + (x.rate_confirmed ? "" : "<small>Unconfirmed</small>"); } },
            { t: "Expected", f: function (x) { return esc(K.money(x.expected, x.currency)); }, cls: "r" }, { t: "Received", f: function (x) { return esc(K.money(x.received, x.currency)); }, cls: "r" }, { t: "State", f: function (x) { return K.st(K.lab(x.status), "m"); } }],
            r.items.map(function (x) { x.id = x.application_id; return x; }), { label: "Commission", emptyTitle: "No commission lines", empty: "Nothing is expected from partners." });
      });
    } });
})();
