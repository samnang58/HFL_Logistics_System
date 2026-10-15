import apiClient from '../api/apiClient.js';

export async function getTestData() {
  const response = await apiClient.get('/test-data');
  return response?.data ?? response;
}
