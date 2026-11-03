import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calculator, CheckCircle2, History, Printer, Save, Send, Wallet } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPayment, getInvoice, updateInvoiceBilling } from '../services/billingApi.js';
import { formatHflDateTime } from '../utils/dateTime.js';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const num = (n, digits = 4) => Number(n || 0).toFixed(digits);

function Field({ label, value, onChange, step = '0.01', min = '0' }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function SendBillModal({ invoice, onClose }) {
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const url = `${window.location.origin}/accounting/sales-invoice/${invoice.id}`;

  const share = async () => {
    const text = `HFL Bill ${invoice.invoice_no || invoice.invoiceNo} · ${invoice.customer_name || invoice.customerName} · ${money(invoice.grand_total || invoice.grandTotal)}\n${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'HFL Bill', text, url });
        setDone(true);
        return;
      }
      await navigator.clipboard.writeText(text);
      setMessage('Bill link copied. You can paste it into Telegram, WhatsApp, Messenger, or Email.');
      setDone(true);
    } catch (e) {
      if (e?.name !== 'AbortError') setMessage('Unable to share automatically. Copy the bill link below.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Send Bill</h2>
            <p className="text-xs text-slate-500 mt-1">Share the customer-facing HFL bill link.</p>
          </div>
          <button onClick={onClose} className="text-slate-500">✕</button>
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 border p-3 text-sm break-all">{url}</div>
        <div className="mt-4 flex gap-2">
          <button onClick={share} className="h-10 px-4 rounded-lg bg-blue-600 text-white font-semibold inline-flex items-center gap-2"><Send size={15} /> Share / Copy Link</button>
          <button onClick={onClose} className="h-10 px-4 rounded-lg border font-semibold">Close</button>
        </div>
        {(done || message) && <div className="mt-3 text-sm text-emerald-700">{message || 'Bill shared successfully.'}</div>}
      </div>
    </div>
  );
}

function PaymentBox({ invoice, onDone }) {
  const [amount, setAmount] = useState(invoice.outstanding ?? 0);
  const [method, setMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => setAmount(invoice.outstanding ?? 0), [invoice.outstanding]);

  const submit = async (e) => {
    e.preventDefault();
    if (!(Number(amount) > 0)) return;
    try {
      setLoading(true);
      await createPayment({
        invoice_id: invoice.id,
        customer_id: invoice.customer_id ?? invoice.customerId,
        amount: Number(amount),
        method,
        reference: reference || undefined,
        idempotency_key: `HFL-${invoice.id}-${Date.now()}`,
      });
      await onDone();
      setReference('');
    } catch (error) {
      alert(error.message || 'Unable to record payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-2 mb-3"><Wallet size={18} className="text-blue-600" /><h3 className="font-bold">Receive Payment</h3></div>
      <div className="grid md:grid-cols-3 gap-3">
        <label className="block"><span className="text-xs font-semibold text-slate-600">Paid Amount</span><input required type="number" min="0.01" max={invoice.outstanding} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full h-10 rounded-lg border px-3" /></label>
        <label className="block"><span className="text-xs font-semibold text-slate-600">Payment Method</span><select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 w-full h-10 rounded-lg border px-3"><option>Cash</option><option>Bank Transfer</option><option>ABA</option><option>ACLEDA</option><option>Other</option></select></label>
        <label className="block"><span className="text-xs font-semibold text-slate-600">Reference</span><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction / receipt" className="mt-1 w-full h-10 rounded-lg border px-3" /></label>
      </div>
      <div className="mt-3 flex justify-end"><button disabled={loading || !(Number(invoice.outstanding) > 0)} className="h-10 px-4 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-40">{loading ? 'Saving...' : 'Save Payment'}</button></div>
    </form>
  );
}

export default function InvoiceBillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await getInvoice(id);
      setInvoice(data);
      const snap = data?.pricing_snapshot || {};
      const meta = data?.meta || {};
      setForm({
        final_cbm: snap.final_cbm ?? meta.final_cbm ?? data?.items?.find((x) => x.type === 'shipping')?.cbm ?? '',
        final_weight: snap.final_weight ?? meta.final_weight ?? data?.items?.find((x) => x.type === 'shipping')?.weight ?? 0,
        pricing_type: snap.pricing_type ?? meta.pricing_type ?? 'GC',
        rate: snap.rate ?? meta.rate ?? data?.items?.find((x) => x.type === 'shipping')?.unit_price ?? '',
        delivery_fee: snap.delivery_fee ?? meta.delivery_fee ?? data?.items?.find((x) => x.description === 'Delivery Fee')?.amount ?? 0,
        handling_fee: snap.handling_fee ?? meta.handling_fee ?? data?.items?.find((x) => x.description === 'Handling Fee')?.amount ?? 0,
        warehouse_fee: snap.warehouse_fee ?? meta.warehouse_fee ?? data?.items?.find((x) => x.description === 'Warehouse Fee')?.amount ?? 0,
        other_fee: snap.other_fee ?? meta.other_fee ?? data?.items?.find((x) => x.description === 'Other Fee')?.amount ?? 0,
        discount: data?.discount ?? snap.discount ?? meta.discount ?? 0,
        due_date: data?.due_date ?? '',
      });
    } catch (error) {
      setMessage(error.message || 'Unable to load bill.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const preview = useMemo(() => {
    if (!form) return null;
    const cbm = Number(form.final_cbm || 0);
    const weight = Number(form.final_weight || 0);
    const rate = Number(form.rate || 0);
    const rateType = String(invoice?.pricing_snapshot?.rate_type || 'CBM').toUpperCase();
    const minimumCbm = Number(invoice?.pricing_snapshot?.minimum_cbm || 0);
    const chargeable = rateType === 'KG' ? weight : Math.max(cbm, minimumCbm);
    const shipping = chargeable * rate;
    const fees = Number(form.delivery_fee || 0) + Number(form.handling_fee || 0) + Number(form.warehouse_fee || 0) + Number(form.other_fee || 0);
    const discount = Math.min(shipping + fees, Number(form.discount || 0));
    const total = Math.max(0, shipping + fees - discount);
    const paid = Number(invoice?.paid_amount ?? 0);
    return { shipping, fees, discount, total, paid, outstanding: Math.max(0, total - paid) };
  }, [form, invoice]);

  const save = async () => {
    try {
      setSaving(true);
      setMessage('');
      const updated = await updateInvoiceBilling(id, {
        final_cbm: Number(form.final_cbm),
        final_weight: Number(form.final_weight || 0),
        pricing_type: form.pricing_type,
        rate: Number(form.rate),
        delivery_fee: Number(form.delivery_fee || 0),
        handling_fee: Number(form.handling_fee || 0),
        warehouse_fee: Number(form.warehouse_fee || 0),
        other_fee: Number(form.other_fee || 0),
        discount: Number(form.discount || 0),
        due_date: form.due_date || null,
      });
      setInvoice(updated);
      setMessage('Billing changes saved successfully.');
      await load();
    } catch (error) {
      const details = error?.errors ? Object.values(error.errors).flat().join(' ') : '';
      setMessage(details || error.message || 'Unable to save billing changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form || !invoice) return <div className="p-6 text-sm text-slate-500">Loading Bill...</div>;

  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
  const meta = invoice.meta || {};
  const customerId = invoice.customer_id ?? invoice.customerId;
  const customerName = invoice.customer_name ?? invoice.customerName;
  const shipping = items.find((x) => x.type === 'shipping') || {};
  const grand = Number(invoice.grand_total ?? 0);
  const paid = Number(invoice.paid_amount ?? 0);
  const outstanding = Number(invoice.outstanding ?? 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/accounting/sales-invoice')} className="h-10 w-10 rounded-lg border bg-white inline-flex items-center justify-center"><ArrowLeft size={17} /></button>
          <div><h1 className="text-2xl font-bold">Bill Detail</h1><p className="text-sm text-slate-500">{invoice.invoice_no ?? invoice.invoiceNo} · Customer → Invoice → Payment → Receipt</p>{String(invoice.status).toLowerCase()==='draft'&&<div className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Open Bill · Current rate required</div>}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate(`/accounting/sales-invoice/${invoice.id}`)} className="h-10 px-4 rounded-lg border bg-white inline-flex items-center gap-2"><Printer size={16} /> Print Bill</button>
          <button onClick={() => setSendOpen(true)} className="h-10 px-4 rounded-lg border bg-white inline-flex items-center gap-2"><Send size={16} /> Send Bill</button>
          <button onClick={save} disabled={saving} className="h-10 px-4 rounded-lg bg-blue-600 text-white font-semibold inline-flex items-center gap-2 disabled:opacity-50"><Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>

      {message && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}

      <section className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-bold mb-4">Customer Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm"><div><div className="text-xs text-slate-500">Customer Name</div><div className="font-semibold">{customerName || '—'}</div></div><div><div className="text-xs text-slate-500">Customer ID</div><div className="font-semibold">{customerId || '—'}</div></div><div><div className="text-xs text-slate-500">Phone</div><div>{meta.customer_phone || '—'}</div></div><div><div className="text-xs text-slate-500">Bill Date</div><div>{meta.bill_date || invoice.created_at?.slice(0, 10) || '—'}</div></div></div>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-bold mb-4">Package Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm"><div><div className="text-xs text-slate-500">China Tracking / Waybill</div><div className="font-semibold">{shipping.china_waybill_number || shipping.tracking_number || '—'}</div></div><div><div className="text-xs text-slate-500">HFL Package Code</div><div className="font-semibold">{shipping.hfl_package_code || '—'}</div></div><div><div className="text-xs text-slate-500">Package ID</div><div>{shipping.package_number || meta.package_id || '—'}</div></div><div><div className="text-xs text-slate-500">Origin → Destination</div><div>{meta.origin || '—'} → {meta.destination || '—'}</div></div></div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-2 mb-4"><Calculator size={18} className="text-blue-600" /><div><h2 className="font-bold">Billing Details</h2><p className="text-xs text-slate-500">Edit the final billing values. The server recalculates the official invoice total.</p></div></div>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Final CBM" value={form.final_cbm} onChange={(v) => setForm({ ...form, final_cbm: v })} step="0.0001" />
          <Field label="Final Weight (KG)" value={form.final_weight} onChange={(v) => setForm({ ...form, final_weight: v })} />
          <label className="block"><span className="text-xs font-semibold text-slate-600">Pricing Type</span><select value={form.pricing_type} onChange={(e) => setForm({ ...form, pricing_type: e.target.value })} className="mt-1 w-full h-10 rounded-lg border px-3"><option value="GC">GC</option><option value="SC">SC</option></select></label>
          <Field label="Current Rate / CBM *" value={form.rate} onChange={(v) => setForm({ ...form, rate: v })} /><div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Logistics rates are variable. Enter the actual rate agreed for this shipment now; this rate is saved with this invoice and will not change when future rates change.</div>
          <Field label="Delivery Fee" value={form.delivery_fee} onChange={(v) => setForm({ ...form, delivery_fee: v })} />
          <Field label="Handling Fee" value={form.handling_fee} onChange={(v) => setForm({ ...form, handling_fee: v })} />
          <Field label="Warehouse Fee" value={form.warehouse_fee} onChange={(v) => setForm({ ...form, warehouse_fee: v })} />
          <Field label="Other Fee" value={form.other_fee} onChange={(v) => setForm({ ...form, other_fee: v })} />
          <Field label="Discount" value={form.discount} onChange={(v) => setForm({ ...form, discount: v })} />
          <label className="block"><span className="text-xs font-semibold text-slate-600">Due Date</span><input type="date" value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="mt-1 w-full h-10 rounded-lg border px-3" /></label>
        </div>
        <div className="mt-5 grid md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-slate-50 border p-4"><div className="text-xs text-slate-500">Shipping Cost</div><div className="text-lg font-bold">{money(preview.shipping)}</div></div>
          <div className="rounded-xl bg-slate-50 border p-4"><div className="text-xs text-slate-500">Fees</div><div className="text-lg font-bold">{money(preview.fees)}</div></div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4"><div className="text-xs text-blue-700">New Grand Total</div><div className="text-lg font-bold text-blue-800">{money(preview.total)}</div></div>
          <div className="rounded-xl bg-orange-50 border border-orange-100 p-4"><div className="text-xs text-orange-700">New Outstanding</div><div className="text-lg font-bold text-orange-800">{money(preview.outstanding)}</div></div>
        </div>
        <div className="mt-4 flex justify-end"><button onClick={save} disabled={saving} className="h-10 px-5 rounded-lg bg-blue-600 text-white font-semibold inline-flex items-center gap-2 disabled:opacity-50"><Save size={16} /> {saving ? 'Saving...' : 'Save Billing Changes'}</button></div>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-5"><div className="text-xs text-slate-500">Grand Total</div><div className="text-2xl font-bold mt-1">{money(grand)}</div></div>
        <div className="rounded-xl border bg-white p-5"><div className="text-xs text-slate-500">Paid</div><div className="text-2xl font-bold mt-1 text-emerald-600">{money(paid)}</div></div>
        <div className="rounded-xl border bg-white p-5"><div className="text-xs text-slate-500">Outstanding</div><div className="text-2xl font-bold mt-1 text-orange-600">{money(outstanding)}</div><div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold"><CheckCircle2 size={14} className={outstanding === 0 ? 'text-emerald-600' : 'text-orange-500'} /> {invoice.status}</div></div>
      </section>

      {outstanding > 0 && <PaymentBox invoice={invoice} onDone={load} />}

      <section className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-2 mb-4"><History size={18} className="text-blue-600" /><h2 className="font-bold">Payment History</h2></div>
        {payments.length === 0 ? <div className="text-sm text-slate-500">No payment recorded yet.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500 border-b"><th className="p-2">Receipt</th><th className="p-2">Date</th><th className="p-2">Method</th><th className="p-2">Reference</th><th className="p-2 text-right">Amount</th></tr></thead><tbody>{payments.map((p) => <tr key={p.id} className="border-b last:border-0"><td className="p-2 font-semibold">{p.receipt_no || '—'}</td><td className="p-2">{p.paid_at ? formatHflDateTime(p.paid_at) : '—'}</td><td className="p-2">{p.method || '—'}</td><td className="p-2">{p.reference || '—'}</td><td className="p-2 text-right font-semibold text-emerald-600">{money(p.amount)}</td></tr>)}</tbody></table></div>}
      </section>

      <div className="flex flex-wrap justify-end gap-2 pb-4"><button onClick={() => setSendOpen(true)} className="h-10 px-4 rounded-lg border font-semibold inline-flex items-center gap-2"><Send size={15} /> Send Bill</button><button onClick={() => navigate(`/accounting/sales-invoice/${invoice.id}`)} className="h-10 px-4 rounded-lg bg-blue-600 text-white font-semibold inline-flex items-center gap-2"><Printer size={15} /> Print Bill</button></div>

      {sendOpen && <SendBillModal invoice={invoice} onClose={() => setSendOpen(false)} />}
    </div>
  );
}
