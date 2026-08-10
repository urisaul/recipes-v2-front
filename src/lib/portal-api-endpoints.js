/**
 * Portal API Endpoints Catalog
 *
 * Central place for portal-auth endpoint paths, HTTP methods,
 * and default parameter options used by the frontend.
 * 
 * import this by adding the following line to your code (<script type="module">):
 * import PortalApiEndpoints from "./assets/portal-api-endpoints";
 * 
 */
class PortalApiEndpoints {
  static BASE = "/portal-auth";

  /**
   * Build a full portal-auth path from a suffix.
   * @param {string} suffix
   * @returns {string}
   */
  static path(suffix) {
    return `${this.BASE}${suffix}`;
  }

  /**
   * Signup (independent portal user registration)
   * POST /portal-auth/register-independent
   *
   * Body params:
   * - firstName: string (required)
   * - lastName: string (required)
   * - email: string (required, lowercase recommended)
   * - phone: string (optional, default: "")
   * - password: string (required)
  * - invitationToken: string (optional for spontaneous portals, required for non-spontaneous portals)
   *
   * @param {object} params
   * @param {string} params.firstName
   * @param {string} params.lastName
   * @param {string} params.email
   * @param {string} [params.phone=""]
   * @param {string} params.password
  * @param {string} [params.invitationToken=""]
   * @returns {{ method: string, url: string, body: object }}
   */
  static signup(params) {
    const defaults = {
      phone: "",
      invitationToken: "",
    };

    return {
      method: "POST",
      url: this.path("/register-independent"),
      body: {
        ...defaults,
        ...params,
      },
    };
  }

  /**
   * Get public portal metadata
   * GET /portal-auth/portal-info
   *
   * Query params:
   * - portalId: string (required)
   *
   * @param {object} query
   * @param {string} query.portalId
   * @returns {{ method: string, url: string, query: object }}
   */
  static portalInfo(query) {
    return {
      method: "GET",
      url: this.path("/portal-info"),
      query: {
        portalId: query.portalId,
      },
    };
  }

  /**
   * Login
   * POST /portal-auth/login
   *
   * Body params:
   * - portalId: string (required)
   * - email: string (required)
   * - password: string (required)
   *
   * @param {object} params
   * @param {string} params.portalId
   * @param {string} params.email
   * @param {string} params.password
   * @returns {{ method: string, url: string, body: object }}
   */
  static login(params) {
    return {
      method: "POST",
      url: this.path("/login"),
      body: {
        portalId: params.portalId,
        email: params.email,
        password: params.password,
      },
    };
  }

  /**
   * Logout
   *
   * NOTE:
   * There is currently no dedicated backend logout endpoint in portal-auth routes.
   * Logout is handled client-side by clearing portal auth tokens.
   *
   * This method documents the current behavior and returns the recommended action.
   *
   * @returns {{ type: string, clearLocalStorageKeys: string[] }}
   */
  static logout() {
    return {
      type: "CLIENT_ONLY",
      clearLocalStorageKeys: ["portal_token", "portal_user"],
    };
  }

  /**
 * Verify Token
 * GET /portal-auth/verify
 *
 * Verifies the current portal auth token.
 * Requires portal user authentication.
 *
 * @returns {{ method: string, url: string }}
 */
  static verify() {
    return {
      method: "GET",
      url: this.path("/verify"),
    };
  }

  /**
   * Get Data
  * GET /portal-auth/data-array
   *
   * Query params:
   * - portalId: string (required)
   * - objectId: string (optional, default: null)
   * - filters: object|string (optional, default: null)
   * - term: string (optional, default: "")
   * - page: number (optional, default: 1)
   * - limit: number (optional, default: 10)
   *
   * @param {object} [query]
   * @param {string} query.portalId
   * @param {string|null} [query.objectId=null]
   * @param {object|string|null} [query.filters=null]
   * @param {string} [query.term=""]
   * @param {number} [query.page=1]
   * @param {number} [query.limit=10]
   * @returns {{ method: string, url: string, query: object }}
   */
  static getData(query = {}) {
    const defaults = {
      objectId: null,
      filters: null,
      term: "",
      page: 1,
      limit: 10,
    };

    return {
      method: "GET",
      url: this.path("/data-array"),
      query: {
        ...defaults,
        ...query,
      },
    };
  }

  /**
   * Returned structure for:
  * GET /portal-auth/data-array?portalId=...&objectId=...
   *
   * Notes:
   * - `properties` and `data[].data` keys are dynamic per `objectId`
   * - Relation values inside `data[].data` can be arrays of `{ _id, _display }`
   * - `editable_properties` and `creatable_properties` are provided by backend
   *
   * @returns {{
   *   object: object,
   *   properties: object[],
   *   editable_properties: string[],
   *   creatable_properties: string[],
   *   data: Array<{ _id: string, object_id: string, data: object, is_own: boolean }>,
   *   permissions: {
   *     read_own: boolean,
   *     read_any: boolean,
   *     create: boolean,
   *     update_own: boolean,
   *     update_any: boolean,
   *     delete_own: boolean,
   *     delete_any: boolean
   *   },
   *   pagination: { total: number, page: number, limit: number, totalPages: number }
   * }}
   */
  static getDataByObjectIdResponseStructure() {
    return {
      object: {
        _id: "<objectId>",
        name: "<object-name>",
        internal_name: "<object-internal-name>",
        description: "<object-description>",
        properties: ["<propertyId>"],
        datas: ["<dataId>"],
        workspaceId: "<workspaceId>",
        is_sys: false,
        columnOrder: ["<propertyId>"],
        createdAt: "<ISO-date>",
        updatedAt: "<ISO-date>",
        __v: 0,
        is_submission_table: false,
      },
      properties: [
        {
          _id: "<propertyId>",
          name: "<property-name>",
          internal_name: "<property-internal-name>",
          description: "<property-description>",
          type: "text|number|date|select|relation|...",
          options: [],
          order: 0,
          object_id: "<objectId>",
          is_sys: false,
          required: false,
          display_key: "name",
          searchAble: false,
          unique: false,
          __v: 0,
        },
      ],
      editable_properties: [],
      creatable_properties: [],
      data: [
        {
          _id: "<dataId>",
          object_id: "<objectId>",
          // Dynamic keys based on the object's properties list.
          data: {
            "<property_internal_name>": "<value>",
            "<relation_property_internal_name>": [
              {
                _id: "<relatedDataId>",
                _display: "<display-value>",
              },
            ],
          },
          is_own: true,
        },
      ],
      permissions: {
        read_own: true,
        read_any: false,
        create: false,
        update_own: false,
        update_any: false,
        delete_own: false,
        delete_any: false,
      },
      pagination: {
        total: 1,
        page: 1,
        limit: 200,
        totalPages: 1,
      },
    };
  }

  /**
   * Create Data
   * POST /portal-auth/data
   *
   * Body params:
   * - portalId: string (required)
   * - objectId: string (required)
   * - data: object (optional when using FormData, default: {})
   *
   * @param {object} payload
   * @param {string} payload.portalId
   * @param {string} payload.objectId
   * @param {object} [payload.data={}]
   * @returns {{ method: string, url: string, body: object }}
   */
  static createData(payload) {
    const defaults = {
      data: {},
    };

    return {
      method: "POST",
      url: this.path("/data"),
      body: {
        ...defaults,
        ...payload,
      },
    };
  }

  /**
   * Update Data (also used for relation associate/disassociate)
   * PUT /portal-auth/data/:id
   *
   * Path params:
   * - id: string (required)
   *
   * Body params:
   * - portalId: string (required)
   * - data: object (optional when only uploading files, default: {})
   *
   * Relation updates are done by passing relation fields in `data`:
   * - Associate: include related IDs in the relation field value
   * - Disassociate: remove IDs from that relation field value
   *
   * @param {string} id
   * @param {object} payload
   * @param {string} payload.portalId
   * @param {object} [payload.data={}]
   * @returns {{ method: string, url: string, body: object }}
   */
  static updateData(id, payload) {
    const defaults = {
      data: {},
    };

    return {
      method: "PUT",
      url: this.path(`/data/${id}`),
      body: {
        ...defaults,
        ...payload,
      },
    };
  }

  /**
   * Delete Data
   * DELETE /portal-auth/data/:id
   *
   * Path params:
   * - id: string (required)
   *
   * Query params:
   * - portalId: string (required)
   *
   * @param {string} id
   * @param {object} query
   * @param {string} query.portalId
   * @returns {{ method: string, url: string, query: object }}
   */
  static deleteData(id, query) {
    return {
      method: "DELETE",
      url: this.path(`/data/${id}`),
      query: {
        portalId: query.portalId,
      },
    };
  }

  /**
   * Flat endpoint catalog (helpful for docs/debugging)
   *
   * @returns {Array<{ name: string, method: string, url: string, notes?: string }>}
   */
  static all() {
    return [
      {
        name: "signup",
        method: "POST",
        url: this.path("/register-independent"),
      },
      {
        name: "login",
        method: "POST",
        url: this.path("/login"),
      },
      {
        name: "logout",
        method: "CLIENT_ONLY",
        url: "N/A",
        notes: "No backend logout route exists right now.",
      },
      {
        name: "getData",
        method: "GET",
        url: this.path("/data-array"),
        notes: "When objectId is provided, use getDataByObjectIdResponseStructure().",
      },
      {
        name: "createData",
        method: "POST",
        url: this.path("/data"),
      },
      {
        name: "updateData",
        method: "PUT",
        url: this.path("/data/:id"),
        notes: "Used for relation associate/disassociate too.",
      },
      {
        name: "deleteData",
        method: "DELETE",
        url: this.path("/data/:id"),
      },
    ];
  }
}

export default PortalApiEndpoints;
