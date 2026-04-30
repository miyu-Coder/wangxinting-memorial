var fs = require('fs');
var path = require('path');

var EXHIBIT_NAMES = { 1: '陈列馆', 2: '故居', 3: '广场', 4: '装备展区' };

var SOUVENIR_MAP = {
  1: '将军纪念徽章',
  2: '红色传承手环',
  3: '荣誉纪念证书',
  4: '军工主题书签',
  0: '将军纪念礼盒（四件套精装版）'
};

function getRankingPrizeName(rank) {
  if (rank === 1) return '第1名·将军纪念礼盒';
  if (rank >= 2 && rank <= 3) return '第2-3名·任选两件纪念品';
  if (rank >= 4 && rank <= 10) return '第4-10名·任选一件纪念品';
  return '纪念品';
}

function addAdminLog(db, action, target, detail) {
  db.run(
    'INSERT INTO admin_logs (action, target, detail, created_at) VALUES (?, ?, ?, datetime("now"))',
    [action, target || '', detail || ''],
    function (err) {
      if (err) console.error('Admin log error:', err.message);
    }
  );
}

function readFileAsync(filePath, encoding) {
  return new Promise(function (resolve, reject) {
    fs.readFile(filePath, encoding, function (err, data) {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

function writeFileAsync(filePath, data, encoding) {
  return new Promise(function (resolve, reject) {
    fs.writeFile(filePath, data, encoding, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function escapeCSV(str) {
  if (str === null || str === undefined) return '';
  str = String(str);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function sendCSV(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
  res.send('\uFEFF' + csv);
}

function isValidExhibitId(id) {
  var n = Number(id);
  return [1, 2, 3, 4].includes(n);
}

function getDataPath() {
  return path.join(__dirname, '..', 'data', 'data.json');
}

module.exports = {
  EXHIBIT_NAMES: EXHIBIT_NAMES,
  SOUVENIR_MAP: SOUVENIR_MAP,
  getRankingPrizeName: getRankingPrizeName,
  addAdminLog: addAdminLog,
  readFileAsync: readFileAsync,
  writeFileAsync: writeFileAsync,
  escapeCSV: escapeCSV,
  sendCSV: sendCSV,
  isValidExhibitId: isValidExhibitId,
  getDataPath: getDataPath
};
