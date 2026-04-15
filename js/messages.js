/**
 * 留言板前端（基于后端 API）
 * - GET  /api/messages  获取已审核留言（按时间倒序）
 * - POST /api/messages  提交一条留言（需审核后才公开）
 */
(function (global) {
  'use strict';

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

  // ========== 自定义弹窗（与献花弹窗风格一致） ==========
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

  function renderMessageItem(item) {
    var li = document.createElement('li');
    li.className = 'message-item';

    var meta = document.createElement('div');
    meta.className = 'message-item__meta';
    var nick = document.createElement('span');
    nick.className = 'message-item__nick';
    nick.innerHTML = escapeHtml(item.nickname || '游客');
    var time = document.createElement('span');
    time.className = 'message-item__time';
    time.textContent = formatTime(item.created_at || item.createdAt || '');
    meta.appendChild(nick);
    meta.appendChild(time);

    var p = document.createElement('p');
    p.className = 'message-item__content';
    p.innerHTML = escapeHtml(item.content || '').replace(/\n/g, '<br>');

    li.appendChild(meta);
    li.appendChild(p);
    return li;
  }

  function renderList(list) {
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!Array.isArray(list) || !list.length) {
      var empty = document.createElement('p');
      empty.className = 'messages-empty';
      empty.textContent = '暂无留言';
      listEl.appendChild(empty);
      return;
    }
    for (var i = 0; i < list.length; i++) {
      try {
        var it = list[i];
        var node = renderMessageItem(it);
        listEl.appendChild(node);
      } catch (e) {}
    }
  }

  function loadMessages() {
    return fetch('/api/messages', { cache: 'no-store' }).then(function (res) {
      if (!res.ok) return Promise.resolve([]);
      return res.json().then(function (body) {
        if (body && Array.isArray(body.list)) return body.list;
        return [];
      }).catch(function () { return []; });
    }).catch(function () { return []; }).then(function (list) {
      renderList(list);
      return list;
    });
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
      try {
        localStorage.setItem('userNickname', nick.trim());
      } catch (e) {}
    }
    
    if (submitBtn) submitBtn.disabled = true;
    submitMessage(nick, content).then(function () {
      if (submitBtn) submitBtn.disabled = false;
    });
  }

  function init() {
    listEl = queryFirst(LIST_SELECTORS);
    nickEl = queryFirst(NICK_SELECTORS);
    contentEl = queryFirst(CONTENT_SELECTORS);
    submitBtn = document.getElementById('submitBtn');

    if (nickEl) {
      try {
        var savedNickname = localStorage.getItem('userNickname') || '';
        if (savedNickname && !nickEl.value) {
          nickEl.value = savedNickname;
        }
      } catch (e) {}
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', function (e) {
        e.preventDefault();
        handleSubmit(e);
      });
    }

    loadMessages();
  }

  global.wxMessages = {
    init: init,
    loadMessages: loadMessages,
    submitMessage: submitMessage
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);