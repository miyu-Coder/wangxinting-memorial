/**
 * 统计路由模块
 *
 * 提供页面访问追踪、总览统计、每日趋势三个接口：
 *
 * POST /api/track/page         记录页面访问（10 分钟内同一 session 去重）
 * GET  /api/stats/overview     总览统计（总访问量、今日访问、热门展点等）
 * GET  /api/stats/daily-trend  近 7 天每日 PV/UV 趋势
 */
var express = require('express');
var router = express.Router();
var db = require('../db');
var utils = require('../utils');
var R = require('../res-helper');

var EXHIBIT_NAMES = utils.EXHIBIT_NAMES;

/**
 * POST /api/track/page
 * 记录页面访问，同一 session 10 分钟内不重复计数
 *
 * 请求体：{ page: string, session_id: string }
 * page 合法值：index, detail_1, detail_2, detail_3, detail_4, flower-wall
 * 成功：{ success: true, message: "访问已记录" | "10分钟内已记录，跳过" }
 */
router.post('/api/track/page', async function (req, res) {
  var page = req.body.page;
  var session_id = req.body.session_id;

  var validPages = ['index', 'detail_1', 'detail_2', 'detail_3', 'detail_4', 'flower-wall'];
  if (!page || !validPages.includes(page)) {
    return R.fail(res, '无效的页面标识');
  }
  if (!session_id || typeof session_id !== 'string') {
    return R.fail(res, '缺少 session_id');
  }

  try {
    var recentVisit = await db.getAsync(
      "SELECT id FROM page_views WHERE page = ? AND session_id = ? AND visit_time > datetime('now', '-10 minutes') ORDER BY visit_time DESC LIMIT 1",
      [page, session_id]
    );
    if (recentVisit) {
      return R.success(res, { message: '10分钟内已记录，跳过' });
    }
    await db.runAsync(
      "INSERT INTO page_views (page, session_id, visit_time) VALUES (?, ?, datetime('now'))",
      [page, session_id]
    );
    return R.success(res, { message: '访问已记录' });
  } catch (err) {
    return R.serverError(res, err, 'Track page error');
  }
});

/**
 * GET /api/stats/overview
 * 总览统计：总访问量、今日访问量、今日独立访客、今日献花数、热门展点（打卡转化率最高）
 *
 * 成功：{ success: true, totalVisits, todayVisits, todayUV, todayFlowers, hotExhibit }
 */
router.get('/api/stats/overview', async function (req, res) {
  try {
    var totalRow = await db.getAsync('SELECT COUNT(*) AS cnt FROM page_views');
    var totalVisits = totalRow ? totalRow.cnt : 0;

    var todayRow = await db.getAsync(
      "SELECT COUNT(*) AS cnt FROM page_views WHERE DATE(visit_time) = DATE('now')"
    );
    var todayVisits = todayRow ? todayRow.cnt : 0;

    var checkinStats = await db.allAsync(
      'SELECT exhibit_id, COUNT(DISTINCT user_identifier) as checkin_count FROM visits GROUP BY exhibit_id'
    );

    var viewStats = await db.allAsync(
      "SELECT CAST(REPLACE(page, 'detail_', '') AS INTEGER) as exhibit_id, COUNT(DISTINCT session_id) as view_count FROM page_views WHERE page LIKE 'detail_%' GROUP BY CAST(REPLACE(page, 'detail_', '') AS INTEGER)"
    );

    var hotExhibit = null;
    var maxConversionRate = -1;

    for (var i = 0; i < checkinStats.length; i++) {
      var checkin = checkinStats[i];
      var viewStat = viewStats.find(function (v) { return v.exhibit_id === checkin.exhibit_id; });
      var viewCount = viewStat ? viewStat.view_count : 0;
      var checkinCount = checkin.checkin_count || 0;
      var conversionRate = viewCount > 0 ? Math.round(checkinCount * 1000 / viewCount) / 10 : 0;

      if (conversionRate > maxConversionRate ||
        (conversionRate === maxConversionRate && hotExhibit && checkinCount > hotExhibit.checkinCount)) {
        maxConversionRate = conversionRate;
        var eid = String(checkin.exhibit_id);
        hotExhibit = {
          id: eid,
          name: EXHIBIT_NAMES[eid] || ('展点' + eid),
          checkinCount: checkinCount,
          viewCount: viewCount,
          conversionRate: conversionRate
        };
      }
    }

    var todayFlowersRow = await db.getAsync(
      "SELECT COUNT(*) AS cnt FROM flowers WHERE DATE(created_at) = DATE('now')"
    );
    var todayFlowers = todayFlowersRow ? todayFlowersRow.cnt : 0;

    var todayUVRow = await db.getAsync(
      "SELECT COUNT(DISTINCT session_id) AS cnt FROM page_views WHERE DATE(visit_time) = DATE('now')"
    );
    var todayUV = todayUVRow ? todayUVRow.cnt : 0;

    return R.success(res, {
      totalVisits: totalVisits,
      todayVisits: todayVisits,
      hotExhibit: hotExhibit,
      todayFlowers: todayFlowers,
      todayUV: todayUV
    });
  } catch (err) {
    return R.serverError(res, err, 'Stats overview error');
  }
});

/**
 * GET /api/stats/daily-trend
 * 近 7 天每日 PV / UV 趋势数据
 *
 * 成功：{ success: true, data: [{ date, pv, uv }] }
 */
router.get('/api/stats/daily-trend', async function (req, res) {
  try {
    var rows = await db.allAsync(
      "SELECT DATE(visit_time) as date, COUNT(*) as pv, COUNT(DISTINCT session_id) as uv FROM page_views WHERE visit_time >= DATE('now', '-6 days') GROUP BY DATE(visit_time) ORDER BY date ASC"
    );
    return R.success(res, { data: rows || [] });
  } catch (err) {
    return R.serverError(res, err, 'Daily trend error');
  }
});

module.exports = router;
