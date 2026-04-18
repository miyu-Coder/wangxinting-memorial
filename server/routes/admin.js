/**
 * 管理后台路由模块
 *
 * 提供管理员登录、留言审核、展点内容管理、数据导出等接口：
 *
 * 认证：
 *   POST /api/admin/login              管理员密码登录
 *
 * 留言审核：
 *   GET  /api/admin/messages           获取全部留言（含待审核）
 *   POST /api/admin/messages/:id/approve  通过留言
 *   POST /api/admin/messages/:id/reject   拒绝留言
 *
 * 展点管理：
 *   GET  /api/admin/exhibits           展点列表（id, title, routeShort）
 *   GET  /api/admin/exhibits/:id       单个展点详情
 *   POST /api/admin/exhibits/:id       更新展点内容
 *
 * 数据导出：
 *   GET  /api/admin/export/checkins    导出打卡记录 CSV
 *   GET  /api/admin/export/flowers     导出献花记录 CSV
 *   GET  /api/admin/export/quiz        导出答题记录 CSV
 *   GET  /api/admin/export/all         导出全部数据 CSV
 *   GET  /api/admin/export-exhibits    导出展点内容 CSV
 *   POST /api/admin/import-exhibits    导入展点内容 CSV
 *
 * 页面：
 *   GET  /admin                        管理后台页面
 */
var express = require('express');
var router = express.Router();
var db = require('../db');
var utils = require('../utils');
var R = require('../res-helper');

var EXHIBIT_NAMES = utils.EXHIBIT_NAMES;
var readFileAsync = utils.readFileAsync;
var writeFileAsync = utils.writeFileAsync;
var escapeCSV = utils.escapeCSV;
var sendCSV = utils.sendCSV;
var getDataPath = utils.getDataPath;

/**
 * POST /api/admin/login
 * 管理员密码登录验证
 *
 * 请求体：{ password: string }
 * 成功：{ success: true, message: "登录成功" }
 * 失败：401 { success: false, message: "密码错误" }
 */
router.post('/api/admin/login', function (req, res) {
  var password = req.body.password;
  var adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (!password) {
    return R.fail(res, '请输入密码');
  }
  if (password === adminPassword) {
    return R.success(res, { message: '登录成功' });
  } else {
    return res.status(401).json({ success: false, message: '密码错误' });
  }
});

/**
 * GET /api/admin/messages
 * 获取全部留言（含待审核、已拒绝），按 id 倒序
 *
 * 成功：{ success: true, list: [{ id, nickname, content, status, created_at }] }
 */
router.get('/api/admin/messages', async function (req, res) {
  try {
    var rows = await db.allAsync(
      'SELECT id, nickname, content, status, created_at FROM messages ORDER BY id DESC'
    );
    return R.success(res, { list: rows });
  } catch (err) {
    return R.serverError(res, err, 'Admin messages query error');
  }
});

/**
 * POST /api/admin/messages/:id/approve
 * 通过留言审核（status → 1）
 *
 * 成功：{ success: true }
 */
router.post('/api/admin/messages/:id/approve', async function (req, res) {
  var id = Number(req.params.id);
  if (!id || id < 1) return R.fail(res, '无效的 id');
  try {
    await db.runAsync('UPDATE messages SET status = 1 WHERE id = ?', [id]);
    return R.success(res);
  } catch (err) {
    return R.serverError(res, err, 'Approve message error');
  }
});

/**
 * POST /api/admin/messages/:id/reject
 * 拒绝留言（status → 2）
 *
 * 成功：{ success: true }
 */
router.post('/api/admin/messages/:id/reject', async function (req, res) {
  var id = Number(req.params.id);
  if (!id || id < 1) return R.fail(res, '无效的 id');
  try {
    await db.runAsync('UPDATE messages SET status = 2 WHERE id = ?', [id]);
    return R.success(res);
  } catch (err) {
    return R.serverError(res, err, 'Reject message error');
  }
});

/**
 * GET /api/admin/exhibits
 * 获取展点列表（仅 id、title、routeShort）
 *
 * 成功：{ success: true, list: [{ id, title, routeShort }] }
 */
router.get('/api/admin/exhibits', async function (req, res) {
  try {
    var data = await readFileAsync(getDataPath(), 'utf8');
    var exhibits = JSON.parse(data);
    var list = exhibits.map(function (e) {
      return { id: e.id, title: e.title, routeShort: e.routeShort };
    });
    return R.success(res, { list: list });
  } catch (err) {
    return R.serverError(res, err, 'Read exhibits error');
  }
});

/**
 * GET /api/admin/exhibits/:id
 * 获取单个展点完整数据
 *
 * 成功：{ success: true, exhibit: {...} }
 * 不存在：404 { success: false, message: "展点不存在" }
 */
router.get('/api/admin/exhibits/:id', async function (req, res) {
  var id = Number(req.params.id);
  if (!id || id < 1 || id > 4) {
    return R.fail(res, '无效的展点ID');
  }
  try {
    var data = await readFileAsync(getDataPath(), 'utf8');
    var exhibits = JSON.parse(data);
    var exhibit = exhibits.find(function (e) { return e.id === id; });
    if (!exhibit) {
      return res.status(404).json({ success: false, message: '展点不存在' });
    }
    return R.success(res, { exhibit: exhibit });
  } catch (err) {
    return R.serverError(res, err, 'Read exhibit error');
  }
});

/**
 * POST /api/admin/exhibits/:id
 * 更新展点内容（标题、简介、正文、音频、视频）
 *
 * 请求体：{ title, summary, text, routeShort?, audio?, video? }
 * 成功：{ success: true, message: "保存成功" }
 */
router.post('/api/admin/exhibits/:id', async function (req, res) {
  var id = Number(req.params.id);
  if (!id || id < 1 || id > 4) {
    return R.fail(res, '无效的展点ID');
  }
  var body = req.body;
  if (!body.title || !body.summary || !body.text) {
    return R.fail(res, '标题、简介、内容不能为空');
  }
  try {
    var data = await readFileAsync(getDataPath(), 'utf8');
    var exhibits = JSON.parse(data);
    var index = exhibits.findIndex(function (e) { return e.id === id; });
    if (index === -1) {
      return res.status(404).json({ success: false, message: '展点不存在' });
    }
    exhibits[index].title = body.title;
    if (body.routeShort) exhibits[index].routeShort = body.routeShort;
    exhibits[index].summary = body.summary;
    exhibits[index].text = body.text;
    if (body.audio !== undefined) exhibits[index].audio = body.audio;
    if (body.video !== undefined) exhibits[index].video = body.video;
    await writeFileAsync(getDataPath(), JSON.stringify(exhibits, null, 2), 'utf8');
    return R.success(res, { message: '保存成功' });
  } catch (err) {
    return R.serverError(res, err, 'Update exhibit error');
  }
});

/**
 * GET /api/admin/export/checkins
 * 导出打卡记录为 CSV 文件（UTF-8 BOM）
 */
router.get('/api/admin/export/checkins', async function (req, res) {
  try {
    var rows = await db.allAsync(
      'SELECT user_identifier, exhibit_id, visited_at FROM visits ORDER BY visited_at DESC'
    );
    var csv = '用户标识,展点,打卡时间\n';
    rows.forEach(function (r) {
      csv += r.user_identifier + ',' + (EXHIBIT_NAMES[r.exhibit_id] || '未知') + ',' + r.visited_at + '\n';
    });
    sendCSV(res, 'checkins.csv', csv);
  } catch (err) {
    return R.serverError(res, err, 'Export checkins error');
  }
});

/**
 * GET /api/admin/export/flowers
 * 导出献花记录为 CSV 文件（UTF-8 BOM）
 */
router.get('/api/admin/export/flowers', async function (req, res) {
  try {
    var rows = await db.allAsync(
      'SELECT user_identifier, exhibit_id, created_at FROM flowers ORDER BY created_at DESC'
    );
    var csv = '用户标识,展点,献花时间\n';
    rows.forEach(function (r) {
      csv += r.user_identifier + ',' + (EXHIBIT_NAMES[r.exhibit_id] || '未知') + ',' + r.created_at + '\n';
    });
    sendCSV(res, 'flowers.csv', csv);
  } catch (err) {
    return R.serverError(res, err, 'Export flowers error');
  }
});

/**
 * GET /api/admin/export/quiz
 * 导出答题记录为 CSV 文件（UTF-8 BOM）
 */
router.get('/api/admin/export/quiz', async function (req, res) {
  try {
    var rows = await db.allAsync(
      'SELECT nickname, exhibit_id, score, created_at FROM quiz_records ORDER BY created_at DESC'
    );
    var csv = '昵称,展点,得分,答题时间\n';
    rows.forEach(function (r) {
      csv += r.nickname + ',' + (EXHIBIT_NAMES[r.exhibit_id] || '未知') + ',' + r.score + '/4,' + r.created_at + '\n';
    });
    sendCSV(res, 'quiz.csv', csv);
  } catch (err) {
    return R.serverError(res, err, 'Export quiz error');
  }
});

/**
 * GET /api/admin/export/all
 * 导出全部数据（打卡+献花+答题）为单个 CSV 文件
 */
router.get('/api/admin/export/all', async function (req, res) {
  try {
    var csv = '';

    var checkins = await db.allAsync('SELECT user_identifier, exhibit_id, visited_at FROM visits ORDER BY visited_at DESC');
    csv += '【打卡记录】\n用户标识,展点,打卡时间\n';
    checkins.forEach(function (r) {
      csv += r.user_identifier + ',' + (EXHIBIT_NAMES[r.exhibit_id] || '未知') + ',' + r.visited_at + '\n';
    });
    csv += '\n';

    var flowers = await db.allAsync('SELECT user_identifier, exhibit_id, created_at FROM flowers ORDER BY created_at DESC');
    csv += '【献花记录】\n用户标识,展点,献花时间\n';
    flowers.forEach(function (r) {
      csv += r.user_identifier + ',' + (EXHIBIT_NAMES[r.exhibit_id] || '未知') + ',' + r.created_at + '\n';
    });
    csv += '\n';

    var quiz = await db.allAsync('SELECT nickname, exhibit_id, score, created_at FROM quiz_records ORDER BY created_at DESC');
    csv += '【答题记录】\n昵称,展点,得分,答题时间\n';
    quiz.forEach(function (r) {
      csv += r.nickname + ',' + (EXHIBIT_NAMES[r.exhibit_id] || '未知') + ',' + r.score + '/4,' + r.created_at + '\n';
    });

    sendCSV(res, 'all_data.csv', csv);
  } catch (err) {
    return R.serverError(res, err, 'Export all error');
  }
});

/**
 * GET /api/admin/export-exhibits
 * 导出展点内容为 CSV 文件
 */
router.get('/api/admin/export-exhibits', async function (req, res) {
  try {
    var data = await readFileAsync(getDataPath(), 'utf8');
    var exhibits = JSON.parse(data);
    var csv = 'ID,标题,简短名称,简介,详细内容,音频路径,视频路径\n';
    exhibits.forEach(function (e) {
      csv += e.id + ',' + escapeCSV(e.title) + ',' + escapeCSV(e.routeShort) + ',' + escapeCSV(e.summary) + ',' + escapeCSV(e.text) + ',' + escapeCSV(e.audio || '') + ',' + escapeCSV(e.video || '') + '\n';
    });
    sendCSV(res, 'exhibits.csv', csv);
  } catch (err) {
    return R.serverError(res, err, 'Export exhibits error');
  }
});

/**
 * POST /api/admin/import-exhibits
 * 从 CSV 内容导入展点数据，更新 data/data.json
 *
 * 请求体：text/csv 格式的 CSV 字符串
 * 成功：{ success: true, message: "导入成功" }
 */
router.post('/api/admin/import-exhibits', express.text({ type: 'text/csv' }), async function (req, res) {
  var csvContent = req.body;
  if (!csvContent) {
    return R.fail(res, 'CSV 内容为空');
  }

  var lines = csvContent.split('\n').filter(function (line) { return line.trim(); });
  if (lines.length < 2) {
    return R.fail(res, 'CSV 格式错误：至少需要表头和一行数据');
  }

  try {
    var data = await readFileAsync(getDataPath(), 'utf8');
    var exhibits = JSON.parse(data);

    for (var i = 1; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      var values = [];
      var current = '';
      var inQuotes = false;

      for (var j = 0; j < line.length; j++) {
        var ch = line[j];
        if (ch === '"') {
          if (inQuotes && line[j + 1] === '"') {
            current += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          values.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
      values.push(current);

      if (values.length < 5) continue;

      var id = parseInt(values[0]);
      if (isNaN(id) || id < 1 || id > 4) continue;

      var idx = exhibits.findIndex(function (e) { return e.id === id; });
      if (idx !== -1) {
        exhibits[idx].title = values[1] || exhibits[idx].title;
        exhibits[idx].routeShort = values[2] || exhibits[idx].routeShort;
        exhibits[idx].summary = values[3] || exhibits[idx].summary;
        exhibits[idx].text = values[4] || exhibits[idx].text;
        if (values[5] !== undefined) exhibits[idx].audio = values[5];
        if (values[6] !== undefined) exhibits[idx].video = values[6];
      }
    }

    await writeFileAsync(getDataPath(), JSON.stringify(exhibits, null, 2), 'utf8');
    return R.success(res, { message: '导入成功' });
  } catch (err) {
    return R.serverError(res, err, 'Import exhibits error');
  }
});

/**
 * GET /admin
 * 返回管理后台 HTML 页面
 */
router.get('/admin', function (req, res) {
  res.sendFile(__dirname + '/../admin/index.html', function (err) {
    if (err) {
      console.error('sendFile error:', err);
      res.status(500).json({ error: 'Failed to serve admin page', details: err.message });
    }
  });
});

module.exports = router;
