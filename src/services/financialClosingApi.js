import apiClient, { API_URL, AUTH_TOKEN_KEY } from '../api/apiClient.js';

const BASE = '/finance/closings';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  return search.toString();
}

export function listFinancialClosings(filters = {}) {
  return apiClient.get(BASE, filters);
}

export function createFinancialClosing(data) {
  return apiClient.post(BASE, data);
}

export function reopenFinancialClosing(id, reason) {
  return apiClient.post(`${BASE}/${encodeURIComponent(id)}/reopen`, { reason });
}

export async function exportFinancialClosings(filters = {}) {
  const query = queryString(filters);
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(
      `${API_URL}${BASE}/export${query ? `?${query}` : ''}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('hfl:auth-expired'));
      }

      const contentType = response.headers.get('content-type') || '';
      let message = `Excel export failed (${response.status})`;

      if (contentType.includes('application/json')) {
        const payload = await response.json();
        message = payload?.errors?.export?.[0] || payload?.message || message;
      } else {
        const body = await response.text();
        if (body && body.length < 300) message = body;
      }

      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `financial-closings-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Excel export timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
