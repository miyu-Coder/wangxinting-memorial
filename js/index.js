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
  function updateHomeQuizProgress(locations) {
    var el = document.getElementById("home-quiz-progress");
    if (!el) return;
    var st = window.wxQuizStorage;
    if (!st || !Array.isArray(locations) || !locations.length) {
      el.hidden = true;
      return;
    }
    el.textContent = st.formatGlobalProgressLine(locations);
    el.hidden = false;
  }

  /**
   * 更新打卡进度条 - 移动到展点卡片上方
   */
  function updateFlowerWallEntry() {
    if (!window.wxFlowers || typeof window.wxFlowers.updateHomeCountEl !== "function") {
      return;
    }
    window.wxFlowers.updateHomeCountEl();
  }

  function updateCheckinProgress() {
    var sectionEl = document.getElementById('checkin-progress-section');
    if (!sectionEl || !window.wxCheckin || typeof window.wxCheckin.init !== 'function') return;

    // 使用 wxCheckin.init() 拉取当前用户的打卡状态
    window.wxCheckin.init().then(function () {
      var total = window.wxCheckin.getTotalChecked();
      var percent = window.wxCheckin.getProgressPercent();

      var html = '<div class="checkin-progress-banner-home">' +
        '<div class="checkin-progress-header">' +
        '  <span class="checkin-progress-title-home">' +
        '    🏆 <span id="checkin-progress-text">红色足迹打卡中 ' + total + '/4</span>' +
        '  </span>' +
        '  <span class="checkin-progress-percent-home" id="checkin-percent">' + percent + '%</span>' +
        '</div>' +
        '<div class="checkin-progress-bar-home">' +
        '  <div class="checkin-progress-fill" id="checkin-progress-home" style="width: ' + percent + '%;"></div>' +
        '</div>' +
        '<div class="checkin-progress-actions" id="checkin-actions">' +
        '  <p class="checkin-progress-msg">集齐四个展点解锁红色传承之旅</p>';

      if (total === 4 && window.wxCheckin.isCertificateUnlocked()) {
        html += '  <a class="checkin-view-certificate-btn" href="achievement.html">🎉 查看成就</a>';
      }

      html += '</div></div>';

      sectionEl.innerHTML = html;
      sectionEl.hidden = false;

      // 为进度条添加动画效果
      setTimeout(function () {
        var fillEl = document.getElementById('checkin-progress-home');
        if (fillEl) fillEl.style.width = percent + '%';
      }, 100);
    }).catch(function () {
      // ignore failures silently
    });
  }

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
      { id: 4, title: "退役军事装备实物展区", summary: "离线备用", routeShort: "装备展区" },
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

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function init() {
    if (window.WxCommon && typeof window.WxCommon.getUserNickname === 'function') {
      window.WxCommon.getUserNickname();
    }

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
        updateHomeQuizProgress(list);
        updateCheckinProgress();
        updateFlowerWallEntry();

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
        updateHomeQuizProgress([
          { id: 1, quiz: { questions: [1, 2, 3, 4] } },
          { id: 2, quiz: { questions: [1, 2, 3, 4] } },
          { id: 3, quiz: { questions: [1, 2, 3, 4] } },
          { id: 4, quiz: { questions: [1, 2, 3, 4] } },
        ]);
        if (hint) {
          hint.textContent =
            "无法加载 data.json（请用本地服务器打开）。已显示备用链接与动线。";
        }
        updateFlowerWallEntry();
      });

    // 为 #btn-open-map 绑定点击事件，打开地图导航选择器
    var btnOpenMap = document.getElementById("btn-open-map");
    if (btnOpenMap && window.MapNavigation && typeof window.MapNavigation.openMapChooser === "function") {
      btnOpenMap.addEventListener("click", function () {
        window.MapNavigation.openMapChooser();
      });
    }

    loadActivityTicker();
    initFootprintMap();
    if (window.WxCommon && typeof window.WxCommon.initMessageWall === 'function') {
      window.WxCommon.initMessageWall('msg-wall-home');
    }
  }

  function loadActivityTicker() {
    var ticker = document.getElementById("activityTickerInner");
    if (!ticker) return;

    var fallbackItems = [
      { type: "checkin", nickname: window.WxCommon ? window.WxCommon.getUserNickname() : "参观者", exhibit: "陈列馆" },
      { type: "flower", nickname: window.WxCommon ? window.WxCommon.getUserNickname() : "游客", exhibit: "故居" },
      { type: "quiz", nickname: window.WxCommon ? window.WxCommon.getUserNickname() : "学习者", exhibit: "广场" },
      { type: "checkin", nickname: "访客", exhibit: "装备展区" },
      { type: "flower", nickname: "致敬者", exhibit: "陈列馆" }
    ];

    function truncateNick(nick) {
      var str = String(nick || '');
      var chars = Array.from(str);
      if (chars.length > 6) {
        return chars.slice(0, 6).join('') + '...';
      }
      return str;
    }

    function renderTicker(items) {
      var html = '';
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var icon = '\uD83C\uDF89';
        var text = '';
        var nick = truncateNick(window.WxCommon && typeof window.WxCommon.displayNickname === 'function' ? window.WxCommon.displayNickname(it.nickname) : (it.nickname || '参观者'));
        if (it.type === 'checkin') {
          icon = '\uD83C\uDF89';
          text = icon + ' <strong>' + escapeTickerHtml(nick) + '</strong> \u521A\u521A\u5728' + escapeTickerHtml(it.exhibit || '展点') + '\u5B8C\u6210\u6253\u5361';
        } else if (it.type === 'flower') {
          icon = '\uD83C\uDF38';
          text = icon + ' <strong>' + escapeTickerHtml(nick) + '</strong> \u5411\u5C06\u519B\u732E\u82B1\u81F4\u656C';
        } else if (it.type === 'quiz') {
          icon = '\uD83D\uDCDD';
          text = icon + ' <strong>' + escapeTickerHtml(nick) + '</strong> \u5B8C\u6210\u4E86\u77E5\u8BC6\u95EE\u7B54';
        }
        html += '<span class="activity-ticker__item">' + text + '</span>';
        if (i < items.length - 1) {
          html += '<span class="activity-ticker__sep">\u2022</span>';
        }
      }
      ticker.innerHTML = html + html;
    }

    function escapeTickerHtml(s) {
      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    fetch('/api/activity/recent?limit=10', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.success && Array.isArray(data.list) && data.list.length > 0) {
          renderTicker(data.list);
        } else {
          renderTicker(fallbackItems);
        }
      })
      .catch(function () {
        renderTicker(fallbackItems);
      });
  }

  function initFootprintMap() {
    var container = document.getElementById('footprint-map');
    if (!container || typeof echarts === 'undefined') return;

    var chinaGeoUrl = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json';

    fetch(chinaGeoUrl)
      .then(function (res) { return res.json(); })
      .then(function (geoJson) {
        echarts.registerMap('china', geoJson);
        renderFootprintMap(container);
      })
      .catch(function () {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">地图加载失败，请刷新重试</p>';
      });
  }

  function renderFootprintMap(container) {
    var chart = echarts.init(container);

    var points = [
      { name: '孝感', desc: '1908年出生地', coord: [113.95, 30.92] },
      { name: '神头岭', desc: '1938年神头岭战斗', coord: [113.27, 36.47] },
      { name: '响堂铺', desc: '1938年响堂铺战斗', coord: [113.58, 36.41] },
      { name: '香城固', desc: '1939年香城固战斗', coord: [115.27, 36.85] },
      { name: '太原', desc: '1949年解放太原', coord: [112.55, 37.87] }
    ];

    var linesData = [];
    for (var i = 0; i < points.length - 1; i++) {
      linesData.push({
        coords: [points[i].coord, points[i + 1].coord]
      });
    }

    var scatterData = points.map(function (p) {
      return {
        name: p.name + '\n' + p.desc,
        value: p.coord.concat(1)
      };
    });

    var option = {
      backgroundColor: '#0a1a2e',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(10,26,46,0.9)',
        borderColor: '#D4AF37',
        borderWidth: 1,
        textStyle: { color: '#fff', fontSize: 13 },
        formatter: function (params) {
          if (params.seriesType === 'effectScatter') {
            return params.name.replace('\n', '<br/>');
          }
          return '';
        }
      },
      geo: {
        map: 'china',
        roam: true,
        zoom: 1.2,
        center: [113, 34],
        label: { show: false },
        itemStyle: {
          areaColor: '#12263a',
          borderColor: '#1a3a5c',
          borderWidth: 1
        },
        emphasis: {
          itemStyle: {
            areaColor: '#1a3a5c'
          }
        }
      },
      series: [
        {
          type: 'lines',
          coordinateSystem: 'geo',
          zlevel: 2,
          effect: {
            show: true,
            period: 4,
            trailLength: 0.6,
            color: '#D4AF37',
            symbolSize: 5
          },
          lineStyle: {
            color: '#C8102E',
            width: 2,
            curveness: 0.2,
            opacity: 0.8
          },
          data: linesData
        },
        {
          type: 'effectScatter',
          coordinateSystem: 'geo',
          zlevel: 3,
          rippleEffect: {
            brushType: 'stroke',
            scale: 4,
            period: 3
          },
          symbol: 'path://M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
          symbolSize: 18,
          itemStyle: {
            color: '#D4AF37'
          },
          label: {
            show: true,
            position: 'right',
            formatter: '{b}',
            fontSize: 11,
            color: '#fff',
            distance: 8
          },
          data: scatterData
        }
      ]
    };

    chart.setOption(option);

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        chart.resize();
      }, 200);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();