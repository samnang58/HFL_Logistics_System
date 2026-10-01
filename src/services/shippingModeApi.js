import apiClient from '../api/apiClient.js';

const unwrap = (r) => r?.data ?? r;
const normalize = (x = {}) => ({
  id: x.id,
  code: x.code ?? '',
  name: x.name ?? '',
  description: x.description ?? '',
  unit: x.unit ?? 'CBM',
  status: x.status ?? 'Active',
});

export async function listShippingModes() {
  const payload = unwrap(await apiClient.get('/shipping-modes', { per_page: 200 }));
  const rows = Array.isArray(payload) ? payload : (payload?.data || []);
  return rows.map(normalize);
}
export async function createShippingMode(input) {
  return normalize(unwrap(await apiClient.post('/shipping-modes', {
    code: String(input.code || '').trim().toUpperCase(),
    name: String(input.name || '').trim(),
    description: input.description || null,
    unit: input.unit || 'CBM',
    status: input.status || 'Active',
  })));
}
export async function updateShippingMode(id, input) {
  return normalize(unwrap(await apiClient.put(`/shipping-modes/${encodeURIComponent(id)}`, {
    code: String(input.code || '').trim().toUpperCase(),
    name: String(input.name || '').trim(),
    description: input.description || null,
    unit: input.unit || 'CBM',
    status: input.status || 'Active',
  })));
}
export async function deleteShippingMode(id) {
  return apiClient.delete(`/shipping-modes/${encodeURIComponent(id)}`);
}
