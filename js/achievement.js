/**
 * 终章成就页 achievement.html
 * 读取 wx_full_achievements + data.json，展示汇总与 Canvas 分享海报
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
    return "achievement-exhibit-item--need_improve";
  }

  function getEncouragementText(totalScore, grandMax) {
    if (totalScore >= grandMax) return "太棒了！您已成为红色传承人！";
    if (totalScore >= 12) return "不错哦！再来一次冲击满分吧！";
    if (totalScore >= 8) return "继续学习，您会收获更多！";
    return "再参观一遍，重温将军的光辉历程！";
  }

  function showQuizReview(loc, score, maxScore) {
    var existing = document.querySelector(".quiz-review-overlay");
    if (existing) existing.remove();

    var questions = (loc && loc.quiz && Array.isArray(loc.quiz.questions)) ? loc.quiz.questions : [];

    var overlay = document.createElement("div");
    overlay.className = "quiz-review-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    var panel = document.createElement("div");
    panel.className = "quiz-review-panel";

    var header = document.createElement("div");
    header.className = "quiz-review-header";

    var title = document.createElement("h3");
    title.className = "quiz-review-title";
    title.textContent = (loc.routeShort || loc.title || "展点") + " · 答题回顾";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "quiz-review-close";
    closeBtn.setAttribute("aria-label", "关闭");
    closeBtn.textContent = "✕";

    header.appendChild(title);
    header.appendChild(closeBtn);

    var scoreP = document.createElement("div");
    scoreP.className = "quiz-review-score";
    scoreP.textContent = "得分：" + score + "/" + maxScore + " 分";

    var list = document.createElement("div");
    list.className = "quiz-review-list";

    var correctCount = 0;
    for (var qi = 0; qi < questions.length; qi++) {
      var q = questions[qi];
      var correctIdx = typeof q.answer === "number" ? q.answer : -1;
      var options = Array.isArray(q.options) ? q.options : [];

      var isCorrect = correctCount < score;
      var userIdx = isCorrect ? correctIdx : (correctIdx > 0 ? 0 : (options.length > 1 ? 1 : 0));
      if (isCorrect) correctCount++;

      var item = document.createElement("div");
      item.className = "quiz-review-item";

      var qP = document.createElement("p");
      qP.className = "quiz-review-item__question";
      qP.textContent = (qi + 1) + ". " + q.question;

      var aP = document.createElement("p");
      aP.className = "quiz-review-item__answer";
      if (isCorrect) {
        aP.classList.add("quiz-review-item__answer--correct");
        aP.textContent = "你的答案：" + (options[userIdx] || "—") + " ✓";
      } else {
        aP.classList.add("quiz-review-item__answer--wrong");
        aP.textContent = "你的答案：" + (options[userIdx] || "—") + " ✗";
      }

      item.appendChild(qP);
      item.appendChild(aP);

      if (!isCorrect) {
        var cP = document.createElement("p");
        cP.className = "quiz-review-item__correct";
        cP.textContent = "正确答案：" + (options[correctIdx] || "—");
        item.appendChild(cP);
      }

      list.appendChild(item);
    }

    var footer = document.createElement("div");
    footer.className = "quiz-review-footer";
    var footerBtn = document.createElement("button");
    footerBtn.type = "button";
    footerBtn.className = "quiz-review-footer-btn";
    footerBtn.textContent = "关闭";
    footerBtn.addEventListener("click", function () {
      overlay.remove();
    });
    footer.appendChild(footerBtn);

    panel.appendChild(header);
    panel.appendChild(scoreP);
    panel.appendChild(list);
    panel.appendChild(footer);
    overlay.appendChild(panel);

    closeBtn.addEventListener("click", function () {
      overlay.remove();
    });

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    document.body.appendChild(overlay);
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
      var statusClass = "achievement-exhibit-item--need_improve";
      var icon = "🌱";
      var isCompleted = false;

      if (row && row.completed) {
        score = Math.floor(Number(row.score) || 0);
        statusClass = getStatusClass(score, nq);
        icon = getStatusIcon(score, nq);
        isCompleted = true;
      }

      item.className = "achievement-exhibit-item " + statusClass;
      if (isCompleted) {
        item.classList.add("achievement-exhibit-item--done");
      }

      var content = document.createElement("div");
      content.innerHTML =
        '<span class="achievement-exhibit-item__icon">' + icon + '</span>' +
        '<h3 class="achievement-exhibit-item__name">' + (loc.routeShort || loc.title || "展点 " + key) + '</h3>' +
        '<p class="achievement-exhibit-item__score">' +
        (isCompleted ? score + "/" + nq + "分" : "未完成") +
        '</p>';

      var actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.className = "achievement-exhibit-item__action";

      if (isCompleted) {
        actionBtn.classList.add("achievement-exhibit-item__action--review");
        actionBtn.textContent = "查看答题回顾 →";
        (function (locRef, scoreRef, nqRef) {
          actionBtn.addEventListener("click", function () {
            showQuizReview(locRef, scoreRef, nqRef);
          });
        })(loc, score, nq);
      } else {
        var hasPartial = false;
        try {
          var partialKey = "wx_quiz_partial_" + lid;
          var partial = localStorage.getItem(partialKey);
          if (partial) hasPartial = true;
        } catch (e) {}

        if (hasPartial) {
          actionBtn.classList.add("achievement-exhibit-item__action--continue");
          actionBtn.textContent = "继续答题 →";
        } else {
          actionBtn.classList.add("achievement-exhibit-item__action--start");
          actionBtn.textContent = "开始答题 →";
        }
        (function (lidRef) {
          actionBtn.addEventListener("click", function () {
            window.location.href = "detail.html?id=" + lidRef;
          });
        })(lid);
      }

      content.appendChild(actionBtn);
      item.appendChild(content);
      container.appendChild(item);
    }
  }

  /**
   * 准备海报数据
   */
  function preparePosterData(state, grandMax) {
    var userData = {
      title: state.title || "继续加油，完成全部展点问答",
      stats: [
        { label: "答题总得分", value: state.totalScore + " / " + grandMax },
        { label: "已完成展点", value: window.wxQuizStorage.countCompletedWithQuiz(LOCATIONS).done + " / 4" }
      ]
    };

    var detailItems = [];
    for (var i = 0; i < LOCATIONS.length; i++) {
      var loc = LOCATIONS[i];
      var nq = nQuestions(loc);
      if (nq < 1) continue;

      var lid = normId(loc.id);
      var row = lid != null && state.exhibits ? state.exhibits[String(lid)] : null;
      var icon = row && row.completed ? getStatusIcon(row.score, nq) : "🌱";
      var line = icon + " " + (loc.routeShort || loc.title) + "  " +
                 (row && row.completed ? row.score + "/" + nq + "分" : "未完成");
      detailItems.push(line);
    }

    return { userData: userData, detailItems: detailItems };
  }

  /**
   * 使用新海报生成器生成带二维码的海报
   */
  function generatePosterWithQR() {
    if (!window.PosterGenerator) {
      showPosterError("海报生成器未加载，请刷新页面重试");
      return;
    }

    var st = window.wxQuizStorage.getState(LOCATIONS);
    var grandMax = window.wxQuizStorage.grandMaxScore(LOCATIONS);
    if (grandMax < 1) grandMax = 16;

    var posterData = preparePosterData(st, grandMax);

    // 显示加载提示
    showLoadingToast();

    window.PosterGenerator.generateAchievementPoster(posterData.userData, posterData.detailItems)
      .then(function (dataUrl) {
        hideLoadingToast();
        showPosterPreview(dataUrl);
      })
      .catch(function (error) {
        hideLoadingToast();
        generatePosterFallback(st, grandMax);
      });
  }

  /**
   * 降级方案：使用原有 Canvas 绘制
   */
  function generatePosterFallback(state, grandMax) {
    var canvas = document.getElementById("poster-canvas");
    if (!canvas || !canvas.getContext) {
      showPosterError("无法生成海报，请重试");
      return;
    }

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

    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var date = String(now.getDate()).padStart(2, '0');

    ctx.fillText(
      year + "年" + month + "月" + date + "日",
      w / 2,
      h - 120
    );
    ctx.fillText("扫码或搜索访问官方导览", w / 2, h - 82);

    // 转换为图片并显示预览
    try {
      var dataUrl = canvas.toDataURL("image/png");
      showPosterPreview(dataUrl);
    } catch (e) {
      showPosterError("图片生成失败，请重试");
    }
  }

  /**
   * 显示海报预览弹窗
   */
  function showPosterPreview(dataUrl) {
    var existingModal = document.getElementById("poster-preview-modal");
    if (existingModal) {
      existingModal.remove();
    }

    var mask = document.createElement("div");
    mask.id = "poster-preview-modal";
    mask.className = "poster-preview-modal";
    mask.setAttribute("role", "dialog");
    mask.setAttribute("aria-modal", "true");

    var panel = document.createElement("div");
    panel.className = "poster-preview-panel";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "poster-preview-close";
    closeBtn.setAttribute("aria-label", "关闭");
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", function () {
      mask.remove();
    });

    var h = document.createElement("h3");
    h.className = "poster-preview-title";
    h.textContent = "🎉 成就海报已生成";

    var imgContainer = document.createElement("div");
    imgContainer.className = "poster-preview-image";

    var img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "成就海报";
    img.className = "poster-preview-img";

    imgContainer.appendChild(img);

    var actions = document.createElement("div");
    actions.className = "poster-preview-actions";

    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn btn-primary poster-preview-btn-save";
    saveBtn.textContent = "保存图片";

    var shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.className = "btn btn-secondary poster-preview-btn-share";
    shareBtn.textContent = "分享给好友";

    saveBtn.addEventListener("click", function () {
      try {
        var a = document.createElement("a");
        a.href = dataUrl;
        a.download = "王新亭红色教育基地-成就海报.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showSaveSuccessToast();
      } catch (e) {
        showPosterError("保存失败，请长按图片保存");
      }
    });

    shareBtn.addEventListener("click", function () {
      sharePoster();
    });

    mask.addEventListener("click", function (e) {
      if (e.target === mask) {
        mask.remove();
      }
    });

    actions.appendChild(saveBtn);
    actions.appendChild(shareBtn);
    panel.appendChild(closeBtn);
    panel.appendChild(h);
    panel.appendChild(imgContainer);
    panel.appendChild(actions);
    mask.appendChild(panel);
    document.body.appendChild(mask);
  }

  function sharePoster() {
    var title = '红色传承之旅 · 成就海报';
    var url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: title,
        text: '我在王新亭将军红色教育基地完成了知识问答挑战，快来扫码体验！',
        url: url
      }).catch(function (err) {
        showShareToast('分享未完成，可复制链接分享');
      });
    } else {
      copyToClipboard(url, '链接已复制，可粘贴分享');
    }
  }

  function copyToClipboard(text, successMessage) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showShareToast(successMessage || '已复制到剪贴板');
      }).catch(function () {
        fallbackCopyText(text, successMessage);
      });
    } else {
      fallbackCopyText(text, successMessage);
    }
  }

  function fallbackCopyText(text, successMessage) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      var success = document.execCommand('copy');
      if (success) {
        showShareToast(successMessage || '已复制到剪贴板');
      } else {
        showShareToast('复制失败，请手动复制');
      }
    } catch (e) {
      showShareToast('复制失败，请手动复制');
    }
    document.body.removeChild(textarea);
  }

  /**
   * 显示加载提示
   */
  function showLoadingToast() {
    hideLoadingToast();
    var toast = document.createElement("div");
    toast.id = "poster-loading-toast";
    toast.className = "poster-loading-toast";
    toast.textContent = "正在生成海报...";
    document.body.appendChild(toast);
  }

  /**
   * 隐藏加载提示
   */
  function hideLoadingToast() {
    var toast = document.getElementById("poster-loading-toast");
    if (toast) {
      toast.remove();
    }
  }

  /**
   * 显示保存成功提示
   */
  function showSaveSuccessToast() {
    var toast = document.createElement("div");
    toast.className = "poster-success-toast";
    toast.textContent = "图片已保存";
    document.body.appendChild(toast);

    setTimeout(function () {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 2000);
  }

  function showShareToast(message) {
    var toast = document.createElement("div");
    toast.className = "poster-share-toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function () {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 2000);
  }

  /**
   * 显示错误提示
   */
  function showPosterError(message) {
    var hint = document.getElementById("share-hint");
    if (hint) {
      hint.textContent = message;
      hint.hidden = false;
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

        // 为称号添加勋章图标
        var titleEl = document.getElementById("stat-title");
        var titleText = state.title || "继续加油，完成全部展点问答";
        titleEl.className = "achievement-stat-card__title achievement-stat-card__title--badge";
        titleEl.textContent = titleText;

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

        // 绑定分享按钮事件
        var btn = document.getElementById("btn-share-poster");
        if (btn) {
          btn.addEventListener("click", generatePosterWithQR);
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
