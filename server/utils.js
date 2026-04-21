/**
 * 工具函数模块
 *
 * 职责：提供常量、文件读写、CSV 处理、展点 ID 校验等通用工具。
 * 供路由模块和管理后台模块引用。
 */
const fs = require('fs');
const path = require('path');

/** 展点编号 → 中文名称映射 */
const EXHIBIT_NAMES = { 1: '陈列馆', 2: '故居', 3: '广场', 4: '装备展区' };

/**
 * Promise 化 fs.readFile
 * @param {string} filePath  文件路径
 * @param {string} encoding  编码（如 'utf8'）
 * @returns {Promise<string>}
 */
function readFileAsync(filePath, encoding) {
  return new Promise(function (resolve, reject) {
    fs.readFile(filePath, encoding, function (err, data) {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

/**
 * Promise 化 fs.writeFile
 * @param {string} filePath  文件路径
 * @param {string} data      写入内容
 * @param {string} encoding  编码
 * @returns {Promise<void>}
 */
function writeFileAsync(filePath, data, encoding) {
  return new Promise(function (resolve, reject) {
    fs.writeFile(filePath, data, encoding, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * CSV 字段转义：含逗号、引号、换行时用双引号包裹
 * @param {*} str 原始值
 * @returns {string}
 */
function escapeCSV(str) {
  if (str === null || str === undefined) return '';
  str = String(str);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * 发送 CSV 下载响应（UTF-8 BOM 头，Excel 兼容）
 * @param {object} res      Express 响应对象
 * @param {string} filename 下载文件名
 * @param {string} csv      CSV 内容
 */
function sendCSV(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
  res.send('\uFEFF' + csv);
}

/**
 * 校验展点 ID 是否合法（1-4）
 * @param {*} id 待校验值
 * @returns {boolean}
 */
function isValidExhibitId(id) {
  var n = Number(id);
  return [1, 2, 3, 4].includes(n);
}

/**
 * 获取 data/data.json 的绝对路径
 * @returns {string}
 */
function getDataPath() {
  return path.join(__dirname, '..', 'data', 'data.json');
}

module.exports = {
  EXHIBIT_NAMES: EXHIBIT_NAMES,
  readFileAsync: readFileAsync,
  writeFileAsync: writeFileAsync,
  escapeCSV: escapeCSV,
  sendCSV: sendCSV,
  isValidExhibitId: isValidExhibitId,
  getDataPath: getDataPath
};
