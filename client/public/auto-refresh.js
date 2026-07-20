/**
 * Hard-refresh the app after login and every hour while the user is signed in.
 */
(function () {
  'use strict';

  var HOURLY_MS = 60 * 60 * 1000;
  var LOGIN_RELOAD_KEY = 'sobha_pending_login_reload';
  var SESSION_START_KEY = 'sobha_session_started_at';
  var hourlyTimer = null;

  function token() {
    return sessionStorage.getItem('sobha_token') || '';
  }

  function hardReload() {
    window.location.reload();
  }

  function clearSessionTiming() {
    try {
      sessionStorage.removeItem(LOGIN_RELOAD_KEY);
      sessionStorage.removeItem(SESSION_START_KEY);
    } catch (e) {}
  }

  function maybeReloadAfterLogin() {
    try {
      if (sessionStorage.getItem(LOGIN_RELOAD_KEY) !== '1') return false;
      sessionStorage.removeItem(LOGIN_RELOAD_KEY);
      sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
      hardReload();
      return true;
    } catch (e) {
      return false;
    }
  }

  function scheduleHourlyReload() {
    if (!token() || hourlyTimer) return;
    // Only auto-reload the performance dashboard — not the admin upload panel.
    if (window.location.pathname.indexOf('/admin') === 0) return;

    if (!sessionStorage.getItem(SESSION_START_KEY)) {
      sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
    }

    var started = parseInt(sessionStorage.getItem(SESSION_START_KEY) || '0', 10);
    var elapsed = Date.now() - started;
    var delay = HOURLY_MS - (elapsed % HOURLY_MS);
    if (delay < 1000) delay = HOURLY_MS;

    hourlyTimer = window.setTimeout(function tick() {
      if (!token()) {
        hourlyTimer = null;
        return;
      }
      if (window.location.pathname.indexOf('/admin') === 0) {
        hourlyTimer = null;
        return;
      }
      sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
      hardReload();
    }, delay);
  }

  window.sobhaMarkLoginForReload = function () {
    try {
      sessionStorage.setItem(LOGIN_RELOAD_KEY, '1');
    } catch (e) {}
  };

  window.sobhaClearAutoRefreshSession = clearSessionTiming;

  if (maybeReloadAfterLogin()) return;
  if (token()) scheduleHourlyReload();
})();
