/**
 * 留言路由模块
 *
 * 提供留言提交、留言列表两个接口：
 *
 * POST /api/messages  提交一条留言（需审核后才公开）
 * GET  /api/messages  获取已审核留言列表（按时间倒序，支持分页）
 */
var express = require('express');
var router = express.Router();
var db = require('../db');
var R = require('../res-helper');

/**
 * POST /api/messages
 * 提交一条留言，默认 status=0（待审核）
 *
 * 请求体：{ nickname: string, content: string }
 * 成功：{ success: true }
 * 校验失败：400 { success: false, message: "错误描述" }
 */
router.post('/api/messages', async function (req, res) {
  var body = req.body || {};
  var nickname = body.nickname;
  var content = body.content;

  if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
    return R.fail(res, '昵称不能为空');
  }
  if (!content || typeof content !== 'string' || !content.trim()) {
    return R.fail(res, '留言内容不能为空');
  }

  var nick = nickname.trim();
  var cont = content.trim();
  var nickLen = Array.from(nick).length;
  var contLen = Array.from(cont).length;

  if (nickLen > 20) {
    return R.fail(res, '昵称不能超过20字');
  }
  if (contLen > 200) {
    return R.fail(res, '内容不能超过200字');
  }

  try {
    await db.runAsync(
      "INSERT INTO messages (nickname, content, created_at) VALUES (?, ?, datetime('now'))",
      [nick, cont]
    );
    return R.success(res);
  } catch (err) {
    return R.serverError(res, err, 'Message insert error');
  }
});

/**
 * GET /api/messages
 * 获取已审核留言列表（status=1），按 id 倒序分页
 *
 * 查询参数：?page=1&limit=20
 * 成功：{ success: true, list: [...], pagination: { page, limit, total, hasMore } }
 */
router.get('/api/messages', async function (req, res) {
  try {
    var page = Math.max(1, parseInt(req.query.page) || 1);
    var limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    var offset = (page - 1) * limit;

    var rows = await db.allAsync(
      'SELECT id, nickname, content, created_at FROM messages WHERE status = 1 ORDER BY id DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    var countRow = await db.getAsync('SELECT COUNT(*) as total FROM messages WHERE status = 1');
    var total = countRow ? countRow.total : 0;
    var hasMore = offset + rows.length < total;

    return R.success(res, {
      list: rows,
      pagination: { page: page, limit: limit, total: total, hasMore: hasMore }
    });
  } catch (err) {
    return R.serverError(res, err, 'Messages query error');
  }
});

module.exports = router;
