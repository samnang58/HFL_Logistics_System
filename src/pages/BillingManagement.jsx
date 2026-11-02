
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Receipt,
  Wallet,
  Plus,
  CheckCircle2,
  X,
  Printer,
  History,
  RefreshCw,
  ExternalLink,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

import apiClient from '../api/apiClient.js';

import {
  listInvoices,
  createInvoice,
  generateInvoiceFromPackage,
  generateCombinedInvoice,
  listPayments,
  createPayment,
  listQuotations,
  createQuotation,
  acceptQuotation,
} from '../services/billingApi.js';

import { listPackages } from '../services/packageApiService.js';
import { formatHflDateTime } from '../utils/dateTime.js';

// ============================================================
// HELPERS
// ============================================================

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

const getArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizeInvoice = (x) => ({
  ...x,
  invoiceNo: x.invoice_no ?? x.invoiceNo ?? '',
  customerId: x.customer_id ?? x.customerId ?? '',
  customerName: x.customer_name ?? x.customerName ?? '',
  grandTotal: Number(x.grand_total ?? x.grandTotal ?? 0),
  paidAmount: Number(x.paid_amount ?? x.paidAmount ?? 0),
  outstanding: Number(x.outstanding ?? 0),
  items: Array.isArray(x.items) ? x.items : [],
});

const normalizeQuotation = (x) => ({
  ...x,
  quotationNo: x.quotation_no ?? x.quotationNo ?? '',
  customerId: x.customer_id ?? x.customerId ?? '',
  customerName: x.customer_name ?? x.customerName ?? '',
  grandTotal: Number(x.grand_total ?? x.grandTotal ?? 0),
});

const isVoidedInvoice = (invoice) =>
  ['void', 'voided', 'cancelled'].includes(
    String(invoice?.status || '').trim().toLowerCase()
  );

const invoiceHasPayment = (invoice) =>
  Number(invoice?.paidAmount ?? invoice?.paid_amount ?? 0) > 0 ||
  ['paid', 'partially paid'].includes(
    String(invoice?.status || '').trim().toLowerCase()
  ) ||
  (
    Array.isArray(invoice?.payments) &&
    invoice.payments.length > 0
  );

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.data?.message ||
  error?.message ||
  fallback;

const getPackageInvoice = (invoices, pkg) => {
  if (!pkg) return null;

  const ids = [
    pkg.id,
    pkg.technicalPackageId,
  ]
    .filter((value) => value !== null && value !== undefined)
    .map(String);

  return (
    invoices.find((invoice) =>
      !isVoidedInvoice(invoice) &&
      invoice.items.some((item) =>
        ids.includes(
          String(item?.package_id ?? item?.packageId ?? '')
        )
      )
    ) || null
  );
};

const BILLABLE_STATUSES = [
  'Cambodia Warehouse',
  'Measurement Completed',
  'Ready for Billing',
];

// Escape values placed in receipt HTML.
const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));

// ============================================================
// REUSABLE COMPONENTS
// ============================================================

function Stat({ icon, title, value }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-center gap-2 text-slate-500 text-xs">
        {icon}
        {title}
      </div>

      <div className="text-2xl font-bold mt-2">
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="bg-white border rounded-xl overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="font-bold">{title}</h2>
      </div>

      {children}
    </section>
  );
}

function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="text-left p-3 text-xs whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length ? (
            rows
          ) : (
            <tr>
              <td
                colSpan={headers.length}
                className="p-10 text-center text-slate-500"
              >
                No records yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// CREATE INVOICE / QUOTATION MODAL
// ============================================================

function Modal({
  title,
  onClose,
  onSave,
  invoice = false,
}) {
  const [saving, setSaving] = useState(false);

  const [f, setF] = useState({
    customerName: '',
    customerId: '',
    description: 'China → Cambodia Logistics Service',
    amount: '',
    discount: 0,
    tax: 0,
  });

  const update = (key, value) => {
    setF((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (saving) return;

    try {
      setSaving(true);
      await onSave(f);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full h-10 border rounded-lg px-3 mt-1 text-sm';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold">
              {title}
            </h2>

            <p className="text-xs text-slate-500">
              Billing record with database-backed
              payment balance tracking.
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
          >
            <X />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label>
            <span className="text-xs">
              Customer Name *
            </span>

            <input
              required
              value={f.customerName}
              onChange={(e) =>
                update('customerName', e.target.value)
              }
              className={inputClass}
            />
          </label>

          <label>
            <span className="text-xs">
              Customer ID *
            </span>

            <input
              required
              value={f.customerId}
              onChange={(e) =>
                update('customerId', e.target.value)
              }
              placeholder="HFL-CUS-000001"
              className={inputClass}
            />
          </label>

          <label className="md:col-span-2">
            <span className="text-xs">
              Description
            </span>

            <input
              value={f.description}
              onChange={(e) =>
                update('description', e.target.value)
              }
              className={inputClass}
            />
          </label>

          <label>
            <span className="text-xs">
              Amount *
            </span>

            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={f.amount}
              onChange={(e) =>
                update('amount', e.target.value)
              }
              className={inputClass}
            />
          </label>

          <label>
            <span className="text-xs">
              Discount
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={f.discount}
              onChange={(e) =>
                update('discount', e.target.value)
              }
              className={inputClass}
            />
          </label>

          <label>
            <span className="text-xs">
              Tax
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={f.tax}
              onChange={(e) =>
                update('tax', e.target.value)
              }
              className={inputClass}
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 h-10 border rounded-lg"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-5 h-10 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {saving
              ? 'Saving...'
              : invoice
                ? 'Create Invoice'
                : 'Create Quotation'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// RECEIVE PAYMENT MODAL
// ============================================================

function PaymentModal({
  invoice,
  onClose,
  onDone,
}) {
  const [amount, setAmount] = useState(
    String(invoice.outstanding)
  );

  const [method, setMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();

    const payment = Number(amount);

    if (
      !Number.isFinite(payment) ||
      payment <= 0 ||
      payment > invoice.outstanding
    ) {
      setError('Please enter a valid payment amount.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createPayment({
        invoice_id: invoice.id,
        customer_id: invoice.customerId,
        amount: payment,
        method,
        reference: reference || undefined,
        idempotency_key:
          `HFL-${invoice.id}-${Date.now()}`,
      });

      await onDone();
    } catch (err) {
      setError(
        getErrorMessage(err, 'Unable to save payment.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl p-5 w-full max-w-md"
      >
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-lg">
              Receive Payment
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              {invoice.invoiceNo}
              {' · '}
              Outstanding {money(invoice.outstanding)}
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>

        <label className="block mt-4 text-xs">
          Amount

          <input
            required
            autoFocus
            type="number"
            min="0.01"
            max={invoice.outstanding}
            step="0.01"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            className="w-full h-11 border rounded-lg px-3 mt-1"
          />
        </label>

        <label className="block mt-3 text-xs">
          Payment Method

          <select
            value={method}
            onChange={(e) =>
              setMethod(e.target.value)
            }
            className="w-full h-11 border rounded-lg px-3 mt-1"
          >
            <option>Cash</option>
            <option>Bank Transfer</option>
            <option>ABA</option>
            <option>ACLEDA</option>
            <option>Other</option>
          </select>
        </label>

        <label className="block mt-3 text-xs">
          Reference

          <input
            value={reference}
            onChange={(e) =>
              setReference(e.target.value)
            }
            className="w-full h-11 border rounded-lg px-3 mt-1"
            placeholder="Transaction / receipt reference"
          />
        </label>

        {error && (
          <div className="mt-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 h-10 border rounded-lg"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-5 h-10 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {loading
              ? 'Saving...'
              : 'Save Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// CUSTOMER STATEMENT + RECEIPT PRINTING
// ============================================================

function StatementModal({
  invoice,
  onClose,
}) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        const data = await listPayments({
          invoice_id: invoice.id,
        });

        if (active) {
          setPayments(getArray(data));
        }
      } catch (err) {
        if (active) {
          setError(
            getErrorMessage(
              err,
              'Unable to load payment history.'
            )
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [invoice.id]);

  const printReceipt = (payment) => {
    const paymentNo =
      payment.payment_no ??
      payment.paymentNo ??
      '';

    const amount = Number(payment.amount || 0);

    const method = payment.method || '';

    const paidAt =
      payment.paid_at ??
      payment.paidAt ??
      payment.created_at ??
      new Date().toISOString();

    const popup = window.open(
      '',
      '_blank',
      'width=800,height=900'
    );

    if (!popup) {
      alert('Please allow pop-ups to print the receipt.');
      return;
    }

    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt ${escapeHtml(paymentNo)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #111827;
            }
            .header {
              border-bottom: 2px solid #111827;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            td {
              padding: 10px 0;
              border-bottom: 1px solid #ddd;
            }
            .right { text-align: right; }
            .total {
              font-size: 20px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>HFL LOGISTICS</h1>
            <h2>PAYMENT RECEIPT</h2>
          </div>

          <table>
            <tr>
              <td><b>Receipt No.</b></td>
              <td class="right">${escapeHtml(paymentNo)}</td>
            </tr>
            <tr>
              <td><b>Invoice No.</b></td>
              <td class="right">${escapeHtml(invoice.invoiceNo)}</td>
            </tr>
            <tr>
              <td><b>Customer</b></td>
              <td class="right">${escapeHtml(invoice.customerName)}</td>
            </tr>
            <tr>
              <td><b>Customer ID</b></td>
              <td class="right">${escapeHtml(invoice.customerId)}</td>
            </tr>
            <tr>
              <td><b>Payment Method</b></td>
              <td class="right">${escapeHtml(method)}</td>
            </tr>
            <tr>
              <td><b>Paid At</b></td>
              <td class="right">
                ${escapeHtml(formatHflDateTime(paidAt))}
              </td>
            </tr>
            <tr>
              <td class="total">Amount Received</td>
              <td class="right total">${money(amount)}</td>
            </tr>
          </table>

          <p><b>Invoice Total:</b> ${money(invoice.grandTotal)}</p>
          <p><b>Total Paid:</b> ${money(invoice.paidAmount)}</p>
          <p><b>Outstanding:</b> ${money(invoice.outstanding)}</p>

          <p>Thank you for your payment.</p>
        </body>
      </html>
    `);

    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between">
          <div>
            <h2 className="text-lg font-bold">
              Customer Statement
            </h2>

            <p className="text-sm text-slate-500">
              {invoice.customerId}
              {' · '}
              {invoice.customerName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
          >
            <X />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 my-5">
          <Stat
            title="Invoice Total"
            value={money(invoice.grandTotal)}
          />

          <Stat
            title="Paid"
            value={money(invoice.paidAmount)}
          />

          <Stat
            title="Outstanding"
            value={money(invoice.outstanding)}
          />
        </div>

        <h3 className="font-bold mb-2">
          Payment History
        </h3>

        {error && (
          <p className="text-sm text-red-600 mb-3">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            Loading payment history...
          </p>
        ) : payments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    'Receipt',
                    'Date',
                    'Amount',
                    'Method',
                    'Action',
                  ].map((header) => (
                    <th
                      key={header}
                      className="p-3 text-left text-xs"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-t"
                  >
                    <td className="p-3 font-semibold">
                      {payment.payment_no ??
                        payment.paymentNo ??
                        '—'}
                    </td>

                    <td className="p-3">
                      {formatHflDateTime(
                        payment.paid_at ??
                        payment.paidAt ??
                        payment.created_at ??
                        payment.createdAt
                      )}
                    </td>

                    <td className="p-3 text-emerald-600">
                      {money(payment.amount)}
                    </td>

                    <td className="p-3">
                      {payment.method}
                    </td>

                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() =>
                          printReceipt(payment)
                        }
                        className="p-1 text-slate-600"
                        title="Print Receipt"
                      >
                        <Printer size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-6 text-center">
            No payment history.
          </p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 h-10 border rounded-lg inline-flex gap-2 items-center"
          >
            <Printer size={16} />
            Print Statement
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 h-10 bg-blue-600 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// NEW: DELETE / VOID BILL CONFIRMATION
// ============================================================

function VoidBillModal({
  invoice,
  reason,
  setReason,
  error,
  saving,
  onClose,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-red-100 flex items-center justify-center">
              <Trash2
                size={21}
                className="text-red-600"
              />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Delete Bill
              </h2>

              <p className="text-xs text-slate-500">
                Cancel incorrect invoice (Void)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 border p-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">
              Invoice No.
            </span>

            <b className="break-all text-right">
              {invoice.invoiceNo || `#${invoice.id}`}
            </b>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-slate-500">
              Customer
            </span>

            <b className="text-right">
              {invoice.customerName || '—'}
            </b>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-slate-500">
              Total
            </span>

            <b>{money(invoice.grandTotal)}</b>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-slate-500">
              Status
            </span>

            <b>{invoice.status || '—'}</b>
          </div>
        </div>

        <label className="block mt-5">
          <span className="text-sm font-semibold">
            Reason for deleting this bill *
          </span>

          <textarea
            value={reason}
            onChange={(event) =>
              setReason(event.target.value)
            }
            rows={4}
            maxLength={1000}
            placeholder="Example: Wrong rate, missing fee, incorrect CBM, duplicate bill..."
            className="w-full mt-2 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-100 resize-y"
          />

          <p className="mt-1 text-xs text-slate-500">
            Minimum 5 characters.
          </p>
        </label>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle
            size={17}
            className="text-amber-600 shrink-0 mt-0.5"
          />

          <p className="text-xs text-amber-800">
            The old bill will be marked VOID and removed
            from the normal invoice list. Its invoice
            number and accounting history will be kept.
            This does not permanently delete database data.
          </p>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-10 border rounded-lg text-sm font-semibold disabled:opacity-40"
          >
            Keep Bill
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={
              saving ||
              reason.trim().length < 5
            }
            className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-semibold inline-flex justify-center items-center gap-2 disabled:opacity-40"
          >
            <Trash2 size={15} />

            {saving
              ? 'Deleting...'
              : 'Confirm Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BILLING MANAGEMENT MAIN PAGE
// ============================================================

export default function BillingManagement({
  view = 'all',
}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Original states
  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(null);
  const [pay, setPay] = useState(null);
  const [statement, setStatement] = useState(null);

  const [packageSearch, setPackageSearch] = useState('');
  const [packageResults, setPackageResults] = useState([]);
  const [searchingPackages, setSearchingPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const [generating, setGenerating] = useState(false);
  const [combineIds, setCombineIds] = useState([]);
  const [combineDelivery, setCombineDelivery] = useState('');

  const [linkedPackage, setLinkedPackage] = useState(null);
  const [linkedInvoiceId, setLinkedInvoiceId] = useState(null);

  // NEW: Void bill states
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidSaving, setVoidSaving] = useState(false);
  const [voidError, setVoidError] = useState('');

  // ----------------------------------------------------------
  // LOAD INVOICES / QUOTATIONS
  // ----------------------------------------------------------

  const load = async () => {
    try {
      setLoading(true);

      const [invoiceResult, quotationResult] =
        await Promise.all([
          listInvoices(),
          listQuotations(),
        ]);

      // Voided invoices should never appear in the
      // normal billing list, even if an API returns them.
      const activeInvoices = getArray(invoiceResult)
        .map(normalizeInvoice)
        .filter((invoice) =>
          !isVoidedInvoice(invoice)
        );

      setInvoices(activeInvoices);

      setQuotations(
        getArray(quotationResult).map(normalizeQuotation)
      );
    } catch (error) {
      alert(
        getErrorMessage(error, 'Unable to load billing data.')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ----------------------------------------------------------
  // LINK FROM CAMBODIA WAREHOUSE
  // ----------------------------------------------------------

  useEffect(() => {
    const packageParam = searchParams.get('package');
    const invoiceParam = searchParams.get('invoice');

    if (packageParam) {
      const value = String(packageParam).trim();

      setPackageSearch(value);
      setLinkedPackage(value);
    }

    if (invoiceParam) {
      setLinkedInvoiceId(
        String(invoiceParam).trim()
      );
    }
  }, [searchParams]);

  useEffect(() => {
    if (!linkedPackage) return;

    const existing = invoices.find((invoice) =>
      invoice.items.some((item) =>
        String(item?.package_id ?? '') === String(linkedPackage) ||
        String(item?.packageId ?? '') === String(linkedPackage)
      )
    );

    if (existing) {
      setLinkedInvoiceId(String(existing.id));
    }
  }, [linkedPackage, invoices]);

  // ----------------------------------------------------------
  // FILTERED LISTS
  // ----------------------------------------------------------

  const quotes =
    view === 'invoice' ? [] : quotations;

  const visibleInvoices =
    view === 'quotation' ? [] : invoices;

  const totalPaid = useMemo(
    () =>
      invoices.reduce(
        (sum, invoice) =>
          sum + Number(invoice.paidAmount || 0),
        0
      ),
    [invoices]
  );

  const totalReceivable = useMemo(
    () =>
      invoices.reduce(
        (sum, invoice) =>
          sum + Number(invoice.outstanding || 0),
        0
      ),
    [invoices]
  );

  // ----------------------------------------------------------
  // CREATE MANUAL INVOICE / QUOTATION
  // ----------------------------------------------------------

  const save = async (form) => {
    try {
      const payload = {
        customer_name: form.customerName,
        customer_id: form.customerId,
        items: [
          {
            description: form.description,
            quantity: 1,
            amount: Number(form.amount),
          },
        ],
        discount: Number(form.discount || 0),
        tax: Number(form.tax || 0),
      };

      if (modal === 'quotation') {
        await createQuotation(payload);
      } else {
        await createInvoice(payload);
      }

      setModal(null);
      await load();
    } catch (error) {
      alert(
        getErrorMessage(
          error,
          'Unable to create billing record.'
        )
      );
    }
  };

  // ----------------------------------------------------------
  // SEARCH PACKAGE FOR BILLING
  // ----------------------------------------------------------

  const searchPackagesForBilling = async () => {
    const query = String(packageSearch || '').trim();

    if (!query) {
      setPackageResults([]);
      setSelectedPackage(null);
      return;
    }

    try {
      setSearchingPackages(true);

      const response = await listPackages({
        search: query,
        perPage: 20,
      });

      const rows = Array.isArray(response)
        ? response
        : getArray(response);

      setPackageResults(rows);
      setSelectedPackage(null);
      setCombineIds([]);

      if (!rows.length) {
        alert(`No package found for "${query}".`);
      }
    } catch (error) {
      alert(
        getErrorMessage(error, 'Unable to search packages.')
      );
    } finally {
      setSearchingPackages(false);
    }
  };

  const selectPackageForBilling = (pkg) => {
    setSelectedPackage(pkg);

    setLinkedPackage(
      String(
        pkg?.id ??
        pkg?.technicalPackageId ??
        pkg?.hflPackageCode ??
        ''
      )
    );

    const existing = getPackageInvoice(invoices, pkg);

    setLinkedInvoiceId(
      existing ? String(existing.id) : null
    );
  };

  // ----------------------------------------------------------
  // CREATE INVOICE FROM PACKAGE
  // ----------------------------------------------------------

  const generateFromSelectedPackage = async () => {
    if (!selectedPackage) {
      alert('Please search and select a package first.');
      return;
    }

    const existing = getPackageInvoice(
      invoices,
      selectedPackage
    );

    if (existing) {
      setLinkedInvoiceId(String(existing.id));

      navigate(
        `/accounting/sales-invoice/${existing.id}/edit`
      );

      return;
    }

    if (
      !BILLABLE_STATUSES.includes(
        selectedPackage.status
      )
    ) {
      alert(
        `This package is "${selectedPackage.status || 'Unknown'}". ` +
        'Receive it at Cambodia Warehouse and complete ' +
        'measurement before opening a bill.'
      );

      return;
    }

    const id = String(
      selectedPackage.id ??
      selectedPackage.technicalPackageId ??
      selectedPackage.hflPackageCode ??
      selectedPackage.trackingNumber ??
      ''
    ).trim();

    if (!id) {
      alert('Selected package has no valid ID.');
      return;
    }

    try {
      setGenerating(true);

      const created = await generateInvoiceFromPackage(id);

      const invoice = created?.data?.id
        ? created.data
        : created;

      const invoiceId = invoice?.id;

      const invoiceNo =
        invoice?.invoice_no ??
        invoice?.invoiceNo ??
        '';

      await load();

      if (invoiceId) {
        setLinkedInvoiceId(String(invoiceId));
        setLinkedPackage(
          String(selectedPackage.id ?? id)
        );

        navigate(
          `/accounting/sales-invoice/${invoiceId}/edit`
        );
      } else {
        alert(
          invoiceNo
            ? `Invoice ${invoiceNo} created.`
            : 'Invoice created successfully.'
        );
      }
    } catch (error) {
      alert(
        getErrorMessage(
          error,
          'Unable to generate invoice.'
        )
      );
    } finally {
      setGenerating(false);
    }
  };

  // ----------------------------------------------------------
  // COMBINE PACKAGES INTO ONE BILL
  // ----------------------------------------------------------

  const toggleCombine = (pkg) => {
    const id = String(pkg.id);

    setCombineIds((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id]
    );
  };

  const createCombinedBill = async () => {
    const chosen = packageResults.filter((pkg) =>
      combineIds.includes(String(pkg.id))
    );

    const customers = new Set(
      chosen.map((pkg) =>
        String(
          pkg.customerId ||
          pkg.customerName ||
          ''
        )
      )
    );

    if (chosen.length < 2) {
      alert('Select at least 2 packages.');
      return;
    }

    if (customers.size > 1) {
      alert(
        'All selected packages must belong to the same customer.'
      );
      return;
    }

    // Never combine a package with an active invoice.
    const alreadyBilled = chosen.find(
      (pkg) => getPackageInvoice(invoices, pkg)
    );

    if (alreadyBilled) {
      alert(
        'One of the selected packages already has an invoice.'
      );
      return;
    }

    const notReady = chosen.find(
      (pkg) => !BILLABLE_STATUSES.includes(pkg.status)
    );

    if (notReady) {
      alert(
        'One of the selected packages is not ready for billing.'
      );
      return;
    }

    try {
      setGenerating(true);

      const options = {};

      if (
        String(combineDelivery).trim() !== ''
      ) {
        options.delivery_fee =
          Number(combineDelivery);
      }

      const response = await generateCombinedInvoice(
        chosen.map((pkg) => pkg.id),
        options
      );

      const invoice = response?.data?.id
        ? response.data
        : response;

      setCombineIds([]);
      setCombineDelivery('');

      await load();

      if (invoice?.id) {
        navigate(
          `/accounting/sales-invoice/${invoice.id}/edit`
        );
      }
    } catch (error) {
      alert(
        getErrorMessage(
          error,
          'Unable to create combined invoice.'
        )
      );
    } finally {
      setGenerating(false);
    }
  };

  // ----------------------------------------------------------
  // OPEN EDIT BILL
  // ----------------------------------------------------------

  const editBill = (invoice) => {
    if (!invoice?.id) return;

    if (isVoidedInvoice(invoice)) {
      alert('A voided bill cannot be edited.');
      return;
    }

    // This route already exists in the original system.
    navigate(
      `/accounting/sales-invoice/${invoice.id}/edit`
    );
  };

  // ----------------------------------------------------------
  // NEW: OPEN DELETE BILL
  // ----------------------------------------------------------

  const openVoidBill = (invoice) => {
    if (!invoice?.id) return;

    if (isVoidedInvoice(invoice)) {
      alert('This invoice is already void.');
      return;
    }

    if (invoiceHasPayment(invoice)) {
      alert(
        'This invoice has payment history. ' +
        'Please resolve the payment with Finance before voiding.'
      );
      return;
    }

    setVoidTarget(invoice);
    setVoidReason('');
    setVoidError('');
  };

  const closeVoidBill = () => {
    if (voidSaving) return;

    setVoidTarget(null);
    setVoidReason('');
    setVoidError('');
  };

  // ----------------------------------------------------------
  // NEW: CONFIRM DELETE / VOID BILL
  // ----------------------------------------------------------

  const confirmVoidBill = async () => {
    if (!voidTarget?.id || voidSaving) return;

    const reason = voidReason.trim();

    if (reason.length < 5) {
      setVoidError(
        'Please enter a reason of at least 5 characters.'
      );
      return;
    }

    setVoidSaving(true);
    setVoidError('');

    try {
      const response = await apiClient.post(
        `/invoices/${voidTarget.id}/void`,
        { reason }
      );

      const result = response?.data ?? response;

      if (result?.success === false) {
        throw new Error(
          result.message ||
          'Unable to void this invoice.'
        );
      }

      const deletedId = String(voidTarget.id);

      // Immediately remove voided bill from active list.
      setInvoices((previous) =>
        previous.filter(
          (invoice) =>
            String(invoice.id) !== deletedId
        )
      );

      // Clear links to the voided invoice.
      setLinkedInvoiceId((previous) =>
        String(previous ?? '') === deletedId
          ? null
          : previous
      );

      setPay(null);
      setStatement(null);

      setVoidTarget(null);
      setVoidReason('');
      setVoidError('');

      // Refresh server-backed invoice data.
      await load();

      // Refresh package status if the backend
      // restored it to Ready for Billing.
      const query = packageSearch.trim();

      if (query) {
        try {
          const packageResponse =
            await listPackages({
              search: query,
              perPage: 20,
            });

          const rows = Array.isArray(packageResponse)
            ? packageResponse
            : getArray(packageResponse);

          setPackageResults(rows);

          if (selectedPackage) {
            const freshPackage = rows.find(
              (pkg) =>
                String(pkg.id) ===
                String(selectedPackage.id)
            );

            if (freshPackage) {
              setSelectedPackage(freshPackage);
            }
          }
        } catch (refreshError) {
          console.error(
            'Unable to refresh packages:',
            refreshError
          );
        }
      }

      alert(
        'Bill voided successfully. ' +
        'The incorrect invoice is removed from the normal list.'
      );
    } catch (error) {
      setVoidError(
        getErrorMessage(
          error,
          'Unable to void this bill.'
        )
      );
    } finally {
      setVoidSaving(false);
    }
  };

  // ----------------------------------------------------------
  // PRINT INVOICE
  // ----------------------------------------------------------

  const printInvoice = (invoice) => {
    if (!invoice?.id || isVoidedInvoice(invoice)) return;

    const url =
      `${window.location.origin}/accounting/sales-invoice/${invoice.id}`;

    const popup = window.open(
      url,
      '_blank',
      'noopener,noreferrer,width=1100,height=900'
    );

    if (!popup) {
      alert(
        'Please allow pop-ups to print the invoice.'
      );
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-5">
      {/* PAGE HEADER */}
      <div className="flex justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {view === 'quotation'
              ? 'Quotations'
              : view === 'invoice'
                ? 'Sales Invoices'
                : 'Billing & Payments'}
          </h1>

          <p className="text-sm text-slate-500">
            Customer → Invoice → Payment →
            Outstanding → Receipt
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="h-10 px-4 border rounded-lg inline-flex gap-2 items-center disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={
              loading ? 'animate-spin' : ''
            }
          />
          Refresh
        </button>
      </div>

      {/* STATISTICS */}
      <div className="grid md:grid-cols-4 gap-3">
        <Stat
          icon={<FileText />}
          title="Quotations"
          value={quotations.length}
        />

        <Stat
          icon={<Receipt />}
          title="Invoices"
          value={invoices.length}
        />

        <Stat
          icon={<Wallet />}
          title="Paid"
          value={money(totalPaid)}
        />

        <Stat
          icon={<Wallet />}
          title="Receivable"
          value={money(totalReceivable)}
        />
      </div>

      {/* LINKED PACKAGE FROM CAMBODIA WAREHOUSE */}
      {linkedPackage && (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Package linked from Cambodia Warehouse
            </div>

            <div className="mt-1 text-sm font-bold text-slate-900">
              Package ID: {linkedPackage}
            </div>

            {linkedInvoiceId ? (
              <div className="text-xs text-emerald-700 font-semibold mt-1">
                Existing invoice linked:{' '}
                {invoices.find(
                  (invoice) =>
                    String(invoice.id) ===
                    String(linkedInvoiceId)
                )?.invoiceNo ?? `#${linkedInvoiceId}`}
              </div>
            ) : (
              <div className="text-xs text-slate-500 mt-1">
                No active invoice is linked.
                Create a new bill when the package
                is ready for billing.
              </div>
            )}
          </div>

          {linkedInvoiceId && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/accounting/sales-invoice/${linkedInvoiceId}/edit`
                )
              }
              className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-2"
            >
              <ExternalLink size={15} />
              Open Bill
            </button>
          )}
        </section>
      )}

      {/* ==================================================== */}
      {/* SEARCH PACKAGE / OPEN BILL                           */}
      {/* ==================================================== */}

      <section className="bg-white border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Search
            size={18}
            className="text-blue-600"
          />

          <div>
            <h2 className="font-bold">
              Find Package / Open Bill
            </h2>

            <p className="text-xs text-slate-500">
              Search a package. Once it reaches Cambodia
              Warehouse and measurement is complete,
              open its bill and enter the current logistics rate.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={packageSearch}
              onChange={(e) =>
                setPackageSearch(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  searchPackagesForBilling();
                }
              }}
              placeholder="Search Package ID / HFL Package / Tracking Number..."
              className="w-full h-11 border rounded-lg pl-10 pr-3"
            />
          </div>

          <button
            type="button"
            onClick={searchPackagesForBilling}
            disabled={searchingPackages}
            className="h-11 px-6 bg-blue-600 text-white rounded-lg font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Search size={16} />

            {searchingPackages
              ? 'Searching...'
              : 'Search'}
          </button>
        </div>

        {/* PACKAGE SEARCH RESULTS */}
        {packageResults.length > 0 && (
          <div className="mt-4 border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b text-xs font-semibold text-slate-600">
              SEARCH RESULTS ({packageResults.length})
            </div>

            <div className="divide-y">
              {packageResults.map((pkg) => {
                const existing =
                  getPackageInvoice(invoices, pkg);

                const isSelected =
                  String(selectedPackage?.id ?? '') ===
                  String(pkg?.id ?? '');

                const isBillable =
                  BILLABLE_STATUSES.includes(pkg.status);

                return (
                  <div
                    key={
                      pkg.id ??
                      pkg.hflPackageCode ??
                      pkg.trackingNumber
                    }
                    className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50'
                        : 'bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        selectPackageForBilling(pkg)
                      }
                      className="text-left flex-1"
                    >
                      <div className="font-semibold text-slate-900">
                        {pkg.hflPackageCode ||
                          pkg.packageId ||
                          `PKG-${pkg.id}`}
                      </div>

                      <div className="text-xs text-slate-500 mt-1">
                        Tracking:{' '}

                        <span className="font-medium text-slate-700">
                          {pkg.trackingNumber ||
                            pkg.chinaWaybillNumber ||
                            '—'}
                        </span>

                        <span className="mx-2">•</span>

                        Customer:{' '}

                        <span className="font-medium text-slate-700">
                          {pkg.customerName ||
                            pkg.customerId ||
                            '—'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 mt-1">
                        CBM:{' '}
                        {Number(
                          pkg.totalCbm || 0
                        ).toFixed(4)}

                        <span className="mx-2">•</span>

                        Status: {pkg.status || '—'}
                      </div>
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      {!existing && isBillable && (
                        <label className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={combineIds.includes(
                              String(pkg.id)
                            )}
                            onChange={() =>
                              toggleCombine(pkg)
                            }
                          />
                          One bill
                        </label>
                      )}

                      {existing ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              editBill(existing)
                            }
                            className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-2"
                          >
                            <Pencil size={15} />
                            Edit Bill
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openVoidBill(existing)
                            }
                            disabled={invoiceHasPayment(existing)}
                            title={
                              invoiceHasPayment(existing)
                                ? 'This bill has payment history'
                                : 'Delete incorrect bill'
                            }
                            className="h-10 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-40"
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                        </>
                      ) : isBillable ? (
                        <button
                          type="button"
                          disabled={generating}
                          onClick={async () => {
                            try {
                              setGenerating(true);

                              const response =
                                await generateInvoiceFromPackage(
                                  pkg.id
                                );

                              const invoice =
                                response?.data?.id
                                  ? response.data
                                  : response;

                              await load();

                              if (invoice?.id) {
                                navigate(
                                  `/accounting/sales-invoice/${invoice.id}/edit`
                                );
                              }
                            } catch (error) {
                              alert(
                                getErrorMessage(
                                  error,
                                  'Unable to create invoice.'
                                )
                              );
                            } finally {
                              setGenerating(false);
                            }
                          }}
                          className="h-10 px-4 rounded-lg bg-amber-500 text-white text-sm font-semibold disabled:opacity-50"
                        >
                          {generating
                            ? 'Creating...'
                            : 'Create Bill'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Not ready for billing
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* COMBINED BILL */}
        {combineIds.length >= 2 && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                One Bill for {combineIds.length} packages
              </div>

              <div className="text-xs text-slate-600 mt-1">
                Each tracking is priced with its own rate
                (origin / GC-SC). Delivery fee is charged once.
              </div>
            </div>

            <div className="flex items-end gap-2">
              <label className="text-xs font-semibold text-slate-600">
                Delivery fee (once)

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={combineDelivery}
                  onChange={(e) =>
                    setCombineDelivery(e.target.value)
                  }
                  placeholder="default"
                  className="mt-1 block h-10 w-32 rounded-lg border px-3 text-sm"
                />
              </label>

              <button
                type="button"
                disabled={generating}
                onClick={createCombinedBill}
                className="h-10 px-5 rounded-lg bg-amber-500 text-white font-semibold disabled:opacity-50"
              >
                {generating
                  ? 'Creating...'
                  : `Create ONE Bill (${combineIds.length})`}
              </button>
            </div>
          </div>
        )}

        {/* SELECTED PACKAGE */}
        {selectedPackage && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Selected Package
              </div>

              <div className="mt-1 font-bold text-slate-900">
                {selectedPackage.hflPackageCode ||
                  selectedPackage.packageId ||
                  `PKG-${selectedPackage.id}`}
              </div>

              <div className="text-xs text-slate-600 mt-1">
                Tracking:{' '}
                {selectedPackage.trackingNumber ||
                  selectedPackage.chinaWaybillNumber ||
                  '—'}
              </div>
            </div>

            {linkedInvoiceId &&
            invoices.some(
              (invoice) =>
                String(invoice.id) ===
                String(linkedInvoiceId)
            ) ? (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/accounting/sales-invoice/${linkedInvoiceId}/edit`
                  )
                }
                className="h-10 px-5 rounded-lg bg-blue-600 text-white font-semibold inline-flex items-center gap-2"
              >
                <Pencil size={15} />
                Edit Bill
              </button>
            ) : BILLABLE_STATUSES.includes(
                selectedPackage.status
              ) ? (
              <button
                type="button"
                onClick={generateFromSelectedPackage}
                disabled={generating}
                className="h-10 px-5 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
              >
                {generating
                  ? 'Creating Invoice...'
                  : 'Create Invoice'}
              </button>
            ) : (
              <div className="flex flex-col md:items-end gap-2">
                <div className="text-xs font-semibold text-amber-700">
                  Status:{' '}
                  {selectedPackage.status || 'Unknown'}
                  {' — '}
                  Cannot be billed yet.
                  Receive it at Cambodia Warehouse
                  and complete measurement first.
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate('/cambodia-warehouse')
                  }
                  className="h-10 px-5 rounded-lg bg-amber-500 text-white font-semibold"
                >
                  Go to Cambodia Warehouse
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ==================================================== */}
      {/* QUOTATION LIST                                       */}
      {/* ==================================================== */}

      {view !== 'invoice' && (
        <Section title="Quotation List">
          <div className="flex justify-end p-4 border-b">
            <button
              type="button"
              onClick={() =>
                setModal('quotation')
              }
              className="h-10 px-4 bg-blue-600 text-white rounded-lg font-semibold inline-flex gap-2 items-center"
            >
              <Plus size={16} />
              New Quotation
            </button>
          </div>

          <Table
            headers={[
              'Quotation',
              'Customer',
              'Total',
              'Status',
              'Action',
            ]}
            rows={quotes.map((quotation) => (
              <tr
                key={quotation.id}
                className="border-t"
              >
                <td className="p-3 font-semibold text-blue-600">
                  {quotation.quotationNo}
                </td>

                <td className="p-3">
                  {quotation.customerName}
                </td>

                <td className="p-3 font-semibold">
                  {money(quotation.grandTotal)}
                </td>

                <td className="p-3">
                  {quotation.status}
                </td>

                <td className="p-3">
                  <button
                    type="button"
                    disabled={
                      quotation.status === 'Accepted'
                    }
                    onClick={async () => {
                      try {
                        await acceptQuotation(
                          quotation.id
                        );

                        await load();
                      } catch (error) {
                        alert(
                          getErrorMessage(
                            error,
                            'Unable to accept quotation.'
                          )
                        );
                      }
                    }}
                    className="text-emerald-600 disabled:opacity-40"
                    title="Accept Quotation"
                  >
                    <CheckCircle2 size={17} />
                  </button>
                </td>
              </tr>
            ))}
          />
        </Section>
      )}

      {/* ==================================================== */}
      {/* INVOICE & PAYMENT LIST                               */}
      {/* ==================================================== */}

      {view !== 'quotation' && (
        <Section title="Invoice & Payment List">
          <Table
            headers={[
              'Invoice',
              'Customer',
              'Grand Total',
              'Paid',
              'Outstanding',
              'Status',
              'Action',
            ]}
            rows={visibleInvoices.map((invoice) => (
              <tr
                key={invoice.id}
                className={`border-t ${
                  linkedInvoiceId &&
                  String(invoice.id) ===
                    String(linkedInvoiceId)
                    ? 'bg-blue-50 ring-1 ring-inset ring-blue-200'
                    : ''
                }`}
              >
                <td className="p-3 font-semibold text-blue-600">
                  {invoice.invoiceNo}
                </td>

                <td className="p-3">
                  {invoice.customerName}

                  <div className="text-xs text-slate-400">
                    {invoice.customerId}
                  </div>
                </td>

                <td className="p-3">
                  {money(invoice.grandTotal)}
                </td>

                <td className="p-3 text-emerald-600">
                  {money(invoice.paidAmount)}
                </td>

                <td className="p-3 text-orange-600">
                  {money(invoice.outstanding)}
                </td>

                <td className="p-3">
                  {invoice.status}
                </td>

                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {/* EDIT BILL */}
                    <button
                      type="button"
                      onClick={() =>
                        editBill(invoice)
                      }
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-blue-700"
                    >
                      <Pencil size={14} />
                      Edit Bill
                    </button>

                    {/* DELETE BILL (VOID) */}
                    <button
                      type="button"
                      disabled={invoiceHasPayment(invoice)}
                      onClick={() =>
                        openVoidBill(invoice)
                      }
                      title={
                        invoiceHasPayment(invoice)
                          ? 'Payment exists. Resolve it with Finance first.'
                          : 'Delete incorrect invoice (Void)'
                      }
                      className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold inline-flex items-center gap-1 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={14} />
                      Delete Bill
                    </button>

                    {/* RECEIVE PAYMENT */}
                    <button
                      type="button"
                      disabled={
                        Number(invoice.outstanding) <= 0
                      }
                      onClick={() =>
                        setPay(invoice)
                      }
                      className="px-3 py-1.5 border rounded-lg text-xs font-semibold disabled:opacity-40"
                    >
                      Receive Payment
                    </button>

                    {/* STATEMENT */}
                    <button
                      type="button"
                      title="Statement"
                      onClick={() =>
                        setStatement(invoice)
                      }
                      className="p-1.5 text-blue-600 border rounded-lg"
                    >
                      <History size={16} />
                    </button>

                    {/* PRINT */}
                    <button
                      type="button"
                      title={
                        String(
                          invoice.status
                        ).toLowerCase() === 'draft'
                          ? 'Enter the current logistics rate before printing'
                          : 'Print / Download PDF'
                      }
                      disabled={
                        String(
                          invoice.status
                        ).toLowerCase() === 'draft'
                      }
                      onClick={() =>
                        printInvoice(invoice)
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Printer size={15} />

                      {String(
                        invoice.status
                      ).toLowerCase() === 'draft'
                        ? 'Rate Required'
                        : 'Print'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          />
        </Section>
      )}

      {/* ==================================================== */}
      {/* MODALS                                               */}
      {/* ==================================================== */}

      {modal && (
        <Modal
          title={
            modal === 'quotation'
              ? 'New Quotation'
              : 'New Invoice'
          }
          invoice={modal === 'invoice'}
          onClose={() => setModal(null)}
          onSave={save}
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

      {statement && (
        <StatementModal
          invoice={statement}
          onClose={() => setStatement(null)}
        />
      )}

      {/* NEW DELETE / VOID BILL POPUP */}
      {voidTarget && (
        <VoidBillModal
          invoice={voidTarget}
          reason={voidReason}
          setReason={setVoidReason}
          error={voidError}
          saving={voidSaving}
          onClose={closeVoidBill}
          onConfirm={confirmVoidBill}
        />
      )}
    </div>
  );
}
