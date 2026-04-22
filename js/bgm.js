(function (global) {
  'use strict';

  var BGM_SRC = 'audio/bgm.mp3';
  var audioEl = null;
  var isPlaying = false;
  var controlBtn = null;
  var audioReady = false;
  var firstInteractionHandled = false;

  function createControl() {
    if (document.getElementById('bgmControl')) return;

    var btn = document.createElement('button');
    btn.id = 'bgmControl';
    btn.type = 'button';
    btn.className = 'bgm-control';
    btn.setAttribute('aria-label', '背景音乐控制');
    btn.innerHTML = '<span class="bgm-control__icon">&#x1F50A;</span><span class="bgm-control__label">点击播放音乐</span>';

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
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

  // 首次交互自动播放
  function playOnFirstInteraction(e) {
    // 如果用户直接点击了按钮，让按钮自己处理，这里不再重复触发
    if (e.target === controlBtn || controlBtn.contains(e.target)) {
      firstInteractionHandled = true;
      removeFirstInteractionListeners();
      return;
    }

    if (firstInteractionHandled) return;
    if (!audioEl || !audioReady) return;
    if (!audioEl.paused) return;

    firstInteractionHandled = true;

    audioEl.play().then(function () {
      isPlaying = true;
      updateBtn();
    }).catch(function () {
      // 播放失败，静默处理
    });

    removeFirstInteractionListeners();
  }

  function removeFirstInteractionListeners() {
    document.body.removeEventListener('click', playOnFirstInteraction);
    document.body.removeEventListener('touchstart', playOnFirstInteraction);
  }

  function togglePlay() {
    if (!audioEl) return;
    if (!audioReady) return;

    if (!firstInteractionHandled) {
      firstInteractionHandled = true;
      removeFirstInteractionListeners();
    }

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

    // 监听首次交互
    document.body.addEventListener('click', playOnFirstInteraction);
    document.body.addEventListener('touchstart', playOnFirstInteraction);
  }

  function destroy() {
    removeFirstInteractionListeners();
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