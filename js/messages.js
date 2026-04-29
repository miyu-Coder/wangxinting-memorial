(function (global) {
  'use strict';

  var PAGE_SIZE = 20;
  var currentPage = 1;
  var totalPages = 1;
  var totalItems = 0;
  var isLoading = false;

  function countChars(s) {
    return Array.from(String(s || '')).length;
  }

  function showMessageDialog(title, btnText) {
    var mask = document.createElement('div');
    mask.className = 'flower-tribute-modal-mask';
    mask.setAttribute('role', 'dialog');
    mask.setAttribute('aria-modal', 'true');

    var panel = document.createElement('div');
    panel.className = 'flower-tribute-modal-panel';

    var h = document.createElement('p');
    h.className = 'flower-tribute-modal-title';
    h.textContent = title;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary flower-tribute-modal-btn';
    btn.textContent = btnText || '确定';

    function close() { mask.remove(); }
    btn.addEventListener('click', close);
    mask.addEventListener('click', function (ev) { if (ev.target === mask) close(); });

    panel.appendChild(h);
    panel.appendChild(btn);
    mask.appendChild(panel);
    document.body.appendChild(mask);
  }

  function renderMessageItem(item) {
    var li = document.createElement('li');
    li.className = 'message-item';

    // === 内联 escapeHtml ===
    var nickname = (item.nickname || '参观者');
    nickname = String(nickname).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    var content = (item.content || '');
    content = String(content).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // === 内联 getInitial ===
    var initial = '游';
    try {
      if (window.WxCommon && typeof window.WxCommon.displayNickname === 'function') {
        var dn = window.WxCommon.displayNickname(item.nickname);
        if (dn) { var chars = Array.from(dn.trim()); if (chars.length > 0) initial = chars[0]; }
      } else {
        var str2 = (item.nickname || '参观者').trim();
        if (str2) { var chars2 = Array.from(str2); if (chars2.length > 0) initial = chars2[0]; }
      }
    } catch(e) { initial = '游'; }

    // === 内联 hashNicknameToColor ===
    var bgColor = 'rgb(255,200,200)';
    try {
      var hashStr = item.nickname || '游客';
      var hash = 0;
      for (var hi = 0; hi < hashStr.length; hi++) { hash = hashStr.charCodeAt(hi) + ((hash << 5) - hash); }
      bgColor = 'rgb(255,' + (192 + Math.abs(hash) % 48) + ',' + (192 + Math.abs(hash >> 8) % 48) + ')';
    } catch(e) {}

    // === 内联 formatTime ===
    var timeStr = '';
    try {
      if (item.created_at) {
        var iso = String(item.created_at).trim().replace(' ', 'T');
        var d = new Date(iso);
        if (!isNaN(d.getTime())) {
          timeStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        }
      }
    } catch(e) {}

    // === 构建 DOM ===
    var metaRow = document.createElement('div');
    metaRow.className = 'message-item__meta';

    var avatar = document.createElement('span');
    avatar.className = 'message-item__avatar';
    avatar.style.background = bgColor;
    avatar.textContent = initial;

    var nickWrap = document.createElement('span');
    nickWrap.style.display = 'flex';
    nickWrap.style.alignItems = 'center';
    nickWrap.style.flex = '1';
    nickWrap.style.minWidth = '0';

    var nick = document.createElement('span');
    nick.className = 'message-item__nick';
    nick.innerHTML = nickname;

    nickWrap.appendChild(avatar);
    nickWrap.appendChild(nick);

    var time = document.createElement('span');
    time.className = 'message-item__time';
    time.textContent = timeStr;

    metaRow.appendChild(nickWrap);
    metaRow.appendChild(time);

    var p = document.createElement('p');
    p.className = 'message-item__content';
    p.innerHTML = content.replace(/\n/g, '<br>');

    var reply = document.createElement('div');
    reply.className = 'message-item__reply';
    var replyBtn = document.createElement('button');
    replyBtn.type = 'button';
    replyBtn.className = 'message-item__reply-btn';
    replyBtn.textContent = '\uD83C\uDF38 回复敬意';
    replyBtn.addEventListener('click', function () {
      var textarea = document.getElementById('messageInput');
      if (textarea) {
        textarea.value = '@' + (item.nickname || '游客') + ' ';
        textarea.focus();
      }
    });
    reply.appendChild(replyBtn);

    li.appendChild(metaRow);
    li.appendChild(p);
    li.appendChild(reply);
    return li;
  }

  function updateStats() {
    var el = document.getElementById('msgStats');
    if (!el) return;
    if (totalItems === 0) {
      el.textContent = '';
      return;
    }
    el.textContent = '\u5171 ' + totalItems + ' \u6761\u7559\u8A00';
  }

  function getVisiblePages(current, total) {
    if (total <= 7) {
      var pages = [];
      for (var i = 1; i <= total; i++) pages.push(i);
      return pages;
    }
    var result = [1];
    var left = Math.max(2, current - 1);
    var right = Math.min(total - 1, current + 1);
    if (left > 2) result.push('...');
    for (var j = left; j <= right; j++) result.push(j);
    if (right < total - 1) result.push('...');
    result.push(total);
    return result;
  }

  function renderPager() {
    var el = document.getElementById('msgPager');
    if (!el) return;
    el.innerHTML = '';

    if (totalPages <= 1) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'flex';

    var prevBtn = document.createElement('button');
    prevBtn.className = 'msg-pager__btn msg-pager__btn--nav';
    prevBtn.textContent = '\u25C0';
    prevBtn.disabled = currentPage <= 1;
    prevBtn.addEventListener('click', function () {
      if (currentPage > 1) goToPage(currentPage - 1);
    });
    el.appendChild(prevBtn);

    var visible = getVisiblePages(currentPage, totalPages);
    for (var i = 0; i < visible.length; i++) {
      var item = visible[i];
      if (item === '...') {
        var dots = document.createElement('span');
        dots.className = 'msg-pager__dots';
        dots.textContent = '...';
        el.appendChild(dots);
      } else {
        var pageBtn = document.createElement('button');
        pageBtn.className = 'msg-pager__btn';
        if (item === currentPage) pageBtn.className += ' msg-pager__btn--active';
        pageBtn.textContent = item;
        (function (p) {
          pageBtn.addEventListener('click', function () {
            goToPage(p);
          });
        })(item);
        el.appendChild(pageBtn);
      }
    }

    var nextBtn = document.createElement('button');
    nextBtn.className = 'msg-pager__btn msg-pager__btn--nav';
    nextBtn.textContent = '\u25B6';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.addEventListener('click', function () {
      if (currentPage < totalPages) goToPage(currentPage + 1);
    });
    el.appendChild(nextBtn);
  }

  function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage || isLoading) return;
    loadMessages(page).then(function () {
      var moduleEl = document.querySelector('.message-module');
      if (moduleEl) {
        moduleEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  function appendMessages(list) {
    var el = document.getElementById('messageList');
    if (!el) return;

    el.innerHTML = '';

    if (!Array.isArray(list) || !list.length) {
      var empty = document.createElement('p');
      empty.className = 'messages-empty';
      empty.textContent = '暂无留言，留下第一句敬意';
      el.appendChild(empty);
      return;
    }

    for (var i = 0; i < list.length; i++) {
      try {
        var node = renderMessageItem(list[i]);
        el.appendChild(node);
      } catch (e) {
        console.error('renderMessageItem error at index', i, e);
      }
    }

    // 删除 flowers.js 可能插入的重复"暂无留言"
    var dupEnding = document.querySelector('.flower-wall-ending');
    if (dupEnding) dupEnding.remove();
  }

  function loadMessages(page) {
    page = page || 1;
    if (isLoading) return Promise.resolve([]);
    isLoading = true;

    return fetch('/api/messages?page=' + page + '&limit=' + PAGE_SIZE, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) return Promise.resolve({ list: [], pagination: { total: 0, totalPages: 1 } });
        return res.json().then(function (body) {
          return {
            list: (body && Array.isArray(body.list)) ? body.list : [],
            pagination: (body && body.pagination) || { total: 0, totalPages: 1 }
          };
        }).catch(function () { return { list: [], pagination: { total: 0, totalPages: 1 } }; });
      })
      .catch(function () { return { list: [], pagination: { total: 0, totalPages: 1 } }; })
      .then(function (result) {
        isLoading = false;
        currentPage = page;
        totalPages = result.pagination.totalPages || Math.max(1, Math.ceil((result.pagination.total || 0) / PAGE_SIZE));
        totalItems = result.pagination.total || 0;
        appendMessages(result.list);
        renderPager();
        updateStats();
        return result.list;
      });
  }

  function refreshMessages() {
    currentPage = 1;
    return loadMessages(1);
  }

  function submitMessage(nickname, content) {
    nickname = (nickname || '').trim() || '游客';
    content = (content || '').trim();
    if (!content) { showMessageDialog('留言内容不能为空', '知道了'); return Promise.resolve({ success: false }); }
    if (countChars(content) > 200) { showMessageDialog('留言不能超过 200 字', '知道了'); return Promise.resolve({ success: false }); }

    return fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ nickname: nickname, content: content })
    }).then(function (res) { return res.json().catch(function () { return { success: false }; }); })
      .then(function (body) {
        if (body && body.success) {
          var contentEl = document.getElementById('messageInput');
          if (contentEl) contentEl.value = '';
          showMessageDialog('留言提交成功，等待审核', '好的');
          return { success: true };
        }
        showMessageDialog((body && body.message) || '提交失败，请稍后重试', '知道了');
        return { success: false };
      }).catch(function () {
        showMessageDialog('提交失败，请稍后重试', '知道了');
        return { success: false };
      });
  }

  function handleSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    var nick = document.getElementById('nicknameInput');
    var content = document.getElementById('messageInput');
    var btn = document.getElementById('submitBtn');
    var nickVal = nick ? nick.value : '';
    var contentVal = content ? content.value : '';

    if (nickVal && nickVal.trim()) {
      if (window.WxCommon && typeof window.WxCommon.updateUserNickname === 'function') {
        window.WxCommon.updateUserNickname(nickVal.trim());
      } else {
        try { localStorage.setItem('userNickname', nickVal.trim()); } catch (e) {}
      }
    }
    if (btn) btn.disabled = true;
    submitMessage(nickVal, contentVal).then(function (result) {
      if (btn) btn.disabled = false;
      if (result && result.success) refreshMessages();
    });
  }

  function init() {
    var nickEl = document.getElementById('nicknameInput');
    var contentEl = document.getElementById('messageInput');
    var submitBtn = document.getElementById('submitBtn');

    if (contentEl) contentEl.placeholder = '\uD83D\uDCAC 写下您想对将军说的话...';

    if (nickEl) {
      var saved = '';
      if (window.WxCommon && typeof window.WxCommon.getUserNickname === 'function') {
        saved = window.WxCommon.getUserNickname();
      } else {
        try { saved = localStorage.getItem('userNickname') || ''; } catch (e) {}
      }
      if (saved && !nickEl.value) nickEl.value = saved;
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', function (e) { e.preventDefault(); handleSubmit(e); });
    }

    loadMessages(1);
  }

  global.wxMessages = { init: init, loadMessages: loadMessages, refreshMessages: refreshMessages, submitMessage: submitMessage };

  setTimeout(function () { init(); }, 500);

})(window);