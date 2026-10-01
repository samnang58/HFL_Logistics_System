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
} from 'lucide-react';

import {
  listInvoices,
  createInvoice,
  generateInvoiceFromPackage, generateCombinedInvoice,
  listPayments,
  createPayment,
  listQuotations,
  createQuotation,
  acceptQuotation,
} from '../services/billingApi.js';
import { listPackages } from '../services/packageApiService.js';
import { formatHflDateTime } from '../utils/dateTime.js';

const money = (n) =>
  `$${Number(n || 0).toFixed(2)}`;

const getArray = (data) => {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

const normalizeInvoice = (x) => ({
  ...x,
  invoiceNo: x.invoice_no ?? x.invoiceNo ?? '',
  customerId: x.customer_id ?? x.customerId ?? '',
  customerName: x.customer_name ?? x.customerName ?? '',
  grandTotal: Number(
    x.grand_total ?? x.grandTotal ?? 0
  ),
  paidAmount: Number(
    x.paid_amount ?? x.paidAmount ?? 0
  ),
  outstanding: Number(
    x.outstanding ?? 0
  ),
  items: Array.isArray(x.items)
    ? x.items
    : [],
});

const normalizeQuotation = (x) => ({
  ...x,
  quotationNo:
    x.quotation_no ??
    x.quotationNo ??
    '',
  customerId:
    x.customer_id ??
    x.customerId ??
    '',
  customerName:
    x.customer_name ??
    x.customerName ??
    '',
  grandTotal: Number(
    x.grand_total ??
    x.grandTotal ??
    0
  ),
});

function Modal({
  title,
  onClose,
  onSave,
  invoice = false,
}) {
  const [f, setF] = useState({
    customerName: '',
    customerId: '',
    description:
      'China → Cambodia Logistics Service',
    amount: '',
    discount: 0,
    tax: 0,
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(f);
        }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-5"
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
                setF({
                  ...f,
                  customerName:
                    e.target.value,
                })
              }
              className="w-full h-10 border rounded-lg px-3"
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
                setF({
                  ...f,
                  customerId:
                    e.target.value,
                })
              }
              className="w-full h-10 border rounded-lg px-3"
              placeholder="HFL-CUS-000001"
            />
          </label>

          <label className="md:col-span-2">
            <span className="text-xs">
              Description
            </span>

            <input
              value={f.description}
              onChange={(e) =>
                setF({
                  ...f,
                  description:
                    e.target.value,
                })
              }
              className="w-full h-10 border rounded-lg px-3"
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
                setF({
                  ...f,
                  amount: e.target.value,
                })
              }
              className="w-full h-10 border rounded-lg px-3"
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
                setF({
                  ...f,
                  discount: e.target.value,
                })
              }
              className="w-full h-10 border rounded-lg px-3"
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
                setF({
                  ...f,
                  tax: e.target.value,
                })
              }
              className="w-full h-10 border rounded-lg px-3"
            />
          </label>

        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t">

          <button
            type="button"
            onClick={onClose}
            className="px-4 h-10 border rounded-lg"
          >
            Cancel
          </button>

          <button
            className="px-5 h-10 bg-blue-600 text-white rounded-lg font-semibold"
          >
            {invoice
              ? 'Create Invoice'
              : 'Create Quotation'}
          </button>

        </div>
      </form>
    </div>
  );
}

function PaymentModal({
  invoice,
  onClose,
  onDone,
}) {
  const [amount, setAmount] =
    useState(invoice.outstanding);

  const [method, setMethod] =
    useState('Cash');

  const [reference, setReference] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const submit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      await createPayment({
        invoice_id: invoice.id,
        customer_id: invoice.customerId,
        amount: Number(amount),
        method,
        reference:
          reference || undefined,
        idempotency_key:
          `HFL-${invoice.id}-${Date.now()}`,
      });

      onDone();

    } catch (error) {
      alert(error.message);
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

        <h2 className="font-bold text-lg">
          Receive Payment
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          {invoice.invoiceNo}
          {' · '}
          Outstanding {money(invoice.outstanding)}
        </p>

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

function StatementModal({
  invoice,
  onClose,
}) {
  const [payments, setPayments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data =
          await listPayments({
            invoice_id: invoice.id,
          });

        if (active) {
          setPayments(
            getArray(data)
          );
        }
      } catch (error) {
        alert(error.message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [invoice.id]);

  const printReceipt = (payment) => {
    const paymentNo =
      payment.payment_no ??
      payment.paymentNo ??
      '';

    const amount =
      Number(payment.amount || 0);

    const method =
      payment.method || '';

    const paidAt =
      payment.paid_at ??
      payment.paidAt ??
      payment.created_at ??
      new Date().toISOString();

    const w = window.open(
      '',
      '_blank',
      'width=800,height=900'
    );

    if (!w) {
      alert(
        'Please allow pop-ups to print the receipt.'
      );
      return;
    }

    w.document.write(`
      <html>
        <head>
          <title>Receipt ${paymentNo}</title>
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
            .right {
              text-align: right;
            }
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
              <td class="right">
                ${paymentNo}
              </td>
            </tr>

            <tr>
              <td><b>Invoice No.</b></td>
              <td class="right">
                ${invoice.invoiceNo}
              </td>
            </tr>

            <tr>
              <td><b>Customer</b></td>
              <td class="right">
                ${invoice.customerName}
              </td>
            </tr>

            <tr>
              <td><b>Customer ID</b></td>
              <td class="right">
                ${invoice.customerId}
              </td>
            </tr>

            <tr>
              <td><b>Payment Method</b></td>
              <td class="right">
                ${method}
              </td>
            </tr>

            <tr>
              <td><b>Paid At</b></td>
              <td class="right">
                ${formatHflDateTime(paidAt)}
              </td>
            </tr>

            <tr>
              <td class="total">
                Amount Received
              </td>
              <td class="right total">
                ${money(amount)}
              </td>
            </tr>
          </table>

          <br />

          <p>
            <b>Invoice Total:</b>
            ${money(invoice.grandTotal)}
          </p>

          <p>
            <b>Total Paid:</b>
            ${money(invoice.paidAmount)}
          </p>

          <p>
            <b>Outstanding:</b>
            ${money(invoice.outstanding)}
          </p>

          <br />

          <p>
            Thank you for your payment.
          </p>

        </body>
      </html>
    `);

    w.document.close();
    w.focus();
    w.print();
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

          <button onClick={onClose}>
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
                  ].map((h) => (
                    <th
                      className="p-3 text-left text-xs"
                      key={h}
                    >
                      {h}
                    </th>
                  ))}
                </tr>

              </thead>

              <tbody>

                {payments.map((p) => (

                  <tr
                    className="border-t"
                    key={p.id}
                  >

                    <td className="p-3 font-semibold">
                      {p.payment_no ??
                        p.paymentNo ??
                        '—'}
                    </td>

                    <td className="p-3">
                      {formatHflDateTime(p.paid_at ?? p.paidAt ?? p.created_at ?? p.createdAt)}
                    </td>

                    <td className="p-3 text-emerald-600">
                      {money(p.amount)}
                    </td>

                    <td className="p-3">
                      {p.method}
                    </td>

                    <td className="p-3">

                      <button
                        onClick={() =>
                          printReceipt(p)
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
            onClick={() => window.print()}
            className="px-4 h-10 border rounded-lg inline-flex gap-2 items-center"
          >
            <Printer size={16} />
            Print Statement
          </button>

          <button
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

export default function BillingManagement({
  view = 'all',
}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [invoices, setInvoices] =
    useState([]);

  const [quotations, setQuotations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [modal, setModal] =
    useState(null);

  const [pay, setPay] =
    useState(null);

  const [statement, setStatement] =
    useState(null);

    const [packageSearch, setPackageSearch] = useState('');
  const [packageResults, setPackageResults] = useState([]);
  const [searchingPackages, setSearchingPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const [generating, setGenerating] = useState(false);
  const [combineIds, setCombineIds] = useState([]);
  const [combineDelivery, setCombineDelivery] = useState('');

  const [linkedPackage, setLinkedPackage] = useState(null);

  const [linkedInvoiceId, setLinkedInvoiceId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);

      const [invoiceResult, quotationResult] =
        await Promise.all([
          listInvoices(),
          listQuotations(),
        ]);

      setInvoices(
        getArray(invoiceResult)
          .map(normalizeInvoice)
      );

      setQuotations(
        getArray(quotationResult)
          .map(normalizeQuotation)
      );

    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Billing & Payment can be opened directly from Cambodia Warehouse.
  // Keep the package/invoice context in the URL and bind it to the real DB invoice.
  useEffect(() => {
    const packageParam = searchParams.get('package');
    const invoiceParam = searchParams.get('invoice');

    if (packageParam) {
      const value = String(packageParam).trim();
      setPackageSearch(value);
      setLinkedPackage(value);
    }

    if (invoiceParam) {
      setLinkedInvoiceId(String(invoiceParam).trim());
    }
  }, [searchParams]);

  // When Billing & Payment is opened from Cambodia Warehouse with a package id,
  // resolve the existing DB invoice automatically. This prevents duplicate
  // invoices and makes the package -> invoice relationship visible.
  useEffect(() => {
    if (!linkedPackage || !invoices.length) return;

    const existing = invoices.find((invoice) =>
      Array.isArray(invoice.items) && invoice.items.some((item) =>
        String(item?.package_id ?? '') === String(linkedPackage) ||
        String(item?.packageId ?? '') === String(linkedPackage)
      )
    );

    if (existing) {
      setLinkedInvoiceId(String(existing.id));
    }
  }, [linkedPackage, invoices]);


  const quotes =
    view === 'invoice'
      ? []
      : quotations;

  const visibleInvoices =
    view === 'quotation'
      ? []
      : invoices;

  const save = async (f) => {
    try {

      const item = {
        customer_name:
          f.customerName,

        customer_id:
          f.customerId,

        items: [
          {
            description:
              f.description,

            quantity: 1,

            amount:
              Number(f.amount),
          },
        ],

        discount:
          Number(f.discount || 0),

        tax:
          Number(f.tax || 0),
      };

      if (modal === 'quotation') {
        await createQuotation(item);
      } else {
        await createInvoice(item);
      }

      setModal(null);
      await load();

    } catch (error) {
      alert(error.message);
    }
  };

  const searchPackagesForBilling = async () => {
    const query = String(packageSearch || '').trim();

    if (!query) {
      setPackageResults([]);
      setSelectedPackage(null);
      return;
    }

    try {
      setSearchingPackages(true);
      const rows = await listPackages({ search: query, perPage: 20 });
      setPackageResults(Array.isArray(rows) ? rows : []);
      setSelectedPackage(null);
      setCombineIds([]);

      if (!rows?.length) {
        alert(`No package found for "${query}".`);
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setSearchingPackages(false);
    }
  };

  const selectPackageForBilling = (pkg) => {
    setSelectedPackage(pkg);
    setLinkedPackage(String(pkg?.id ?? pkg?.technicalPackageId ?? pkg?.hflPackageCode ?? ''));

    const existing = invoices.find((invoice) =>
      Array.isArray(invoice.items) && invoice.items.some((item) =>
        String(item?.package_id ?? '') === String(pkg?.id ?? '') ||
        String(item?.packageId ?? '') === String(pkg?.id ?? '')
      )
    );

    setLinkedInvoiceId(existing ? String(existing.id) : null);
  };

  const generateFromSelectedPackage = async () => {
    if (!selectedPackage) {
      alert('Please search and select a package first.');
      return;
    }

    if (!['Cambodia Warehouse', 'Measurement Completed', 'Ready for Billing'].includes(selectedPackage.status)) {
      alert(`This package is "${selectedPackage.status || 'Unknown'}". Receive it at Cambodia Warehouse and complete measurement before opening a bill.`);
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

    const existing = invoices.find((invoice) =>
      Array.isArray(invoice.items) && invoice.items.some((item) =>
        String(item?.package_id ?? '') === String(selectedPackage.id ?? '') ||
        String(item?.packageId ?? '') === String(selectedPackage.id ?? '')
      )
    );

    if (existing) {
      setLinkedInvoiceId(String(existing.id));
      navigate(`/accounting/sales-invoice/${existing.id}/edit`);
      return;
    }

    try {
      setGenerating(true);
      const invoice = await generateInvoiceFromPackage(id);
      const invoiceId = invoice?.id;
      const invoiceNo = invoice?.invoice_no ?? invoice?.invoiceNo ?? '';

      if (invoiceId) {
        setLinkedInvoiceId(String(invoiceId));
        setLinkedPackage(String(selectedPackage.id ?? id));
        await load();
        navigate(`/accounting/sales-invoice/${invoiceId}/edit`);
      } else {
        await load();
        alert(invoiceNo ? `Invoice ${invoiceNo} created.` : 'Invoice created successfully.');
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const BILLABLE_STATUSES = ['Cambodia Warehouse', 'Measurement Completed', 'Ready for Billing'];

  const toggleCombine = (pkg) => {
    const id = String(pkg.id);
    setCombineIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const createCombinedBill = async () => {
    const chosen = packageResults.filter((p) => combineIds.includes(String(p.id)));
    const customers = new Set(chosen.map((p) => String(p.customerId || p.customerName || '')));

    if (chosen.length < 2) {
      alert('Select at least 2 packages.');
      return;
    }
    if (customers.size > 1) {
      alert('All selected packages must belong to the same customer.');
      return;
    }

    try {
      setGenerating(true);
      const options = {};
      if (String(combineDelivery).trim() !== '') options.delivery_fee = Number(combineDelivery);
      const invoice = await generateCombinedInvoice(chosen.map((p) => p.id), options);
      setCombineIds([]);
      setCombineDelivery('');
      await load();
      if (invoice?.id) navigate(`/accounting/sales-invoice/${invoice.id}/edit`);
    } catch (error) {
      alert(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const printInvoice = (invoice) => {
    if (!invoice?.id) return;

    const url = `${window.location.origin}/accounting/sales-invoice/${invoice.id}`;
    const w = window.open(url, '_blank', 'noopener,noreferrer,width=1100,height=900');

    if (!w) {
      alert('Please allow pop-ups to print the invoice.');
    }
  };

  const totalPaid = useMemo(
    () =>
      invoices.reduce(
        (sum, invoice) =>
          sum +
          Number(
            invoice.paidAmount || 0
          ),
        0
      ),
    [invoices]
  );

  const totalReceivable = useMemo(
    () =>
      invoices.reduce(
        (sum, invoice) =>
          sum +
          Number(
            invoice.outstanding || 0
          ),
        0
      ),
    [invoices]
  );

  return (
    <div className="space-y-5">

      <div className="flex justify-between items-center">

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
          onClick={load}
          disabled={loading}
          className="h-10 px-4 border rounded-lg inline-flex gap-2 items-center"
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? 'animate-spin'
                : ''
            }
          />
          Refresh
        </button>

      </div>

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

      {linkedPackage && (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Package linked from Cambodia Warehouse</div>
            <div className="mt-1 text-sm font-bold text-slate-900">Package ID: {linkedPackage}</div>
            {linkedInvoiceId ? (
              <div className="text-xs text-emerald-700 font-semibold mt-1">
                Existing invoice linked: {invoices.find((x) => String(x.id) === String(linkedInvoiceId))?.invoiceNo ?? `#${linkedInvoiceId}`}
              </div>
            ) : (
              <div className="text-xs text-slate-500 mt-1">No invoice exists yet. Create it once, then use the existing invoice for all future payments.</div>
            )}
          </div>
          <div className="flex gap-2">
            {linkedInvoiceId && (
              <button
                onClick={() => navigate(`/accounting/sales-invoice/${linkedInvoiceId}/edit`)}
                className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <ExternalLink size={15} />
                Open Bill
              </button>
            )}
          </div>
        </section>
      )}

      {/* Search Package for Invoice */}
      <section className="bg-white border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Search size={18} className="text-blue-600" />
          <div>
            <h2 className="font-bold">Find Package / Open Bill</h2>
            <p className="text-xs text-slate-500">
              Search a package. Once it reaches Cambodia Warehouse and measurement is complete, open its bill and enter the current logistics rate.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={packageSearch}
              onChange={(e) => setPackageSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') searchPackagesForBilling();
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
            {searchingPackages ? 'Searching...' : 'Search'}
          </button>
        </div>

        {packageResults.length > 0 && (
          <div className="mt-4 border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b text-xs font-semibold text-slate-600">
              SEARCH RESULTS ({packageResults.length})
            </div>
            <div className="divide-y">
              {packageResults.map((pkg) => {
                const existing = invoices.find((invoice) =>
                  Array.isArray(invoice.items) && invoice.items.some((item) =>
                    String(item?.package_id ?? '') === String(pkg?.id ?? '') ||
                    String(item?.packageId ?? '') === String(pkg?.id ?? '')
                  )
                );
                const isSelected = String(selectedPackage?.id ?? '') === String(pkg?.id ?? '');

                return (
                  <div
                    key={pkg.id ?? pkg.hflPackageCode ?? pkg.trackingNumber}
                    className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${isSelected ? 'bg-blue-50' : 'bg-white'}`}
                  >
                    <button
                      type="button"
                      onClick={() => selectPackageForBilling(pkg)}
                      className="text-left flex-1"
                    >
                      <div className="font-semibold text-slate-900">
                        {pkg.hflPackageCode || pkg.packageId || `PKG-${pkg.id}`}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Tracking: <span className="font-medium text-slate-700">{pkg.trackingNumber || pkg.chinaWaybillNumber || '—'}</span>
                        <span className="mx-2">•</span>
                        Customer: <span className="font-medium text-slate-700">{pkg.customerName || pkg.customerId || '—'}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        CBM: {Number(pkg.totalCbm || 0).toFixed(4)}
                        <span className="mx-2">•</span>
                        Status: {pkg.status || '—'}
                      </div>
                    </button>

                    <div className="flex items-center gap-2">
                      {!existing && BILLABLE_STATUSES.includes(pkg.status) && (
                        <label className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={combineIds.includes(String(pkg.id))}
                            onChange={() => toggleCombine(pkg)}
                          />
                          One bill
                        </label>
                      )}
                      {existing ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/accounting/sales-invoice/${existing.id}/edit`)}
                          className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-2"
                        >
                          <ExternalLink size={15} />
                          Open Bill
                        </button>
                      ) : ['Cambodia Warehouse','Measurement Completed','Ready for Billing'].includes(pkg.status) ? (
                        <button
                          type="button"
                          disabled={generating}
                          onClick={async () => {
                            try {
                              setGenerating(true);
                              const invoice = await generateInvoiceFromPackage(pkg.id);
                              if (invoice?.id) {
                                await load();
                                navigate(`/accounting/sales-invoice/${invoice.id}/edit`);
                              }
                            } catch (error) {
                              alert(error.message);
                            } finally {
                              setGenerating(false);
                            }
                          }}
                          className="h-10 px-4 rounded-lg bg-amber-500 text-white text-sm font-semibold disabled:opacity-50"
                        >
                          {generating ? 'Creating...' : 'Create Bill'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Not at Cambodia Warehouse</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {combineIds.length >= 2 && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">One Bill for {combineIds.length} packages</div>
              <div className="text-xs text-slate-600 mt-1">
                Each tracking is priced with its own rate (origin / GC-SC). Delivery fee is charged once.
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
                  onChange={(e) => setCombineDelivery(e.target.value)}
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
                {generating ? 'Creating...' : `Create ONE Bill (${combineIds.length})`}
              </button>
            </div>
          </div>
        )}

        {selectedPackage && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Selected Package</div>
              <div className="mt-1 font-bold text-slate-900">
                {selectedPackage.hflPackageCode || selectedPackage.packageId || `PKG-${selectedPackage.id}`}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Tracking: {selectedPackage.trackingNumber || selectedPackage.chinaWaybillNumber || '—'}
              </div>
            </div>

            {linkedInvoiceId ? (
              <button
                type="button"
                onClick={() => navigate(`/accounting/sales-invoice/${linkedInvoiceId}/edit`)}
                className="h-10 px-5 rounded-lg bg-blue-600 text-white font-semibold inline-flex items-center gap-2"
              >
                <ExternalLink size={15} />
                Open Bill
              </button>
            ) : ['Cambodia Warehouse', 'Measurement Completed', 'Ready for Billing'].includes(selectedPackage.status) ? (
              <button
                type="button"
                onClick={generateFromSelectedPackage}
                disabled={generating}
                className="h-10 px-5 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
              >
                {generating ? 'Creating Invoice...' : 'Create Invoice'}
              </button>
            ) : (
              <div className="flex flex-col md:items-end gap-2">
                <div className="text-xs font-semibold text-amber-700">
                  Status: {selectedPackage.status || 'Unknown'} — cannot be billed yet.
                  Receive it at Cambodia Warehouse and measure it first.
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/cambodia-warehouse')}
                  className="h-10 px-5 rounded-lg bg-amber-500 text-white font-semibold"
                >
                  Go to Cambodia Warehouse
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {view !== 'invoice' && (
        <Section title="Quotation List">

          <div className="flex justify-end p-4 border-b">

            <button
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
            rows={quotes.map((q) => (

              <tr
                key={q.id}
                className="border-t"
              >

                <td className="p-3 font-semibold text-blue-600">
                  {q.quotationNo}
                </td>

                <td className="p-3">
                  {q.customerName}
                </td>

                <td className="p-3 font-semibold">
                  {money(q.grandTotal)}
                </td>

                <td className="p-3">
                  {q.status}
                </td>

                <td className="p-3">

                  <button
                    disabled={
                      q.status === 'Accepted'
                    }
                    onClick={async () => {
                      try {
                        await acceptQuotation(
                          q.id
                        );
                        await load();
                      } catch (error) {
                        alert(
                          error.message
                        );
                      }
                    }}
                    className="text-emerald-600 disabled:opacity-40"
                    title="Accept Quotation"
                  >
                    <CheckCircle2
                      size={17}
                    />
                  </button>

                </td>

              </tr>

            ))}
          />

        </Section>
      )}

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
            rows={
              visibleInvoices.map(
                (invoice) => (

                  <tr
                    key={invoice.id}
                    className={`border-t ${linkedInvoiceId && String(invoice.id) === String(linkedInvoiceId) ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : ''}`}
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
                      {money(
                        invoice.grandTotal
                      )}
                    </td>

                    <td className="p-3 text-emerald-600">
                      {money(
                        invoice.paidAmount
                      )}
                    </td>

                    <td className="p-3 text-orange-600">
                      {money(
                        invoice.outstanding
                      )}
                    </td>

                    <td className="p-3">
                      {invoice.status}
                    </td>

                    <td className="p-3">

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => navigate(`/accounting/sales-invoice/${invoice.id}/edit`)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <ExternalLink size={14} />
                          Open Bill
                        </button>

                        <button
                          disabled={!invoice.outstanding}
                          onClick={() => setPay(invoice)}
                          className="px-3 py-1.5 border rounded-lg text-xs font-semibold disabled:opacity-40"
                        >
                          Receive Payment
                        </button>

                        <button
                          title="Statement"
                          onClick={() => setStatement(invoice)}
                          className="p-1.5 text-blue-600 border rounded-lg"
                        >
                          <History size={16} />
                        </button>

                        <button
                          title={String(invoice.status).toLowerCase() === 'draft' ? 'Enter the current logistics rate before printing' : 'Print / Download PDF'}
                          disabled={String(invoice.status).toLowerCase() === 'draft'}
                          onClick={() => printInvoice(invoice)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Printer size={15} />
                          {String(invoice.status).toLowerCase() === 'draft' ? 'Rate Required' : 'Print'}
                        </button>
                      </div>

                    </td>

                  </tr>

                )
              )
            }
          />

        </Section>
      )}

      {modal && (
        <Modal
          title={
            modal === 'quotation'
              ? 'New Quotation'
              : 'New Invoice'
          }
          invoice={
            modal === 'invoice'
          }
          onClose={() =>
            setModal(null)
          }
          onSave={save}
        />
      )}

      {pay && (
        <PaymentModal
          invoice={pay}
          onClose={() =>
            setPay(null)
          }
          onDone={async () => {
            setPay(null);
            await load();
          }}
        />
      )}

      {statement && (
        <StatementModal
          invoice={statement}
          onClose={() =>
            setStatement(null)
          }
        />
      )}

    </div>
  );
}

function Stat({
  icon,
  title,
  value,
}) {
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

function Section({
  title,
  children,
}) {
  return (
    <section className="bg-white border rounded-xl overflow-hidden">

      <div className="p-4 border-b">
        <h2 className="font-bold">
          {title}
        </h2>
      </div>

      {children}

    </section>
  );
}

function Table({
  headers,
  rows,
}) {
  return (
    <div className="overflow-x-auto">

      <table className="w-full text-sm">

        <thead className="bg-slate-50">

          <tr>

            {headers.map((header) => (
              <th
                key={header}
                className="text-left p-3 text-xs"
              >
                {header}
              </th>
            ))}

          </tr>

        </thead>

        <tbody>

          {rows.length
            ? rows
            : (
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
