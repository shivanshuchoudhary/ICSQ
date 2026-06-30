const API = {
  _bases: null,

  bases() {
    if (this._bases) return this._bases;
    const preferred = window.SOBHA_API_BASE || '/api/v1';
    const candidates = [preferred, '/api/v1', '/api'].filter(
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
    try {
      const saved = sessionStorage.getItem('sobha_api_base');
      if (saved) {
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
            'Request blocked by Cloudflare. Ask your admin to allow POST /api/v1/* through the WAF, or complete the browser challenge and retry.'
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

  _shouldRetry(err, base, bases) {
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
        if (i < ordered.length - 1 && this._shouldRetry(err, base, ordered)) {
          continue;
        }
        throw err;
      }
    }

    throw lastErr || new Error('Request failed');
  },

  login(username, password) {
    return this.request('/auth/login', {
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
    return this.request('/admin/status');
  },

  createUser(payload) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteUser(username) {
    return this.request(`/admin/users/${encodeURIComponent(username)}`, {
      method: 'DELETE',
    });
  },

  async uploadAdmin(path, file) {
    const form = new FormData();
    form.append('file', file);
    return this.request(path, { method: 'POST', body: form });
  },
};
