/**
 * 终章成就页：读取 wx_full_achievements + data.json，展示汇总与 Canvas 分享海报
 */
(function () {
  "use strict";

  var LOCATIONS = [];

  function normId(v) {
    var n = parseInt(String(v).trim(), 10);
    return Number.isFinite(n) && n >= 1 ? n : null;
  }

  function loadLocations() {
    return fetch("data/data.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) throw new Error("数据格式应为数组");
        LOCATIONS = data.slice().sort(function (a, b) {
          return normId(a.id) - normId(b.id);
        });
      });
  }

  function nQuestions(loc) {
    if (!loc || !loc.quiz || !Array.isArray(loc.quiz.questions)) return 0;
    return loc.quiz.questions.length;
  }

  function getStatusIcon(score, maxScore) {
    if (score >= maxScore) return "⭐";
    if (score >= maxScore * 0.5) return "📚";
    return "🌱";
  }

  function getStatusClass(score, maxScore) {
    if (score >= maxScore) return "achievement-exhibit-item--perfect";
    if (score >= maxScore * 0.5) return "achievement-exhibit-item--good";
    return "achievement-exhibit-item--need-improve";
  }

  function getEncouragementText(totalScore, grandMax) {
    if (totalScore >= grandMax) return "太棒了！您已成为红色传承人！";
    if (totalScore >= 12) return "不错哦！再来一次冲击满分吧！";
    if (totalScore >= 8) return "继续学习，您会收获更多！";
    return "再参观一遍，重温将军的光辉历程！";
  }

  function renderExhibitList(container, state) {
    container.innerHTML = "";
    for (var i = 0; i < LOCATIONS.length; i++) {
      var loc = LOCATIONS[i];
      var nq = nQuestions(loc);
      if (nq < 1) continue;

      var lid = normId(loc.id);
      var key = lid != null ? String(lid) : "";
      var row = state.exhibits && state.exhibits[key];
      var item = document.createElement("article");

      var score = 0;
      var statusClass = "achievement-exhibit-item--need-improve";
      var icon = "🌱";

      if (row && row.completed) {
        score = Math.floor(Number(row.score) || 0);
        statusClass = getStatusClass(score, nq);
        icon = getStatusIcon(score, nq);
      }

      item.className = "achievement-exhibit-item " + statusClass;

      var content = document.createElement("div");
      content.innerHTML =
        '<span class="achievement-exhibit-item__icon">' + icon + '</span>' +
        '<h3 class="achievement-exhibit-item__name">' + (loc.routeShort || loc.title || "展点 " + key) + '</h3>' +
        '<p class="achievement-exhibit-item__score">' +
        (row && row.completed ? score + "/" + nq + "分" : "未完成") +
        '</p>';

      item.appendChild(content);
      container.appendChild(item);
    }
  }

  function drawPosterCanvas(state, grandMax) {
    var canvas = document.getElementById("poster-canvas");
    if (!canvas || !canvas.getContext) return null;
    var w = 750;
    var h = 1200;
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");

    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#fdf8f2");
    g.addColorStop(0.45, "#fff5eb");
    g.addColorStop(1, "#f5e6d8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(196, 30, 58, 0.35)";
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, w - 48, h - 48);

    ctx.fillStyle = "#7a1528";
    ctx.font = "bold 36px 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("王新亭将军红色教育基地", w / 2, 100);

    ctx.fillStyle = "#c41e3a";
    ctx.font = "bold 44px 'Noto Serif SC', 'SimSun', serif";
    ctx.fillText("红色传承之旅", w / 2, 168);

    ctx.fillStyle = "#555555";
    ctx.font = "28px 'Noto Sans SC', sans-serif";
    ctx.fillText("知识问答成就证书", w / 2, 230);

    ctx.fillStyle = "#b8923a";
    ctx.font = "bold 56px 'Noto Sans SC', sans-serif";
    var titleLine = state.title || "继续学习，砥砺初心";
    ctx.fillText(titleLine, w / 2, 360);

    ctx.fillStyle = "#333333";
    ctx.font = "36px 'Noto Sans SC', sans-serif";
    ctx.fillText(
      "答题总得分  " + state.totalScore + " / " + grandMax,
      w / 2,
      460
    );

    ctx.font = "28px 'Noto Sans SC', sans-serif";
    ctx.fillStyle = "#666666";
    var c = window.wxQuizStorage
      ? window.wxQuizStorage.countCompletedWithQuiz(LOCATIONS)
      : { done: 0, withQuiz: 4 };
    ctx.fillText("已完成展点  " + c.done + " / " + c.withQuiz, w / 2, 520);

    var y = 620;
    ctx.textAlign = "left";
    ctx.font = "26px 'Noto Sans SC', sans-serif";
    ctx.fillStyle = "#444444";
    ctx.fillText("各展点得分摘要", 60, y);
    y += 50;
    for (var i = 0; i < LOCATIONS.length && i < 4; i++) {
      var loc = LOCATIONS[i];
      var nq = nQuestions(loc);
      if (nq < 1) continue;
      var lid = normId(loc.id);
      var row = lid != null && state.exhibits ? state.exhibits[String(lid)] : null;
      var line =
        (loc.routeShort || loc.title || "展点") +
        "  " +
        (row && row.completed
          ? row.score + "/" + nq + " 分"
          : "未完成");
      ctx.fillStyle = row && row.completed ? "#2e7d32" : "#999999";
      ctx.fillText(line, 60, y);
      y += 44;
    }

    var now = new Date();
    ctx.textAlign = "center";
    ctx.fillStyle = "#999999";
    ctx.font = "22px 'Noto Sans SC', sans-serif";

    // 格式化日期为 YYYY年MM月DD日
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var date = String(now.getDate()).padStart(2, '0');

    ctx.fillText(
      year + "年" + month + "月" + date + "日",
      w / 2,
      h - 120
    );
    ctx.fillText("扫码或搜索访问官方导览", w / 2, h - 82);

    return canvas;
  }

  function downloadPoster() {
    var st = window.wxQuizStorage.getState(LOCATIONS);
    var grandMax = window.wxQuizStorage.grandMaxScore(LOCATIONS);
    if (grandMax < 1) grandMax = 16;

    var canvas = drawPosterCanvas(st, grandMax);
    if (!canvas) return;

    try {
      var url = canvas.toDataURL("image/png");
      var a = document.createElement("a");
      a.href = url;
      a.download = "王新亭红色教育基地-成就海报.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      var hint = document.getElementById("share-hint");
      if (hint) hint.hidden = false;
    }
  }

  function run() {
    var main = document.getElementById("achievement-main");
    var errEl = document.getElementById("achievement-error");
    var listEl = document.getElementById("achievement-exhibit-list");
    var encouragementEl = document.getElementById("achievement-encouragement");
    var progressFillEl = document.getElementById("achievement-progress-fill");
    var progressTextEl = document.getElementById("achievement-progress-text");

    loadLocations()
      .then(function () {
        if (!window.wxQuizStorage) throw new Error("成就模块未加载");

        var state = window.wxQuizStorage.getState(LOCATIONS);
        var grandMax = window.wxQuizStorage.grandMaxScore(LOCATIONS);
        if (grandMax < 1) grandMax = 16;

        var c = window.wxQuizStorage.countCompletedWithQuiz(LOCATIONS);

        document.getElementById("stat-completed").textContent =
          c.done + "/" + c.withQuiz;
        document.getElementById("stat-score").textContent =
          state.totalScore + "/" + grandMax;
        document.getElementById("stat-title").textContent =
          state.title || "继续加油，完成全部展点问答";

        // 为称号添加勋章图标（如果已获取称号）
        var titleEl = document.getElementById("stat-title");
        if (state.title && state.title.indexOf("红色传承人") !== -1) {
          titleEl.innerHTML = '<span class="medal-icon">🏆</span> ' + state.title;
        } else if (state.totalScore >= 12 && state.title) {
          titleEl.innerHTML = '<span class="medal-icon">🎖️</span> ' + state.title;
        }

        // 设置鼓励文案
        if (encouragementEl) {
          encouragementEl.textContent = getEncouragementText(state.totalScore, grandMax);
        }

        // 设置进度条
        if (progressFillEl && progressTextEl) {
          var percentage = Math.round((state.totalScore / grandMax) * 100);
          setTimeout(function() {
            progressFillEl.style.width = percentage + "%";
            progressTextEl.textContent = percentage + "%";
          }, 300);
        }

        renderExhibitList(listEl, state);

        if (main) main.hidden = false;
        if (errEl) errEl.hidden = true;

        var btn = document.getElementById("btn-share-poster");
        if (btn) {
          btn.addEventListener("click", downloadPoster);
        }
      })
      .catch(function (e) {
        if (errEl) {
          errEl.textContent =
            (e && e.message) ||
            "加载失败，请使用本地服务器打开本项目后重试。";
          errEl.hidden = false;
        }
        if (main) main.hidden = true;
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
