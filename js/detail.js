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
