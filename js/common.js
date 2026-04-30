(function (global) {
  "use strict";

  var NICKNAME_KEY = "wx_nickname";

  function getUserNickname() {
    var nick = localStorage.getItem(NICKNAME_KEY);
    if (nick && nick.trim()) return nick.trim();
    nick = "\u53C2\u89C2\u8005" + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem(NICKNAME_KEY, nick);
    return nick;
  }

  function updateUserNickname(newName) {
    if (newName && typeof newName === "string" && newName.trim()) {
      localStorage.setItem(NICKNAME_KEY, newName.trim());
    }
  }

  function getNicknameInitial(nickname) {
    if (!nickname) return "\u53C2";
    return nickname.charAt(0);
  }

  function displayNickname(nick) {
    if (!nick || !nick.trim()) return '参观者';
    return nick.trim();
  }

  function showCelebration(type) {
    var canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;";
    document.body.appendChild(canvas);

    var ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    var particles = [];
    var count = 30 + Math.floor(Math.random() * 21);
    var isStar = type === "star";
    var fillColor = isStar ? "#D4AF37" : "#FFB7C5";

    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        size: 12 + Math.random() * 16,
        speed: 2 + Math.random() * 4,
        swing: Math.random() * 3 - 1.5,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
      });
    }

    var opacity = 1;
    var startTime = Date.now();

    function drawStar(cx, cy, r, points) {
      var outerR = r;
      var innerR = r * 0.4;
      ctx.beginPath();
      for (var i = 0; i < points * 2; i++) {
        var radius = i % 2 === 0 ? outerR : innerR;
        var angle = (Math.PI / points) * i - Math.PI / 2;
        var px = cx + Math.cos(angle) * radius;
        var py = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    function drawPetal(cx, cy, r) {
      ctx.font = (r * 2) + "px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🌸", cx, cy);
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      var elapsed = Date.now() - startTime;
      if (elapsed > 2500) {
        opacity = Math.max(0, 1 - (elapsed - 2500) / 500);
      }

      ctx.globalAlpha = opacity;
      ctx.fillStyle = fillColor;

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.y += p.speed;
        p.x += Math.sin(p.y * 0.01) * p.swing;
        p.rotation += p.rotSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        if (isStar) {
          drawStar(0, 0, p.size, 5);
        } else {
          drawPetal(0, 0, p.size);
        }

        ctx.restore();

        if (p.y > canvas.height + 50) {
          p.y = -50;
          p.x = Math.random() * canvas.width;
        }
      }

      if (elapsed < 3000) {
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    }

    animate();
  }

  var CHALK_COLORS = ["#FFFFFF", "#FFFDE7", "#FFE4E1", "#E8F5E9", "#E3F2FD", "#FFF3E0", "#F3E5F5", "#E74C3C", "#2980B9"];
  var CHALK_FONTS = ['KaiTi', 'STKaiti', 'STXingkai', 'STCaiyun', 'SimSun', 'FangSong', 'Microsoft YaHei', 'SimHei', 'STFangsong', 'STLiti', 'STHupo'];
  var CHALK_SIZES = [14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30];
  var CHALK_LARGE_SIZES = [24, 26, 28, 30];
  var CHALK_WEIGHTS = ['normal', 'bold'];
  var CHALK_STYLES = ['normal', 'italic'];
  var CHALK_ALIGNS = ["left", "center", "right"];

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function initMessageWall(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var limit = container.getAttribute("data-limit") || "6";

    fetch("/api/messages?limit=" + limit, { cache: "no-store" })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var messages = data.list || data.messages || [];
        var totalCount =
          (data.pagination && data.pagination.total) || messages.length;

        var listEl = container.querySelector(".msg-wall-notes");
        var viewAllEl = container.querySelector(".msg-wall-view-all");

        if (!messages.length) {
          if (listEl) {
            listEl.innerHTML =
              '<div class="msg-wall-empty">暂无留言，留下第一句致敬</div>';
          }
          if (viewAllEl) viewAllEl.style.display = "none";
          return;
        }

        if (listEl) {
          var html = "";
          var largeCount = 1 + Math.floor(Math.random() * 2);
          var largeIndices = [];
          if (messages.length > 2) {
            while (largeIndices.length < largeCount) {
              var ri = Math.floor(Math.random() * messages.length);
              if (largeIndices.indexOf(ri) === -1) largeIndices.push(ri);
            }
          }
          for (var i = 0; i < messages.length; i++) {
            var m = messages[i];
            var chalkColor = CHALK_COLORS[Math.floor(Math.random() * CHALK_COLORS.length)];
            var fontFamily = CHALK_FONTS[Math.floor(Math.random() * CHALK_FONTS.length)];
            var fontSize;
            if (largeIndices.indexOf(i) !== -1) {
              fontSize = CHALK_LARGE_SIZES[Math.floor(Math.random() * CHALK_LARGE_SIZES.length)];
            } else {
              fontSize = CHALK_SIZES[Math.floor(Math.random() * CHALK_SIZES.length)];
            }
            var fontWeight = CHALK_WEIGHTS[Math.floor(Math.random() * CHALK_WEIGHTS.length)];
            var fontStyle = Math.random() < 0.3 ? 'italic' : 'normal';
            var align = CHALK_ALIGNS[Math.floor(Math.random() * CHALK_ALIGNS.length)];
            var rotate = (Math.random() - 0.5) * 10;
            var marginTop = 4 + Math.floor(Math.random() * 8);
            var marginBottom = 4 + Math.floor(Math.random() * 8);
            var content = m.content || "";
            var nick = m.nickname || "游客";
            var isLong = content.length > 15;

            html += '<div class="msg-chalk' + (isLong ? ' msg-chalk--full' : '') + '" style="';
            html += "color:" + chalkColor + ";";
            html += "font-family:" + fontFamily + ", serif;";
            html += "font-size:" + fontSize + "px;";
            html += "font-weight:" + fontWeight + ";";
            html += "font-style:" + fontStyle + ";";
            html += "text-align:" + align + ";";
            html += "transform:rotate(" + rotate.toFixed(1) + "deg);";
            html += "margin:" + marginTop + "px 6px " + marginBottom + "px 6px;";
            html += '">';
            html +=
              '<span class="msg-chalk__text">' +
              escapeHtml(content) +
              "</span>";
            html +=
              '<span class="msg-chalk__author">\u2014\u2014 ' + escapeHtml(nick) + '</span>';
            html += "</div>";
          }
          listEl.innerHTML = html;
        }

        if (viewAllEl) {
          viewAllEl.textContent = "\uD83D\uDCAC 查看全部 " + totalCount + " 条 \u2192";
          viewAllEl.href = "flower-wall.html#messages";
          viewAllEl.style.display = "";
        }
      })
      .catch(function () {
        var listEl = container.querySelector(".msg-wall-notes");
        if (listEl) {
          listEl.innerHTML =
            '<div class="msg-wall-empty">暂无留言，留下第一句致敬</div>';
        }
      });

    var writeBtn = container.querySelector(".msg-wall-write-btn");
    if (writeBtn) {
      writeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        showMessageModal(containerId);
      });
    }
  }

  function showMessageModal(containerId) {
    var existing = document.getElementById("msg-wall-modal");
    if (existing) existing.remove();

    var nickname = getUserNickname();

    var modal = document.createElement("div");
    modal.id = "msg-wall-modal";
    modal.className = "msg-wall-modal";
    modal.innerHTML =
      '<div class="msg-wall-modal__overlay"></div>' +
      '<div class="msg-wall-modal__box">' +
      '<div class="msg-wall-modal__title">\uD83D\uDCDD 留下致敬</div>' +
      '<div class="msg-wall-modal__field">' +
      '<label>\u79F0\u547C</label>' +
      '<input type="text" id="msg-modal-nick" maxlength="20" value="' +
      escapeHtml(nickname) +
      '" />' +
      "</div>" +
      '<div class="msg-wall-modal__field">' +
      '<label>\u7559\u8A00</label>' +
      '<textarea id="msg-modal-content" maxlength="200" rows="3" placeholder="\u5199\u4E0B\u60A8\u7684\u81F4\u656C\u4E0E\u611F\u60F3..."></textarea>' +
      "</div>" +
      '<div class="msg-wall-modal__actions">' +
      '<button class="msg-wall-modal__cancel" id="msg-modal-cancel">\u53D6\u6D88</button>' +
      '<button class="msg-wall-modal__submit" id="msg-modal-submit">\u63D0\u4EA4\u7559\u8A00</button>' +
      "</div>" +
      "</div>";

    document.body.appendChild(modal);

    document
      .getElementById("msg-modal-cancel")
      .addEventListener("click", function () {
        modal.remove();
      });
    modal
      .querySelector(".msg-wall-modal__overlay")
      .addEventListener("click", function () {
        modal.remove();
      });

    document
      .getElementById("msg-modal-submit")
      .addEventListener("click", function () {
        var nick = document.getElementById("msg-modal-nick").value.trim();
        var content = document
          .getElementById("msg-modal-content")
          .value.trim();

        if (!nick) {
          alert("\u8BF7\u8F93\u5165\u79F0\u547C");
          return;
        }
        if (!content) {
          alert("\u8BF7\u8F93\u5165\u7559\u8A00\u5185\u5BB9");
          return;
        }

        var btn = document.getElementById("msg-modal-submit");
        btn.disabled = true;
        btn.textContent = "\u63D0\u4EA4\u4E2D...";

        updateUserNickname(nick);

        fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname: nick, content: content }),
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (data.success) {
              modal.remove();
              initMessageWall(containerId);
              showCelebration("flower");
            } else {
              alert(data.message || "\u63D0\u4EA4\u5931\u8D25");
              btn.disabled = false;
              btn.textContent = "\u63D0\u4EA4\u7559\u8A00";
            }
          })
          .catch(function () {
            alert("\u7F51\u7EDC\u9519\u8BEF\uFF0C\u8BF7\u91CD\u8BD5");
            btn.disabled = false;
            btn.textContent = "\u63D0\u4EA4\u7559\u8A00";
          });
      });
  }

  global.WxCommon = {
    getUserNickname: getUserNickname,
    updateUserNickname: updateUserNickname,
    getNicknameInitial: getNicknameInitial,
    displayNickname: displayNickname,
    showCelebration: showCelebration,
    initMessageWall: initMessageWall,
  };
})(window);