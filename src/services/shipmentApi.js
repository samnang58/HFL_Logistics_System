import apiClient from '../api/apiClient.js';
const unwrap = (r) => r?.data ?? r;
export async function listShipments(params={}) { const r=await apiClient.get('/shipments',params); const d=unwrap(r); return Array.isArray(d)?d:[]; }
export async function getShipment(id) { return unwrap(await apiClient.get(`/shipments/${encodeURIComponent(id)}`)); }
export async function createShipment(payload) { return unwrap(await apiClient.post('/shipments',payload)); }
export async function updateShipment(id,payload) { return unwrap(await apiClient.put(`/shipments/${encodeURIComponent(id)}`,payload)); }
export async function getShipmentTracking(id) { const d=unwrap(await apiClient.get(`/shipments/${encodeURIComponent(id)}/tracking`)); return Array.isArray(d)?d:[]; }
export async function addShipmentTracking(id,payload) { return unwrap(await apiClient.post(`/shipments/${encodeURIComponent(id)}/tracking`,payload)); }
export const SHIPMENT_FLOW=['Preparing','Loading','Departed China','In Transit','Cambodia Port','Customs','Cambodia Warehouse','Completed'];
