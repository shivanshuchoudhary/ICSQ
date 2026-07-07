/**
 * Microsoft SSO for the bundled dashboard.
 * Button is embedded in the bundle template; this script wires behaviour
 * and re-injects the button if the runtime removes it (e.g. after logout).
 */
(function () {
  'use strict';

  var guardTimer = null;
  var loginObserver = null;

  function clearSsoSession() {
    ['sobha_token', 'sobha_user_v5', 'sobha_user', 'sobha_identity'].forEach(function (key) {
      sessionStorage.removeItem(key);
    });
  }

  function isLoginScreenVisible() {
    var wrap = document.getElementById('loginWrap');
    if (!wrap) return false;
    var style = window.getComputedStyle(wrap);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function resetSsoButton() {
    var ssoBtn = document.getElementById('microsoftSSOBtn');
    if (!ssoBtn) return;
    ssoBtn.disabled = false;
    ssoBtn.dataset.busy = '0';
  }

  function ensureMicrosoftSSOStyles() {
    if (document.getElementById('microsoftSSOStyles')) return;
    var style = document.createElement('style');
    style.id = 'microsoftSSOStyles';
    style.textContent = [
      '.btn-sso { width: 100%; margin-top: 12px; padding: 14px; background: #f3f6fb; color: #1a1814; border: 1px solid #d4cdb8; border-radius: 3px; font-weight: 700; font-size: 13px; cursor: pointer; letter-spacing: 1px; text-transform: uppercase; transition: all 0.2s; font-family: inherit; }',
      '.btn-sso:hover { border-color: #b08a4e; background: #fff; }',
      '.btn-sso:disabled { opacity: 0.7; cursor: not-allowed; }',
    ].join(' ');
    document.head.appendChild(style);
  }

  function removeDuplicateSsoButtons() {
    var buttons = document.querySelectorAll('#microsoftSSOBtn');
    for (var i = 1; i < buttons.length; i++) {
      buttons[i].remove();
    }
  }

  function hasHealthySsoButton() {
    var wrap = document.getElementById('loginWrap');
    if (!wrap) return false;
    var btn = wrap.querySelector('#microsoftSSOBtn');
    return !!(btn && wrap.contains(btn));
  }

  function injectMicrosoftSSOButton() {
    var wrap = document.getElementById('loginWrap');
    if (!wrap) return false;

    removeDuplicateSsoButtons();
    if (hasHealthySsoButton()) return true;

    var card = wrap.querySelector('.login-card');
    if (!card) return false;

    ensureMicrosoftSSOStyles();

    var ssoBtn = document.createElement('button');
    ssoBtn.type = 'button';
    ssoBtn.id = 'microsoftSSOBtn';
    ssoBtn.className = 'btn-sso';
    ssoBtn.setAttribute('data-microsoft-sso', '1');
    ssoBtn.textContent = 'Sign in with Microsoft';

    var loginBtn = card.querySelector('.btn-login');
    if (loginBtn) loginBtn.insertAdjacentElement('beforebegin', ssoBtn);
    else card.appendChild(ssoBtn);

    return true;
  }

  async function startMicrosoftSSO() {
    var ssoBtn = document.getElementById('microsoftSSOBtn');
    if (ssoBtn && ssoBtn.dataset.busy === '1') return;
    if (ssoBtn) {
      ssoBtn.dataset.busy = '1';
      ssoBtn.disabled = true;
    }
    try {
      var state = 'dashboard:' + (window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(36).slice(2));
      var res = await fetch(
        '/api/v1/auth/microsoft/login?state=' + encodeURIComponent(state),
        {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('Request failed (' + res.status + ')');
      var data = await res.json();
      if (!data || !data.auth_url) throw new Error('Missing Microsoft auth URL');
      window.location.href = data.auth_url;
    } catch (err) {
      var msg = err && err.message ? err.message : 'Unable to start Microsoft login';
      var el = document.getElementById('loginErr');
      if (el) {
        el.textContent = 'Microsoft login failed: ' + msg;
        el.classList.add('show');
      } else {
        alert('Microsoft login failed: ' + msg);
      }
      resetSsoButton();
    }
  }

  function bindMicrosoftSSOClickHandler() {
    if (window.__sobhaMicrosoftSSOBound) return;
    window.__sobhaMicrosoftSSOBound = true;

    document.addEventListener(
      'click',
      function (event) {
        var btn =
          event.target && event.target.closest
            ? event.target.closest('#microsoftSSOBtn,[data-microsoft-sso="1"]')
            : null;
        if (!btn) return;
        event.preventDefault();
        event.stopPropagation();
        startMicrosoftSSO();
      },
      true
    );
  }

  function ensureSsoOnLoginScreen() {
    if (!isLoginScreenVisible()) return;
    injectMicrosoftSSOButton();
    resetSsoButton();
  }

  function startLoginScreenGuard() {
    if (guardTimer) return;
    guardTimer = window.setInterval(function () {
      if (isLoginScreenVisible()) {
        ensureSsoOnLoginScreen();
      }
    }, 300);
  }

  function watchLoginWrap() {
    if (loginObserver) return;

    function attachObserver() {
      var wrap = document.getElementById('loginWrap');
      if (!wrap) return false;

      loginObserver = new MutationObserver(function () {
        if (isLoginScreenVisible()) ensureSsoOnLoginScreen();
      });
      loginObserver.observe(wrap, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
      return true;
    }

    if (!attachObserver()) {
      var attempts = 0;
      var wait = window.setInterval(function () {
        attempts += 1;
        if (attachObserver() || attempts >= 120) window.clearInterval(wait);
      }, 250);
    }
  }

  function onReturnToLoginScreen() {
    clearSsoSession();
    resetSsoButton();
    ensureSsoOnLoginScreen();
    var err = document.getElementById('loginErr');
    if (err) err.classList.remove('show');
  }

  function patchBundledLogout() {
    if (typeof window.doLogout !== 'function') return false;
    if (window.doLogout.__ssoPatched) return true;

    var original = window.doLogout;
    window.doLogout = function patchedLogout() {
      original.apply(this, arguments);
      window.setTimeout(onReturnToLoginScreen, 0);
      window.setTimeout(onReturnToLoginScreen, 100);
      window.setTimeout(onReturnToLoginScreen, 400);
    };
    window.doLogout.__ssoPatched = true;
    return true;
  }

  function initMicrosoftSSO() {
    bindMicrosoftSSOClickHandler();
    patchBundledLogout();
    watchLoginWrap();
    startLoginScreenGuard();
    ensureSsoOnLoginScreen();

    var attempts = 0;
    var boot = window.setInterval(function () {
      attempts += 1;
      patchBundledLogout();
      ensureSsoOnLoginScreen();
      if ((hasHealthySsoButton() && patchBundledLogout()) || attempts >= 200) {
        window.clearInterval(boot);
      }
    }, 200);
  }

  window.sobhaInitMicrosoftSSO = initMicrosoftSSO;
  window.sobhaReinjectMicrosoftSSO = onReturnToLoginScreen;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMicrosoftSSO);
  } else {
    initMicrosoftSSO();
  }
})();
