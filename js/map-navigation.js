(function () {
  var MAP_LAT = 31.02;
  var MAP_LNG = 114.13;
  var MAP_NAME = '王新亭将军红色教育基地';
  var MAP_ADDRESS = '湖北省孝感市孝南区朋兴乡北庙村';

  function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent);
  }

  function openUrl(url) {
    window.location.href = url;
  }

  function getMapOptions() {
    var label = encodeURIComponent(MAP_NAME);
    return [
      {
        label: '苹果地图',
        url: 'https://maps.apple.com/?q=' + label + '&ll=' + MAP_LAT + ',' + MAP_LNG,
      },
      {
        label: '高德地图',
        url: 'https://uri.amap.com/marker?position=' + MAP_LNG + ',' + MAP_LAT + '&name=' + label,
      },
      {
        label: '百度地图',
        url: 'https://api.map.baidu.com/marker?location=' + MAP_LAT + ',' + MAP_LNG + '&title=' + label + '&content=' + label + '&output=html',
      },
      {
        label: '腾讯地图',
        url: 'https://apis.map.qq.com/uri/v1/marker?marker=coord:' + MAP_LAT + ',' + MAP_LNG + ';title=' + label + '&referer=redistrict',
      },
    ];
  }

  function getDefaultMapUrl() {
    var label = encodeURIComponent(MAP_NAME);
    if (isIOS()) {
      return 'https://maps.apple.com/?q=' + label + '&ll=' + MAP_LAT + ',' + MAP_LNG;
    }

    if (isAndroid()) {
      return 'geo:' + MAP_LAT + ',' + MAP_LNG + '?q=' + label;
    }

    return 'https://maps.apple.com/?q=' + label + '&ll=' + MAP_LAT + ',' + MAP_LNG;
  }

  function hideMapChooser() {
    var existing = document.getElementById('map-chooser-modal');
    if (existing) {
      existing.remove();
    }
  }

  function copyAddressToClipboard() {
    var text = MAP_NAME + '\n' + MAP_ADDRESS;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        alert('地址已复制，可粘贴到地图或聊天工具中');
      }, function () {
        prompt('请手动复制以下地址', text);
      });
      return;
    }
    prompt('请手动复制以下地址', text);
  }

  function openMapChooser() {
    hideMapChooser();

    var modal = document.createElement('div');
    modal.id = 'map-chooser-modal';
    modal.className = 'map-chooser-modal';
    modal.addEventListener('click', function (event) {
      if (event.target === modal) {
        hideMapChooser();
      }
    });

    var panel = document.createElement('div');
    panel.className = 'map-chooser-panel';

    var header = document.createElement('div');
    header.className = 'map-chooser-header';
    header.innerHTML = '<p class="map-chooser-title">选择地图导航</p>' +
      '<p class="map-chooser-subtitle">当前位置：' + MAP_NAME + '</p>';

    var list = document.createElement('div');
    list.className = 'map-chooser-list';

    getMapOptions().forEach(function (option) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'map-chooser-item';
      item.textContent = option.label;
      item.addEventListener('click', function () {
        hideMapChooser();
        openUrl(option.url);
      });
      list.appendChild(item);
    });

    var note = document.createElement('div');
    note.className = 'map-chooser-note';
    note.textContent = '如果您未安装本地地图，建议先复制地址后在地图应用中搜索。';

    var closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'map-chooser-close';
    closeButton.textContent = '复制地址并关闭';
    closeButton.addEventListener('click', function () {
      copyAddressToClipboard();
      hideMapChooser();
    });

    panel.appendChild(header);
    panel.appendChild(list);
    panel.appendChild(note);
    panel.appendChild(closeButton);
    modal.appendChild(panel);
    document.body.appendChild(modal);
  }

  function bindMapButtons() {
    var buttons = document.querySelectorAll('.btn-map-nav');
    buttons.forEach(function (button) {
      button.addEventListener('click', openMapChooser);
    });
  }

  document.addEventListener('DOMContentLoaded', bindMapButtons);
  window.MapNavigation = {
    openMapChooser: openMapChooser,
    openMapDefault: function () {
      openUrl(getDefaultMapUrl());
    },
  };
})();
