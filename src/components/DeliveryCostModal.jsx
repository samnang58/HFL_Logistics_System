import React, { useState } from 'react';
import apiClient from '../api/apiClient.js';

export const TRANSPORT_METHODS = ['Tuk Tuk', 'VET', 'Grab', 'Rental Van', 'Motorbike', 'Other'];

/**
 * Record a delivery cost (transport fee) for one delivery.
 * Saved as an Expense (type "Delivery Cost") linked to the delivery and its package,
 * so it is deducted from profit in the Finance Control Center.
 */
export default function DeliveryCostModal({ delivery, onClose, onDone }) {
  const [form, setForm] = useState({
    category: 'Tuk Tuk',
    vendor: '',
    amount: '',
    payment_method: 'Cash',
    status: 'Paid',
    expense_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!(Number(form.amount) > 0)) {
      alert('Enter the cost amount.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/expenses', {
        expense_type: 'Delivery Cost',
        category: form.category,
        vendor: form.vendor || null,
        amount: Number(form.amount),
        currency: 'USD',
        payment_method: form.payment_method,
        expense_date: form.expense_date,
        status: form.status,
        reference: delivery?.delivery_number || null,
        description: `Delivery cost ${delivery?.delivery_number || ''}`.trim(),
        package_id: delivery?.package_id ? Number(delivery.package_id) : null,
        delivery_id: delivery?.id ? Number(delivery.id) : null,
        notes: form.notes || null,
      });
      onDone?.();
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const field = 'mt-1 w-full h-10 border rounded-lg px-3 text-sm';

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/40 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-bold">Delivery Cost</h2>
            <p className="text-xs text-slate-500">
              {delivery?.delivery_number || 'Delivery'} · deducted from profit
            </p>
          </div>
          <button type="button" onClick={onClose}>✕</button>
        </div>

        <div className="grid grid-cols-2 gap-4 p-5">
          <label className="text-xs font-semibold">
            Transport
            <select value={form.category} onChange={(e) => set('category', e.target.value)} className={field}>
              {TRANSPORT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold">
            Amount (USD)
            <input type="number" min="0.01" step="0.01" required value={form.amount}
              onChange={(e) => set('amount', e.target.value)} className={field} />
          </label>
          <label className="text-xs font-semibold">
            Driver / Company
            <input value={form.vendor} onChange={(e) => set('vendor', e.target.value)} className={field}
              placeholder="e.g. Sok, VET Phnom Penh" />
          </label>
          <label className="text-xs font-semibold">
            Date
            <input type="date" value={form.expense_date} onChange={(e) => set('expense_date', e.target.value)} className={field} />
          </label>
          <label className="text-xs font-semibold">
            Payment Method
            <select value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)} className={field}>
              <option>Cash</option><option>Bank Transfer</option><option>ABA</option><option>ACLEDA</option><option>Other</option>
            </select>
          </label>
          <label className="text-xs font-semibold">
            Status
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className={field}>
              <option>Paid</option><option>Pending</option>
            </select>
          </label>
          <label className="text-xs font-semibold col-span-2">
            Notes
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
              className="mt-1 w-full min-h-16 border rounded-lg p-3 text-sm" />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t p-5">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold">
            {saving ? 'Saving...' : 'Save Cost'}
          </button>
        </div>
      </form>
    </div>
  );
}
