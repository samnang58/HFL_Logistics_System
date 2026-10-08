import apiClient from "../api/apiClient.js";

export async function listWarehouses(params = {}) {
  const response = await apiClient.get("/warehouses", params);
  return response?.data?.data ?? response?.data ?? response ?? [];
}

export async function createWarehouse(payload) {
  const response = await apiClient.post("/warehouses", payload);
  return response?.data ?? response;
}

export async function updateWarehouse(id, payload) {
  const response = await apiClient.put(`/warehouses/${id}`, payload);
  return response?.data ?? response;
}

export async function deleteWarehouse(id) {
  return apiClient.delete(`/warehouses/${id}`);
}
