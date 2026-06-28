/**
 * @file dashboard/src/utils/api.js
 * @description API utility for NeuroAdapt Dashboard.
 *
 * All requests include a JWT from localStorage["neuroadapt_token"].
 * Falls back gracefully to MOCK_* data when the backend is unreachable.
 *
 * Endpoints:
 *   POST   /api/auth/login
 *   GET    /api/profile
 *   PUT    /api/profile
 *   GET    /api/analytics/overview
 *   PUT    /api/auth/password
 *   DELETE /api/auth/account
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// ─── Mock fallbacks (used when the backend is unreachable) ────────────────────

export const MOCK_PROFILE = {
  email: "demo@neuroadapt.app",
  displayName: "Demo User",
  fullName: "Demo User",
  username: "demouser",
  avatarUrl: "",
  bio: "",
  phone: "",
  occupation: "",
  profileType: "general",
  totalSimplifications: 0,
  totalWordsSimplified: 0,
  cacheHits: 0,
  cacheMisses: 0,
  readingSessions: 0,
  createdAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  preferences: {
    simplificationLevel: "standard",
    bionicModeEnabled: false,
    focusModeEnabled: false,
    fontFamily: "default",
    fontSize: 16,
    colorTheme: "light",
    lineSpacing: 1.5,
  },
};

// ─── Token ────────────────────────────────────────────────────────────────────

const getToken = () => localStorage.getItem("neuroadapt_token");

// ─── Base fetch ───────────────────────────────────────────────────────────────

/**
 * Authenticated fetch wrapper.
 * Throws an Error enriched with { status, code } on non-2xx responses.
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
export const apiFetch = async (path, options = {}) => {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = body.code || null;
    throw err;
  }

  // Handle 204 No Content
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json") || res.status === 204) {
    return { ok: true };
  }

  return res.json();
};

// ─── Auth (Not Implemented per api_reference.md) ──────────────────────────
// The API reference states that auth endpoints are not yet implemented.
// These functions are placeholders and should not be used until the backend supports them.

// ─── Profile ──────────────────────────────────────────────────────────────────

/**
 * Get authenticated user's profile and preferences
 * @returns {Promise<ProfileResponse>}
 */
export const getProfile = () => apiFetch("/api/profile");

/**
 * Update profile / preferences
 * @param {Record<string, any>} data
 */
export const updateProfile = (data) =>
  apiFetch("/api/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });

/**
 * Upload a new avatar image.
 * Sends multipart/form-data — skips the Content-Type header so the browser
 * sets the correct boundary automatically.
 * @param {File} file
 * @returns {Promise<{ success: boolean, avatarUrl: string, user: object }>}
 */
export const uploadAvatar = async (file) => {
  const token = getToken();
  const form = new FormData();
  form.append('avatar', file);

  const res = await fetch(`${BASE_URL}/api/profile/avatar`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = body.code || null;
    throw err;
  }

  return res.json();
};

/**
 * Check if a username is available.
 * We do this by sending a PATCH to the profile route — if it returns
 * 409 USERNAME_TAKEN we know it's taken.
 * @param {string} username
 * @returns {Promise<boolean>}
 */
export const checkUsernameAvailable = async (username) => {
  try {
    await apiFetch('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ username }),
    });
    return true;
  } catch (err) {
    if (err.code === 'USERNAME_TAKEN') return false;
    return true; // other errors are not username conflicts
  }
};

// ─── Analytics ────────────────────────────────────────────────────────────────

/**
 * Get usage analytics overview (real backend data)
 * @returns {Promise<AnalyticsResponse>}
 */
export const getAnalyticsOverview = () => apiFetch(`/api/analytics/overview`);

/**
 * Change user password
 * @param {{ oldPassword: string, newPassword: string }} data
 */
export const changePassword = (data) =>
  apiFetch("/api/auth/password", {
    method: "PUT",
    body: JSON.stringify(data),
  });

/**
 * Delete user account
 */
export const deleteAccount = () =>
  apiFetch("/api/auth/account", {
    method: "DELETE",
  });

