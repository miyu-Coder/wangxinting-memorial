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

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTime(iso) {
    if (!iso) return '';
    try {
      var norm = String(iso).trim().replace(' ', 'T');
      var d = new Date(norm);
      if (isNaN(d.getTime())) return iso;
      var Y = d.getFullYear();
      var M = String(d.getMonth() + 1).padStart(2, '0');
      var D = String(d.getDate()).padStart(2, '0');
      var h = String(d.getHours()).padStart(2, '0');
      var m = String(d.getMinutes()).padStart(2, '0');
      return Y + '-' + M + '-' + D + ' ' + h + ':' + m;
    } catch (e) {
      return iso;
    }
  }

  function hashNicknameToColor(nick) {
    var str = nick || '游客';
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    var r = 255;
    var g = 192 + Math.abs(hash) % 48;
    var b = 192 + Math.abs(hash >> 8) % 48;
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function getInitial(nick) {
    var displayNick = nick || '参观者';
    if (window.WxCommon && typeof window.WxCommon.displayNickname === 'function') {
      displayNick = window.WxCommon.displayNickname(nick);
    }
    var str = displayNick.trim();
    if (!str) return '游';
    var chars = Array.from(str);
    return chars[0];
  }

  function queryFirst(arr, root) {
    root = root || document;
    for (var i = 0; i < arr.length; i++) {
      try {
        var el = root.querySelector(arr[i]);
        if (el) return el;
      } catch (e) {}
    }
    return null;
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

  var LIST_SELECTORS = ['#messageList', '#messages-list', '.messages-list', '#message-list', '.message-list'];
  var NICK_SELECTORS = ['#nicknameInput', '#nickname', '#msg-nickname', 'input[name="nickname"]'];
  var CONTENT_SELECTORS = ['#messageInput', '#content', '#msg-content', 'textarea[name="content"]'];

  var listEl = null;
  var nickEl = null;
  var contentEl = null;
  var submitBtn = null;
  var pagerEl = null;
  var statsEl = null;

  function renderMessageItem(item) {
    var li = document.createElement('li');
    li.className = 'message-item';

    var metaRow = document.createElement('div');
    metaRow.className = 'message-item__meta';

    var avatar = document.createElement('span');
    avatar.className = 'message-item__avatar';
    avatar.style.background = hashNicknameToColor(item.nickname);
    avatar.textContent = getInitial(item.nickname);

    var nickWrap = document.createElement('span');
    nickWrap.style.display = 'flex';
    nickWrap.style.alignItems = 'center';
    nickWrap.style.flex = '1';
    nickWrap.style.minWidth = '0';

    var nick = document.createElement('span');
    nick.className = 'message-item__nick';
    var displayNick = item.nickname || '参观者';
    if (window.WxCommon && typeof window.WxCommon.displayNickname === 'function') {
      displayNick = window.WxCommon.displayNickname(item.nickname);
    }
    nick.innerHTML = escapeHtml(displayNick);

    nickWrap.appendChild(avatar);
    nickWrap.appendChild(nick);

    var time = document.createElement('span');
    time.className = 'message-item__time';
    time.textContent = formatTime(item.created_at || item.createdAt || '');

    metaRow.appendChild(nickWrap);
    metaRow.appendChild(time);

    var p = document.createElement('p');
    p.className = 'message-item__content';
    p.innerHTML = escapeHtml(item.content || '').replace(/\n/g, '<br>');

    var reply = document.createElement('div');
    reply.className = 'message-item__reply';
    var replyBtn = document.createElement('button');
    replyBtn.type = 'button';
    replyBtn.className = 'message-item__reply-btn';
    replyBtn.textContent = '\uD83C\uDF38 回复敬意';
    replyBtn.addEventListener('click', function () {
      var textarea = document.getElementById('messageInput');
      if (textarea) {
        var prefix = '@' + (item.nickname || '游客') + ' ';
        textarea.value = prefix;
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
    if (!statsEl) return;
    if (totalItems === 0) {
      statsEl.textContent = '';
      return;
    }
    statsEl.textContent = '\u5171 ' + totalItems + ' \u6761\u7559\u8A00';
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
    if (!pagerEl) return;
    pagerEl.innerHTML = '';

    if (totalPages <= 1) {
      pagerEl.style.display = 'none';
      return;
    }
    pagerEl.style.display = 'flex';

    var prevBtn = document.createElement('button');
    prevBtn.className = 'msg-pager__btn msg-pager__btn--nav';
    prevBtn.textContent = '\u25C0';
    prevBtn.disabled = currentPage <= 1;
    prevBtn.addEventListener('click', function () {
      if (currentPage > 1) goToPage(currentPage - 1);
    });
    pagerEl.appendChild(prevBtn);

    var visible = getVisiblePages(currentPage, totalPages);
    for (var i = 0; i < visible.length; i++) {
      var item = visible[i];
      if (item === '...') {
        var dots = document.createElement('span');
        dots.className = 'msg-pager__dots';
        dots.textContent = '...';
        pagerEl.appendChild(dots);
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
        pagerEl.appendChild(pageBtn);
      }
    }

    var nextBtn = document.createElement('button');
    nextBtn.className = 'msg-pager__btn msg-pager__btn--nav';
    nextBtn.textContent = '\u25B6';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.addEventListener('click', function () {
      if (currentPage < totalPages) goToPage(currentPage + 1);
    });
    pagerEl.appendChild(nextBtn);
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
    if (!listEl) return;

    listEl.innerHTML = '';

    if (!Array.isArray(list) || !list.length) {
      var empty = document.createElement('p');
      empty.className = 'messages-empty';
      empty.textContent = '暂无留言，留下第一句敬意';
      listEl.appendChild(empty);
      updateEndingText();
      return;
    }

    for (var i = 0; i < list.length; i++) {
      try {
        var node = renderMessageItem(list[i]);
        listEl.appendChild(node);
      } catch (e) {}
    }

    updateEndingText();
  }

  function updateEndingText() {
    if (typeof global.wxFlowers !== 'undefined' && typeof global.wxFlowers.updateEndingText === 'function') {
      global.wxFlowers.updateEndingText();
    }
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
        var pg = result.pagination;
        currentPage = page;
        totalPages = pg.totalPages || Math.max(1, Math.ceil((pg.total || 0) / PAGE_SIZE));
        totalItems = pg.total || 0;
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
    if (!content) {
      showMessageDialog('留言内容不能为空', '知道了');
      return Promise.resolve({ success: false, message: '留言内容不能为空' });
    }
    if (countChars(content) > 200) {
      showMessageDialog('留言不能超过 200 字', '知道了');
      return Promise.resolve({ success: false, message: '超过长度限制' });
    }

    return fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ nickname: nickname, content: content })
    }).then(function (res) {
      return res.json().catch(function () { return { success: false }; });
    }).then(function (body) {
      if (body && body.success) {
        if (contentEl) contentEl.value = '';
        showMessageDialog('留言提交成功，等待审核', '好的');
        return { success: true };
      }
      var msg = (body && body.message) || '提交失败，请稍后重试';
      showMessageDialog(msg, '知道了');
      return { success: false, message: msg };
    }).catch(function () {
      showMessageDialog('提交失败，请稍后重试', '知道了');
      return { success: false, message: '网络错误' };
    });
  }

  function handleSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    var nick = nickEl ? nickEl.value : '';
    var content = contentEl ? contentEl.value : '';

    if (nick && nick.trim()) {
      if (window.WxCommon && typeof window.WxCommon.updateUserNickname === 'function') {
        window.WxCommon.updateUserNickname(nick.trim());
      } else {
        try {
          localStorage.setItem('userNickname', nick.trim());
        } catch (e) {}
      }
    }

    if (submitBtn) submitBtn.disabled = true;
    submitMessage(nick, content).then(function (result) {
      if (submitBtn) submitBtn.disabled = false;
    });
  }

  function init() {
    listEl = queryFirst(LIST_SELECTORS);
    nickEl = queryFirst(NICK_SELECTORS);
    contentEl = queryFirst(CONTENT_SELECTORS);
    submitBtn = document.getElementById('submitBtn');

    pagerEl = document.getElementById('msgPager');
    statsEl = document.getElementById('msgStats');

    if (contentEl) {
      contentEl.placeholder = '\uD83D\uDCAC 写下您想对将军说的话...';
    }

    if (nickEl) {
      if (window.WxCommon && typeof window.WxCommon.getUserNickname === 'function') {
        var savedNickname = window.WxCommon.getUserNickname();
        if (savedNickname && !nickEl.value) {
          nickEl.value = savedNickname;
        }
      } else {
        try {
          var savedNickname = localStorage.getItem('userNickname') || '';
          if (savedNickname && !nickEl.value) {
            nickEl.value = savedNickname;
          }
        } catch (e) {}
      }
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', function (e) {
        e.preventDefault();
        handleSubmit(e);
      });
    }

    loadMessages(1);
  }

  global.wxMessages = {
    init: init,
    loadMessages: loadMessages,
    refreshMessages: refreshMessages,
    submitMessage: submitMessage
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
