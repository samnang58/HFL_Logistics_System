import apiClient from '../api/apiClient.js';

const unwrap = (payload) => payload?.data ?? payload ?? {};

export async function receiveCambodiaPackage(id, data) {
  return unwrap(await apiClient.post(`/cambodia-warehouse/packages/${encodeURIComponent(id)}/receive`, data));
}

export async function measureCambodiaPackage(id, data) {
  return unwrap(await apiClient.post(`/cambodia-warehouse/packages/${encodeURIComponent(id)}/measure`, data));
}

export async function readyForBilling(id, data = {}) {
  return unwrap(await apiClient.post(`/cambodia-warehouse/packages/${encodeURIComponent(id)}/ready-for-billing`, data));
}
