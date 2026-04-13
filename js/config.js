/**
 * 应用配置
 * 统一管理线上域名等配置信息
 */
(function () {
  "use strict";

  var APP_CONFIG = {
    // 线上域名（EdgeOne 地址）
    baseUrl: 'https://wangxinting-memorial-mqgevub0.edgeone.cool',

    // 海报二维码配置
    qrCode: {
      size: 200,           // 二维码尺寸
      margin: 2,           // 二维码边距
      color: {
        dark: '#C41E3A',   // 深色（中国红）
        light: '#FFFFFF'   // 浅色（白色）
      }
    },

    // 海报尺寸配置
    poster: {
      achievement: { width: 750, height: 1100 },  // 成就页海报尺寸
      certificate: { width: 750, height: 1000 }  // 证书页海报尺寸
    }
  };

  // 导出到全局
  window.APP_CONFIG = APP_CONFIG;

})();
