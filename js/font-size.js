/**
 * 全局字号：localStorage wx_font_size，值 small | medium | large
 * 须在 <head> 中、link stylesheet 之前引入，避免首屏闪烁。
 */
(function () {
  "use strict";

  var STORAGE_KEY = "wx_font_size";
  var ORDER = ["small", "medium", "large"];
  var LABELS = {
    small: "\u6807\u51C6",
    medium: "\u5927\u53F7",
    large: "\u7279\u5927\u53F7",
  };

  function normalizeTier(v) {
    if (ORDER.indexOf(v) >= 0) return v;
    return "small";
  }

  function readSaved() {
    try {
      return normalizeTier(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return "small";
    }
  }

  function applyTier(tier) {
    var t = normalizeTier(tier);
    document.documentElement.setAttribute("data-wx-font", t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch (e2) {}
    updateToggleUi(t);
    return t;
  }

  function currentTier() {
    return normalizeTier(document.documentElement.getAttribute("data-wx-font"));
  }

  function cycleTier() {
    var cur = currentTier();
    var i = ORDER.indexOf(cur);
    var next = ORDER[(i + 1) % ORDER.length];
    applyTier(next);
    showToast("\u5DF2\u5207\u6362\u81F3" + LABELS[next] + "\u5B57\u53F7");
    return next;
  }

  function updateToggleUi(tier) {
    var btn = document.getElementById("wx-font-toggle");
    if (!btn) return;
    var t = normalizeTier(tier);
    btn.setAttribute("aria-label", "\u5B57\u53F7\uFF1A" + LABELS[t] + "\uFF0C\u70B9\u51FB\u5207\u6362");
    btn.setAttribute("title", LABELS[t]);
    btn.setAttribute("data-wx-font-tier", t);
  }

  var toastTimer = null;
  function showToast(msg) {
    var el = document.getElementById("wx-font-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "wx-font-toast";
      el.className = "wx-font-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("is-visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("is-visible");
    }, 2200);
  }

  function bindToggle() {
    var btn = document.getElementById("wx-font-toggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      cycleTier();
    });
    updateToggleUi(currentTier());
  }

  applyTier(readSaved());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindToggle);
  } else {
    bindToggle();
  }

  window.wxFontSize = {
    STORAGE_KEY: STORAGE_KEY,
    ORDER: ORDER,
    labels: LABELS,
    apply: applyTier,
    cycle: cycleTier,
    current: currentTier,
    readSaved: readSaved,
  };
})();
