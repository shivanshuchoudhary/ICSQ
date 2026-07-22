/**
 * Always load SBTR / users / team mapping from the live API.
 * The bundle no longer ships booking data — SOBHA_PAYLOAD is empty.
 * PIN and SSO login both wait for /api/v1 before showing the dashboard.
 */
(function () {
  'use strict';

  var API_BASE = '/api/v1';
  var POLL_MS = 5000;
  var lastSeenRevision = null;
  var pollTimer = null;
  var refreshInFlight = false;
  var bootInFlight = false;
  var REVISION_KEY = 'sobha_data_revision';

  // Never trust any leftover embedded snapshot.
  window.SOBHA_PAYLOAD = { records: [], auth: {} };

  function token() {
    return sessionStorage.getItem('sobha_token') || '';
  }

  function authHeaders() {
    var headers = {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    };
    var t = token();
    if (t) headers.Authorization = 'Bearer ' + t;
    return headers;
  }

  function cacheBust(path) {
    var sep = path.indexOf('?') >= 0 ? '&' : '?';
    return path + sep + '_=' + Date.now();
  }

  function usersToAuth(users) {
    var auth = {};
    (users || []).forEach(function (u) {
      auth[u.username] = {
        pin: '',
        name: u.name,
        role: u.role,
        scope_type: u.scope_type,
        scope_value: u.scope_value,
        email: u.email || '',
      };
    });
    return auth;
  }

  function revisionFromMeta(meta) {
    if (!meta) return null;
    return [meta.updated_at || '', meta.sbtr_as_of || '', String(meta.row_count || 0)].join('|');
  }

  function showBootOverlay(message) {
    var id = 'sobhaBootOverlay';
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.cssText =
        'position:fixed;inset:0;z-index:200000;display:flex;align-items:center;justify-content:center;' +
        'background:rgba(250,249,245,0.92);font:15px/1.5 Calibri,Trebuchet MS,sans-serif;color:#1a1814;';
      document.documentElement.appendChild(el);
    }
    el.textContent = message || 'Loading latest SBTR data…';
    el.style.display = 'flex';
  }

  function hideBootOverlay() {
    var el = document.getElementById('sobhaBootOverlay');
    if (el) el.style.display = 'none';
  }

  async function fetchMeta() {
    var res = await fetch(API_BASE + cacheBust('/meta'), {
      credentials: 'same-origin',
      headers: authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('/meta failed (' + res.status + ')');
    return res.json();
  }

  async function fetchDashboardPayload() {
    var headers = authHeaders();
    if (!token()) throw new Error('Not authenticated');

    async function get(path) {
      var res = await fetch(API_BASE + cacheBust(path), {
        credentials: 'same-origin',
        headers: headers,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(path + ' failed (' + res.status + ')');
      return res.json();
    }

    var bookingsRes = await get('/bookings');
    var usersRes = await get('/users');
    var mappingRes = await get('/team-mapping');
    var metaRes = await get('/meta');

    return {
      records: bookingsRes.records || [],
      auth: usersToAuth(usersRes.users || []),
      mapping: mappingRes,
      meta: metaRes,
    };
  }

  function applyTeamMapping(mapping) {
    if (!mapping || !mapping.headers) return;
    window.TEAM_MAPPING_DEFAULT = mapping;
    window.mappingData = mapping;
    try {
      localStorage.setItem('sobha_team_mapping_v1', JSON.stringify(mapping));
    } catch (e) {}
  }

  function applyMeta(meta) {
    if (!meta) return;
    var el = document.getElementById('dataAsOf');
    if (el && meta.sbtr_as_of) el.textContent = meta.sbtr_as_of;
    var rev = revisionFromMeta(meta);
    if (rev) {
      lastSeenRevision = rev;
      try {
        localStorage.setItem(REVISION_KEY, rev);
      } catch (e) {}
    }
  }

  function applyRecordsToGlobals(payload) {
    if (payload.records) window.ALL = payload.records;
    if (payload.auth && Object.keys(payload.auth).length) window.AUTH = payload.auth;
    window._personIndex = null;
    window._orgTree = null;
    window._mappingCols = null;
    window._mapTree = null;
    applyTeamMapping(payload.mapping);
    applyMeta(payload.meta);
  }

  function showUpdateBanner() {
    var id = 'sobhaDataUpdateBanner';
    var existing = document.getElementById(id);
    if (existing) existing.remove();
    var banner = document.createElement('div');
    banner.id = id;
    banner.textContent = 'New SBTR data loaded';
    banner.style.cssText =
      'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:100000;' +
      'background:#0d0c0a;color:#f5ecd9;padding:10px 18px;border-radius:8px;' +
      'font:13px/1.4 Calibri,Trebuchet MS,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.2);';
    document.body.appendChild(banner);
    window.setTimeout(function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 3500);
  }

  function getOriginalInit() {
    if (window.SOBHA_INIT && typeof window.SOBHA_INIT.__sobhaOriginal === 'function') {
      return window.SOBHA_INIT.__sobhaOriginal;
    }
    return null;
  }

  function runOriginalInit(records, auth) {
    var original = getOriginalInit();
    if (original) {
      original({ records: records || [], auth: auth || {} });
      return true;
    }
    if (typeof window.SOBHA_INIT === 'function' && !window.SOBHA_INIT.__apiWrapped) {
      window.SOBHA_INIT({ records: records || [], auth: auth || {} });
      return true;
    }
    return false;
  }

  function refreshDashboardUIIfOpen() {
    if (runOriginalInit(window.ALL, window.AUTH)) return;
    var home = document.getElementById('home');
    var app = document.getElementById('app');
    if (app && app.classList.contains('show') && typeof window.enterDashboard === 'function') {
      window.enterDashboard();
      return;
    }
    if (home && home.classList.contains('show') && typeof window.enterHome === 'function') {
      window.enterHome();
      return;
    }
    if (typeof window.applyFilters === 'function') window.applyFilters();
  }

  function fetchWithRetry(attempts, delayMs) {
    attempts = attempts || 8;
    delayMs = delayMs || 800;
    var tryOnce = function (left) {
      return fetchDashboardPayload().catch(function (err) {
        if (left <= 1) throw err;
        return new Promise(function (resolve) {
          window.setTimeout(resolve, delayMs);
        }).then(function () {
          return tryOnce(left - 1);
        });
      });
    };
    return tryOnce(attempts);
  }

  /**
   * Server-only boot for authenticated sessions (PIN or SSO).
   * Never uses embedded SOBHA_PAYLOAD booking data.
   */
  window.sobhaBootFromServer = function () {
    if (!token()) {
      hideBootOverlay();
      runOriginalInit([], {});
      return Promise.resolve(false);
    }
    if (bootInFlight) return Promise.resolve(false);
    if (window.__sobhaApiInitDone && window._sobhaReady) {
      hideBootOverlay();
      return Promise.resolve(true);
    }

    bootInFlight = true;
    showBootOverlay('Loading latest SBTR data…');

    return fetchWithRetry(10, 1000)
      .then(function (fresh) {
        applyRecordsToGlobals(fresh);
        window.__sobhaApiInitDone = true;
        runOriginalInit(window.ALL, window.AUTH);
        hideBootOverlay();
        startDatasetPoll();
        return true;
      })
      .catch(function (err) {
        console.error('[dashboard-data] server boot failed:', err.message || err);
        showBootOverlay(
          'Could not load SBTR from server. Check your connection, then refresh. (' +
            (err.message || 'error') +
            ')'
        );
        return false;
      })
      .finally(function () {
        bootInFlight = false;
      });
  };

  function createWrappedInit(original) {
    if (!original || original.__apiWrapped) return original;
    function wrappedInit(payload) {
      // Logged out: empty shell is fine for the login screen.
      if (!token()) {
        original({ records: [], auth: {} });
        return;
      }
      // Logged in: ignore any payload (embedded or otherwise) — API only.
      window.sobhaBootFromServer();
    }
    wrappedInit.__apiWrapped = true;
    wrappedInit.__sobhaOriginal = original;
    return wrappedInit;
  }

  function installSobhaInitTrap() {
    if (window.__sobhaInitTrapInstalled) return;
    window.__sobhaInitTrapInstalled = true;
    var stored = null;
    try {
      Object.defineProperty(window, 'SOBHA_INIT', {
        configurable: true,
        enumerable: true,
        get: function () {
          return stored;
        },
        set: function (fn) {
          if (typeof fn !== 'function') {
            stored = fn;
            return;
          }
          if (fn.__apiWrapped) {
            stored = fn;
            return;
          }
          stored = createWrappedInit(fn);
        },
      });
    } catch (err) {
      console.warn('[dashboard-data] SOBHA_INIT trap failed:', err.message || err);
    }
  }

  async function apiLogin(username, password) {
    var res = await fetch(API_BASE + '/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username: username, password: password }),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Invalid username or PIN');
    return res.json();
  }

  function wrapSobhaInit() {
    if (typeof window.SOBHA_INIT !== 'function' || window.SOBHA_INIT.__apiWrapped) return;
    window.SOBHA_INIT = createWrappedInit(window.SOBHA_INIT);
  }

  function patchDoLogin() {
    if (typeof window.doLogin !== 'function' || window.doLogin.__apiPatched) return;
    window.doLogin = function patchedDoLogin() {
      var userEl = document.getElementById('loginUser');
      var pinEl = document.getElementById('loginPin');
      var err = document.getElementById('loginErr');
      var user = userEl ? userEl.value.trim().toLowerCase() : '';
      var pin = pinEl ? pinEl.value.trim() : '';
      if (!user || !pin) {
        if (err) {
          err.textContent = 'Enter username and PIN';
          err.classList.add('show');
        }
        return;
      }

      if (err) {
        err.textContent = 'Signing in…';
        err.classList.add('show');
      }

      apiLogin(user, pin)
        .then(function (loginData) {
          sessionStorage.setItem('sobha_token', loginData.token);
          showBootOverlay('Loading latest SBTR data…');
          return fetchWithRetry(8, 800).then(function (fresh) {
            applyRecordsToGlobals(fresh);
            if (fresh.auth[user]) fresh.auth[user].pin = pin;
            window.AUTH = fresh.auth;
            window.currentUser = Object.assign({ username: user }, fresh.auth[user] || loginData);
            sessionStorage.setItem('sobha_user_v5', JSON.stringify(window.currentUser));
            window.__sobhaApiInitDone = true;
            if (err) err.classList.remove('show');
            // Full reload so session + server data boot cleanly.
            window.location.reload();
          });
        })
        .catch(function (e) {
          if (err) {
            err.textContent = e && e.message ? e.message : 'Invalid username or PIN';
            err.classList.add('show');
          }
          hideBootOverlay();
        });
    };
    window.doLogin.__apiPatched = true;
  }

  window.sobhaRefreshDashboardFromApi = function (opts) {
    opts = opts || {};
    if (!token() || refreshInFlight) return Promise.resolve(false);
    refreshInFlight = true;
    return fetchDashboardPayload()
      .then(function (fresh) {
        applyRecordsToGlobals(fresh);
        window.__sobhaApiInitDone = true;
        refreshDashboardUIIfOpen();
        if (opts.notify) showUpdateBanner();
        return true;
      })
      .catch(function (err) {
        console.warn('[dashboard-data] refresh failed:', err.message || err);
        return false;
      })
      .finally(function () {
        refreshInFlight = false;
      });
  };

  async function checkForDatasetUpdate() {
    if (!token() || document.hidden || refreshInFlight) return;
    try {
      var meta = await fetchMeta();
      var rev = revisionFromMeta(meta);
      if (!rev) return;

      if (lastSeenRevision == null) {
        lastSeenRevision = rev;
        try {
          localStorage.setItem(REVISION_KEY, rev);
        } catch (e) {}
        if (!window.__sobhaApiInitDone) {
          await window.sobhaRefreshDashboardFromApi({ notify: false });
        }
        return;
      }

      if (rev !== lastSeenRevision) {
        lastSeenRevision = rev;
        try {
          localStorage.setItem(REVISION_KEY, rev);
        } catch (e) {}
        await window.sobhaRefreshDashboardFromApi({ notify: true });
      }
    } catch (err) {
      // Ignore transient poll errors.
    }
  }

  function startDatasetPoll() {
    if (pollTimer) return;
    if (!token()) return;
    pollTimer = window.setInterval(checkForDatasetUpdate, POLL_MS);
    checkForDatasetUpdate();
  }

  window.sobhaInstallDashboardHooks = function () {
    wrapSobhaInit();
    patchDoLogin();
    if (!token()) {
      hideBootOverlay();
      return;
    }
    showBootOverlay('Loading latest SBTR data…');
    if (typeof window.SOBHA_INIT === 'function') {
      window.sobhaBootFromServer();
    }
  };

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    if (!token()) return;
    checkForDatasetUpdate();
  });

  window.addEventListener('storage', function (event) {
    if (event.key !== REVISION_KEY || !event.newValue || !token()) return;
    if (event.newValue === lastSeenRevision) return;
    lastSeenRevision = event.newValue;
    window.sobhaRefreshDashboardFromApi({ notify: true });
  });

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      var channel = new BroadcastChannel('sobha_dataset');
      channel.onmessage = function (event) {
        if (!event || !event.data || event.data.type !== 'dataset-updated') return;
        if (!token()) return;
        if (event.data.revision && event.data.revision !== lastSeenRevision) {
          lastSeenRevision = event.data.revision;
        }
        window.sobhaRefreshDashboardFromApi({ notify: true });
      };
    }
  } catch (e) {}

  installSobhaInitTrap();
  if (token()) showBootOverlay('Loading latest SBTR data…');
  window.sobhaInstallDashboardHooks();
})();
