import { API_BASE } from './constants';
import PortalApiEndpoints from './portal-api-endpoints';

let apiInstance;

const TOKEN_STORAGE_KEY = 'portal_token';
const USER_STORAGE_KEY = 'portal_user';

function sanitizeBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/$/, '');
}

function readToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
}

function writeToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

function writeUser(user) {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
}

function clearAuthStorage() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

function toQueryParams(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    if (typeof value === 'object') {
      params.set(key, JSON.stringify(value));
      return;
    }
    params.set(key, String(value));
  });
  return params;
}

class PortalApiClient {
  constructor(baseUrl) {
    this.baseUrl = sanitizeBaseUrl(baseUrl);
    this.auth = {
      signup: (params) => this.signup(params),
      login: (params) => this.login(params),
      logout: () => this.logout(),
      portalInfo: (query) => this.portalInfo(query),
      getData: (query) => this.getData(query),
      createData: (payload) => this.createData(payload),
      updateData: (id, payload) => this.updateData(id, payload),
      deleteData: (id, query) => this.deleteData(id, query),
      verifyToken: () => this.verifyToken(),
      updateProfile: (payload) => this.updateProfile(payload),
    };
  }

  async request({ method, url, query, body, requiresAuth = true }) {
    const qs = query ? toQueryParams(query).toString() : '';
    const endpoint = `${this.baseUrl}${url}${qs ? `?${qs}` : ''}`;
    const headers = {};

    if (requiresAuth) {
      const token = readToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const options = { method, headers };

    if (body !== undefined && body !== null) {
      if (body instanceof FormData) {
        options.body = body;
      } else {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }
    }

    const response = await fetch(endpoint, options);
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const err = new Error((isJson && (data?.message || data?.error)) || `Request failed (${response.status})`);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  persistAuthFromResponse(payload) {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    const token = payload.token || payload.accessToken || payload?.data?.token || payload?.data?.accessToken;
    const user = payload.user || payload?.data?.user;

    if (token) {
      writeToken(token);
    }
    if (user) {
      writeUser(user);
    }
  }

  async signup(params) {
    const payload = await this.request({
      ...PortalApiEndpoints.signup(params),
      requiresAuth: false,
    });
    this.persistAuthFromResponse(payload);
    return payload;
  }

  async login(params) {
    const payload = await this.request({
      ...PortalApiEndpoints.login(params),
      requiresAuth: false,
    });
    this.persistAuthFromResponse(payload);
    return payload;
  }

  logout() {
    const plan = PortalApiEndpoints.logout();
    if (plan?.clearLocalStorageKeys?.length) {
      plan.clearLocalStorageKeys.forEach((key) => localStorage.removeItem(key));
    }
    clearAuthStorage();
    return plan;
  }

  portalInfo(query) {
    return this.request({
      ...PortalApiEndpoints.portalInfo(query),
      requiresAuth: false,
    });
  }

  getData(query) {
    return this.request(PortalApiEndpoints.getData(query));
  }

  createData(payload) {
    if (payload instanceof FormData) {
      return this.request({ method: 'POST', url: PortalApiEndpoints.path('/data'), body: payload });
    }
    return this.request(PortalApiEndpoints.createData(payload));
  }

  updateData(id, payload) {
    if (payload instanceof FormData) {
      return this.request({ method: 'PUT', url: PortalApiEndpoints.path(`/data/${id}`), body: payload });
    }
    return this.request(PortalApiEndpoints.updateData(id, payload));
  }

  deleteData(id, query) {
    return this.request(PortalApiEndpoints.deleteData(id, query));
  }

  async verifyToken() {
    const candidates = [
      { method: 'GET', url: PortalApiEndpoints.path('/verify') },
      { method: 'GET', url: PortalApiEndpoints.path('/verify') },
      { method: 'GET', url: PortalApiEndpoints.path('/me') },
    ];

    let lastError;
    for (const candidate of candidates) {
      try {
        const payload = await this.request({ ...candidate, requiresAuth: true });
        const user = payload?.user || payload?.data?.user || payload?.data || payload;
        if (user && typeof user === 'object') {
          writeUser(user);
        }
        return user;
      } catch (err) {
        lastError = err;
        if (err?.status !== 404 && err?.status !== 405) {
          throw err;
        }
      }
    }

    throw lastError || new Error('Could not verify token');
  }

  async updateProfile(payload) {
    const candidates = [
      { method: 'PUT', url: PortalApiEndpoints.path('/update-profile') },
      { method: 'PATCH', url: PortalApiEndpoints.path('/update-profile') },
      { method: 'PUT', url: PortalApiEndpoints.path('/profile') },
      { method: 'PATCH', url: PortalApiEndpoints.path('/profile') },
      { method: 'POST', url: PortalApiEndpoints.path('/update-profile') },
    ];

    let lastError;
    for (const candidate of candidates) {
      try {
        return await this.request({ ...candidate, body: payload, requiresAuth: true });
      } catch (err) {
        lastError = err;
        if (err?.status !== 404 && err?.status !== 405) {
          throw err;
        }
      }
    }

    throw lastError || new Error('Could not update profile');
  }
}

export async function getApiClient() {
  if (apiInstance) {
    return apiInstance;
  }

  apiInstance = new PortalApiClient(API_BASE);
  return apiInstance;
}

export async function getVerifiedUser() {
  const api = await getApiClient();
  return api.auth.verifyToken();
}
