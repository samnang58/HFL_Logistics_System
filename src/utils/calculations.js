export function toMeters(value, unit = 'cm') {
  const n = Number(value) || 0;
  const normalized = String(unit).toLowerCase();
  if (normalized === 'm' || normalized === 'meter' || normalized === 'meters') return n;
  if (normalized === 'mm' || normalized === 'millimeter' || normalized === 'millimeters') return n / 1000;
  return n / 100;
}

export function calculateCBM(length, width, height, quantity = 1, unit = 'cm') {
  return toMeters(length, unit) * toMeters(width, unit) * toMeters(height, unit) * Math.max(0, Number(quantity) || 0);
}

export function calculateTotalCBM(boxes = []) {
  return boxes.reduce((total, box) => total + calculateCBM(box.length, box.width, box.height, box.quantity ?? 1, box.unit || 'cm'), 0);
}

export function calculateShippingCost(chargeableCbm, rate) {
  return Math.max(0, Number(chargeableCbm) || 0) * Math.max(0, Number(rate) || 0);
}

export function calculateInvoiceTotal({ shippingCost = 0, deliveryFee = 0, handlingFee = 0, warehouseFee = 0, otherFee = 0, discount = 0 } = {}) {
  const subtotal = [shippingCost, deliveryFee, handlingFee, warehouseFee, otherFee]
    .reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  return { subtotal, discount: Math.max(0, Number(discount) || 0), grandTotal: Math.max(0, subtotal - (Number(discount) || 0)) };
}

export function calculateOutstandingBalance(grandTotal, confirmedPayments = []) {
  const paid = confirmedPayments.reduce((sum, payment) => sum + Math.max(0, Number(payment.amount) || 0), 0);
  return { paidAmount: paid, balance: Math.max(0, (Number(grandTotal) || 0) - paid) };
}

export function calculateProfit(totalIncome, totalExpenses) {
  return (Number(totalIncome) || 0) - (Number(totalExpenses) || 0);
}
