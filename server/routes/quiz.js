var express = require('express');
var router = express.Router();

module.exports = function(db) {
  router.post('/submit', async function(req, res) {
    var nickname = req.body.nickname;
    var exhibitId = req.body.exhibitId;
    var score = req.body.score;
    var completedAt = req.body.completedAt;
    var timeCost = req.body.timeCost;

    if (!nickname || !nickname.trim()) {
      return res.status(400).json({ success: false, message: '昵称不能为空' });
    }

    if (!exhibitId || ![1, 2, 3, 4].includes(Number(exhibitId))) {
      return res.status(400).json({ success: false, message: '展点 ID 必须为 1-4' });
    }

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ success: false, message: '得分无效' });
    }

    try {
      var existing = await db.getAsync(
        'SELECT id FROM quiz_records WHERE nickname = ? AND exhibit_id = ? LIMIT 1',
        [nickname.trim(), exhibitId]
      );

      if (existing) {
        return res.status(409).json({ success: false, message: '您已完成过答题' });
      }

      var tc = (typeof timeCost === 'number' && timeCost >= 0) ? Math.floor(timeCost) : 0;

      await db.runAsync(
        "INSERT INTO quiz_records (nickname, exhibit_id, score, completed_at, time_cost, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
        [nickname.trim(), exhibitId, score, completedAt || null, tc]
      );
      return res.json({ success: true, message: '答题记录已保存' });
    } catch (err) {
      console.error('Quiz submit error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.get('/records', async function(req, res) {
    var exhibitId = req.query.exhibitId;

    try {
      var sql = 'SELECT id, nickname, exhibit_id, score, created_at FROM quiz_records';
      var params = [];

      if (exhibitId && [1, 2, 3, 4].includes(Number(exhibitId))) {
        sql += ' WHERE exhibit_id = ?';
        params.push(Number(exhibitId));
      }

      sql += ' ORDER BY created_at DESC LIMIT 100';

      var rows = await db.allAsync(sql, params);
      return res.json({ success: true, data: rows || [] });
    } catch (err) {
      console.error('Quiz records error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.get('/stats', async function(req, res) {
    try {
      var rows = await db.allAsync(
        'SELECT exhibit_id, AVG(score) as avg_score, COUNT(*) as total_count, SUM(CASE WHEN score = 4 THEN 1 ELSE 0 END) as full_score_count FROM quiz_records GROUP BY exhibit_id'
      );

      var stats = { '1': null, '2': null, '3': null, '4': null };
      rows.forEach(function(r) {
        stats[String(r.exhibit_id)] = {
          avgScore: Math.round(r.avg_score * 10) / 10,
          totalCount: r.total_count,
          fullScoreCount: r.full_score_count
        };
      });

      return res.json({ success: true, stats: stats });
    } catch (err) {
      console.error('Quiz stats error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.get('/time-by-user', async function(req, res) {
    var nickname = req.query.nickname || '';
    if (!nickname) {
      return res.json({ success: true, times: {} });
    }
    try {
      var rows = await db.allAsync(
        'SELECT exhibit_id, time_cost FROM quiz_records WHERE nickname = ?',
        [nickname.trim()]
      );
      var times = {};
      rows.forEach(function(r) {
        times[r.exhibit_id] = r.time_cost || 0;
      });
      return res.json({ success: true, times: times });
    } catch (err) {
      console.error('Quiz time by user error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.get('/user-records', async function(req, res) {
    var nickname = req.query.nickname || '';
    if (!nickname) {
      return res.json({ success: true, records: {} });
    }
    try {
      var rows = await db.allAsync(
        'SELECT exhibit_id, MAX(score) as score FROM quiz_records WHERE nickname = ? GROUP BY exhibit_id',
        [nickname.trim()]
      );
      var records = {};
      rows.forEach(function(r) {
        records[String(r.exhibit_id)] = r.score;
      });
      return res.json({ success: true, records: records });
    } catch (err) {
      console.error('Quiz user records error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  return router;
};
