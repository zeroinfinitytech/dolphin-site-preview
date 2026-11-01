/* System console + Head office only (loaded by super.html and admin.html after js/portal/core/admin-kit.js; the Branch portal does not load it).
   Small behaviour for the visual pass: empty lists offer the next action ("Clear filters", or "Show all branches" in head office). */
(function () {
  "use strict";
  var K = window.K; if (!K) return;
  var KEEP = ["tab", "entity", "type", "range", "status"];   /* view switches, not filters */
  function filtered(p) { return Object.keys(p || {}).some(function (k) { return p[k] !== "" && KEEP.indexOf(k) < 0 && k !== "page" && k !== "open"; }); }
  var table = K.table;
  K.table = function (cols, rows, o) {
    o = o || {};
    if (!o.emptyAct && (!rows || !rows.length) && K.ctx) {
      if (filtered(K.ctx.params)) o.emptyAct = '<button type="button" class="k-b soft" data-act="k-clear">Clear filters</button>';
      else if (K.state.portal === "head_office" && K.state.branch) o.emptyAct = '<button type="button" class="k-b soft" data-act="k-allb">Show all branches</button>';
    }
    return table(cols, rows, o);
  };
  K.acts["k-clear"] = function () { if (!K.ctx) return; var keep = {}; KEEP.forEach(function (k) { if (K.ctx.params[k]) keep[k] = K.ctx.params[k]; }); K.go(K.ctx.id, keep); };
  K.acts["k-allb"] = function () { var s = K.$("#hoBranch"); if (!s) return; s.value = ""; if (K.acts["ho-branch"]) K.acts["ho-branch"](s); };
})();
