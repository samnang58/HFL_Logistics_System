import apiClient from '../api/apiClient.js';

const unwrap = (payload) => payload?.data ?? payload ?? {};

export async function listPackages(filters = {}) {
  const params = {
    search: filters.search || undefined,
    status: filters.status && filters.status !== 'All Status' ? filters.status : undefined,
    shipping_mode: filters.shippingMode && filters.shippingMode !== 'All Modes' ? filters.shippingMode : undefined,
    per_page: filters.perPage || 100,
  };
  const payload = unwrap(await apiClient.get('/packages', params));
  const rows = Array.isArray(payload) ? payload : (payload?.data || []);
  return rows.map(normalizePackage);
}

export async function getPackage(id) {
  const payload = unwrap(await apiClient.get(`/packages/${encodeURIComponent(id)}`));
  if (payload?.package) {
    return {
      ...normalizePackage(payload.package),
      customer: payload.customer || null,
      containers: payload.containers || [],
      shipments: payload.shipments || [],
      tracking: payload.tracking || [],
      invoices: payload.invoices || [],
      payments: payload.payments || [],
      connections: payload.connections || {},
    };
  }
  return normalizePackage(payload);
}

export async function createPackage(input) {
  const payload = unwrap(await apiClient.post('/packages', toApi(input)));
  return normalizePackage(payload);
}

const API_ORIGIN = (() => {
  try {
    return new URL(import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1').origin;
  } catch {
    return '';
  }
})();

// Uploaded photos are stored as "/uploads/..." - prefix them with the backend address.
function imageList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((u) => typeof u === 'string' && u)
    .map((u) => (u.startsWith('/') ? `${API_ORIGIN}${u}` : u));
}

export async function uploadPackageImages(id, files) {
  const body = new FormData();
  Array.from(files).forEach((file) => body.append('images[]', file));
  const payload = unwrap(await apiClient.post(`/packages/${encodeURIComponent(id)}/images`, body));
  return normalizePackage(payload);
}

export async function deletePackageImage(id, url) {
  // Stored value is the relative path; strip the backend address again.
  const relative = API_ORIGIN && url.startsWith(API_ORIGIN) ? url.slice(API_ORIGIN.length) : url;
  const payload = unwrap(await apiClient.post(`/packages/${encodeURIComponent(id)}/images/delete`, { url: relative }));
  return normalizePackage(payload);
}

export async function updatePackage(id, input) {
  const payload = unwrap(await apiClient.put(`/packages/${encodeURIComponent(id)}`, toApi(input)));
  return normalizePackage(payload);
}

export async function scanPackage(value) {
  const payload = unwrap(await apiClient.get('/packages/scan', { value }));
  return payload?.package ? {
    ...normalizePackage(payload.package),
    customer: payload.customer || null,
    containers: payload.containers || [],
    shipments: payload.shipments || [],
    tracking: payload.tracking || [],
    invoices: payload.invoices || [],
    payments: payload.payments || [],
    connections: payload.connections || {},
  } : normalizePackage(payload);
}

export async function receiveChinaPackage(id, warehouse_location, note = '') {
  const payload = unwrap(await apiClient.post(`/packages/${encodeURIComponent(id)}/receive-china`, { warehouse_location, note }));
  return normalizePackage(payload);
}

export async function syncChinaPackages() {
  const payload = unwrap(await apiClient.post('/packages/sync-china', {}));
  return payload;
}

export async function listChinaSyncLogs() {
  const payload = unwrap(await apiClient.get('/packages/sync-logs', { per_page: 20 }));
  return Array.isArray(payload) ? payload : (payload?.data || []);
}

function toApi(input) {
  return {
    code: input.code || null,
    tracking_number: input.trackingNumber || null,
    china_waybill_number: input.chinaWaybillNumber || null,
    hfl_package_code: input.hflPackageCode || null,
    customer_id: input.customerId || null,
    customer_name: input.customerName || null,
    supplier: input.supplier || null,
    product_name: input.productName || null,
    product_category: input.productCategory || null,
    quantity: Number(input.quantity || 0),
    shipping_mode: input.shippingMode || 'LAND',
    pricing_type: input.pricingType || 'GC',
    from_warehouse: input.fromWarehouse || null,
    to_warehouse: input.toWarehouse || null,
    status: input.status || 'Order Created',
    shipping_date: input.shippingDate || null,
    eta: input.eta || null,
    boxes: input.boxes || [],
    notes: input.notes || null,
  };
}

export async function confirmCustomerPickup(id, input) {
  const payload = unwrap(await apiClient.post(
    `/cambodia-warehouse/packages/${encodeURIComponent(id)}/customer-pickup`,
    {
      received_by: input.receivedBy,
      received_phone: input.receivedPhone || null,
      received_relation: input.receivedRelation || null,
      delivery_remark: input.deliveryRemark || null,
    }
  ));
  return normalizePackage(payload);
}

export function normalizePackage(p = {}) {
  const boxes = Array.isArray(p.boxes) ? p.boxes : [];
  const totalCbm = Number(p.total_cbm ?? p.totalCbm ?? 0);
  const totalWeight = Number(p.total_weight ?? p.totalWeight ?? 0);
  return {
    ...p,
    id: p.id,
    packageId: p.hfl_package_code ?? p.hflPackageCode ?? p.package_id ?? p.packageId,
    technicalPackageId: p.package_id ?? p.packageId ?? p.id,
    code: p.code ?? '',
    trackingNumber: p.tracking_number ?? p.trackingNumber ?? '',
    chinaWaybillNumber: p.china_waybill_number ?? p.chinaWaybillNumber ?? '',
    hflPackageCode: p.hfl_package_code ?? p.hflPackageCode ?? '',
    hflTrackingNumber: p.tracking_number ?? p.trackingNumber ?? '',
    chinaDeliveryTrackingNumber: p.china_waybill_number ?? p.chinaWaybillNumber ?? '',
    customerId: p.customer_id ?? p.customerId ?? '',
    customerName: p.customer_name ?? p.customerName ?? '',
    supplier: p.supplier ?? '',
    productName: p.product_name ?? p.productName ?? '',
    productCategory: p.product_category ?? p.productCategory ?? '',
    chinaImages: imageList(p.product_images ?? p.chinaImages),
    customImages: imageList(p.custom_images ?? p.customImages),
    productImages: [
      ...imageList(p.product_images ?? p.chinaImages),
      ...imageList(p.custom_images ?? p.customImages),
    ],
    quantity: Number(p.quantity ?? 0),
    shippingMode: p.shipping_mode ?? p.shippingMode ?? '',
    pricingType: p.pricing_type ?? p.pricingType ?? 'GC',
    pricing_type: p.pricing_type ?? p.pricingType ?? 'GC',
    pricing_id: p.pricing_id ?? p.pricingId ?? null,
    pricing_rate_type: p.pricing_rate_type ?? p.pricingRateType ?? null,
    shipping_rate: Number(p.shipping_rate ?? p.shippingRate ?? 0),
    shipping_cost: Number(p.shipping_cost ?? p.shippingCost ?? 0),
    delivery_fee: Number(p.delivery_fee ?? p.deliveryFee ?? 0),
    handling_fee: Number(p.handling_fee ?? p.handlingFee ?? 0),
    warehouse_fee: Number(p.warehouse_fee ?? p.warehouseFee ?? 0),
    other_fee: Number(p.other_fee ?? p.otherFee ?? 0),
    discount: Number(p.discount ?? 0),
    fromWarehouse: p.from_warehouse ?? p.fromWarehouse ?? '',
    toWarehouse: p.to_warehouse ?? p.toWarehouse ?? '',
    status: p.status ?? 'Order Created',
    deliveryStatus: p.delivery_status ?? p.deliveryStatus ?? '',
    customerReceivedAt: p.customer_received_at ?? p.customerReceivedAt ?? null,
    receivedBy: p.received_by ?? p.receivedBy ?? '',
    receivedPhone: p.received_phone ?? p.receivedPhone ?? '',
    receivedRelation: p.received_relation ?? p.receivedRelation ?? '',
    deliveryRemark: p.delivery_remark ?? p.deliveryRemark ?? '',
    shippingDate: p.shipping_date ?? p.shippingDate ?? '',
    eta: p.eta ?? '',
    boxes,
    totalCbm,
    totalWeight,
    boxCount: Number(p.box_count ?? p.boxCount ?? boxes.reduce((s, b) => s + Number(b.quantity || 0), 0)),
    warehouseLocation: p.warehouse_location ?? p.warehouseLocation ?? '',
    grandTotal: Number(p.grand_total ?? p.grandTotal ?? 0),
    createdAt: p.created_at ?? p.createdAt,
    updatedAt: p.updated_at ?? p.updatedAt,
  };
}
