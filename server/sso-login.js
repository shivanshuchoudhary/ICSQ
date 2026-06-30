/**
 * Microsoft SSO for the bundled dashboard.
 * Injects the login button after unpack and wires click + logout behaviour.
 */
(function () {
  'use strict';

  function clearSsoSession() {
    ['sobha_token', 'sobha_user_v5', 'sobha_user', 'sobha_identity'].forEach(function (key) {
      sessionStorage.removeItem(key);
    });
  }

  function resetSsoButton() {
    const ssoBtn = document.getElementById('microsoftSSOBtn');
    if (!ssoBtn) return;
    ssoBtn.disabled = false;
    ssoBtn.dataset.busy = '0';
  }

  function ensureMicrosoftSSOStyles() {
    if (document.getElementById('microsoftSSOStyles')) return;
    const style = document.createElement('style');
    style.id = 'microsoftSSOStyles';
    style.textContent = [
      '.btn-sso { width: 100%; margin-top: 12px; padding: 14px; background: #f3f6fb; color: #1a1814; border: 1px solid #d4cdb8; border-radius: 3px; font-weight: 700; font-size: 13px; cursor: pointer; letter-spacing: 1px; text-transform: uppercase; transition: all 0.2s; font-family: inherit; }',
      '.btn-sso:hover { border-color: #b08a4e; background: #fff; }',
      '.btn-sso:disabled { opacity: 0.7; cursor: not-allowed; }',
    ].join(' ');
    document.head.appendChild(style);
  }

  function injectMicrosoftSSOButton() {
    const wrap = document.getElementById('loginWrap');
    if (!wrap) return false;

    let ssoBtn = document.getElementById('microsoftSSOBtn');
    if (ssoBtn && wrap.contains(ssoBtn) && !ssoBtn.disabled && ssoBtn.dataset.busy !== '1') {
      return true;
    }

    if (ssoBtn) ssoBtn.remove();

    const card = wrap.querySelector('.login-card');
    if (!card) return false;

    ensureMicrosoftSSOStyles();

    ssoBtn = document.createElement('button');
    ssoBtn.type = 'button';
    ssoBtn.id = 'microsoftSSOBtn';
    ssoBtn.className = 'btn-sso';
    ssoBtn.setAttribute('data-microsoft-sso', '1');
    ssoBtn.textContent = 'Sign in with Microsoft';

    const loginBtn = card.querySelector('.btn-login');
    if (loginBtn) loginBtn.insertAdjacentElement('beforebegin', ssoBtn);
    else card.appendChild(ssoBtn);

    return true;
  }

  async function startMicrosoftSSO() {
    const ssoBtn = document.getElementById('microsoftSSOBtn');
    if (ssoBtn && ssoBtn.dataset.busy === '1') return;
    if (ssoBtn) {
      ssoBtn.dataset.busy = '1';
      ssoBtn.disabled = true;
    }
    try {
      const res = await fetch('/api/v1/auth/microsoft/login', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('Request failed (' + res.status + ')');
      const data = await res.json();
      if (!data || !data.auth_url) throw new Error('Missing Microsoft auth URL');
      window.location.href = data.auth_url;
    } catch (err) {
      const msg = err && err.message ? err.message : 'Unable to start Microsoft login';
      const el = document.getElementById('loginErr');
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
        const btn =
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

  function onReturnToLoginScreen() {
    clearSsoSession();
    resetSsoButton();
    injectMicrosoftSSOButton();
    const err = document.getElementById('loginErr');
    if (err) err.classList.remove('show');
  }

  function patchBundledLogout() {
    if (typeof window.doLogout !== 'function') return false;
    if (window.doLogout.__ssoPatched) return true;

    const original = window.doLogout;
    window.doLogout = function patchedLogout() {
      original.apply(this, arguments);
      onReturnToLoginScreen();
    };
    window.doLogout.__ssoPatched = true;
    return true;
  }

  function initMicrosoftSSO() {
    bindMicrosoftSSOClickHandler();
    patchBundledLogout();
    injectMicrosoftSSOButton();

    let attempts = 0;
    const timer = window.setInterval(function () {
      attempts += 1;
      injectMicrosoftSSOButton();
      patchBundledLogout();
      if ((document.getElementById('microsoftSSOBtn') && patchBundledLogout()) || attempts >= 40) {
        window.clearInterval(timer);
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
