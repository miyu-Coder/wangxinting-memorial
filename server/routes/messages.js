var express = require('express');
var router = express.Router();

module.exports = function(db) {
  router.post('/', async function(req, res) {
    var nickname = (req.body || {}).nickname;
    var content = (req.body || {}).content;

    if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
      return res.status(400).json({ success: false, message: '昵称不能为空' });
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ success: false, message: '留言内容不能为空' });
    }

    var nick = nickname.trim();
    var cont = content.trim();

    var nickLen = Array.from(nick).length;
    var contLen = Array.from(cont).length;

    if (nickLen > 20) {
      return res.status(400).json({ success: false, message: '昵称不能超过20字' });
    }
    if (contLen > 200) {
      return res.status(400).json({ success: false, message: '内容不能超过200字' });
    }

    try {
      await db.runAsync(
        "INSERT INTO messages (nickname, content, created_at) VALUES (?, ?, datetime('now'))",
        [nick, cont]
      );
      return res.json({ success: true });
    } catch (err) {
      console.error('Message insert error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.get('/', async function(req, res) {
    try {
      var page = parseInt(req.query.page) || 1;
      var limit = parseInt(req.query.limit) || 20;
      var offset = (page - 1) * limit;

      var rows = await db.allAsync(
        'SELECT id, nickname, content, created_at FROM messages WHERE status = 1 ORDER BY id DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );

      var countRow = await db.getAsync('SELECT COUNT(*) as total FROM messages WHERE status = 1');
      var total = countRow ? countRow.total : 0;
      var totalPages = Math.max(1, Math.ceil(total / limit));
      var hasMore = page < totalPages;

      return res.json({
        success: true,
        list: rows,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          totalPages: totalPages,
          hasMore: hasMore
        }
      });
    } catch (err) {
      console.error('Messages query error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  return router;
};
