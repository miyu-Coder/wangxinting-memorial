var express = require('express');
var router = express.Router();

module.exports = function(db) {
  router.post('/', async function(req, res) {
    var exhibitId = req.body.exhibitId;
    var nickname = req.body.nickname || '';
    var userIdentifier = req.userIdentifier;

    if (!exhibitId || ![1, 2, 3, 4].includes(Number(exhibitId))) {
      return res.status(400).json({ success: false, message: '展点 ID 必须为 1-4' });
    }

    try {
      await db.runAsync(
        "INSERT INTO visits (user_identifier, exhibit_id, nickname, visited_at) VALUES (?, ?, ?, datetime('now'))",
        [userIdentifier, exhibitId, (nickname || '').trim() || null]
      );
      return res.json({ success: true, message: '打卡成功' });
    } catch (err) {
      if (err && err.message && err.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ success: false, message: '您已在该展点打卡' });
      }
      console.error('Checkin error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.get('/stats', async function(req, res) {
    try {
      var rows = await db.allAsync(
        'SELECT exhibit_id, COUNT(*) AS cnt FROM visits GROUP BY exhibit_id'
      );
      var stats = { '1': 0, '2': 0, '3': 0, '4': 0 };
      rows.forEach(function(r) { stats[String(r.exhibit_id)] = r.cnt; });
      return res.json({ success: true, stats: stats });
    } catch (err) {
      console.error('Checkin stats error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.get('/:exhibitId', async function(req, res) {
    var exhibitId = req.params.exhibitId;
    var userIdentifier = req.userIdentifier;

    if (![1, 2, 3, 4].includes(Number(exhibitId))) {
      return res.status(400).json({ success: false, message: '展点 ID 必须为 1-4' });
    }

    try {
      var row = await db.getAsync(
        'SELECT visited_at FROM visits WHERE user_identifier = ? AND exhibit_id = ? LIMIT 1',
        [userIdentifier, exhibitId]
      );
      return res.json({ success: true, hasCheckedIn: !!row, visited_at: row ? row.visited_at : null });
    } catch (err) {
      console.error('Checkin status error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  return router;
};
