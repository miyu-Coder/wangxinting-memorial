/**
 * 详情页链接：统一用相对路径 + 查询参数，避免 URL 解析差异导致 id 丢失
 */
(function (global) {
  "use strict";

  /**
   * @param {number|string} rawId data.json 中的展点 id
   * @returns {string} 如 detail.html?id=2
   */
  function buildDetailHref(rawId) {
    var n = parseInt(String(rawId).trim(), 10);
    if (!Number.isFinite(n) || n < 1) n = 1;
    return "detail.html?id=" + encodeURIComponent(String(n));
  }

  global.buildDetailHref = buildDetailHref;
})(window);
