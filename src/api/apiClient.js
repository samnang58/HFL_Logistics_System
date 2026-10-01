const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '');
const TOKEN_KEY = 'hfl_auth_token';
const DEFAULT_TIMEOUT = 20000;

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) value.forEach((item) => search.append(`${key}[]`, item));
    else search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (response.status === 204) return null;
  if (contentType.includes('application/json')) {
    try { return await response.json(); } catch { return null; }
  }
  return response.text();
}

function normalizeError(payload, status) {
  const error = new Error(
    payload?.message || (typeof payload === 'string' ? payload : `Request failed (${status})`)
  );
  error.status = status;
  error.payload = payload;
  error.errors = payload?.errors || {};
  return error;
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT);
  const token = localStorage.getItem(TOKEN_KEY);
  const isFormData = options.body instanceof FormData;
  const headers = {
    Accept: 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    const payload = await parseResponse(response);
    if (!response.ok) {
      if (response.status === 401) window.dispatchEvent(new CustomEvent('hfl:auth-expired'));
      throw normalizeError(payload, response.status);
    }
    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('Request timed out. Please try again.');
      timeoutError.code = 'TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const apiClient = {
  get: (path, params) => request(`${path}${buildQuery(params)}`),
  post: (path, body) => request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export { API_URL, TOKEN_KEY as AUTH_TOKEN_KEY };
export default apiClient;
