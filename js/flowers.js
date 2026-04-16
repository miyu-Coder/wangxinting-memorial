/**
 * 献花：前端调用后端 API /api/flower
 * 说明：移除 localStorage 实现，改为基于后端接口获取与上报献花数据。
 */
(function (global) {
  "use strict";

  var EXHIBIT_META = [
    { id: "1", name: "陈列馆", full: "将军生平事迹陈列馆" },
    { id: "2", name: "故居", full: "将军故居" },
    { id: "3", name: "广场", full: "纪念广场与将军纪念碑" },
    { id: "4", name: "装备", full: "退役军事装备实物展区" },
  ];

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
    } catch (e) {
      /* fallback */
    }
    var m = new RegExp('[?&#]' + name + '=(\\d+)').exec(window.location.href);
    if (m) return m[1];
    return null;
  }

  function fetchJson(url, opts) {
    return fetch(url, Object.assign({ cache: "no-store" }, opts || {})).then(function (res) {
      if (!res) return Promise.reject(new Error("no response"));
      var ct = (res.headers && typeof res.headers.get === 'function') ? res.headers.get("content-type") : '';
      if (ct && ct.indexOf("application/json") !== -1) {
        return res.json().then(function (body) { return { res: res, body: body }; });
      }
      return { res: res, body: null };
    });
  }

  /**
   * 获取指定展点的献花总数，返回 Promise<number|null>
   */
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

  /**
   * 向后端发起献花请求，返回 Promise<{ ok:boolean, already?:boolean, displayTotal?:number }>
   */
  function offerFlower(exhibitId) {
    var id = normExhibitId(exhibitId);
    if (!id) return Promise.resolve({ ok: false });
    return fetch('/api/flower', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exhibitId: Number(id) })
    }).then(function (res) {
      if (res.ok) {
        // 请求成功后再拉取最新总数
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
      return { id: m.id, name: m.name, full: m.full };
    });
  }

  /**
   * 查询当前用户是否已对该展点献花，返回 Promise<boolean>
   */
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
    return '\uD83C\uDF38 ' + String(total) + '+ \u4EBA\u5DF2\u732E\u82B1';
  }

  function showDialog(title, btnText) {
    var mask = document.createElement('div');
    mask.className = 'flower-tribute-modal-mask';
    mask.setAttribute('role', 'dialog');
    mask.setAttribute('aria-modal', 'true');
    mask.setAttribute('aria-label', '致敬提示');

    var panel = document.createElement('div');
    panel.className = 'flower-tribute-modal-panel';

    var h = document.createElement('p');
    h.className = 'flower-tribute-modal-title';
    h.textContent = title;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary flower-tribute-modal-btn';
    btn.textContent = btnText || '好的';

    function close() { mask.remove(); }
    btn.addEventListener('click', close);
    mask.addEventListener('click', function (ev) { if (ev.target === mask) close(); });

    panel.appendChild(h);
    panel.appendChild(btn);
    mask.appendChild(panel);
    document.body.appendChild(mask);
  }

  function showThankDialog() {
    showDialog('感谢您的致敬！', '好的');
  }

  function showAlreadyDialog() {
    showDialog('您已经献过花了', '知道了');
  }

  function showAllFloweredDialog() {
    showDialog('您已向所有展点献花致敬！', '好的');
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

  function mountFlowerWallPage() {
    var totalEl = document.getElementById('flower-wall-total');
    var listEl = document.getElementById('flower-wall-exhibit-list');
    var offerBtn = document.getElementById('btn-offer-flower');
    if (totalEl) {
      totalEl.textContent = '…';
      getTotalsForAllExhibits().then(function (sum) {
        totalEl.textContent = (sum == null ? '—' : String(sum));
      }).catch(function () { totalEl.textContent = '—'; });
    }

    if (listEl) {
      listEl.innerHTML = '';
      var rows = getExhibitList();
      for (var i = 0; i < rows.length; i++) {
        (function (r) {
          var li = document.createElement('li');
          li.className = 'flower-wall-exhibit-item';
          var name = document.createElement('span');
          name.className = 'flower-wall-exhibit-item__name';
          name.textContent = '展点 ' + r.id + ' · ' + r.full;
          var st = document.createElement('span');
          st.className = 'flower-wall-exhibit-item__status';
          st.textContent = '\u52A0\u8F7D\u4E2D...';
          li.appendChild(name);
          li.appendChild(st);
          listEl.appendChild(li);

          getExhibitTotal(r.id).then(function (n) {
            if (n == null) {
              st.textContent = '\u2014';
            } else if (Number(n) > 0) {
              st.textContent = '已献花 ' + String(n) + ' 人';
              li.classList.add('is-done');
            } else {
              st.textContent = '未献花';
            }
          }).catch(function () {
            st.textContent = '\u2014';
          });
        })(rows[i]);
      }
    }

    if (offerBtn) {
      function disableOfferBtn() {
        offerBtn.classList.add('btn-disabled');
        offerBtn.setAttribute('aria-disabled', 'true');
        offerBtn.style.pointerEvents = 'none';
      }
      function enableOfferBtn() {
        offerBtn.classList.remove('btn-disabled');
        offerBtn.removeAttribute('aria-disabled');
        offerBtn.style.pointerEvents = '';
      }

      offerBtn.addEventListener('click', function (ev) {
        var id = getQueryParam('id');
        if (id) {
          ev.preventDefault();
          disableOfferBtn();

          offerFlower(id).then(function (res) {
            if (res.ok) {
              if (totalEl && typeof res.displayTotal === 'number') {
                totalEl.textContent = String(res.displayTotal);
              }
              showThankDialog();
            } else if (res.already) {
              if (typeof window.wxFlowers.showAlreadyDialog === 'function') window.wxFlowers.showAlreadyDialog();
            } else {
              alert('献花失败，请稍后重试');
            }
          }).finally(function () {
            enableOfferBtn();
          });
        } else {
          ev.preventDefault();
          disableOfferBtn();

          findFirstUnfloweredExhibit().then(function (unfloweredId) {
            if (unfloweredId) {
              window.location.href = 'detail.html?id=' + unfloweredId;
            } else {
              showAllFloweredDialog();
              enableOfferBtn();
            }
          }).catch(function () {
            window.location.href = 'detail.html?id=1';
          });
        }
      });
    }
  }

  function updateHomeCountEl() {
    var el = document.getElementById('home-flower-count');
    if (!el) return;
    // 汇总所有展点的总数并更新文案
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
    formatHomeLine: formatHomeLine
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
