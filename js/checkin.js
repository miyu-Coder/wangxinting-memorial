/**
 * 打卡模块（基于后端 API）
 * 提供与原有 `wxCheckin` 相同的函数名，但数据来自服务端。
 * 端点：
 *  - GET  /api/checkin/:exhibitId  -> { success, hasCheckedIn, visited_at }
 *  - POST /api/checkin          -> 插入并返回 200 或 409
 */
(function (global) {
  "use strict";

  var EXHIBIT_IDS = [1, 2, 3, 4];
  var state = {
    exhibits: {}, // '1': { checked: bool, time: 'YYYY-MM-DD hh:mm:ss' }
    totalChecked: 0,
    certificateUnlocked: false,
  };

  var _initPromise = null;

  function formatTime(date) {
    var d = date instanceof Date ? date : new Date(date);
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var hours = String(d.getHours()).padStart(2, '0');
    var minutes = String(d.getMinutes()).padStart(2, '0');
    return year + "年" + month + "月" + day + "日 " + hours + ":" + minutes;
  }

  function _recalc() {
    var cnt = 0;
    for (var k in state.exhibits) {
      if (Object.prototype.hasOwnProperty.call(state.exhibits, k) && state.exhibits[k].checked) cnt++;
    }
    state.totalChecked = cnt;
    state.certificateUnlocked = state.totalChecked === EXHIBIT_IDS.length;
  }

  function _fetchUserFor(id) {
    return fetch('/api/checkin/' + encodeURIComponent(String(id)), { cache: 'no-store' }).then(function (res) {
      if (!res.ok) return Promise.resolve(null);
      return res.json().then(function (body) {
        if (!body) return null;
        return { id: String(id), has: !!body.hasCheckedIn, time: body.visited_at || null };
      }).catch(function () { return null; });
    }).catch(function () { return null; });
  }

  function init() {
    if (_initPromise) return _initPromise;
    _initPromise = Promise.all(EXHIBIT_IDS.map(function (id) { return _fetchUserFor(id); })).then(function (arr) {
      state.exhibits = {};
      for (var i = 0; i < arr.length; i++) {
        var r = arr[i];
        if (r && r.id) {
          state.exhibits[String(r.id)] = { checked: !!r.has, time: r.time };
        }
      }
      _recalc();
      return state;
    }).catch(function () {
      state.exhibits = {};
      _recalc();
      return state;
    });
    return _initPromise;
  }

  function isChecked(exhibitId) {
    var id = String(Number(exhibitId));
    return !!(state.exhibits[id] && state.exhibits[id].checked);
  }

  function getCheckTime(exhibitId) {
    var id = String(Number(exhibitId));
    return state.exhibits[id] ? state.exhibits[id].time : null;
  }

  function getTotalChecked() {
    return state.totalChecked || 0;
  }

  function isCertificateUnlocked() {
    return !!state.certificateUnlocked;
  }

  function getAllCheckedTimes() {
    var out = {};
    for (var k in state.exhibits) {
      if (Object.prototype.hasOwnProperty.call(state.exhibits, k) && state.exhibits[k].checked) {
        out[k] = state.exhibits[k].time || null;
      }
    }
    return out;
  }

  function formatProgressTotal() {
    return '📍 打卡进度 ' + getTotalChecked() + '/' + EXHIBIT_IDS.length;
  }

  function getProgressPercent() {
    return Math.round((getTotalChecked() / EXHIBIT_IDS.length) * 100);
  }

  function checkIn(exhibitId) {
    var id = Number(exhibitId);
    if (!Number.isFinite(id)) return Promise.resolve({ success: false });
    var prevTotal = getTotalChecked();
    return fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exhibitId: id })
    }).then(function (res) {
      if (res.ok) {
        // fetch updated user status for this exhibit
        return _fetchUserFor(id).then(function (r) {
          if (r && r.id) {
            state.exhibits[String(r.id)] = { checked: !!r.has, time: r.time };
          }
          _recalc();
          var firstCompletion = prevTotal < EXHIBIT_IDS.length && state.totalChecked === EXHIBIT_IDS.length;
          return { success: true, firstCompletion: firstCompletion, time: state.exhibits[String(id)] ? state.exhibits[String(id)].time : null };
        });
      }
      if (res.status === 409) {
        // already checked
        return _fetchUserFor(id).then(function (r) {
          if (r && r.id) state.exhibits[String(r.id)] = { checked: !!r.has, time: r.time };
          _recalc();
          return { success: false, alreadyChecked: true };
        });
      }
      return { success: false };
    }).catch(function (e) {
      return { success: false };
    });
  }

  function resetAll() {
    // 无服务器端清除接口；只清空本地缓存（下次 init 会重新拉取）
    state.exhibits = {};
    state.totalChecked = 0;
    state.certificateUnlocked = false;
    _initPromise = null;
  }

  // 导出
  global.wxCheckin = {
    init: init,
    checkIn: function (exhibitId) { return checkIn(exhibitId); },
    isChecked: isChecked,
    getCheckTime: getCheckTime,
    getTotalChecked: getTotalChecked,
    isCertificateUnlocked: isCertificateUnlocked,
    getAllCheckedTimes: getAllCheckedTimes,
    formatProgressTotal: formatProgressTotal,
    getProgressPercent: getProgressPercent,
    formatTime: formatTime,
    resetAll: resetAll
  };

  // 自动初始化（后台拉取当前用户的打卡状态）
  try { if (typeof window !== 'undefined') init(); } catch (e) {}

})(window);
