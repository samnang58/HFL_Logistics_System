import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient.js';
import { downloadXlsx } from '../utils/xlsx.js';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const num = (n) => Math.round(Number(n || 0) * 100) / 100;
const unwrap = (res) => res?.data ?? res;
const today = () => new Date().toISOString().slice(0, 10);

function summaryRows(rows, totals) {
  const header = ['Customer ID', 'Customer', 'Invoices', 'Invoiced', 'Paid by customer', 'Outstanding', 'Cost paid', 'Cost pending', 'Net (Paid - Cost)'];
  const body = rows.map((r) => [r.customer_id, r.customer_name, r.invoices, num(r.invoiced), num(r.paid), num(r.outstanding), num(r.cost_paid), num(r.cost_pending), num(r.net)]);
  const total = ['', 'TOTAL', '', num(totals.invoiced), num(totals.paid), num(totals.outstanding), num(totals.cost_paid), num(totals.cost_pending), num(totals.net)];
  return [header, ...body, total];
}

function detailSheets(d, r) {
  const summary = [
    ['Customer report', ''],
    ['Customer ID', d.customer?.customer_id],
    ['Customer', d.customer?.customer_name],
    ['Invoiced', num(r.invoiced)],
    ['Paid by customer', num(r.paid)],
    ['Outstanding', num(r.outstanding)],
    ['Cost paid', num(r.cost_paid)],
    ['Cost pending', num(r.cost_pending)],
    ['Net (Paid - Cost)', num(r.net)],
  ];
  const payments = [['Payment No.', 'Invoice', 'Amount', 'Method', 'Reference', 'Paid at'],
    ...(d.payments || []).map((p) => [p.payment_no, p.invoice_no, num(p.amount), p.method, p.reference, p.paid_at])];
  const invoices = [['Invoice', 'Status', 'Total', 'Paid', 'Outstanding', 'Date'],
    ...(d.invoices || []).map((i) => [i.invoice_no, i.status, num(i.grand_total), num(i.paid_amount), num(i.outstanding), i.date])];
  const expenses = [['Expense No.', 'Delivery', 'Category', 'Driver / Company', 'Amount', 'Status', 'Date', 'Reference'],
    ...(d.expenses || []).map((e) => [e.expense_no, e.delivery_number, e.category, e.vendor, num(e.amount), e.status, e.expense_date, e.reference])];
  return { summary, payments, invoices, expenses };
}

function safeName(text) {
  return String(text || 'customer').replace(/[^\w\-]+/g, '_').slice(0, 40);
}

export default function CustomerFinanceReport() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState({ rows: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [detail, setDetail] = useState(null);

  const params = () => ({ ...(from ? { from } : {}), ...(to ? { to } : {}) });

  const load = async (override) => {
    setLoading(true);
    try {
      setData(unwrap(await apiClient.get('/reports/customer-finance', override || params())) || { rows: [], totals: {} });
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDetail = async (customerId) =>
    unwrap(await apiClient.get('/reports/customer-finance', { ...params(), customer_id: customerId }));

  const openDetail = async (row) => {
    try {
      setDetail({ row, loading: true });
      setDetail({ row, data: await fetchDetail(row.customer_id) });
    } catch (error) {
      alert(error.message);
      setDetail(null);
    }
  };

  const downloadOne = async (row, existing) => {
    try {
      const d = existing || await fetchDetail(row.customer_id);
      const s = detailSheets(d, row);
      downloadXlsx(`customer-${safeName(row.customer_id)}-${today()}.xlsx`, [
        { name: 'Summary', rows: s.summary },
        { name: 'Payments', rows: s.payments },
        { name: 'Invoices', rows: s.invoices },
        { name: 'Costs', rows: s.expenses },
      ]);
    } catch (error) {
      alert(error.message);
    }
  };

  const downloadAll = async () => {
    if (!data.rows.length) return;
    try {
      setExporting(true);
      const sheets = [{ name: 'All customers', rows: summaryRows(data.rows, data.totals) }];
      for (const row of data.rows.slice(0, 60)) {
        const d = await fetchDetail(row.customer_id);
        const s = detailSheets(d, row);
        sheets.push({
          name: `${row.customer_id} ${row.customer_name || ''}`.slice(0, 31),
          rows: [
            ...s.summary, [],
            ['PAYMENTS'], ...s.payments, [],
            ['INVOICES'], ...s.invoices, [],
            ['COSTS'], ...s.expenses,
          ],
        });
      }
      downloadXlsx(`customer-report-${today()}.xlsx`, sheets);
    } catch (error) {
      alert(error.message);
    } finally {
      setExporting(false);
    }
  };

  const t = data.totals || {};
  const input = 'h-10 border rounded-lg px-3 text-sm bg-white';

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-2xl p-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-slate-600">From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${input} mt-1 block`} />
        </label>
        <label className="text-xs font-semibold text-slate-600">To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${input} mt-1 block`} />
        </label>
        <button onClick={() => load()} className="h-10 px-5 rounded-lg bg-blue-600 text-white font-semibold">Show</button>
        <button onClick={() => { setFrom(''); setTo(''); load({}); }} className="h-10 px-4 rounded-lg border">Reset</button>
        <div className="flex-1" />
        <button onClick={downloadAll} disabled={exporting || !data.rows.length}
          className="h-10 px-5 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-40">
          {exporting ? 'Preparing Excel...' : 'Download Excel (all customers)'}
        </button>
      </div>

      <div className="grid md:grid-cols-5 gap-3">
        {[['Invoiced', t.invoiced], ['Paid by customers', t.paid], ['Outstanding', t.outstanding], ['Cost paid', t.cost_paid], ['Net (Paid − Cost)', t.net]].map(([l, v]) => (
          <div key={l} className="bg-white border rounded-2xl p-4">
            <div className="text-xs text-slate-500">{l}</div>
            <div className="text-xl font-bold mt-1">{money(v)}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>{['Customer', 'Invoices', 'Invoiced', 'Paid', 'Outstanding', 'Cost paid', 'Cost pending', 'Net', ''].map((h) => (
                <th key={h} className="p-3 text-left text-xs text-slate-500">{h}</th>))}</tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.customer_id} className="border-t hover:bg-slate-50 cursor-pointer" onClick={() => openDetail(r)}>
                  <td className="p-3"><div className="font-semibold">{r.customer_name}</div><div className="text-xs text-slate-400">{r.customer_id}</div></td>
                  <td className="p-3">{r.invoices}</td>
                  <td className="p-3">{money(r.invoiced)}</td>
                  <td className="p-3 text-emerald-600 font-semibold">{money(r.paid)}</td>
                  <td className="p-3">{money(r.outstanding)}</td>
                  <td className="p-3 text-red-600">{money(r.cost_paid)}</td>
                  <td className="p-3 text-amber-600">{money(r.cost_pending)}</td>
                  <td className={`p-3 font-bold ${r.net < 0 ? 'text-red-600' : ''}`}>{money(r.net)}</td>
                  <td className="p-3 whitespace-nowrap">
                    <button onClick={(e) => { e.stopPropagation(); downloadOne(r); }}
                      className="px-3 py-1 rounded-lg border border-emerald-300 text-emerald-700 text-xs font-semibold">Excel</button>
                  </td>
                </tr>
              ))}
              {!loading && !data.rows.length && (
                <tr><td colSpan="9" className="p-8 text-center text-slate-400">No customer activity for this period.</td></tr>
              )}
              {loading && <tr><td colSpan="9" className="p-8 text-center text-slate-400">Loading...</td></tr>}
            </tbody>
          </table>
        </div>
        {Number(t.unassigned_cost_paid) > 0 && (
          <div className="border-t p-3 text-xs text-amber-700 bg-amber-50">
            {money(t.unassigned_cost_paid)} of paid cost is not linked to any customer (no package / delivery), so it is not in the rows above.
          </div>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-bold">{detail.row.customer_name}</h2>
                <p className="text-xs text-slate-500">{detail.row.customer_id} · Paid {money(detail.row.paid)} · Cost {money(detail.row.cost_paid)} · Net {money(detail.row.net)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadOne(detail.row, detail.data)} disabled={!detail.data}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40">Download Excel</button>
                <button onClick={() => setDetail(null)}>✕</button>
              </div>
            </div>

            {detail.loading && <div className="p-8 text-center text-slate-400">Loading...</div>}

            {detail.data && (
              <div className="p-5 space-y-5">
                {[
                  ['Payments received', ['Payment No.', 'Invoice', 'Amount', 'Method', 'Paid at'], (detail.data.payments || []).map((p) => [p.payment_no, p.invoice_no, money(p.amount), p.method, (p.paid_at || '').slice(0, 16)])],
                  ['Invoices', ['Invoice', 'Status', 'Total', 'Outstanding', 'Date'], (detail.data.invoices || []).map((i) => [i.invoice_no, i.status, money(i.grand_total), money(i.outstanding), i.date])],
                  ['Costs (delivery / other)', ['Expense No.', 'Delivery', 'Category', 'Driver / Company', 'Amount', 'Status'], (detail.data.expenses || []).map((e) => [e.expense_no, e.delivery_number, e.category, e.vendor, money(e.amount), e.status])],
                ].map(([title, head, rows]) => (
                  <div key={title}>
                    <div className="font-bold mb-2">{title}</div>
                    <div className="border rounded-xl overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50"><tr>{head.map((h) => <th key={h} className="p-2 text-left text-xs text-slate-500">{h}</th>)}</tr></thead>
                        <tbody>
                          {rows.map((row, i) => (
                            <tr key={i} className="border-t">{row.map((c, j) => <td key={j} className="p-2">{c || '—'}</td>)}</tr>
                          ))}
                          {!rows.length && <tr><td colSpan={head.length} className="p-3 text-center text-slate-400">None</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
