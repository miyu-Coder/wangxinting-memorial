var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var utils = require('../utils');

var EXHIBIT_NAMES = utils.EXHIBIT_NAMES;

module.exports = function(db) {
  router.post('/track/page', async function(req, res) {
    var page = req.body.page;
    var session_id = req.body.session_id;

    var validPages = ['index', 'detail_1', 'detail_2', 'detail_3', 'detail_4', 'flower-wall'];
    if (!page || !validPages.includes(page)) {
      return res.status(400).json({ success: false, message: '无效的页面标识' });
    }
    if (!session_id || typeof session_id !== 'string') {
      return res.status(400).json({ success: false, message: '缺少 session_id' });
    }

    try {
      var recentVisit = await db.getAsync(
        "SELECT id FROM page_views WHERE page = ? AND session_id = ? AND visit_time > datetime('now', '-10 minutes') ORDER BY visit_time DESC LIMIT 1",
        [page, session_id]
      );
      if (recentVisit) {
        return res.json({ success: true, message: '10分钟内已记录，跳过' });
      }
      await db.runAsync(
        "INSERT INTO page_views (page, session_id, visit_time) VALUES (?, ?, datetime('now'))",
        [page, session_id]
      );
      return res.json({ success: true, message: '访问已记录' });
    } catch (err) {
      console.error('Track page error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.get('/stats/overview', async function(req, res) {
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
        var viewStat = viewStats.find(function(v) { return v.exhibit_id === checkin.exhibit_id; });
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

      var yesterdayVisitsRow = await db.getAsync(
        "SELECT COUNT(*) AS cnt FROM page_views WHERE DATE(visit_time) = DATE('now', '-1 day')"
      );
      var yesterdayVisits = yesterdayVisitsRow ? yesterdayVisitsRow.cnt : 0;

      var yesterdayUVRow = await db.getAsync(
        "SELECT COUNT(DISTINCT session_id) AS cnt FROM page_views WHERE DATE(visit_time) = DATE('now', '-1 day')"
      );
      var yesterdayUV = yesterdayUVRow ? yesterdayUVRow.cnt : 0;

      var yesterdayFlowersRow = await db.getAsync(
        "SELECT COUNT(*) AS cnt FROM flowers WHERE DATE(created_at) = DATE('now', '-1 day')"
      );
      var yesterdayFlowers = yesterdayFlowersRow ? yesterdayFlowersRow.cnt : 0;

      var weekAgoVisitsRow = await db.getAsync(
        "SELECT COUNT(*) AS cnt FROM page_views WHERE DATE(visit_time) = DATE('now', '-7 day')"
      );
      var weekAgoVisits = weekAgoVisitsRow ? weekAgoVisitsRow.cnt : 0;

      var totalFlowersRow = await db.getAsync('SELECT COUNT(*) AS cnt FROM flowers');
      var totalFlowers = totalFlowersRow ? totalFlowersRow.cnt : 0;

      var weekAgoFlowersRow = await db.getAsync(
        "SELECT COUNT(*) AS cnt FROM flowers WHERE DATE(created_at) = DATE('now', '-7 day')"
      );
      var weekAgoFlowers = weekAgoFlowersRow ? weekAgoFlowersRow.cnt : 0;

      return res.json({
        success: true,
        totalVisits: totalVisits,
        todayVisits: todayVisits,
        hotExhibit: hotExhibit,
        todayFlowers: todayFlowers,
        todayUV: todayUV,
        yesterdayVisits: yesterdayVisits,
        yesterdayUV: yesterdayUV,
        yesterdayFlowers: yesterdayFlowers,
        weekAgoVisits: weekAgoVisits,
        totalFlowers: totalFlowers,
        weekAgoFlowers: weekAgoFlowers
      });
    } catch (err) {
      console.error('Stats overview error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.get('/stats/daily-trend', async function(req, res) {
    try {
      var rows = await db.allAsync(
        "SELECT DATE(visit_time) as date, COUNT(*) as pv, COUNT(DISTINCT session_id) as uv FROM page_views WHERE visit_time >= DATE('now', '-6 days') GROUP BY DATE(visit_time) ORDER BY date ASC"
      );
      return res.json({ success: true, data: rows || [] });
    } catch (err) {
      console.error('Daily trend error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.get('/stats/hourly-today', async function(req, res) {
    try {
      var rows = await db.allAsync(
        "SELECT strftime('%H', visit_time) as hour, COUNT(*) as pv FROM page_views WHERE DATE(visit_time) = DATE('now') GROUP BY hour ORDER BY hour ASC"
      );
      var data = [];
      for (var h = 0; h < 24; h++) {
        var key = String(h).padStart(2, '0');
        var found = rows.find(function(r) { return r.hour === key; });
        data.push({ hour: h, pv: found ? found.pv : 0 });
      }
      return res.json({ success: true, data: data });
    } catch (err) {
      console.error('Hourly today error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.get('/system/status', async function(req, res) {
    try {
      var uptimeSeconds = Math.floor(process.uptime());
      var days = Math.floor(uptimeSeconds / 86400);
      var hours = Math.floor((uptimeSeconds % 86400) / 3600);
      var dbStat = fs.statSync(path.join(__dirname, '..', '..', 'data.db'));
      var dbSizeMB = (dbStat.size / (1024 * 1024)).toFixed(2);
      return res.json({
        success: true,
        status: 'running',
        uptime: days + ' 天 ' + hours + ' 小时',
        dbSize: dbSizeMB + ' MB'
      });
    } catch (err) {
      console.error('System status error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.get('/activity/recent', async function(req, res) {
    var limit = Math.min(parseInt(req.query.limit) || 10, 30);

    try {
      var activities = [];

      var visits = await db.allAsync(
        'SELECT user_identifier, exhibit_id, nickname, visited_at FROM visits ORDER BY visited_at DESC LIMIT ?',
        [limit]
      );
      visits.forEach(function(r) {
        activities.push({
          type: 'checkin',
          nickname: r.nickname || '参观者',
          exhibit: EXHIBIT_NAMES[r.exhibit_id] || '展点',
          time: r.visited_at
        });
      });

      var flowers = await db.allAsync(
        'SELECT nickname, user_identifier, exhibit_id, created_at FROM flowers ORDER BY created_at DESC LIMIT ?',
        [limit]
      );
      flowers.forEach(function(r) {
        activities.push({
          type: 'flower',
          nickname: r.nickname || r.user_identifier || '参观者',
          exhibit: EXHIBIT_NAMES[r.exhibit_id] || '展点',
          time: r.created_at
        });
      });

      var quizzes = await db.allAsync(
        'SELECT nickname, exhibit_id, created_at FROM quiz_records ORDER BY created_at DESC LIMIT ?',
        [limit]
      );
      quizzes.forEach(function(r) {
        activities.push({
          type: 'quiz',
          nickname: r.nickname || '参观者',
          exhibit: EXHIBIT_NAMES[r.exhibit_id] || '展点',
          time: r.created_at
        });
      });

      activities.sort(function(a, b) {
        return new Date(b.time) - new Date(a.time);
      });
      activities = activities.slice(0, limit);

      res.json({ success: true, list: activities });
    } catch (err) {
      console.error('Activity recent error:', err);
      res.status(500).json({ error: '服务器错误' });
    }
  });

  router.get('/rankings/quiz', async function(req, res) {
    var nickname = req.query.nickname || '';

    try {
      var rows = await db.allAsync(
        "SELECT nickname, SUM(max_score) as total_score, COUNT(*) as completed_exhibits, SUM(COALESCE(max_time, 0)) as total_time_cost FROM (SELECT nickname, exhibit_id, MAX(score) as max_score, MAX(COALESCE(time_cost, 0)) as max_time FROM quiz_records GROUP BY nickname, exhibit_id) GROUP BY nickname HAVING completed_exhibits > 0"
      );

      var fastestTime = Infinity;
      rows.forEach(function(r) {
        r.total_time_cost = r.total_time_cost || 0;
        if (r.total_time_cost > 0 && r.total_time_cost < fastestTime) {
          fastestTime = r.total_time_cost;
        }
      });

      if (fastestTime === Infinity) fastestTime = 1;

      rows.forEach(function(r) {
        var scoreRate = (r.total_score / 16) * 100;
        var completionRate = (r.completed_exhibits / 4) * 100;
        var speedScore = r.total_time_cost > 0 ? (fastestTime / r.total_time_cost) * 100 : 0;
        r.ranking_score = Math.round((scoreRate * 0.5 + completionRate * 0.3 + speedScore * 0.2) * 10) / 10;
      });

      rows.sort(function(a, b) {
        if (b.completed_exhibits !== a.completed_exhibits) {
          return b.completed_exhibits - a.completed_exhibits;
        }
        return b.ranking_score - a.ranking_score;
      });

      var rankings = rows.slice(0, 50).map(function(r, idx) {
        return {
          rank: idx + 1,
          nickname: r.nickname,
          total_score: r.total_score,
          completed_exhibits: r.completed_exhibits,
          total_time_cost: r.total_time_cost,
          ranking_score: r.ranking_score
        };
      });

      var myRank = null;
      if (nickname) {
        for (var i = 0; i < rows.length; i++) {
          if (rows[i].nickname === nickname.trim()) {
            myRank = {
              rank: i + 1,
              nickname: rows[i].nickname,
              total_score: rows[i].total_score,
              completed_exhibits: rows[i].completed_exhibits,
              total_time_cost: rows[i].total_time_cost,
              ranking_score: rows[i].ranking_score
            };
            break;
          }
        }
      }

      return res.json({ success: true, rankings: rankings, myRank: myRank });
    } catch (err) {
      console.error('Rankings error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  return router;
};
