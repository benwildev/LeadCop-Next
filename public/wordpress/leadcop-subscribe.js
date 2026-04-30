(function () {
  'use strict';

  function initForm(wrap) {
    var form = wrap.querySelector('.leadcop-subscribe-form');
    var msg = wrap.querySelector('.leadcop-msg');
    var success = wrap.querySelector('.leadcop-success');
    var btn = wrap.querySelector('.leadcop-btn');

    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var emailInput = form.querySelector('.leadcop-email');
      var nameInput = form.querySelector('.leadcop-name');
      var email = emailInput ? emailInput.value.trim() : '';
      var name = nameInput ? nameInput.value.trim() : '';
      var nonce = form.dataset.nonce || '';

      if (!email) {
        showMsg(msg, 'Please enter your email address.', 'error');
        return;
      }

      btn.disabled = true;
      var originalText = btn.textContent;
      btn.textContent = 'Please wait\u2026';
      hideMsg(msg);

      var body = new URLSearchParams();
      body.append('action', 'leadcop_subscribe');
      body.append('nonce', nonce);
      body.append('email', email);
      if (name) body.append('name', name);

      var xhr = new XMLHttpRequest();
      xhr.open('POST', (window.leadcopAjax && window.leadcopAjax.ajaxurl) || '/wp-admin/admin-ajax.php');
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.onload = function () {
        btn.disabled = false;
        btn.textContent = originalText;

        var data;
        try { data = JSON.parse(xhr.responseText); } catch (err) { data = null; }

        if (data && data.success) {
          form.style.display = 'none';
          success.style.display = '';
        } else {
          var errMsg = (data && data.data && data.data.message) || 'Something went wrong. Please try again.';
          showMsg(msg, errMsg, 'error');
        }
      };
      xhr.onerror = function () {
        btn.disabled = false;
        btn.textContent = originalText;
        showMsg(msg, 'Network error. Please try again.', 'error');
      };
      xhr.send(body.toString());
    });
  }

  function showMsg(el, text, type) {
    el.textContent = text;
    el.className = 'leadcop-msg leadcop-' + type;
    el.style.display = '';
  }

  function hideMsg(el) {
    el.style.display = 'none';
    el.textContent = '';
    el.className = 'leadcop-msg';
  }

  function init() {
    var wraps = document.querySelectorAll('.leadcop-subscribe-wrap');
    for (var i = 0; i < wraps.length; i++) {
      initForm(wraps[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
