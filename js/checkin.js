/**
 * 参观打卡功能：使用 localStorage 存储打卡数据
 * key: wx_checkins
 * 数据结构：
 * {
 *   "exhibits": {
 *     "1": { "checked": true, "time": "2026-04-12 15:30:00" },
 *     "2": { "checked": true, "time": "2026-04-12 15:35:00" },
 *     "3": { "checked": false, "time": null },
 *     "4": { "checked": false, "time": null }
 *   },
 *   "totalChecked": 2,
 *   "certificateUnlocked": false
 * }
 */
(function (global) {
  "use strict";

  var CHECKIN_KEY = "wx_checkins";
  var STATE_VERSION = 1;

  function normId(v) {
    var n = parseInt(String(v).trim(), 10);
    return Number.isFinite(n) && n >= 1 ? n : null;
  }

  function formatTime(date) {
    var d = date instanceof Date ? date : new Date(date);
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var hours = String(d.getHours()).padStart(2, '0');
    var minutes = String(d.getMinutes()).padStart(2, '0');
    return year + "年" + month + "月" + day + "日 " + hours + ":" + minutes;
  }

  function formatTimeISO(date) {
    var d = date instanceof Date ? date : new Date(date);
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var hours = String(d.getHours()).padStart(2, '0');
    var minutes = String(d.getMinutes()).padStart(2, '0');
    var seconds = String(d.getSeconds()).padStart(2, '0');
    return year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
  }

  function defaultState() {
    return {
      version: STATE_VERSION,
      exhibits: {},
      totalChecked: 0,
      certificateUnlocked: false
    };
  }

  function readRawData() {
    try {
      return localStorage.getItem(CHECKIN_KEY);
    } catch (e) {
      return null;
    }
  }

  function writeRawData(obj) {
    try {
      localStorage.setItem(CHECKIN_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn("Failed to save checkin data:", e);
    }
  }

  function safeParse(raw, fallback) {
    if (raw == null || raw === "") return fallback;
    try {
      var o = JSON.parse(raw);
      if (typeof o === "object" && o && typeof o.exhibits === "object") return o;
      return fallback;
    } catch (e) {
      return fallback;
    }
  }

  function checkIn(exhibitId) {
    var state = loadState();
    var id = normId(exhibitId);
    if (id == null) return { success: false, firstCompletion: false };

    var key = String(id);
    var existing = state.exhibits[key];

    // 已经打过卡，不能重复打卡
    if (existing && existing.checked) {
      return { success: false, alreadyChecked: true };
    }

    // 记录打卡信息
    state.exhibits[key] = {
      checked: true,
      time: formatTimeISO(new Date())
    };

    // 重新计算总打卡数
    updateTotalChecked(state);

    // 检查是否集齐四个展点
    var firstCompletion = false;
    if (state.totalChecked === 4 && !state.certificateUnlocked) {
      state.certificateUnlocked = true;
      firstCompletion = true;
    }

    saveState(state);

    return {
      success: true,
      firstCompletion: firstCompletion,
      time: formatTime(new Date())
    };
  }

  function isChecked(exhibitId) {
    var state = loadState();
    var id = normId(exhibitId);
    if (id == null) return false;

    var key = String(id);
    var rec = state.exhibits[key];
    return rec && rec.checked;
  }

  function getCheckTime(exhibitId) {
    var state = loadState();
    var id = normId(exhibitId);
    if (id == null) return null;

    var key = String(id);
    var rec = state.exhibits[key];
    if (!rec || !rec.checked) return null;

    return rec.time;
  }

  function updateTotalChecked(state) {
    var count = 0;
    var ex = state.exhibits;
    for (var key in ex) {
      if (Object.prototype.hasOwnProperty.call(ex, key) && ex[key].checked) {
        count++;
      }
    }
    state.totalChecked = count;
  }

  function loadState() {
    var raw = readRawData();
    var parsed = safeParse(raw, null);
    if (parsed) {
      parsed.version = STATE_VERSION;
      updateTotalChecked(parsed);
      return parsed;
    }
    return defaultState();
  }

  function saveState(state) {
    state.version = STATE_VERSION;
    updateTotalChecked(state);
    writeRawData(state);
  }

  function getTotalChecked() {
    return loadState().totalChecked;
  }

  function isCertificateUnlocked() {
    return loadState().certificateUnlocked;
  }

  function getAllCheckedTimes() {
    var state = loadState();
    var times = {};
    var ex = state.exhibits;
    for (var key in ex) {
      if (Object.prototype.hasOwnProperty.call(ex, key) && ex[key].checked) {
        var id = normId(key);
        if (id != null && ex[key].time) {
          times[id] = ex[key].time;
        }
      }
    }
    return times;
  }

  // 格式化进度信息显示（用于首页）
  function formatProgressTotal() {
    var total = getTotalChecked();
    return "📍 打卡进度 " + total + "/4";
  }

  // 获取进度百分比
  function getProgressPercent() {
    return Math.round((getTotalChecked() / 4) * 100);
  }

  // 重置所有数据（测试用）
  function resetAll() {
    writeRawData(defaultState());
  }

  // 导出函数
  global.wxCheckin = {
    checkIn: checkIn,
    isChecked: isChecked,
    getCheckTime: getCheckTime,
    getTotalChecked: getTotalChecked,
    isCertificateUnlocked: isCertificateUnlocked,
    getAllCheckedTimes: getAllCheckedTimes,
    formatProgressTotal: formatProgressTotal,
    getProgressPercent: getProgressPercent,
    formatTime: formatTime,
    resetAll: resetAll,
    CHECKIN_KEY: CHECKIN_KEY
  };

})(window);