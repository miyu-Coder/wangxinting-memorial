var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var utils = require('../utils');

var EXHIBIT_NAMES = utils.EXHIBIT_NAMES;
var SOUVENIR_MAP = utils.SOUVENIR_MAP;
var getRankingPrizeName = utils.getRankingPrizeName;
var addAdminLog = utils.addAdminLog;
var readFileAsync = utils.readFileAsync;
var writeFileAsync = utils.writeFileAsync;
var escapeCSV = utils.escapeCSV;
var sendCSV = utils.sendCSV;
var getDataPath = utils.getDataPath;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack) {
  var now = Date.now();
  var past = now - daysBack * 24 * 60 * 60 * 1000;
  var ts = past + Math.random() * (now - past);
  var d = new Date(ts);
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  var hh = String(d.getHours()).padStart(2, '0');
  var mi = String(d.getMinutes()).padStart(2, '0');
  var ss = String(d.getSeconds()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi + ':' + ss;
}

function shuffleArray(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

module.exports = function(db) {
  router.post('/admin/login', function(req, res) {
    var password = req.body.password;
    var adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (!password) {
      return res.status(400).json({ success: false, message: '请输入密码' });
    }

    if (password === adminPassword) {
      return res.json({ success: true, message: '登录成功' });
    } else {
      return res.status(401).json({ success: false, message: '密码错误' });
    }
  });

  router.get('/admin/messages', async function(req, res) {
    try {
      var rows = await db.allAsync(
        'SELECT id, nickname, content, status, created_at FROM messages ORDER BY id DESC'
      );
      return res.json({ success: true, list: rows });
    } catch (err) {
      console.error('Admin messages query error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.post('/admin/messages/:id/approve', async function(req, res) {
    var id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: '无效的 id' });
    try {
      await db.runAsync('UPDATE messages SET status = 1 WHERE id = ?', [id]);
      addAdminLog(db, '审核通过', '留言#' + id, '留言ID ' + id + ' 审核通过');
      return res.json({ success: true });
    } catch (err) {
      console.error('Approve message error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.post('/admin/messages/:id/reject', async function(req, res) {
    var id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: '无效的 id' });
    try {
      await db.runAsync('UPDATE messages SET status = 2 WHERE id = ?', [id]);
      addAdminLog(db, '审核拒绝', '留言#' + id, '留言ID ' + id + ' 审核拒绝');
      return res.json({ success: true });
    } catch (err) {
      console.error('Reject message error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.delete('/admin/messages/:id', async function(req, res) {
    var id = Number(req.params.id);
    if (!id || id < 1) return res.status(400).json({ success: false, message: '无效的 id' });
    try {
      await db.runAsync('DELETE FROM messages WHERE id = ?', [id]);
      addAdminLog(db, '删除留言', '留言#' + id, '留言ID ' + id + ' 已删除');
      return res.json({ success: true });
    } catch (err) {
      console.error('Delete message error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.get('/admin/exhibits', async function(req, res) {
    try {
      var data = await readFileAsync(getDataPath(), 'utf8');
      var exhibits = JSON.parse(data);
      var list = exhibits.map(function(e) {
        return { id: e.id, title: e.title, routeShort: e.routeShort };
      });
      return res.json({ success: true, list: list });
    } catch (err) {
      console.error('Read exhibits error:', err);
      return res.status(500).json({ success: false, message: '读取展点数据失败' });
    }
  });

  router.get('/admin/exhibits/:id', async function(req, res) {
    var id = Number(req.params.id);
    if (!id || id < 1 || id > 4) {
      return res.status(400).json({ success: false, message: '无效的展点ID' });
    }
    try {
      var data = await readFileAsync(getDataPath(), 'utf8');
      var exhibits = JSON.parse(data);
      var exhibit = exhibits.find(function(e) { return e.id === id; });
      if (!exhibit) {
        return res.status(404).json({ success: false, message: '展点不存在' });
      }
      return res.json({ success: true, exhibit: exhibit });
    } catch (err) {
      console.error('Read exhibit error:', err);
      return res.status(500).json({ success: false, message: '读取展点数据失败' });
    }
  });

  router.post('/admin/exhibits/:id', async function(req, res) {
    var id = Number(req.params.id);
    if (!id || id < 1 || id > 4) {
      return res.status(400).json({ success: false, message: '无效的展点ID' });
    }
    var body = req.body;
    if (!body.title || !body.summary || !body.text) {
      return res.status(400).json({ success: false, message: '标题、简介、内容不能为空' });
    }
    try {
      var data = await readFileAsync(getDataPath(), 'utf8');
      var exhibits = JSON.parse(data);
      var index = exhibits.findIndex(function(e) { return e.id === id; });
      if (index === -1) {
        return res.status(404).json({ success: false, message: '展点不存在' });
      }
      exhibits[index].title = body.title;
      if (body.routeShort) exhibits[index].routeShort = body.routeShort;
      exhibits[index].summary = body.summary;
      exhibits[index].text = body.text;
      if (body.audio !== undefined) exhibits[index].audio = body.audio;
      if (body.video !== undefined) exhibits[index].video = body.video;
      exhibits[index].updated_at = new Date().toISOString();
      await writeFileAsync(getDataPath(), JSON.stringify(exhibits, null, 2), 'utf8');
      addAdminLog(db, '修改展点', '展点#' + id, '展点 ' + body.title + ' 内容已更新');
      return res.json({ success: true, message: '保存成功' });
    } catch (err) {
      console.error('Update exhibit error:', err);
      return res.status(500).json({ success: false, message: '保存展点数据失败' });
    }
  });

  router.post('/admin/exhibits/:id/quiz', function(req, res) {
    var id = Number(req.params.id);
    if (!id || id < 1 || id > 4) {
      return res.status(400).json({ success: false, message: '无效的展点ID' });
    }
    var questions = req.body.questions;
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ success: false, message: '题目数据无效' });
    }
    var dataPath = getDataPath();
    fs.readFile(dataPath, 'utf8', function(err, data) {
      if (err) {
        console.error('Read exhibits error:', err);
        return res.status(500).json({ success: false, message: '读取展点数据失败' });
      }
      try {
        var exhibits = JSON.parse(data);
        var index = exhibits.findIndex(function(e) { return e.id === id; });
        if (index === -1) {
          return res.status(404).json({ success: false, message: '展点不存在' });
        }
        if (!exhibits[index].quiz) exhibits[index].quiz = {};
        exhibits[index].quiz.questions = questions;
        exhibits[index].updated_at = new Date().toISOString();
        fs.writeFile(dataPath, JSON.stringify(exhibits, null, 2), 'utf8', function(writeErr) {
          if (writeErr) {
            console.error('Write quiz error:', writeErr);
            return res.status(500).json({ success: false, message: '保存题目数据失败' });
          }
          addAdminLog(db, '修改题目', '展点#' + id, '展点 ' + id + ' 题目已更新');
          return res.json({ success: true, message: '题目保存成功' });
        });
      } catch (parseErr) {
        return res.status(500).json({ success: false, message: '解析展点数据失败' });
      }
    });
  });

  router.get('/admin/export/checkins', async function(req, res) {
    try {
      var rows = await db.allAsync(
        'SELECT user_identifier, exhibit_id, visited_at FROM visits ORDER BY visited_at DESC'
      );
      var csv = '用户标识,展点,打卡时间\n';
      rows.forEach(function(r) {
        csv += r.user_identifier + ',' + (EXHIBIT_NAMES[r.exhibit_id] || '未知') + ',' + r.visited_at + '\n';
      });
      sendCSV(res, 'checkins.csv', csv);
      addAdminLog(db, '导出数据', '打卡数据', '导出 ' + rows.length + ' 条打卡记录');
    } catch (err) {
      console.error('Export checkins error:', err);
      res.status(500).json({ success: false, message: '导出失败' });
    }
  });

  router.get('/admin/export/flowers', async function(req, res) {
    try {
      var rows = await db.allAsync(
        'SELECT user_identifier, exhibit_id, created_at FROM flowers ORDER BY created_at DESC'
      );
      var csv = '用户标识,展点,献花时间\n';
      rows.forEach(function(r) {
        csv += r.user_identifier + ',' + (EXHIBIT_NAMES[r.exhibit_id] || '未知') + ',' + r.created_at + '\n';
      });
      sendCSV(res, 'flowers.csv', csv);
      addAdminLog(db, '导出数据', '献花数据', '导出 ' + rows.length + ' 条献花记录');
    } catch (err) {
      console.error('Export flowers error:', err);
      res.status(500).json({ success: false, message: '导出失败' });
    }
  });

  router.get('/admin/export/quiz', async function(req, res) {
    try {
      var rows = await db.allAsync(
        'SELECT nickname, exhibit_id, score, created_at FROM quiz_records ORDER BY created_at DESC'
      );
      var csv = '昵称,展点,得分,答题时间\n';
      rows.forEach(function(r) {
        csv += r.nickname + ',' + (EXHIBIT_NAMES[r.exhibit_id] || '未知') + ',"=' + r.score + '/4",' + r.created_at + '\n';
      });
      sendCSV(res, 'quiz.csv', csv);
      addAdminLog(db, '导出数据', '答题数据', '导出 ' + rows.length + ' 条答题记录');
    } catch (err) {
      console.error('Export quiz error:', err);
      res.status(500).json({ success: false, message: '导出失败' });
    }
  });

  router.get('/admin/export/souvenir', async function(req, res) {
    var status = req.query.status || 'all';
    try {
      var sql = 'SELECT * FROM souvenir_orders ORDER BY created_at DESC';
      var params = [];
      if (status === '0' || status === '1') {
        sql = 'SELECT * FROM souvenir_orders WHERE status = ? ORDER BY created_at DESC';
        params = [Number(status)];
      }
      var rows = await db.allAsync(sql, params);
      var statusNames = { 0: '待领取', 1: '已领取' };
      var csv = '昵称,展点,奖品名称,姓名,手机号,状态,预约时间\n';
      rows.forEach(function(r) {
        csv += r.nickname + ',' + (r.exhibit_id || '') + ',' + (r.prize_name || SOUVENIR_MAP[r.exhibit_id] || '纪念品') + ',' + r.name + ',' + r.phone + ',' + (statusNames[r.status] || '未知') + ',' + r.created_at + '\n';
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent('纪念品预约数据.csv'));
      res.send('\uFEFF' + csv);
      addAdminLog(db, '导出数据', '纪念品预约', '导出 ' + rows.length + ' 条预约记录');
    } catch (err) {
      console.error('Export souvenir error:', err);
      res.status(500).json({ success: false, message: '导出失败' });
    }
  });

  router.get('/admin/export/all', async function(req, res) {
    try {
      var csv = '';

      var checkins = await db.allAsync('SELECT user_identifier, exhibit_id, visited_at FROM visits ORDER BY visited_at DESC');
      csv += '【打卡记录】\n用户标识,展点,打卡时间\n';
      checkins.forEach(function(r) {
        csv += r.user_identifier + ',' + (EXHIBIT_NAMES[r.exhibit_id] || '未知') + ',' + r.visited_at + '\n';
      });
      csv += '\n';

      var flowers = await db.allAsync('SELECT user_identifier, exhibit_id, created_at FROM flowers ORDER BY created_at DESC');
      csv += '【献花记录】\n用户标识,展点,献花时间\n';
      flowers.forEach(function(r) {
        csv += r.user_identifier + ',' + (EXHIBIT_NAMES[r.exhibit_id] || '未知') + ',' + r.created_at + '\n';
      });
      csv += '\n';

      var quiz = await db.allAsync('SELECT nickname, exhibit_id, score, created_at FROM quiz_records ORDER BY created_at DESC');
      csv += '【答题记录】\n昵称,展点,得分,答题时间\n';
      quiz.forEach(function(r) {
        csv += r.nickname + ',' + (EXHIBIT_NAMES[r.exhibit_id] || '未知') + ',"=' + r.score + '/4",' + r.created_at + '\n';
      });

      sendCSV(res, 'all_data.csv', csv);
    } catch (err) {
      console.error('Export all error:', err);
      res.status(500).json({ success: false, message: '导出失败' });
    }
  });

  router.get('/admin/export-exhibits', async function(req, res) {
    try {
      var data = await readFileAsync(getDataPath(), 'utf8');
      var exhibits = JSON.parse(data);
      var csv = 'ID,标题,简短名称,简介,详细内容,音频路径,视频路径\n';
      exhibits.forEach(function(e) {
        csv += e.id + ',' + escapeCSV(e.title) + ',' + escapeCSV(e.routeShort) + ',' + escapeCSV(e.summary) + ',' + escapeCSV(e.text) + ',' + escapeCSV(e.audio || '') + ',' + escapeCSV(e.video || '') + '\n';
      });
      sendCSV(res, 'exhibits.csv', csv);
    } catch (err) {
      console.error('Export exhibits error:', err);
      res.status(500).json({ success: false, message: '读取展点数据失败' });
    }
  });

  router.post('/admin/import-exhibits', express.text({ type: 'text/csv' }), async function(req, res) {
    var csvContent = req.body;
    if (!csvContent) {
      return res.status(400).json({ success: false, message: 'CSV 内容为空' });
    }

    var lines = csvContent.split('\n').filter(function(line) { return line.trim(); });
    if (lines.length < 2) {
      return res.status(400).json({ success: false, message: 'CSV 格式错误：至少需要表头和一行数据' });
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

        var idx = exhibits.findIndex(function(e) { return e.id === id; });
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
      addAdminLog(db, '导入CSV', '展点数据', '导入展点 CSV 数据');
      res.json({ success: true, message: '导入成功' });
    } catch (err) {
      console.error('Import exhibits error:', err);
      res.status(500).json({ success: false, message: '解析数据失败' });
    }
  });

  router.get('/admin/logs', async function(req, res) {
    try {
      var action = req.query.action || '';
      var sql = 'SELECT * FROM admin_logs';
      var params = [];
      if (action) {
        sql += ' WHERE action = ?';
        params.push(action);
      }
      sql += ' ORDER BY created_at DESC LIMIT 200';
      var rows = await db.allAsync(sql, params);
      return res.json({ success: true, list: rows || [] });
    } catch (err) {
      console.error('Get admin logs error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.get('/admin/quiz/time-stats', async function(req, res) {
    try {
      var avgRow = await db.getAsync(
        "SELECT AVG(CAST(time_cost AS REAL)) as avg_time FROM quiz_records WHERE time_cost > 0"
      );
      var fastestRow = await db.getAsync(
        "SELECT time_cost, nickname FROM quiz_records WHERE time_cost > 0 ORDER BY time_cost ASC LIMIT 1"
      );
      var exhibitTimes = await db.allAsync(
        "SELECT exhibit_id, AVG(CAST(time_cost AS REAL)) as avg_time FROM quiz_records WHERE time_cost > 0 GROUP BY exhibit_id ORDER BY exhibit_id"
      );
      var exhibitCounts = await db.allAsync(
        "SELECT exhibit_id, COUNT(*) as cnt FROM quiz_records GROUP BY exhibit_id ORDER BY exhibit_id"
      );

      var avgTime = avgRow && avgRow.avg_time ? Math.round(avgRow.avg_time) : 0;
      var fastestTime = fastestRow ? fastestRow.time_cost : 0;
      var fastestUser = fastestRow ? fastestRow.nickname : '--';

      return res.json({
        success: true,
        avgTime: avgTime,
        fastestTime: fastestTime,
        fastestUser: fastestUser,
        exhibitTimes: exhibitTimes.map(function(r) { return { exhibit_id: r.exhibit_id, avg_time: Math.round(r.avg_time) }; }),
        exhibitCounts: exhibitCounts.map(function(r) { return { exhibit_id: r.exhibit_id, count: r.cnt }; })
      });
    } catch (err) {
      console.error('Quiz time stats error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.get('/admin/quiz/advanced-stats', async function(req, res) {
    try {
      var avgTimeRow = await db.getAsync(
        "SELECT AVG(CAST((julianday(created_at) - julianday(completed_at)) * 86400000 AS REAL)) as avg_ms FROM quiz_records WHERE completed_at IS NOT NULL"
      );
      var fastestRow = await db.getAsync(
        "SELECT MIN(CAST((julianday(created_at) - julianday(completed_at)) * 86400000 AS REAL)) as min_ms FROM quiz_records WHERE completed_at IS NOT NULL"
      );
      var totalRow = await db.getAsync('SELECT COUNT(*) as total FROM quiz_records');
      var uniqueRow = await db.getAsync('SELECT COUNT(DISTINCT nickname) as unique_users FROM quiz_records');
      var fullScoreRow = await db.getAsync('SELECT COUNT(*) as cnt FROM quiz_records WHERE score = 4');

      var avgMs = avgTimeRow && avgTimeRow.avg_ms ? Math.round(avgTimeRow.avg_ms) : 0;
      var minMs = fastestRow && fastestRow.min_ms ? Math.round(fastestRow.min_ms) : 0;

      return res.json({
        success: true,
        avgCompletionTime: avgMs,
        fastestCompletionTime: minMs,
        totalRecords: totalRow ? totalRow.total : 0,
        uniqueUsers: uniqueRow ? uniqueRow.unique_users : 0,
        completionRate: totalRow && totalRow.total > 0 ? Math.round((uniqueRow.unique_users / totalRow.total) * 100) : 0,
        fullScoreCount: fullScoreRow ? fullScoreRow.cnt : 0
      });
    } catch (err) {
      console.error('Advanced quiz stats error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.get('/admin/souvenir/list', async function(req, res) {
    var status = req.query.status;
    try {
      var sql = 'SELECT * FROM souvenir_orders ORDER BY created_at DESC';
      var params = [];
      if (status === '0' || status === '1') {
        sql = 'SELECT * FROM souvenir_orders WHERE status = ? ORDER BY created_at DESC';
        params = [Number(status)];
      }
      var rows = await db.allAsync(sql, params);
      rows.forEach(function(r) {
        if (!r.prize_name) {
          if (r.order_type === 'ranking') {
            r.prize_name = getRankingPrizeName(0);
          } else {
            r.prize_name = SOUVENIR_MAP[r.exhibit_id] || '纪念品';
          }
          db.runAsync('UPDATE souvenir_orders SET prize_name = ? WHERE id = ?', [r.prize_name, r.id]).catch(function() {});
        }
        r.souvenir_name = r.prize_name;
      });
      return res.json({ success: true, list: rows });
    } catch (err) {
      console.error('Souvenir list error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.post('/admin/souvenir/:id/deliver', async function(req, res) {
    var id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID 无效' });
    try {
      await db.runAsync('UPDATE souvenir_orders SET status = 1 WHERE id = ?', [id]);
      addAdminLog(db, '标记领取', '纪念品', '纪念品预约 ID=' + id + ' 已领取');
      return res.json({ success: true, message: '已标记为领取' });
    } catch (err) {
      console.error('Souvenir deliver error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.get('/souvenir/check', async function(req, res) {
    var nickname = req.query.nickname;
    var orderType = req.query.orderType || '';
    if (!nickname) {
      return res.status(400).json({ success: false, message: '缺少昵称参数' });
    }
    try {
      var sql = 'SELECT * FROM souvenir_orders WHERE nickname = ?';
      var params = [nickname.trim()];
      if (orderType) {
        sql += ' AND order_type = ?';
        params.push(orderType);
      }
      sql += ' LIMIT 1';
      var order = await db.getAsync(sql, params);
      if (order) {
        return res.json({ success: true, order: order });
      } else {
        return res.json({ success: true, order: null });
      }
    } catch (err) {
      console.error('Souvenir check error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.post('/souvenir/order', async function(req, res) {
    var nickname = req.body.nickname;
    var exhibitId = req.body.exhibitId;
    var name = req.body.name;
    var phone = req.body.phone;
    var orderType = req.body.orderType;
    var prizeName = req.body.prizeName;

    if (!nickname || exhibitId === undefined || exhibitId === null || !name || !phone) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }
    if (![0, 1, 2, 3, 4].includes(Number(exhibitId))) {
      return res.status(400).json({ success: false, message: '展点 ID 无效' });
    }
    if (!/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: '手机号格式不正确' });
    }
    try {
      var ot = orderType || 'exhibit';
      var pn = '';
      if (ot === 'ranking') {
        var rank = req.body.rank || req.body.ranking;
        pn = getRankingPrizeName(rank ? Number(rank) : 0);
      } else {
        pn = prizeName || SOUVENIR_MAP[exhibitId] || '纪念品';
      }
      var existingCond = ot === 'ranking'
        ? 'SELECT id FROM souvenir_orders WHERE nickname = ? AND order_type = ?'
        : 'SELECT id FROM souvenir_orders WHERE nickname = ? AND exhibit_id = ? AND order_type = ?';
      var existingParams = ot === 'ranking'
        ? [nickname.trim(), 'ranking']
        : [nickname.trim(), exhibitId, 'exhibit'];
      var existing = await db.allAsync(existingCond, existingParams);
      if (existing.length > 0) {
        return res.json({ success: false, message: '您已预约过该奖品', already: true });
      }
      await db.runAsync(
        "INSERT INTO souvenir_orders (nickname, exhibit_id, name, phone, status, order_type, prize_name, created_at) VALUES (?, ?, ?, ?, 0, ?, ?, datetime('now'))",
        [nickname.trim(), exhibitId, name.trim(), phone.trim(), ot, pn]
      );
      return res.json({ success: true, message: '预约成功' });
    } catch (err) {
      console.error('Souvenir order error:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

  router.post('/admin/generate-demo-data', async function(req, res) {
    var nicknames = [
      "小红的爷爷","老兵张建国","团委李老师","孝感小陈","二班王同学",
      "退役军人老刘","党史爱好者","默默的花","向阳花开","赤子之心",
      "将军故里人","红色种子","北庙村村民","朋兴乡小李","孝南一中团委",
      "湖北大学实践队","山河已无恙","这盛世如您所愿","95后新党员","10后红领巾",
      "带着孩子来学习","老区人民","退役军人服务站","红色讲解员小周","参观者",
      "武汉理工小赵","黄冈老党员","孝昌退休教师","应城小杨","安陆红色之旅",
      "云梦小分队","大悟老战士","汉川青年团","随州老兵后代","襄阳参观团",
      "宜昌红色传承","荆州老班长","咸宁新兵连","黄陂小老乡","麻城红军后人",
      "红安小将军","浠水小分队","蕲春红色记忆","武穴老兵之家","孝感学院张教授",
      "华中科大实践组","武大历史系小队","华师马院学子","理工大志愿者","地大红色研学",
      "中南民大支教团","江大青年协会","湖工红色社团","武体军训教官","湖美设计小队",
      "老兵后代小李","军嫂小王","消防员小张","武警退伍老兵","空军退役老赵",
      "海军老班长","陆军退役战士","火箭军老兵","战略支援老周","预备役小刘"
    ];

    var messagePool = [
      "带爷爷来看他年轻时最敬仰的将军，爷爷红了眼眶。",
      "展馆做得很好，孩子听得很认真，一直问将军的故事。",
      "从武汉特意过来的，不虚此行，深受教育。",
      "学校组织的社会实践，对那段历史有了更直观的认识。",
      "向王新亭将军致敬！今天的和平来之不易。",
      "馆内实物很多，照片珍贵，值得细细参观。",
      "志愿者讲解得很详细，了解了很多将军的细节故事。",
      "生在和平年代，更应铭记历史，砥砺前行。",
      "爷爷是老党员，在这里找到了很多共鸣。",
      "香城固战斗那段看得热血沸腾，将军有勇有谋。",
      "故居很简朴，更能体会将军从贫苦农家走出的不易。",
      "广场很庄重，献花表达了我们的敬意。",
      "看到59式坦克实物很震撼，国防教育的好地方。",
      "感谢有这样的红色基地，让后辈了解先辈的付出。",
      "周末带孩子来熏陶，比书本上的历史更生动。",
      "展陈设计很用心，四个单元脉络清晰。",
      "老一辈革命家的精神值得我们永远学习。",
      "孝感的骄傲，中国人民的骄傲。",
      "从学徒到将军，将军的一生是奋斗的一生。",
      "三战三捷，打得漂亮！",
      "向386旅的英烈们致敬！",
      "传承红色基因，担当强军重任。",
      "有空还会再来，每次都有新的感悟。",
      "推荐给身边的朋友了，很不错的红色教育基地。",
      "希望这样的基地越来越多，让红色精神代代传。",
      "将军从孝感走出，是这片土地的骄傲。",
      "站在广场上，心中升起无限敬意。",
      "孩子说长大也要像将军一样保家卫国。",
      "每一件展品背后都有一段动人的故事。",
      "这里不仅是一个展馆，更是一堂生动的党史课。",
      "将军的勤俭作风让我深受触动。",
      "386旅的战绩让人肃然起敬。",
      "太岳军区的历史在这里得到了很好的呈现。",
      "看完展览，对解放战争有了更深的理解。",
      "将军的军事才能令人叹服，真正的军事家。",
      "从贫苦农家到开国上将，这就是信仰的力量。",
      "故居的一砖一瓦都在诉说着历史。",
      "今天幸福的生活是无数先烈用鲜血换来的。",
      "带孩子来接受红色教育，比课堂更直观。",
      "将军的战功赫赫，但为人谦逊，值得学习。",
      "陈列馆的讲解很专业，工作人员辛苦了。",
      "广场上的坦克是孩子们最喜欢的展品。",
      "红色旅游就应该这样，有实物有故事有感动。",
      "作为一名退伍军人，在这里找到了归属感。",
      "将军的故事激励着我们在新时代继续奋斗。",
      "希望更多的年轻人来这里感受红色文化。",
      "参观完心情久久不能平静，太震撼了。",
      "这是我来过最好的红色教育基地之一。",
      "将军的精神永存，激励后人前行。",
      "站在将军故居前，仿佛穿越了时空。"
    ];

    var exhibitWeights = [
      { id: 1, weight: 30 },
      { id: 2, weight: 25 },
      { id: 3, weight: 25 },
      { id: 4, weight: 20 }
    ];

    function weightedExhibit() {
      var r = Math.random() * 100;
      var acc = 0;
      for (var i = 0; i < exhibitWeights.length; i++) {
        acc += exhibitWeights[i].weight;
        if (r < acc) return exhibitWeights[i].id;
      }
      return 1;
    }

    var scoreWeights = [
      { score: 4, weight: 30 },
      { score: 3, weight: 35 },
      { score: 2, weight: 25 },
      { score: 1, weight: 10 }
    ];

    function weightedScore() {
      var r = Math.random() * 100;
      var acc = 0;
      for (var i = 0; i < scoreWeights.length; i++) {
        acc += scoreWeights[i].weight;
        if (r < acc) return scoreWeights[i].score;
      }
      return 3;
    }

    try {
      await db.runAsync('BEGIN TRANSACTION');
      var visitCount = randomInt(80, 140);
      var shuffledNicks = shuffleArray(nicknames);
      for (var i = 0; i < visitCount; i++) {
        var dt = randomDate(30);
        var eid = weightedExhibit();
        var nn = shuffledNicks[i % shuffledNicks.length];
        var uid = 'demo_' + nn + '_' + randomInt(1000, 9999);
        await db.runAsync(
          "INSERT OR IGNORE INTO visits (user_identifier, exhibit_id, nickname, visited_at) VALUES (?, ?, ?, ?)",
          [uid, eid, nn, dt]
        );
      }

      var flowerCount = randomInt(70, 120);
      var shuffledNicks2 = shuffleArray(nicknames);
      for (var i = 0; i < flowerCount; i++) {
        var dt = randomDate(30);
        var eid = weightedExhibit();
        var nn = shuffledNicks2[i % shuffledNicks2.length];
        var uid = 'demo_' + nn + '_' + randomInt(1000, 9999);
        await db.runAsync(
          "INSERT OR IGNORE INTO flowers (user_identifier, exhibit_id, nickname, created_at) VALUES (?, ?, ?, ?)",
          [uid, eid, nn, dt]
        );
      }

      var quizCount = randomInt(60, 100);
      var shuffledNicks3 = shuffleArray(nicknames);
      var quizInserted = {};
      for (var i = 0; i < quizCount; i++) {
        var dt = randomDate(30);
        var eid = randomInt(1, 4);
        var sc = weightedScore();
        var nn = shuffledNicks3[i % shuffledNicks3.length];
        var quizKey = nn + '_' + eid;
        if (quizInserted[quizKey]) continue;
        quizInserted[quizKey] = true;
        var tc = randomInt(30, 180);
        var completedAt = new Date(new Date(dt).getTime() - tc * 1000).toISOString().replace('T', ' ').substring(0, 19);
        await db.runAsync(
          "INSERT INTO quiz_records (nickname, exhibit_id, score, completed_at, time_cost, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [nn, eid, sc, completedAt, tc, dt]
        );
      }

      var msgCount = randomInt(35, 60);
      var shuffledMsgs = shuffleArray(messagePool);
      var shuffledNicks4 = shuffleArray(nicknames);
      for (var i = 0; i < msgCount; i++) {
        var dt = randomDate(30);
        var nn = shuffledNicks4[i % shuffledNicks4.length];
        var content = shuffledMsgs[i % shuffledMsgs.length];
        var r = Math.random() * 100;
        var status = r < 20 ? 0 : (r < 80 ? 1 : 2);
        await db.runAsync(
          "INSERT INTO messages (nickname, content, status, created_at) VALUES (?, ?, ?, ?)",
          [nn, content, status, dt]
        );
      }

      var souvenirCount = randomInt(10, 25);
      var perfectQuizzes = await db.allAsync(
        "SELECT nickname, exhibit_id, created_at FROM quiz_records WHERE score = 4 ORDER BY RANDOM() LIMIT ?",
        [souvenirCount * 2]
      );
      var souvenirNames = ["张明","李华","王芳","赵强","刘洋","陈静","杨磊","黄丽","周伟","吴敏","孙涛","马秀英","朱建国","胡志远","林小红"];
      for (var i = 0; i < Math.min(souvenirCount, perfectQuizzes.length); i++) {
        var pq = perfectQuizzes[i];
        var sName = randomPick(souvenirNames);
        var sPhone = '1' + randomInt(30, 89) + randomInt(1000, 9999) + randomInt(100, 999);
        var sStatus = Math.random() < 0.7 ? 0 : 1;
        var sCreatedAt = pq.created_at;
        var sPrizeName = SOUVENIR_MAP[pq.exhibit_id] || '纪念品';
        await db.runAsync(
          "INSERT INTO souvenir_orders (nickname, exhibit_id, name, phone, status, order_type, prize_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [pq.nickname, pq.exhibit_id, sName, sPhone, sStatus, 'exhibit', sPrizeName, sCreatedAt]
        );
      }

      var pageDist = [
        { page: 'index', weight: 30 },
        { page: 'detail_1', weight: 20 },
        { page: 'detail_2', weight: 18 },
        { page: 'detail_3', weight: 17 },
        { page: 'detail_4', weight: 15 }
      ];

      function weightedPage() {
        var r = Math.random() * 100;
        var acc = 0;
        for (var i = 0; i < pageDist.length; i++) {
          acc += pageDist[i].weight;
          if (r < acc) return pageDist[i].page;
        }
        return 'index';
      }

      var totalSessions = randomInt(30, 50);
      var allSessionIds = [];
      for (var si = 0; si < totalSessions; si++) {
        allSessionIds.push('demo_sid_' + si + '_' + randomInt(1000, 9999));
      }

      var pvRows = [];
      for (var d = 29; d >= 0; d--) {
        var dateObj = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
        var isWe = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        var dateStr = dateObj.getFullYear() + '-' +
          String(dateObj.getMonth() + 1).padStart(2, '0') + '-' +
          String(dateObj.getDate()).padStart(2, '0');

        var dayUV = randomInt(12, 22);
        if (isWe) dayUV = Math.round(dayUV * (1 + (Math.random() * 0.2 + 0.3)));

        var shuffled = allSessionIds.slice().sort(function() { return Math.random() - 0.5; });
        var daySessions = shuffled.slice(0, Math.min(dayUV, shuffled.length));

        for (var sIdx = 0; sIdx < daySessions.length; sIdx++) {
          var sid = daySessions[sIdx];
          var pagesPerSession = randomInt(2, 4);
          for (var p = 0; p < pagesPerSession; p++) {
            var pg = weightedPage();
            var hh = String(randomInt(8, 21)).padStart(2, '0');
            var mi = String(randomInt(0, 59)).padStart(2, '0');
            var ss = String(randomInt(0, 59)).padStart(2, '0');
            pvRows.push([pg, sid, dateStr + ' ' + hh + ':' + mi + ':' + ss]);
          }
        }

        var revisitCount = randomInt(1, 3);
        for (var ri = 0; ri < revisitCount; ri++) {
          var rsid = daySessions[randomInt(0, daySessions.length - 1)];
          var rPages = randomInt(1, 3);
          for (var rp = 0; rp < rPages; rp++) {
            var rpg = weightedPage();
            var rhh = String(randomInt(8, 21)).padStart(2, '0');
            var rmi = String(randomInt(0, 59)).padStart(2, '0');
            var rss = String(randomInt(0, 59)).padStart(2, '0');
            pvRows.push([rpg, rsid, dateStr + ' ' + rhh + ':' + rmi + ':' + rss]);
          }
        }
      }

      var stmt = await new Promise(function(resolve, reject) {
        db.prepare('INSERT INTO page_views (page, session_id, visit_time) VALUES (?, ?, ?)', function(err) {
          if (err) reject(err);
          else resolve(this);
        });
      });
      for (var ri = 0; ri < pvRows.length; ri++) {
        await new Promise(function(resolve, reject) {
          stmt.run(pvRows[ri][0], pvRows[ri][1], pvRows[ri][2], function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      await new Promise(function(resolve, reject) {
        stmt.finalize(function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      await db.runAsync(
        "INSERT INTO admin_logs (action, target, detail, created_at) VALUES (?, ?, ?, datetime('now'))",
        ['生成数据', '系统', '生成了演示数据：' + visitCount + '条打卡, ' + flowerCount + '条献花, ' + quizCount + '条答题, ' + msgCount + '条留言, ' + souvenirCount + '条预约, 30天页面访问']
      );

      await db.runAsync('COMMIT');
      return res.json({
        success: true,
        message: '演示数据生成成功',
        stats: {
          visits: visitCount,
          flowers: flowerCount,
          quizzes: quizCount,
          messages: msgCount,
          souvenirs: souvenirCount,
          pageViews: '30天'
        }
      });
    } catch (err) {
      await db.runAsync('ROLLBACK').catch(function() {});
      console.error('Generate demo data error:', err);
      return res.status(500).json({ success: false, message: '生成失败：' + err.message });
    }
  });

  router.post('/admin/clear-test-data', async function(req, res) {
    try {
      await db.runAsync('BEGIN TRANSACTION');
      await db.runAsync('DELETE FROM visits');
      await db.runAsync('DELETE FROM flowers');
      await db.runAsync('DELETE FROM quiz_records');
      await db.runAsync('DELETE FROM messages');
      await db.runAsync('DELETE FROM souvenir_orders');
      await db.runAsync('DELETE FROM page_views');

      await db.runAsync(
        "INSERT INTO admin_logs (action, target, detail, created_at) VALUES (?, ?, ?, datetime('now'))",
        ['清空数据', '系统', '清空了所有测试数据']
      );

      await db.runAsync('COMMIT');
      return res.json({ success: true, message: '测试数据已全部清空' });
    } catch (err) {
      await db.runAsync('ROLLBACK').catch(function() {});
      console.error('Clear test data error:', err);
      return res.status(500).json({ success: false, message: '清空失败：' + err.message });
    }
  });

  return router;
};
