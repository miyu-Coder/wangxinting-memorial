/**
 * 详情页：从 URL ?id= 读取展点，加载 data/data.json 对应条目；下一展点循环
 */
(function () {
  "use strict";

  /** @type {Array<Object>} */
  var LOCATIONS = [];

  var state = {
    carouselIndex: 0,
  };

  function normId(v) {
    if (v == null || v === "") return NaN;
    var n = parseInt(String(v).trim(), 10);
    return Number.isFinite(n) ? n : NaN;
  }

  /**
   * 从地址栏解析展点 id（兼容 URLSearchParams 异常、hash、整段 href 正则）
   */
  function getCurrentIdFromUrl() {
    var href = "";
    try {
      href = String(window.location.href || "");
      var u = new URL(href);
      var raw = u.searchParams.get("id");
      if (raw != null && String(raw).trim() !== "") {
        var n = parseInt(String(raw).trim(), 10);
        if (Number.isFinite(n) && n >= 1) return n;
      }
    } catch (e) {
      /* 继续走正则 */
    }

    var m =
      /[?&#]id=(\d+)/i.exec(href) ||
      /[?&#]id=(\d+)/i.exec(window.location.search || "") ||
      /[?&#]id=(\d+)/i.exec(window.location.hash || "");
    if (!m) return null;
    var num = parseInt(m[1], 10);
    if (!Number.isFinite(num) || num < 1) return null;
    return num;
  }

  function findLocationById(id) {
    var n = normId(id);
    if (!Number.isFinite(n) || n < 1) return null;
    for (var i = 0; i < LOCATIONS.length; i++) {
      var lid = LOCATIONS[i].id;
      var ln = normId(lid);
      if (ln === n) return LOCATIONS[i];
    }
    return null;
  }

  function findNextLocationCyclic(currentId) {
    var n = normId(currentId);
    var idx = 0;
    for (var i = 0; i < LOCATIONS.length; i++) {
      if (normId(LOCATIONS[i].id) === n) {
        idx = i;
        break;
      }
    }
    var nextIdx = (idx + 1) % LOCATIONS.length;
    return LOCATIONS[nextIdx];
  }

  /** 下一展点跳转：相对路径，强制整页加载并带上正确 id */
  function detailUrlWithId(idNum) {
    if (typeof window.buildDetailHref === "function") {
      return window.buildDetailHref(idNum);
    }
    var n = parseInt(String(idNum), 10);
    if (!Number.isFinite(n) || n < 1) n = 1;
    return "detail.html?id=" + encodeURIComponent(String(n));
  }

  function buildSlides(loc) {
    var imgs = Array.isArray(loc.images)
      ? loc.images.filter(function (u) {
          return u && String(u).trim();
        })
      : [];
    if (imgs.length) {
      return imgs.map(function (src) {
        return { kind: "image", src: String(src).trim() };
      });
    }
    var labels = Array.isArray(loc.placeholderLabels)
      ? loc.placeholderLabels.filter(function (t) {
          return t && String(t).trim();
        })
      : [];
    return labels.map(function (label) {
      return { kind: "placeholder", label: String(label).trim() };
    });
  }

  function loadData() {
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
        if (!LOCATIONS.length) throw new Error("地点数据为空");
      });
  }

  function loadLocationData(id) {
    return findLocationById(id);
  }

  function setAudioButtonPlaying(playing) {
    var btn = document.getElementById("btn-audio-toggle");
    if (!btn) return;
    btn.textContent = playing ? "暂停讲解" : "播放讲解";
    btn.setAttribute("aria-pressed", playing ? "true" : "false");
  }

  function setupAudio(loc) {
    var audio = document.getElementById("detail-audio");
    var btn = document.getElementById("btn-audio-toggle");
    var hint = document.getElementById("audio-hint");
    if (!audio || !btn) return;

    audio.pause();
    audio.removeAttribute("src");
    audio.load();

    var src = loc.audio && String(loc.audio).trim();
    if (src) {
      audio.src = src;
      btn.disabled = false;
      if (hint) {
        hint.hidden = false;
        hint.textContent =
          "受浏览器策略影响，语音可能需手动点击播放。参观时请佩戴耳机，勿外放干扰他人。";
      }
    } else {
      btn.disabled = true;
      setAudioButtonPlaying(false);
      if (hint) {
        hint.hidden = false;
        hint.textContent = "本展点暂无音频资源。";
      }
    }

    btn.onclick = function () {
      if (btn.disabled) return;
      if (audio.paused) {
        var p = audio.play();
        if (p && typeof p.catch === "function") {
          p.catch(function () {
            if (hint) {
              hint.textContent =
                "无法播放：请确认使用 http(s) 访问，且音频路径正确。";
            }
          });
        }
      } else {
        audio.pause();
      }
    };

    audio.onplay = function () {
      setAudioButtonPlaying(true);
    };
    audio.onpause = function () {
      setAudioButtonPlaying(false);
    };
    audio.onended = function () {
      setAudioButtonPlaying(false);
    };

    setAudioButtonPlaying(false);
  }

  function setupVideo(loc) {
    var block = document.getElementById("block-video");
    var video = document.getElementById("detail-video");
    var cap = document.getElementById("video-caption");
    if (!block || !video) return;

    var v = loc.video && String(loc.video).trim();
    if (!v) {
      block.hidden = true;
      video.removeAttribute("src");
      video.load();
      if (cap) cap.textContent = "";
      return;
    }

    block.hidden = false;
    video.src = v;
    if (cap) {
      cap.textContent = loc.videoCaption ? String(loc.videoCaption) : "";
    }
  }

  function renderCarousel(loc) {
    var slides = buildSlides(loc);

    var carousel = document.getElementById("detail-carousel");
    var empty = document.getElementById("carousel-empty");
    var imgEl = document.getElementById("carousel-image");
    var phEl = document.getElementById("carousel-placeholder-slide");
    var phText = document.getElementById("carousel-placeholder-text");
    var dots = document.getElementById("carousel-dots");
    var prev = document.getElementById("carousel-prev");
    var next = document.getElementById("carousel-next");
    var viewport = document.getElementById("carousel-viewport");

    if (!slides.length) {
      if (carousel) carousel.hidden = true;
      if (empty) empty.hidden = false;
      if (imgEl) imgEl.hidden = true;
      if (phEl) phEl.hidden = true;
      return;
    }

    if (empty) empty.hidden = true;
    if (carousel) carousel.hidden = false;

    function paintDots() {
      if (!dots) return;
      dots.innerHTML = "";
      for (var j = 0; j < slides.length; j++) {
        (function (jj) {
          var b = document.createElement("button");
          b.type = "button";
          b.className =
            "carousel-dot" + (jj === state.carouselIndex ? " is-active" : "");
          b.setAttribute("aria-label", "第 " + (jj + 1) + " 张");
          b.addEventListener("click", function () {
            showAt(jj);
          });
          dots.appendChild(b);
        })(j);
      }
    }

    function showAt(i) {
      state.carouselIndex =
        ((i % slides.length) + slides.length) % slides.length;
      var s = slides[state.carouselIndex];
      if (s.kind === "image" && imgEl && phEl) {
        imgEl.hidden = false;
        phEl.hidden = true;
        imgEl.src = s.src;
        imgEl.alt = loc.title + " — 配图 " + (state.carouselIndex + 1);
      } else if (s.kind === "placeholder" && imgEl && phEl && phText) {
        imgEl.hidden = true;
        imgEl.removeAttribute("src");
        imgEl.removeAttribute("alt");
        phEl.hidden = false;
        phText.textContent = s.label || "图片占位";
      }
      paintDots();
    }

    if (prev) {
      prev.onclick = function () {
        showAt(state.carouselIndex - 1);
      };
    }
    if (next) {
      next.onclick = function () {
        showAt(state.carouselIndex + 1);
      };
    }

    var x0 = null;
    if (viewport) {
      viewport.addEventListener(
        "touchstart",
        function (e) {
          x0 = e.touches[0].clientX;
        },
        { passive: true }
      );
      viewport.addEventListener(
        "touchend",
        function (e) {
          if (x0 === null) return;
          var x1 = e.changedTouches[0].clientX;
          var dx = x1 - x0;
          x0 = null;
          if (dx > 48) showAt(state.carouselIndex - 1);
          else if (dx < -48) showAt(state.carouselIndex + 1);
        },
        { passive: true }
      );
    }

    state.carouselIndex = 0;
    showAt(0);

    var single = slides.length <= 1;
    if (prev) {
      prev.disabled = single;
      prev.style.opacity = single ? "0.4" : "1";
    }
    if (next) {
      next.disabled = single;
      next.style.opacity = single ? "0.4" : "1";
    }
  }

  function renderRouteStrip(loc) {
    var strip = document.getElementById("detail-route-strip");
    if (!strip || typeof window.renderExhibitTimeline !== "function") return;
    window.renderExhibitTimeline(strip, LOCATIONS, normId(loc.id));
  }

  function updateAchievementLines(loc) {
    var globalEl = document.getElementById("detail-global-progress");
    var badgeEl = document.getElementById("detail-exhibit-quiz-badge");
    var inQuizStatus = document.getElementById("quiz-exhibit-status");
    var st = window.wxQuizStorage;
    var totalQ =
      loc && loc.quiz && Array.isArray(loc.quiz.questions)
        ? loc.quiz.questions.length
        : 0;

    if (st && globalEl) {
      globalEl.textContent = st.formatGlobalProgressLine(LOCATIONS);
      globalEl.hidden = false;
    } else if (globalEl) {
      globalEl.hidden = true;
    }

    var statusText =
      st && totalQ > 0
        ? st.formatExhibitQuizStatus(normId(loc.id), totalQ, LOCATIONS)
        : "";
    if (badgeEl) {
      if (statusText) {
        badgeEl.textContent = statusText;
        badgeEl.hidden = false;
      } else {
        badgeEl.textContent = "";
        badgeEl.hidden = true;
      }
    }
    if (inQuizStatus) {
      inQuizStatus.textContent = statusText;
    }
  }

  /** 评语：与答题结束时写入 localStorage 的文案一致 */
  function quizCommentForScore(correct, total) {
    if (correct >= total && total > 0) {
      return "⭐ 太棒了！你对王新亭将军非常了解！";
    }
    if (correct === total - 1 && total >= 2) {
      return "👍 不错哦，再复习一下会更棒！";
    }
    if (correct >= 2) {
      return "📚 还可以，继续学习吧！";
    }
    return "🌱 刚起步，再参观一遍会有收获！";
  }

  /**
   * 全部展点答完后引导至终章（遮罩 + 操作）
   */
  function showAchievementEntranceModal() {
    if (document.getElementById("wx-quiz-celebration-modal")) return;
    var mask = document.createElement("div");
    mask.id = "wx-quiz-celebration-modal";
    mask.className = "quiz-celebration-modal";
    mask.setAttribute("role", "dialog");
    mask.setAttribute("aria-modal", "true");
    mask.setAttribute("aria-labelledby", "wx-modal-title");

    var panel = document.createElement("div");
    panel.className = "quiz-celebration-modal__panel";

    var h = document.createElement("h3");
    h.id = "wx-modal-title";
    h.className = "quiz-celebration-modal__title";
    h.textContent = "🎊 恭喜完成全部展点问答！";

    var p = document.createElement("p");
    p.className = "quiz-celebration-modal__text";
    p.textContent =
      "您已走完四站知识问答，前往「红色传承之旅」查看总成就、生成分享海报。";

    var row = document.createElement("div");
    row.className = "quiz-celebration-modal__actions";

    var go = document.createElement("a");
    go.className = "btn btn-primary";
    go.href = "achievement.html";
    go.textContent = "前往终章页";

    var later = document.createElement("button");
    later.type = "button";
    later.className = "btn btn-secondary";
    later.textContent = "稍后再说";
    later.addEventListener("click", function () {
      mask.remove();
    });

    row.appendChild(go);
    row.appendChild(later);
    panel.appendChild(h);
    panel.appendChild(p);
    panel.appendChild(row);
    mask.appendChild(panel);
    document.body.appendChild(mask);
  }

  /**
   * 已锁定：成就回顾卡片（不可再答）
   */
  function renderQuizRecap(loc, rec, root) {
    root.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "quiz-recap-card";

    var done = document.createElement("p");
    done.className = "quiz-recap-card__done";
    done.textContent = "🎉 本展点已完成";

    var scoreP = document.createElement("p");
    scoreP.className = "quiz-recap-card__score";
    scoreP.textContent =
      "您的得分：" + rec.score + "/" + (rec.maxScore || 4) + " 分";

    var comment = document.createElement("p");
    comment.className = "quiz-recap-card__comment";
    var txt =
      rec.comment && String(rec.comment).trim()
        ? rec.comment
        : quizCommentForScore(rec.score, rec.maxScore || 4);
    comment.textContent = "获得的评语：" + txt;

    var actions = document.createElement("div");
    actions.className = "quiz-recap-card__actions";
    var btn = document.createElement("a");
    btn.className = "btn btn-primary quiz-recap-card__cta";
    btn.href = "achievement.html";
    btn.textContent = "查看总成就";
    actions.appendChild(btn);

    wrap.appendChild(done);
    wrap.appendChild(scoreP);
    wrap.appendChild(comment);
    wrap.appendChild(actions);
    root.appendChild(wrap);
  }

  /**
   * 知识问答：每展点仅一次作答；未完成时展示答题卡，已完成时展示回顾卡
   */
  function setupQuiz(loc) {
    var block = document.getElementById("block-quiz");
    var root = document.getElementById("quiz-root");
    if (!block || !root) return;

    var questions =
      loc && loc.quiz && Array.isArray(loc.quiz.questions) ? loc.quiz.questions : [];
    if (!questions.length) {
      block.hidden = true;
      root.innerHTML = "";
      return;
    }

    block.hidden = false;
    var exhibitId = normId(loc.id);
    var total = questions.length;
    var st = window.wxQuizStorage;

    var existing =
      st && typeof st.getExhibitRecord === "function"
        ? st.getExhibitRecord(exhibitId, LOCATIONS)
        : { completed: false };

    if (existing.completed) {
      renderQuizRecap(loc, existing, root);
      return;
    }

    var state = { idx: 0, correct: 0, picked: false };
    /** 最后一题作答后立即写入，防止刷新页面重复刷分 */
    var lastLockResult = { ok: false, allExhibitsComplete: false };

    /** 仅展示结果页（得分已在最后一题选项点击时锁定） */
    function showFinalResultPanel() {
      var comment = quizCommentForScore(state.correct, total);
      root.innerHTML = "";
      var wrap = document.createElement("div");
      wrap.className = "quiz-result quiz-result--final";

      var scoreEl = document.createElement("p");
      scoreEl.className = "quiz-result__score";
      scoreEl.textContent = "✅ 成绩已封存 · " + state.correct + " / " + total + " 分";

      var msg = document.createElement("p");
      msg.className = "quiz-result__comment";
      msg.textContent = comment;

      wrap.appendChild(scoreEl);
      wrap.appendChild(msg);

      if (st && st.isHeritageUnlocked(LOCATIONS)) {
        var heritage = document.createElement("p");
        heritage.className = "quiz-result__heritage";
        heritage.textContent = "🏅 累计满分 · 「红色传承人」";
        wrap.appendChild(heritage);
      }

      var btnRow = document.createElement("div");
      btnRow.className = "quiz-result__actions quiz-result__actions--stack";

      var toAch = document.createElement("a");
      toAch.className = "btn btn-primary";
      toAch.href = "achievement.html";
      toAch.textContent = "查看总成就";
      btnRow.appendChild(toAch);

      wrap.appendChild(btnRow);
      root.appendChild(wrap);

      if (lastLockResult.allExhibitsComplete) {
        showAchievementEntranceModal();
      }
    }

    function renderQuestion() {
      root.innerHTML = "";
      var q = questions[state.idx];
      if (!q) return;

      var card = document.createElement("div");
      card.className = "quiz-card";

      /* —— 氛围区：当前展点 + 全站展点完成进度 —— */
      var ambient = document.createElement("div");
      ambient.className = "quiz-ambient";
      var lineA = document.createElement("p");
      lineA.className = "quiz-ambient__line";
      lineA.textContent = "⭐ 当前展点：" + (loc.title || "展点");
      var lineB = document.createElement("p");
      lineB.className = "quiz-ambient__line quiz-ambient__line--sub";
      lineB.textContent =
        "📊 展点完成进度（" +
        (st && st.formatExhibitProgressFraction
          ? st.formatExhibitProgressFraction(LOCATIONS)
          : "?/4") +
        "）";
      ambient.appendChild(lineA);
      ambient.appendChild(lineB);
      card.appendChild(ambient);

      var progressTop = document.createElement("div");
      progressTop.className = "quiz-progress-meta";
      progressTop.textContent =
        "第 " + (state.idx + 1) + " / " + total + " 题";

      var barWrap = document.createElement("div");
      barWrap.className = "quiz-progress";
      barWrap.setAttribute("role", "progressbar");
      barWrap.setAttribute("aria-valuemin", "0");
      barWrap.setAttribute("aria-valuemax", String(total));
      barWrap.setAttribute("aria-valuenow", String(state.idx));
      var barFill = document.createElement("div");
      barFill.className = "quiz-progress__fill";
      barFill.style.width = (100 * state.idx) / total + "%";
      barWrap.appendChild(barFill);

      var qText = document.createElement("p");
      qText.className = "quiz-question";
      qText.textContent = q.question || "";

      var optsHost = document.createElement("div");
      optsHost.className = "quiz-options";

      var feedback = document.createElement("p");
      feedback.className = "quiz-feedback";
      feedback.setAttribute("aria-live", "polite");
      feedback.hidden = true;

      var medal = document.createElement("div");
      medal.className = "quiz-score-medal";
      medal.textContent = "🏆 当前得分：" + state.correct + "/" + total;

      var nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "btn btn-primary quiz-next-btn";
      nextBtn.hidden = true;
      nextBtn.textContent =
        state.idx >= total - 1 ? "查看结果" : "下一题";

      var correctIndex = parseInt(String(q.answer), 10);
      if (!Number.isFinite(correctIndex)) correctIndex = 0;

      var optionBtns = [];

      function bumpOption(btn) {
        btn.classList.remove("quiz-option--pop");
        void btn.offsetWidth;
        btn.classList.add("quiz-option--pop");
        window.setTimeout(function () {
          btn.classList.remove("quiz-option--pop");
        }, 420);
      }

      function applyPick(choiceIndex) {
        if (state.picked) return;
        state.picked = true;
        var btn = optionBtns[choiceIndex];
        if (btn) bumpOption(btn);

        var isCorrect = choiceIndex === correctIndex;
        if (isCorrect) {
          state.correct++;
          optionBtns[choiceIndex].classList.add("quiz-option--correct");
          feedback.textContent = "✅ 回答正确！";
          feedback.className = "quiz-feedback quiz-feedback--ok";
        } else {
          optionBtns[choiceIndex].classList.add("quiz-option--wrong");
          if (optionBtns[correctIndex]) {
            optionBtns[correctIndex].classList.add("quiz-option--correct");
          }
          feedback.textContent = "❌ 回答错误";
          feedback.className = "quiz-feedback quiz-feedback--bad";
        }
        medal.textContent = "🏆 当前得分：" + state.correct + "/" + total;
        feedback.hidden = false;
        barFill.style.width = (100 * (state.idx + 1)) / total + "%";
        barWrap.setAttribute("aria-valuenow", String(state.idx + 1));
        for (var d = 0; d < optionBtns.length; d++) {
          optionBtns[d].disabled = true;
        }
        nextBtn.hidden = false;

        /* 最后一题：立即锁定存储，避免用户在未点「查看结果」前刷新重答 */
        if (state.idx === total - 1 && st && typeof st.lockExhibitQuiz === "function") {
          var cmt = quizCommentForScore(state.correct, total);
          lastLockResult = st.lockExhibitQuiz(
            exhibitId,
            state.correct,
            total,
            cmt,
            LOCATIONS
          );
          updateAchievementLines(loc);
          if (lastLockResult.allExhibitsComplete) {
            showAchievementEntranceModal();
          }
        }
      }

      var options = Array.isArray(q.options) ? q.options : [];
      for (var oi = 0; oi < options.length; oi++) {
        (function (idx) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "quiz-option";
          b.textContent = options[idx];
          b.addEventListener("click", function () {
            applyPick(idx);
          });
          optionBtns.push(b);
          optsHost.appendChild(b);
        })(oi);
      }

      nextBtn.addEventListener("click", function () {
        if (!state.picked) return;
        if (state.idx >= total - 1) {
          showFinalResultPanel();
          return;
        }
        state.idx++;
        state.picked = false;
        renderQuestion();
      });

      card.appendChild(progressTop);
      card.appendChild(barWrap);
      card.appendChild(qText);
      card.appendChild(optsHost);
      card.appendChild(feedback);
      card.appendChild(medal);
      card.appendChild(nextBtn);
      root.appendChild(card);
    }

    renderQuestion();
  }

  function updatePageContent(loc) {
    try {
      sessionStorage.setItem("wx_current_stop", String(normId(loc.id)));
    } catch (e) {}

    var titleEl = document.getElementById("detail-page-title");
    var subEl = document.getElementById("detail-subtitle");
    var textEl = document.getElementById("detail-text");

    if (titleEl) titleEl.textContent = loc.title || "";
    document.title = (loc.title || "展点讲解") + " · 王新亭将军红色教育基地";

    var curNum = normId(loc.id);
    var total = LOCATIONS.length;
    if (subEl) {
      subEl.textContent =
        "展点 " + curNum + " / 共 " + total + " 处 · 下一展点按动线循环";
    }
    if (textEl) {
      textEl.textContent = loc.text || "";
    }

    renderRouteStrip(loc);
    renderCarousel(loc);
    setupAudio(loc);
    setupVideo(loc);
    updateAchievementLines(loc);
    setupQuiz(loc);

    var btnNext = document.getElementById("btn-next-location");
    var nextLoc = findNextLocationCyclic(loc.id);
    if (btnNext && nextLoc) {
      btnNext.disabled = false;
      var nextNum = normId(nextLoc.id);
      var nextTitle = nextLoc.title || "下一展点";
      btnNext.textContent = "下一展点：" + nextTitle;
      btnNext.setAttribute("aria-label", "前往下一展点：" + nextTitle);
      btnNext.onclick = function () {
        window.location.assign(detailUrlWithId(nextNum));
      };
    }

    var main = document.getElementById("detail-main");
    if (main) main.hidden = false;
  }

  function setRetryVisible(visible) {
    var retryWrap = document.getElementById("detail-retry-wrap");
    if (!retryWrap) return;
    if (visible) retryWrap.classList.add("is-visible");
    else retryWrap.classList.remove("is-visible");
  }

  function showError(msg) {
    var err = document.getElementById("detail-error");
    var sub = document.getElementById("detail-subtitle");
    var main = document.getElementById("detail-main");
    if (err) {
      err.textContent = msg;
      err.hidden = false;
    }
    if (sub) sub.textContent = "加载失败";
    setRetryVisible(true);
    if (main) main.hidden = true;
  }

  function run() {
    var errEl = document.getElementById("detail-error");
    var main = document.getElementById("detail-main");
    if (errEl) errEl.hidden = true;
    setRetryVisible(false);
    if (main) main.hidden = true;

    var sub = document.getElementById("detail-subtitle");
    if (sub) sub.textContent = "加载中…";

    loadData()
      .then(function () {
        var requestedId = getCurrentIdFromUrl();
        var loc =
          requestedId != null ? loadLocationData(requestedId) : null;

        if (!loc) {
          loc = LOCATIONS[0];
          if (window.history && window.history.replaceState) {
            try {
              var u = new URL(window.location.href);
              u.searchParams.set("id", String(normId(loc.id)));
              u.hash = "";
              window.history.replaceState(null, "", u.pathname + u.search);
            } catch (e3) {
              window.history.replaceState(
                null,
                "",
                "detail.html?id=" +
                  encodeURIComponent(String(normId(loc.id)))
              );
            }
          }
        }

        setRetryVisible(false);
        updatePageContent(loc);
      })
      .catch(function (e) {
        var extra = e && e.message ? e.message : "";
        showError(
          "无法读取 data/data.json。请使用本地静态服务器或部署后再访问，勿直接用 file:// 打开。" +
            (extra ? "（" + extra + "）" : "")
        );
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("btn-retry-load");
    if (btn) btn.addEventListener("click", run);
    run();
  });
})();
