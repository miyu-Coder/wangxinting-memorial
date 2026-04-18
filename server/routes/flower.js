/**
 * 献花路由模块
 *
 * 提供献花、献花计数、用户献花状态三个接口：
 *
 * POST /api/flower              用户向指定展点献花（不可重复）
 * GET  /api/flower/:exhibitId   获取指定展点的献花总数
 * GET  /api/flower/user/:exhibitId 查询当前用户是否已献花
 *
 * 注意：此模块保留原始响应格式（{ exhibitId, totalCount } / { error }），
 * 前端已适配此格式，暂不改动以保持兼容。
 */
var express = require('express');
var router = express.Router();
var db = require('../db');
var R = require('../res-helper');

/**
 * POST /api/flower
 * 用户向指定展点献花
 *
 * 请求体：{ exhibitId: number }
 * 成功：{ success: true, message: "献花成功" }
 * 重复：409 { error: "您已在该展点献花过了" }
 */
router.post('/api/flower', async function (req, res) {
  var exhibitId = req.body.exhibitId;
  var userIdentifier = req.userIdentifier;

  if (!exhibitId || ![1, 2, 3, 4].includes(Number(exhibitId))) {
    return res.status(400).json({ error: '展点 ID 必须为 1-4' });
  }

  try {
    await db.runAsync(
      'INSERT INTO flowers (user_identifier, exhibit_id) VALUES (?, ?)',
      [userIdentifier, exhibitId]
    );
    return res.json({ success: true, message: '献花成功' });
  } catch (err) {
    if (err && err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: '您已在该展点献花过了' });
    }
    console.error('Flower error:', err);
    return res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * GET /api/flower/:exhibitId
 * 获取指定展点的献花总数
 *
 * 成功：{ exhibitId: number, totalCount: number }
 */
router.get('/api/flower/:exhibitId', async function (req, res) {
  var exhibitId = req.params.exhibitId;

  if (![1, 2, 3, 4].includes(Number(exhibitId))) {
    return res.status(400).json({ error: '展点 ID 必须为 1-4' });
  }

  try {
    var row = await db.getAsync(
      'SELECT COUNT(*) as count FROM flowers WHERE exhibit_id = ?',
      [exhibitId]
    );
    return res.json({ exhibitId: Number(exhibitId), totalCount: row ? row.count : 0 });
  } catch (err) {
    console.error('Flower count error:', err);
    return res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * GET /api/flower/user/:exhibitId
 * 查询当前用户是否已在指定展点献花
 *
 * 成功：{ exhibitId: number, hasFlowered: boolean }
 */
router.get('/api/flower/user/:exhibitId', async function (req, res) {
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

module.exports = router;
