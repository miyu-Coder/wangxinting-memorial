(function (global) {
  'use strict';

  var BGM_SRC = 'audio/bgm.mp3';
  var audioEl = null;
  var isPlaying = false;
  var controlBtn = null;
  var audioReady = false;

  function createControl() {
    if (document.getElementById('bgmControl')) return;

    var btn = document.createElement('button');
    btn.id = 'bgmControl';
    btn.type = 'button';
    btn.className = 'bgm-control';
    btn.setAttribute('aria-label', '背景音乐控制');
    btn.innerHTML = '<span class="bgm-control__icon">&#x1F50A;</span><span class="bgm-control__label">点击播放音乐</span>';

    btn.addEventListener('click', function () {
      togglePlay();
    });

    document.body.appendChild(btn);
    controlBtn = btn;

    audioEl = document.createElement('audio');
    audioEl.loop = true;
    audioEl.preload = 'auto';
    audioEl.volume = 0.4;

    audioEl.addEventListener('canplaythrough', function () {
      audioReady = true;
    });
    audioEl.addEventListener('play', function () {
      isPlaying = true;
      updateBtn();
    });
    audioEl.addEventListener('pause', function () {
      isPlaying = false;
      updateBtn();
    });
    audioEl.addEventListener('error', function () {
      audioReady = false;
      if (controlBtn) {
        var label = controlBtn.querySelector('.bgm-control__label');
        if (label) label.textContent = '音乐加载中...';
        controlBtn.style.opacity = '0.5';
        controlBtn.style.cursor = 'default';
      }
    });

    audioEl.src = BGM_SRC;
  }

  function togglePlay() {
    if (!audioEl) return;
    if (!audioReady) return;
    if (isPlaying) {
      audioEl.pause();
    } else {
      var p = audioEl.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () {});
      }
    }
  }

  function updateBtn() {
    if (!controlBtn) return;
    var icon = controlBtn.querySelector('.bgm-control__icon');
    var label = controlBtn.querySelector('.bgm-control__label');
    if (isPlaying) {
      icon.innerHTML = '&#x1F507;';
      label.textContent = '关闭音乐';
      controlBtn.classList.add('bgm-control--playing');
    } else {
      icon.innerHTML = '&#x1F50A;';
      label.textContent = '播放音乐';
      controlBtn.classList.remove('bgm-control--playing');
    }
  }

  function init() {
    createControl();
  }

  function destroy() {
    if (audioEl) {
      audioEl.pause();
      audioEl.src = '';
    }
    if (controlBtn && controlBtn.parentNode) {
      controlBtn.parentNode.removeChild(controlBtn);
    }
  }

  global.wxBgm = {
    init: init,
    destroy: destroy
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('beforeunload', function () {
    if (audioEl) {
      audioEl.pause();
    }
  });
})(window);
