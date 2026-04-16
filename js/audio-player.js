/**
 * 详情页语音播放器：进度、倍速、音量、静音
 */
(function (global) {
  "use strict";

  function pad2(n) {
    n = Math.floor(Number(n) || 0);
    return (n < 10 ? "0" : "") + n;
  }

  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return "00:00";
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return pad2(m) + ":" + pad2(s);
  }

  /**
   * @param {Object} opts
   * @param {HTMLAudioElement} opts.audioEl
   * @param {Object} opts.els
   * @param {function(): void} [opts.onPlaybackError]
   */
  function WxDetailAudioPlayer(opts) {
    this.audio = opts.audioEl;
    this.els = opts.els || {};
    this.onPlaybackError = typeof opts.onPlaybackError === "function" ? opts.onPlaybackError : function () {};

    this._rates = [1, 1.25, 1.5];
    this._rateIdx = 0;
    this._seekDragging = false;
    this._lastVolume = 1;
    this._destroyed = false;

    this._onTimeUpdate = this._handleTimeUpdate.bind(this);
    this._onPlay = this._syncPlayUi.bind(this);
    this._onPause = this._syncPlayUi.bind(this);
    this._onEnded = this._handleEnded.bind(this);
    this._onLoadedMeta = this._handleLoadedMeta.bind(this);
    this._onError = this._handleError.bind(this);
    this._onVolInput = this._handleVolInput.bind(this);
    this._onSeekInput = this._handleSeekInput.bind(this);
    this._onSeekDown = this._onSeekDragStart.bind(this);
    this._onSeekUp = this._onSeekDragEnd.bind(this);
    this._playClick = this._onPlayClick.bind(this);
    this._muteClick = this._onMuteClick.bind(this);
    this._rateClick = this._onRateClick.bind(this);

    this._bindUi();
    this._attachAudio();
    this._syncPlayUi();
    this._syncRateLabel();
    this._syncMuteUi();
  }

  WxDetailAudioPlayer.prototype._bindUi = function () {
    var e = this.els;
    if (e.playBtn) {
      e.playBtn.addEventListener("click", this._playClick);
    }
    if (e.muteBtn) {
      e.muteBtn.addEventListener("click", this._muteClick);
    }
    if (e.rateBtn) {
      e.rateBtn.addEventListener("click", this._rateClick);
    }
    if (e.volRange) {
      e.volRange.addEventListener("input", this._onVolInput);
    }
    if (e.seekRange) {
      e.seekRange.addEventListener("input", this._onSeekInput);
      e.seekRange.addEventListener("mousedown", this._onSeekDown);
      e.seekRange.addEventListener("touchstart", this._onSeekDown, { passive: true });
    }
    window.addEventListener("mouseup", this._onSeekUp);
    window.addEventListener("touchend", this._onSeekUp);
  };

  WxDetailAudioPlayer.prototype._attachAudio = function () {
    var a = this.audio;
    a.addEventListener("timeupdate", this._onTimeUpdate);
    a.addEventListener("play", this._onPlay);
    a.addEventListener("pause", this._onPause);
    a.addEventListener("ended", this._onEnded);
    a.addEventListener("loadedmetadata", this._onLoadedMeta);
    a.addEventListener("error", this._onError);
  };

  WxDetailAudioPlayer.prototype._detachAudio = function () {
    var a = this.audio;
    if (!a) return;
    a.removeEventListener("timeupdate", this._onTimeUpdate);
    a.removeEventListener("play", this._onPlay);
    a.removeEventListener("pause", this._onPause);
    a.removeEventListener("ended", this._onEnded);
    a.removeEventListener("loadedmetadata", this._onLoadedMeta);
    a.removeEventListener("error", this._onError);
  };

  WxDetailAudioPlayer.prototype.destroy = function () {
    if (this._destroyed) return;
    this._destroyed = true;
    window.removeEventListener("mouseup", this._onSeekUp);
    window.removeEventListener("touchend", this._onSeekUp);
    var e = this.els;
    if (e.playBtn) e.playBtn.removeEventListener("click", this._playClick);
    if (e.muteBtn) e.muteBtn.removeEventListener("click", this._muteClick);
    if (e.rateBtn) e.rateBtn.removeEventListener("click", this._rateClick);
    if (e.volRange) e.volRange.removeEventListener("input", this._onVolInput);
    if (e.seekRange) {
      e.seekRange.removeEventListener("input", this._onSeekInput);
      e.seekRange.removeEventListener("mousedown", this._onSeekDown);
      e.seekRange.removeEventListener("touchstart", this._onSeekDown);
    }
    this._detachAudio();
    try {
      this.audio.pause();
    } catch (err) {}
  };

  WxDetailAudioPlayer.prototype.resetTransport = function () {
    var a = this.audio;
    try {
      a.pause();
      a.currentTime = 0;
    } catch (e2) {}
    try {
      a.volume = 1;
      a.muted = false;
    } catch (e3) {}
    this._lastVolume = 1;
    if (this.els.volRange) this.els.volRange.value = "1";
    this._rateIdx = 0;
    a.playbackRate = this._rates[0];
    this._syncRateLabel();
    this._syncMuteUi();
    if (this.els.seekRange) this.els.seekRange.value = "0";
    this._updateFill(0);
    this._setTimeLabels(0, NaN);
    this._syncPlayUi();
  };

  WxDetailAudioPlayer.prototype.loadUrl = function (url) {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }
    var a = this.audio;
    this._hideError();
    a.pause();
    a.removeAttribute("src");
    a.src = url;
    a.playbackRate = this._rates[this._rateIdx];
    a.load();
    if (this.els.seekRange) this.els.seekRange.value = "0";
    this._updateFill(0);
    this._setTimeLabels(0, NaN);
    this._syncPlayUi();
    this.setUiDisabled(false);
  };

  WxDetailAudioPlayer.prototype.setUiDisabled = function (disabled) {
    var e = this.els;
    var dis = !!disabled;
    if (e.playBtn) {
      e.playBtn.disabled = dis;
      e.playBtn.setAttribute("aria-disabled", dis ? "true" : "false");
    }
    if (e.seekRange) e.seekRange.disabled = dis;
    if (e.muteBtn) e.muteBtn.disabled = dis;
    if (e.rateBtn) e.rateBtn.disabled = dis;
    if (e.volRange) e.volRange.disabled = dis;
  };

  WxDetailAudioPlayer.prototype.showErrorState = function () {
    this.setUiDisabled(true);
    try {
      this.audio.pause();
    } catch (e) {}
    this._syncPlayUi();
  };

  WxDetailAudioPlayer.prototype._hideError = function () {
    var m = this.els.loadMsg;
    if (m) m.hidden = true;
  };

  WxDetailAudioPlayer.prototype._handleError = function () {
    this.onPlaybackError();
    this.showErrorState();
  };

  WxDetailAudioPlayer.prototype._handleLoadedMeta = function () {
    var d = this.audio.duration;
    this._setTimeLabels(this.audio.currentTime, d);
    this._handleTimeUpdate();
  };

  WxDetailAudioPlayer.prototype._handleTimeUpdate = function () {
    if (this._seekDragging) return;
    var a = this.audio;
    var d = a.duration;
    var t = a.currentTime;
    if (Number.isFinite(d) && d > 0) {
      var pct = (t / d) * 1000;
      if (this.els.seekRange) this.els.seekRange.value = String(Math.min(1000, Math.max(0, pct)));
      this._updateFill(t / d);
    } else {
      this._updateFill(0);
    }
    this._setTimeLabels(t, d);
  };

  WxDetailAudioPlayer.prototype._updateFill = function (ratio) {
    var el = this.els.fill;
    if (!el) return;
    var r = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
    el.style.width = r * 100 + "%";
  };

  WxDetailAudioPlayer.prototype._setTimeLabels = function (cur, dur) {
    if (this.els.timeCur) this.els.timeCur.textContent = formatTime(cur);
    if (this.els.timeDur) {
      this.els.timeDur.textContent = Number.isFinite(dur) && dur > 0 ? formatTime(dur) : "--:--";
    }
  };

  WxDetailAudioPlayer.prototype._handleEnded = function () {
    this._syncPlayUi();
    if (this.els.seekRange) this.els.seekRange.value = "0";
    this._updateFill(0);
  };

  WxDetailAudioPlayer.prototype._syncPlayUi = function () {
    var btn = this.els.playBtn;
    if (!btn) return;
    var playing = !this.audio.paused;
    var icon = btn.querySelector(".detail-audio-play-icon");
    if (icon) {
      icon.textContent = playing ? "\u23F8\uFE0F" : "\u25B6\uFE0F";
    }
    btn.setAttribute("aria-label", playing ? "\u6682\u505C\u8BB2\u89E3" : "\u64AD\u653E\u8BB2\u89E3");
    btn.setAttribute("aria-pressed", playing ? "true" : "false");
  };

  WxDetailAudioPlayer.prototype._onPlayClick = function () {
    if (this.els.playBtn && this.els.playBtn.disabled) return;
    var a = this.audio;
    if (a.paused) {
      var p = a.play();
      if (p && typeof p.catch === "function") {
        p.catch(function (err) {
          if (err && err.name === 'AbortError') return;
          this._handleError();
        }.bind(this));
      }
    } else {
      a.pause();
    }
  };

  WxDetailAudioPlayer.prototype._onSeekDragStart = function () {
    this._seekDragging = true;
  };

  WxDetailAudioPlayer.prototype._onSeekDragEnd = function () {
    this._seekDragging = false;
    this._handleTimeUpdate();
  };

  WxDetailAudioPlayer.prototype._handleSeekInput = function () {
    var a = this.audio;
    var d = a.duration;
    if (!Number.isFinite(d) || d <= 0) return;
    var v = parseFloat(String(this.els.seekRange.value || "0"));
    var t = (v / 1000) * d;
    a.currentTime = t;
    this._updateFill(t / d);
    this._setTimeLabels(t, d);
  };

  WxDetailAudioPlayer.prototype._onMuteClick = function () {
    var a = this.audio;
    if (a.muted) {
      a.muted = false;
      if (a.volume === 0) {
        a.volume = this._lastVolume > 0 ? this._lastVolume : 0.8;
      }
    } else {
      this._lastVolume = a.volume > 0 ? a.volume : 1;
      a.muted = true;
    }
    if (this.els.volRange && !a.muted) {
      this.els.volRange.value = String(a.volume);
    }
    this._syncMuteUi();
  };

  WxDetailAudioPlayer.prototype._handleVolInput = function () {
    var a = this.audio;
    var v = parseFloat(String(this.els.volRange.value));
    if (!Number.isFinite(v)) v = 1;
    v = Math.min(1, Math.max(0, v));
    a.volume = v;
    this._lastVolume = v > 0 ? v : this._lastVolume;
    a.muted = v === 0;
    this._syncMuteUi();
  };

  WxDetailAudioPlayer.prototype._syncMuteUi = function () {
    var a = this.audio;
    var btn = this.els.muteBtn;
    if (!btn) return;
    var icon = btn.querySelector(".detail-audio-mute-icon");
    var muted = a.muted || a.volume === 0;
    if (icon) {
      icon.textContent = muted ? "\uD83D\uDD07\uFE0F" : "\uD83D\uDD0A\uFE0F";
    }
    btn.setAttribute("aria-label", muted ? "\u53D6\u6D88\u9759\u97F3" : "\u9759\u97F3");
    btn.setAttribute("aria-pressed", muted ? "true" : "false");
  };

  WxDetailAudioPlayer.prototype._onRateClick = function () {
    this._rateIdx = (this._rateIdx + 1) % this._rates.length;
    var r = this._rates[this._rateIdx];
    this.audio.playbackRate = r;
    this._syncRateLabel();
  };

  WxDetailAudioPlayer.prototype._syncRateLabel = function () {
    var btn = this.els.rateBtn;
    if (!btn) return;
    var r = this._rates[this._rateIdx];
    var label = r === 1 ? "1.0x" : r === 1.25 ? "1.25x" : "1.5x";
    btn.textContent = label;
    btn.setAttribute("aria-label", "\u64AD\u653E\u901F\u5EA6 " + label);
  };

  global.WxDetailAudioPlayer = WxDetailAudioPlayer;
  global.wxAudioFormatTime = formatTime;
})(typeof window !== "undefined" ? window : this);
