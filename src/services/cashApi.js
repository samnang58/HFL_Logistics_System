import apiClient from '../api/apiClient.js';

export async function listCashAccounts(params = {}) {
  const response = await apiClient.get('/cash/accounts', params);
  return response?.data ?? [];
}

export async function getCashAccount(id) {
  const response = await apiClient.get(`/cash/accounts/${encodeURIComponent(id)}`);
  return response?.data ?? response;
}

export async function createCashAccount(input) {
  const response = await apiClient.post('/cash/accounts', input);
  return response?.data ?? response;
}

export async function listCashTransactions(params = {}) {
  const response = await apiClient.get('/cash/transactions', params);
  return response?.data ?? { data: [], current_page: 1, last_page: 1, total: 0 };
}

export async function getCashTransaction(id) {
  const response = await apiClient.get(`/cash/transactions/${encodeURIComponent(id)}`);
  return response?.data ?? response;
}

export async function createCashTransaction(input) {
  const response = await apiClient.post('/cash/transactions', input);
  return response?.data ?? response;
}
