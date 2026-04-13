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

  var detailAudioPlayer = null;

  function destroyDetailAudioPlayer() {
    if (detailAudioPlayer && typeof detailAudioPlayer.destroy === "function") {
      detailAudioPlayer.destroy();
    }
    detailAudioPlayer = null;
  }

  function canUseHtmlAudio() {
    if (typeof HTMLAudioElement === "undefined") return false;
    try {
      var a = document.createElement("audio");
      return a instanceof HTMLAudioElement && typeof a.play === "function";
    } catch (e) {
      return false;
    }
  }

  /**
   * none：无音频（隐藏整块）；pending：占位文案；url：播放地址
   */
  function resolveAudioForLocation(loc) {
    if (loc && loc.audioPending === true) return { kind: "pending" };
    var raw = loc ? loc.audio : null;
    if (raw === "pending" || raw === "__pending__") return { kind: "pending" };
    var s = raw != null ? String(raw).trim() : "";
    if (s === "" || s === "-") return { kind: "none" };
    return { kind: "url", url: s };
  }

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

  function setupAudio(loc) {
    destroyDetailAudioPlayer();

    var block = document.getElementById("block-detail-audio");
    var unsupported = document.getElementById("detail-audio-unsupported");
    var coming = document.getElementById("detail-audio-coming");
    var wrap = document.getElementById("detail-audio-player-wrap");
    var loadMsg = document.getElementById("detail-audio-load-msg");
    var hintSoft = document.getElementById("detail-audio-hint-soft");
    var audio = document.getElementById("detail-audio");

    if (!block || !audio) return;

    function hidePanels() {
      if (unsupported) unsupported.hidden = true;
      if (coming) coming.hidden = true;
      if (wrap) wrap.hidden = true;
      if (loadMsg) loadMsg.hidden = true;
    }

    hidePanels();
    block.hidden = true;

    if (!canUseHtmlAudio()) {
      block.hidden = false;
      if (unsupported) unsupported.hidden = false;
      return;
    }

    var meta = resolveAudioForLocation(loc);
    if (meta.kind === "none") {
      return;
    }

    block.hidden = false;

    if (meta.kind === "pending") {
      if (coming) coming.hidden = false;
      return;
    }

    if (wrap) wrap.hidden = false;
    if (hintSoft) hintSoft.hidden = false;
    if (loadMsg) loadMsg.hidden = true;

    var els = {
      playBtn: document.getElementById("detail-audio-play"),
      seekRange: document.getElementById("detail-audio-seek"),
      fill: document.getElementById("detail-audio-seek-fill"),
      timeCur: document.getElementById("detail-audio-time-curr"),
      timeDur: document.getElementById("detail-audio-time-dur"),
      muteBtn: document.getElementById("detail-audio-mute"),
      volRange: document.getElementById("detail-audio-vol"),
      rateBtn: document.getElementById("detail-audio-rate"),
      loadMsg: loadMsg,
    };

    if (typeof window.WxDetailAudioPlayer !== "function") {
      if (unsupported) {
        unsupported.textContent = "音频模块未加载";
        unsupported.hidden = false;
        if (wrap) wrap.hidden = true;
      }
      return;
    }

    detailAudioPlayer = new window.WxDetailAudioPlayer({
      audioEl: audio,
      els: els,
      onPlaybackError: function () {
        if (loadMsg) {
          loadMsg.hidden = false;
          loadMsg.textContent = "\u97F3\u9891\u6682\u65F6\u65E0\u6CD5\u64AD\u653E";
        }
        if (hintSoft) hintSoft.hidden = true;
      },
    });

    detailAudioPlayer.resetTransport();
    detailAudioPlayer.loadUrl(meta.url);
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
        imgEl.classList.add("lazy-image");
        imgEl.classList.remove("lazy-loaded");
        imgEl.removeAttribute("src");
        imgEl.setAttribute("data-src", s.src);
        imgEl.setAttribute("loading", "lazy");
        imgEl.alt = loc.title + " — 配图 " + (state.carouselIndex + 1);
        if (
          window.wxLazyLoadInstance &&
          typeof window.wxLazyLoadInstance.loadImage === "function"
        ) {
          window.wxLazyLoadInstance.loadImage(imgEl);
        } else {
          imgEl.src = s.src;
          imgEl.classList.remove("lazy-image");
          imgEl.classList.add("lazy-loaded");
          imgEl.removeAttribute("data-src");
        }
      } else if (s.kind === "placeholder" && imgEl && phEl && phText) {
        imgEl.hidden = true;
        imgEl.removeAttribute("src");
        imgEl.removeAttribute("data-src");
        imgEl.removeAttribute("alt");
        imgEl.classList.remove("lazy-image", "lazy-loaded");
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

  /**
   * 渲染顶部进度条（替代原参观动线卡片）
   * 格式：📍 展点 X/4 · 展点1 → 展点2 → 展点3 → 展点4
   */
  function renderProgressBar(loc) {
    var progressBar = document.getElementById("detail-progress-bar");
    if (!progressBar) return;

    var currentIndex = -1;
    var currentId = normId(loc.id);

    // 找到当前展点的索引
    for (var i = 0; i < LOCATIONS.length; i++) {
      if (normId(LOCATIONS[i].id) === currentId) {
        currentIndex = i;
        break;
      }
    }

    var total = LOCATIONS.length;

    // 构建进度条 HTML
    var html = '<div class="detail-progress-bar__content">';

    // 左侧：展点计数
    html += '<span class="detail-progress-bar__counter">📍 展点 ' + (currentIndex + 1) + '/' + total + '</span>';

    // 右侧：展点名称列表
    html += '<span class="detail-progress-bar__locations">';

    for (var i = 0; i < LOCATIONS.length; i++) {
      var isCurrent = (i === currentIndex);
      var location = LOCATIONS[i];
      var locId = normId(location.id);
      var locTitle = location.title || ('展点' + locId);

      // 添加展点链接
      if (isCurrent) {
        html += '<span class="detail-progress-bar__location detail-progress-bar__location--current">' + locTitle + '</span>';
      } else {
        html += '<a class="detail-progress-bar__location" href="' + detailUrlWithId(locId) + '">' + locTitle + '</a>';
      }

      // 如果不是最后一个，添加箭头
      if (i < LOCATIONS.length - 1) {
        html += '<span class="detail-progress-bar__arrow">→</span>';
      }
    }

    html += '</span></div>';

    progressBar.innerHTML = html;
  }

  /**
   * 渲染底部导航按钮（上一展点/下一展点）
   */
  function renderNavButtons(loc) {
    var btnPrev = document.getElementById("btn-prev-location");
    var btnNext = document.getElementById("btn-next-location");
    if (!btnPrev || !btnNext) return;

    var currentIndex = -1;
    var currentId = normId(loc.id);

    // 找到当前展点的索引
    for (var i = 0; i < LOCATIONS.length; i++) {
      if (normId(LOCATIONS[i].id) === currentId) {
        currentIndex = i;
        break;
      }
    }

    // 设置上一展点按钮
    if (currentIndex <= 0) {
      // 第一个展点：置灰不可点击
      btnPrev.disabled = true;
      btnPrev.classList.add("btn-nav--disabled");
      btnPrev.removeAttribute("onclick");
    } else {
      var prevLoc = LOCATIONS[currentIndex - 1];
      var prevId = normId(prevLoc.id);
      btnPrev.disabled = false;
      btnPrev.classList.remove("btn-nav--disabled");
      btnPrev.onclick = function () {
        window.location.assign(detailUrlWithId(prevId));
      };
    }

    // 设置下一展点按钮
    if (currentIndex >= LOCATIONS.length - 1) {
      // 最后一个展点：置灰不可点击
      btnNext.disabled = true;
      btnNext.classList.add("btn-nav--disabled");
      btnNext.removeAttribute("onclick");
    } else {
      var nextLoc = LOCATIONS[currentIndex + 1];
      var nextId = normId(nextLoc.id);
      btnNext.disabled = false;
      btnNext.classList.remove("btn-nav--disabled");
      btnNext.onclick = function () {
        window.location.assign(detailUrlWithId(nextId));
      };
    }
  }

  /**
   * 原有函数保留用于向后兼容，但内部调用新的渲染函数
   */
  function renderRouteStrip(loc) {
    renderProgressBar(loc);
    renderNavButtons(loc);
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
   * 打卡功能：设置打卡区域
   */
  function setupCheckin(loc) {
    var container = document.getElementById("checkin-container");
    if (!container || !window.wxCheckin) return;

    var exhibitId = normId(loc.id);
    if (!exhibitId) return;

    var isChecked = window.wxCheckin.isChecked(exhibitId);
    var checkTime = window.wxCheckin.getCheckTime(exhibitId);
    var totalChecked = window.wxCheckin.getTotalChecked();
    var isCertificateUnlocked = window.wxCheckin.isCertificateUnlocked();

    if (isChecked) {
      // 已打卡状态
      container.innerHTML =
        '<div class="checkin-header">' +
        '  <h3 class="checkin-title checkin-title--checked">✅ 已打卡留念</h3>' +
        '</div>' +
        '<div class="checkin-info">' +
        '  <p class="checkin-message">🎉 感谢您的参观！</p>' +
        '  <p class="checkin-time">' + (checkTime ? '打卡时间：' + window.wxCheckin.formatTime(checkTime) : '') + '</p>' +
        '</div>' +
        '<div class="checkin-progress-inline">' +
        '  <div class="checkin-progress-wrapper">' +
        '    <div class="checkin-progress-bar">' +
        '      <div class="checkin-progress-fill" style="width: ' + (totalChecked / 4 * 100) + '%"></div>' +
        '    </div>' +
        '    <span class="checkin-progress-text">打卡进度：' + totalChecked + '/4</span>' +
        '  </div>';

      // 如果集齐了四个展点，添加查看证书按钮
      if (isCertificateUnlocked) {
        container.innerHTML +=
          '  <a class="btn btn-primary btn-sm checkin-certificate-btn" href="certificate.html">' +
          '    查看我的纪念证书 ❯' +
          '  </a>' +
          '</div>';
      } else {
        container.innerHTML += '</div>';
      }
    } else {
      // 未打卡状态
      container.innerHTML =
        '<div class="checkin-header">' +
        '  <h3 class="checkin-title">📍 参观打卡</h3>' +
        '</div>' +
        '<div class="checkin-info">' +
        '  <p class="checkin-message">在这里留下您的足迹，集齐四个展点解锁纪念证书！</p>' +
        '</div>' +
        '<div class="checkin-progress-inline">' +
        '  <div class="checkin-progress-wrapper">' +
        '    <div class="checkin-progress-bar">' +
        '      <div class="checkin-progress-fill" style="width: ' + (totalChecked / 4 * 100) + '%"></div>' +
        '    </div>' +
        '    <span class="checkin-progress-text">当前进度：' + totalChecked + '/4</span>' +
        '  </div>' +
        '</div>' +
        '<button type="button" class="checkin-btn" id="btn-checkin">' +
        '  <span class="checkin-btn-icon">🏆</span> 打卡留念' +
        '</button>';

      // 绑定打卡按钮事件
      var btn = document.getElementById("btn-checkin");
      if (btn) {
        btn.addEventListener("click", function() {
          onCheckinClick(exhibitId, loc.title);
        });
      }
    }
  }

  /**
   * 打卡按钮点击处理
   */
  function onCheckinClick(exhibitId, exhibitTitle) {
    var btn = document.getElementById("btn-checkin");
    if (!btn || !window.wxCheckin) return;

    // 添加点击动画
    btn.classList.add("checkin-shake-animation");

    setTimeout(function() {
      btn.classList.remove("checkin-shake-animation");

      var result = window.wxCheckin.checkIn(exhibitId);

      if (result.success) {
        // 打卡成功动画
        btn.classList.add("checkin-success-animation");

        // 添加成功提示
        var container = document.getElementById("checkin-container");
        var successMsg = document.createElement("div");
        successMsg.className = "checkin-checkin-time";
        successMsg.textContent = "🎉 打卡成功！";
        successMsg.style.color = "#4CAF50";
        successMsg.style.textAlign = "center";
        successMsg.style.marginBottom = "12px";
        successMsg.style.animation = "fadeInDown 0.3s ease-out";

        container.insertBefore(successMsg, btn);

        // 1秒后刷新打卡状态
        setTimeout(function() {
          setupCheckin({ id: exhibitId, title: exhibitTitle });

          // 如果是集齐四个展点，显示解锁弹窗
          if (result.firstCompletion) {
            showCheckinCompletionModal();
          }
        }, 1000);
      } else if (result.alreadyChecked) {
        // 已经打过卡，刷新状态
        setupCheckin({ id: exhibitId, title: exhibitTitle });
      }
    }, 500);
  }

  /**
   * 显示答题Toast提示
   */
  function showQuizToast(message) {
    // 移除已有的toast
    var existingToast = document.querySelector(".quiz-toast");
    if (existingToast) {
      existingToast.remove();
    }

    var toast = document.createElement("div");
    toast.className = "quiz-toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    // 2秒后自动消失
    setTimeout(function () {
      if (toast.parentNode) {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s ease";
        setTimeout(function () {
          if (toast.parentNode) {
            toast.remove();
          }
        }, 300);
      }
    }, 2000);
  }

  /**
   * 显示集齐四个展点的解锁提示 - 模态弹窗
   */
  function showCheckinCompletionModal() {
    // 如果已经存在弹窗，不再创建
    if (document.getElementById("checkin-completion-modal")) return;

    var mask = document.createElement("div");
    mask.id = "checkin-completion-modal";
    mask.className = "checkin-completion-modal";
    mask.setAttribute("role", "dialog");
    mask.setAttribute("aria-modal", "true");
    mask.setAttribute("aria-labelledby", "checkin-completion-title");

    var panel = document.createElement("div");
    panel.className = "checkin-completion-panel";

    var h = document.createElement("h3");
    h.id = "checkin-completion-title";
    h.className = "checkin-completion-title";
    h.textContent = "🎉 恭喜！您已完成全部展点打卡！";

    var p = document.createElement("p");
    p.className = "checkin-completion-text";
    p.textContent = "纪念证书已解锁，是否立即查看？";

    var row = document.createElement("div");
    row.className = "checkin-completion-actions";

    var go = document.createElement("a");
    go.className = "btn btn-primary";
    go.href = "certificate.html";
    go.textContent = "查看纪念证书";

    var later = document.createElement("button");
    later.type = "button";
    later.className = "btn btn-secondary";
    later.textContent = "稍后";
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

    // 点击遮罩关闭弹窗
    mask.addEventListener("click", function (e) {
      if (e.target === mask) {
        mask.remove();
      }
    });
  }

  function spawnFlowerPetals(hostEl) {
    if (!hostEl) return;
    var n = 5;
    for (var i = 0; i < n; i++) {
      (function (idx) {
        var p = document.createElement("span");
        p.className = "flower-tribute-petal";
        p.textContent = "\uD83C\uDF38";
        p.setAttribute("aria-hidden", "true");
        var x = (idx - (n - 1) / 2) * 22 + (Math.random() * 10 - 5);
        p.style.left = "calc(50% + " + Math.round(x) + "px)";
        p.style.bottom = "24px";
        p.style.setProperty("--petal-x", x + "px");
        hostEl.appendChild(p);
        window.setTimeout(function () {
          if (p.parentNode) p.parentNode.removeChild(p);
        }, 950);
      })(i);
    }
  }

  /**
   * 献花致敬区域（localStorage wx_flowers）
   */
  function setupFlowerTribute(loc) {
    var root = document.getElementById("flower-tribute-root");
    var block = document.getElementById("block-flower-tribute");
    if (!root || !block) return;
    if (!window.wxFlowers) {
      block.hidden = true;
      return;
    }
    block.hidden = false;
    var exhibitId = normId(loc.id);
    if (!window.wxFlowers.normExhibitId(exhibitId)) {
      block.hidden = true;
      return;
    }
    var done = window.wxFlowers.hasFlowered(exhibitId);
    var total = window.wxFlowers.getDisplayTotal();

    root.innerHTML = "";
    var card = document.createElement("div");
    card.className = "flower-tribute-card";

    var iconWrap = document.createElement("div");
    iconWrap.className = "flower-tribute-card__icon";
    var iconSpan = document.createElement("span");
    iconSpan.textContent = "\uD83C\uDF38";
    iconSpan.setAttribute("aria-hidden", "true");
    iconWrap.appendChild(iconSpan);

    var tag = document.createElement("p");
    tag.className = "flower-tribute-card__tagline";
    tag.textContent = "\u5411\u738B\u65B0\u4EAD\u5C06\u519B\u81F4\u656C\uFF01";

    var countP = document.createElement("p");
    countP.className = "flower-tribute-card__count";
    countP.innerHTML =
      "\u5DF2\u6709 <strong>" +
      total +
      "</strong> \u4EBA\u732E\u82B1";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "flower-tribute-btn" + (done ? " flower-tribute-btn--done" : "");
    btn.disabled = done;
    btn.textContent = done
      ? "\u2705 \u5DF2\u732E\u82B1"
      : "\uD83C\uDF38 \u732E\u82B1\u81F4\u656C";

    if (!done) {
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        var res = window.wxFlowers.offerFlower(exhibitId);
        if (res.ok) {
          btn.classList.add("flower-tribute-btn--pop");
          spawnFlowerPetals(card);
          window.setTimeout(function () {
            btn.classList.remove("flower-tribute-btn--pop");
          }, 600);
          if (typeof window.wxFlowers.updateHomeCountEl === "function") {
            window.wxFlowers.updateHomeCountEl();
          }
          window.wxFlowers.showThankDialog();
          window.setTimeout(function () {
            setupFlowerTribute(loc);
          }, 850);
        }
      });
    }

    card.appendChild(iconWrap);
    card.appendChild(tag);
    card.appendChild(countP);
    card.appendChild(btn);
    root.appendChild(card);
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
        if (!state.picked) {
          // 未选择答案，显示Toast提示
          showQuizToast("请先回答本题");
          return;
        }
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
    setupCheckin(loc); // 添加打卡功能
    setupFlowerTribute(loc);

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
