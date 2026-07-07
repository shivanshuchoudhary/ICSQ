/**
 * Microsoft SSO for the admin panel (/admin).
 */
(function () {
  'use strict';

  function randomStateSuffix() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return String(Date.now()) + Math.random().toString(36).slice(2);
  }

  function resetSsoButton() {
    var btn = document.getElementById('microsoftSSOBtn');
    if (!btn) return;
    btn.disabled = false;
    btn.dataset.busy = '0';
  }

  async function startAdminMicrosoftSSO() {
    var btn = document.getElementById('microsoftSSOBtn');
    if (btn && btn.dataset.busy === '1') return;
    if (btn) {
      btn.dataset.busy = '1';
      btn.disabled = true;
    }

    try {
      var state = 'admin:' + randomStateSuffix();
      var res = await fetch(
        '/api/v1/auth/microsoft/login?state=' + encodeURIComponent(state),
        {
          method: 'GET',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        }
      );
      if (!res.ok) throw new Error('Request failed (' + res.status + ')');
      var data = await res.json();
      if (!data || !data.auth_url) throw new Error('Missing Microsoft auth URL');
      window.location.href = data.auth_url;
    } catch (err) {
      var msg = err && err.message ? err.message : 'Unable to start Microsoft login';
      var el = document.getElementById('loginErr');
      if (el) el.textContent = 'Microsoft login failed: ' + msg;
      resetSsoButton();
    }
  }

  function bindAdminSsoButton() {
    var btn = document.getElementById('microsoftSSOBtn');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function (event) {
      event.preventDefault();
      startAdminMicrosoftSSO();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAdminSsoButton);
  } else {
    bindAdminSsoButton();
  }
})();
