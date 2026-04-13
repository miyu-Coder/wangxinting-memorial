/**
 * 图片懒加载：IntersectionObserver + data-src，降级时直接加载
 */
(function (global) {
  "use strict";

  /**
   * @param {{ rootMargin?: string, threshold?: number }} [options]
   */
  function LazyLoad(options) {
    options = options || {};
    this._rootMargin = options.rootMargin != null ? options.rootMargin : "50px";
    this._threshold =
      options.threshold != null ? options.threshold : 0.01;
    this._observer = null;
  }

  LazyLoad.prototype.init = function () {
    var self = this;
    if (!("IntersectionObserver" in global)) {
      this.observe();
      this._fallbackAll();
      return;
    }
    this._observer = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          if (!entry.isIntersecting) continue;
          var img = entry.target;
          if (!img || img.tagName !== "IMG") continue;
          self.loadImage(img);
          try {
            self._observer.unobserve(img);
          } catch (e) {}
        }
      },
      {
        root: null,
        rootMargin: this._rootMargin,
        threshold: this._threshold,
      }
    );
    this.observe();
  };

  LazyLoad.prototype.observe = function () {
    var imgs = document.querySelectorAll("img.lazy-image");
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var ds = img.getAttribute("data-src");
      if (!ds || !String(ds).trim()) continue;
      if (this._observer) {
        try {
          this._observer.observe(img);
        } catch (e2) {}
      }
    }
  };

  LazyLoad.prototype.loadImage = function (img) {
    if (!img || img.tagName !== "IMG") return;
    var url = img.getAttribute("data-src");
    if (!url || !String(url).trim()) return;
    url = String(url).trim();

    if (this._observer) {
      try {
        this._observer.unobserve(img);
      } catch (e) {}
    }

    var self = this;
    if (img.src && img.complete && img.naturalWidth > 0) {
      var cur = img.src.split("?")[0];
      var want = url.split("?")[0];
      if (cur.indexOf(want) >= 0 || cur === want) {
        this.onImageLoaded(img);
        return;
      }
    }

    img.onload = function () {
      img.onload = null;
      img.onerror = null;
      self.onImageLoaded(img);
    };
    img.onerror = function () {
      img.onload = null;
      img.onerror = null;
      img.classList.remove("lazy-image");
      img.classList.add("lazy-error");
    };
    img.src = url;
  };

  LazyLoad.prototype.onImageLoaded = function (img) {
    img.classList.remove("lazy-image");
    img.classList.add("lazy-loaded");
    if (img.hasAttribute("data-src")) {
      img.removeAttribute("data-src");
    }
  };

  LazyLoad.prototype._fallbackAll = function () {
    var imgs = document.querySelectorAll("img.lazy-image");
    for (var i = 0; i < imgs.length; i++) {
      this.loadImage(imgs[i]);
    }
  };

  global.LazyLoad = LazyLoad;

  function boot() {
    var ll = new LazyLoad();
    ll.init();
    global.wxLazyLoadInstance = ll;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : this);
