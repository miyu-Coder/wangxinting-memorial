/**
 * 答题路由模块
 *
 * 提供答题提交、记录查询、统计三个接口：
 *
 * POST /api/quiz/submit  提交答题记录（同一用户同一展点不可重复）
 * GET  /api/quiz/records 获取答题记录列表（支持按展点筛选）
 * GET  /api/quiz/stats   各展点答题统计（平均分、满分人数等）
 */
var express = require('express');
var router = express.Router();
var db = require('../db');
var R = require('../res-helper');

/**
 * POST /api/quiz/submit
 * 提交答题记录
 *
 * 请求体：{ nickname: string, exhibitId: number, score: number }
 * 成功：{ success: true, message: "答题记录已保存" }
 * 重复：409 { success: false, message: "您已完成过答题" }
 */
router.post('/api/quiz/submit', async function (req, res) {
  var body = req.body || {};
  var nickname = body.nickname;
  var exhibitId = body.exhibitId;
  var score = body.score;

  if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
    return R.fail(res, '昵称不能为空');
  }
  if (!exhibitId || ![1, 2, 3, 4].includes(Number(exhibitId))) {
    return R.fail(res, '展点 ID 必须为 1-4');
  }
  if (typeof score !== 'number' || score < 0 || !Number.isFinite(score)) {
    return R.fail(res, '得分无效');
  }

  try {
    var existing = await db.getAsync(
      'SELECT id FROM quiz_records WHERE nickname = ? AND exhibit_id = ? LIMIT 1',
      [nickname.trim(), exhibitId]
    );
    if (existing) {
      return res.status(409).json({ success: false, message: '您已完成过答题' });
    }
    await db.runAsync(
      "INSERT INTO quiz_records (nickname, exhibit_id, score, created_at) VALUES (?, ?, ?, datetime('now'))",
      [nickname.trim(), exhibitId, score]
    );
    return R.success(res, { message: '答题记录已保存' });
  } catch (err) {
    return R.serverError(res, err, 'Quiz submit error');
  }
});

/**
 * GET /api/quiz/records
 * 获取答题记录列表
 *
 * 查询参数：?exhibitId=1（可选，筛选展点）
 * 成功：{ success: true, data: [{ id, nickname, exhibit_id, score, created_at }] }
 */
router.get('/api/quiz/records', async function (req, res) {
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
    return R.success(res, { data: rows || [] });
  } catch (err) {
    return R.serverError(res, err, 'Quiz records error');
  }
});

/**
 * GET /api/quiz/stats
 * 各展点答题统计（平均分、总人数、满分人数）
 *
 * 成功：{ success: true, stats: { "1": { avgScore, totalCount, fullScoreCount }, ... } }
 */
router.get('/api/quiz/stats', async function (req, res) {
  try {
    var rows = await db.allAsync(
      'SELECT exhibit_id, AVG(score) as avg_score, COUNT(*) as total_count, SUM(CASE WHEN score = 4 THEN 1 ELSE 0 END) as full_score_count FROM quiz_records GROUP BY exhibit_id'
    );
    var stats = { '1': null, '2': null, '3': null, '4': null };
    rows.forEach(function (r) {
      stats[String(r.exhibit_id)] = {
        avgScore: Math.round(r.avg_score * 10) / 10,
        totalCount: r.total_count,
        fullScoreCount: r.full_score_count
      };
    });
    return R.success(res, { stats: stats });
  } catch (err) {
    return R.serverError(res, err, 'Quiz stats error');
  }
});

module.exports = router;
