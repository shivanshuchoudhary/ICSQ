/**
 * Load dashboard SBTR / users / team mapping from the API instead of the
 * frozen SOBHA_PAYLOAD embedded in the bundle (which goes stale after admin upload).
 */
(function () {
  'use strict';

  var API_BASE = '/api/v1';

  function token() {
    return sessionStorage.getItem('sobha_token') || '';
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

  async function fetchDashboardPayload() {
    var headers = { Accept: 'application/json' };
    var t = token();
    if (!t) throw new Error('Not authenticated');
    headers.Authorization = 'Bearer ' + t;

    async function get(path) {
      var res = await fetch(API_BASE + path, { credentials: 'same-origin', headers: headers });
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
    if (!meta || !meta.sbtr_as_of) return;
    var el = document.getElementById('dataAsOf');
    if (el) el.textContent = meta.sbtr_as_of;
  }

  function applyRecordsToGlobals(payload) {
    if (payload.records && payload.records.length) window.ALL = payload.records;
    if (payload.auth && Object.keys(payload.auth).length) window.AUTH = payload.auth;
    window._personIndex = null;
    window._orgTree = null;
    window._mappingCols = null;
    applyTeamMapping(payload.mapping);
    applyMeta(payload.meta);
  }

  function refreshDashboardUIIfOpen() {
    var app = document.getElementById('app');
    if (app && app.classList.contains('show') && typeof window.enterDashboard === 'function') {
      window.enterDashboard();
    } else if (typeof window.applyFilters === 'function') {
      window.applyFilters();
    }
  }

  async function apiLogin(username, password) {
    var res = await fetch(API_BASE + '/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username: username, password: password }),
    });
    if (!res.ok) throw new Error('Invalid username or PIN');
    return res.json();
  }

  function wrapSobhaInit() {
    if (typeof window.SOBHA_INIT !== 'function' || window.SOBHA_INIT.__apiWrapped) return;
    var original = window.SOBHA_INIT;
    window.SOBHA_INIT = function wrappedInit(payload) {
      var fallback = payload || window.SOBHA_PAYLOAD || { records: [], auth: {} };
      if (!token()) {
        original(fallback);
        return;
      }
      fetchDashboardPayload()
        .then(function (fresh) {
          applyRecordsToGlobals(fresh);
          original({ records: window.ALL, auth: window.AUTH });
        })
        .catch(function (err) {
          console.warn('[dashboard-data] Using embedded payload:', err.message || err);
          original(fallback);
        });
    };
    window.SOBHA_INIT.__apiWrapped = true;
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
            if (typeof window.enterHome === 'function') window.enterHome();
          });
        })
        .catch(function () {
          embeddedLogin();
        });
    };
    window.doLogin.__apiPatched = true;
  }

  window.sobhaRefreshDashboardFromApi = function () {
    if (!token()) return Promise.resolve(false);
    return fetchDashboardPayload()
      .then(function (fresh) {
        applyRecordsToGlobals(fresh);
        refreshDashboardUIIfOpen();
        return true;
      })
      .catch(function (err) {
        console.warn('[dashboard-data] refresh failed:', err.message || err);
        return false;
      });
  };

  window.sobhaInstallDashboardHooks = function () {
    wrapSobhaInit();
    patchDoLogin();
    if (window._sobhaReady && token()) {
      window.sobhaRefreshDashboardFromApi();
    }
  };

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && token()) window.sobhaRefreshDashboardFromApi();
  });

  window.sobhaInstallDashboardHooks();
})();
