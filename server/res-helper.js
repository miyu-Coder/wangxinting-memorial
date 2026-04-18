/**
 * 统一响应格式辅助模块
 *
 * 所有 API 应通过此模块返回，确保前端收到一致的 JSON 结构：
 * - 成功：{ success: true, ...data }
 * - 失败：{ success: false, message: "错误描述" }
 */
var express = require('express');

/**
 * 成功响应，将 data 合并到 { success: true } 中返回
 * @param {object} res  Express 响应对象
 * @param {object} data 额外数据字段（可选）
 * @returns {object} JSON 响应
 */
function success(res, data) {
  var payload = { success: true };
  if (data !== undefined) {
    Object.assign(payload, data);
  }
  return res.json(payload);
}

/**
 * 客户端错误响应（默认 400）
 * @param {object} res     Express 响应对象
 * @param {string} message 错误描述
 * @param {number} status  HTTP 状态码（默认 400）
 * @returns {object} JSON 响应
 */
function fail(res, message, status) {
  return res.status(status || 400).json({ success: false, message: message });
}

/**
 * 服务器内部错误响应（500），同时打印错误日志
 * @param {object}  res     Express 响应对象
 * @param {Error}   err     异常对象
 * @param {string}  context 错误上下文描述（用于日志定位）
 * @returns {object} JSON 响应
 */
function serverError(res, err, context) {
  if (err) console.error((context || 'Error') + ':', err);
  return res.status(500).json({ success: false, message: '服务器错误' });
}

module.exports = {
  success: success,
  fail: fail,
  serverError: serverError
};
