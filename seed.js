const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  }
  console.log('已连接数据库:', dbPath);
});

db.getAsync = function (sql, params) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.runAsync = function (sql, params) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const nicknames = [
  '游客', '红色传承人', '将军故里人', '爱国青年',
  '历史爱好者', '学生参观团', '退伍老兵', '基地志愿者'
];

const messageContents = [
  '致敬将军！', '永垂不朽！', '吾辈楷模！', '红色基因代代传！',
  '深受教育！', '不虚此行！', '向老一辈革命家学习！', '铭记历史！',
  '非常有意义的参观！', '带孩子来接受爱国主义教育！'
];

const pages = ['index', 'detail_1', 'detail_2', 'detail_3', 'detail_4', 'quiz', 'messages'];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function generateSessionId() {
  const chars = 'abcdef0123456789';
  let id = '';
  for (let i = 0; i < 32; i++) {
    id += chars[randInt(0, chars.length - 1)];
  }
  return id;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function seed() {
  const now = new Date();
  const stats = {
    visits: 0,
    flowers: 0,
    quiz_records: 0,
    messages: 0,
    page_views: 0
  };

  for (let dayOffset = 30; dayOffset >= 1; dayOffset--) {
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = formatDate(date);
    const weekend = isWeekend(date);
    const multiplier = weekend ? 1.4 : 1.0;

    const visitCount = Math.round(randInt(5, 20) * multiplier);
    const flowerCount = Math.round(randInt(3, 15) * multiplier);
    const quizCount = Math.round(randInt(3, 10) * multiplier);
    const messageCount = Math.round(randInt(2, 8) * multiplier);
    const pvCount = Math.round(randInt(20, 50) * multiplier);

    for (let i = 0; i < visitCount; i++) {
      const hour = randInt(8, 17);
      const minute = randInt(0, 59);
      const second = randInt(0, 59);
      const ts = `${dateStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
      const user = `user_${randInt(1000, 9999)}`;
      const exhibit = randInt(1, 4);
      try {
        await db.runAsync(
          'INSERT OR IGNORE INTO visits (user_identifier, exhibit_id, visited_at) VALUES (?, ?, ?)',
          [user, exhibit, ts]
        );
        stats.visits++;
      } catch (e) { }
    }

    for (let i = 0; i < flowerCount; i++) {
      const hour = randInt(8, 17);
      const minute = randInt(0, 59);
      const second = randInt(0, 59);
      const ts = `${dateStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
      const user = `user_${randInt(1000, 9999)}`;
      const exhibit = randInt(1, 4);
      try {
        await db.runAsync(
          'INSERT OR IGNORE INTO flowers (user_identifier, exhibit_id, created_at) VALUES (?, ?, ?)',
          [user, exhibit, ts]
        );
        stats.flowers++;
      } catch (e) { }
    }

    for (let i = 0; i < quizCount; i++) {
      const hour = randInt(8, 17);
      const minute = randInt(0, 59);
      const second = randInt(0, 59);
      const ts = `${dateStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
      const nickname = randChoice(nicknames);
      const exhibit = randInt(1, 4);
      const score = randInt(1, 4);
      try {
        await db.runAsync(
          'INSERT INTO quiz_records (nickname, exhibit_id, score, created_at) VALUES (?, ?, ?, ?)',
          [nickname, exhibit, score, ts]
        );
        stats.quiz_records++;
      } catch (e) { }
    }

    for (let i = 0; i < messageCount; i++) {
      const hour = randInt(8, 17);
      const minute = randInt(0, 59);
      const second = randInt(0, 59);
      const ts = `${dateStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
      const nickname = randChoice(nicknames);
      const content = randChoice(messageContents);
      const status = randInt(0, 2);
      try {
        await db.runAsync(
          'INSERT INTO messages (nickname, content, status, created_at) VALUES (?, ?, ?, ?)',
          [nickname, content, status, ts]
        );
        stats.messages++;
      } catch (e) { }
    }

    const uvRatio = 0.4 + Math.random() * 0.2;
    const uvCount = Math.round(pvCount * uvRatio);
    const sessionIds = [];
    for (let i = 0; i < uvCount; i++) {
      sessionIds.push(generateSessionId());
    }

    for (let i = 0; i < pvCount; i++) {
      const hour = randInt(8, 17);
      const minute = randInt(0, 59);
      const second = randInt(0, 59);
      const ts = `${dateStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
      const page = randChoice(pages);
      const sessionId = randChoice(sessionIds);
      try {
        await db.runAsync(
          'INSERT INTO page_views (page, session_id, visit_time) VALUES (?, ?, ?)',
          [page, sessionId, ts]
        );
        stats.page_views++;
      } catch (e) { }
    }

    process.stdout.write(`\r已处理: ${31 - dayOffset}/30 天`);
  }

  console.log('\n\n数据插入完成！');
  console.log('  打卡记录 (visits):      ', stats.visits);
  console.log('  献花记录 (flowers):     ', stats.flowers);
  console.log('  答题记录 (quiz_records):', stats.quiz_records);
  console.log('  留言记录 (messages):    ', stats.messages);
  console.log('  页面访问 (page_views):  ', stats.page_views);

  db.close();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  db.close();
  process.exit(1);
});
