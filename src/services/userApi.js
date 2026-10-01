import apiClient from '../api/apiClient';

const unwrap = (payload) => payload?.data ?? payload;

export const userApi = {
  list: (params = {}) => apiClient.get('/users', params).then(unwrap),
  get: (id) => apiClient.get(`/users/${id}`).then(unwrap),
  create: (body) => apiClient.post('/users', body).then(unwrap),
  update: (id, body) => apiClient.put(`/users/${id}`, body).then(unwrap),
  remove: (id) => apiClient.delete(`/users/${id}`).then(unwrap),
  resetPassword: (id, password) => apiClient.post(`/users/${id}/reset-password`, { password }).then(unwrap),
};

export default userApi;
