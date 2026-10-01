import apiClient from '../api/apiClient.js';

export async function listInvoices(params = {}) { const r=await apiClient.get('/invoices',params); return r?.data ?? []; }
export async function getInvoice(id) { const r=await apiClient.get(`/invoices/${id}`); return r?.data ?? r; }
export async function createInvoice(input) { const r=await apiClient.post('/invoices',input); return r?.data ?? r; }
export async function updateInvoiceBilling(id, input) { const r=await apiClient.patch(`/invoices/${id}/billing`, input); return r?.data ?? r; }
export async function generateInvoiceFromPackage(packageId, options={}) { const r=await apiClient.post(`/invoices/from-package/${packageId}`,options); return r?.data ?? r; }
export async function generateCombinedInvoice(packageIds, options={}) { const r=await apiClient.post('/invoices/from-packages',{package_ids:packageIds,...options}); return r?.data ?? r; }
export async function listPayments(params={}) { const r=await apiClient.get('/payments',params); return r?.data ?? []; }
export async function createPayment(input) { const r=await apiClient.post('/payments',input); return r?.data ?? r; }
export async function listQuotations(params={}) { const r=await apiClient.get('/quotations',params); return r?.data ?? []; }
export async function createQuotation(input) { const r=await apiClient.post('/quotations',input); return r?.data ?? r; }
export async function acceptQuotation(id) { const r=await apiClient.post(`/quotations/${id}/accept`,{}); return r?.data ?? r; }
export async function deleteInvoice() { throw new Error('Invoice deletion is not enabled by the backend.'); }
export async function deleteQuotation() { throw new Error('Quotation deletion is not enabled by the backend.'); }
export async function getCustomerStatement(customerId) { const [invoices,payments]=await Promise.all([listInvoices({search:customerId}),listPayments({search:customerId})]); return {invoices,payments}; }

export async function getBillingSettings() { const r = await apiClient.get('/billing/settings'); return r?.data ?? r; }
export async function uploadAbaKhqr(file) { const form = new FormData(); form.append('qr', file); const r = await apiClient.post('/billing/settings/aba-khqr', form); return r?.data ?? r; }
