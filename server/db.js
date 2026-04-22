/**
 * 数据库模块
 *
 * 职责：创建 SQLite 连接、Promise 化数据库方法、初始化表结构。
 * 导出 db 实例，供各路由模块引用。
 *
 * 表结构：
 * - visits       打卡记录（user_identifier + exhibit_id 唯一）
 * - flowers      献花记录（user_identifier + exhibit_id 唯一）
 * - messages     留言（status: 0 待审核, 1 已通过, 2 已拒绝）
 * - page_views   页面访问统计
 * - quiz_records 答题记录
 */
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = './data.db';

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database at ' + DB_PATH);
  initDatabase();
});

/**
 * Promise 化 db.run，返回 Promise<this>（可取 lastID / changes）
 * @param {string}  sql    SQL 语句
 * @param {Array}   params 绑定参数
 * @returns {Promise<object>}
 */
db.runAsync = function (sql, params) {
  if (!params) params = [];
  return new Promise(function (resolve, reject) {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

/**
 * Promise 化 db.get，返回单行
 * @param {string}  sql    SQL 语句
 * @param {Array}   params 绑定参数
 * @returns {Promise<object|undefined>}
 */
db.getAsync = function (sql, params) {
  if (!params) params = [];
  return new Promise(function (resolve, reject) {
    db.get(sql, params, function (err, row) {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

/**
 * Promise 化 db.all，返回全部匹配行
 * @param {string}  sql    SQL 语句
 * @param {Array}   params 绑定参数
 * @returns {Promise<Array>}
 */
db.allAsync = function (sql, params) {
  if (!params) params = [];
  return new Promise(function (resolve, reject) {
    db.all(sql, params, function (err, rows) {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

/**
 * 初始化数据库表（CREATE IF NOT EXISTS）
 */
function initDatabase() {
  var tables = [
    'CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, user_identifier TEXT NOT NULL, exhibit_id INTEGER NOT NULL, visited_at DATETIME DEFAULT CURRENT_TIMESTAMP, nickname TEXT, UNIQUE(user_identifier, exhibit_id))',
    'CREATE TABLE IF NOT EXISTS flowers (id INTEGER PRIMARY KEY AUTOINCREMENT, user_identifier TEXT NOT NULL, exhibit_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_identifier, exhibit_id))',
    'CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, nickname TEXT NOT NULL, content TEXT NOT NULL, status INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)',
    'CREATE TABLE IF NOT EXISTS page_views (id INTEGER PRIMARY KEY AUTOINCREMENT, page VARCHAR(50), session_id VARCHAR(32), visit_time DATETIME DEFAULT CURRENT_TIMESTAMP)',
    'CREATE TABLE IF NOT EXISTS quiz_records (id INTEGER PRIMARY KEY AUTOINCREMENT, nickname TEXT NOT NULL, exhibit_id INTEGER NOT NULL, score INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
  ];
  tables.forEach(function (sql) {
    db.run(sql, function (err) {
      if (err) console.error('Failed to create table:', err.message);
    });
  });
}

module.exports = db;
