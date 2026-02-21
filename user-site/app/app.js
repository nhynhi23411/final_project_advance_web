// Lost & Found minimal frontend (vanilla JS)

const LF = (() => {
  const storage = window.localStorage;
  const DEFAULT_BASE_URL = "http://localhost:3000";

  function getBaseUrl() {
    return storage.getItem("lf.baseUrl") || DEFAULT_BASE_URL;
  }

  function setBaseUrl(url) {
    storage.setItem("lf.baseUrl", url);
  }

  function getToken() {
    return storage.getItem("lf.token") || "";
  }

  function setToken(token) {
    storage.setItem("lf.token", token);
  }

  function clearAuth() {
    storage.removeItem("lf.token");
    storage.removeItem("lf.user");
  }

  function getUser() {
    const raw = storage.getItem("lf.user");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function setUser(user) {
    storage.setItem("lf.user", JSON.stringify(user));
  }

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function fmtDate(d) {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    return dt.toLocaleString();
  }

  function statusBadge(status) {
    const s = String(status || "");
    const map = {
      PENDING_APPROVAL: ["warning", "PENDING"],
      APPROVED: ["success", "APPROVED"],
      REJECTED: ["danger", "REJECTED"],
      MATCHED: ["info", "MATCHED"],
      RETURN_PENDING: ["primary", "RETURN_PENDING"],
      RETURNED: ["secondary", "RETURNED"],
      CLOSED: ["dark", "CLOSED"],
    };
    const [tone, label] = map[s] || ["secondary", s || "UNKNOWN"];
    return `<span class="badge bg-${tone} lf-badge">${label}</span>`;
  }

  async function api(path, { method = "GET", headers = {}, body } = {}) {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
    const token = getToken();

    const h = new Headers(headers);
    if (token) h.set("Authorization", `Bearer ${token}`);

    const res = await fetch(url, {
      method,
      headers: h,
      body,
      credentials: "include",
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

    if (!res.ok) {
      const msg = (data && data.message) || res.statusText || "Request failed";
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function register({ name, email, password }) {
    const data = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    // backend trả accessToken + user
    if (data?.accessToken) setToken(data.accessToken);
    if (data?.user) setUser(data.user);
    return data;
  }

  async function login({ email, password }) {
    const data = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (data?.accessToken) setToken(data.accessToken);
    if (data?.user) setUser(data.user);
    return data;
  }

  async function me() {
    return api("/api/me");
  }

  async function listItems(filters = {}) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v === undefined || v === null) continue;
      const s = String(v).trim();
      if (s) qs.set(k, s);
    }
    const q = qs.toString();
    return api(`/api/items${q ? `?${q}` : ""}`);
  }

  async function myItems() {
    return api("/api/items/my");
  }

  async function getItem(id) {
    return api(`/api/items/${encodeURIComponent(id)}`);
  }

  async function uploadImage(file) {
    const fd = new FormData();
    fd.append("file", file);
    return api("/api/items/upload-image", { method: "POST", body: fd });
  }

  async function createItem(payload) {
    return api("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function updateItem(id, payload) {
    return api(`/api/items/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function deleteItem(id) {
    return api(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  function requireAuth(redirectTo = "login.html") {
    if (!getToken()) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  function wireNavbar() {
    const user = getUser();
    const elUser = qs("[data-lf-user]");
    const elLogin = qs("[data-lf-login]");
    const elLogout = qs("[data-lf-logout]");

    if (elUser) elUser.textContent = user ? `${user.name || user.email}` : "Guest";
    if (elLogin) elLogin.classList.toggle("d-none", !!user);
    if (elLogout) elLogout.classList.toggle("d-none", !user);

    if (elLogout) {
      elLogout.addEventListener("click", (e) => {
        e.preventDefault();
        clearAuth();
        window.location.href = "index.html";
      });
    }
  }

  return {
    // state
    getBaseUrl,
    setBaseUrl,
    getToken,
    setToken,
    clearAuth,
    getUser,

    // helpers
    qs,
    qsa,
    fmtDate,
    statusBadge,
    wireNavbar,
    requireAuth,

    // api
    api,
    register,
    login,
    me,
    listItems,
    myItems,
    getItem,
    uploadImage,
    createItem,
    updateItem,
    deleteItem,
  };
})();

