/* Dolphin Content Manager portal: Today, Inbox (js/portal/core/convo.js), Media library (js/portal/core/media-picker.js), Stories, Forwards. */
(function () {
  "use strict";
  var CM = window.CM, api = CM.api, esc = CM.esc, $ = CM.$, $$ = CM.$$, V = CM.V;
  function settle(p) { return p.then(function (v) { return { ok: true, v: v }; }, function (e) { return { ok: false, e: e }; }); }
  var FWD_ST = { sent: "Waiting", accepted: "Accepted", done: "Done", returned: "Returned" };
  var ENT = { conversation: "Conversation", lead: "Enquiry", testimonial: "Story", form: "Website form", event_registration: "Event registration", student: "Client file" };
  var COUNTRY = { "united-kingdom": "UK", usa: "USA", canada: "Canada", australia: "Australia", "new-zealand": "New Zealand" };

  /* pass any item to the branch manager (POST /api/forwards) */
  CM.forwardItem = function (entity, id, what, done) {
    CM.dialog({ title: "Pass to branch manager", ok: "Pass on", lead: (what ? what + ". " : "") + "The branch manager is notified and you can follow it in Forwards.",
      body: '<label class="cv-fl"><span>Note for the branch manager (optional)</span><textarea class="cv-in" name="note" rows="3" maxlength="1000"></textarea></label>',
      submit: function (f) { return api.post("/api/forwards", { entity: entity, entity_id: id, note: f.elements.note.value.trim() || undefined }).then(function (r) { CM.toast("Passed to the branch manager"); if (done) done(r); }); } });
  };
  function fwdHref(f) {
    if (f.entity === "conversation") return "#/inbox/" + f.entity_id;
    if (f.entity === "student") return "#/clients/" + f.entity_id;
    if (f.entity === "testimonial") return "#/stories";
    return null;
  }
  function fwdRow(f, compact) {
    var h = fwdHref(f), st = FWD_ST[f.status] || f.status;
    return '<li class="row nothumb"><' + (h ? 'a href="' + h + '"' : "div") + ' class="main-l"><b>' + esc(f.entity_label || ENT[f.entity] || "Item") + "</b><small>" + esc(ENT[f.entity] || f.entity) + " · to " + esc(f.to_name || (f.to_role === "branch_head" ? "Branch head" : "Branch manager")) + " · " + esc(CM.ago(f.created_at)) + "</small>" +
      (!compact && f.note ? '<small>Your note: ' + esc(f.note) + "</small>" : "") + (f.decision_note ? "<small>" + esc((f.status === "returned" ? "Returned with: " : "Reply: ") + f.decision_note) + "</small>" : "") + (!compact && f.decided_at ? "<small>" + esc((f.decided_by_name ? f.decided_by_name + ", " : "") + CM.ts(f.decided_at)) + "</small>" : "") + "</" + (h ? "a" : "div") + ">" +
      '<div class="ra"><span class="stw' + (f.status === "returned" ? " warn" : f.status === "sent" ? " on" : "") + '">' + esc(st) + "</span></div></li>";
  }

  /* ================= Today ================= */
  V.today = function (r, el) {
    var me = CM.S.me, hour = new Date().getHours(), hi = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return Promise.all([
      settle(api.get("/api/conversations", { kind: "public", status: "open", limit: 20 })),
      settle(api.get("/api/conversations", { kind: "member", status: "active", limit: 30 })),
      settle(api.get("/api/forwards", { direction: "sent", limit: 6 })),
      settle(api.get("/api/document-requests", { status: "open" })),
      settle(api.get("/api/testimonials/moderation")),
      settle(api.get("/api/cms/items", { type: "event", limit: 100 }))
    ]).then(function (R) {
      var pub = R[0].ok ? R[0].v.items || [] : [], mem = R[1].ok ? R[1].v.items || [] : [], fw = R[2].ok ? R[2].v.items || [] : [], dr = R[3].ok ? R[3].v.items || [] : [];
      var st = R[4].ok ? (R[4].v.items || []).filter(function (t) { return t.consent_status === "pending"; }) : [], ev = R[5].ok ? R[5].v.items || [] : [];
      var memUn = mem.filter(function (c) { return c.unread; }), unread = memUn.reduce(function (s, c) { return s + (c.unread || 0); }, 0);
      var now = CM.today(), evs = ev.filter(function (e) { return (e.registrations && e.registrations.n) || (e.status === "published" && (e.starts_at || "") >= now); })   /* hidden drafts without registrations stay off Today */
        .sort(function (a, b) { return String(b.starts_at || "").localeCompare(String(a.starts_at || "")); }).slice(0, 6);
      CM.setCount("stories", st.length);
      function convRow(c) {
        var who = c.kind === "public" ? (c.visitor && c.visitor.name) || "Website visitor" : c.student_name || c.subject, m = c.last_message;
        return '<li class="row nothumb"><a class="main-l" href="#/inbox/' + c.id + '"><b>' + esc(who) + "</b><small>" + esc(m ? (m.kind === "note" ? "Internal note: " : "") + String(m.body || "").slice(0, 120) : c.subject || "") + "</small></a>" +
          '<div class="ra"><span class="stw' + (c.unread ? " on" : " t") + '">' + esc(c.unread ? c.unread + " new" : CM.ago(c.last_message_at)) + "</span></div></li>";
      }
      var fails = R.filter(function (x) { return !x.ok; });
      el.innerHTML = '<div class="pg">' + CM.head({ eb: (CM.S.branch ? CM.S.branch.name + " · " : "") + "Content", html: esc(hi) + ", <em>" + esc((me.name || "").split(" ")[0]) + "</em>", lead: "What is waiting for you today." }) +
        (fails.length ? '<p class="banner-msg">Some parts did not load: ' + esc(CM.api.message(fails[0].e)) + ' <button type="button" class="btn soft sm" data-act="retry">Try again</button></p>' : "") +
        '<div class="figs">' +
          '<a class="fig" href="#/inbox"><small>Website chats waiting</small><b>' + pub.length + "</b><span>" + (pub.length ? "Visitors are waiting for a reply" : "No one is waiting") + "</span></a>" +
          '<a class="fig" href="#/inbox"><small>Unread messages</small><b>' + unread + "</b><span>From students and parents</span></a>" +
          '<a class="fig" href="#/stories"><small>Stories to review</small><b>' + st.length + "</b><span>" + (st.length ? "Approve or reject" : "All reviewed") + "</span></a>" +
          '<a class="fig" href="#/clients"><small>Document requests open</small><b>' + dr.length + "</b><span>Waiting for students</span></a>" +
        "</div>" +
        '<div class="two"><div>' +
          '<section class="sec"><h2>Website chats waiting <a class="lnk" href="#/inbox">Open the inbox</a></h2>' + (pub.length ? '<ul class="rows">' + pub.slice(0, 6).map(convRow).join("") + "</ul>" : CM.empty("No one is waiting", "New website chats appear here and in the inbox the moment they arrive.")) + "</section>" +
          '<section class="sec"><h2>Students and parents</h2>' + (memUn.length ? '<ul class="rows">' + memUn.slice(0, 6).map(convRow).join("") + "</ul>" : CM.empty("All read", "Unread messages from students and parents show here.")) + "</section>" +
          '<section class="sec"><h2>Document requests open <a class="lnk" href="#/clients">Clients</a></h2>' + (dr.length ? '<ul class="rows">' + dr.slice(0, 6).map(function (d) {
            return '<li class="row nothumb"><a class="main-l" href="#/clients/' + d.student_id + '/documents"><b>' + esc(d.label || d.type_key) + "</b><small>" + esc(d.student_name) + (d.student_ref ? ", " + esc(d.student_ref) : "") + (d.due_at ? " · due " + esc(CM.date(d.due_at)) : "") + "</small></a>" + '<div class="ra"><span class="stw' + (d.overdue ? " warn" : "") + '">' + (d.overdue ? "Overdue" : "Open") + "</span></div></li>";
          }).join("") + "</ul>" : CM.empty("Nothing requested", "When you ask a student for a document, it waits here until they upload it.")) + "</section>" +
        "</div><div>" +
          '<section class="sec"><h2>Forwards you sent <a class="lnk" href="#/forwards">All forwards</a></h2>' + (fw.length ? '<ul class="rows">' + fw.map(function (f) { return fwdRow(f, true); }).join("") + "</ul>" : CM.empty("Nothing passed on yet", "Conversations and items you pass to the branch manager show their status here.")) + "</section>" +
          '<section class="sec"><h2>Events with registrations <a class="lnk" href="#/website/event">Events</a></h2>' + (evs.length ? '<ul class="rows">' + evs.map(function (e) {
            var n = e.registrations || { n: 0, people: 0 };
            return '<li class="row nothumb"><a class="main-l" href="#/website/event/' + e.id + '"><b>' + esc(e.title) + "</b><small>" + esc(e.starts_at ? CM.date(e.starts_at) : "No date") + " · " + (n.n ? n.n + (n.n === 1 ? " registration, " : " registrations, ") + n.people + (n.people === 1 ? " person" : " people") : "No registrations yet") + "</small></a>" + '<div class="ra"><span class="stw' + (e.status === "published" ? " on" : "") + '">' + esc(e.status) + "</span></div></li>";
          }).join("") + "</ul>" : CM.empty("No upcoming events", "Add an event and turn on registration to see sign-ups here.")) + "</section>" +
          '<section class="sec"><h2>Quick links</h2><ul class="rows">' + [["#/website/event/new", "Add an event", "Date, place, photo and registration"], ["#/website/post/new", "Write a blog post", "Headings, paragraphs, lists, quotes, images"], ["#/media", "Upload photos", "Resized and watermarked for you"], ["#/website/notice", "Site notice", "The thin line under the header"], ["#/website/site_settings", "Office details", "Address, phones, hours, map"], ["#/clients/new", "New client file", "With a duplicate check"]].map(function (q) {
            return '<li class="row nothumb"><a class="main-l" href="' + q[0] + '"><b>' + esc(q[1]) + "</b><small>" + esc(q[2]) + "</small></a><div></div></li>";
          }).join("") + '<li class="row nothumb"><a class="main-l" href="/" target="_blank" rel="noopener"><b>Open the website</b><small>In a new tab</small></a><div></div></li></ul></section>' +
        "</div></div></div>";
    });
  };

  /* ================= Inbox ================= */
  V.inbox = function (r, el, cur) {
    el.innerHTML = '<div class="cm-inbox"><h1 class="cm-sr">Inbox</h1><div id="cvHost"></div></div>';
    doc().body.classList.add("is-inbox");
    var inst = window.Convo.mount($("#cvHost", el), {
      me: CM.S.me, title: "Inbox",
      forwardTo: [{ role: "branch_manager", label: "Branch manager", action: "Pass to branch manager" }],
      onRoute: function (id) { location.hash = id ? "#/inbox/" + id : "#/inbox"; },
      onUnread: function (n) { CM.setCount("inbox", n); },
      onOpenStudent: function (id) { CM.go("#/clients/" + id); },
      onLead: function () { /* the branch manager sees the lead */ }
    });
    if (r[1]) inst.open(+r[1]);
    cur.update = function (r2) { var id = +r2[1] || null; if (id !== inst.current()) { if (id) inst.open(id); else inst.close(); } return true; };
    cur.keepScroll = true;
    CM.onLeave(function () { inst.destroy(); doc().body.classList.remove("is-inbox"); });
    CM.setCrumb([{ t: "Inbox" }]);
  };
  function doc() { return document; }

  /* ================= Media library ================= */
  V.media = function (r, el) {
    el.innerHTML = '<div class="pg">' + CM.head({ eb: "Website", title: "Media library", lead: "Photos, videos and PDFs for the website. Click a file for its alt text, focal point and where it is used." }) + '<div id="mpHost"></div></div>';
    window.MediaPicker.library($("#mpHost", el), { kind: "any" });
  };

  /* ================= Stories (moderation) ================= */
  V.stories = function (r, el) {
    return api.get("/api/testimonials/moderation").then(function (b) {
      var all = b.items || [], pend = all.filter(function (t) { return t.consent_status === "pending"; }), done = all.filter(function (t) { return t.consent_status !== "pending"; });
      CM.setCount("stories", pend.length);
      function voice(t) { return t.voice === "parent" ? "Parent" : t.voice === "university" ? "University" : "Student"; }
      function item(t, pending) {
        var meta = [voice(t), COUNTRY[t.country] || t.country, t.year, t.course, t.institution].filter(Boolean).join(" · ");
        return '<li class="row nothumb" data-id="' + t.id + '"><div class="main-l"><b>' + esc(t.name || "Anonymous") + (t.role ? ", " + esc(t.role) : "") + "</b><small>" + esc(meta) + " · sent " + esc(CM.ago(t.created_at)) + "</small>" +
          '<p style="margin:8px 0 0;font:400 18px/1.45 var(--serif);max-width:62ch">' + esc(t.text) + "</p>" +
          (!pending ? "<small>" + esc(t.consent_status === "approved" ? "Approved" + (t.consent_date ? ", consent " + CM.date(t.consent_date) : "") + (t.approved_by_name ? ", by " + t.approved_by_name : "") + (t.published ? ", on the website" : ", not published") : "Rejected") + "</small>" : "") + "</div>" +
          '<div class="ra">' + (pending ? '<button type="button" class="btn sm" data-act="st-ok" data-id="' + t.id + '">Approve</button><button type="button" class="btn soft sm" data-act="st-no" data-id="' + t.id + '">Reject</button><button type="button" class="btn quiet sm" data-act="st-fwd" data-id="' + t.id + '">Pass on</button>' : '<span class="stw' + (t.consent_status === "approved" ? " on" : "") + '">' + esc(t.consent_status) + "</span>") + "</div></li>";
      }
      el.innerHTML = '<div class="pg">' + CM.head({ eb: "Website", title: "Stories", lead: "Stories from students, parents and universities. Nothing goes on the website until you approve it with the date written consent was received." }) +
        '<section class="sec"><h2>Waiting for review</h2>' + (pend.length ? '<ul class="rows">' + pend.map(function (t) { return item(t, true); }).join("") + "</ul>" : CM.empty("All reviewed", "New stories sent from the website appear here.")) + "</section>" +
        '<section class="sec"><h2>Recently decided</h2>' + (done.length ? '<ul class="rows">' + done.slice(0, 20).map(function (t) { return item(t, false); }).join("") + "</ul>" : CM.empty("Nothing yet", "")) + "</section></div>";
    });
  };
  CM.A["st-ok"] = function (b) {
    var id = +b.dataset.id;
    CM.dialog({ title: "Approve this story", ok: "Approve", lead: "Record the date the written consent was received. You can publish it now or keep it ready.",
      body: '<label class="cv-fl"><span>Consent received on</span><input class="cv-in" type="date" name="consent_date" required value="' + CM.today() + '" max="' + CM.today() + '"></label><label class="ck" style="display:flex;gap:10px;align-items:center"><input type="checkbox" name="publish" checked> Publish on the website now</label>',
      submit: function (f) { var d = f.elements.consent_date.value; if (!d) throw new Error("Add the consent date."); return api.post("/api/testimonials/" + id + "/approve", { consent_date: d, publish: f.elements.publish.checked }).then(function () { CM.toast(f.elements.publish.checked ? "Story approved and published" : "Story approved"); CM.render(); }); } });
  };
  CM.A["st-no"] = function (b) {
    var id = +b.dataset.id;
    CM.dialog({ title: "Reject this story", ok: "Reject", danger: true, lead: "It stays in the history and is not shown on the website.",
      body: '<label class="cv-fl"><span>Reason (for the team)</span><textarea class="cv-in" name="reason" rows="3" maxlength="500" placeholder="For example: no written consent, or the person asked to remove it"></textarea></label>',
      submit: function (f) { return api.post("/api/testimonials/" + id + "/reject", { reason: f.elements.reason.value.trim() || undefined }).then(function () { CM.toast("Story rejected"); CM.render(); }); } });
  };
  CM.A["st-fwd"] = function (b) { CM.forwardItem("testimonial", +b.dataset.id, "Ask the branch manager to decide on this story"); };

  /* ================= Forwards ================= */
  var fwState = { status: "" };
  V.forwards = function (r, el) {
    el.innerHTML = '<div class="pg">' + CM.head({ eb: "Work", title: "Forwards", lead: "Everything you passed to the branch manager, and what happened to it." }) +
      '<div class="bar"><div class="pills" role="group" aria-label="Status">' + [["", "All"], ["sent", "Waiting"], ["accepted", "Accepted"], ["done", "Done"], ["returned", "Returned"]].map(function (s) { return '<button type="button" class="pill" data-act="fw-st" data-v="' + s[0] + '" aria-pressed="' + (fwState.status === s[0]) + '">' + s[1] + "</button>"; }).join("") + "</div></div>" +
      '<div id="fwList">' + CM.skel(5) + "</div></div>";
    return loadFw(el);
  };
  function loadFw(el) {
    var box = $("#fwList", el || document);
    return api.get("/api/forwards", { direction: "sent", status: fwState.status || undefined, limit: 100 }).then(function (b) {
      var it = b.items || [];
      box.innerHTML = it.length ? '<ul class="rows">' + it.map(function (f) { return fwdRow(f, false); }).join("") + "</ul>" : CM.empty(fwState.status ? "Nothing with this status" : "Nothing passed on yet", "Use Pass to branch manager in a conversation, a story or a client file.");
    }, function (e) { box.innerHTML = CM.errBox(e); });
  }
  CM.A["fw-st"] = function (b) { fwState.status = b.dataset.v; $$("[data-act=fw-st]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); $("#fwList").innerHTML = CM.skel(5); loadFw(); };
})();
