/**
 * 首页：data.json 驱动展点卡片与横向参观动线时间轴
 */
(function () {
  "use strict";

  /** 将 URL 中的 id 规范为 "1".."n"，非法则返回 null */
  function normalizeUrlIdParam(raw) {
    if (raw == null) return null;
    var n = parseInt(String(raw).trim(), 10);
    if (!Number.isFinite(n) || n < 1) return null;
    return String(n);
  }

  /**
   * @param {Array} list
   * @param {string|null} preferredId 当前页 URL ?id= 优先；否则读 sessionStorage
   */
  function renderRouteTimeline(list, preferredId) {
    var el = document.getElementById("visit-route");
    if (!el || typeof window.renderExhibitTimeline !== "function") return;

    var highlight = normalizeUrlIdParam(preferredId);
    if (highlight == null) {
      try {
        highlight = normalizeUrlIdParam(sessionStorage.getItem("wx_current_stop"));
      } catch (e) {
        highlight = null;
      }
    }
    window.renderExhibitTimeline(el, list, highlight);
  }

  /** 根据规范 id 高亮卡片并滚动到视区（仅 #location-list-root 内） */
  function applyUrlCardHighlight(normalizedId) {
    if (normalizedId == null) return;
    var want = parseInt(normalizedId, 10);
    if (!Number.isFinite(want) || want < 1) return;

    var cards = document.querySelectorAll("#location-list-root a.location-card");
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.remove("location-card--highlight");
    }
    for (var j = 0; j < cards.length; j++) {
      var card = cards[j];
      var cid = card.getAttribute("data-location-id");
      var cn = cid == null ? NaN : parseInt(String(cid).trim(), 10);
      if (Number.isFinite(cn) && cn === want) {
        card.classList.add("location-card--highlight");
        (function (el) {
          setTimeout(function () {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 120);
        })(card);
        break;
      }
    }
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

      var idAttr = String(exId);
      a.setAttribute("data-location-id", idAttr);
      li.setAttribute("data-location-id", idAttr);

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

  function fallbackStatic(ul, preferredUrlId) {
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
        var fidAttr = String(fid);
        a.setAttribute("data-location-id", fidAttr);
        li.setAttribute("data-location-id", fidAttr);
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
    renderRouteTimeline(fake, preferredUrlId);
  }

  function init() {
    var ul = document.getElementById("location-list-root");
    var hint = document.getElementById("list-load-hint");

    var urlParams = new URLSearchParams(window.location.search);
    var targetId = urlParams.get("id");
    var urlNorm = normalizeUrlIdParam(targetId);

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
        if (urlNorm) {
          try {
            sessionStorage.setItem("wx_current_stop", urlNorm);
          } catch (e) {}
        }
        renderCards(list);
        renderRouteTimeline(list, urlNorm);
        if (urlNorm) applyUrlCardHighlight(urlNorm);

        if (hint) hint.textContent = "点击卡片或上方动线进入对应展点讲解。";
      })
      .catch(function () {
        if (urlNorm) {
          try {
            sessionStorage.setItem("wx_current_stop", urlNorm);
          } catch (e) {}
        }
        fallbackStatic(ul, urlNorm);
        if (urlNorm) applyUrlCardHighlight(urlNorm);
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