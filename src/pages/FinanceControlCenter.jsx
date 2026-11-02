import React, { useEffect, useMemo, useState } from 'react';
import {
  RefreshCw, Wallet, TrendingUp, TrendingDown,
  CircleDollarSign, Receipt, Search, Printer, FileText,
  Download
} from 'lucide-react';

import apiClient from '../api/apiClient.js';
import { listInvoices, listPayments, createPayment } from '../services/billingApi.js';
import { formatHflDateTime } from '../utils/dateTime.js';
import ExpenseDetailModal from '../components/ExpenseDetailModal.jsx';
import CustomerFinanceReport from '../components/CustomerFinanceReport.jsx';
import CashManagement from '../components/CashManagement.jsx';
import FinancialClosing from '../components/FinancialClosing.jsx';
import { downloadXlsx } from '../utils/xlsx.js';

const money = n => `$${Number(n || 0).toFixed(2)}`;

const arr = x =>
  Array.isArray(x) ? x :
  Array.isArray(x?.data) ? x.data :
  Array.isArray(x?.data?.data) ? x.data.data : [];

const invoice = x => ({
  ...x,
  invoiceNo: x.invoice_no ?? x.invoiceNo ?? '',
  customerId: x.customer_id ?? x.customerId ?? '',
  customerName: x.customer_name ?? x.customerName ?? '',
  grandTotal: Number(x.grand_total ?? 0),
  paidAmount: Number(x.paid_amount ?? 0),
  outstanding: Number(x.outstanding ?? 0),
});

function Card({ title, value, icon, sub }) {
  return (
    <div className="bg-white border rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">{title}</div>
        <div className="text-slate-400">{icon}</div>
      </div>
      <div className="text-2xl font-bold mt-2">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function Section({ title, children, action }) {
  return (
    <section className="bg-white border rounded-2xl overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between gap-3">
        <h2 className="font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function PaymentModal({ invoice, onClose, onDone }) {
  const [amount, setAmount] = useState(invoice.outstanding);
  const [method, setMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);

  const [idempotencyKey] = useState(
    () => `HFL-${invoice.id}-${crypto.randomUUID()}`
  );

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await createPayment({
        invoice_id: invoice.id,
        customer_id: invoice.customerId,
        amount: Number(amount),
        method,
        reference: reference || undefined,
        idempotency_key: idempotencyKey,
      });
      onDone();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl p-5 w-full max-w-md">
        <h2 className="text-lg font-bold">Receive Payment</h2>
        <p className="text-sm text-slate-500 mt-1">
          {invoice.invoiceNo} · Outstanding {money(invoice.outstanding)}
        </p>

        <input
          autoFocus
          required
          type="number"
          min="0.01"
          max={invoice.outstanding}
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full h-11 border rounded-lg px-3 mt-4"
        />

        <select
          value={method}
          onChange={e => setMethod(e.target.value)}
          className="w-full h-11 border rounded-lg px-3 mt-3"
        >
          {['Cash', 'Bank Transfer', 'ABA', 'ACLEDA', 'Other'].map(m => (
            <option key={m}>{m}</option>
          ))}
        </select>

        <input
          value={reference}
          onChange={e => setReference(e.target.value)}
          placeholder="Transaction reference"
          className="w-full h-11 border rounded-lg px-3 mt-3"
        />

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-10 border rounded-lg"
          >
            Cancel
          </button>
          <button
            disabled={loading}
            className="px-5 h-10 bg-blue-600 text-white rounded-lg font-semibold"
          >
            {loading ? 'Saving...' : 'Confirm Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ExpenseModal({ onClose, onDone }) {
  const [form, setForm] = useState({
    expense_type: 'Operating',
    category: 'China Freight',
    description: '',
    vendor: '',
    amount: '',
    currency: 'USD',
    payment_method: 'Cash',
    payment_reference: '',
    expense_date: new Date().toISOString().slice(0, 10),
    status: 'Paid',
    shipment_id: '',
    container_id: '',
    package_id: '',
    reference: '',
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/expenses', {
        ...form,
        amount: Number(form.amount),
        shipment_id: form.shipment_id || null,
        container_id: form.container_id || null,
        package_id: form.package_id || null,
      });
      onDone();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'mt-1 w-full h-10 border rounded-lg px-3';

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/40 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[95vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-bold">Record Expense</h2>
            <p className="text-xs text-slate-500">
              Track company cost and link it to a shipment, container or package.
            </p>
          </div>
          <button type="button" onClick={onClose}>✕</button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 p-5">
          <label className="text-xs font-semibold">
            Expense Type
            <select
              value={form.expense_type}
              onChange={e => {
                const v = e.target.value;
                setForm(f => ({
                  ...f,
                  expense_type: v,
                  category: v === 'Delivery Cost'
                    ? 'Tuk Tuk'
                    : ['Tuk Tuk', 'VET', 'Grab', 'Rental Van', 'Motorbike'].includes(f.category)
                      ? 'China Freight'
                      : f.category,
                }));
              }}
              className={inputClass}
            >
              {[
                'Operating', 'Logistics Cost', 'Warehouse Cost',
                'Delivery Cost', 'Administrative', 'Other'
              ].map(v => <option key={v}>{v}</option>)}
            </select>
          </label>

          <label className="text-xs font-semibold">
            {form.expense_type === 'Delivery Cost' ? 'Transport' : 'Category'}
            {form.expense_type === 'Delivery Cost' ? (
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className={inputClass}
              >
                {['Tuk Tuk', 'VET', 'Grab', 'Rental Van', 'Motorbike', 'Other'].map(v => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            ) : (
              <input
                required
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className={inputClass}
                placeholder="China Freight / Customs / Fuel..."
              />
            )}
          </label>

          <label className="text-xs font-semibold md:col-span-2">
            Expense Name / ឈ្មោះចំណាយ
            <input
              required
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="ឧ. បង់ថ្លៃទឹកភ្លើង / ចាក់សាំងឡាន / ទិញសម្ភារៈ"
              className={inputClass}
            />
          </label>

          <label className="text-xs font-semibold">
            Amount
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="text-xs font-semibold">
            Expense Date
            <input
              required
              type="date"
              value={form.expense_date}
              onChange={e => set('expense_date', e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="text-xs font-semibold">
            Status
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              className={inputClass}
            >
              {['Paid', 'Pending', 'Cancelled'].map(v => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold">
            Payment Method
            <select
              value={form.payment_method}
              onChange={e => set('payment_method', e.target.value)}
              className={inputClass}
            >
              {['Cash', 'Bank Transfer', 'ABA', 'ACLEDA', 'Other'].map(v => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold">
            Payment Reference
            <input
              value={form.payment_reference}
              onChange={e => set('payment_reference', e.target.value)}
              className={inputClass}
            />
          </label>

          {[
            ['shipment_id', 'Shipment No. (optional)'],
            ['container_id', 'Container No. (optional)'],
            ['package_id', 'Package Tracking No. (optional)'],
          ].map(([key, label]) => (
            <label key={key} className="text-xs font-semibold">
              {label}
              <input
                type="number"
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                className={inputClass}
              />
            </label>
          ))}

          <label className="text-xs font-semibold md:col-span-2">
            Notes
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="mt-1 w-full min-h-20 border rounded-lg p-3"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t p-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold"
          >
            {saving ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Customer Payment Tracking with Excel Export
function CustomerPaymentTracking() {
  const statuses = ['All', 'Unpaid', 'Partially Paid', 'Paid', 'Overdue'];

  const [status, setStatus] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const getPayload = response => {
    const outer = response?.data ?? response;
    const payload = outer?.data?.current_page != null
      ? outer.data
      : outer;

    if (!payload || !Array.isArray(payload.data)) {
      throw new Error('Unexpected payment tracking API response.');
    }

    return payload;
  };

  const getTrackingPage = async (requestedPage, perPage = 25) => {
    const params = new URLSearchParams({
      status,
      search: searchTerm,
      page: String(requestedPage),
      per_page: String(perPage),
    });

    const response = await apiClient.get(
      `/finance/payment-tracking?${params.toString()}`
    );

    return getPayload(response);
  };

  useEffect(() => {
    let active = true;

    async function fetchTracking() {
      setBusy(true);
      setError('');

      try {
        const payload = await getTrackingPage(page, 25);

        if (active) {
          setRows(payload.data);
          setPagination({
            current_page: Number(payload.current_page || page),
            last_page: Number(payload.last_page || 1),
            total: Number(payload.total || 0),
          });
        }
      } catch (err) {
        if (active) {
          setRows([]);
          setError(err?.message || 'Unable to load payment tracking.');
        }
      } finally {
        if (active) setBusy(false);
      }
    }

    fetchTracking();

    return () => {
      active = false;
    };
  }, [status, searchTerm, page, refreshKey]);

  const changeStatus = value => {
    setStatus(value);
    setPage(1);
  };

  const submitSearch = e => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
    setPage(1);
  };

  const displayList = values => {
    if (Array.isArray(values)) {
      return values.filter(Boolean).join(', ') || '—';
    }
    return values || '—';
  };

  const statusClass = value => {
    switch (value) {
      case 'Paid':
        return 'bg-emerald-100 text-emerald-700';
      case 'Overdue':
        return 'bg-red-100 text-red-700';
      case 'Partially Paid':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const exportExcel = async () => {
    if (busy || exporting) return;

    setExporting(true);
    setError('');

    try {
      const first = await getTrackingPage(1, 100);
      const allRows = [...first.data];
      const lastPage = Number(first.last_page || 1);

      for (let currentPage = 2; currentPage <= lastPage; currentPage++) {
        const result = await getTrackingPage(currentPage, 100);
        allRows.push(...result.data);
      }

      if (!allRows.length) {
        alert('No matching invoices to export.');
        return;
      }

      const headers = [
        'Invoice No.',
        'Customer ID',
        'Customer Name',
        'Tracking Numbers',
        'Container Numbers',
        'Package Count',
        'CBM',
        'Total Invoiced (USD)',
        'Amount Paid (USD)',
        'Outstanding (USD)',
        'Due Date',
        'Payment Status',
      ];

      const excelRows = allRows.map(row => [
        row.invoice_no || '',
        row.customer_id || '',
        row.customer_name || '',
        displayList(row.tracking_numbers) === '—'
          ? ''
          : displayList(row.tracking_numbers),
        displayList(row.container_numbers) === '—'
          ? ''
          : displayList(row.container_numbers),
        Number(row.package_count || 0),
        Number(row.cbm || 0),
        Number(row.grand_total || 0),
        Number(row.paid_amount || 0),
        Number(row.outstanding || 0),
        row.due_date || '',
        row.payment_status || '',
      ]);

      const totalInvoiced = allRows.reduce(
        (sum, row) => sum + Number(row.grand_total || 0), 0
      );
      const totalPaid = allRows.reduce(
        (sum, row) => sum + Number(row.paid_amount || 0), 0
      );
      const totalOutstanding = allRows.reduce(
        (sum, row) => sum + Number(row.outstanding || 0), 0
      );

      const summaryRows = [
        ['HFL LOGISTICS - CUSTOMER PAYMENT TRACKING'],
        ['Payment Status Filter', status],
        ['Search', searchTerm || 'All'],
        ['Export Date', new Date().toLocaleDateString()],
        ['Total Invoices', allRows.length],
        ['Total Invoiced (USD)', Number(totalInvoiced.toFixed(2))],
        ['Total Paid (USD)', Number(totalPaid.toFixed(2))],
        ['Total Outstanding (USD)', Number(totalOutstanding.toFixed(2))],
      ];

      const today = new Date().toISOString().slice(0, 10);
      const safeStatus = status.replace(/\s+/g, '-');

      await downloadXlsx(
        `customer-payment-tracking-${safeStatus}-${today}.xlsx`,
        [
          {
            name: 'Payment Tracking',
            rows: [headers, ...excelRows],
          },
          {
            name: 'Summary',
            rows: summaryRows,
          },
        ]
      );
    } catch (err) {
      setError(err?.message || 'Unable to export payment tracking.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Section
      title="Customer Payment Tracking"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportExcel}
            disabled={busy || exporting}
            className="px-4 py-2 border border-emerald-300 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={16} />
            {exporting ? 'Exporting Excel...' : 'Download Excel'}
          </button>

          <button
            type="button"
            onClick={() => setRefreshKey(v => v + 1)}
            disabled={busy || exporting}
            className="px-3 py-2 border rounded-lg text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {statuses.map(value => (
            <button
              key={value}
              type="button"
              onClick={() => changeStatus(value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
                status === value
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        <form onSubmit={submitSearch} className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={16}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Invoice No. / Customer ID / Customer Name"
              className="w-full h-10 pl-9 pr-3 border rounded-lg text-sm"
            />
          </div>

          <button
            type="submit"
            className="px-5 h-10 bg-blue-600 text-white rounded-lg text-sm font-semibold"
          >
            Search
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              setSearchTerm('');
              setPage(1);
              setRefreshKey(v => v + 1);
            }}
            className="px-4 h-10 border rounded-lg text-sm"
          >
            Clear
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-slate-500">
            Total matching invoices: {pagination.total}
          </div>
          <div className="text-xs text-slate-400">
            Excel exports all matching invoices across all pages.
          </div>
        </div>

        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1450px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                'Invoice No.',
                'Customer',
                'Tracking Numbers',
                'Container Numbers',
                'Packages',
                'CBM',
                'Total Invoiced',
                'Amount Paid',
                'Outstanding',
                'Due Date',
                'Payment Status',
              ].map(header => (
                <th
                  key={header}
                  className="p-3 text-left text-xs font-semibold whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-t hover:bg-slate-50">
                <td className="p-3 font-semibold text-blue-600">
                  {row.invoice_no || '—'}
                </td>

                <td className="p-3">
                  <div className="font-semibold">
                    {row.customer_name || '—'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {row.customer_id || '—'}
                  </div>
                </td>

                <td className="p-3 max-w-[240px] break-words">
                  {displayList(row.tracking_numbers)}
                </td>

                <td className="p-3 max-w-[200px] break-words">
                  {displayList(row.container_numbers)}
                </td>

                <td className="p-3">
                  {row.package_count ?? 0}
                </td>

                <td className="p-3">
                  {Number(row.cbm || 0).toFixed(3)}
                </td>

                <td className="p-3 font-semibold">
                  {money(row.grand_total)}
                </td>

                <td className="p-3 text-emerald-600 font-semibold">
                  {money(row.paid_amount)}
                </td>

                <td className="p-3 text-orange-600 font-semibold">
                  {money(row.outstanding)}
                </td>

                <td className="p-3 whitespace-nowrap">
                  {row.due_date || '—'}
                </td>

                <td className="p-3">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusClass(row.payment_status)}`}
                  >
                    {row.payment_status || '—'}
                  </span>
                </td>
              </tr>
            ))}

            {!busy && !error && rows.length === 0 && (
              <tr>
                <td colSpan={11} className="p-8 text-center text-slate-500">
                  No matching invoices found.
                </td>
              </tr>
            )}

            {busy && (
              <tr>
                <td colSpan={11} className="p-8 text-center text-slate-500">
                  Loading payment tracking...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          Page {pagination.current_page} of {pagination.last_page}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={busy || page >= pagination.last_page}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </Section>
  );
}

export default function FinanceControlCenter() {
  const [tab, setTab] = useState('overview');
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pay, setPay] = useState(null);
  const [statement, setStatement] = useState(null);
  const [showExpense, setShowExpense] = useState(false);
  const [deliverySummary, setDeliverySummary] = useState(null);
  const [expenseDetail, setExpenseDetail] = useState(null);

  const exportExpenses = () => {
    downloadXlsx(
      `expenses-${new Date().toISOString().slice(0, 10)}.xlsx`,
      [{
        name: 'Expenses',
        rows: [
          [
            'Expense No.', 'Date', 'Type', 'Category',
            'Driver / Company', 'Customer', 'Delivery',
            'Tracking', 'Amount', 'Status', 'Payment method',
            'Reference', 'Notes'
          ],
          ...expenses.map(e => [
            e.expense_no,
            String(e.expense_date || '').slice(0, 10),
            e.expense_type,
            e.category,
            e.vendor,
            e.customer_name,
            e.delivery_number,
            e.tracking_number,
            Number(e.amount || 0),
            e.status,
            e.payment_method,
            e.reference,
            [e.description, e.notes].filter(Boolean).join(' | '),
          ]),
        ],
      }]
    );
  };

  const load = async () => {
    setLoading(true);
    try {
      const [d, i, p, e] = await Promise.all([
        apiClient.get('/finance/dashboard'),
        listInvoices({ per_page: 100 }),
        listPayments({ per_page: 100 }),
        apiClient.get('/expenses', { per_page: 100 }),
      ]);

      setDash(d?.data ?? d);
      setInvoices(arr(i).map(invoice));
      setPayments(arr(p));
      setExpenses(arr(e));

      try {
        const ds = await apiClient.get('/expenses/delivery-summary');
        setDeliverySummary(ds?.data ?? ds);
      } catch {
        setDeliverySummary(null);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeExpenseStatus = async (e, status) => {
    if (
      status === 'Cancelled' &&
      !window.confirm(
        `Cancel expense ${e.expense_no}? It will no longer be deducted from profit.`
      )
    ) {
      return;
    }

    try {
      await apiClient.put(`/expenses/${e.id}`, { status });
      await load();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredInvoices = useMemo(
    () => invoices.filter(x =>
      `${x.invoiceNo} ${x.customerId} ${x.customerName}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ),
    [invoices, search]
  );

  const printReceipt = async p => {
    try {
      const r = await apiClient.get(`/payments/${p.id}/receipt`);
      const d = r?.data ?? r;
      const inv = d.invoice || {};
      const no = p.receipt_no || p.payment_no || `Payment ${p.id}`;
      const w = window.open('', '_blank', 'width=800,height=900');

      if (!w) {
        alert('Please allow pop-ups.');
        return;
      }

      const escapeHtml = value =>
        String(value ?? '').replace(/[&<>"']/g, c => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c]);

      const receiptRows = [
        ['Receipt No.', no],
        ['Payment No.', p.payment_no],
        ['Invoice', inv.invoice_no || p.invoice_id],
        ['Customer', inv.customer_name || p.customer_id],
        ['Method', p.method],
        ['Paid At', formatHflDateTime(p.paid_at || p.created_at)],
        ['Amount Received', money(p.amount)],
      ];

      w.document.write(`
        <html>
          <head>
            <title>${escapeHtml(no)}</title>
            <style>
              body { font-family: Arial; padding: 40px; color: #111827; }
              table { width: 100%; border-collapse: collapse; }
              td { padding: 10px; border-bottom: 1px solid #ddd; }
              .r { text-align: right; }
            </style>
          </head>
          <body>
            <h1>HFL LOGISTICS</h1>
            <h2>PAYMENT RECEIPT</h2>
            <table>
              ${receiptRows.map(([label, value]) => `
                <tr>
                  <td>${escapeHtml(label)}</td>
                  <td class="r">${escapeHtml(value)}</td>
                </tr>
              `).join('')}
            </table>
            <p>Thank you for your payment.</p>
          </body>
        </html>
      `);

      w.document.close();
      w.focus();
      w.print();
    } catch (err) {
      alert(err.message);
    }
  };

  const openStatement = async customerId => {
    try {
      const r = await apiClient.get(
        `/finance/customers/${encodeURIComponent(customerId)}/statement`
      );
      setStatement(r?.data ?? r);
    } catch (err) {
      alert(err.message);
    }
  };

  const tabs = [
    ['overview', 'Overview'],
    ['invoices', 'Invoices'],
    ['payments', 'Payments / Receipts'],
    ['paymentTracking', 'Customer Payment Tracking'],
    ['expenses', 'Expenses'],
    ['customerReport', 'Customer Report'],
    ['statement', 'Customer Statement'],
    ['cash', 'Cash Management'],
    ['closing', 'Financial Closing'],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Finance Control Center</h1>
          <p className="text-sm text-slate-500">
            Invoice → Payment → Receipt → Income → Expenses → Outstanding → Statement → Net Profit
          </p>
        </div>

        <button
          onClick={load}
          className="h-10 px-4 border rounded-lg inline-flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Card title="Total Income" value={money(dash?.total_income)} icon={<TrendingUp />} />
        <Card title="Expenses" value={money(dash?.total_expenses)} icon={<TrendingDown />} />
        <Card title="Net Profit" value={money(dash?.net_profit)} icon={<CircleDollarSign />} />
        <Card title="Outstanding" value={money(dash?.outstanding)} icon={<Wallet />} />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card title="Paid Today" value={money(dash?.paid_today)} icon={<Wallet />} />
        <Card title="Invoices" value={dash?.invoice_count ?? invoices.length} icon={<Receipt />} />
        <Card title="Payments" value={dash?.payment_count ?? payments.length} icon={<CircleDollarSign />} />
      </div>

      <div className="flex flex-wrap gap-2 bg-white border rounded-xl p-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              tab === key
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Section title="Recent Payments">
            <div className="divide-y">
              {payments.slice(0, 8).map(p => (
                <div key={p.id} className="p-3 flex justify-between items-center">
                  <div>
                    <div className="font-semibold">
                      {p.receipt_no || p.payment_no}
                    </div>
                    <div className="text-xs text-slate-500">
                      Invoice #{p.invoice_id} · {p.method}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-emerald-600">
                      {money(p.amount)}
                    </div>
                    <button
                      onClick={() => printReceipt(p)}
                      className="text-xs text-blue-600 inline-flex gap-1 items-center"
                    >
                      <Printer size={13} /> Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Recent Expenses">
            <div className="divide-y">
              {expenses.slice(0, 8).map(e => (
                <div key={e.id} className="p-3 flex justify-between">
                  <div>
                    <div className="font-semibold">{e.expense_no}</div>
                    <div className="text-xs text-slate-500">
                      {e.category} · {e.description || '—'}
                    </div>
                  </div>
                  <div className="font-semibold text-red-600">
                    {money(e.amount)}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {tab === 'invoices' && (
        <Section
          title="Invoices"
          action={
            <div className="relative">
              <Search size={15} className="absolute left-3 top-3 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Invoice / Customer ID / Name"
                className="h-9 border rounded-lg pl-9 pr-3 text-sm"
              />
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    'Invoice', 'Customer', 'Total', 'Paid',
                    'Outstanding', 'Status', 'Action'
                  ].map(h => (
                    <th key={h} className="p-3 text-left text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(i => (
                  <tr key={i.id} className="border-t">
                    <td className="p-3 font-semibold text-blue-600">
                      {i.invoiceNo}
                    </td>
                    <td className="p-3">
                      {i.customerName}
                      <div className="text-xs text-slate-400">
                        {i.customerId}
                      </div>
                    </td>
                    <td className="p-3">{money(i.grandTotal)}</td>
                    <td className="p-3 text-emerald-600">
                      {money(i.paidAmount)}
                    </td>
                    <td className="p-3 text-orange-600">
                      {money(i.outstanding)}
                    </td>
                    <td className="p-3">{i.status}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          disabled={!i.outstanding}
                          onClick={() => setPay(i)}
                          className="px-3 py-1 border rounded-lg text-xs disabled:opacity-40"
                        >
                          Receive Payment
                        </button>
                        <button
                          onClick={() => openStatement(i.customerId)}
                          className="p-1 text-blue-600"
                        >
                          <FileText size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {tab === 'payments' && (
        <Section title="Payments & Receipts">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    'Receipt No.', 'Payment No.', 'Invoice',
                    'Customer', 'Amount', 'Method', 'Paid At', 'Action'
                  ].map(h => (
                    <th key={h} className="p-3 text-left text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3 font-semibold text-blue-600">
                      {p.receipt_no || '—'}
                    </td>
                    <td className="p-3">{p.payment_no}</td>
                    <td className="p-3">{p.invoice_id}</td>
                    <td className="p-3">{p.customer_id}</td>
                    <td className="p-3 text-emerald-600 font-semibold">
                      {money(p.amount)}
                    </td>
                    <td className="p-3">{p.method}</td>
                    <td className="p-3">
                      {p.paid_at ? formatHflDateTime(p.paid_at) : '—'}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => printReceipt(p)}
                        className="inline-flex items-center gap-1 text-blue-600"
                      >
                        <Printer size={15} /> Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {tab === 'paymentTracking' && (
        <CustomerPaymentTracking />
      )}

      {tab === 'expenses' && deliverySummary && (
        <div className="bg-white border rounded-2xl p-4">
          <div className="font-bold mb-3">
            Delivery Cost (Tuk Tuk · VET · Grab · Rental Van)
          </div>

          <div className="grid md:grid-cols-4 gap-3 mb-3">
            <Card
              title="Delivery Fee Charged"
              value={money(deliverySummary.delivery_fee_revenue)}
            />
            <Card
              title="Delivery Cost Paid"
              value={money(deliverySummary.delivery_cost_paid)}
            />
            <Card
              title="Delivery Margin"
              value={money(deliverySummary.delivery_margin)}
            />
            <Card
              title="Cost Pending"
              value={money(deliverySummary.delivery_cost_pending)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(deliverySummary.by_category || []).map(c => (
              <span
                key={c.category}
                className="px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold"
              >
                {c.category}: {money(c.amount)} ({c.count})
              </span>
            ))}
            {!(deliverySummary.by_category || []).length && (
              <span className="text-xs text-slate-400">
                No delivery cost recorded yet.
              </span>
            )}
          </div>
        </div>
      )}

      {tab === 'expenses' && (
        <Section
          title="Expenses"
          action={
            <div className="flex gap-2">
              <button
                onClick={exportExpenses}
                className="px-4 py-2 border border-emerald-300 text-emerald-700 rounded-lg text-sm font-semibold"
              >
                Download Excel
              </button>
              <button
                onClick={() => setShowExpense(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
              >
                + Record Expense
              </button>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    'Expense No.', 'Type', 'Category', 'Vendor',
                    'Linked To', 'Amount', 'Date', 'Status', 'Action'
                  ].map(h => (
                    <th key={h} className="p-3 text-left text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr
                    key={e.id}
                    onClick={() => setExpenseDetail(e)}
                    className="border-t hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="p-3 font-semibold">{e.expense_no}</td>
                    <td className="p-3">{e.expense_type || 'Operating'}</td>
                    <td className="p-3">{e.category}</td>
                    <td className="p-3">{e.vendor || '—'}</td>
                    <td className="p-3 text-xs">
                      <div className="font-semibold">
                        {e.customer_name || '—'}
                      </div>
                      <div className="text-slate-400">
                        {e.delivery_number || e.tracking_number || e.reference || ''}
                      </div>
                    </td>
                    <td className={`p-3 font-semibold ${
                      e.status === 'Cancelled'
                        ? 'text-slate-400 line-through'
                        : 'text-red-600'
                    }`}>
                      {money(e.amount)}
                    </td>
                    <td className="p-3">{e.expense_date}</td>
                    <td className="p-3">{e.status}</td>
                    <td
                      className="p-3 whitespace-nowrap"
                      onClick={ev => ev.stopPropagation()}
                    >
                      {e.status === 'Pending' && (
                        <button
                          onClick={() => changeExpenseStatus(e, 'Paid')}
                          className="mr-2 px-2 py-1 rounded border border-emerald-300 text-emerald-700 text-xs font-semibold"
                        >
                          Mark Paid
                        </button>
                      )}
                      {e.status !== 'Cancelled' && (
                        <button
                          onClick={() => changeExpenseStatus(e, 'Cancelled')}
                          className="px-2 py-1 rounded border border-red-300 text-red-600 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {tab === 'statement' && (
        <Section title="Customer Statement">
          <div className="p-4 flex gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Enter Customer ID"
              className="flex-1 h-10 border rounded-lg px-3"
            />
            <button
              onClick={() => openStatement(search.trim())}
              disabled={!search.trim()}
              className="px-5 h-10 bg-blue-600 text-white rounded-lg disabled:opacity-40"
            >
              Open Statement
            </button>
          </div>

          {statement && (
            <div className="p-4 border-t">
              <div className="grid md:grid-cols-3 gap-3 mb-4">
                <Card
                  title="Invoiced"
                  value={money(statement.summary?.invoiced)}
                />
                <Card
                  title="Paid"
                  value={money(statement.summary?.paid)}
                />
                <Card
                  title="Outstanding"
                  value={money(statement.summary?.outstanding)}
                />
              </div>

              <div className="font-bold mb-2">
                Transactions · {statement.customer_id}
              </div>

              <div className="divide-y">
                {[
                  ...(statement.invoices || []).map(x => ({
                    ...x,
                    _type: 'Invoice',
                    _date: x.created_at,
                    _amount: x.grand_total,
                  })),
                  ...(statement.payments || []).map(x => ({
                    ...x,
                    _type: 'Payment',
                    _date: x.paid_at,
                    _amount: x.amount,
                  })),
                ]
                  .sort((a, b) => new Date(b._date) - new Date(a._date))
                  .map((x, n) => (
                    <div
                      key={`${x._type}-${x.id}-${n}`}
                      className="py-3 flex justify-between"
                    >
                      <div>
                        <b>{x._type}</b>
                        <div className="text-xs text-slate-500">
                          {x.invoice_no || x.payment_no || x.receipt_no || ''}
                          {' · '}
                          {x._date ? new Date(x._date).toLocaleString() : ''}
                        </div>
                      </div>
                      <div className={
                        x._type === 'Payment'
                          ? 'text-emerald-600'
                          : 'text-slate-700'
                      }>
                        {money(x._amount)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {tab === 'customerReport' && <CustomerFinanceReport />}
      {tab === 'cash' && <CashManagement />}
      {tab === 'closing' && <FinancialClosing />}

      {expenseDetail && (
        <ExpenseDetailModal
          expense={expenseDetail}
          onClose={() => setExpenseDetail(null)}
          onChanged={load}
        />
      )}

      {pay && (
        <PaymentModal
          invoice={pay}
          onClose={() => setPay(null)}
          onDone={async () => {
            setPay(null);
            await load();
          }}
        />
      )}

      {showExpense && (
        <ExpenseModal
          onClose={() => setShowExpense(false)}
          onDone={async () => {
            setShowExpense(false);
            await load();
          }}
        />
      )}
    </div>
  );
}