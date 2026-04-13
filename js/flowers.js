/**
 * 献花墙：localStorage key wx_flowers
 * 总献花数 = baseCount + totalUserFlowers（每展点每位用户仅计 1 次）
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "wx_flowers";
  var DEFAULT_BASE = 1280;

  var EXHIBIT_META = [
    { id: "1", name: "陈列馆", full: "将军生平事迹陈列馆" },
    { id: "2", name: "故居", full: "将军故居" },
    { id: "3", name: "广场", full: "纪念广场与将军纪念碑" },
    { id: "4", name: "装备", full: "退役军事装备实物展区" },
  ];

  function normExhibitId(v) {
    var n = parseInt(String(v).trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > 4) return null;
    return String(n);
  }

  function defaultState() {
    return {
      baseCount: DEFAULT_BASE,
      userFlowers: { "1": false, "2": false, "3": false, "4": false },
      totalUserFlowers: 0,
    };
  }

  function safeParse(raw) {
    if (raw == null || raw === "") return null;
    try {
      var o = JSON.parse(raw);
      return typeof o === "object" && o ? o : null;
    } catch (e) {
      return null;
    }
  }

  function normalizeState(raw) {
    var d = defaultState();
    if (!raw || typeof raw !== "object") return d;
    var bc = parseInt(String(raw.baseCount), 10);
    d.baseCount = Number.isFinite(bc) && bc >= 0 ? bc : DEFAULT_BASE;
    var uf = raw.userFlowers;
    if (uf && typeof uf === "object") {
      for (var i = 0; i < EXHIBIT_META.length; i++) {
        var k = EXHIBIT_META[i].id;
        d.userFlowers[k] = !!uf[k];
      }
    }
    var counted = 0;
    for (var j = 0; j < EXHIBIT_META.length; j++) {
      if (d.userFlowers[EXHIBIT_META[j].id]) counted++;
    }
    d.totalUserFlowers = counted;
    return d;
  }

  function readState() {
    try {
      return normalizeState(safeParse(localStorage.getItem(STORAGE_KEY)));
    } catch (e) {
      return defaultState();
    }
  }

  function writeState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e2) {}
  }

  /** 调整展示用历史基数（写入 localStorage） */
  function setBaseCount(n) {
    var bc = parseInt(String(n), 10);
    if (!Number.isFinite(bc) || bc < 0) return false;
    var state = readState();
    state.baseCount = bc;
    writeState(state);
    return true;
  }

  function getBaseCount() {
    return readState().baseCount;
  }

  function getDisplayTotal() {
    var s = readState();
    return s.baseCount + s.totalUserFlowers;
  }

  function hasFlowered(exhibitId) {
    var id = normExhibitId(exhibitId);
    if (!id) return false;
    return !!readState().userFlowers[id];
  }

  /**
   * @returns {{ ok: boolean, already?: boolean, displayTotal?: number }}
   */
  function offerFlower(exhibitId) {
    var id = normExhibitId(exhibitId);
    if (!id) return { ok: false };
    var state = readState();
    if (state.userFlowers[id]) {
      return { ok: false, already: true, displayTotal: state.baseCount + state.totalUserFlowers };
    }
    state.userFlowers[id] = true;
    var counted = 0;
    for (var i = 0; i < EXHIBIT_META.length; i++) {
      if (state.userFlowers[EXHIBIT_META[i].id]) counted++;
    }
    state.totalUserFlowers = counted;
    writeState(state);
    return {
      ok: true,
      displayTotal: state.baseCount + state.totalUserFlowers,
    };
  }

  function getExhibitList() {
    var s = readState();
    return EXHIBIT_META.map(function (m) {
      return {
        id: m.id,
        name: m.name,
        full: m.full,
        flowered: !!s.userFlowers[m.id],
      };
    });
  }

  function formatHomeLine() {
    var n = getDisplayTotal();
    return "\uD83C\uDF38 " + n + "+ \u4EBA\u5DF2\u732E\u82B1";
  }

  function showThankDialog() {
    var mask = document.createElement("div");
    mask.className = "flower-tribute-modal-mask";
    mask.setAttribute("role", "dialog");
    mask.setAttribute("aria-modal", "true");
    mask.setAttribute("aria-label", "致敬提示");

    var panel = document.createElement("div");
    panel.className = "flower-tribute-modal-panel";

    var h = document.createElement("p");
    h.className = "flower-tribute-modal-title";
    h.textContent = "感谢您的致敬！";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-primary flower-tribute-modal-btn";
    btn.textContent = "好的";

    function close() {
      mask.remove();
    }
    btn.addEventListener("click", close);
    mask.addEventListener("click", function (ev) {
      if (ev.target === mask) close();
    });

    panel.appendChild(h);
    panel.appendChild(btn);
    mask.appendChild(panel);
    document.body.appendChild(mask);
  }

  function mountFlowerWallPage() {
    var totalEl = document.getElementById("flower-wall-total");
    var listEl = document.getElementById("flower-wall-exhibit-list");
    if (totalEl) {
      totalEl.textContent = String(getDisplayTotal());
    }
    if (listEl) {
      listEl.innerHTML = "";
      var rows = getExhibitList();
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var li = document.createElement("li");
        li.className = "flower-wall-exhibit-item" + (r.flowered ? " is-done" : "");
        var name = document.createElement("span");
        name.className = "flower-wall-exhibit-item__name";
        name.textContent = "展点 " + r.id + " · " + r.full;
        var st = document.createElement("span");
        st.className = "flower-wall-exhibit-item__status";
        st.textContent = r.flowered ? "\u2705 \u5DF2\u732E\u82B1" : "\u672A\u732E\u82B1";
        li.appendChild(name);
        li.appendChild(st);
        listEl.appendChild(li);
      }
    }
  }

  function updateHomeCountEl() {
    var el = document.getElementById("home-flower-count");
    if (el) {
      el.textContent = formatHomeLine();
    }
  }

  global.wxFlowers = {
    STORAGE_KEY: STORAGE_KEY,
    DEFAULT_BASE: DEFAULT_BASE,
    readState: readState,
    getDisplayTotal: getDisplayTotal,
    hasFlowered: hasFlowered,
    offerFlower: offerFlower,
    getExhibitList: getExhibitList,
    formatHomeLine: formatHomeLine,
    showThankDialog: showThankDialog,
    mountFlowerWallPage: mountFlowerWallPage,
    updateHomeCountEl: updateHomeCountEl,
    normExhibitId: normExhibitId,
    setBaseCount: setBaseCount,
    getBaseCount: getBaseCount,
  };

  function autoMountWall() {
    if (document.getElementById("flower-wall-total")) {
      mountFlowerWallPage();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoMountWall);
  } else {
    autoMountWall();
  }
})(typeof window !== "undefined" ? window : this);
