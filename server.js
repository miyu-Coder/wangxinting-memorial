require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const ua = req.get('User-Agent') || '';
  req.userIdentifier = crypto.createHash('md5').update(ip + ua).digest('hex').substring(0, 16);
  next();
});

// 数据库连接
const db = new sqlite3.Database('./data.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database at ./data.db');
  initDatabase();
});

// Promise 化的数据库方法
db.runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

db.getAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Promise wrapper for db.all
db.allAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// 初始化数据库表
function initDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_identifier TEXT NOT NULL,
      exhibit_id INTEGER NOT NULL,
      visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_identifier, exhibit_id)
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create visits table:', err.message);
    } else {
      console.log('Table visits ready');
    }
  });
  db.run(`
    CREATE TABLE IF NOT EXISTS flowers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_identifier TEXT NOT NULL,
      exhibit_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_identifier, exhibit_id)
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create flowers table:', err.message);
    } else {
      console.log('Table flowers ready');
    }
  });
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL,
      content TEXT NOT NULL,
      status INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create messages table:', err.message);
    } else {
      console.log('Table messages ready');
    }
  });
  db.run(`
    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page VARCHAR(50),
      session_id VARCHAR(32),
      visit_time DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create page_views table:', err.message);
    } else {
      console.log('Table page_views ready');
    }
  });
  db.run(`
    CREATE TABLE IF NOT EXISTS quiz_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL,
      exhibit_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create quiz_records table:', err.message);
    } else {
      console.log('Table quiz_records ready');
    }
  });
}

// ===== 打卡 (checkin) 接口 =====
// POST /api/checkin
app.post('/api/checkin', async (req, res) => {
  const { exhibitId } = req.body;
  const userIdentifier = req.userIdentifier;

  if (!exhibitId || ![1, 2, 3, 4].includes(Number(exhibitId))) {
    return res.status(400).json({ success: false, message: '展点 ID 必须为 1-4' });
  }

  try {
    await db.runAsync(
      "INSERT INTO visits (user_identifier, exhibit_id, visited_at) VALUES (?, ?, datetime('now'))",
      [userIdentifier, exhibitId]
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

// GET /api/checkin/stats - 各展点打卡人数统计
app.get('/api/checkin/stats', async (req, res) => {
  try {
    const rows = await db.allAsync(
      'SELECT exhibit_id, COUNT(*) AS cnt FROM visits GROUP BY exhibit_id'
    );
    const stats = { '1': 0, '2': 0, '3': 0, '4': 0 };
    rows.forEach(r => { stats[String(r.exhibit_id)] = r.cnt; });
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('Checkin stats error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /api/checkin/:exhibitId  - 当前用户是否已打卡
app.get('/api/checkin/:exhibitId', async (req, res) => {
  const { exhibitId } = req.params;
  const userIdentifier = req.userIdentifier;

  if (![1, 2, 3, 4].includes(Number(exhibitId))) {
    return res.status(400).json({ success: false, message: '展点 ID 必须为 1-4' });
  }

  try {
    const row = await db.getAsync(
      'SELECT visited_at FROM visits WHERE user_identifier = ? AND exhibit_id = ? LIMIT 1',
      [userIdentifier, exhibitId]
    );
    return res.json({ success: true, hasCheckedIn: !!row, visited_at: row ? row.visited_at : null });
  } catch (err) {
    console.error('Checkin status error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ===== 答题记录接口 =====
// POST /api/quiz/submit - 提交答题记录
app.post('/api/quiz/submit', async (req, res) => {
  const { nickname, exhibitId, score } = req.body;

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
    const existing = await db.getAsync(
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
    return res.json({ success: true, message: '答题记录已保存' });
  } catch (err) {
    console.error('Quiz submit error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /api/quiz/records - 获取答题记录列表
app.get('/api/quiz/records', async (req, res) => {
  const { exhibitId } = req.query;

  try {
    let sql = `
      SELECT id, nickname, exhibit_id, score, created_at
      FROM quiz_records
    `;
    const params = [];

    if (exhibitId && [1, 2, 3, 4].includes(Number(exhibitId))) {
      sql += ' WHERE exhibit_id = ?';
      params.push(Number(exhibitId));
    }

    sql += ' ORDER BY created_at DESC LIMIT 100';

    const rows = await db.allAsync(sql, params);
    return res.json({ success: true, data: rows || [] });
  } catch (err) {
    console.error('Quiz records error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /api/quiz/stats - 各展点答题统计
app.get('/api/quiz/stats', async (req, res) => {
  try {
    const rows = await db.allAsync(`
      SELECT 
        exhibit_id,
        AVG(score) as avg_score,
        COUNT(*) as total_count,
        SUM(CASE WHEN score = 4 THEN 1 ELSE 0 END) as full_score_count
      FROM quiz_records
      GROUP BY exhibit_id
    `);

    const stats = { '1': null, '2': null, '3': null, '4': null };
    rows.forEach(r => {
      stats[String(r.exhibit_id)] = {
        avgScore: Math.round(r.avg_score * 10) / 10,
        totalCount: r.total_count,
        fullScoreCount: r.full_score_count
      };
    });

    return res.json({ success: true, stats });
  } catch (err) {
    console.error('Quiz stats error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ===== 页面访问统计接口 =====
// POST /api/track/page - 记录页面访问
app.post('/api/track/page', async (req, res) => {
  const { page, session_id } = req.body;
  
  const validPages = ['index', 'detail_1', 'detail_2', 'detail_3', 'detail_4', 'flower-wall'];
  if (!page || !validPages.includes(page)) {
    return res.status(400).json({ success: false, message: '无效的页面标识' });
  }
  
  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ success: false, message: '缺少 session_id' });
  }

  try {
    const recentVisit = await db.getAsync(
      `SELECT id FROM page_views 
       WHERE page = ? AND session_id = ? 
       AND visit_time > datetime('now', '-10 minutes')
       ORDER BY visit_time DESC LIMIT 1`,
      [page, session_id]
    );
    
    if (recentVisit) {
      return res.json({ success: true, message: '10分钟内已记录，跳过' });
    }
    
    await db.runAsync(
      "INSERT INTO page_views (page, session_id, visit_time) VALUES (?, ?, datetime('now'))",
      [page, session_id]
    );
    
    return res.json({ success: true, message: '访问已记录' });
  } catch (err) {
    console.error('Track page error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /api/stats/overview - 获取访问统计概览
app.get('/api/stats/overview', async (req, res) => {
  try {
    const totalRow = await db.getAsync('SELECT COUNT(*) AS cnt FROM page_views');
    const totalVisits = totalRow ? totalRow.cnt : 0;
    
    const todayRow = await db.getAsync(
      "SELECT COUNT(*) AS cnt FROM page_views WHERE DATE(visit_time) = DATE('now')"
    );
    const todayVisits = todayRow ? todayRow.cnt : 0;
    
    const exhibitNames = {
      '1': '陈列馆',
      '2': '故居',
      '3': '纪念园',
      '4': '将军铜像'
    };
    
    const checkinStats = await db.allAsync(`
      SELECT exhibit_id, COUNT(DISTINCT user_identifier) as checkin_count
      FROM visits
      GROUP BY exhibit_id
    `);
    
    const viewStats = await db.allAsync(`
      SELECT 
        CAST(REPLACE(page, 'detail_', '') AS INTEGER) as exhibit_id,
        COUNT(DISTINCT session_id) as view_count
      FROM page_views 
      WHERE page LIKE 'detail_%'
      GROUP BY CAST(REPLACE(page, 'detail_', '') AS INTEGER)
    `);
    
    let hotExhibit = null;
    let maxConversionRate = -1;
    
    for (const checkin of checkinStats) {
      const viewStat = viewStats.find(v => v.exhibit_id === checkin.exhibit_id);
      const viewCount = viewStat ? viewStat.view_count : 0;
      const checkinCount = checkin.checkin_count || 0;
      const conversionRate = viewCount > 0 ? Math.round(checkinCount * 1000 / viewCount) / 10 : 0;
      
      if (conversionRate > maxConversionRate || 
          (conversionRate === maxConversionRate && hotExhibit && checkinCount > hotExhibit.checkinCount)) {
        maxConversionRate = conversionRate;
        const exhibitId = String(checkin.exhibit_id);
        hotExhibit = {
          id: exhibitId,
          name: exhibitNames[exhibitId] || `展点${exhibitId}`,
          checkinCount: checkinCount,
          viewCount: viewCount,
          conversionRate: conversionRate
        };
      }
    }
    
    const todayFlowersRow = await db.getAsync(
      "SELECT COUNT(*) AS cnt FROM flowers WHERE DATE(created_at) = DATE('now')"
    );
    const todayFlowers = todayFlowersRow ? todayFlowersRow.cnt : 0;
    
    const todayUVRow = await db.getAsync(
      "SELECT COUNT(DISTINCT session_id) AS cnt FROM page_views WHERE DATE(visit_time) = DATE('now')"
    );
    const todayUV = todayUVRow ? todayUVRow.cnt : 0;
    
    return res.json({
      success: true,
      totalVisits,
      todayVisits,
      hotExhibit,
      todayFlowers,
      todayUV
    });
  } catch (err) {
    console.error('Stats overview error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /api/stats/daily-trend - 获取近7日访问趋势
app.get('/api/stats/daily-trend', async (req, res) => {
  try {
    const rows = await db.allAsync(`
      SELECT 
        DATE(visit_time) as date,
        COUNT(*) as pv,
        COUNT(DISTINCT session_id) as uv
      FROM page_views 
      WHERE visit_time >= DATE('now', '-6 days')
      GROUP BY DATE(visit_time)
      ORDER BY date ASC
    `);
    
    return res.json({
      success: true,
      data: rows || []
    });
  } catch (err) {
    console.error('Daily trend error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// API 路由：献花 (POST)
app.post('/api/flower', async (req, res) => {
  const { exhibitId } = req.body;
  const userIdentifier = req.userIdentifier;

  if (!exhibitId || ![1, 2, 3, 4].includes(Number(exhibitId))) {
    return res.status(400).json({ error: '展点 ID 必须为 1-4' });
  }

  try {
    await db.runAsync(
      'INSERT INTO flowers (user_identifier, exhibit_id) VALUES (?, ?)',
      [userIdentifier, exhibitId]
    );
    res.json({ success: true, message: '献花成功' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: '您已在该展点献花过了' });
    }
    res.status(500).json({ error: err.message });
  }
});

// API 路由：获取献花总数 (GET)
app.get('/api/flower/:exhibitId', async (req, res) => {
  const { exhibitId } = req.params;

  if (![1, 2, 3, 4].includes(Number(exhibitId))) {
    return res.status(400).json({ error: '展点 ID 必须为 1-4' });
  }

  try {
    const row = await db.getAsync(
      'SELECT COUNT(*) as count FROM flowers WHERE exhibit_id = ?',
      [exhibitId]
    );
    res.json({ exhibitId: Number(exhibitId), totalCount: row.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API 路由：查询当前用户是否已在某展点献花
app.get('/api/flower/user/:exhibitId', async (req, res) => {
  const { exhibitId } = req.params;
  const userIdentifier = req.userIdentifier;

  if (![1, 2, 3, 4].includes(Number(exhibitId))) {
    return res.status(400).json({ error: '展点 ID 必须为 1-4' });
  }

  try {
    const row = await db.getAsync(
      'SELECT 1 FROM flowers WHERE user_identifier = ? AND exhibit_id = ? LIMIT 1',
      [userIdentifier, exhibitId]
    );
    return res.json({ exhibitId: Number(exhibitId), hasFlowered: !!row });
  } catch (err) {
    console.error('User flowered check error:', err);
    return res.status(500).json({ error: '服务器错误' });
  }
});

// ===== 留言板 (messages) 接口 =====
// POST /api/messages
app.post('/api/messages', async (req, res) => {
  const { nickname, content } = req.body || {};

  // 基本存在性校验
  if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
    return res.status(400).json({ success: false, message: '昵称不能为空' });
  }
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ success: false, message: '留言内容不能为空' });
  }

  const nick = nickname.trim();
  const cont = content.trim();

  // 使用 Array.from 以正确计数 Unicode 字符
  const nickLen = Array.from(nick).length;
  const contLen = Array.from(cont).length;

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

// GET /api/messages - 仅返回已审核(status=1)留言，按 id 倒序
app.get('/api/messages', async (req, res) => {
  try {
    const rows = await db.allAsync(
      'SELECT id, nickname, content, created_at FROM messages WHERE status = 1 ORDER BY id DESC'
    );
    return res.json({ success: true, list: rows });
  } catch (err) {
    console.error('Messages query error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// POST /api/admin/login - 管理员登录验证
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (!password) {
    return res.status(400).json({ success: false, message: '请输入密码' });
  }
  
  if (password === adminPassword) {
    return res.json({ success: true, message: '登录成功' });
  } else {
    return res.status(401).json({ success: false, message: '密码错误' });
  }
});

// 管理端接口（临时无验证）
// GET /api/admin/messages - 返回全部留言
app.get('/api/admin/messages', async (req, res) => {
  try {
    const rows = await db.allAsync(
      'SELECT id, nickname, content, status, created_at FROM messages ORDER BY id DESC'
    );
    return res.json({ success: true, list: rows });
  } catch (err) {
    console.error('Admin messages query error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// POST /api/admin/messages/:id/approve - 将 status 置为 1
app.post('/api/admin/messages/:id/approve', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: '无效的 id' });
  try {
    await db.runAsync('UPDATE messages SET status = 1 WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('Approve message error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// POST /api/admin/messages/:id/reject - 将 status 置为 2（拒绝/软删除）
app.post('/api/admin/messages/:id/reject', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: '无效的 id' });
  try {
    await db.runAsync('UPDATE messages SET status = 2 WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('Reject message error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /api/admin/exhibits - 获取所有展点列表
app.get('/api/admin/exhibits', (req, res) => {
  const dataPath = path.join(__dirname, 'data', 'data.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Read exhibits error:', err);
      return res.status(500).json({ success: false, message: '读取展点数据失败' });
    }
    try {
      const exhibits = JSON.parse(data);
      const list = exhibits.map(e => ({ id: e.id, title: e.title, routeShort: e.routeShort }));
      return res.json({ success: true, list });
    } catch (parseErr) {
      return res.status(500).json({ success: false, message: '解析展点数据失败' });
    }
  });
});

// GET /api/admin/exhibits/:id - 获取单个展点详情
app.get('/api/admin/exhibits/:id', (req, res) => {
  const id = Number(req.params.id);
  console.log('Get exhibit request, id:', id);
  if (!id || id < 1 || id > 4) {
    return res.status(400).json({ success: false, message: '无效的展点ID' });
  }
  const dataPath = path.join(__dirname, 'data', 'data.json');
  console.log('Data path:', dataPath);
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Read exhibit error:', err);
      return res.status(500).json({ success: false, message: '读取展点数据失败' });
    }
    try {
      const exhibits = JSON.parse(data);
      const exhibit = exhibits.find(e => e.id === id);
      if (!exhibit) {
        console.log('Exhibit not found, id:', id);
        return res.status(404).json({ success: false, message: '展点不存在' });
      }
      console.log('Exhibit found:', exhibit.title);
      return res.json({ success: true, exhibit });
    } catch (parseErr) {
      console.error('Parse error:', parseErr);
      return res.status(500).json({ success: false, message: '解析展点数据失败' });
    }
  });
});

// POST /api/admin/exhibits/:id - 更新展点内容
app.post('/api/admin/exhibits/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!id || id < 1 || id > 4) {
    return res.status(400).json({ success: false, message: '无效的展点ID' });
  }
  const { title, routeShort, summary, text, audio, video } = req.body;
  if (!title || !summary || !text) {
    return res.status(400).json({ success: false, message: '标题、简介、内容不能为空' });
  }
  const dataPath = path.join(__dirname, 'data', 'data.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Read exhibits error:', err);
      return res.status(500).json({ success: false, message: '读取展点数据失败' });
    }
    try {
      const exhibits = JSON.parse(data);
      const index = exhibits.findIndex(e => e.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: '展点不存在' });
      }
      exhibits[index].title = title;
      if (routeShort) exhibits[index].routeShort = routeShort;
      exhibits[index].summary = summary;
      exhibits[index].text = text;
      if (audio !== undefined) exhibits[index].audio = audio;
      if (video !== undefined) exhibits[index].video = video;
      fs.writeFile(dataPath, JSON.stringify(exhibits, null, 2), 'utf8', (writeErr) => {
        if (writeErr) {
          console.error('Write exhibits error:', writeErr);
          return res.status(500).json({ success: false, message: '保存展点数据失败' });
        }
        console.log('Exhibit updated:', id, title);
        return res.json({ success: true, message: '保存成功' });
      });
    } catch (parseErr) {
      return res.status(500).json({ success: false, message: '解析展点数据失败' });
    }
  });
});

// GET /api/admin/export/checkins - 导出打卡数据
app.get('/api/admin/export/checkins', async (req, res) => {
  try {
    const rows = await db.allAsync(`
      SELECT user_identifier, exhibit_id, visited_at 
      FROM visits 
      ORDER BY visited_at DESC
    `);
    console.log('Export checkins:', rows.length, 'records');
    const exhibitNames = { 1: '陈列馆', 2: '故居', 3: '广场', 4: '装备' };
    let csv = '用户标识,展点,打卡时间\n';
    rows.forEach(r => {
      csv += `${r.user_identifier},${exhibitNames[r.exhibit_id] || '未知'},${r.visited_at}\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=checkins.csv');
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error('Export checkins error:', err);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

// GET /api/admin/export/flowers - 导出献花数据
app.get('/api/admin/export/flowers', async (req, res) => {
  try {
    const rows = await db.allAsync(`
      SELECT user_identifier, exhibit_id, created_at 
      FROM flowers 
      ORDER BY created_at DESC
    `);
    const exhibitNames = { 1: '陈列馆', 2: '故居', 3: '广场', 4: '装备' };
    let csv = '用户标识,展点,献花时间\n';
    rows.forEach(r => {
      csv += `${r.user_identifier},${exhibitNames[r.exhibit_id] || '未知'},${r.created_at}\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=flowers.csv');
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error('Export flowers error:', err);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

// GET /api/admin/export/quiz - 导出答题数据
app.get('/api/admin/export/quiz', async (req, res) => {
  try {
    const rows = await db.allAsync(`
      SELECT nickname, exhibit_id, score, created_at 
      FROM quiz_records 
      ORDER BY created_at DESC
    `);
    const exhibitNames = { 1: '陈列馆', 2: '故居', 3: '广场', 4: '装备' };
    let csv = '昵称,展点,得分,答题时间\n';
    rows.forEach(r => {
      csv += `${r.nickname},${exhibitNames[r.exhibit_id] || '未知'},${r.score}/4,${r.created_at}\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=quiz.csv');
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error('Export quiz error:', err);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

// GET /api/admin/export/all - 导出所有数据（合并CSV）
app.get('/api/admin/export/all', async (req, res) => {
  try {
    const exhibitNames = { 1: '陈列馆', 2: '故居', 3: '广场', 4: '装备' };
    let csv = '';
    
    const checkins = await db.allAsync('SELECT user_identifier, exhibit_id, visited_at FROM visits ORDER BY visited_at DESC');
    csv += '【打卡记录】\n用户标识,展点,打卡时间\n';
    checkins.forEach(r => {
      csv += `${r.user_identifier},${exhibitNames[r.exhibit_id] || '未知'},${r.visited_at}\n`;
    });
    csv += '\n';
    
    const flowers = await db.allAsync('SELECT user_identifier, exhibit_id, created_at FROM flowers ORDER BY created_at DESC');
    csv += '【献花记录】\n用户标识,展点,献花时间\n';
    flowers.forEach(r => {
      csv += `${r.user_identifier},${exhibitNames[r.exhibit_id] || '未知'},${r.created_at}\n`;
    });
    csv += '\n';
    
    const quiz = await db.allAsync('SELECT nickname, exhibit_id, score, created_at FROM quiz_records ORDER BY created_at DESC');
    csv += '【答题记录】\n昵称,展点,得分,答题时间\n';
    quiz.forEach(r => {
      csv += `${r.nickname},${exhibitNames[r.exhibit_id] || '未知'},${r.score}/4,${r.created_at}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=all_data.csv');
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error('Export all error:', err);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

function escapeCSV(str) {
  if (str === null || str === undefined) return '';
  str = String(str);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

app.get('/api/admin/export-exhibits', (req, res) => {
  const dataPath = path.join(__dirname, 'data', 'data.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Export exhibits error:', err);
      return res.status(500).json({ success: false, message: '读取展点数据失败' });
    }
    try {
      const exhibits = JSON.parse(data);
      let csv = 'ID,标题,简短名称,简介,详细内容,音频路径,视频路径\n';
      exhibits.forEach(e => {
        csv += `${e.id},${escapeCSV(e.title)},${escapeCSV(e.routeShort)},${escapeCSV(e.summary)},${escapeCSV(e.text)},${escapeCSV(e.audio || '')},${escapeCSV(e.video || '')}\n`;
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=exhibits.csv');
      res.send('\uFEFF' + csv);
    } catch (parseErr) {
      console.error('Parse exhibits error:', parseErr);
      res.status(500).json({ success: false, message: '解析展点数据失败' });
    }
  });
});

app.post('/api/admin/import-exhibits', express.text({ type: 'text/csv' }), (req, res) => {
  const csvContent = req.body;
  if (!csvContent) {
    return res.status(400).json({ success: false, message: 'CSV 内容为空' });
  }
  
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    return res.status(400).json({ success: false, message: 'CSV 格式错误：至少需要表头和一行数据' });
  }
  
  const dataPath = path.join(__dirname, 'data', 'data.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Read exhibits error:', err);
      return res.status(500).json({ success: false, message: '读取展点数据失败' });
    }
    
    try {
      const exhibits = JSON.parse(data);
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            if (inQuotes && line[j + 1] === '"') {
              current += '"';
              j++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current);
        
        if (values.length < 5) continue;
        
        const id = parseInt(values[0]);
        if (isNaN(id) || id < 1 || id > 4) continue;
        
        const index = exhibits.findIndex(e => e.id === id);
        if (index !== -1) {
          exhibits[index].title = values[1] || exhibits[index].title;
          exhibits[index].routeShort = values[2] || exhibits[index].routeShort;
          exhibits[index].summary = values[3] || exhibits[index].summary;
          exhibits[index].text = values[4] || exhibits[index].text;
          if (values[5] !== undefined) exhibits[index].audio = values[5];
          if (values[6] !== undefined) exhibits[index].video = values[6];
        }
      }
      
      fs.writeFile(dataPath, JSON.stringify(exhibits, null, 2), 'utf8', (writeErr) => {
        if (writeErr) {
          console.error('Write exhibits error:', writeErr);
          return res.status(500).json({ success: false, message: '保存展点数据失败' });
        }
        console.log('Exhibits imported successfully');
        res.json({ success: true, message: '导入成功' });
      });
    } catch (parseErr) {
      console.error('Parse error:', parseErr);
      res.status(500).json({ success: false, message: '解析数据失败' });
    }
  });
});

// 管理后台页面
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/server/admin/index.html', (err) => {
    if (err) {
      console.error('sendFile error:', err);
      res.status(500).json({ error: 'Failed to serve admin page', details: err.message });
    }
  });
});

// 管理后台资源
app.use('/admin', express.static(__dirname + '/server/admin'));

// 静态文件服务
app.use(express.static(__dirname));

// 全局 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// 启动服务
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
