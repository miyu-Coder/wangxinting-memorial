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
    console.log('📱 ========== 二维码生成调试 ==========');
    console.log('📱 1. 传入的 URL:', text);
    console.log('📱 2. URL 类型:', typeof text);
    console.log('📱 3. URL 长度:', text ? text.length : 0);

    return new Promise(function (resolve, reject) {
      if (typeof window.QRCode === 'undefined') {
        console.error('📱 ❌ QRCode 库未加载');
        throw new Error('QRCode 库未加载');
      }

      // 创建临时 canvas 并设置尺寸为正方形
      var canvas = document.createElement('canvas');
      var qrSize = 200;
      canvas.width = qrSize;
      canvas.height = qrSize;

      var config = window.APP_CONFIG ? window.APP_CONFIG.qrCode : {
        size: qrSize,
        margin: 2,
        color: { dark: '#C41E3A', light: '#FFFFFF' }
      };

      var qrOptions = {
        width: qrSize,
        margin: config.margin,
        color: config.color
      };

      try {
        console.log('📱 4. 二维码配置:', JSON.stringify(qrOptions));
        console.log('📱 5. 二维码 Canvas 尺寸 (设置后):', canvas.width, 'x', canvas.height);
        console.log('📱 6. 二维码 Canvas 上下文:', !!canvas.getContext);

        QRCode.toCanvas(canvas, text, qrOptions, function (error) {
          if (error) {
            console.error('📱 ❌ 生成二维码时出错:', error);
            console.error('📱 错误堆栈:', error && error.stack);
            reject(error);
          } else {
            console.log('📱 7. 二维码生成成功');
            resolve(canvas);
          }
        });
      } catch (error) {
        console.error('📱 ❌ 生成二维码时出错:', error);
        console.error('📱 错误堆栈:', error && error.stack);
        reject(error);
      }
    }).finally(function () {
      console.log('📱 ========== 调试结束 ==========');
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

    console.log('🖼️ 绘制海报背景:', width, 'x', height);
    console.log('🖼️ 海报配置:', JSON.stringify(options).slice(0, 300));

    // 创建海报容器
    var poster = document.createElement('div');
    poster.style.cssText = [
      'position: fixed',
      'left: -9999px',
      'top: 0',
      'width: ' + width + 'px',
      'height: ' + height + 'px',
      'background: linear-gradient(135deg, #C41E3A 0%, #9A1628 100%)',
      'padding: 40px',
      'box-sizing: border-box',
      'font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif',
      'color: #333333',
      'z-index: 9999',
      'overflow: hidden'
    ].join(';');

    // 边框
    var border = document.createElement('div');
    border.style.cssText = [
      'position: absolute',
      'top: 24px',
      'left: 24px',
      'right: 24px',
      'bottom: 24px',
      'border: 6px solid rgba(255, 255, 255, 0.15)',
      'border-radius: 20px',
      'pointer-events: none'
    ].join(';');
    poster.appendChild(border);

    // 四角装饰
    var corners = [
      { top: 16, left: 16 },
      { top: 16, right: 16 },
      { bottom: 16, left: 16 },
      { bottom: 16, right: 16 }
    ];
    corners.forEach(function (pos) {
      var dot = document.createElement('div');
      dot.style.cssText = [
        'position: absolute',
        'width: 12px',
        'height: 12px',
        'background: #D4A843',
        'border-radius: 50%',
        'box-shadow: 0 0 18px rgba(212, 168, 67, 0.45)'
      ].join(';');
      if (pos.top !== undefined) dot.style.top = pos.top + 'px';
      if (pos.bottom !== undefined) dot.style.bottom = pos.bottom + 'px';
      if (pos.left !== undefined) dot.style.left = pos.left + 'px';
      if (pos.right !== undefined) dot.style.right = pos.right + 'px';
      poster.appendChild(dot);
    });

    // 海报卡片
    var card = document.createElement('div');
    card.style.cssText = [
      'position: relative',
      'width: calc(100% - 40px)',
      'min-height: calc(100% - 40px)',
      'margin: 20px auto',
      'padding: 36px 32px',
      'box-sizing: border-box',
      'background: #FDF8F2',
      'border-radius: 32px',
      'box-shadow: 0 28px 70px rgba(0, 0, 0, 0.18)',
      'overflow: hidden'
    ].join(';');
    poster.appendChild(card);

    // 标题区域
    var header = document.createElement('div');
    header.style.cssText = [
      'text-align: center',
      'margin-bottom: 24px'
    ].join(';');

    var siteName = document.createElement('div');
    siteName.style.cssText = [
      'font-size: 28px',
      'font-weight: 800',
      'color: #D4A843',
      'letter-spacing: 0.08em',
      'margin-bottom: 10px'
    ].join(';');
    siteName.textContent = '王新亭将军红色教育基地';
    header.appendChild(siteName);

    if (options.userData && options.userData.nickname) {
      var nicknameLine = document.createElement('div');
      nicknameLine.style.cssText = [
        'font-size: 18px',
        'font-weight: 600',
        'color: #D4A843',
        'margin-bottom: 8px',
        'letter-spacing: 0.04em'
      ].join(';');
      nicknameLine.textContent = options.userData.nickname + ' 的红色传承';
      header.appendChild(nicknameLine);
    }

    if (options.subtitle) {
      var subtitle = document.createElement('div');
      subtitle.style.cssText = [
        'font-size: 20px',
        'font-weight: 700',
        'color: #C41E3A',
        'margin-bottom: 10px'
      ].join(';');
      subtitle.textContent = options.subtitle;
      header.appendChild(subtitle);
    }

    if (options.type) {
      var type = document.createElement('div');
      type.style.cssText = [
        'font-size: 24px',
        'font-weight: 700',
        'color: #7A1528',
        'margin-bottom: 16px'
      ].join(';');
      type.textContent = options.type;
      header.appendChild(type);
    }

    var divider = document.createElement('div');
    divider.style.cssText = [
      'width: 180px',
      'height: 2px',
      'margin: 0 auto',
      'background: linear-gradient(90deg, #D4A843, rgba(212, 168, 67, 0.12), transparent)'
    ].join(';');
    header.appendChild(divider);
    card.appendChild(header);

    // 内容区
    var body = document.createElement('div');
    body.style.cssText = [
      'display: flex',
      'flex-direction: column',
      'gap: 22px'
    ].join(';');

    // 证书页和成就页的差异化区块
    if (options.showSeal) {
      var intro = document.createElement('div');
      intro.style.cssText = [
        'text-align: center',
        'font-size: 18px',
        'color: #7A1528',
        'margin-bottom: 8px'
      ].join(';');
      intro.textContent = '恭喜您完成全部参观打卡！';
      body.appendChild(intro);

      if (options.userData && options.userData.userDate) {
        var dateInfo = document.createElement('div');
        dateInfo.style.cssText = [
          'display: flex',
          'justify-content: space-between',
          'align-items: center',
          'padding: 16px 18px',
          'background: rgba(196, 30, 58, 0.06)',
          'border-radius: 16px',
          'font-size: 18px',
          'color: #7A1528'
        ].join(';');
        dateInfo.innerHTML = '<span>完成日期：' + options.userData.userDate + '</span>' +
                             '<span>已完成参观打卡展点 ' + (options.userData.sites ? options.userData.sites.length : options.detailItems.length) + ' 处</span>';
        body.appendChild(dateInfo);
      }

      var detailList = document.createElement('div');
      detailList.style.cssText = [
        'display: grid',
        'gap: 12px'
      ].join(';');

      options.detailItems.forEach(function (item) {
        var detailItem = document.createElement('div');
        detailItem.style.cssText = [
          'display: flex',
          'justify-content: space-between',
          'align-items: center',
          'padding: 12px',
          'background: rgba(196, 30, 58, 0.08)',
          'border-radius: 12px',
          'font-size: 18px',
          'color: #5E2A2A'
        ].join(';');
        detailItem.textContent = item;
        detailList.appendChild(detailItem);
      });

      body.appendChild(detailList);
    } else {
      if (options.userData && options.userData.title) {
        var titleBlock = document.createElement('div');
        titleBlock.style.cssText = [
          'text-align: center',
          'padding: 18px 20px',
          'background: linear-gradient(135deg, rgba(212, 168, 67, 0.15), rgba(196, 30, 58, 0.08))',
          'border-radius: 20px',
          'box-shadow: inset 0 0 0 1px rgba(212, 168, 67, 0.18)'
        ].join(';');

        var titleLabel = document.createElement('div');
        titleLabel.style.cssText = [
          'font-size: 18px',
          'color: #7A1528',
          'margin-bottom: 10px'
        ].join(';');
        titleLabel.textContent = '我的专属称号';
        titleBlock.appendChild(titleLabel);

        var titleText = document.createElement('div');
        titleText.style.cssText = [
          'font-size: 44px',
          'font-weight: 900',
          'color: #D4A843',
          'line-height: 1.1',
          'letter-spacing: 0.03em'
        ].join(';');
        titleText.textContent = '🏅 ' + options.userData.title;
        titleBlock.appendChild(titleText);
        body.appendChild(titleBlock);
      }

      if (options.userData && options.userData.stats) {
        var statBlock = document.createElement('div');
        statBlock.style.cssText = [
          'display: grid',
          'grid-template-columns: repeat(2, minmax(0, 1fr))',
          'gap: 12px'
        ].join(';');

        options.userData.stats.forEach(function (stat, index) {
          var statCard = document.createElement('div');
          statCard.style.cssText = [
            'padding: 18px',
            'border-radius: 18px',
            'background: rgba(196, 30, 58, 0.08)',
            'min-height: 110px',
            'display: flex',
            'flex-direction: column',
            'justify-content: center',
            'gap: 6px'
          ].join(';');

          var statLabel = document.createElement('div');
          statLabel.style.cssText = [
            'color: #7A1528',
            'font-size: 16px'
          ].join(';');
          statLabel.textContent = stat.label;
          statCard.appendChild(statLabel);

          var statValue = document.createElement('div');
          statValue.style.cssText = [
            'font-size: 32px',
            'font-weight: 800',
            'color: #D4A843'
          ].join(';');
          statValue.textContent = stat.value;
          statCard.appendChild(statValue);

          statBlock.appendChild(statCard);
        });

        body.appendChild(statBlock);
      }

      if (options.detailItems && options.detailItems.length > 0) {
        var detailGrid = document.createElement('div');
        detailGrid.style.cssText = [
          'display: grid',
          'grid-template-columns: repeat(2, minmax(0, 1fr))',
          'gap: 12px'
        ].join(';');

        options.detailItems.forEach(function (item) {
          var detailItem = document.createElement('div');
          detailItem.style.cssText = [
            'padding: 14px',
            'background: rgba(196, 30, 58, 0.08)',
            'border-radius: 16px',
            'min-height: 90px',
            'font-size: 18px',
            'color: #5E2A2A',
            'line-height: 1.4'
          ].join(';');
          detailItem.textContent = item;
          detailGrid.appendChild(detailItem);
        });

        body.appendChild(detailGrid);
      }
    }

    card.appendChild(body);

    if (options.date) {
      var date = document.createElement('div');
      date.style.cssText = [
        'text-align: center',
        'font-size: 18px',
        'color: #8C6A50',
        'margin: 0 0 12px'
      ].join(';');
      date.textContent = options.date;
      card.appendChild(date);
    }

    // 二维码区域
    var qrSection = document.createElement('div');
    qrSection.className = 'qr-code-container';
    qrSection.style.cssText = [
      'display: flex',
      'justify-content: center',
      'align-items: center',
      'width: 100%',
      'margin: 10px 0 14px',
      'text-align: center'
    ].join(';');

    var qrWrapper = document.createElement('div');
    qrWrapper.style.cssText = [
      'display: flex',
      'flex-direction: column',
      'align-items: center',
      'padding: 18px',
      'background: #FFFFFF',
      'border-radius: 22px',
      'box-shadow: 0 16px 40px rgba(61, 24, 24, 0.12)',
      'max-width: 260px',
      'width: 100%'
    ].join(';');

    var qrLabel = document.createElement('div');
    qrLabel.style.cssText = [
      'font-size: 18px',
      'font-weight: 700',
      'color: #8C6A50',
      'margin-bottom: 14px'
    ].join(';');
    qrLabel.textContent = '扫码参观 · 传承精神';
    qrWrapper.appendChild(qrLabel);

    var qrPlaceholder = document.createElement('div');
    qrPlaceholder.id = 'poster-qr-placeholder';
    qrPlaceholder.style.cssText = [
      'display: inline-flex',
      'justify-content: center',
      'align-items: center',
      'width: 220px',
      'height: 220px',
      'background: #FFFFFF',
      'border-radius: 16px',
      'box-shadow: inset 0 0 0 1px rgba(196, 30, 58, 0.1)'
    ].join(';');
    qrWrapper.appendChild(qrPlaceholder);
    qrSection.appendChild(qrWrapper);
    card.appendChild(qrSection);

    if (options.qrCodeText) {
      var qrText = document.createElement('div');
      qrText.style.cssText = [
        'text-align: center',
        'font-size: 18px',
        'color: #666666',
        'margin-bottom: 20px'
      ].join(';');
      qrText.textContent = options.qrCodeText;
      card.appendChild(qrText);
    }

    if (options.footerText) {
      var footer = document.createElement('div');
      footer.style.cssText = [
        'text-align: center',
        'font-size: 16px',
        'color: #999999',
        'margin-top: 8px'
      ].join(';');
      footer.textContent = options.footerText;
      card.appendChild(footer);
    }

    // 印章（证书页）
    if (options.showSeal) {
      var seal = document.createElement('div');
      seal.style.cssText = [
        'position: absolute',
        'bottom: 36px',
        'right: 36px',
        'width: 100px',
        'height: 100px',
        'border: 6px solid rgba(196, 30, 58, 0.9)',
        'border-radius: 50%',
        'display: flex',
        'align-items: center',
        'justify-content: center',
        'transform: rotate(-15deg)',
        'background: rgba(255, 255, 255, 0.85)'
      ].join(';');

      var sealText = document.createElement('div');
      sealText.style.cssText = [
        'color: #C41E3A',
        'font-size: 16px',
        'font-weight: bold',
        'font-family: "Noto Serif SC", serif',
        'letter-spacing: 4px',
        'transform: rotate(15deg)'
      ].join(';');
      sealText.textContent = '已完成';
      seal.appendChild(sealText);
      card.appendChild(seal);
    }

    return poster;
  }

  /**
   * 生成海报（完整流程）
   * @param {Object} options - 海报配置
   * @returns {Promise<string>} - 返回海报图片 Data URL
   */
  function generatePoster(options) {
    console.log('🎨 ========== 海报生成调试 ==========');
    console.log('🎨 1. 海报类型:', options && options.type);
    console.log('🎨 2. 传入数据:', JSON.stringify(options).slice(0, 200));

    var baseUrl = window.APP_CONFIG ? window.APP_CONFIG.baseUrl : 'https://wangxinting-memorial-mqgevub0.edgeone.cool';

    // 创建海报元素
    var poster = createPosterElement(options);
    poster.id = 'poster-container';
    document.body.appendChild(poster);
    console.log('🎨 3. 主海报 DOM 已创建，准备生成二维码');

    // 生成二维码
    return generateQRCode(baseUrl, 200)
      .then(function (qrCanvas) {
        console.log('🎨 4. 准备调用二维码生成函数');
        console.log('🎨 5. 二维码 Canvas 返回类型:', qrCanvas && qrCanvas.constructor && qrCanvas.constructor.name);
        console.log('🎨 6. 二维码 Canvas 实际尺寸:', qrCanvas.width, 'x', qrCanvas.height);

        // 将二维码 Canvas 添加到海报 DOM
        var qrPlaceholder = document.getElementById('poster-qr-placeholder');
        if (qrPlaceholder) {
          qrPlaceholder.innerHTML = '';
          qrCanvas.style.cssText = [
            'display: block',
            'width: 200px',
            'height: 200px'
          ].join(';');
          qrPlaceholder.appendChild(qrCanvas);
          console.log('🎨 7. 二维码 Canvas 已插入到海报 DOM');
        } else {
          console.warn('🎨 ⚠️ 未找到二维码占位元素 poster-qr-placeholder');
        }

        // 使用 html2canvas 生成截图
        if (typeof html2canvas === 'undefined') {
          throw new Error('html2canvas 库未加载');
        }

        console.log('🎨 8. 开始调用 html2canvas 生成截图');
        return html2canvas(poster, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null
        }).then(function (mainCanvas) {
          console.log('🎨 9. html2canvas 生成完成，Canvas 尺寸:', mainCanvas.width, 'x', mainCanvas.height);

          var finalCanvas = document.createElement('canvas');
          finalCanvas.width = mainCanvas.width;
          finalCanvas.height = mainCanvas.height;
          var finalCtx = finalCanvas.getContext('2d');
          finalCtx.drawImage(mainCanvas, 0, 0, finalCanvas.width, finalCanvas.height);

          var qrCanvasElement = poster.querySelector('.qr-code-container canvas');
          var posterRect = poster.getBoundingClientRect();
          if (qrCanvasElement) {
            var qrRect = qrCanvasElement.getBoundingClientRect();
            var scale = mainCanvas.width / posterRect.width;
            var qrX = (qrRect.left - posterRect.left) * scale;
            var qrY = (qrRect.top - posterRect.top) * scale;
            var qrWidth = qrRect.width * scale;
            var qrHeight = qrRect.height * scale;

            console.log('🎨 10. 手动绘制二维码到 finalCanvas');
            console.log('   - 位置:', qrX, qrY);
            console.log('   - 尺寸:', qrWidth, qrHeight);
            finalCtx.drawImage(qrCanvasElement, qrX, qrY, qrWidth, qrHeight);
          } else {
            console.warn('🎨 ⚠️ 未找到 poster 中的二维码 canvas 元素');
          }

          return finalCanvas.toDataURL('image/png');
        });
      })
      .catch(function (error) {
        console.error('🎨 ❌ 海报生成过程中出错:', error);
        console.error('🎨 错误堆栈:', error && error.stack);
        throw error;
      })
      .finally(function () {
        if (poster.parentNode) {
          document.body.removeChild(poster);
        }
        console.log('🎨 ========== 调试结束 ==========');
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
