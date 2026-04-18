/**
 * 打卡路由模块
 *
 * 提供展点打卡、状态查询、统计三个接口：
 *
 * POST /api/checkin            用户打卡（同一用户同一展点不可重复）
 * GET  /api/checkin/stats      各展点打卡人数统计
 * GET  /api/checkin/:exhibitId 查询当前用户在指定展点的打卡状态
 */
var express = require('express');
var router = express.Router();
var db = require('../db');
var R = require('../res-helper');

/**
 * POST /api/checkin
 * 用户在指定展点打卡
 *
 * 请求体：{ exhibitId: number }
 * 成功：{ success: true, message: "打卡成功" }
 * 重复：409 { success: false, message: "您已在该展点打卡" }
 */
router.post('/api/checkin', async function (req, res) {
  var exhibitId = req.body.exhibitId;
  var userIdentifier = req.userIdentifier;

  if (!exhibitId || ![1, 2, 3, 4].includes(Number(exhibitId))) {
    return R.fail(res, '展点 ID 必须为 1-4');
  }

  try {
    await db.runAsync(
      "INSERT INTO visits (user_identifier, exhibit_id, visited_at) VALUES (?, ?, datetime('now'))",
      [userIdentifier, exhibitId]
    );
    return R.success(res, { message: '打卡成功' });
  } catch (err) {
    if (err && err.message && err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ success: false, message: '您已在该展点打卡' });
    }
    return R.serverError(res, err, 'Checkin error');
  }
});

/**
 * GET /api/checkin/stats
 * 各展点打卡人数统计
 *
 * 成功：{ success: true, stats: { "1": 4, "2": 3, "3": 4, "4": 4 } }
 */
router.get('/api/checkin/stats', async function (req, res) {
  try {
    var rows = await db.allAsync(
      'SELECT exhibit_id, COUNT(*) AS cnt FROM visits GROUP BY exhibit_id'
    );
    var stats = { '1': 0, '2': 0, '3': 0, '4': 0 };
    rows.forEach(function (r) { stats[String(r.exhibit_id)] = r.cnt; });
    return R.success(res, { stats: stats });
  } catch (err) {
    return R.serverError(res, err, 'Checkin stats error');
  }
});

/**
 * GET /api/checkin/:exhibitId
 * 查询当前用户在指定展点是否已打卡
 *
 * 成功：{ success: true, hasCheckedIn: boolean, visited_at: string|null }
 */
router.get('/api/checkin/:exhibitId', async function (req, res) {
  var exhibitId = req.params.exhibitId;
  var userIdentifier = req.userIdentifier;

  if (![1, 2, 3, 4].includes(Number(exhibitId))) {
    return R.fail(res, '展点 ID 必须为 1-4');
  }

  try {
    var row = await db.getAsync(
      'SELECT visited_at FROM visits WHERE user_identifier = ? AND exhibit_id = ? LIMIT 1',
      [userIdentifier, exhibitId]
    );
    return R.success(res, { hasCheckedIn: !!row, visited_at: row ? row.visited_at : null });
  } catch (err) {
    return R.serverError(res, err, 'Checkin status error');
  }
});

module.exports = router;
