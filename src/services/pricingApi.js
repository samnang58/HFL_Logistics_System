import apiClient from '../api/apiClient.js';

const unwrap = (r) => r?.data ?? r;

const normalize = (p = {}) => ({
  ...p,
  id: p.id,
  pricingId: p.pricing_id ?? p.pricingId,
  rateName: p.rate_name ?? p.rateName ?? '',
  shippingMode: p.shipping_mode ?? p.shippingMode ?? '',
  pricingType: p.pricing_type ?? p.pricingType ?? 'GC',
  origin: p.origin ?? '',
  destination: p.destination ?? '',
  rateType: p.rate_type ?? p.rateType ?? 'CBM',
  rate: Number(p.rate ?? 0),
  currency: p.currency ?? 'USD',
  minimumCbm: Number(p.minimum_cbm ?? p.minimumCbm ?? 0),
  effectiveDate: p.effective_date ?? p.effectiveDate ?? '',
  expiryDate: p.expiry_date ?? p.expiryDate ?? '',
  status: p.status ?? 'Active',
});

export async function listPricing(filters = {}) {
  const params = {
    search: filters.search || undefined,
    shipping_mode: filters.shippingMode && filters.shippingMode !== 'All Modes' ? filters.shippingMode : undefined,
    status: filters.status && filters.status !== 'All Status' ? filters.status : undefined,
    per_page: 200,
  };
  const payload = unwrap(await apiClient.get('/pricing', params));
  const rows = Array.isArray(payload) ? payload : (payload?.data || []);
  return rows.map(normalize);
}

export async function createPricing(input) {
  const payload = unwrap(await apiClient.post('/pricing', {
    rate_name: input.rateName,
    shipping_mode: String(input.shippingMode || '').toUpperCase(),
    pricing_type: input.pricingType || 'GC',
    origin: input.origin,
    destination: input.destination,
    rate_type: input.rateType || 'CBM',
    rate: Number(input.rate || 0),
    currency: input.currency || 'USD',
    minimum_cbm: Number(input.minimumCbm || 0),
    effective_date: input.effectiveDate || null,
    expiry_date: input.expiryDate || null,
    status: input.status || 'Active',
  }));
  return normalize(payload);
}

export async function updatePricing(id, input) {
  const payload = unwrap(await apiClient.put(`/pricing/${encodeURIComponent(id)}`, {
    rate_name: input.rateName,
    shipping_mode: String(input.shippingMode || '').toUpperCase(),
    pricing_type: input.pricingType || 'GC',
    origin: input.origin,
    destination: input.destination,
    rate_type: input.rateType || 'CBM',
    rate: Number(input.rate || 0),
    currency: input.currency || 'USD',
    minimum_cbm: Number(input.minimumCbm || 0),
    effective_date: input.effectiveDate || null,
    expiry_date: input.expiryDate || null,
    status: input.status || 'Active',
  }));
  return normalize(payload);
}

export async function findApplicablePricing({ shippingMode, pricingType='GC', origin, destination }) {
  try {
    const payload = unwrap(await apiClient.get('/pricing/find', {
      shipping_mode: shippingMode, pricing_type: pricingType, origin, destination,
    }));
    return normalize(payload);
  } catch {
    return null;
  }
}

export function calculatePricingQuote({ pricing, cbm=0, weightKg=0, deliveryFee=0, handlingFee=0, warehouseFee=0, otherFee=0, discount=0 } = {}) {
  if (!pricing) return { chargeableQuantity:0, shippingCost:0, subtotal:0, discount:0, grandTotal:0, currency:'USD' };
  const quantity = pricing.rateType === 'KG' ? Math.max(0, Number(weightKg)||0) : Math.max(Math.max(0, Number(cbm)||0), Math.max(0, Number(pricing.minimumCbm)||0));
  const shippingCost = quantity * Math.max(0, Number(pricing.rate)||0);
  const fees = [deliveryFee, handlingFee, warehouseFee, otherFee].reduce((s,v)=>s+Math.max(0,Number(v)||0),0);
  const subtotal = shippingCost + fees;
  const safeDiscount = Math.min(subtotal, Math.max(0, Number(discount)||0));
  return { chargeableQuantity:quantity, shippingCost, subtotal, discount:safeDiscount, grandTotal:subtotal-safeDiscount, currency:pricing.currency || 'USD' };
}
