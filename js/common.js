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
      '<button class="msg-wall-modal__close" id="msg-modal-close">&times;</button>' +
      '<div class="msg-wall-modal__title">\uD83D\uDCDD \u5728\u7559\u8A00\u5899\u4E0A\u7559\u4E0B\u4F60\u7684\u7B14\u8FF9</div>' +
      '<div class="msg-wall-modal__hint">\u6BCF\u4E00\u53E5\u8BDD\u90FD\u4F1A\u88AB\u6C38\u4E45\u4FDD\u7559\u5728\u7559\u8A00\u5899\u4E0A</div>' +
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
      '<div class="msg-wall-modal__tags">' +
      '<span class="msg-wall-modal__tag" data-text="\u6C38\u5782\u4E0D\u673D">\u6C38\u5782\u4E0D\u673D</span>' +
      '<span class="msg-wall-modal__tag" data-text="\u543E\u8F88\u6977\u6A21">\u543E\u8F88\u6977\u6A21</span>' +
      '<span class="msg-wall-modal__tag" data-text="\u5C06\u519B\u5343\u53E4">\u5C06\u519B\u5343\u53E4</span>' +
      '<span class="msg-wall-modal__tag" data-text="\u7EA2\u8272\u4F20\u627F">\u7EA2\u8272\u4F20\u627F</span>' +
      '<span class="msg-wall-modal__tag" data-text="\u4E0D\u5FD8\u521D\u5FC3">\u4E0D\u5FD8\u521D\u5FC3</span>' +
      '<span class="msg-wall-modal__tag" data-text="\u5411\u60A8\u81F4\u656C">\u5411\u60A8\u81F4\u656C</span>' +
      "</div>" +
      '<div class="msg-wall-modal__actions">' +
      '<button class="msg-wall-modal__cancel" id="msg-modal-cancel">\u53D6\u6D88</button>' +
      '<button class="msg-wall-modal__submit" id="msg-modal-submit">\u63D0\u4EA4\u7559\u8A00</button>' +
      "</div>" +
      "</div>";

    document.body.appendChild(modal);

    document
      .getElementById("msg-modal-close")
      .addEventListener("click", function () {
        modal.remove();
      });
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

    modal.querySelectorAll(".msg-wall-modal__tag").forEach(function (tag) {
      tag.addEventListener("click", function () {
        var textarea = document.getElementById("msg-modal-content");
        var text = tag.getAttribute("data-text");
        if (textarea.value && textarea.value.length > 0) {
          textarea.value += "、" + text;
        } else {
          textarea.value = text;
        }
        textarea.focus();
      });
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
    initAiFab: initAiFab,
  };

  var AI_CHAT_HTML = '<div class="ai-chat-overlay" id="ai-chat-overlay" hidden style="display:none">'
    + '<div class="ai-chat-panel">'
    + '<div class="ai-chat-header">'
    + '<span>\uD83E\uDD16 导览助手 \u00B7 小亭</span>'
    + '<button type="button" class="ai-chat-close" id="ai-chat-close" aria-label="关闭">&times;</button>'
    + '</div>'
    + '<div class="ai-chat-messages" id="ai-chat-messages"></div>'
    + '<div class="ai-chat-suggestions" id="ai-chat-suggestions">'
    + '<button type="button" class="ai-chat-suggestion" data-q="怎么打卡？">怎么打卡？</button>'
    + '<button type="button" class="ai-chat-suggestion" data-q="怎么领纪念品？">怎么领纪念品？</button>'
    + '<button type="button" class="ai-chat-suggestion" data-q="基地在哪里？">基地在哪里？</button>'
    + '<button type="button" class="ai-chat-suggestion" data-q="将军什么时候参军的？">将军什么时候参军的？</button>'
    + '<button type="button" class="ai-chat-suggestion" data-q="香城固战斗是怎么回事？">香城固战斗是怎么回事？</button>'
    + '<button type="button" class="ai-chat-suggestion" data-q="将军获得过哪些勋章？">将军获得过哪些勋章？</button>'
    + '</div>'
    + '<div class="ai-chat-input-bar">'
    + '<input type="text" class="ai-chat-input" id="ai-chat-input" placeholder="关于将军、基地或系统操作，都可以问我..." maxlength="100" />'
    + '<button type="button" class="ai-chat-send" id="ai-chat-send">发送</button>'
    + '</div>'
    + '</div>'
    + '</div>';

  var AI_WELCOME = '同志您好！我是导览助手小亭，关于将军生平、基地展品和系统使用，都可以问我～';

  var FUNC_KEYWORDS = ['怎么', '如何', '在哪', '导航', '打卡', '留言', '纪念品', '领取', '预约', '献花', '答题', '证书', '成就', '昵称', '字体', '开放', '门票', '后台', '管理', '排行榜', '排名', '分享', '保存', '海报', '讲解', '语音', '视频', 'VR'];
  var EXHIBIT_KEYWORDS = ['参军', '入伍', '战斗', '战役', '哪年', '出生', '经历', '勋章', '荣誉', '香城固', '神头岭', '响堂铺', '坦克', '装甲', '展品', '故居', '广场', '陈列馆', '将军', '逝世', '去世', '三战', '学徒', '当铺', '运城', '临汾', '晋中', '太原', '建国', '新中国成立', '386旅', '陈赓', '搭档', '是谁', '王新亭', '籍贯', '哪里人', '简介', '介绍'];

  var QA_PRESET_LOCAL = [
    { test: /王新亭|是谁|将军简介|介绍.*将军|将军.*介绍/, answer: '王新亭将军（1908-1989），湖北孝感人，中国人民解放军上将。1930年参加红军，抗日战争时期与陈赓搭档指挥386旅，三战三捷。新中国成立后历任副总参谋长、军事科学院政委等职。1955年被授予上将军衔，荣获一级八一勋章、一级独立自由勋章、一级解放勋章。' },
    { test: /哪里人|籍贯|将军.*家乡|家乡.*将军/, answer: '王新亭将军是湖北省孝感市孝南区朋兴乡北庙村人，1908年出生在一个贫苦农家。' },
    { test: /出生|生于|诞生|什么时候生|哪年生|出生地/, answer: '小亭了解到：王新亭将军1908年出生于湖北孝感一个贫苦农家，在故居度过了童年与少年时光。' },
    { test: /参军|入伍|参加红军|投身革命|当兵|什么时候参军|哪年参军/, answer: '小亭了解到：1930年，22岁的王新亭告别故土，参加红军，从此开启了传奇的戎马生涯。他三年内从战士升至军政治部主任，堪称传奇！' },
    { test: /学徒|当铺|辍学|小时候|少年|童年|贫苦|家贫/, answer: '小亭了解到：将军12岁因家贫辍学，前往当铺做学徒谋生。正是在那片土地上，他目睹了旧社会的黑暗与不公，埋下了投身革命的种子。' },
    { test: /勋章|荣誉|军衔|上将|授予|晋升|什么衔/, answer: '小亭了解到：1955年，王新亭将军被授予上将军衔。他一生荣获一级八一勋章、一级独立自由勋章、一级解放勋章等崇高荣誉。' },
    { test: /386旅|三八六旅|陈赓|搭档/, answer: '抗日战争时期，王新亭任八路军129师386旅政委，与旅长陈赓搭档，两人配合默契。386旅在神头岭、响堂铺、香城固等战斗中三战三捷，威震敌胆，日军甚至在坦克上写下「专打三八六旅」的标语。' },
    { test: /三战三捷|哪三战|三战.*哪/, answer: '三战三捷指神头岭伏击战、响堂铺伏击战和香城固伏击战。这三场战斗是386旅在抗日战场上的经典战例。' },
    { test: /三战/, answer: '小亭了解到：抗日战争时期，王新亭将军与陈赓搭档，指挥了神头岭伏击战、响堂铺战斗、香城固战斗，三战三捷，令日军闻风丧胆！' },
    { test: /香城固/, answer: '小亭了解到：香城固战斗是抗日战争时期的著名战斗之一，王新亭将军与陈赓搭档指挥此战，歼灭日军250余人，是平原伏击战的经典战例，三战三捷之一！' },
    { test: /神头岭/, answer: '小亭了解到：神头岭伏击战是抗日战争时期的著名战斗，由王新亭将军与陈赓共同指挥，是三战三捷的第一战，重创日军，极大鼓舞了抗日士气！' },
    { test: /响堂铺/, answer: '小亭了解到：响堂铺战斗是抗日战争时期的著名战斗，由王新亭将军与陈赓共同指挥，是三战三捷之一，给予日军沉重打击！' },
    { test: /战斗|战役|打仗|战争|指挥|抗日|解放/, answer: '小亭了解到：将军的战斗经历十分辉煌！抗日战争时期与陈赓搭档，指挥神头岭、响堂铺、香城固等著名战斗，三战三捷；解放战争时期参与运城、临汾、晋中、太原等重大战役。' },
    { test: /运城|临汾|晋中|太原|解放战争/, answer: '小亭了解到：解放战争时期，王新亭将军参与了运城、临汾、晋中、太原等重大战役，为解放全中国立下了赫赫战功！' },
    { test: /展品|陈列|展览|照片|实物|手稿|有什么|哪些展|陈列馆/, answer: '小亭了解到：陈列馆汇集约150张珍贵历史照片与70余件实物展品，包括将军生前使用过的物品、手稿、勋章复制品等，是全面了解将军生平事迹与革命精神的核心场馆。' },
    { test: /去世|逝世|终年|享年|什么时候死|哪年走|什么时候走/, answer: '王新亭将军于1989年逝世，享年81岁。他的一生是革命的一生、战斗的一生。' },
    { test: /故居|老家|住|房屋|房子/, answer: '小亭了解到：故居建筑面积约80平方米，为20世纪初孝感本地典型的乡村民居，青砖灰瓦，朴素庄重。堂屋、卧室、灶房一应俱全，真实还原了那个年代普通农家子弟的生活场景。' },
    { test: /广场|纪念碑|瞻仰|缅怀|宣誓/, answer: '小亭了解到：纪念广场占地逾5000平方米，中央矗立着王新亭将军纪念碑，碑身采用花岗岩材质，正面镌刻"王新亭将军永垂不朽"金色大字，碑前设有献花台供参观者致敬。' },
    { test: /装备|坦克|装甲|武器|军事|63式|59式/, answer: '小亭了解到：装备展区陈列63式装甲输送车和59式中型坦克等退役军事装备实物。63式是我国自行研制的第一代履带式装甲输送车，59式是新中国第一代主战坦克，见证了人民军队装甲兵从无到有的发展历程。' },
    { test: /建国后|新中国成立|副总|参谋长|司令|军职/, answer: '小亭了解到：新中国成立后，王新亭将军历任西南军区副政委、济南军区代司令员、解放军副总参谋长等重要军职，继续为国防事业贡献力量。' },
    { test: /几个展点|几个展厅|展区|展点.*多少|多少.*展点/, answer: '基地共有四个展点：将军生平事迹陈列馆、将军故居、纪念广场与将军纪念碑、退役军事装备实物展区。您可以在首页点击展点卡片进入参观。' },
    { test: /开放时间|几点开门|参观时间|营业时间/, answer: '基地通常上午9:00至下午17:00开放（16:30停止入馆），逢周一闭馆（法定节假日除外）。具体时间请以基地公告为准。' },
    { test: /门票|收费|免费|多少钱|价格/, answer: '王新亭将军红色教育基地为爱国主义教育基地，免费向公众开放。个人和团体建议提前预约。' },
    { test: /怎么预约|团体|预约参观/, answer: '个人参观通常可直接前往，团体参观建议提前联系基地预约。您也可以拨打基地电话进行咨询。' },
    { test: /讲解|解说|人工讲解|语音|导览/, answer: '每个展点都提供免费的语音讲解服务，进入展点详情页点击播放按钮即可收听。如需人工讲解，请联系基地服务台。' },
    { test: /纪念品.*什么|有哪些奖品|奖品.*什么/, answer: '四个展点分别有专属纪念品：陈列馆—将军纪念徽章、故居—红色传承手环、纪念广场—荣誉纪念证书、装备展区—军工主题书签。集齐四个展点满分还可获得将军纪念礼盒。' },
    { test: /怎么看证书|我的证书|纪念证书在哪|证书在哪/, answer: '完成全部四个展点的打卡后，在首页点击「查看成就」进入成就页，可以看到您的红色足迹纪念证书。您也可以保存证书海报到手机。' },
    { test: /排行榜在哪|怎么看排名|排名/, answer: '在成就页底部点击「🏆 查看答题排行榜」即可进入排行榜页面，查看您的答题排名和得分情况。' },
    { test: /怎么分享|怎么保存海报|保存.*海报|分享.*成就/, answer: '在成就页或证书页，点击「分享我的成就」或「保存纪念证书」，系统会自动生成专属海报，您可以保存图片到手机相册或分享给好友。' },
    { test: /字体.*调|字太小|字太大|字号|放大字|缩小字/, answer: '每个页面右下角都有一个「Aa」按钮，点击可以循环切换小、中、大三种字号，适合不同视力需求。' },
    { test: /有视频|有VR|视频|VR/, answer: '目前系统主要提供图文展示和语音讲解服务。部分展点配有实拍图片和音频讲解，建议佩戴耳机获得更好的参观体验。' },
    { test: /你好|嗨|hello|hi|在吗|您好/, answer: '同志您好！我是导览助手小亭，很高兴为您服务！您可以问我关于王新亭将军的生平事迹、基地展品介绍，或者系统使用方法。有什么我可以帮您的吗？' },
    { test: /谢谢|感谢|多谢|太好了/, answer: '不客气！能帮到您我也很高兴。如果还有其他问题，随时问我。祝您参观愉快！' },
    { test: /再见|拜拜|bye|下次见/, answer: '再见！感谢您参观王新亭将军红色教育基地。铭记历史，缅怀先烈，传承红色基因！' }
  ];

  function isFuncQuestion(q) {
    for (var i = 0; i < FUNC_KEYWORDS.length; i++) {
      if (q.indexOf(FUNC_KEYWORDS[i]) !== -1) return true;
    }
    return false;
  }

  function isExhibitQuestion(q) {
    for (var i = 0; i < EXHIBIT_KEYWORDS.length; i++) {
      if (q.indexOf(EXHIBIT_KEYWORDS[i]) !== -1) return true;
    }
    return false;
  }

  function initAiFab() {
    if (document.getElementById('ai-fab-btn')) return;

    var page = (window.location.pathname.split('/').pop() || '').toLowerCase();
    if (!page || page === 'index.html') page = 'index.html';
    var allowed = { 'index.html': 1, 'detail.html': 1, 'flower-wall.html': 1, 'rankings.html': 1 };
    if (!allowed[page]) return;

    var fab = document.createElement('button');
    fab.type = 'button';
    fab.id = 'ai-fab-btn';
    fab.className = 'ai-fab-btn';
    fab.innerHTML = '💬';
    fab.setAttribute('aria-label', '问问小亭');
    fab.addEventListener('click', function () {
      openAiChat();
    });

    document.body.appendChild(fab);
  }

  function openAiChat() {
    var chatOverlay = document.getElementById('ai-chat-overlay');
    if (!chatOverlay) {
      var wrapper = document.createElement('div');
      wrapper.innerHTML = AI_CHAT_HTML;
      chatOverlay = wrapper.firstElementChild;
      document.body.appendChild(chatOverlay);
      initAiChatEvents(chatOverlay);
    }
    chatOverlay.hidden = false;
    chatOverlay.style.display = '';
    var messagesEl = chatOverlay.querySelector('.ai-chat-messages');
    if (messagesEl && messagesEl.children.length === 0) {
      addAiBubble(messagesEl, AI_WELCOME);
    }
    var input = chatOverlay.querySelector('.ai-chat-input');
    if (input) input.focus();
  }

  function addAiBubble(messagesEl, text) {
    var row = document.createElement('div');
    row.className = 'ai-chat-row ai-chat-row--ai';
    var avatar = document.createElement('span');
    avatar.className = 'ai-chat-avatar';
    avatar.textContent = '🤖';
    var bubble = document.createElement('div');
    bubble.className = 'ai-chat-bubble ai-chat-bubble--ai';
    bubble.textContent = text;
    row.appendChild(avatar);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function initAiChatEvents(overlay) {
    var closeBtn = overlay.querySelector('.ai-chat-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        overlay.hidden = true;
        overlay.style.display = 'none';
      });
    }

    var suggestions = overlay.querySelectorAll('.ai-chat-suggestion');
    for (var i = 0; i < suggestions.length; i++) {
      suggestions[i].addEventListener('click', function () {
        var q = this.getAttribute('data-q');
        var input = overlay.querySelector('.ai-chat-input');
        if (input && q) {
          input.value = q;
          handleAiSend(overlay);
        }
      });
    }

    var sendBtn = overlay.querySelector('.ai-chat-send');
    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        handleAiSend(overlay);
      });
    }

    var input = overlay.querySelector('.ai-chat-input');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAiSend(overlay);
        }
      });
    }
  }

  function handleAiSend(overlay) {
    var input = overlay.querySelector('.ai-chat-input');
    if (!input) return;
    var question = input.value.trim();
    if (!question) return;
    input.value = '';

    var messagesEl = overlay.querySelector('.ai-chat-messages');

    var userBubble = document.createElement('div');
    userBubble.className = 'ai-chat-bubble ai-chat-bubble--user';
    userBubble.textContent = question;
    messagesEl.appendChild(userBubble);

    var thinkingRow = document.createElement('div');
    thinkingRow.className = 'ai-chat-row ai-chat-row--ai';
    var thinkingAvatar = document.createElement('span');
    thinkingAvatar.className = 'ai-chat-avatar';
    thinkingAvatar.textContent = '🤖';
    var thinkingBubble = document.createElement('div');
    thinkingBubble.className = 'ai-chat-bubble ai-chat-bubble--ai ai-chat-thinking';
    thinkingBubble.textContent = '正在分析问题...';
    thinkingRow.appendChild(thinkingAvatar);
    thinkingRow.appendChild(thinkingBubble);
    messagesEl.appendChild(thinkingRow);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    setTimeout(function () {
      var answer = generateLocalAnswer(question);
      thinkingBubble.textContent = answer;
      thinkingBubble.classList.remove('ai-chat-thinking');
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 600);
  }

  function generateLocalAnswer(question) {
    if (isFuncQuestion(question)) {
      if (typeof AI_KNOWLEDGE !== 'undefined') {
        var categories = ['guides', 'functions', 'faq'];
        for (var ci = 0; ci < categories.length; ci++) {
          var items = AI_KNOWLEDGE[categories[ci]];
          if (!items) continue;
          for (var ki = 0; ki < items.length; ki++) {
            var kws = items[ki].keywords;
            for (var wi = 0; wi < kws.length; wi++) {
              if (question.indexOf(kws[wi]) !== -1) {
                return items[ki].reply;
              }
            }
          }
        }
      }
    }

    if (isExhibitQuestion(question) || !isFuncQuestion(question)) {
      for (var p = 0; p < QA_PRESET_LOCAL.length; p++) {
        if (QA_PRESET_LOCAL[p].test.test(question)) {
          return QA_PRESET_LOCAL[p].answer;
        }
      }
    }

    if (!isFuncQuestion(question) && typeof AI_KNOWLEDGE !== 'undefined') {
      var categories = ['guides', 'functions', 'faq'];
      for (var ci = 0; ci < categories.length; ci++) {
        var items = AI_KNOWLEDGE[categories[ci]];
        if (!items) continue;
        for (var ki = 0; ki < items.length; ki++) {
          var kws = items[ki].keywords;
          for (var wi = 0; wi < kws.length; wi++) {
            if (question.indexOf(kws[wi]) !== -1) {
              return items[ki].reply;
            }
          }
        }
      }
    }

    return '小亭抱歉地说：同志，您问的「' + question + '」小亭暂时还没学到。不过，小亭对将军的生平和基地的展品可是很熟悉的！您可以试试问我关于将军的出生、参军、战斗经历或展品等问题～';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAiFab);
  } else {
    initAiFab();
  }
})(window);