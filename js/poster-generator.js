/**
 * 海报生成器
 * 使用 html2canvas 生成带二维码的分享海报
 */
(function () {
  "use strict";

  /**
   * 生成二维码图片
   * @param {string} text - 二维码内容（URL）
   * @param {number} size - 二维码尺寸
   * @returns {Promise<string>} - 返回 Data URL
   */
  function generateQRCode(text, size) {
    return new Promise(function (resolve, reject) {
      if (typeof QRCode === 'undefined') {
        reject(new Error('QRCode 库未加载'));
        return;
      }

      // 创建临时 canvas
      var canvas = document.createElement('canvas');
      var config = window.APP_CONFIG ? window.APP_CONFIG.qrCode : {
        size: 200,
        margin: 2,
        color: { dark: '#C41E3A', light: '#FFFFFF' }
      };

      QRCode.toCanvas(canvas, text, {
        width: size || config.size,
        margin: config.margin,
        color: config.color
      }, function (error) {
        if (error) {
          reject(error);
        } else {
          resolve(canvas.toDataURL('image/png'));
        }
      });
    });
  }

  /**
   * 创建海报 DOM 元素（用于 html2canvas 截图）
   * @param {Object} options - 海报配置
   * @returns {HTMLElement} - 海报元素
   */
  function createPosterElement(options) {
    var config = window.APP_CONFIG || { poster: { achievement: { width: 750, height: 1100 } } };
    var width = options.width || config.poster.achievement.width;
    var height = options.height || config.poster.achievement.height;

    // 创建海报容器
    var poster = document.createElement('div');
    poster.style.cssText = [
      'position: fixed',
      'left: -9999px',
      'top: 0',
      'width: ' + width + 'px',
      'height: ' + height + 'px',
      'background: linear-gradient(180deg, #FDF8F2 0%, #FFF5EB 50%, #F5E6D8 100%)',
      'padding: 40px',
      'box-sizing: border-box',
      'font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif',
      'color: #333333',
      'z-index: 9999'
    ].join(';');

    // 边框
    var border = document.createElement('div');
    border.style.cssText = [
      'position: absolute',
      'top: 24px',
      'left: 24px',
      'right: 24px',
      'bottom: 24px',
      'border: 6px solid rgba(196, 30, 58, 0.35)',
      'border-radius: 16px',
      'pointer-events: none'
    ].join(';');
    poster.appendChild(border);

    // 标题区域
    var header = document.createElement('div');
    header.style.cssText = [
      'text-align: center',
      'margin-bottom: 30px'
    ].join(';');

    var siteName = document.createElement('div');
    siteName.style.cssText = [
      'font-size: 36px',
      'font-weight: bold',
      'color: #7A1528',
      'margin-bottom: 10px'
    ].join(';');
    siteName.textContent = '王新亭将军红色教育基地';
    header.appendChild(siteName);

    if (options.subtitle) {
      var subtitle = document.createElement('div');
      subtitle.style.cssText = [
        'font-size: 28px',
        'font-weight: bold',
        'color: #C41E3A',
        'font-family: "Noto Serif SC", "SimSun", serif',
        'margin-bottom: 8px'
      ].join(';');
      subtitle.textContent = options.subtitle;
      header.appendChild(subtitle);
    }

    if (options.type) {
      var type = document.createElement('div');
      type.style.cssText = [
        'font-size: 24px',
        'color: #555555'
      ].join(';');
      type.textContent = options.type;
      header.appendChild(type);
    }

    poster.appendChild(header);

    // 主要内容区域
    var mainContent = document.createElement('div');
    mainContent.style.cssText = [
      'margin-bottom: 30px',
      'min-height: 200px'
    ].join(';');

    // 称号/标题
    if (options.userData && options.userData.title) {
      var title = document.createElement('div');
      title.style.cssText = [
        'text-align: center',
        'font-size: 42px',
        'font-weight: bold',
        'color: #D4A843',
        'margin-bottom: 30px'
      ].join(';');
      title.textContent = options.userData.title;
      mainContent.appendChild(title);
    }

    // 用户数据（得分、进度等）
    if (options.userData && options.userData.stats) {
      var stats = document.createElement('div');
      stats.style.cssText = [
        'text-align: center',
        'margin-bottom: 20px'
      ].join(';');

      options.userData.stats.forEach(function (stat) {
        var statLine = document.createElement('div');
        statLine.style.cssText = [
          'font-size: 28px',
          'color: #333333',
          'margin-bottom: 12px'
        ].join(';');
        statLine.textContent = stat.label + '  ' + stat.value;
        stats.appendChild(statLine);
      });

      mainContent.appendChild(stats);
    }

    // 详情列表（各展点得分/打卡记录）
    if (options.detailItems && options.detailItems.length > 0) {
      var detailTitle = document.createElement('div');
      detailTitle.style.cssText = [
        'font-size: 26px',
        'font-weight: bold',
        'color: #C41E3A',
        'margin-bottom: 15px'
      ].join(';');
      detailTitle.textContent = options.detailTitle || '详情';
      mainContent.appendChild(detailTitle);

      var detailList = document.createElement('div');
      detailList.style.cssText = [
        'font-size: 22px',
        'line-height: 1.6'
      ].join(';');

      options.detailItems.forEach(function (item) {
        var detailItem = document.createElement('div');
        detailItem.style.cssText = [
          'padding: 8px 0',
          'color: #444444'
        ].join(';');
        detailItem.textContent = item;
        detailList.appendChild(detailItem);
      });

      mainContent.appendChild(detailList);
    }

    poster.appendChild(mainContent);

    // 日期
    if (options.date) {
      var date = document.createElement('div');
      date.style.cssText = [
        'text-align: center',
        'font-size: 20px',
        'color: #999999',
        'margin-bottom: 30px'
      ].join(';');
      date.textContent = options.date;
      poster.appendChild(date);
    }

    // 二维码区域
    var qrSection = document.createElement('div');
    qrSection.style.cssText = [
      'text-align: center',
      'margin-bottom: 20px'
    ].join(';');

    var qrPlaceholder = document.createElement('div');
    qrPlaceholder.id = 'poster-qr-placeholder';
    qrPlaceholder.style.cssText = [
      'display: inline-block',
      'padding: 10px',
      'background: #FFFFFF',
      'border-radius: 12px',
      'box-shadow: 0 4px 16px rgba(61, 24, 24, 0.1)'
    ].join(';');
    qrSection.appendChild(qrPlaceholder);

    poster.appendChild(qrSection);

    // 二维码引导语
    if (options.qrCodeText) {
      var qrText = document.createElement('div');
      qrText.style.cssText = [
        'text-align: center',
        'font-size: 22px',
        'color: #666666',
        'margin-bottom: 20px'
      ].join(';');
      qrText.textContent = options.qrCodeText;
      poster.appendChild(qrText);
    }

    // 底部地址
    if (options.footerText) {
      var footer = document.createElement('div');
      footer.style.cssText = [
        'text-align: center',
        'font-size: 18px',
        'color: #999999'
      ].join(';');
      footer.textContent = options.footerText;
      poster.appendChild(footer);
    }

    // 印章（证书页）
    if (options.showSeal) {
      var seal = document.createElement('div');
      seal.style.cssText = [
        'position: absolute',
        'bottom: 80px',
        'right: 60px',
        'width: 100px',
        'height: 100px',
        'border: 4px solid #C41E3A',
        'border-radius: 50%',
        'display: flex',
        'align-items: center',
        'justify-content: center',
        'transform: rotate(-15deg)',
        'opacity: 0.8'
      ].join(';');

      var sealText = document.createElement('div');
      sealText.style.cssText = [
        'color: #C41E3A',
        'font-size: 16px',
        'font-weight: bold',
        'font-family: "Noto Serif SC", serif',
        'writing-mode: vertical-rl',
        'letter-spacing: 4px'
      ].join(';');
      sealText.textContent = '已完成';
      seal.appendChild(sealText);
      poster.appendChild(seal);
    }

    return poster;
  }

  /**
   * 生成海报（完整流程）
   * @param {Object} options - 海报配置
   * @returns {Promise<string>} - 返回海报图片 Data URL
   */
  function generatePoster(options) {
    var baseUrl = window.APP_CONFIG ? window.APP_CONFIG.baseUrl : 'https://wangxinting-memorial-mqgevub0.edgeone.cool';

    // 创建海报元素
    var poster = createPosterElement(options);
    document.body.appendChild(poster);

    // 生成二维码
    return generateQRCode(baseUrl, 200)
      .then(function (qrDataUrl) {
        // 将二维码添加到海报中
        var qrPlaceholder = document.getElementById('poster-qr-placeholder');
        if (qrPlaceholder) {
          var qrImg = document.createElement('img');
          qrImg.src = qrDataUrl;
          qrImg.style.cssText = [
            'display: block',
            'width: 180px',
            'height: 180px'
          ].join(';');
          qrPlaceholder.innerHTML = '';
          qrPlaceholder.appendChild(qrImg);
        }

        // 使用 html2canvas 生成截图
        if (typeof html2canvas === 'undefined') {
          throw new Error('html2canvas 库未加载');
        }

        return html2canvas(poster, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null
        });
      })
      .then(function (canvas) {
        // 移除临时元素
        document.body.removeChild(poster);

        // 返回图片 Data URL
        return canvas.toDataURL('image/png');
      })
      .catch(function (error) {
        // 清理临时元素
        if (poster.parentNode) {
          document.body.removeChild(poster);
        }
        throw error;
      });
  }

  /**
   * 生成成就页海报
   * @param {Object} userData - 用户数据
   * @param {Array} detailItems - 展点得分列表
   * @returns {Promise<string>} - 海报图片 Data URL
   */
  function generateAchievementPoster(userData, detailItems) {
    var now = new Date();
    var dateStr = now.getFullYear() + '年' +
                  String(now.getMonth() + 1).padStart(2, '0') + '月' +
                  String(now.getDate()).padStart(2, '0') + '日';

    return generatePoster({
      width: 750,
      height: 1100,
      subtitle: '红色传承之旅',
      type: '知识问答成就证书',
      userData: userData,
      detailItems: detailItems,
      detailTitle: '各展点得分',
      qrCodeText: '扫码挑战，看看你能得多少分？',
      footerText: '湖北省孝感市孝南区朋兴乡北庙村',
      date: dateStr
    });
  }

  /**
   * 生成证书页海报
   * @param {Object} userData - 用户数据
   * @param {Array} detailItems - 打卡记录列表
   * @returns {Promise<string>} - 海报图片 Data URL
   */
  function generateCertificatePoster(userData, detailItems) {
    var dateStr = (userData && userData.userDate) ? userData.userDate : (function () {
      var now = new Date();
      return now.getFullYear() + '年' +
             String(now.getMonth() + 1).padStart(2, '0') + '月' +
             String(now.getDate()).padStart(2, '0') + '日';
    })();

    return generatePoster({
      width: 750,
      height: 1000,
      subtitle: '红色足迹纪念证书',
      type: '红色足迹证明',
      userData: userData,
      detailItems: detailItems,
      detailTitle: '已打卡展点',
      qrCodeText: '扫码参观王新亭将军红色教育基地',
      footerText: '湖北省孝感市孝南区朋兴乡北庙村',
      date: dateStr,
      showSeal: true
    });
  }

  // 导出到全局
  window.PosterGenerator = {
    generatePoster: generatePoster,
    generateAchievementPoster: generateAchievementPoster,
    generateCertificatePoster: generateCertificatePoster,
    generateQRCode: generateQRCode
  };

})();
