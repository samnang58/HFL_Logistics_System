import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient.js';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2 border-b last:border-b-0 text-sm">
      <div className="text-slate-500">{label}</div>
      <div className="col-span-2 font-medium break-words">{children || '—'}</div>
    </div>
  );
}

/**
 * Click an expense row to see WHICH delivery / package / customer the cost belongs to,
 * plus notes, payment info and who recorded it.
 */
export default function ExpenseDetailModal({ expense, onClose, onChanged }) {
  const [data, setData] = useState(expense);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    apiClient.get(`/expenses/${expense.id}`)
      .then((res) => { if (alive) setData(res?.data ?? res); })
      .catch(() => {});
    return () => { alive = false; };
  }, [expense.id]);

  const changeStatus = async (status) => {
    if (status === 'Cancelled' && !window.confirm(`Cancel expense ${data.expense_no}? It will no longer be deducted from profit.`)) return;
    try {
      setBusy(true);
      await apiClient.put(`/expenses/${data.id}`, { status });
      onChanged?.();
      onClose();
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy(false);
    }
  };

  const statusColor = data.status === 'Paid' ? 'bg-emerald-100 text-emerald-700'
    : data.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500';

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-bold">{data.expense_no}</h2>
            <p className="text-xs text-slate-500">{data.expense_type || 'Operating'} · {data.category}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}>{data.status}</span>
            <button type="button" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="p-5">
          <div className="text-3xl font-bold text-red-600 mb-4">{money(data.amount)}</div>

          <div className="rounded-xl border p-3 mb-4">
            <div className="text-xs font-bold text-slate-500 mb-1">LINKED TO</div>
            <Row label="Customer">{data.customer_name ? `${data.customer_name} (${data.customer_id})` : null}</Row>
            <Row label="Delivery">{data.delivery_number ? `${data.delivery_number}${data.delivery_status ? ` · ${data.delivery_status}` : ''}` : null}</Row>
            <Row label="Delivery address">{data.delivery_address}</Row>
            <Row label="Package tracking">{data.tracking_number}</Row>
            <Row label="HFL package code">{data.hfl_package_code}</Row>
            <Row label="Goods">{data.product_name}</Row>
          </div>

          <div className="rounded-xl border p-3 mb-4">
            <div className="text-xs font-bold text-slate-500 mb-1">PAYMENT</div>
            <Row label="Driver / Company">{data.vendor}</Row>
            <Row label="Method">{data.payment_method}</Row>
            <Row label="Reference">{data.reference || data.payment_reference}</Row>
            <Row label="Expense date">{data.expense_date ? String(data.expense_date).slice(0, 10) : null}</Row>
            <Row label="Paid at">{data.paid_at ? String(data.paid_at).replace('T', ' ').slice(0, 16) : null}</Row>
            <Row label="Recorded by">{data.creator?.name}</Row>
          </div>

          <div className="rounded-xl border p-3">
            <div className="text-xs font-bold text-slate-500 mb-1">NOTES</div>
            <div className="text-sm whitespace-pre-wrap min-h-8">{data.description || data.notes ? [data.description, data.notes].filter(Boolean).join('\n') : '—'}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t p-5">
          {data.status === 'Pending' && (
            <button disabled={busy} onClick={() => changeStatus('Paid')}
              className="px-4 py-2 rounded-lg border border-emerald-300 text-emerald-700 font-semibold">Mark Paid</button>
          )}
          {data.status !== 'Cancelled' && (
            <button disabled={busy} onClick={() => changeStatus('Cancelled')}
              className="px-4 py-2 rounded-lg border border-red-300 text-red-600 font-semibold">Cancel expense</button>
          )}
          <button onClick={onClose} className="px-4 py-2 rounded-lg border">Close</button>
        </div>
      </div>
    </div>
  );
}
