import { apiClient } from '../api/apiClient';

const resource = (base) => ({
  list: (params) => apiClient.get(`/${base}`, params),
  get: (id) => apiClient.get(`/${base}/${encodeURIComponent(id)}`),
  create: (data) => apiClient.post(`/${base}`, data),
  update: (id, data) => apiClient.put(`/${base}/${encodeURIComponent(id)}`, data),
  remove: (id) => apiClient.delete(`/${base}/${encodeURIComponent(id)}`),
});

export const customerService = resource('customers');
export const packageService = resource('packages');
export const shipmentService = resource('shipments');
export const warehouseService = resource('warehouses');
export const pricingService = resource('pricing');
export const quotationService = resource('quotations');
export const invoiceService = resource('invoices');
export const paymentService = resource('payments');
export const incomeService = resource('income');
export const expenseService = resource('expenses');
export const leadService = resource('crm/leads');

export const trackingService = {
  search: (q) => apiClient.get(`/tracking/search?q=${encodeURIComponent(q)}`),
  get: (trackingNumber) => apiClient.get(`/tracking/${encodeURIComponent(trackingNumber)}`),
  addEvent: (data) => apiClient.post('/tracking/events', data),
};

export const dashboardService = { get: () => apiClient.get('/dashboard') };

export const reportService = {
  shipments: (params) => apiClient.get('/reports/shipments', params),
  customers: (params) => apiClient.get('/reports/customers', params),
  sales: (params) => apiClient.get('/reports/sales', params),
  finance: (params) => apiClient.get('/reports/finance', params),
  warehouse: (params) => apiClient.get('/reports/warehouse', params),
};

export const authService = {
  login: async (credentials) => {
    const result = await apiClient.post('/auth/login', credentials);
    const token = result?.data?.token || result?.token;
    if (token) localStorage.setItem('hfl_auth_token', token);
    return result;
  },
  me: () => apiClient.get('/auth/me'),
  logout: async () => {
    try { return await apiClient.post('/auth/logout', {}); }
    finally { localStorage.removeItem('hfl_auth_token'); }
  },
};
