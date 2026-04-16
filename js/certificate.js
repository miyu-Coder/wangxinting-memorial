/**
 * 纪念证书页面 certificate.html
 * 根据打卡数据渲染证书内容，提供保存和分享功能
 */
(function () {
  "use strict";

  // 展点信息缓存
  var LOCATIONS = [];

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

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
        LOCATIONS = data.slice();
        return LOCATIONS;
      });
  }

  function findLocationById(id) {
    var n = normId(id);
    if (!Number.isFinite(n) || n < 1) return null;
    for (var i = 0; i < LOCATIONS.length; i++) {
      if (normId(LOCATIONS[i].id) === n) return LOCATIONS[i];
    }
    return null;
  }

  function renderCertificate() {
    if (!window.wxCheckin) {
      showError("打卡模块未加载");
      return;
    }

    // 检查是否解锁了证书
    if (!window.wxCheckin.isCertificateUnlocked()) {
      showCertificateLocked();
      return;
    }

    var checkTimes = window.wxCheckin.getAllCheckedTimes();
    var totalChecked = window.wxCheckin.getTotalChecked();

    if (totalChecked < 4) {
      showCertificateNotReady(4 - totalChecked);
      return;
    }

    // 渲染日期
    var dateEl = document.querySelector("#certificate-date span");
    var latestTime = null;

    // 获取最新打卡时间
    for (var id in checkTimes) {
      var time = checkTimes[id];
      if (!latestTime || new Date(time) > new Date(latestTime)) {
        latestTime = time;
      }
    }

    if (dateEl && latestTime) {
      dateEl.textContent = window.wxCheckin.formatTime(new Date(latestTime));
    }

    // 渲染展点列表
    var sitesList = document.getElementById("certificate-sites");
    if (sitesList && LOCATIONS.length > 0) {
      var listHtml = '';

      for (var i = 0; i < 4; i++) {
        var loc = LOCATIONS[i];
        if (!loc) continue;

        var lid = normId(loc.id);
        if (lid == null) continue;

        var time = checkTimes[lid];
        var checked = time ? true : false;

        listHtml += '<div class="certificate-site-item">';
        listHtml += '<div class="certificate-site-icon">🏠</div>';
        listHtml += '<div class="certificate-site-info">';
        listHtml += '<div class="certificate-site-name">' + escapeHtml(loc.routeShort || loc.title) + '</div>';
        if (checked && time) {
          listHtml += '<p class="certificate-site-time">' + window.wxCheckin.formatTime(new Date(time)) + '</p>';
        } else {
          listHtml += '<p class="certificate-site-time">未完成打卡</p>';
        }
        listHtml += '</div>';
        listHtml += '</div>';
      }

      sitesList.innerHTML = listHtml;
    }

    // 显示证书内容
    var main = document.getElementById("certificate-main");
    if (main) main.hidden = false;
  }

  function showCertificateLocked() {
    var main = document.getElementById("certificate-main");
    if (main) {
      main.innerHTML = '<div class="certificate-error">' +
        '<p>您还未集齐四个展点的打卡</p>' +
        '<p>继续参观打卡后即可解锁纪念证书</p>' +
        '<a class="btn btn-primary" href="index.html">返回首页</a>' +
        '</div>';
      main.hidden = false;
    }
  }

  function showCertificateNotReady(remaining) {
    var main = document.getElementById("certificate-main");
    if (main) {
      main.innerHTML = '<div class="certificate-error">' +
        '<p>还需打卡 ' + remaining + ' 个展点</p>' +
        '<p>继续参观打卡后即可解锁纪念证书</p>' +
        '<a class="btn btn-primary" href="index.html">返回首页</a>' +
        '</div>';
      main.hidden = false;
    }
  }

  function showError(msg) {
    var main = document.getElementById("certificate-main");
    if (main) {
      main.innerHTML = '<div class="certificate-error">' +
        '<p>加载失败：' + msg + '</p>' +
        '<button type="button" class="btn btn-secondary" onclick="location.reload()">重新加载</button>' +
        '</div>';
      main.hidden = false;
    }
  }

  /**
   * 生成证书画布
   */
  function drawCertificateCanvas(checkData) {
    var canvas = document.getElementById("certificate-canvas");
    if (!canvas || !canvas.getContext) return null;

    var w = 750;
    var h = 1200;
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");

    // 背景渐变
    var bgGradient = ctx.createLinearGradient(0, 0, w, h);
    bgGradient.addColorStop(0, "#fdf8f2");
    bgGradient.addColorStop(0.45, "#fff5eb");
    bgGradient.addColorStop(1, "#f5e6d8");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // 边框
    ctx.strokeStyle = "rgba(196, 30, 58, 0.35)";
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, w - 48, h - 48);

    // 标题
    ctx.fillStyle = "#7a1528";
    ctx.font = "bold 42px 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("王新亭将军红色教育基地", w / 2, 100);

    ctx.fillStyle = "#c41e3a";
    ctx.font = "bold 52px 'Noto Serif SC', 'SimSun', serif";
    ctx.fillText("红色足迹纪念证书", w / 2, 180);

    // 用户完成信息
    if (checkData.userDate) {
      ctx.fillStyle = "#555555";
      ctx.font = "28px 'Noto Sans SC', sans-serif";
      ctx.fillText("完成时间：" + checkData.userDate, w / 2, 260);
    }

    // 展点列表
    var checkedSites = checkData.sites || [];
    if (checkedSites.length > 0) {
      ctx.textAlign = "left";
      ctx.fillStyle = "#c41e3a";
      ctx.font = "bold 32px 'Noto Sans SC', sans-serif";
      ctx.fillText("已打卡展点：", 60, 360);

      ctx.font = "26px 'Noto Sans SC', sans-serif";
      ctx.fillStyle = "#444444";
      var y = 420;
      var lineHeight = 42;

      for (var i = 0; i < checkedSites.length; i++) {
        var site = checkedSites[i];
        var line = (i + 1) + ". " + site.name + "  " + site.time;
        ctx.fillText(line, 60, y);
        y += lineHeight;
      }
    }

    // 感谢语
    ctx.textAlign = "center";
    ctx.font = "28px 'Noto Sans SC', sans-serif";
    ctx.fillStyle = "#666666";
    ctx.fillText("感谢您参观王新亭将军红色教育基地", w / 2, h - 180);
    ctx.fillText("让我们一起传承红色基因，赓续红色血脉！", w / 2, h - 140);

    // 印章效果
    ctx.fillStyle = "rgba(196, 30, 58, 0.1)";
    ctx.beginPath();
    ctx.arc(w - 120, h - 120, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(196, 30, 58, 0.3)";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#c41e3a";
    ctx.font = "16px 'Noto Serif SC', serif";
    ctx.fillText("湖北省爱国", w - 120, h - 130);
    ctx.fillText("主义教育", w - 120, h - 110);
    ctx.fillText("基地", w - 120, h - 90);

    return canvas;
  }

  /**
   * 生成用于画布的打卡数据
   */
  function prepareCheckData() {
    if (!window.wxCheckin || !LOCATIONS.length) return null;

    var allTimes = window.wxCheckin.getAllCheckedTimes();
    var formattedDate = "";
    var siteList = [];
    var latestTime = null;

    // 获取最新打卡时间和格式化的展点信息
    for (var time in allTimes) {
      var date = new Date(allTimes[time]);
      if (!latestTime || date > new Date(latestTime)) {
        latestTime = allTimes[time];
      }
    }

    if (latestTime) {
      var d = new Date(latestTime);
      formattedDate = d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日";
    }

    // 获取展点列表
    for (var i = 0; i < 4 && i < LOCATIONS.length; i++) {
      var loc = LOCATIONS[i];
      if (!loc) continue;

      var lid = normId(loc.id);
      var time = allTimes[lid];
      var formattedTime = "";

      if (time) {
        var d = new Date(time);
        formattedTime = d.getMonth() + 1 + "月" + d.getDate() + "日 " +
                         String(d.getHours()).padStart(2, '0') + ":" +
                         String(d.getMinutes()).padStart(2, '0');
      } else {
        formattedTime = "未打卡";
      }

      siteList.push({
        name: loc.routeShort || loc.title,
        time: formattedTime
      });
    }

    var detailItems = siteList.map(function (site) {
      return '🏠 ' + site.name + '  ' + site.time;
    });

    return {
      userDate: formattedDate,
      sites: siteList,
      detailItems: detailItems
    };
  }

  /**
   * 保存证书图片
   */
  function saveCertificate() {
    generateCertificatePosterWithQR();
  }

  function generateCertificatePosterWithQR() {
    var checkData = prepareCheckData();
    if (!checkData) return;
    if (!window.PosterGenerator) {
      showPosterError('海报生成器未加载，请刷新页面重试');
      return;
    }

    PosterUtils.showLoadingToast();
    window.PosterGenerator.generateCertificatePoster(checkData, checkData.detailItems)
      .then(function (dataUrl) {
        PosterUtils.hideLoadingToast();
        PosterUtils.showPosterPreview({
          dataUrl: dataUrl,
          title: "🎉 纪念证书已生成",
          downloadName: "王新亭红色教育基地-纪念证书.png",
          shareTitle: "红色足迹纪念证书 - 王新亭将军红色教育基地",
          shareText: "我完成了王新亭将军红色教育基地的打卡纪念证书，快来一起参观！",
          onError: showPosterError
        });
      })
      .catch(function (error) {
        PosterUtils.hideLoadingToast();
        showPosterError('海报生成失败，请重试');
      });
  }

  function sharePoster() {
    PosterUtils.sharePoster({
      title: '红色足迹纪念证书 - 王新亭将军红色教育基地',
      text: '我完成了王新亭将军红色教育基地的打卡纪念证书，快来一起参观！'
    });
  }

  function shareCertificate() {
    generateCertificatePosterWithQR();
  }

  function showPosterError(message) {
    var hint = document.getElementById('certificate-hint');
    if (hint) {
      hint.textContent = message;
      hint.hidden = false;
    }
  }

  function showRedirectToast(message) {
    var toast = document.createElement("div");
    toast.className = "certificate-redirect-toast";
    toast.textContent = message;
    toast.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.75);color:#fff;padding:16px 24px;border-radius:8px;font-size:1rem;z-index:9999;text-align:center;max-width:80%;";
    document.body.appendChild(toast);
    return toast;
  }

  /**
   * 检查打卡状态（通过API检查当前用户）
   */
  function checkCheckinStatus() {
    var checkPromises = [];
    for (var i = 1; i <= 4; i++) {
      checkPromises.push(
        fetch("/api/checkin/" + i, { credentials: "include" })
          .then(function (res) {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
          })
          .then(function (data) {
            return data && data.success && data.hasCheckedIn ? true : false;
          })
          .catch(function () {
            return false;
          })
      );
    }

    return Promise.all(checkPromises).then(function (results) {
      var checkedCount = 0;
      var checkedTimes = {};
      
      results.forEach(function (checked, index) {
        if (checked) {
          checkedCount++;
          checkedTimes[index + 1] = true;
        }
      });

      return {
        checkedCount: checkedCount,
        checkedTimes: checkedTimes
      };
    });
  }

  /**
   * 主函数：加载数据并渲染证书
   */
  function run() {
    var main = document.getElementById("certificate-main");
    if (main) main.hidden = true;

    checkCheckinStatus()
      .then(function (result) {
        var checkedCount = result.checkedCount || 0;

        if (checkedCount < 4) {
          var toast = showRedirectToast("请先完成全部展点打卡");
          setTimeout(function () {
            window.location.href = "index.html";
          }, 1500);
          return;
        }

        return loadLocations().then(function () {
          renderCertificate();

          var saveBtn = document.getElementById("btn-save-certificate");
          var shareBtn = document.getElementById("btn-share-certificate");

          if (saveBtn) {
            saveBtn.addEventListener("click", saveCertificate);
          }
          if (shareBtn) {
            shareBtn.addEventListener("click", shareCertificate);
          }
        });
      })
      .catch(function (e) {
        showError(e && e.message || "加载失败");
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();