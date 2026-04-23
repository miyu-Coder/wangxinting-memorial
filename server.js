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
      nickname TEXT,
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
  db.run(`ALTER TABLE flowers ADD COLUMN nickname TEXT`, function(err) {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Failed to add nickname column:', err.message);
    }
  });
  db.run(`ALTER TABLE visits ADD COLUMN nickname TEXT`, function(err) {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Failed to add nickname column to visits:', err.message);
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

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      target TEXT,
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create admin_logs table:', err.message);
    } else {
      console.log('Table admin_logs ready');
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS souvenir_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL,
      exhibit_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      status INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create souvenir_orders table:', err.message);
    } else {
      console.log('Table souvenir_orders ready');
    }
  });
}

// ===== 打卡 (checkin) 接口 =====
// POST /api/checkin
app.post('/api/checkin', async (req, res) => {
  const { exhibitId, nickname } = req.body;
  const userIdentifier = req.userIdentifier;

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
    
    const yesterdayVisitsRow = await db.getAsync(
      "SELECT COUNT(*) AS cnt FROM page_views WHERE DATE(visit_time) = DATE('now', '-1 day')"
    );
    const yesterdayVisits = yesterdayVisitsRow ? yesterdayVisitsRow.cnt : 0;
    
    const yesterdayUVRow = await db.getAsync(
      "SELECT COUNT(DISTINCT session_id) AS cnt FROM page_views WHERE DATE(visit_time) = DATE('now', '-1 day')"
    );
    const yesterdayUV = yesterdayUVRow ? yesterdayUVRow.cnt : 0;
    
    const yesterdayFlowersRow = await db.getAsync(
      "SELECT COUNT(*) AS cnt FROM flowers WHERE DATE(created_at) = DATE('now', '-1 day')"
    );
    const yesterdayFlowers = yesterdayFlowersRow ? yesterdayFlowersRow.cnt : 0;
    
    const weekAgoVisitsRow = await db.getAsync(
      "SELECT COUNT(*) AS cnt FROM page_views WHERE DATE(visit_time) = DATE('now', '-7 day')"
    );
    const weekAgoVisits = weekAgoVisitsRow ? weekAgoVisitsRow.cnt : 0;
    
    const totalFlowersRow = await db.getAsync('SELECT COUNT(*) AS cnt FROM flowers');
    const totalFlowers = totalFlowersRow ? totalFlowersRow.cnt : 0;
    
    const weekAgoFlowersRow = await db.getAsync(
      "SELECT COUNT(*) AS cnt FROM flowers WHERE DATE(created_at) = DATE('now', '-7 day')"
    );
    const weekAgoFlowers = weekAgoFlowersRow ? weekAgoFlowersRow.cnt : 0;
    
    return res.json({
      success: true,
      totalVisits,
      todayVisits,
      hotExhibit,
      todayFlowers,
      todayUV,
      yesterdayVisits,
      yesterdayUV,
      yesterdayFlowers,
      weekAgoVisits,
      totalFlowers,
      weekAgoFlowers
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

// GET /api/stats/hourly-today - 今日访问时段分布
app.get('/api/stats/hourly-today', async (req, res) => {
  try {
    const rows = await db.allAsync(`
      SELECT strftime('%H', visit_time) as hour, COUNT(*) as pv
      FROM page_views
      WHERE DATE(visit_time) = DATE('now')
      GROUP BY hour
      ORDER BY hour ASC
    `);
    const data = [];
    for (let h = 0; h < 24; h++) {
      const key = String(h).padStart(2, '0');
      const found = rows.find(r => r.hour === key);
      data.push({ hour: h, pv: found ? found.pv : 0 });
    }
    return res.json({ success: true, data });
  } catch (err) {
    console.error('Hourly today error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /api/system/status - 系统状态
app.get('/api/system/status', async (req, res) => {
  try {
    const uptimeSeconds = Math.floor(process.uptime());
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const dbStat = fs.statSync(path.join(__dirname, 'data.db'));
    const dbSizeMB = (dbStat.size / (1024 * 1024)).toFixed(2);
    return res.json({
      success: true,
      status: 'running',
      uptime: days + ' 天 ' + hours + ' 小时',
      dbSize: dbSizeMB + ' MB'
    });
  } catch (err) {
    console.error('System status error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// Helper: 记录操作日志
function addAdminLog(action, target, detail) {
  db.run(
    'INSERT INTO admin_logs (action, target, detail, created_at) VALUES (?, ?, ?, datetime("now"))',
    [action, target || '', detail || ''],
    (err) => {
      if (err) console.error('Admin log error:', err.message);
    }
  );
}

// GET /api/admin/logs - 获取操作日志
app.get('/api/admin/logs', async (req, res) => {
  try {
    const action = req.query.action || '';
    let sql = 'SELECT * FROM admin_logs';
    const params = [];
    if (action) {
      sql += ' WHERE action = ?';
      params.push(action);
    }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    const rows = await db.allAsync(sql, params);
    return res.json({ success: true, list: rows || [] });
  } catch (err) {
    console.error('Get admin logs error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// API 路由：献花 (POST)
app.post('/api/flower', async (req, res) => {
  const { exhibitId, nickname } = req.body;
  const userIdentifier = req.userIdentifier;

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

app.get('/api/flower/recent/:exhibitId', async (req, res) => {
  const { exhibitId } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 5, 20);

  if (![1, 2, 3, 4].includes(Number(exhibitId))) {
    return res.status(400).json({ error: '展点 ID 必须为 1-4' });
  }

  try {
    const rows = await db.allAsync(
      'SELECT nickname FROM flowers WHERE exhibit_id = ? AND nickname IS NOT NULL AND nickname != "" ORDER BY created_at DESC LIMIT ?',
      [exhibitId, limit]
    );
    const names = rows.map(r => r.nickname);
    return res.json({ success: true, exhibitId: Number(exhibitId), names: names });
  } catch (err) {
    console.error('Recent flower query error:', err);
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const rows = await db.allAsync(
      'SELECT id, nickname, content, created_at FROM messages WHERE status = 1 ORDER BY id DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    
    const countRow = await db.getAsync('SELECT COUNT(*) as total FROM messages WHERE status = 1');
    const total = countRow ? countRow.total : 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const hasMore = page < totalPages;
    
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
    addAdminLog('审核通过', '留言#' + id, '留言ID ' + id + ' 审核通过');
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
    addAdminLog('审核拒绝', '留言#' + id, '留言ID ' + id + ' 审核拒绝');
    return res.json({ success: true });
  } catch (err) {
    console.error('Reject message error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// DELETE /api/admin/messages/:id - 删除留言
app.delete('/api/admin/messages/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id || id < 1) return res.status(400).json({ success: false, message: '无效的 id' });
  try {
    await db.runAsync('DELETE FROM messages WHERE id = ?', [id]);
    addAdminLog('删除留言', '留言#' + id, '留言ID ' + id + ' 已删除');
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete message error:', err);
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
      exhibits[index].updated_at = new Date().toISOString();
      fs.writeFile(dataPath, JSON.stringify(exhibits, null, 2), 'utf8', (writeErr) => {
        if (writeErr) {
          console.error('Write exhibits error:', writeErr);
          return res.status(500).json({ success: false, message: '保存展点数据失败' });
        }
        console.log('Exhibit updated:', id, title);
                addAdminLog('修改展点', '展点#' + id, '展点 ' + title + ' 内容已更新');
        return res.json({ success: true, message: '保存成功' });
      });
    } catch (parseErr) {
      return res.status(500).json({ success: false, message: '解析展点数据失败' });
    }
  });
});

// POST /api/admin/exhibits/:id/quiz - 更新展点题目
app.post('/api/admin/exhibits/:id/quiz', (req, res) => {
  const id = Number(req.params.id);
  if (!id || id < 1 || id > 4) {
    return res.status(400).json({ success: false, message: '无效的展点ID' });
  }
  const { questions } = req.body;
  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ success: false, message: '题目数据无效' });
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
      if (!exhibits[index].quiz) exhibits[index].quiz = {};
      exhibits[index].quiz.questions = questions;
      exhibits[index].updated_at = new Date().toISOString();
      fs.writeFile(dataPath, JSON.stringify(exhibits, null, 2), 'utf8', (writeErr) => {
        if (writeErr) {
          console.error('Write quiz error:', writeErr);
          return res.status(500).json({ success: false, message: '保存题目数据失败' });
        }
        console.log('Quiz updated for exhibit:', id);
        addAdminLog('修改题目', '展点#' + id, '展点 ' + id + ' 题目已更新');
        return res.json({ success: true, message: '题目保存成功' });
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
    const exhibitNames = { 1: '陈列馆', 2: '故居', 3: '广场', 4: '装备展区' };
    let csv = '用户标识,展点,打卡时间\n';
    rows.forEach(r => {
      csv += `${r.user_identifier},${exhibitNames[r.exhibit_id] || '未知'},${r.visited_at}\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=checkins.csv');
    res.send('\uFEFF' + csv);
    addAdminLog('导出数据', '打卡数据', '导出 ' + rows.length + ' 条打卡记录');
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
    const exhibitNames = { 1: '陈列馆', 2: '故居', 3: '广场', 4: '装备展区' };
    let csv = '用户标识,展点,献花时间\n';
    rows.forEach(r => {
      csv += `${r.user_identifier},${exhibitNames[r.exhibit_id] || '未知'},${r.created_at}\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=flowers.csv');
    res.send('\uFEFF' + csv);
    addAdminLog('导出数据', '献花数据', '导出 ' + rows.length + ' 条献花记录');
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
    const exhibitNames = { 1: '陈列馆', 2: '故居', 3: '广场', 4: '装备展区' };
    let csv = '昵称,展点,得分,答题时间\n';
    rows.forEach(r => {
      csv += `${r.nickname},${exhibitNames[r.exhibit_id] || '未知'},${r.score}/4,${r.created_at}\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=quiz.csv');
    res.send('\uFEFF' + csv);
    addAdminLog('导出数据', '答题数据', '导出 ' + rows.length + ' 条答题记录');
  } catch (err) {
    console.error('Export quiz error:', err);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

// GET /api/admin/export/all - 导出所有数据（合并CSV）
app.get('/api/admin/export/all', async (req, res) => {
  try {
    const exhibitNames = { 1: '陈列馆', 2: '故居', 3: '广场', 4: '装备展区' };
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
        addAdminLog('导入CSV', '展点数据', '导入展点 CSV 数据');
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

// ===== 纪念品预约接口 =====
const SOUVENIR_MAP = {
  1: '🏅 将军纪念徽章',
  2: '📿 红色传承手环',
  3: '📜 荣誉纪念证书',
  4: '🔖 军工主题书签',
  0: '🎁 将军纪念礼盒'
};

app.post('/api/souvenir/order', async (req, res) => {
  const { nickname, exhibitId, name, phone } = req.body;
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
    const existing = await db.allAsync(
      'SELECT id FROM souvenir_orders WHERE nickname = ? AND exhibit_id = ?',
      [nickname.trim(), exhibitId]
    );
    if (existing.length > 0) {
      return res.json({ success: false, message: '您已预约过该奖品', already: true });
    }
    await db.runAsync(
      "INSERT INTO souvenir_orders (nickname, exhibit_id, name, phone, status, created_at) VALUES (?, ?, ?, ?, 0, datetime('now'))",
      [nickname.trim(), exhibitId, name.trim(), phone.trim()]
    );
    return res.json({ success: true, message: '预约成功' });
  } catch (err) {
    console.error('Souvenir order error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.get('/api/admin/souvenir/list', async (req, res) => {
  const status = req.query.status;
  try {
    let sql = 'SELECT * FROM souvenir_orders ORDER BY created_at DESC';
    let params = [];
    if (status === '0' || status === '1') {
      sql = 'SELECT * FROM souvenir_orders WHERE status = ? ORDER BY created_at DESC';
      params = [Number(status)];
    }
    const rows = await db.allAsync(sql, params);
    rows.forEach(r => {
      r.souvenir_name = SOUVENIR_MAP[r.exhibit_id] || '未知奖品';
    });
    return res.json({ success: true, list: rows });
  } catch (err) {
    console.error('Souvenir list error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.post('/api/admin/souvenir/:id/deliver', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: 'ID 无效' });
  try {
    await db.runAsync('UPDATE souvenir_orders SET status = 1 WHERE id = ?', [id]);
    addAdminLog('标记领取', '纪念品', '纪念品预约 ID=' + id + ' 已领取');
    return res.json({ success: true, message: '已标记为领取' });
  } catch (err) {
    console.error('Souvenir deliver error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 静态文件服务
app.use(express.static(__dirname));

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

function isWeekend(dateStr) {
  var d = new Date(dateStr);
  var day = d.getDay();
  return day === 0 || day === 6;
}

app.post('/api/admin/generate-demo-data', async (req, res) => {
  var nicknames = [
    "小红的爷爷","老兵张建国","团委李老师","孝感小陈","二班王同学",
    "退役军人老刘","党史爱好者","默默的花","向阳花开","赤子之心",
    "将军故里人","红色种子","北庙村村民","朋兴乡小李","孝南一中团委",
    "湖北大学实践队","山河已无恙","这盛世如您所愿","95后新党员","10后红领巾",
    "带着孩子来学习","老区人民","退役军人服务站","红色讲解员小周","参观者"
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
    "希望这样的基地越来越多，让红色精神代代传。"
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
    var visitCount = randomInt(60, 100);
    for (var i = 0; i < visitCount; i++) {
      var dt = randomDate(30);
      var eid = weightedExhibit();
      var nn = randomPick(nicknames);
      var uid = 'demo_' + nn + '_' + randomInt(1000, 9999);
      await db.runAsync(
        "INSERT OR IGNORE INTO visits (user_identifier, exhibit_id, nickname, visited_at) VALUES (?, ?, ?, ?)",
        [uid, eid, nn, dt]
      );
    }

    var flowerCount = randomInt(50, 80);
    for (var i = 0; i < flowerCount; i++) {
      var dt = randomDate(30);
      var eid = weightedExhibit();
      var nn = randomPick(nicknames);
      var uid = 'demo_' + nn + '_' + randomInt(1000, 9999);
      await db.runAsync(
        "INSERT OR IGNORE INTO flowers (user_identifier, exhibit_id, nickname, created_at) VALUES (?, ?, ?, ?)",
        [uid, eid, nn, dt]
      );
    }

    var quizCount = randomInt(40, 70);
    for (var i = 0; i < quizCount; i++) {
      var dt = randomDate(30);
      var eid = randomInt(1, 4);
      var sc = weightedScore();
      var nn = randomPick(nicknames);
      await db.runAsync(
        "INSERT INTO quiz_records (nickname, exhibit_id, score, created_at) VALUES (?, ?, ?, ?)",
        [nn, eid, sc, dt]
      );
    }

    var msgCount = randomInt(25, 45);
    for (var i = 0; i < msgCount; i++) {
      var dt = randomDate(30);
      var nn = randomPick(nicknames);
      var content = randomPick(messagePool);
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
      await db.runAsync(
        "INSERT INTO souvenir_orders (nickname, exhibit_id, name, phone, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [pq.nickname, pq.exhibit_id, sName, sPhone, sStatus, sCreatedAt]
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

app.post('/api/admin/clear-test-data', async (req, res) => {
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

// 全局 404 处理
app.get('/api/activity/recent', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 30);
  const exhibitNames = { 1: '陈列馆', 2: '故居', 3: '广场', 4: '装备展区' };

  try {
    var activities = [];

    const visits = await db.allAsync(
      'SELECT user_identifier, exhibit_id, nickname, visited_at FROM visits ORDER BY visited_at DESC LIMIT ?',
      [limit]
    );
    visits.forEach(function(r) {
      activities.push({
        type: 'checkin',
        nickname: r.nickname || '参观者',
        exhibit: exhibitNames[r.exhibit_id] || '展点',
        time: r.visited_at
      });
    });

    const flowers = await db.allAsync(
      'SELECT nickname, user_identifier, exhibit_id, created_at FROM flowers ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    flowers.forEach(function(r) {
      activities.push({
        type: 'flower',
        nickname: r.nickname || r.user_identifier || '参观者',
        exhibit: exhibitNames[r.exhibit_id] || '展点',
        time: r.created_at
      });
    });

    const quizzes = await db.allAsync(
      'SELECT nickname, exhibit_id, created_at FROM quiz_records ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    quizzes.forEach(function(r) {
      activities.push({
        type: 'quiz',
        nickname: r.nickname || '参观者',
        exhibit: exhibitNames[r.exhibit_id] || '展点',
        time: r.created_at
      });
    });

    activities.sort(function(a, b) {
      return new Date(b.time) - new Date(a.time);
    });
    activities = activities.slice(0, limit);

    res.json({ success: true, list: activities });
  } catch (err) {
    console.error('Activity recent error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// 启动服务
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
