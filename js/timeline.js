/**
 * 参观动线时间轴：SVG蜿蜒行军路线图
 * 使用 SVG 绘制贝塞尔曲线连接四个展点节点
 */
(function (global) {
  "use strict";

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

  function buildDetailUrl(stepId) {
    return typeof global.buildDetailHref === "function"
      ? global.buildDetailHref(stepId)
      : "detail.html?id=" + encodeURIComponent(String(stepId));
  }

  function renderExhibitTimeline(el, locations, activeId) {
    if (!el || !locations || !locations.length) return;

    var activeNorm = activeId == null || activeId === "" ? NaN : normId(activeId);
    var compact = el.classList.contains("route-timeline--compact");
    el.className = "route-timeline route-timeline--march" + (compact ? " route-timeline--compact" : "");
    el.innerHTML = "";

    var count = locations.length;
    var svgW = 520;
    var svgH = 180;
    var padX = 50;
    var padY = 30;

    var usableW = svgW - padX * 2;
    var stepX = count > 1 ? usableW / (count - 1) : 0;

    var yHigh = padY + 20;
    var yLow = svgH - padY - 20;

    var nodes = [];
    for (var i = 0; i < count; i++) {
      var x = padX + stepX * i;
      var y;
      if (i === 0) {
        y = yLow;
      } else if (i === 1) {
        y = yHigh;
      } else if (i === 2) {
        y = yLow;
      } else {
        y = yHigh;
      }
      nodes.push({ x: x, y: y });
    }

    var pathD = "M " + nodes[0].x + " " + nodes[0].y;
    for (var i = 1; i < nodes.length; i++) {
      var prev = nodes[i - 1];
      var curr = nodes[i];
      var cpx1 = prev.x + (curr.x - prev.x) * 0.45;
      var cpy1 = prev.y;
      var cpx2 = curr.x - (curr.x - prev.x) * 0.45;
      var cpy2 = curr.y;
      pathD += " C " + cpx1 + " " + cpy1 + ", " + cpx2 + " " + cpy2 + ", " + curr.x + " " + curr.y;
    }

    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + svgW + " " + svgH);
    svg.setAttribute("class", "route-svg");
    svg.setAttribute("aria-hidden", "true");
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";

    var defs = document.createElementNS(svgNS, "defs");

    var glow = document.createElementNS(svgNS, "filter");
    glow.setAttribute("id", "starGlow");
    glow.setAttribute("x", "-50%");
    glow.setAttribute("y", "-50%");
    glow.setAttribute("width", "200%");
    glow.setAttribute("height", "200%");
    var feGauss = document.createElementNS(svgNS, "feGaussianBlur");
    feGauss.setAttribute("stdDeviation", "3");
    feGauss.setAttribute("result", "blur");
    glow.appendChild(feGauss);
    var feMerge = document.createElementNS(svgNS, "feMerge");
    var feMergeNode1 = document.createElementNS(svgNS, "feMergeNode");
    feMergeNode1.setAttribute("in", "blur");
    feMerge.appendChild(feMergeNode1);
    var feMergeNode2 = document.createElementNS(svgNS, "feMergeNode");
    feMergeNode2.setAttribute("in", "SourceGraphic");
    feMerge.appendChild(feMergeNode2);
    glow.appendChild(feMerge);
    defs.appendChild(glow);
    svg.appendChild(defs);

    var path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", pathD);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#C8102E");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-dasharray", "8 4");
    path.setAttribute("stroke-linecap", "round");
    svg.appendChild(path);

    var startLabel = document.createElementNS(svgNS, "text");
    startLabel.setAttribute("x", nodes[0].x - 30);
    startLabel.setAttribute("y", nodes[0].y + 28);
    startLabel.setAttribute("class", "route-svg__endpoint");
    startLabel.textContent = "\uD83C\uDFC1 起点";
    svg.appendChild(startLabel);

    var endLabel = document.createElementNS(svgNS, "text");
    endLabel.setAttribute("x", nodes[nodes.length - 1].x + 10);
    endLabel.setAttribute("y", nodes[nodes.length - 1].y + 28);
    endLabel.setAttribute("class", "route-svg__endpoint");
    endLabel.textContent = "\uD83C\uDFC1 终点";
    svg.appendChild(endLabel);

    for (var i = 0; i < nodes.length; i++) {
      var item = locations[i];
      var id = normId(item.id);
      var stepId = id;
      if (!Number.isFinite(stepId) || stepId < 1) stepId = i + 1;
      var isActive = !Number.isNaN(activeNorm) && stepId === activeNorm;

      var g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "route-svg__node" + (isActive ? " is-current" : ""));
      g.setAttribute("data-step-id", stepId);
      g.style.cursor = "pointer";

      var starText = document.createElementNS(svgNS, "text");
      starText.setAttribute("x", nodes[i].x);
      starText.setAttribute("y", nodes[i].y + 6);
      starText.setAttribute("text-anchor", "middle");
      starText.setAttribute("class", "route-svg__star" + (isActive ? " is-current" : ""));
      starText.setAttribute("font-size", isActive ? "22" : "18");
      starText.setAttribute("fill", isActive ? "#D4AF37" : "#999");
      if (isActive) {
        starText.setAttribute("filter", "url(#starGlow)");
      }
      starText.textContent = "\u2605";
      g.appendChild(starText);

      var labelText = document.createElementNS(svgNS, "text");
      labelText.setAttribute("x", nodes[i].x);
      labelText.setAttribute("y", nodes[i].y + 26);
      labelText.setAttribute("text-anchor", "middle");
      labelText.setAttribute("class", "route-svg__label" + (isActive ? " is-current" : ""));
      labelText.textContent = shortLabel(item, i);
      g.appendChild(labelText);

      (function (sid) {
        g.addEventListener("click", function (e) {
          e.preventDefault();
          window.location.href = buildDetailUrl(sid);
        });
      })(stepId);

      svg.appendChild(g);
    }

    el.appendChild(svg);

    var overlay = document.createElement("div");
    overlay.className = "route-timeline__overlay";
    for (var i = 0; i < nodes.length; i++) {
      var item = locations[i];
      var id = normId(item.id);
      var stepId = id;
      if (!Number.isFinite(stepId) || stepId < 1) stepId = i + 1;
      var isActive = !Number.isNaN(activeNorm) && stepId === activeNorm;

      var a = document.createElement("a");
      a.className = "route-timeline__hit" + (isActive ? " is-current" : "");
      a.href = buildDetailUrl(stepId);
      a.setAttribute("aria-label", shortLabel(item, i));
      if (isActive) a.setAttribute("aria-current", "page");

      var pctX = (nodes[i].x / svgW) * 100;
      var pctY = (nodes[i].y / svgH) * 100;
      a.style.left = pctX + "%";
      a.style.top = pctY + "%";
      overlay.appendChild(a);
    }
    el.appendChild(overlay);
  }

  global.renderExhibitTimeline = renderExhibitTimeline;
  global.normExhibitId = normId;
})(window);
