(function () {
  "use strict";

  var PosterUtils = {};

  PosterUtils.showLoadingToast = function () {
    PosterUtils.hideLoadingToast();
    var toast = document.createElement("div");
    toast.id = "poster-loading-toast";
    toast.className = "poster-loading-toast";
    toast.textContent = "正在生成海报...";
    document.body.appendChild(toast);
  };

  PosterUtils.hideLoadingToast = function () {
    var toast = document.getElementById("poster-loading-toast");
    if (toast) toast.remove();
  };

  PosterUtils.showSaveSuccessToast = function () {
    var toast = document.createElement("div");
    toast.className = "poster-success-toast";
    toast.textContent = "图片已保存";
    document.body.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.remove();
    }, 2000);
  };

  PosterUtils.showShareToast = function (message) {
    var toast = document.createElement("div");
    toast.className = "poster-share-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.remove();
    }, 2000);
  };

  PosterUtils.copyToClipboard = function (text, successMessage) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        PosterUtils.showShareToast(successMessage || "已复制到剪贴板");
      }).catch(function () {
        PosterUtils.fallbackCopyText(text, successMessage);
      });
    } else {
      PosterUtils.fallbackCopyText(text, successMessage);
    }
  };

  PosterUtils.fallbackCopyText = function (text, successMessage) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      var success = document.execCommand("copy");
      if (success) {
        PosterUtils.showShareToast(successMessage || "已复制到剪贴板");
      } else {
        PosterUtils.showShareToast("复制失败，请手动复制");
      }
    } catch (e) {
      PosterUtils.showShareToast("复制失败，请手动复制");
    } finally {
      if (textarea.parentNode) textarea.remove();
    }
  };

  PosterUtils.showPosterPreview = function (options) {
    var dataUrl = options.dataUrl;
    var title = options.title || "海报已生成";
    var downloadName = options.downloadName || "海报.png";
    var shareTitle = options.shareTitle || "分享";
    var shareText = options.shareText || "";
    var onError = options.onError;

    var existingModal = document.getElementById("poster-preview-modal");
    if (existingModal) existingModal.remove();

    var mask = document.createElement("div");
    mask.id = "poster-preview-modal";
    mask.className = "poster-preview-modal";
    mask.setAttribute("role", "dialog");
    mask.setAttribute("aria-modal", "true");

    var panel = document.createElement("div");
    panel.className = "poster-preview-panel";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "poster-preview-close";
    closeBtn.setAttribute("aria-label", "关闭");
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", function () {
      mask.remove();
    });

    var h = document.createElement("h3");
    h.className = "poster-preview-title";
    h.textContent = title;

    var imgContainer = document.createElement("div");
    imgContainer.className = "poster-preview-image";

    var img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "海报预览";
    img.className = "poster-preview-img";
    imgContainer.appendChild(img);

    var actions = document.createElement("div");
    actions.className = "poster-preview-actions";

    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn btn-primary poster-preview-btn-save";
    saveBtn.textContent = "保存图片";

    var shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.className = "btn btn-secondary poster-preview-btn-share";
    shareBtn.textContent = "分享给好友";

    saveBtn.addEventListener("click", function () {
      try {
        var a = document.createElement("a");
        a.href = dataUrl;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        PosterUtils.showSaveSuccessToast();
      } catch (e) {
        if (onError) {
          onError("保存失败，请长按图片保存");
        } else {
          PosterUtils.showShareToast("保存失败，请长按图片保存");
        }
      }
    });

    shareBtn.addEventListener("click", function () {
      PosterUtils.sharePoster({
        title: shareTitle,
        text: shareText
      });
    });

    mask.addEventListener("click", function (e) {
      if (e.target === mask) mask.remove();
    });

    actions.appendChild(saveBtn);
    actions.appendChild(shareBtn);
    panel.appendChild(closeBtn);
    panel.appendChild(h);
    panel.appendChild(imgContainer);
    panel.appendChild(actions);
    mask.appendChild(panel);
    document.body.appendChild(mask);
  };

  PosterUtils.sharePoster = function (options) {
    var title = options.title || "分享";
    var text = options.text || "";
    var url = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: title,
        text: text,
        url: url
      }).catch(function () {
        PosterUtils.showShareModal({ url: url });
      });
    } else {
      PosterUtils.showShareModal({ url: url });
    }
  };

  PosterUtils.showShareModal = function (options) {
    if (document.getElementById("share-modal")) return;

    var url = options.url || window.location.href;

    var mask = document.createElement("div");
    mask.id = "share-modal";
    mask.className = "share-modal";
    mask.setAttribute("role", "dialog");
    mask.setAttribute("aria-modal", "true");

    var panel = document.createElement("div");
    panel.className = "share-panel";

    var h = document.createElement("h3");
    h.className = "share-title";
    h.textContent = "分享给好友";

    var hint = document.createElement("p");
    hint.className = "share-hint";
    hint.textContent = "点击复制链接，分享给好友";

    var linkBox = document.createElement("div");
    linkBox.className = "share-link-box";
    linkBox.textContent = url;

    var row = document.createElement("div");
    row.className = "share-actions";

    var copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "share-btn-copy";
    copyBtn.textContent = "复制链接";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "share-btn-close";
    closeBtn.textContent = "关闭";

    copyBtn.addEventListener("click", function () {
      PosterUtils.copyToClipboard(url, "链接已复制，可粘贴分享");
      setTimeout(function () {
        mask.remove();
      }, 1000);
    });

    closeBtn.addEventListener("click", function () {
      mask.remove();
    });

    mask.addEventListener("click", function (e) {
      if (e.target === mask) mask.remove();
    });

    row.appendChild(copyBtn);
    row.appendChild(closeBtn);
    panel.appendChild(h);
    panel.appendChild(hint);
    panel.appendChild(linkBox);
    panel.appendChild(row);
    mask.appendChild(panel);
    document.body.appendChild(mask);
  };

  window.PosterUtils = PosterUtils;
})();
