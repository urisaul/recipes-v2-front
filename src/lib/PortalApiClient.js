/**
 * PortalApiClient
 * Browser-compatible API client for all portal routes.
 *
 * Usage:
 *   const api = new PortalApiClient('http://localhost:3000');
 *   await api.auth.login({ email, password });
 *
 * The JWT token is stored in localStorage automatically after login.
 * All authenticated requests attach it via the Authorization header.
 */

class PortalApiClient {
  /**
   * @param {string} baseUrl - e.g. 'http://localhost:3000'
   */
  constructor(baseUrl = '') {
    this._baseUrl = baseUrl.replace(/\/$/, '');
    this.auth = this._buildAuthApi();
    this.portals = this._buildPortalsApi();
  }

  // ─── Token helpers ────────────────────────────────────────────────────────

  getToken() {
    return localStorage.getItem('portalToken');
  }

  setToken(token) {
    localStorage.setItem('portalToken', token);
  }

  clearToken() {
    localStorage.removeItem('portalToken');
  }

  // ─── Core fetch ───────────────────────────────────────────────────────────

  async _request(method, path, { body, params, isFormData = false } = {}) {
    let url = `${this._baseUrl}${path}`;

    if (params) {
      const qs = new URLSearchParams(params).toString();
      url += `?${qs}`;
    }

    const headers = {};
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };

    if (body !== undefined) {
      if (isFormData) {
        // FormData: let the browser set Content-Type (with boundary)
        options.body = body instanceof FormData ? body : this._toFormData(body);
      } else {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }
    }

    const res = await fetch(url, options);

    if (!res.ok) {
      let errBody;
      try { errBody = await res.json(); } catch { errBody = { message: res.statusText }; }
      const err = new Error(errBody?.message || `Request failed: ${res.status}`);
      err.status = res.status;
      err.data = errBody;
      throw err;
    }

    // 204 No Content
    if (res.status === 204) return null;

    return res.json();
  }

  _toFormData(obj) {
    const fd = new FormData();
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) fd.append(key, value);
    }
    return fd;
  }

  // ─── /portal-auth ─────────────────────────────────────────────────────────

  _buildAuthApi() {
    const req = this._request.bind(this);
    const BASE = '/portal-auth';

    return {
      /**
       * POST /portal-auth/login
       * @param {{ email: string, password: string }} credentials
       */
      login: async (credentials) => {
        const data = await req('POST', `${BASE}/login`, { body: credentials });
        if (data?.token) this.setToken(data.token);
        return data;
      },

      /**
       * POST /portal-auth/register-independent
       */
      registerIndependent: (body) =>
        req('POST', `${BASE}/register-independent`, { body }),

      /**
       * GET /portal-auth/verify
       */
      verifyToken: () =>
        req('GET', `${BASE}/verify`),

      /**
       * GET /portal-auth/user-portals
       */
      getUserPortals: () =>
        req('GET', `${BASE}/user-portals`),

      /**
       * GET /portal-auth/data
       * @param {object} [params] - query params (e.g. { objectId, page, limit })
       */
      getData: (params) =>
        req('GET', `${BASE}/data`, { params }),

      /**
       * GET /portal-auth/datas/related/:objectId
       * @param {string} objectId
       * @param {object} [params] - additional query params
       */
      getRelatedData: (objectId, params) =>
        req('GET', `${BASE}/datas/related/${objectId}`, { params }),

      /**
       * POST /portal-auth/data
       * @param {object|FormData} body - use FormData when uploading files
       */
      createData: (body) =>
        req('POST', `${BASE}/data`, {
          body,
          isFormData: body instanceof FormData,
        }),

      /**
       * PUT /portal-auth/data/:id
       * @param {string} id
       * @param {object|FormData} body
       */
      updateData: (id, body) =>
        req('PUT', `${BASE}/data/${id}`, {
          body,
          isFormData: body instanceof FormData,
        }),

      /**
       * DELETE /portal-auth/data/:id
       * @param {string} id
       * @param {object} [params] - optional query params (e.g. { portalId })
       */
      deleteData: (id, params) =>
        req('DELETE', `${BASE}/data/${id}`, { params }),

      /**
       * PUT /portal-auth/profile
       * @param {object} body
       */
      updateProfile: (body) =>
        req('PUT', `${BASE}/profile`, { body }),

      /**
       * GET /portal-auth/invitations
       */
      getInvitations: () =>
        req('GET', `${BASE}/invitations`),

      /**
       * GET /portal-auth/connections
       */
      getConnections: () =>
        req('GET', `${BASE}/connections`),

      /**
       * POST /portal-auth/invitations/:id/accept
       * @param {string} id
       */
      acceptInvitation: (id) =>
        req('POST', `${BASE}/invitations/${id}/accept`),

      /**
       * POST /portal-auth/invitations/:id/reject
       * @param {string} id
       */
      rejectInvitation: (id) =>
        req('POST', `${BASE}/invitations/${id}/reject`),

      /**
       * DELETE /portal-auth/connections/:id
       * @param {string} id
       */
      disconnect: (id) =>
        req('DELETE', `${BASE}/connections/${id}`),

      /** Clears the stored token (logout) */
      logout: () => this.clearToken(),
    };
  }

  // ─── /portals ─────────────────────────────────────────────────────────────

  _buildPortalsApi() {
    const req = this._request.bind(this);
    const BASE = '/portals';

    return {
      /**
       * GET /portals
       */
      getAll: () =>
        req('GET', BASE),

      /**
       * GET /portals/:id
       * @param {string} id
       */
      getById: (id) =>
        req('GET', `${BASE}/${id}`),

      /**
       * POST /portals
       * @param {object} body
       */
      create: (body) =>
        req('POST', BASE, { body }),

      /**
       * PUT /portals/:id
       * @param {string} id
       * @param {object} body
       */
      update: (id, body) =>
        req('PUT', `${BASE}/${id}`, { body }),

      /**
       * DELETE /portals/:id
       * @param {string} id
       */
      delete: (id) =>
        req('DELETE', `${BASE}/${id}`),

      // ── Permissions ──────────────────────────────────────────────────────

      /**
       * GET /portals/:portalId/permissions
       * @param {string} portalId
       */
      getPermissions: (portalId) =>
        req('GET', `${BASE}/${portalId}/permissions`),

      /**
       * POST /portals/permissions
       * @param {object} body
       */
      upsertPermission: (body) =>
        req('POST', `${BASE}/permissions`, { body }),

      /**
       * PUT /portals/permissions/:id
       * @param {string} id
       * @param {object} body
       */
      updatePermission: (id, body) =>
        req('PUT', `${BASE}/permissions/${id}`, { body }),

      /**
       * DELETE /portals/permissions/:id
       * @param {string} id
       */
      deletePermission: (id) =>
        req('DELETE', `${BASE}/permissions/${id}`),

      // ── Objects ───────────────────────────────────────────────────────────

      /**
       * GET /portals/:portalId/available-objects
       * @param {string} portalId
       */
      getAvailableObjects: (portalId) =>
        req('GET', `${BASE}/${portalId}/available-objects`),

      // ── Users ─────────────────────────────────────────────────────────────

      /**
       * GET /portals/:portalId/users
       * @param {string} portalId
       */
      getUsers: (portalId) =>
        req('GET', `${BASE}/${portalId}/users`),

      /**
       * GET /portals/users/search
       * @param {object} params - query params (e.g. { q: 'john' })
       */
      searchUsers: (params) =>
        req('GET', `${BASE}/users/search`, { params }),

      /**
       * POST /portals/users/invite
       * @param {object} body
       */
      inviteUser: (body) =>
        req('POST', `${BASE}/users/invite`, { body }),

      /**
       * POST /portals/users/bulk-invite
       * @param {object} body
       */
      bulkInviteUsers: (body) =>
        req('POST', `${BASE}/users/bulk-invite`, { body }),

      /**
       * PUT /portals/:portalId/users/:connectionId
       * @param {string} portalId
       * @param {string} connectionId
       * @param {object} body
       */
      updateUserConnection: (portalId, connectionId, body) =>
        req('PUT', `${BASE}/${portalId}/users/${connectionId}`, { body }),

      /**
       * DELETE /portals/:portalId/users/:connectionId
       * @param {string} portalId
       * @param {string} connectionId
       */
      removeUser: (portalId, connectionId) =>
        req('DELETE', `${BASE}/${portalId}/users/${connectionId}`),

      /**
       * DELETE /portals/invitations/:invitationId
       * @param {string} invitationId
       */
      cancelInvitation: (invitationId) =>
        req('DELETE', `${BASE}/invitations/${invitationId}`),
    };
  }
}

export default PortalApiClient;
