/**
 * 献花：前端调用后端 API /api/flower
 * 说明：移除 localStorage 实现，改为基于后端接口获取与上报献花数据。
 */
(function (global) {
  "use strict";

  var EXHIBIT_META = [
    { id: "1", name: "陈列馆", full: "将军生平事迹陈列馆", icon: "\uD83C\uDFDB\uFE0F" },
    { id: "2", name: "故居", full: "将军故居", icon: "\uD83C\uDFE0" },
    { id: "3", name: "广场", full: "纪念广场与将军纪念碑", icon: "\uD83E\uDEA6" },
    { id: "4", name: "装备展区", full: "退役军事装备实物展区", icon: "\uD83D\uDEE1\uFE0F" }
  ];

  var HOT_TAGS = ["永垂不朽", "吾辈楷模", "将军千古", "红色传承", "不忘初心"];

  function normExhibitId(v) {
    if (v == null) return null;
    var n = parseInt(String(v).trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > 4) return null;
    return String(n);
  }

  function getQueryParam(name) {
    try {
      var u = new URL(window.location.href);
      var v = u.searchParams.get(name);
      if (v != null && String(v).trim() !== "") return String(v).trim();
    } catch (e) {}
    var m = new RegExp('[?&#]' + name + '=(\\d+)').exec(window.location.href);
    if (m) return m[1];
    return null;
  }

  function fetchJson(url, opts) {
    return fetch(url, Object.assign({ cache: "no-store" }, opts || {})).then(function (res) {
      if (!res) return Promise.reject(new Error("no response"));
      if (res.headers && res.headers.get && res.headers.get("content-type") && res.headers.get("content-type").indexOf("application/json") !== -1) {
        return res.json().then(function (body) { return { res: res, body: body }; });
      }
      return { res: res, body: null };
    });
  }

  function getExhibitTotal(exhibitId) {
    var id = normExhibitId(exhibitId);
    if (!id) return Promise.resolve(null);
    return fetchJson('/api/flower/' + encodeURIComponent(id)).then(function (r) {
      if (r && r.res && r.res.ok && r.body && typeof r.body.totalCount === 'number') return r.body.totalCount;
      return null;
    }).catch(function () { return null; });
  }

  function getTotalsForAllExhibits() {
    var promises = EXHIBIT_META.map(function (m) { return getExhibitTotal(m.id); });
    return Promise.all(promises).then(function (arr) {
      var sum = 0;
      for (var i = 0; i < arr.length; i++) {
        var v = arr[i];
        if (typeof v === 'number' && Number.isFinite(v)) sum += v;
      }
      return sum;
    });
  }

  function offerFlower(exhibitId) {
    var id = normExhibitId(exhibitId);
    if (!id) return Promise.resolve({ ok: false });
    var nickname = '';
    if (window.WxCommon && typeof window.WxCommon.getUserNickname === 'function') {
      nickname = window.WxCommon.getUserNickname();
    } else {
      try { nickname = localStorage.getItem('userNickname') || ''; } catch (e) {}
    }
    return fetch('/api/flower', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exhibitId: Number(id), nickname: nickname.trim() })
    }).then(function (res) {
      if (res.ok) {
        return getExhibitTotal(id).then(function (total) {
          return { ok: true, displayTotal: total };
        });
      }
      if (res.status === 409) {
        return { ok: false, already: true };
      }
      return { ok: false };
    }).catch(function () {
      return { ok: false };
    });
  }

  function getExhibitList() {
    return EXHIBIT_META.map(function (m) {
      return { id: m.id, name: m.name, full: m.full, icon: m.icon };
    });
  }

  function getUserFlowered(exhibitId) {
    var id = normExhibitId(exhibitId);
    if (!id) return Promise.resolve(false);
    return fetchJson('/api/flower/user/' + encodeURIComponent(id)).then(function (r) {
      if (r && r.res && r.res.ok && r.body && typeof r.body.hasFlowered !== 'undefined') return !!r.body.hasFlowered;
      return false;
    }).catch(function () { return false; });
  }

  function formatHomeLine(total) {
    if (total == null || !Number.isFinite(total)) return '\uD83C\uDF38 - 人已献花';
    return '\uD83C\uDF38 ' + String(total) + '+ 人已献花';
  }

  function showToast(text) {
    var el = document.createElement('div');
    el.className = 'flower-toast';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 2100);
  }

  function animateNumber(el, from, to, duration) {
    if (!el) return;
    var start = performance.now();
    var diff = to - from;
    el.classList.add('is-animating');
    function step(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      var current = Math.round(from + diff * progress);
      el.textContent = String(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.classList.remove('is-animating');
      }
    }
    requestAnimationFrame(step);
  }

  function spawnParticles(btn) {
    if (!btn) return;
    var rect = btn.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var offsets = [-20, 0, 20];
    for (var i = 0; i < 3; i++) {
      var dot = document.createElement('div');
      dot.className = 'flower-particle';
      dot.style.left = cx + 'px';
      dot.style.top = cy + 'px';
      dot.style.setProperty('--px', offsets[i] + 'px');
      document.body.appendChild(dot);
      (function (d) {
        setTimeout(function () { if (d.parentNode) d.remove(); }, 600);
      })(dot);
    }
  }

  function showThankDialog() {
    var mask = document.createElement('div');
    mask.className = 'flower-tribute-modal-mask';
    mask.setAttribute('role', 'dialog');
    mask.setAttribute('aria-modal', 'true');
    mask.setAttribute('aria-label', '致敬提示');

    var panel = document.createElement('div');
    panel.className = 'flower-tribute-modal-panel';

    var h = document.createElement('p');
    h.className = 'flower-tribute-modal-title';
    h.textContent = '感谢您的致敬！';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary flower-tribute-modal-btn';
    btn.textContent = '好的';

    function close() { mask.remove(); }
    btn.addEventListener('click', close);
    mask.addEventListener('click', function (ev) { if (ev.target === mask) close(); });

    panel.appendChild(h);
    panel.appendChild(btn);
    mask.appendChild(panel);
    document.body.appendChild(mask);
  }

  function showAlreadyDialog() {
    var mask = document.createElement('div');
    mask.className = 'flower-tribute-modal-mask';
    mask.setAttribute('role', 'dialog');
    mask.setAttribute('aria-modal', 'true');
    mask.setAttribute('aria-label', '致敬提示');

    var panel = document.createElement('div');
    panel.className = 'flower-tribute-modal-panel';

    var h = document.createElement('p');
    h.className = 'flower-tribute-modal-title';
    h.textContent = '您已经献过花了';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary flower-tribute-modal-btn';
    btn.textContent = '知道了';

    function close() { mask.remove(); }
    btn.addEventListener('click', close);
    mask.addEventListener('click', function (ev) { if (ev.target === mask) close(); });

    panel.appendChild(h);
    panel.appendChild(btn);
    mask.appendChild(panel);
    document.body.appendChild(mask);
  }

  function showAllFloweredDialog() {
    var mask = document.createElement('div');
    mask.className = 'flower-tribute-modal-mask';
    mask.setAttribute('role', 'dialog');
    mask.setAttribute('aria-modal', 'true');
    mask.setAttribute('aria-label', '致敬提示');

    var panel = document.createElement('div');
    panel.className = 'flower-tribute-modal-panel';

    var h = document.createElement('p');
    h.className = 'flower-tribute-modal-title';
    h.textContent = '您已向所有展点献花致敬！';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary flower-tribute-modal-btn';
    btn.textContent = '好的';

    function close() { mask.remove(); }
    btn.addEventListener('click', close);
    mask.addEventListener('click', function (ev) { if (ev.target === mask) close(); });

    panel.appendChild(h);
    panel.appendChild(btn);
    mask.appendChild(panel);
    document.body.appendChild(mask);
  }

  function findFirstUnfloweredExhibit() {
    var results = [false, false, false, false];
    var promises = EXHIBIT_META.map(function (m, idx) {
      return getUserFlowered(m.id).then(function (flowered) {
        results[idx] = flowered;
      });
    });
    return Promise.all(promises).then(function () {
      for (var i = 0; i < results.length; i++) {
        if (!results[i]) {
          return EXHIBIT_META[i].id;
        }
      }
      return null;
    });
  }

  function injectHotTags() {
    var messageModule = document.querySelector('.message-module');
    if (!messageModule) return;
    var inputArea = messageModule.querySelector('.message-inputs');
    if (!inputArea) return;

    var existing = messageModule.querySelector('.flower-wall-tags');
    if (existing) return;

    var tagContainer = document.createElement('div');
    tagContainer.className = 'flower-wall-tags';

    for (var i = 0; i < HOT_TAGS.length; i++) {
      (function (text) {
        var tag = document.createElement('button');
        tag.type = 'button';
        tag.className = 'flower-wall-tag';
        tag.textContent = text;
        tag.addEventListener('click', function () {
          var textarea = document.getElementById('messageInput');
          if (textarea) {
            textarea.value = textarea.value ? textarea.value + text : text;
            textarea.focus();
          }
        });
        tagContainer.appendChild(tag);
      })(HOT_TAGS[i]);
    }

    inputArea.parentNode.insertBefore(tagContainer, inputArea.nextSibling);
  }

  function injectEndingText() {
    var messageModule = document.querySelector('.message-module');
    if (!messageModule) return;
    var existing = messageModule.querySelector('.flower-wall-ending');
    if (existing) return;

    var ending = document.createElement('div');
    ending.className = 'flower-wall-ending';
    ending.id = 'flower-wall-ending';
    messageModule.appendChild(ending);
    updateEndingText();
  }

  function updateEndingText() {
    var ending = document.getElementById('flower-wall-ending');
    if (!ending) return;
    var listEl = document.getElementById('messageList');
    var count = 0;
    if (listEl) {
      var items = listEl.querySelectorAll('.message-item');
      count = items.length;
    }
    var text = count > 0
      ? '已有 ' + count + ' 条留言，每一句都是传承'
      : '暂无留言，留下第一句敬意';
    ending.innerHTML = '<span class="flower-wall-ending__line"></span>' +
      '\u2014\u2014 ' + text + ' \u2014\u2014' +
      '<span class="flower-wall-ending__line"></span>';
  }

  function updateExhibitCount(exhibitId, newTotal) {
    var listEl = document.getElementById('flower-wall-exhibit-list');
    if (!listEl) return;
    var items = listEl.querySelectorAll('.flower-wall-exhibit-item');
    var idx = parseInt(exhibitId, 10) - 1;
    if (idx >= 0 && idx < items.length) {
      var statusEl = items[idx].querySelector('.flower-wall-exhibit-item__status');
      if (statusEl && typeof newTotal === 'number') {
        statusEl.textContent = String(newTotal);
        items[idx].classList.add('is-done');
      }
    }
  }

  function mountFlowerWallPage() {
    var totalEl = document.getElementById('flower-wall-total');
    var listEl = document.getElementById('flower-wall-exhibit-list');
    var offerBtn = document.getElementById('btn-offer-flower');

    var heroBlooms = document.querySelectorAll('.flower-wall-hero__bloom');
    for (var b = 0; b < heroBlooms.length; b++) {
      heroBlooms[b].textContent = '\u2605';
    }

    var subEl = document.querySelector('.flower-wall-total__sub');
    if (subEl) {
      subEl.textContent = '朵朵鲜花寄哀思，颗颗红心向将军';
    }

    if (offerBtn) {
      offerBtn.textContent = '\uD83C\uDF38 献花致敬';
    }

    if (totalEl) {
      totalEl.textContent = '\u2026';
      getTotalsForAllExhibits().then(function (sum) {
        totalEl.textContent = (sum == null ? '\u2014' : String(sum));
      }).catch(function () { totalEl.textContent = '\u2014'; });
    }

    if (listEl) {
      listEl.innerHTML = '';
      var rows = getExhibitList();
      for (var i = 0; i < rows.length; i++) {
        (function (r) {
          var li = document.createElement('li');
          li.className = 'flower-wall-exhibit-item';

          var icon = document.createElement('span');
          icon.className = 'flower-wall-exhibit-item__icon';
          icon.textContent = r.icon || '';
          icon.setAttribute('aria-hidden', 'true');

          var name = document.createElement('span');
          name.className = 'flower-wall-exhibit-item__name';
          name.textContent = r.name;

          var st = document.createElement('span');
          st.className = 'flower-wall-exhibit-item__status';
          st.textContent = '\u52A0\u8F7D\u4E2D...';

          li.appendChild(icon);
          li.appendChild(name);
          li.appendChild(st);
          listEl.appendChild(li);

          getExhibitTotal(r.id).then(function (n) {
            if (n == null) {
              st.textContent = '\u2014';
            } else if (Number(n) > 0) {
              st.textContent = String(n);
              li.classList.add('is-done');
            } else {
              st.textContent = '未献花';
            }
          }).catch(function () {
            st.textContent = '\u2014';
          });
        })(rows[i]);
      }

      if (rows.length <= 4) {
        listEl.style.justifyContent = 'center';
      }
    }

    if (offerBtn) {
      offerBtn.addEventListener('click', function (ev) {
        var id = getQueryParam('id');
        if (id) {
          ev.preventDefault();
          offerBtn.classList.add('btn-disabled');
          offerBtn.setAttribute('aria-disabled', 'true');
          offerBtn.style.pointerEvents = 'none';

          spawnParticles(offerBtn);

          offerFlower(id).then(function (res) {
            if (res.ok) {
              if (totalEl) {
                var oldVal = parseInt(totalEl.textContent, 10);
                if (Number.isFinite(oldVal) && typeof res.displayTotal === 'number') {
                  animateNumber(totalEl, oldVal, res.displayTotal, 200);
                } else if (typeof res.displayTotal === 'number') {
                  totalEl.textContent = String(res.displayTotal);
                }
              }
              updateExhibitCount(id, res.displayTotal);
              showToast('献花成功，感谢您的敬意');

              if (window.WxCommon && typeof window.WxCommon.showCelebration === 'function') {
                window.WxCommon.showCelebration('flower');
              }

              showThankDialog();
            } else if (res.already) {
              showAlreadyDialog();
            } else {
              alert('献花失败，请稍后重试');
            }
          }).finally(function () {
            offerBtn.classList.remove('btn-disabled');
            offerBtn.removeAttribute('aria-disabled');
            offerBtn.style.pointerEvents = '';
          });
        } else {
          ev.preventDefault();
          offerBtn.classList.add('btn-disabled');
          offerBtn.setAttribute('aria-disabled', 'true');
          offerBtn.style.pointerEvents = 'none';

          spawnParticles(offerBtn);

          findFirstUnfloweredExhibit().then(function (unfloweredId) {
            if (unfloweredId) {
              window.location.href = 'detail.html?id=' + unfloweredId;
            } else {
              showAllFloweredDialog();
              offerBtn.classList.remove('btn-disabled');
              offerBtn.removeAttribute('aria-disabled');
              offerBtn.style.pointerEvents = '';
            }
          }).catch(function () {
            window.location.href = 'detail.html?id=1';
          });
        }
      });
    }

    injectHotTags();
    injectEndingText();
  }

  function updateHomeCountEl() {
    var el = document.getElementById('home-flower-count');
    if (!el) return;
    getTotalsForAllExhibits().then(function (sum) {
      el.textContent = formatHomeLine(sum);
    }).catch(function () {
      el.textContent = formatHomeLine(null);
    });
  }

  global.wxFlowers = {
    normExhibitId: normExhibitId,
    getExhibitTotal: getExhibitTotal,
    offerFlower: offerFlower,
    getExhibitList: getExhibitList,
    getUserFlowered: getUserFlowered,
    mountFlowerWallPage: mountFlowerWallPage,
    updateHomeCountEl: updateHomeCountEl,
    showThankDialog: showThankDialog,
    showAlreadyDialog: showAlreadyDialog,
    showAllFloweredDialog: showAllFloweredDialog,
    findFirstUnfloweredExhibit: findFirstUnfloweredExhibit,
    formatHomeLine: formatHomeLine,
    showToast: showToast,
    animateNumber: animateNumber,
    updateEndingText: updateEndingText,
    updateExhibitCount: updateExhibitCount
  };

  function autoMountWall() {
    if (document.getElementById('flower-wall-total')) {
      mountFlowerWallPage();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMountWall);
  } else {
    autoMountWall();
  }
})(typeof window !== 'undefined' ? window : this);
