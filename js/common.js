(function (global) {
  "use strict";

  var NICKNAME_KEY = "userNickname";

  function getUserNickname() {
    try {
      var nick = localStorage.getItem(NICKNAME_KEY);
      if (nick && nick.trim()) return nick.trim();
    } catch (e) {}
    var num = String(Math.floor(1000 + Math.random() * 9000));
    var generated = "参观者" + num;
    try {
      localStorage.setItem(NICKNAME_KEY, generated);
    } catch (e) {}
    return generated;
  }

  function updateUserNickname(newName) {
    if (!newName || typeof newName !== "string") return;
    var trimmed = newName.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem(NICKNAME_KEY, trimmed);
    } catch (e) {}
  }

  function getNicknameInitial(nick) {
    var str = (nick || "").trim();
    if (!str) return "\uD83C\uDF38";
    var chars = Array.from(str);
    return chars[0] || "\uD83C\uDF38";
  }

  function displayNickname(nick) {
    if (!nick || !nick.trim()) return "参观者";
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
      ctx.beginPath();
      ctx.ellipse(cx, cy - r * 0.3, r * 0.45, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.3, r * 0.45, r, 0, 0, Math.PI * 2);
      ctx.fill();
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

  global.WxCommon = {
    getUserNickname: getUserNickname,
    updateUserNickname: updateUserNickname,
    getNicknameInitial: getNicknameInitial,
    displayNickname: displayNickname,
    showCelebration: showCelebration,
  };
})(window);
