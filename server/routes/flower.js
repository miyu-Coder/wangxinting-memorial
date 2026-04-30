var express = require('express');
var router = express.Router();

module.exports = function(db) {
  router.post('/', async function(req, res) {
    var exhibitId = req.body.exhibitId;
    var nickname = req.body.nickname || '';
    var userIdentifier = req.userIdentifier;

    if (!exhibitId || ![1, 2, 3, 4].includes(Number(exhibitId))) {
      return res.status(400).json({ error: '展点 ID 必须为 1-4' });
    }

    try {
      await db.runAsync(
        'INSERT INTO flowers (user_identifier, exhibit_id, nickname) VALUES (?, ?, ?)',
        [userIdentifier, exhibitId, (nickname || '').trim() || null]
      );
      res.json({ success: true, message: '献花成功' });
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: '您已在该展点献花过了' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/:exhibitId', async function(req, res) {
    var exhibitId = req.params.exhibitId;

    if (![1, 2, 3, 4].includes(Number(exhibitId))) {
      return res.status(400).json({ error: '展点 ID 必须为 1-4' });
    }

    try {
      var row = await db.getAsync(
        'SELECT COUNT(*) as count FROM flowers WHERE exhibit_id = ?',
        [exhibitId]
      );
      res.json({ exhibitId: Number(exhibitId), totalCount: row.count });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/user/:exhibitId', async function(req, res) {
    var exhibitId = req.params.exhibitId;
    var userIdentifier = req.userIdentifier;

    if (![1, 2, 3, 4].includes(Number(exhibitId))) {
      return res.status(400).json({ error: '展点 ID 必须为 1-4' });
    }

    try {
      var row = await db.getAsync(
        'SELECT 1 FROM flowers WHERE user_identifier = ? AND exhibit_id = ? LIMIT 1',
        [userIdentifier, exhibitId]
      );
      return res.json({ exhibitId: Number(exhibitId), hasFlowered: !!row });
    } catch (err) {
      console.error('User flowered check error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
  });

  router.get('/recent/:exhibitId', async function(req, res) {
    var exhibitId = req.params.exhibitId;
    var limit = Math.min(parseInt(req.query.limit) || 5, 20);

    if (![1, 2, 3, 4].includes(Number(exhibitId))) {
      return res.status(400).json({ error: '展点 ID 必须为 1-4' });
    }

    try {
      var rows = await db.allAsync(
        'SELECT nickname FROM flowers WHERE exhibit_id = ? AND nickname IS NOT NULL AND nickname != "" ORDER BY created_at DESC LIMIT ?',
        [exhibitId, limit]
      );
      var names = rows.map(function(r) { return r.nickname; });
      return res.json({ success: true, exhibitId: Number(exhibitId), names: names });
    } catch (err) {
      console.error('Recent flower query error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
  });

  return router;
};
