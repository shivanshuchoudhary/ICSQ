const API = {
  _bases: null,

  isAdminPanel() {
    return !!window.SOBHA_ADMIN_MODE;
  },

  bases() {
    if (this._bases) return this._bases;
    const preferred = window.SOBHA_API_BASE || (this.isAdminPanel() ? '/admin' : '/api/v1');
    const candidates = [preferred, '/admin', '/api/v1', '/api'].filter(
      (b, i, arr) => b && arr.indexOf(b) === i
    );
    this._bases = candidates;
    return candidates;
  },

  rememberBase(base) {
    this.base = base;
    try {
      sessionStorage.setItem('sobha_api_base', base);
    } catch (_) {}
  },

  get base() {
    if (this._activeBase) return this._activeBase;
    if (this.isAdminPanel()) {
      this._activeBase = window.SOBHA_API_BASE || '/admin';
      return this._activeBase;
    }
    try {
      const saved = sessionStorage.getItem('sobha_api_base');
      if (saved && saved !== '/admin') {
        this._activeBase = saved;
        return saved;
      }
    } catch (_) {}
    this._activeBase = window.SOBHA_API_BASE || '/api/v1';
    return this._activeBase;
  },

  set base(value) {
    this._activeBase = value;
  },

  token() {
    return sessionStorage.getItem('sobha_token') || '';
  },

  async _fetchOnce(base, path, options) {
    const headers = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };
    const token = this.token();
    if (token) headers.Authorization = `Bearer ${token}`;

    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (!isFormData && options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${base}${path}`, {
      credentials: 'same-origin',
      ...options,
      headers,
    });

    const contentType = res.headers.get('content-type') || '';
    let data = null;
    let rawText = '';

    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch (_) {}
    } else {
      rawText = await res.text();
      if (rawText) {
        if (res.status === 403 && /cloudflare|challenge|cf-browser-verification/i.test(rawText)) {
          const err = new Error(
            'Request blocked by Cloudflare. Try again after a hard refresh, or ask your admin to allow POST /admin/* and /api/v1/* through the WAF.'
          );
          err.status = 403;
          err.cloudflare = true;
          throw err;
        }
        try {
          data = JSON.parse(rawText);
        } catch (_) {
          const err = new Error(`Unexpected response (${res.status}). Expected JSON from the API.`);
          err.status = res.status;
          throw err;
        }
      }
    }

    if (!res.ok) {
      const msg = data && data.detail ? data.detail : `Request failed (${res.status})`;
      const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      err.status = res.status;
      throw err;
    }

    return data;
  },

  _shouldRetry(err, bases) {
    if (!err || bases.length < 2) return false;
    if (err.cloudflare) return false;
    if (err.status === 403 || err.status === 404) return true;
    return false;
  },

  async request(path, options = {}) {
    const bases = this.bases();
    let startIdx = Math.max(0, bases.indexOf(this.base));
    if (startIdx < 0) startIdx = 0;

    const ordered = bases.slice(startIdx).concat(bases.slice(0, startIdx));
    let lastErr = null;

    for (let i = 0; i < ordered.length; i += 1) {
      const base = ordered[i];
      try {
        const data = await this._fetchOnce(base, path, options);
        this.rememberBase(base);
        return data;
      } catch (err) {
        lastErr = err;
        if (i < ordered.length - 1 && this._shouldRetry(err, ordered)) {
          continue;
        }
        throw err;
      }
    }

    throw lastErr || new Error('Request failed');
  },

  login(username, password) {
    const path = this.isAdminPanel() ? '/login' : '/auth/login';
    return this.request(path, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  getUsers() {
    return this.request('/users');
  },

  getBookings() {
    return this.request('/bookings');
  },

  getTeamMapping() {
    return this.request('/team-mapping');
  },

  getMeta() {
    return this.request('/meta');
  },

  selectIdentity(username) {
    return this.request('/auth/identity', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  },

  adminStatus() {
    const path = this.isAdminPanel() ? '/status' : '/admin/status';
    return this.request(path);
  },

  createUser(payload) {
    const path = this.isAdminPanel() ? '/users' : '/admin/users';
    return this.request(path, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteUser(username) {
    const prefix = this.isAdminPanel() ? '/users/' : '/admin/users/';
    return this.request(`${prefix}${encodeURIComponent(username)}`, {
      method: 'DELETE',
    });
  },

  async uploadAdmin(path, file) {
    const form = new FormData();
    form.append('file', file);
    let uploadPath = path;
    if (this.isAdminPanel() && uploadPath.startsWith('/admin/')) {
      uploadPath = uploadPath.slice('/admin'.length);
    }
    return this.request(uploadPath, { method: 'POST', body: form });
  },
};
