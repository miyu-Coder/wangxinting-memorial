/**
 * API 请求封装模块
 *
 * 职责：统一封装 fetch 请求，提供 GET / POST JSON 的快捷方法。
 * 所有前端模块通过全局对象 WxApi 调用，避免各文件重复写 fetch 逻辑。
 *
 * 导出方法（挂载到 window.WxApi）：
 * - getJson(url, opts)          发送 GET 请求，返回解析后的 JSON
 * - getJsonSafe(url, opts, fb)  同上，失败时返回 fallback 值而不抛异常
 * - postJson(url, data, opts)   发送 POST JSON 请求，返回 { ok, status, body }
 * - fetchDataJson()             获取 data/data.json 展点数据
 */
(function (global) {
  "use strict";

  var Api = {};

  /**
   * 合并默认选项（默认 cache: "no-store"）
   * @param {object} opts  用户传入的 fetch 选项
   * @param {object} extra 额外选项（如 method、headers）
   * @returns {object} 合并后的选项
   */
  function _defaults(opts, extra) {
    var base = Object.assign({ cache: "no-store" }, opts || {});
    return extra ? Object.assign(base, extra) : base;
  }

  /**
   * 发送 GET 请求并解析 JSON
   * @param {string} url  请求地址
   * @param {object} opts fetch 选项（可选）
   * @returns {Promise<object>} 解析后的 JSON 对象
   * @throws {Error} HTTP 状态码非 2xx 时抛出异常
   */
  Api.getJson = function (url, opts) {
    return fetch(url, _defaults(opts)).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  };

  /**
   * 安全版 getJson：失败时返回 fallback 值而不抛异常
   * @param {string} url       请求地址
   * @param {object} opts      fetch 选项（可选）
   * @param {*}      fallback  失败时的默认返回值（默认 null）
   * @returns {Promise<object|*>}
   */
  Api.getJsonSafe = function (url, opts, fallback) {
    return Api.getJson(url, opts).catch(function () {
      return typeof fallback !== "undefined" ? fallback : null;
    });
  };

  /**
   * 发送 POST JSON 请求
   * @param {string} url  请求地址
   * @param {object} data 请求体（将被 JSON.stringify）
   * @param {object} opts fetch 选项（可选）
   * @returns {Promise<{ok: boolean, status: number, body: object|null}>}
   */
  Api.postJson = function (url, data, opts) {
    return fetch(url, _defaults(opts, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })).then(function (res) {
      var ct = (res.headers && typeof res.headers.get === "function") ? res.headers.get("content-type") : "";
      if (ct && ct.indexOf("application/json") !== -1) {
        return res.json().then(function (body) {
          return { ok: res.ok, status: res.status, body: body };
        });
      }
      return { ok: res.ok, status: res.status, body: null };
    });
  };

  /**
   * 获取 data/data.json 展点配置数据
   * @returns {Promise<Array>} 展点数据数组
   */
  Api.fetchDataJson = function () {
    return Api.getJson("data/data.json");
  };

  global.WxApi = Api;
})(window);
