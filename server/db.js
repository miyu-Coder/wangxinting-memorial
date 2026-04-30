var sqlite3 = require('sqlite3').verbose();

var DB_PATH = './data.db';

var db = new sqlite3.Database(DB_PATH, function (err) {
  if (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database at ' + DB_PATH);
  initDatabase();
});

db.runAsync = function (sql, params) {
  if (!params) params = [];
  return new Promise(function (resolve, reject) {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

db.getAsync = function (sql, params) {
  if (!params) params = [];
  return new Promise(function (resolve, reject) {
    db.get(sql, params, function (err, row) {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = function (sql, params) {
  if (!params) params = [];
  return new Promise(function (resolve, reject) {
    db.all(sql, params, function (err, rows) {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

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
  `, function (err) {
    if (err) console.error('Failed to create visits table:', err.message);
    else console.log('Table visits ready');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS flowers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_identifier TEXT NOT NULL,
      exhibit_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      nickname TEXT,
      UNIQUE(user_identifier, exhibit_id)
    )
  `, function (err) {
    if (err) console.error('Failed to create flowers table:', err.message);
    else console.log('Table flowers ready');
  });

  db.run(`ALTER TABLE flowers ADD COLUMN nickname TEXT`, function (err) {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Failed to add nickname column:', err.message);
    }
  });

  db.run(`ALTER TABLE visits ADD COLUMN nickname TEXT`, function (err) {
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
  `, function (err) {
    if (err) console.error('Failed to create messages table:', err.message);
    else console.log('Table messages ready');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page VARCHAR(50),
      session_id VARCHAR(32),
      visit_time DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, function (err) {
    if (err) console.error('Failed to create page_views table:', err.message);
    else console.log('Table page_views ready');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS quiz_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL,
      exhibit_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, function (err) {
    if (err) console.error('Failed to create quiz_records table:', err.message);
    else console.log('Table quiz_records ready');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      target TEXT,
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, function (err) {
    if (err) console.error('Failed to create admin_logs table:', err.message);
    else console.log('Table admin_logs ready');
  });

  db.run(`ALTER TABLE quiz_records ADD COLUMN completed_at DATETIME`, function (err) {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Failed to add completed_at column:', err.message);
    }
  });

  db.run(`ALTER TABLE quiz_records ADD COLUMN time_cost INTEGER DEFAULT 0`, function (err) {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Failed to add time_cost column:', err.message);
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
  `, function (err) {
    if (err) console.error('Failed to create souvenir_orders table:', err.message);
    else console.log('Table souvenir_orders ready');
  });

  db.run(`ALTER TABLE souvenir_orders ADD COLUMN order_type TEXT DEFAULT 'exhibit'`, function (err) {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Failed to add order_type column:', err.message);
    }
  });

  db.run(`ALTER TABLE souvenir_orders ADD COLUMN prize_name TEXT`, function (err) {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Failed to add prize_name column:', err.message);
    }
  });
}

module.exports = db;
