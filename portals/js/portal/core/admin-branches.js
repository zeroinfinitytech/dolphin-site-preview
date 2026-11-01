/* Branches screen, shared by the System console (super.html, /api/sys/branches) and Head office (admin.html, /api/branches): list with team and counts,
   create, edit, make default, close and reopen, per-branch team. The page sets K.state.api = {branches, users} and K.state.branches(force) before this loads views. */
(function () {
  "use strict";
  var K = window.K, A = K.api, esc = K.esc, S = K.state;
  var STAFF_ROLES = ["branch_head", "branch_manager", "content_manager"];
  /* ================= Branches ================= */
  function slugify(s) { return String(s || "").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 60); }
  K.view("branches", { title: "Branches", eyebrow: "Control", lead: "Offices of Dolphin Education. The default branch receives website enquiries when a visitor picks none.",
    acts: '<button type="button" class="k-b p" data-act="br-new">New branch</button>',
    render: function () {
      return S.branches(true).then(function (bs) {
        S.branchRows = {}; bs.forEach(function (b) { S.branchRows[b.id] = b; });
        return K.table([{ t: "Branch", f: function (b) { return esc(b.name) + "<small>" + esc([b.code, b.city].filter(Boolean).join(", ")) + "</small>"; } },
          { t: "Status", f: function (b) { return [b.active ? K.st("Open", "i") : K.st("Closed"), b.is_default ? K.st("Default", "m") : ""].filter(Boolean).join("<br>"); } },
          { t: "Team", f: function (b) { var s = b.staff || {}; return STAFF_ROLES.map(function (k) { return esc(K.role(k)) + " " + (s[k] || 0); }).join("<br>"); } },
          { t: "Clients", f: function (b) { return esc(K.num(b.students)); }, cls: "r" }, { t: "Leads", f: function (b) { return esc(K.num(b.leads)); }, cls: "r" }],
          bs, { act: "br-open", label: "Branches", empty: "No branches yet." });
      });
    } });
  function branchForm(b) {
    b = b || { country: "Nepal" };
    return '<div class="k-fr">' + K.field({ name: "name", label: "Name", value: b.name, required: true }) + K.field({ name: "slug", label: "Web name", value: b.slug, hint: "Lower case letters, digits and dashes. Used in links.", required: true }) + "</div>" +
      '<div class="k-fr">' + K.field({ name: "code", label: "Code", value: b.code, hint: "2 to 4 letters, starts client numbers (NB-26-0031)." }) + K.field({ name: "city", label: "City", value: b.city }) + K.field({ name: "country", label: "Country", value: b.country }) + "</div>" +
      '<div class="k-fr">' + K.field({ name: "phone", label: "Phone", type: "tel", value: b.phone }) + K.field({ name: "email", label: "Email", type: "email", value: b.email }) + "</div>" +
      K.field({ name: "address", label: "Address", type: "textarea", value: b.address }) + K.field({ name: "is_default", label: "Default branch for website enquiries", type: "check", value: b.is_default });
  }
  function branchPayload(d) { var p = { name: d.name, slug: d.slug, code: d.code ? d.code.toUpperCase() : undefined, city: d.city, country: d.country, phone: d.phone, email: d.email, address: d.address }; if (d.is_default) p.is_default = true; Object.keys(p).forEach(function (k) { if (p[k] === undefined || p[k] === "") delete p[k]; }); return p; }
  K.acts["br-new"] = function () {
    K.dialog({ title: "New branch", cap: "Branches", submit: "Create branch", wide: true, body: branchForm(),
      onOpen: function (d) { var n = d.querySelector("[name=name]"), s = d.querySelector("[name=slug]"), touched = false; s.addEventListener("input", function () { touched = true; }); n.addEventListener("input", function () { if (!touched) s.value = slugify(n.value); }); },
      onSubmit: function (d) { return A.post(S.api.branches, branchPayload(d)); } }).then(function (b) { if (b) { K.toast(b.name + " created"); S._b = null; K.render(); } });
  };
  K.acts["br-open"] = function (b) { openBranch(b.getAttribute("data-id")); };
  var bdirty = false;
  function openBranch(id) {
    var b = S.branchRows[id];
    var dr = K.drawer({ title: b.name, cap: "Branch", onClose: function () { if (bdirty) { bdirty = false; S._b = null; K.render(); } } });
    A.get(S.api.users, { branch_id: id, limit: 100 }).then(function (r) {
      var team = r.items.filter(function (u) { return STAFF_ROLES.indexOf(u.role) > -1 || u.role === "staff"; }), members = r.items.length - team.length, s = b.staff || {}, l = b.limits || {};
      dr.set(K.dl([["Status", (b.active ? "Open" : "Closed") + (b.is_default ? ", default for website enquiries" : "")], ["Code", b.code], ["Web name", b.slug], ["City", [b.city, b.country].filter(Boolean).join(", ")], ["Phone", b.phone], ["Email", b.email], ["Address", b.address],
        ["Clients", K.num(b.students)], ["Leads", K.num(b.leads)], ["Student and parent logins", K.num(members)]]) +
        '<div class="k-acts" style="margin-top:6px"><button type="button" class="k-b soft sm" data-act="br-edit" data-id="' + id + '">Edit</button>' +
        (b.active ? (b.is_default ? "" : '<button type="button" class="k-b soft sm" data-act="br-default" data-id="' + id + '">Make default</button><button type="button" class="k-b sm d" data-act="br-close" data-id="' + id + '">Close branch</button>') : '<button type="button" class="k-b p sm" data-act="br-reopen" data-id="' + id + '">Reopen</button>') + "</div>" +
        '<h3 class="k-h2" style="margin-top:18px">Team</h3><p class="k-sub">' + STAFF_ROLES.map(function (k) { return esc(K.role(k)) + ": " + (s[k] || 0) + ", limit " + (l[k] || 0); }).join(" · ") + "</p>" +
        (team.length ? '<ul class="k-list">' + team.map(function (u) { return '<li class="k-rowx"><span><b>' + esc(u.name) + '</b> <span class="k-mute">' + esc(K.role(u.role)) + "</span></span><span>" + (u.active ? (u.online ? K.st("Online") : K.st("Active", "m")) : K.st("Inactive")) + "</span></li>"; }).join("") + "</ul>" : '<p class="k-mute">No staff in this branch yet. Create the branch head first.</p>'));
    }, function (e) { dr.set(K.fail(e)); });
  }
  function bAfter(id, msg) { return function (r) { if (r) { bdirty = true; K.toast(msg); S.branches(true).then(function (bs) { bs.forEach(function (x) { S.branchRows[x.id] = x; }); openBranch(id); }); } }; }
  K.acts["br-edit"] = function (b) {
    var x = S.branchRows[b.getAttribute("data-id")];
    K.dialog({ title: "Edit " + x.name, cap: "Branch", submit: "Save", wide: true, body: branchForm(x), onSubmit: function (d) { var p = branchPayload(d); if (!d.is_default) delete p.is_default; return A.patch(S.api.branches + "/" + x.id, p); } }).then(bAfter(x.id, "Saved"));
  };
  K.acts["br-default"] = function (b) { var x = S.branchRows[b.getAttribute("data-id")]; K.confirm({ title: "Make " + x.name + " the default?", text: "Website enquiries without a chosen branch will land here.", ok: "Make default", onSubmit: function () { return A.patch(S.api.branches + "/" + x.id, { is_default: true }); } }).then(bAfter(x.id, "Default branch changed")); };
  K.acts["br-close"] = function (b) { var x = S.branchRows[b.getAttribute("data-id")]; K.confirm({ title: "Close " + x.name + "?", text: "The branch disappears from the public site's branch list. Records and logins stay where they are; move them first if needed. You can reopen it.", ok: "Close branch", onSubmit: function () { return A.patch(S.api.branches + "/" + x.id, { active: false }); } }).then(bAfter(x.id, "Branch closed")); };
  K.acts["br-reopen"] = function (b) { var x = S.branchRows[b.getAttribute("data-id")]; K.run(b, A.patch(S.api.branches + "/" + x.id, { active: true }), "Branch reopened").then(function () { bAfter(x.id, "Branch reopened")(true); }, function () { }); };

})();
