require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const app = express();
app.use(express.json());

///app.use((req, res, next) => {
  ///res.setHeader('Content-Type', 'text/html; charset=utf-8');
 // next();
//});

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
    
    const hotExhibitRow = await db.getAsync(
      `SELECT page, COUNT(*) AS cnt FROM page_views 
       WHERE page LIKE 'detail_%' 
       GROUP BY page 
       ORDER BY cnt DESC 
       LIMIT 1`
    );
    
    let hotExhibit = null;
    if (hotExhibitRow) {
      const exhibitId = hotExhibitRow.page.replace('detail_', '');
      hotExhibit = {
        id: exhibitId,
        name: `展点${exhibitId}`,
        count: hotExhibitRow.cnt
      };
    }
    
    return res.json({
      success: true,
      totalVisits,
      todayVisits,
      hotExhibit
    });
  } catch (err) {
    console.error('Stats overview error:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 添加日志中间件用于诊断
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// API 路由：测试接口
app.get('/api/test', (req, res) => {
  res.json({ ok: true });
});

// 诊断用测试路由
app.post('/test-post', (req, res) => {
  res.json({ message: 'POST test route works', body: req.body });
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

// 测试日志
console.log('About to register /admin route, __dirname=' + __dirname);

// 管理后台页面
app.get('/admin', (req, res) => {
  console.log('Admin route handler called');
  const adminPath = __dirname + '/server/admin/index.html';
  console.log('Serving file from:', adminPath);
  res.sendFile(adminPath, (err) => {
    if (err) {
      console.error('sendFile error:', err);
      res.status(500).json({ error: 'Failed to serve admin page', details: err.message });
    }
  });
});

console.log('Registered /admin route');

// 管理后台资源
app.use('/admin', express.static(__dirname + '/server/admin'));

// 静态文件服务（必须在所有 API 路由之后）
app.use(express.static(__dirname));

// 全局 404 处理（用于诊断）
app.use((req, res) => {
  console.log(`No route matched for ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not found', path: req.path, method: req.method });
});

// 启动服务
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

// 保持进程运行
setInterval(() => {}, 1000);
