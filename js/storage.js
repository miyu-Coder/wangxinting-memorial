/**
 * 知识问答与成就：统一使用 localStorage 键 wx_full_achievements
 * 兼容迁移旧版 wx_guide_quiz_ex_* 与 red_heritage
 */
(function (global) {
  "use strict";

  /** 唯一主存储键（需求指定） */
  var STORAGE_KEY = "wx_full_achievements";
  var LEGACY_PREFIX = "wx_guide_quiz_";
  var LEGACY_HERITAGE = LEGACY_PREFIX + "red_heritage";
  var STATE_VERSION = 2;

  function normId(v) {
    var n = parseInt(String(v).trim(), 10);
    return Number.isFinite(n) && n >= 1 ? n : null;
  }

  function safeParse(raw, fallback) {
    if (raw == null || raw === "") return fallback;
    try {
      var o = JSON.parse(raw);
      return typeof o === "object" && o ? o : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function defaultState() {
    return {
      version: STATE_VERSION,
      exhibits: {},
      totalCompleted: 0,
      totalScore: 0,
      title: "",
    };
  }

  function questionCountForLocation(loc) {
    if (!loc || !loc.quiz || !Array.isArray(loc.quiz.questions)) return 0;
    return loc.quiz.questions.length;
  }

  /** 全站题目总分上限（用于 14/16 展示） */
  function grandMaxScore(locations) {
    if (!Array.isArray(locations)) return 0;
    var sum = 0;
    for (var i = 0; i < locations.length; i++) {
      sum += questionCountForLocation(locations[i]);
    }
    return sum;
  }

  /**
   * 根据累计总分与满分线划分称号（绝对分档，与需求一致）
   */
  function computeAggregateTitle(totalScore, grandMax) {
    if (grandMax < 1) return "";
    if (totalScore >= grandMax) return "⭐ 红色传承人";
    if (totalScore >= 12 && grandMax >= 12) return "📚 好学奋进者";
    if (totalScore >= 8) return "🌱 初心寻路人";
    return "💪 笃行求知者";
  }

  /** 从 exhibits 子对象重算 totalCompleted、totalScore、title */
  function recomputeAggregates(state, locations) {
    var tc = 0;
    var ts = 0;
    var ex = state.exhibits || {};
    for (var k in ex) {
      if (!Object.prototype.hasOwnProperty.call(ex, k)) continue;
      var row = ex[k];
      if (row && row.completed) {
        tc++;
        ts += Math.max(0, Math.floor(Number(row.score) || 0));
      }
    }
    state.totalCompleted = tc;
    state.totalScore = ts;
    var gmax = grandMaxScore(locations);
    if (gmax < 1) gmax = 16;
    state.title = computeAggregateTitle(ts, gmax);
    return state;
  }

  function readRawState() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function writeRawState(obj) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e2) {}
  }

  function maxQuestionsForExhibitId(lid, arr) {
    for (var i = 0; i < arr.length; i++) {
      if (normId(arr[i].id) === lid) return questionCountForLocation(arr[i]);
    }
    return 4;
  }

  /**
   * 从旧版 wx_guide_quiz_ex_* 合并为 wx_full_achievements（扫描全部 key，不依赖 locations）
   */
  function migrateFromLegacy(locations) {
    var state = defaultState();
    var arr = Array.isArray(locations) ? locations : [];
    var prefix = LEGACY_PREFIX + "ex_";

    try {
      var keys = [];
      for (var ki = 0; ki < localStorage.length; ki++) {
        var k = localStorage.key(ki);
        if (k && k.indexOf(prefix) === 0) keys.push(k);
      }
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var idStr = key.slice(prefix.length);
        var lid = normId(idStr);
        if (lid == null) continue;
        var o = safeParse(localStorage.getItem(key), null);
        if (!o || !o.completed) continue;
        var nq = maxQuestionsForExhibitId(lid, arr);
        if (nq < 1) nq = 4;
        var sc = Math.min(
          nq,
          Math.max(0, Math.floor(Number(o.bestScore != null ? o.bestScore : o.lastScore) || 0))
        );
        state.exhibits[String(lid)] = {
          completed: true,
          score: sc,
          maxScore: nq,
          comment: "",
          lockedAt: o.updated || Date.now(),
          migrated: true,
        };
      }
    } catch (e) {}

    recomputeAggregates(state, arr);

    if (Object.keys(state.exhibits).length > 0) {
      writeRawState(state);
      clearLegacyKeys();
    }
    return state;
  }

  function clearLegacyKeys() {
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(LEGACY_PREFIX) === 0) keys.push(k);
      }
      for (var j = 0; j < keys.length; j++) {
        localStorage.removeItem(keys[j]);
      }
    } catch (e) {}
  }

  /**
   * @param {Array<Object>|null} locations 用于计算满分线与迁移；可为 null
   */
  function loadState(locations) {
    var loc = Array.isArray(locations) ? locations : [];
    var raw = readRawState();
    if (raw) {
      var parsed = safeParse(raw, null);
      if (parsed && typeof parsed.exhibits === "object") {
        parsed.version = STATE_VERSION;
        recomputeAggregates(parsed, loc);
        return parsed;
      }
    }
    return migrateFromLegacy(loc);
  }

  function saveState(state, locations) {
    var loc = Array.isArray(locations) ? locations : [];
    recomputeAggregates(state, loc);
    state.version = STATE_VERSION;
    writeRawState(state);
  }

  function getState(locations) {
    return loadState(locations || []);
  }

  /**
   * @returns {{ completed: boolean, score: number, maxScore: number, comment: string }}
   */
  function getExhibitRecord(exhibitId, locations) {
    var loc = Array.isArray(locations) ? locations : [];
    var id = normId(exhibitId);
    if (id == null) {
      return { completed: false, score: 0, maxScore: 0, comment: "" };
    }
    var state = loadState(loc);
    var row = state.exhibits[String(id)];
    if (!row || !row.completed) {
      return { completed: false, score: 0, maxScore: 0, comment: "" };
    }
    return {
      completed: true,
      score: Math.floor(Number(row.score) || 0),
      maxScore: Math.floor(Number(row.maxScore) || 0),
      comment: row.comment ? String(row.comment) : "",
    };
  }

  /**
   * 唯一作答：若该展点已 completed 则返回 { ok:false }；否则写入并汇总
   */
  function lockExhibitQuiz(exhibitId, score, maxForExhibit, comment, locations) {
    var loc = Array.isArray(locations) ? locations : [];
    var id = normId(exhibitId);
    if (id == null || !Number.isFinite(maxForExhibit) || maxForExhibit < 1) {
      return { ok: false, allExhibitsComplete: false, state: null };
    }
    var state = loadState(loc);
    var key = String(id);
    if (state.exhibits[key] && state.exhibits[key].completed) {
      return { ok: false, allExhibitsComplete: false, state: state };
    }

    var sc = Math.max(0, Math.min(Math.floor(Number(score) || 0), maxForExhibit));
    state.exhibits[key] = {
      completed: true,
      score: sc,
      maxScore: maxForExhibit,
      comment: comment ? String(comment) : "",
      lockedAt: Date.now(),
    };
    saveState(state, loc);

    var withQuiz = 0;
    var done = 0;
    for (var i = 0; i < loc.length; i++) {
      var n = questionCountForLocation(loc[i]);
      if (n < 1) continue;
      withQuiz++;
      var lid = normId(loc[i].id);
      if (lid == null) continue;
      var r = state.exhibits[String(lid)];
      if (r && r.completed) done++;
    }

    return {
      ok: true,
      allExhibitsComplete: withQuiz > 0 && done >= withQuiz,
      state: state,
    };
  }

  function countCompletedWithQuiz(locations) {
    var loc = Array.isArray(locations) ? locations : [];
    var state = loadState(loc);
    var withQuiz = 0;
    var done = 0;
    for (var i = 0; i < loc.length; i++) {
      var n = questionCountForLocation(loc[i]);
      if (n < 1) continue;
      withQuiz++;
      var lid = normId(loc[i].id);
      if (lid == null) continue;
      if (state.exhibits[String(lid)] && state.exhibits[String(lid)].completed) {
        done++;
      }
    }
    return { withQuiz: withQuiz, done: done };
  }

  function countPerfectExhibits(locations) {
    var loc = Array.isArray(locations) ? locations : [];
    var c = countCompletedWithQuiz(loc);
    var perfect = 0;
    var state = loadState(loc);
    for (var i = 0; i < loc.length; i++) {
      var n = questionCountForLocation(loc[i]);
      if (n < 1) continue;
      var lid = normId(loc[i].id);
      if (lid == null) continue;
      var row = state.exhibits[String(lid)];
      if (row && row.completed && Math.floor(Number(row.score) || 0) >= n) {
        perfect++;
      }
    }
    return { perfect: perfect, withQuiz: c.withQuiz };
  }

  /** 兼容旧 API：以「全展点满分」等同于红色传承人 */
  function isHeritageUnlocked(locations) {
    var loc = Array.isArray(locations) ? locations : [];
    var g = grandMaxScore(loc);
    if (g < 1) return false;
    var state = loadState(loc);
    return state.totalScore >= g;
  }

  /** @param {Array<Object>} locations 传全量展点以便与总分线一致 */
  function formatExhibitQuizStatus(exhibitId, totalQuestions, locations) {
    var loc = Array.isArray(locations) ? locations : [];
    var tq = Math.floor(Number(totalQuestions) || 0);
    if (tq < 1) return "";
    var r = getExhibitRecord(exhibitId, loc);
    if (!r.completed) return "本展点问答：未完成（仅一次机会）";
    if (r.score >= tq) return "本展点问答：⭐ 已完成 · 满分";
    return "本展点问答：✅ 已完成 · " + r.score + "/" + tq + " 分";
  }

  function formatGlobalProgressLine(locations) {
    var loc = Array.isArray(locations) ? locations : [];
    var g = grandMaxScore(loc);
    if (g < 1) g = 16;
    var state = loadState(loc);
    var c = countCompletedWithQuiz(loc);
    var line =
      "知识问答：已完成 " +
      c.done +
      "/" +
      c.withQuiz +
      " 个展点 · 累计 " +
      state.totalScore +
      "/" +
      g +
      " 分";
    if (state.title) line += " · " + state.title;
    return line;
  }

  /** 详情页：展点完成进度「已完成数/有题库展点数」 */
  function formatExhibitProgressFraction(locations) {
    var loc = Array.isArray(locations) ? locations : [];
    var c = countCompletedWithQuiz(loc);
    return c.done + "/" + (c.withQuiz || 4);
  }

  global.wxQuizStorage = {
    STORAGE_KEY: STORAGE_KEY,
    getState: getState,
    loadState: loadState,
    getExhibitRecord: function (id, locations) {
      return getExhibitRecord(id, locations);
    },
    lockExhibitQuiz: lockExhibitQuiz,
    questionCountForLocation: questionCountForLocation,
    grandMaxScore: grandMaxScore,
    countCompletedWithQuiz: countCompletedWithQuiz,
    countPerfectExhibits: countPerfectExhibits,
    isHeritageUnlocked: function (locations) {
      return isHeritageUnlocked(Array.isArray(locations) ? locations : []);
    },
    formatExhibitQuizStatus: function (exhibitId, totalQuestions, locations) {
      return formatExhibitQuizStatus(
        exhibitId,
        totalQuestions,
        Array.isArray(locations) ? locations : []
      );
    },
    formatGlobalProgressLine: function (locations) {
      return formatGlobalProgressLine(locations || []);
    },
    formatExhibitProgressFraction: formatExhibitProgressFraction,
    computeAggregateTitle: computeAggregateTitle,
  };
})(window);
