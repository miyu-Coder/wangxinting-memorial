/**
 * 首页：data.json 驱动展点卡片与横向参观动线时间轴
 */
(function () {
  "use strict";

  function renderRouteTimeline(list) {
    var el = document.getElementById("visit-route");
    if (!el || typeof window.renderExhibitTimeline !== "function") return;
    var highlight = null;
    try {
      highlight = sessionStorage.getItem("wx_current_stop");
    } catch (e) {}
    window.renderExhibitTimeline(el, list, highlight);
  }

  function circledIndex(i) {
    var codes = ["\u2460", "\u2461", "\u2462", "\u2463", "\u2464", "\u2465", "\u2466", "\u2467", "\u2468", "\u2469"];
    return codes[i] != null ? codes[i] : String(i + 1);
  }

  function renderCards(list) {
    var ul = document.getElementById("location-list-root");
    if (!ul) return;
    ul.innerHTML = "";

    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.className = "location-card";
      var exId = parseInt(String(item.id), 10);
      if (!Number.isFinite(exId) || exId < 1) exId = i + 1;
      a.href =
        typeof window.buildDetailHref === "function"
          ? window.buildDetailHref(exId)
          : "detail.html?id=" + encodeURIComponent(String(exId));

      var badge = document.createElement("span");
      badge.className = "location-card__badge";
      badge.textContent = circledIndex(i);
      badge.setAttribute("aria-hidden", "true");

      var main = document.createElement("div");
      main.className = "location-card__main";

      var t = document.createElement("p");
      t.className = "location-card-title";
      t.textContent = item.title || "展点 " + item.id;

      var d = document.createElement("p");
      d.className = "location-card-desc";
      d.textContent =
        item.summary ||
        (item.text ? String(item.text).slice(0, 52) + "…" : "进入语音与图文讲解");

      main.appendChild(t);
      main.appendChild(d);

      var arrow = document.createElement("span");
      arrow.className = "location-card__arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.innerHTML = "\u2192";

      a.appendChild(badge);
      a.appendChild(main);
      a.appendChild(arrow);
      li.appendChild(a);
      ul.appendChild(li);
    }
  }

  function fallbackStatic(ul) {
    var fake = [
      { id: 1, title: "将军生平事迹陈列馆", summary: "离线备用", routeShort: "陈列馆" },
      { id: 2, title: "将军故居", summary: "离线备用", routeShort: "故居" },
      { id: 3, title: "纪念广场与将军纪念碑", summary: "离线备用", routeShort: "广场" },
      { id: 4, title: "退役军事装备实物展区", summary: "离线备用", routeShort: "装备" },
    ];
    if (ul) {
      ul.innerHTML = "";
      for (var i = 0; i < fake.length; i++) {
        var item = fake[i];
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.className = "location-card";
        var fid = parseInt(String(item.id), 10);
        if (!Number.isFinite(fid) || fid < 1) fid = i + 1;
        a.href =
          typeof window.buildDetailHref === "function"
            ? window.buildDetailHref(fid)
            : "detail.html?id=" + encodeURIComponent(String(fid));
        var badge = document.createElement("span");
        badge.className = "location-card__badge";
        badge.textContent = circledIndex(i);
        badge.setAttribute("aria-hidden", "true");
        var main = document.createElement("div");
        main.className = "location-card__main";
        var t = document.createElement("p");
        t.className = "location-card-title";
        t.textContent = item.title;
        var d = document.createElement("p");
        d.className = "location-card-desc";
        d.textContent = item.summary;
        main.appendChild(t);
        main.appendChild(d);
        var arrow = document.createElement("span");
        arrow.className = "location-card__arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.innerHTML = "\u2192";
        a.appendChild(badge);
        a.appendChild(main);
        a.appendChild(arrow);
        li.appendChild(a);
        ul.appendChild(li);
      }
    }
    renderRouteTimeline(fake);
  }

  function init() {
    var ul = document.getElementById("location-list-root");
    var hint = document.getElementById("list-load-hint");

    fetch("data/data.json", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!Array.isArray(data) || !data.length) throw new Error("空数据");
        var list = data.slice().sort(function (a, b) {
          var ai = parseInt(String(a.id), 10);
          var bi = parseInt(String(b.id), 10);
          return ai - bi;
        });
        renderCards(list);
        renderRouteTimeline(list);
        if (hint) hint.textContent = "点击卡片或上方动线进入对应展点讲解。";
      })
      .catch(function () {
        fallbackStatic(ul);
        if (hint) {
          hint.textContent =
            "无法加载 data.json（请用本地服务器打开）。已显示备用链接与动线。";
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
