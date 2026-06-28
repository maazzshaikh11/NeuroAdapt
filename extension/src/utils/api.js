import axios from 'axios';

/**
 * -----------------------------------------------------------------------------
 * Axios Instance Configuration
 * -----------------------------------------------------------------------------
 * Creates a centralized Axios instance for all backend communication.
 * The baseURL is dynamically set from environment variables, allowing for
 * seamless switching between development, staging, and production environments.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * -----------------------------------------------------------------------------
 * Request Interceptor
 * -----------------------------------------------------------------------------
 * This interceptor automatically attaches the JWT token to the headers of
 * every outgoing request. It asynchronously retrieves the token from
 * `chrome.storage.local`.
 *
 * Why async? The Chrome Storage API is asynchronous. We must return a Promise
 * that resolves with the modified config object.
 *
 * Error Handling: If retrieving the token fails, the error is logged, but the
 * request proceeds without the Authorization header. This prevents the app
 * from crashing if chrome.storage is unavailable or the token is missing.
 */
api.interceptors.request.use(
  async (config) => {
    try {
      const data = await chrome.storage.local.get('neuroadapt_token');
      const token = data.neuroadapt_token;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error retrieving token from chrome.storage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * -----------------------------------------------------------------------------
 * Response Interceptor
 * -----------------------------------------------------------------------------
 * This interceptor centralizes handling of API responses. Its primary role
 * here is to detect session expiry (via a 401 Unauthorized status).
 *
 * On 401 Error:
 * 1. It removes the invalid/expired token from `chrome.storage.local`.
 * 2. It dispatches a global custom event 'neuroadapt:session-expired'.
 *    UI components (like a login form) can listen for this event to react
 *    accordingly, e.g., by showing a "session expired" message.
 * 3. It rejects the promise with a clear error message, allowing the calling
 *    code to handle the failed request.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      try {
        await chrome.storage.local.remove('neuroadapt_token');
        // Service workers have no `window` — guard before dispatching
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('neuroadapt:session-expired'));
        }
      } catch (storageError) {
        console.error('Error removing token from chrome.storage:', storageError);
      }
    }
    return Promise.reject(error);
  }
);


/**
 * -----------------------------------------------------------------------------
 * Exported API Methods
 * -----------------------------------------------------------------------------
 * These wrapper functions provide a clean, reusable interface for interacting
 * with specific backend endpoints. Components should always use these methods
 * instead of calling `api.get`, `api.post`, etc., directly.
 */

/**
 * Sends text to the backend for simplification.
 * @param {object} data - The payload, e.g., { text: '...' }.
 * @returns {Promise<object>} The simplified content.
 */
export const simplifyText = (data) => api.post('/api/simplify', data);

/**
 * Fetches the current user's profile data.
 * @returns {Promise<object>} The user's profile.
 */
export const getProfile = () => api.get('/api/profile');

/**
 * Updates the current user's profile.
 * @param {object} data - The updated profile data.
 * @returns {Promise<object>} The updated user profile.
 */
export const updateProfile = (data) => api.put('/api/profile', data);

/**
 * Fetches the user's usage analytics.
 * @returns {Promise<object>} The usage data.
 */
/**
 * Fetches dashboard analytics overview (single source of truth for daily usage).
 * @returns {Promise<object>} Analytics overview including dailySimplificationCount.
 */
export const getAnalyticsOverview = () => api.get('/api/analytics/overview');

export default api;
