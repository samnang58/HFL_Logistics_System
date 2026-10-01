import apiClient from '../api/apiClient.js';
export const listDeliveries = (params={}) => apiClient.get('/deliveries', params);
export const createDelivery = (data) => apiClient.post('/deliveries', data);
export const updateDelivery = (id, data) => apiClient.put(`/deliveries/${id}`, data);
export const listDeliveryDrivers = () => apiClient.get('/users/delivery-drivers');
export const confirmCustomerReceived = (id, data) => apiClient.post(`/packages/${id}/confirm-received`, data);
