/**
 * Load dashboard SBTR / users / team mapping from the API instead of the
 * frozen SOBHA_PAYLOAD embedded in the bundle (which goes stale after admin upload).
 *
 * Also polls /meta and auto-refreshes when Admin uploads new Excel data.
 *
 * IMPORTANT: Admin upload notifications via BroadcastChannel/localStorage only reach
 * tabs in the *same browser*. Other users depend entirely on /meta polling + API fetch.
 */
(function () {
  'use strict';

  var API_BASE = '/api/v1';
  var POLL_MS = 5000;
  var lastSeenRevision = null;
  var pollTimer = null;
  var refreshInFlight = false;
  var REVISION_KEY = 'sobha_data_revision';

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

  function setDataAsOfLoading() {
    if (!token()) return;
    var el = document.getElementById('dataAsOf');
    if (el) el.textContent = 'Loading...';
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
    if (payload.records) {
      window.ALL = payload.records;
      // Keep bundle locals in sync when they exist as bare identifiers.
      try {
        if (typeof ALL !== 'undefined') ALL = payload.records;
      } catch (e) {}
    }
    if (payload.auth && Object.keys(payload.auth).length) {
      window.AUTH = payload.auth;
      try {
        if (typeof AUTH !== 'undefined') AUTH = payload.auth;
      } catch (e) {}
    }
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

  function refreshDashboardUIIfOpen() {
    var original = getOriginalInit();
    var saved = null;
    try {
      saved = sessionStorage.getItem('sobha_user_v5');
    } catch (e) {}

    // Re-bootstrap through the real init so charts/filters pick up new ALL.
    // Use __sobhaOriginal to avoid re-entering the API wrap loop.
    if (original && saved) {
      original({ records: window.ALL || [], auth: window.AUTH || {} });
      return;
    }

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
    if (typeof window.applyFilters === 'function') {
      window.applyFilters();
    }
  }

  function createWrappedInit(original) {
    if (!original || original.__apiWrapped) return original;
    function wrappedInit(payload) {
      var fallback = payload || window.SOBHA_PAYLOAD || { records: [], auth: {} };
      if (!token()) {
        original(fallback);
        return;
      }
      setDataAsOfLoading();
      fetchDashboardPayload()
        .then(function (fresh) {
          applyRecordsToGlobals(fresh);
          window.__sobhaApiInitDone = true;
          original({ records: window.ALL, auth: window.AUTH });
          startDatasetPoll();
        })
        .catch(function (err) {
          console.warn('[dashboard-data] Using embedded payload:', err.message || err);
          original(fallback);
          // Still poll so a later admin upload (or retry) can recover without hard refresh.
          startDatasetPoll();
        });
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
    if (typeof stored === 'function' && !stored.__apiWrapped) {
      stored = createWrappedInit(stored);
    }
  }

  function repairStaleDashboardInit() {
    if (!token() || !window._sobhaReady || window.__sobhaApiInitDone) {
      return Promise.resolve(false);
    }
    var original = getOriginalInit();
    return fetchDashboardPayload()
      .then(function (fresh) {
        applyRecordsToGlobals(fresh);
        window.__sobhaApiInitDone = true;
        if (original) {
          original({ records: window.ALL, auth: window.AUTH });
        } else {
          refreshDashboardUIIfOpen();
        }
        return true;
      })
      .catch(function (err) {
        console.warn('[dashboard-data] stale repair failed:', err.message || err);
        return false;
      });
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
    var embeddedLogin = window.doLogin;
    window.doLogin = function patchedDoLogin() {
      var userEl = document.getElementById('loginUser');
      var pinEl = document.getElementById('loginPin');
      var err = document.getElementById('loginErr');
      var user = userEl ? userEl.value.trim().toLowerCase() : '';
      var pin = pinEl ? pinEl.value.trim() : '';
      if (!user || !pin) {
        if (err) err.classList.add('show');
        return;
      }

      apiLogin(user, pin)
        .then(function (loginData) {
          sessionStorage.setItem('sobha_token', loginData.token);
          return fetchDashboardPayload().then(function (fresh) {
            applyRecordsToGlobals(fresh);
            if (fresh.auth[user]) fresh.auth[user].pin = pin;
            window.AUTH = fresh.auth;
            window.currentUser = Object.assign({ username: user }, fresh.auth[user] || loginData);
            sessionStorage.setItem('sobha_user_v5', JSON.stringify(window.currentUser));
            if (err) err.classList.remove('show');
            window.location.reload();
          });
        })
        .catch(function () {
          embeddedLogin();
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

      // First sight of revision: always pull bookings. Never "lock" the revision
      // while the UI may still be showing the embedded 18 May snapshot.
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
      // Ignore transient poll errors (token expiry / network).
    }
  }

  function startDatasetPoll() {
    if (pollTimer) return;
    if (!token()) return;
    pollTimer = window.setInterval(checkForDatasetUpdate, POLL_MS);
    checkForDatasetUpdate();
  }

  function stopDatasetPoll() {
    if (!pollTimer) return;
    window.clearInterval(pollTimer);
    pollTimer = null;
  }

  window.sobhaInstallDashboardHooks = function () {
    wrapSobhaInit();
    patchDoLogin();
    if (!token()) return;

    // If the bundle already inited (possibly with embedded data), repair then poll.
    // Do NOT start polling before init when _sobhaReady is false — that used to
    // set lastSeenRevision from /meta without loading bookings, so later polls
    // saw "no change" and other users stayed on stale embedded data forever.
    if (window._sobhaReady) {
      repairStaleDashboardInit().then(function () {
        startDatasetPoll();
      });
    }
    // else: wrappedInit / its catch path starts the poll after first load attempt
  };

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    if (!token()) return;
    checkForDatasetUpdate();
  });

  // Instant refresh when Admin upload happens in another tab of the same browser.
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
        // Prefer direct refresh: revision in the message may already match what a
        // premature poll stored, which would make checkForDatasetUpdate a no-op.
        if (event.data.revision && event.data.revision !== lastSeenRevision) {
          lastSeenRevision = event.data.revision;
        }
        window.sobhaRefreshDashboardFromApi({ notify: true });
      };
    }
  } catch (e) {}

  installSobhaInitTrap();
  if (token()) setDataAsOfLoading();

  window.sobhaInstallDashboardHooks();
})();
