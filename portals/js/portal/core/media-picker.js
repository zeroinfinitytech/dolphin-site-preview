/* Dolphin portals: shared media library and picker (window.MediaPicker). Contract: HANDOFF_PHASE_A.md section 9 (/api/cms/media).
   Needs js/portal/core/portal-api.js (PortalAPI.uploadProgress). Brings its own styles (injected once, scoped .mp-*), follows the portal theme tokens.
   MediaPicker.open({kind, purpose, selected, title}) -> Promise<media|null>   pick one file (with upload) in a dialog
   MediaPicker.library(host, opts) -> instance                                 the full Media library screen (grid, upload, details, delete)
   MediaPicker.details(mediaOrId, opts) -> Promise                             the detail dialog on its own (alt text per language, focal point, where used, delete)
   MediaPicker.focal(host, media, value, onChange)                             a focal-point picker on one image
   MediaPicker.get(id) -> Promise<media> (cached)   MediaPicker.src(media, width?) -> url   MediaPicker.upload(file, {purpose, onProgress}) -> Promise<media>
   How to use it: HANDOFF_PORTAL_SHARED.md. */
(function () {
  "use strict";
  var api = window.PortalAPI, doc = document;
  var LANGS = [["en", "EN", "English"], ["ne", "ने", "Nepali"], ["es", "ES", "Spanish"], ["ko", "한", "Korean"], ["zh", "中", "Chinese"]];
  var LIMIT = { image: 15, video: 80, pdf: 10 };
  var MIME = { image: ["image/jpeg", "image/png", "image/webp"], video: ["video/mp4"], pdf: ["application/pdf"] };
  var PURPOSES = [["gallery", "Gallery photo"], ["banner", "Page banner"], ["event", "Event"], ["post", "Blog post"], ["team", "Team photo"], ["logo", "Logo"], ["video", "Video"], ["other", "Other"]];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function size(b) { if (!b && b !== 0) return ""; if (b < 1024) return b + " B"; if (b < 1048576) return Math.round(b / 1024) + " KB"; return (b / 1048576).toFixed(1) + " MB"; }
  function toast(m, tone) { if (window.Notify) window.Notify.toast({ title: m, tone: tone }); else if (window.Convo) window.Convo.toast(m); }

  /* ---------- styles (once) ---------- */
  function css() {
    if ($("#mp-css")) return;
    var s = doc.createElement("style"); s.id = "mp-css";
    s.textContent = [
      ".mp,.mp-dlg{--mp-ink:var(--ink,#161616);--mp-mute:var(--mute,#5d5d5d);--mp-line:var(--hair,rgba(22,22,22,.12));--mp-float:#fff;--mp-page:var(--bg,#fff);--mp-fill:rgba(22,22,22,.05);--mp-fill2:rgba(22,22,22,.09);--mp-acc:#6D1428;--mp-ring:#6D1428;--mp-sel:rgba(109,20,40,.08);--mp-grad:linear-gradient(135deg,#6D1428 0%,#BF4398 100%);--mp-grad-h:linear-gradient(135deg,#7c1830 0%,#cf56a6 100%);--mp-bad:#9b1b30;color:var(--mp-ink);font-family:var(--sans,system-ui,sans-serif)}",
      "html[data-theme=dark] .mp,html[data-theme=dark] .mp-dlg{--mp-ink:#f4f4f4;--mp-mute:#c4c4c4;--mp-line:rgba(255,255,255,.10);--mp-float:#1f1f1f;--mp-page:#161616;--mp-fill:rgba(255,255,255,.06);--mp-fill2:rgba(255,255,255,.10);--mp-acc:#eaa3cf;--mp-ring:#eaa3cf;--mp-sel:rgba(234,163,207,.12);--mp-bad:#f1a1b4}",
      ".mp *,.mp-dlg *{box-sizing:border-box}.mp :focus-visible,.mp-dlg :focus-visible{outline:2px solid var(--mp-ring);outline-offset:2px}",
      ".mp-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 22px;border:0;border-radius:999px;background:var(--mp-grad);color:#fff;font:600 14px/1 var(--sans,system-ui,sans-serif);cursor:pointer;white-space:nowrap;transition:background .18s,transform .18s}",
      ".mp-btn:hover{background:var(--mp-grad-h);transform:translateY(-1px)}.mp-btn.soft{background:var(--mp-fill);color:var(--mp-ink)}.mp-btn.soft:hover{background:var(--mp-fill2)}.mp-btn.bad{background:transparent;color:var(--mp-bad);box-shadow:inset 0 0 0 1.5px currentColor}.mp-btn.sm{min-height:40px;padding:0 16px;font-size:13.5px}",
      ".mp-btn[disabled]{opacity:.5;pointer-events:none}.mp-btn.is-loading{color:transparent!important;pointer-events:none}.mp-btn.is-loading:after{content:'';position:absolute;left:50%;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:2px solid #fff;border-right-color:transparent;animation:mpspin .8s linear infinite}.mp-btn.soft.is-loading:after{border-color:var(--mp-ink);border-right-color:transparent}@keyframes mpspin{to{transform:rotate(360deg)}}",
      ".mp-pill{display:inline-flex;align-items:center;min-height:38px;padding:0 14px;border:0;border-radius:999px;background:transparent;color:var(--mp-mute);font:600 13px/1 var(--sans,system-ui,sans-serif);cursor:pointer;white-space:nowrap}.mp-pill:hover{background:var(--mp-fill);color:var(--mp-ink)}.mp-pill[aria-pressed=true],.mp-pill[aria-selected=true]{background:var(--mp-sel);color:var(--mp-acc)}",
      ".mp-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:0 0 16px}.mp-seg{display:flex;gap:2px;flex-wrap:wrap}",
      ".mp-q{flex:1 1 220px;min-width:180px;min-height:44px;padding:0 16px;border:0;border-radius:999px;background:var(--mp-fill);color:var(--mp-ink);font:400 15px/1.2 var(--sans,system-ui,sans-serif)}.mp-q::placeholder{color:var(--mp-mute)}",
      ".mp-sel{min-height:44px;padding:0 36px 0 16px;border:0;border-radius:999px;background:var(--mp-fill);color:var(--mp-ink);font:500 14px/1 var(--sans,system-ui,sans-serif);appearance:none;-webkit-appearance:none;background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 20px) 50%,calc(100% - 15px) 50%;background-size:5px 5px;background-repeat:no-repeat}",
      ".mp-drop{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:18px 20px;margin:0 0 20px;border-radius:20px;outline:1.5px dashed var(--mp-line);outline-offset:-1.5px;transition:outline-color .18s,background .18s}",
      ".mp-drop.over{outline-color:var(--mp-acc);background:var(--mp-sel)}.mp-drop p{margin:0;font-size:14.5px;color:var(--mp-mute);line-height:1.5}.mp-drop p b{color:var(--mp-ink);font-weight:600}.mp-drop-a{display:flex;gap:8px;align-items:center;flex-wrap:wrap}",
      ".mp-ups{list-style:none;margin:-8px 0 20px;padding:0}.mp-ups li{padding:10px 0;border-bottom:1px solid var(--mp-line);font-size:14px}.mp-ups li .mp-un{display:flex;justify-content:space-between;gap:12px}.mp-ups li .mp-un span{color:var(--mp-mute)}.mp-ups li.bad .mp-un span{color:var(--mp-bad)}",
      ".mp-prog{display:block;height:3px;margin-top:8px;border-radius:3px;background:var(--mp-fill2);overflow:hidden}.mp-prog i{display:block;height:100%;width:0;background:var(--mp-grad);transition:width .18s}",
      ".mp-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:20px 16px}",
      ".mp-t{display:flex;flex-direction:column;gap:8px;width:100%;padding:0;border:0;background:transparent;color:var(--mp-ink);text-align:left;font:inherit;cursor:pointer;border-radius:14px}",
      ".mp-ph{position:relative;display:block;aspect-ratio:1;border-radius:14px;overflow:hidden;background:var(--mp-fill)}.mp-ph img,.mp-ph video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .3s}",
      ".mp-t:hover .mp-ph img{transform:scale(1.03)}.mp-ph .mp-k{position:absolute;left:10px;bottom:10px;font:700 11px/1 var(--sans,system-ui,sans-serif);letter-spacing:.1em;text-transform:uppercase;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.5)}",
      ".mp-ph .mp-doc{position:absolute;inset:0;display:grid;place-items:center;font:400 28px/1 var(--serif,Georgia,serif);color:var(--mp-mute)}",
      ".mp-t[aria-pressed=true] .mp-ph{box-shadow:0 0 0 3px var(--mp-page),0 0 0 6px var(--mp-acc)}.mp-t:focus-visible{outline-offset:4px}",
      ".mp-tn{font-size:13px;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mp-tm{font-size:12px;color:var(--mp-mute);margin-top:-6px}",
      ".mp-empty{padding:32px 0;color:var(--mp-mute);font-size:15px;line-height:1.55;max-width:48ch}.mp-more{margin:24px 0 0;text-align:center}",
      ".mp-sk{aspect-ratio:1;border-radius:14px;background:linear-gradient(90deg,var(--mp-fill) 0%,var(--mp-fill2) 50%,var(--mp-fill) 100%);background-size:200% 100%;animation:mpshim 1.4s ease-in-out infinite}@keyframes mpshim{from{background-position:200% 0}to{background-position:-200% 0}}",
      ".mp-dlg{width:min(1100px,calc(100vw - 32px));max-height:calc(100dvh - 40px);padding:0;border:1px solid var(--mp-line);border-radius:24px;background:var(--mp-float)}.mp-dlg.sm{width:min(880px,calc(100vw - 32px))}.mp-dlg::backdrop{background:rgba(10,10,10,.45)}",
      ".mp-dh{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 24px 12px}.mp-dh h2{margin:0;font:400 28px/1.15 var(--serif,Georgia,serif)}.mp-db{padding:4px 24px 16px;overflow-y:auto;max-height:calc(100dvh - 200px)}",
      ".mp-da{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 24px 20px;border-top:1px solid var(--mp-line)}.mp-da p{margin:0;font-size:14px;color:var(--mp-mute)}.mp-da div{display:flex;gap:8px;flex-wrap:wrap}",
      ".mp-x{min-height:40px;padding:0 14px;border:0;border-radius:999px;background:var(--mp-fill);color:var(--mp-ink);font:600 13px/1 var(--sans,system-ui,sans-serif);cursor:pointer}",
      ".mp-det{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:28px}.mp-det h3{margin:0 0 8px;font:600 12.5px/1.3 var(--sans,system-ui,sans-serif);letter-spacing:.08em;text-transform:uppercase;color:var(--mp-mute)}",
      ".mp-fo{position:relative;border-radius:16px;overflow:hidden;background:var(--mp-fill);cursor:crosshair;user-select:none;touch-action:none}.mp-fo img{display:block;width:100%;height:auto;max-height:52vh;object-fit:contain}.mp-fo video{display:block;width:100%;max-height:52vh}",
      ".mp-fo i{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;box-shadow:0 0 0 2px #fff,0 0 0 4px rgba(0,0,0,.35),inset 0 0 0 2px rgba(0,0,0,.35);pointer-events:none;transition:left .12s,top .12s}",
      ".mp-crops{display:flex;gap:12px;margin-top:12px}.mp-crops figure{margin:0;flex:1}.mp-crops span{display:block;border-radius:10px;overflow:hidden;background:var(--mp-fill)}.mp-crops img{display:block;width:100%;height:100%;object-fit:cover}.mp-crops figcaption{font-size:12px;color:var(--mp-mute);margin-top:4px}",
      ".mp-c1 span{aspect-ratio:16/9}.mp-c2{flex:.45!important}.mp-c2 span{aspect-ratio:4/5}.mp-c3{flex:.35!important}.mp-c3 span{aspect-ratio:1}",
      ".mp-hint{margin:8px 0 0;font-size:13px;color:var(--mp-mute);line-height:1.45}",
      ".mp-lt{display:flex;gap:2px;margin:0 0 8px;flex-wrap:wrap}.mp-in{display:block;width:100%;min-height:46px;padding:10px 16px;border:0;border-radius:14px;background:var(--mp-fill);color:var(--mp-ink);font:400 16px/1.4 var(--sans,system-ui,sans-serif)}",
      ".mp-dl{margin:16px 0 0}.mp-dl div{display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid var(--mp-line);font-size:14px}.mp-dl dt{color:var(--mp-mute)}.mp-dl dd{margin:0;text-align:right;overflow-wrap:anywhere}",
      ".mp-used{list-style:none;margin:0;padding:0}.mp-used li{padding:8px 0;border-bottom:1px solid var(--mp-line);font-size:14px;display:flex;justify-content:space-between;gap:12px}.mp-used li span{color:var(--mp-mute);font-size:12.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:600}",
      ".mp-err{margin:8px 0 0;color:var(--mp-bad);font-size:14px;line-height:1.45}",
      ".mp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}",
      "@media (max-width:760px){.mp-grid{grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:14px 10px}.mp-det{grid-template-columns:1fr}.mp-dh,.mp-db,.mp-da{padding-left:16px;padding-right:16px}.mp-dlg{width:calc(100vw - 16px);max-height:calc(100dvh - 16px)}.mp-pill,.mp-btn.sm,.mp-x{min-height:44px}.mp-drop{padding:14px 16px}}",
      "@media (prefers-reduced-motion:reduce){.mp *,.mp-dlg *{transition:none!important;animation:none!important}}"
    ].join("\n");
    doc.head.appendChild(s);
  }

  /* ---------- helpers ---------- */
  var cache = {};
  function get(id) { id = +id; if (!id) return Promise.resolve(null); if (!cache[id]) cache[id] = api.get("/api/cms/media/" + id).catch(function (e) { delete cache[id]; throw e; }); return cache[id]; }
  function put(m) { if (m && m.id) cache[m.id] = Promise.resolve(m); return m; }
  function src(m, w) { if (!m) return ""; if (m.kind !== "image") return m.src || m.full || ""; if (w && m.urls) { var best = null; Object.keys(m.urls).map(Number).sort(function (a, b) { return a - b; }).forEach(function (k) { if (!best && k >= w) best = m.urls[k]; }); if (best) return best; } return m.src || m.full || ""; }
  function kindOf(file) { var t = file.type; if (MIME.image.indexOf(t) > -1) return "image"; if (MIME.video.indexOf(t) > -1) return "video"; if (MIME.pdf.indexOf(t) > -1) return "pdf"; var n = (file.name || "").toLowerCase(); if (/\.(jpe?g|png|webp)$/.test(n)) return "image"; if (/\.mp4$/.test(n)) return "video"; if (/\.pdf$/.test(n)) return "pdf"; return null; }
  function allowed(kind) { if (!kind || kind === "any") return ["image", "video", "pdf"]; if (kind === "image_or_video") return ["image", "video"]; return [kind]; }
  function accept(kind) { return allowed(kind).map(function (k) { return MIME[k].join(","); }).join(","); }
  function check(file, kind) {
    var k = kindOf(file), ok = allowed(kind);
    if (!k || ok.indexOf(k) < 0) return { error: "Only " + ok.map(function (x) { return x === "image" ? "JPG, PNG or WebP images" : x === "video" ? "MP4 videos" : "PDF files"; }).join(", ") + " can be used here." };
    if (file.size > LIMIT[k] * 1048576) return { error: "Too large: " + (k === "image" ? "images" : k === "video" ? "videos" : "PDFs") + " can be up to " + LIMIT[k] + " MB (this one is " + size(file.size) + ")." };
    return { kind: k };
  }
  function upload(file, o) {
    o = o || {}; var c = check(file, o.kind); if (c.error) return Promise.reject(Object.assign(new Error(c.error), { status: 415, code: "client_check" }));
    return api.uploadProgress("/api/cms/media", file, { filename: file.name, purpose: o.purpose || (c.kind === "video" ? "video" : "other") }, o.onProgress).then(put);
  }
  function upMsg(e) {
    if (!e) return "Upload failed.";
    if (e.code === "client_check") return e.message;
    if (e.status === 415) return e.message || "That file type is not accepted.";
    if (e.status === 413) return e.message || "That file is too large.";
    if (e.code === "image_processing_unavailable") return "Images cannot be processed on the server right now. Try again later.";
    return api.message(e);
  }
  function tile(m, pressed) {
    var ph = m.kind === "image" ? '<img src="' + esc(src(m, 400)) + '" alt="" loading="lazy" decoding="async" style="object-position:' + ((m.focal ? m.focal.x : 0.5) * 100) + "% " + ((m.focal ? m.focal.y : 0.5) * 100) + '%">' :
      m.kind === "video" ? '<video src="' + esc(m.src || m.full) + '#t=0.5" preload="metadata" muted playsinline tabindex="-1" aria-hidden="true"></video><span class="mp-k">Video</span>' : '<span class="mp-doc">PDF</span>';
    var alt = m.alt && (typeof m.alt === "string" ? m.alt : m.alt.en);
    return '<li><button type="button" class="mp-t" data-mp="tile" data-id="' + m.id + '"' + (pressed != null ? ' aria-pressed="' + pressed + '"' : "") + ' aria-label="' + esc((alt || m.filename || "File") + (m.kind !== "image" ? ", " + m.kind : "")) + '"><span class="mp-ph"' + (m.purpose ? ' data-purpose="' + esc(m.purpose) + '"' : "") + '>' + ph + '</span><span class="mp-tn">' + esc(m.filename || "Untitled") + '</span><span class="mp-tm">' + esc(m.source === "library" ? "Site photo" : (m.width ? m.width + " × " + m.height : size(m.bytes))) + "</span></button></li>";
  }

  /* ---------- shared browser: filters + grid + uploads. Used by the dialog and the library screen ---------- */
  function browser(host, o) {
    css();
    var S = { kind: o.kind && o.kind !== "image_or_video" ? o.kind : "", source: "", q: "", items: [], page: 1, pages: 1, loading: true, err: null, sel: o.selected ? +o.selected : null, purpose: o.purpose || "other", ups: [] };
    var kinds = allowed(o.kind);
    host.innerHTML = '<div class="mp-drop" data-mp="drop"><p><b>Drop files here</b> or choose them. ' + esc(kinds.map(function (k) { return k === "image" ? "Images JPG, PNG, WebP up to 15 MB" : k === "video" ? "MP4 up to 80 MB" : "PDF up to 10 MB"; }).join(" · ")) + ".</p>" +
      '<div class="mp-drop-a">' + (o.choosePurpose ? '<label><span class="mp-sr">Use for</span><select class="mp-sel" data-mp="purpose">' + PURPOSES.map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === S.purpose ? " selected" : "") + ">Use for: " + esc(p[1]) + "</option>"; }).join("") + "</select></label>" : "") +
      '<button type="button" class="mp-btn sm" data-mp="choose">Choose files</button><input type="file" data-mp="file" accept="' + accept(o.kind) + '" multiple hidden></div></div>' +
      '<ul class="mp-ups" data-mp="ups" aria-live="polite"></ul>' +
      '<div class="mp-bar"><input type="search" class="mp-q" data-mp="q" placeholder="Search by file name" aria-label="Search files">' +
      (kinds.length > 1 ? '<div class="mp-seg" role="group" aria-label="Kind">' + [["", "All"]].concat(kinds.map(function (k) { return [k, k === "image" ? "Images" : k === "video" ? "Videos" : "PDFs"]; })).map(function (k) { return '<button type="button" class="mp-pill" data-mp="kind" data-v="' + k[0] + '" aria-pressed="' + (S.kind === k[0]) + '">' + k[1] + "</button>"; }).join("") + "</div>" : "") +
      '<div class="mp-seg" role="group" aria-label="Source">' + [["", "All"], ["upload", "Uploaded"], ["library", "Site photos"]].map(function (k) { return '<button type="button" class="mp-pill" data-mp="source" data-v="' + k[0] + '" aria-pressed="' + (S.source === k[0]) + '">' + k[1] + "</button>"; }).join("") + "</div></div>" +
      '<ul class="mp-grid" data-mp="grid" role="list"></ul><div class="mp-more" data-mp="morew"></div>';
    var grid = $("[data-mp=grid]", host), ups = $("[data-mp=ups]", host), drop = $("[data-mp=drop]", host), input = $("[data-mp=file]", host);
    function paint() {
      if (S.loading && !S.items.length) { grid.innerHTML = new Array(10).join('<li class="mp-sk" aria-hidden="true"></li>'); grid.setAttribute("aria-busy", "true"); $("[data-mp=morew]", host).innerHTML = ""; return; }
      grid.removeAttribute("aria-busy");
      if (S.err && !S.items.length) { grid.innerHTML = '<li class="mp-empty">' + esc(api.message(S.err)) + ' <button type="button" class="mp-btn soft sm" data-mp="reload">Try again</button></li>'; return; }
      if (!S.items.length) { grid.innerHTML = '<li class="mp-empty">' + esc(S.q ? "No file matches that name." : "Nothing here yet. Drop photos above to add them.") + "</li>"; $("[data-mp=morew]", host).innerHTML = ""; return; }
      grid.innerHTML = S.items.map(function (m) { return tile(m, o.select ? S.sel === m.id : null); }).join("");
      $("[data-mp=morew]", host).innerHTML = S.page < S.pages ? '<button type="button" class="mp-btn soft sm" data-mp="more">Show more</button>' : "";
    }
    var lt = 0;
    function load(more) {
      var my = ++lt; if (!more) { S.page = 1; S.loading = true; paint(); } else S.page++;
      var q = { limit: 60, page: S.page, q: S.q || undefined, source: S.source || undefined, kind: S.kind || (kinds.length === 1 ? kinds[0] : undefined) };
      return api.get("/api/cms/media", q).then(function (b) {
        if (my !== lt) return; S.loading = false; S.err = null; S.pages = b.pages || 1;
        var items = (b.items || []).filter(function (m) { return kinds.indexOf(m.kind) > -1; }); items.forEach(put);
        S.items = more ? S.items.concat(items) : items; paint();
      }, function (e) { if (my !== lt) return; S.loading = false; S.err = e; paint(); });
    }
    function paintUps() { ups.innerHTML = S.ups.map(function (u) { return '<li class="' + (u.err ? "bad" : "") + '"><div class="mp-un"><b>' + esc(u.name) + "</b><span>" + esc(u.err || (u.done ? (u.dup ? "Already in the library" : "Added") : Math.round(u.p * 100) + "%")) + "</span></div>" + (!u.err && !u.done ? '<span class="mp-prog"><i style="width:' + Math.round(u.p * 100) + '%"></i></span>' : "") + "</li>"; }).join(""); }
    function files(list) {
      Array.prototype.forEach.call(list, function (f) {
        var u = { name: f.name, p: 0 }; S.ups.unshift(u); if (S.ups.length > 8) S.ups.length = 8;
        var c = check(f, o.kind); if (c.error) { u.err = c.error; paintUps(); return; }
        paintUps();
        upload(f, { kind: o.kind, purpose: c.kind === "video" ? "video" : S.purpose, onProgress: function (p) { u.p = p; paintUps(); } }).then(function (m) {
          u.done = true; u.dup = !!m.duplicate; paintUps();
          S.items = [m].concat(S.items.filter(function (x) { return x.id !== m.id; })); if (o.select) S.sel = m.id; paint();
          if (o.onUploaded) o.onUploaded(m);
        }, function (e) { u.err = upMsg(e); paintUps(); });
      });
    }
    host.addEventListener("click", function (e) {
      var t = e.target.closest("[data-mp]"); if (!t) return; var k = t.dataset.mp;
      if (k === "choose") input.click();
      else if (k === "kind" || k === "source") { S[k] = t.dataset.v; $$("[data-mp=" + k + "]", host).forEach(function (b) { b.setAttribute("aria-pressed", String(b === t)); }); load(); }
      else if (k === "more") load(true);
      else if (k === "reload") load();
      else if (k === "tile") { var m = S.items.filter(function (x) { return x.id === +t.dataset.id; })[0]; if (!m) return; if (o.select) { S.sel = m.id; $$("[data-mp=tile]", grid).forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.id === m.id)); }); if (o.onSelect) o.onSelect(m); } else if (o.onOpen) o.onOpen(m); }
    });
    host.addEventListener("dblclick", function (e) { var t = e.target.closest("[data-mp=tile]"); if (t && o.onChoose) { var m = S.items.filter(function (x) { return x.id === +t.dataset.id; })[0]; if (m) o.onChoose(m); } });
    host.addEventListener("change", function (e) { if (e.target === input) { files(input.files); input.value = ""; } else if (e.target.matches("[data-mp=purpose]")) S.purpose = e.target.value; });
    var qt; host.addEventListener("input", function (e) { if (e.target.matches("[data-mp=q]")) { clearTimeout(qt); qt = setTimeout(function () { S.q = e.target.value.trim(); load(); }, 300); } });
    ["dragenter", "dragover"].forEach(function (ev) { host.addEventListener(ev, function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") > -1) { e.preventDefault(); drop.classList.add("over"); } }); });
    ["dragleave", "drop"].forEach(function (ev) { host.addEventListener(ev, function (e) { if (ev === "dragleave" && host.contains(e.relatedTarget)) return; drop.classList.remove("over"); }); });
    host.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); files(e.dataTransfer.files); } });
    load();
    return { reload: function () { return load(); }, selected: function () { return S.items.filter(function (x) { return x.id === S.sel; })[0] || null; }, remove: function (id) { S.items = S.items.filter(function (x) { return x.id !== id; }); paint(); }, update: function (m) { S.items = S.items.map(function (x) { return x.id === m.id ? m : x; }); paint(); } };
  }

  /* ---------- dialog shell ---------- */
  function dlg(cls, title, body, foot) {
    css();
    var d = doc.createElement("dialog"); d.className = "mp-dlg " + (cls || ""); d.setAttribute("aria-labelledby", "mpT" + (++dlg.n));
    d.innerHTML = '<div class="mp-dh"><h2 id="mpT' + dlg.n + '">' + esc(title) + '</h2><button type="button" class="mp-x" data-mp="x">Close</button></div><div class="mp-db">' + body + "</div>" + (foot ? '<div class="mp-da">' + foot + "</div>" : "");
    doc.body.appendChild(d); var back = doc.activeElement, done = null;
    function close(v) { try { d.close(); } catch (e) { /* closed */ } d.remove(); if (back && doc.contains(back)) back.focus(); if (done) done(v); }
    d.addEventListener("click", function (e) { if (e.target.closest("[data-mp=x]") || e.target === d) close(null); });
    d.addEventListener("cancel", function (e) { e.preventDefault(); close(null); });
    if (d.showModal) d.showModal(); else d.setAttribute("open", "");
    return { el: d, close: close, then: function (f) { done = f; } };
  }
  dlg.n = 0;

  /* ---------- picker ---------- */
  function open(o) {
    o = o || {};
    return new Promise(function (resolve) {
      var label = o.kind === "video" ? "Choose a video" : o.kind === "image_or_video" ? "Choose an image or video" : o.kind === "pdf" ? "Choose a PDF" : "Choose an image";
      var D = dlg("", o.title || label, '<div class="mp" data-mp="host"></div>', '<p data-mp="pickn">' + (o.selected ? "The current file is selected." : "Select a file, then Use this.") + '</p><div><button type="button" class="mp-btn soft" data-mp="x">Cancel</button><button type="button" class="mp-btn" data-mp="use"' + (o.selected ? "" : " disabled") + ">Use this</button></div>");
      D.then(resolve);
      var B = browser($("[data-mp=host]", D.el), { kind: o.kind || "image", purpose: o.purpose, selected: o.selected, select: true,
        onSelect: function (m) { $("[data-mp=use]", D.el).disabled = false; $("[data-mp=pickn]", D.el).textContent = "Selected: " + (m.filename || "file"); },
        onChoose: function (m) { D.close(m); },
        onUploaded: function (m) { $("[data-mp=use]", D.el).disabled = false; $("[data-mp=pickn]", D.el).textContent = "Selected: " + (m.filename || "file"); } });
      D.el.addEventListener("click", function (e) { if (e.target.closest("[data-mp=use]")) { var m = B.selected(); if (m) D.close(m); else if (o.selected) get(o.selected).then(D.close, function () { D.close(null); }); } });
      var q = $("[data-mp=q]", D.el); if (q) q.focus();
    });
  }

  /* ---------- focal point picker ---------- */
  function focal(host, m, value, onChange) {
    css(); var v = { x: value && value.x != null ? value.x : 0.5, y: value && value.y != null ? value.y : 0.5 };
    host.classList.add("mp");
    host.innerHTML = '<div class="mp-fo" tabindex="0" role="slider" aria-label="Focal point. Click the most important part of the picture, or use the arrow keys." aria-valuetext=""><img src="' + esc(src(m, 1200)) + '" alt="' + esc(m.alt && (m.alt.en || m.alt) || "") + '" draggable="false"><i></i></div>' +
      '<div class="mp-crops" aria-hidden="true"><figure class="mp-c1"><span><img src="' + esc(src(m, 800)) + '" alt=""></span><figcaption>Wide banner</figcaption></figure><figure class="mp-c2"><span><img src="' + esc(src(m, 400)) + '" alt=""></span><figcaption>Phone</figcaption></figure><figure class="mp-c3"><span><img src="' + esc(src(m, 400)) + '" alt=""></span><figcaption>Square</figcaption></figure></div>' +
      '<p class="mp-hint">Crops keep this point in view on every screen size.</p>';
    var box = $(".mp-fo", host), dot = $(".mp-fo i", host);
    function paint() { dot.style.left = v.x * 100 + "%"; dot.style.top = v.y * 100 + "%"; $$(".mp-crops img", host).forEach(function (i) { i.style.objectPosition = v.x * 100 + "% " + v.y * 100 + "%"; }); box.setAttribute("aria-valuetext", "Across " + Math.round(v.x * 100) + " percent, down " + Math.round(v.y * 100) + " percent"); }
    function setFrom(e) { var img = $("img", box), r = img.getBoundingClientRect(); v = { x: Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * 100) / 100, y: Math.round(Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) * 100) / 100 }; paint(); if (onChange) onChange(v); }
    var down = false;
    box.addEventListener("pointerdown", function (e) { down = true; box.setPointerCapture && box.setPointerCapture(e.pointerId); setFrom(e); });
    box.addEventListener("pointermove", function (e) { if (down) setFrom(e); });
    box.addEventListener("pointerup", function () { down = false; });
    box.addEventListener("keydown", function (e) {
      var s = e.shiftKey ? 0.1 : 0.02, k = e.key;
      if (k === "ArrowLeft") v.x = Math.max(0, v.x - s); else if (k === "ArrowRight") v.x = Math.min(1, v.x + s); else if (k === "ArrowUp") v.y = Math.max(0, v.y - s); else if (k === "ArrowDown") v.y = Math.min(1, v.y + s); else return;
      e.preventDefault(); v = { x: Math.round(v.x * 100) / 100, y: Math.round(v.y * 100) / 100 }; paint(); if (onChange) onChange(v);
    });
    paint();
    return { value: function () { return v; } };
  }

  /* ---------- detail dialog: alt per language, focal, where used, delete ---------- */
  function details(mm, o) {
    o = o || {};
    return (typeof mm === "object" && mm && mm.used_in ? Promise.resolve(mm) : api.get("/api/cms/media/" + (mm.id || mm))).then(function (m) {
      put(m);
      return new Promise(function (resolve) {
        var alt = typeof m.alt === "string" ? { en: m.alt } : Object.assign({}, m.alt || {}), lang = "en", fv = m.focal || { x: 0.5, y: 0.5 }, dirty = false;
        var used = m.used_in || [];
        var info = [["File", m.filename], ["Kind", m.kind === "image" ? "Image" : m.kind === "video" ? "Video" : "PDF"], ["Source", m.source === "library" ? "Built-in site photo" : "Uploaded"], ["Size", m.width ? m.width + " × " + m.height + " px" : ""], ["File size", size(m.bytes)], ["Resized copies", (m.sizes || []).length ? (m.sizes || []).map(function (s) { return s + " px"; }).join(", ") : ""], ["Watermark", m.kind === "image" ? (m.watermarked ? "Dolphin watermark added" : "None") : ""], ["Added", m.created_at ? m.created_at.slice(0, 10) : ""]].filter(function (r) { return r[1]; });
        var body = '<div class="mp-det"><div class="mp-dl-media">' + (m.kind === "image" ? '<h3>Focal point</h3><div data-mp="focal"></div>' : m.kind === "video" ? '<div class="mp-fo" style="cursor:auto"><video src="' + esc(m.src || m.full) + '" controls preload="metadata" playsinline></video></div>' : '<p class="mp-hint">PDF file. <a href="' + esc(m.src || m.full) + '" target="_blank" rel="noopener">Open it</a>.</p>') + "</div>" +
          '<div><h3>Alt text</h3><p class="mp-hint" style="margin:0 0 10px">One short sentence describing the picture, read aloud to people who cannot see it. English is used when a language is empty.</p>' +
          '<div class="mp-lt" role="tablist" aria-label="Language">' + LANGS.map(function (l) { return '<button type="button" class="mp-pill" role="tab" data-mp="lang" data-v="' + l[0] + '" aria-selected="' + (l[0] === lang) + '" title="' + l[2] + '">' + l[1] + "</button>"; }).join("") + "</div>" +
          '<label><span class="mp-sr">Alt text</span><input class="mp-in" data-mp="alt" maxlength="200" value="' + esc(alt.en || "") + '" placeholder="For example: Students at the Dolphin office in New Baneshwor"></label>' +
          '<dl class="mp-dl">' + info.map(function (r) { return "<div><dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("") + "</dl>" +
          '<h3 style="margin-top:20px">Where it is used</h3>' + (used.length ? '<ul class="mp-used">' + used.map(function (u) { return "<li>" + esc(u.title || "Untitled") + "<span>" + esc((u.type || "").replace("_", " ") + " · " + (u.status || "")) + "</span></li>"; }).join("") + "</ul>" : '<p class="mp-hint" style="margin:0">Not used on the website yet.</p>') +
          '<p class="mp-err" data-mp="err" role="alert" hidden></p></div></div>';
        var foot = '<div>' + (o.canDelete === false ? "" : '<button type="button" class="mp-btn bad sm" data-mp="del">Delete</button>') + '</div><div><button type="button" class="mp-btn soft" data-mp="x">Close</button><button type="button" class="mp-btn" data-mp="save">Save</button></div>';
        var D = dlg("", m.filename || "File details", body, foot), el = D.el;
        D.then(function (v) { resolve(v); });
        if (m.kind === "image") focal($("[data-mp=focal]", el), m, fv, function (v) { fv = v; dirty = true; });
        var altIn = $("[data-mp=alt]", el);
        altIn.addEventListener("input", function () { alt[lang] = altIn.value; dirty = true; });
        function err(t) { var p = $("[data-mp=err]", el); p.textContent = t || ""; p.hidden = !t; }
        el.addEventListener("click", function (e) {
          var t = e.target.closest("[data-mp]"); if (!t) return;
          if (t.dataset.mp === "lang") { lang = t.dataset.v; $$("[data-mp=lang]", el).forEach(function (b) { b.setAttribute("aria-selected", String(b === t)); }); altIn.value = alt[lang] || ""; altIn.placeholder = lang === "en" ? "For example: Students at the Dolphin office in New Baneshwor" : (alt.en ? "English is used: " + alt.en : "English is used when empty"); altIn.focus(); }
          if (t.dataset.mp === "save") {
            var a = {}; LANGS.forEach(function (l) { var x = (alt[l[0]] || "").trim(); if (x) a[l[0]] = x; });
            t.classList.add("is-loading"); err("");
            api.patch("/api/cms/media/" + m.id, { alt: a, focal: m.kind === "image" ? fv : undefined }).then(function (nm) { put(Object.assign({}, m, nm)); toast("File details saved"); dirty = false; if (o.onSaved) o.onSaved(nm); D.close(nm); },
              function (x) { t.classList.remove("is-loading"); err(x.details ? Object.keys(x.details).map(function (k) { return x.details[k]; }).join(" ") : api.message(x)); });
          }
          if (t.dataset.mp === "del") {
            if (!t.dataset.sure) { t.dataset.sure = "1"; t.textContent = "Delete for good"; err(used.length ? "This file is used on the website, so it cannot be deleted yet." : "Press again to delete this file. This cannot be undone."); return; }
            t.classList.add("is-loading");
            api.delete("/api/cms/media/" + m.id).then(function () { delete cache[m.id]; toast("File deleted"); if (o.onDeleted) o.onDeleted(m); D.close({ deleted: true, id: m.id }); }, function (x) {
              t.classList.remove("is-loading"); t.removeAttribute("data-sure"); t.textContent = "Delete";
              if (x.code === "in_use") { var u = (x.details && x.details.used_in) || []; err("Still used in " + (u.length ? u.map(function (i) { return (i.title || i.type) + " (" + i.status + ")"; }).join(", ") : "website content") + ". Replace it there first, then delete."); }
              else if (x.code === "library") err("Built-in site photos stay in the library. You can stop using it instead.");
              else err(api.message(x));
            });
          }
        });
      });
    });
  }

  /* ---------- library screen ---------- */
  function library(host, o) {
    o = o || {}; css(); host.classList.add("mp");
    var B = browser(host, { kind: o.kind || "any", purpose: o.purpose || "gallery", choosePurpose: true, onOpen: function (m) {
      details(m, { onSaved: function (nm) { B.update(Object.assign({}, m, nm)); }, onDeleted: function (dm) { B.remove(dm.id); } });
    } });
    return { reload: B.reload };
  }

  window.MediaPicker = { open: open, library: library, details: details, focal: focal, get: get, src: src, upload: upload, check: check, languages: LANGS, purposes: PURPOSES, css: css };
})();
