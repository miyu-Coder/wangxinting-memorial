/**
 * 参观动线时间轴：横向步骤 + 连接线 + 当前展点高亮（首页 / 详情共用）
 */
(function (global) {
  "use strict";

  var CIRCLED = ["\u2460", "\u2461", "\u2462", "\u2463", "\u2464", "\u2465", "\u2466", "\u2467", "\u2468", "\u2469"];

  /** 与 data.json id 顺序对应的短标签（动线紧凑显示） */
  var ROUTE_SHORT_FALLBACK = ["陈列馆", "故居", "广场", "装备"];

  function normId(v) {
    var n = parseInt(String(v), 10);
    return Number.isFinite(n) ? n : NaN;
  }

  function shortLabel(item, index) {
    if (item && item.routeShort) return String(item.routeShort);
    var idn = normId(item && item.id);
    if (idn >= 1 && idn <= ROUTE_SHORT_FALLBACK.length) {
      return ROUTE_SHORT_FALLBACK[idn - 1];
    }
    return ROUTE_SHORT_FALLBACK[index] || "展点";
  }

  /**
   * @param {HTMLElement} el
   * @param {Array} locations
   * @param {number|string|null} activeId 当前展点 id；null 则不高亮
   */
  function renderExhibitTimeline(el, locations, activeId) {
    if (!el || !locations || !locations.length) return;

    var activeNorm = activeId == null || activeId === "" ? NaN : normId(activeId);

    var compact = el.classList.contains("route-timeline--compact");
    el.className = "route-timeline" + (compact ? " route-timeline--compact" : "");
    el.innerHTML = "";

    var row = document.createElement("div");
    row.className = "route-timeline__row";
    el.appendChild(row);

    for (var i = 0; i < locations.length; i++) {
      var item = locations[i];
      var id = normId(item.id);

      var seg = document.createElement("div");
      seg.className = "route-timeline__segment";
      if (i === locations.length - 1) seg.classList.add("route-timeline__segment--last");

      var a = document.createElement("a");
      a.className = "route-timeline__step";
      var stepId = id;
      if (!Number.isFinite(stepId) || stepId < 1) stepId = i + 1;
      a.href =
        typeof global.buildDetailHref === "function"
          ? global.buildDetailHref(stepId)
          : "detail.html?id=" + encodeURIComponent(String(stepId));
      if (!Number.isNaN(activeNorm) && stepId === activeNorm) {
        a.classList.add("is-current");
        a.setAttribute("aria-current", "page");
      }

      var circle = document.createElement("span");
      circle.className = "route-timeline__circle";
      circle.textContent = CIRCLED[i] != null ? CIRCLED[i] : String(i + 1);
      circle.setAttribute("aria-hidden", "true");

      var lab = document.createElement("span");
      lab.className = "route-timeline__label";
      lab.textContent = shortLabel(item, i);

      a.appendChild(circle);
      a.appendChild(lab);
      seg.appendChild(a);

      if (i < locations.length - 1) {
        var conn = document.createElement("span");
        conn.className = "route-timeline__connector";
        conn.setAttribute("aria-hidden", "true");
        seg.appendChild(conn);
      }

      row.appendChild(seg);
    }
  }

  global.renderExhibitTimeline = renderExhibitTimeline;
  global.normExhibitId = normId;
})(window);
