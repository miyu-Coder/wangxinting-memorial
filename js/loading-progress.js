/**
 * 顶部加载进度条：每 50ms 模拟增量至 90%；load 后至 100% 并淡出移除
 */
(function () {
  "use strict";

  var bar = null;
  var target = 0;
  var display = 0;
  var simId = null;
  var rafRunning = false;
  var loadDone = false;
  var removed = false;

  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = "wx-loading-progress";
    bar.className = "loading-progress";
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "100");
    bar.setAttribute("aria-valuenow", "0");
    bar.setAttribute("aria-hidden", "true");
    if (document.body) {
      document.body.insertBefore(bar, document.body.firstChild);
    } else {
      document.documentElement.appendChild(bar);
    }
    return bar;
  }

  function setWidthPct(n) {
    if (!bar || removed) return;
    var w = Math.min(100, Math.max(0, n));
    bar.style.width = w + "%";
    bar.setAttribute("aria-valuenow", String(Math.round(w)));
  }

  function rafLoop() {
    if (removed) return;
    display += (target - display) * 0.28;
    if (Math.abs(target - display) < 0.12) {
      display = target;
    }
    setWidthPct(display);

    if (loadDone && target >= 100 && display >= 99.85) {
      display = 100;
      setWidthPct(100);
      finishHide();
      return;
    }

    window.requestAnimationFrame(rafLoop);
  }

  function startRaf() {
    if (rafRunning) return;
    rafRunning = true;
    window.requestAnimationFrame(rafLoop);
  }

  function bumpSim() {
    if (loadDone || removed) return;
    if (target < 90) {
      target += 1 + Math.floor(Math.random() * 3);
      if (target > 90) target = 90;
    }
  }

  function finishHide() {
    if (removed) return;
    removed = true;
    rafRunning = false;
    if (simId != null) {
      window.clearInterval(simId);
      simId = null;
    }
    if (!bar) return;
    bar.classList.add("is-done");
    window.setTimeout(function () {
      if (!bar) return;
      bar.classList.add("is-hidden");
      window.setTimeout(function () {
        if (bar && bar.parentNode) {
          bar.parentNode.removeChild(bar);
        }
        bar = null;
      }, 360);
    }, 220);
  }

  function onWindowLoad() {
    loadDone = true;
    target = 100;
    if (display < 85) {
      display = 85;
    }
  }

  function boot() {
    ensureBar();
    target = 4;
    display = 0;
    setWidthPct(0);
    simId = window.setInterval(bumpSim, 50);
    startRaf();
    if (document.readyState === "complete") {
      onWindowLoad();
    } else {
      window.addEventListener("load", onWindowLoad);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
