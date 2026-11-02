
import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Calculator,
  Receipt,
  CreditCard,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  Ban,
} from 'lucide-react';

import apiClient from '../api/apiClient.js';
import {
  listPackages,
  getPackage,
} from '../services/packageApiService.js';

import {
  generateInvoiceFromPackage,
  createPayment,
} from '../services/billingApi.js';

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

const money = (n, currency = 'USD') =>
  `${currency} ${Number(n || 0).toFixed(2)}`;

const unwrap = (response) =>
  response?.data ?? response ?? {};

const arr = (response) => {
  const value = unwrap(response);

  return Array.isArray(value)
    ? value
    : Array.isArray(value?.data)
      ? value.data
      : [];
};

const isVoid = (status) =>
  ['void', 'voided', 'cancelled'].includes(
    String(status || '').trim().toLowerCase()
  );

const getInvoiceId = (invoice) =>
  invoice?.id ?? invoice?.invoice_id ?? null;

const getInvoices = (packageData) =>
  Array.isArray(packageData?.invoices)
    ? packageData.invoices
    : [];

const getActiveInvoice = (packageData) =>
  getInvoices(packageData).find(
    (invoice) => !isVoid(invoice?.status)
  ) || null;

const getVoidedInvoices = (packageData) =>
  getInvoices(packageData).filter(
    (invoice) => isVoid(invoice?.status)
  );

function getErrorMessage(error, fallback) {
  const response = error?.response?.data;

  return (
    response?.message ||
    error?.data?.message ||
    error?.message ||
    fallback
  );
}

// ------------------------------------------------------------
// REUSABLE UI
// ------------------------------------------------------------

function Card({ children, className = '' }) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl ${className}`}
    >
      {children}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-bold text-slate-900 mt-1">
        {value}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function Input({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full h-10 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 ${className}`}
    />
  );
}

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

const ORIGINS = [
  'Foshan',
  'Guangzhou',
  'Yiwu',
  'China',
];

const DESTINATION = 'Cambodia Warehouse';

const createEmptyPricing = () => ({
  rate_name: '',
  shipping_mode: 'SEA',
  pricing_type: 'GC',
  origin: 'Guangzhou',
  destination: DESTINATION,
  rate_type: 'CBM',
  rate: '',
  currency: 'USD',
  minimum_cbm: '0',
  effective_date: new Date().toISOString().slice(0, 10),
  expiry_date: '',
  status: 'Active',
});

// ------------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------------

export default function PricingBillingControlCenter() {
  const [pricing, setPricing] = useState([]);
  const [packages, setPackages] = useState([]);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState(null);
  const [quote, setQuote] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [pricingForm, setPricingForm] = useState(
    createEmptyPricing
  );

  const [pricingModal, setPricingModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // NEW: Void Bill
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidInvoice, setVoidInvoice] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidSaving, setVoidSaving] = useState(false);

  // ----------------------------------------------------------
  // LOAD DATA
  // ----------------------------------------------------------

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [pricingResponse, packageResponse] =
        await Promise.all([
          apiClient.get('/pricing', { per_page: 100 }),
          listPackages({ perPage: 100 }),
        ]);

      setPricing(arr(pricingResponse));

      setPackages(
        Array.isArray(packageResponse)
          ? packageResponse
          : arr(packageResponse)
      );
    } catch (e) {
      setError(
        getErrorMessage(
          e,
          'Unable to load pricing and packages.'
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ----------------------------------------------------------
  // FILTERS
  // ----------------------------------------------------------

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return packages.filter((p) => {
      if (!query) return true;

      return [
        p.packageId,
        p.trackingNumber,
        p.customerId,
        p.customerName,
        p.code,
      ].some((value) =>
        String(value || '').toLowerCase().includes(query)
      );
    });
  }, [packages, search]);

  const active = pricing.filter(
    (p) => p.status === 'Active'
  );

  const sea = active.filter(
    (p) => p.shipping_mode === 'SEA'
  ).length;

  const land = active.filter(
    (p) => p.shipping_mode === 'LAND'
  ).length;

  const air = active.filter(
    (p) => p.shipping_mode === 'AIR'
  ).length;

  const invoice = getActiveInvoice(selected);

  const voidedInvoices = getVoidedInvoices(selected);

  const hasInvoice = Boolean(invoice);

  const invoiceHasPayment =
    Number(invoice?.paid_amount ?? invoice?.paidAmount ?? 0) > 0 ||
    ['paid', 'partially paid'].includes(
      String(invoice?.status || '').toLowerCase()
    ) ||
    (
      Array.isArray(invoice?.payments) &&
      invoice.payments.length > 0
    );

  const canVoid =
    hasInvoice &&
    Boolean(getInvoiceId(invoice)) &&
    !invoiceHasPayment &&
    !isVoid(invoice?.status);

  // ----------------------------------------------------------
  // SELECT PACKAGE
  // ----------------------------------------------------------

  async function selectPackage(p) {
    if (!p?.id) return;

    setError('');
    setQuote(null);

    try {
      const detail = await getPackage(p.id);

      setSelected(detail);

      const params = {
        shipping_mode: detail.shippingMode,
        pricing_type: detail.pricing_type || 'GC',
        origin: detail.fromWarehouse || '',
        destination:
          detail.toWarehouse || DESTINATION,
      };

      if (params.origin && params.destination) {
        try {
          const response = await apiClient.get(
            '/pricing/find',
            params
          );

          const result = unwrap(response);

          setQuote(
            result?.pricing_id
              ? result
              : null
          );
        } catch (pricingError) {
          if (
            pricingError?.status === 404 ||
            pricingError?.response?.status === 404
          ) {
            setQuote(null);
          } else {
            throw pricingError;
          }
        }
      }
    } catch (e) {
      setError(
        getErrorMessage(
          e,
          'Could not load package pricing.'
        )
      );
    }
  }

  // ----------------------------------------------------------
  // SAVE PRICING
  // ----------------------------------------------------------

  async function savePricing(e) {
    e.preventDefault();

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/pricing', pricingForm);

      setPricingModal(false);
      setPricingForm(createEmptyPricing());

      await load();

      setSuccess('Pricing rule created successfully.');
    } catch (e) {
      setError(
        getErrorMessage(
          e,
          'Unable to save pricing.'
        )
      );
    } finally {
      setSaving(false);
    }
  }

  // ----------------------------------------------------------
  // GENERATE INVOICE
  // ----------------------------------------------------------

  async function generate() {
    if (!selected || hasInvoice) return;

    setLoading(true);
    setError('');
    setSuccess('');

    const packageToRefresh = selected;

    try {
      const generated = await generateInvoiceFromPackage(
        selected.id
      );

      if (generated?.success === false) {
        throw new Error(
          generated.message || 'Unable to generate invoice.'
        );
      }

      // Refresh package data from server.
      await selectPackage(packageToRefresh);
      await load();

      setSuccess('Invoice generated successfully.');
    } catch (e) {
      setError(
        getErrorMessage(
          e,
          'Unable to generate invoice.'
        )
      );
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------------
  // RECEIVE PAYMENT
  // ----------------------------------------------------------

  function openPayment() {
    if (!invoice || isVoid(invoice.status)) return;

    setPaymentAmount(
      String(invoice.outstanding ?? '')
    );

    setPaymentOpen(true);
    setError('');
  }

  async function pay() {
    if (!selected || !invoice) return;

    if (isVoid(invoice.status)) {
      setError('Cannot pay a voided invoice.');
      return;
    }

    const invoiceId = getInvoiceId(invoice);
    const amount = Number(paymentAmount);
    const outstanding = Number(invoice.outstanding || 0);

    if (!invoiceId) {
      setError('Invoice ID is missing.');
      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > outstanding
    ) {
      setError(
        'Enter a valid amount not greater than the outstanding balance.'
      );
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const packageToRefresh = selected;

    try {
      await createPayment({
        invoice_id: invoiceId,
        customer_id: selected.customerId,
        amount,
        method: paymentMethod,
        idempotency_key:
          `hfl-${invoiceId}-${Date.now()}`,
      });

      setPaymentOpen(false);
      setPaymentAmount('');

      await selectPackage(packageToRefresh);
      await load();

      setSuccess('Payment recorded successfully.');
    } catch (e) {
      setError(
        getErrorMessage(
          e,
          'Unable to process payment.'
        )
      );
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------------
  // NEW: OPEN VOID CONFIRMATION
  // ----------------------------------------------------------

  function openVoidBill(targetInvoice = invoice) {
    if (!targetInvoice) return;

    const paid = Number(
      targetInvoice.paid_amount ??
      targetInvoice.paidAmount ??
      0
    );

    const status = String(
      targetInvoice.status || ''
    ).toLowerCase();

    if (
      paid > 0 ||
      status === 'paid' ||
      status === 'partially paid' ||
      (
        Array.isArray(targetInvoice.payments) &&
        targetInvoice.payments.length > 0
      )
    ) {
      setError(
        'This invoice has payment history. ' +
        'Please resolve the payment with Finance first.'
      );

      return;
    }

    if (isVoid(targetInvoice.status)) {
      setError('This invoice is already void.');
      return;
    }

    if (!getInvoiceId(targetInvoice)) {
      setError('Invoice ID is missing.');
      return;
    }

    setVoidInvoice(targetInvoice);
    setVoidReason('');
    setVoidOpen(true);
    setError('');
    setSuccess('');
  }

  // ----------------------------------------------------------
  // NEW: CONFIRM VOID BILL
  // ----------------------------------------------------------

  async function confirmVoidBill() {
    const invoiceId = getInvoiceId(voidInvoice);
    const reason = voidReason.trim();

    if (!invoiceId) {
      setError('Invoice ID is missing.');
      return;
    }

    if (reason.length < 5) {
      setError(
        'Please enter a reason with at least 5 characters.'
      );
      return;
    }

    setVoidSaving(true);
    setError('');
    setSuccess('');

    const packageToRefresh = selected;

    try {
      const response = await apiClient.post(
        `/invoices/${invoiceId}/void`,
        { reason }
      );

      const result = unwrap(response);

      if (
        response?.success === false ||
        result?.success === false
      ) {
        throw new Error(
          result?.message ||
          response?.message ||
          'Unable to void invoice.'
        );
      }

      // Optimistically remove the voided invoice
      // from the active invoice list.
      setSelected((current) => {
        if (!current) return current;

        return {
          ...current,
          invoices: getInvoices(current).map((item) =>
            String(getInvoiceId(item)) === String(invoiceId)
              ? {
                  ...item,
                  status: 'Void',
                  outstanding: 0,
                  meta: {
                    ...(item.meta || {}),
                    void: {
                      reason,
                    },
                  },
                }
              : item
          ),
        };
      });

      setVoidOpen(false);
      setVoidInvoice(null);
      setVoidReason('');
      setPaymentOpen(false);

      // Reload package and pricing after cancellation.
      if (packageToRefresh) {
        await selectPackage(packageToRefresh);
      }

      await load();

      setSuccess(
        'Bill voided successfully. ' +
        'You may generate a correct invoice again.'
      );
    } catch (e) {
      setError(
        getErrorMessage(
          e,
          'Unable to void invoice.'
        )
      );
    } finally {
      setVoidSaving(false);
    }
  }

  function closeVoidBill() {
    if (voidSaving) return;

    setVoidOpen(false);
    setVoidInvoice(null);
    setVoidReason('');
  }

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Pricing + Billing Control Center
          </h1>

          <p className="text-sm text-slate-500">
            Database-backed pricing, package charge
            calculation, invoice, payment and outstanding
            balance.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="h-10 px-3 border rounded-lg text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={loading ? 'animate-spin' : ''}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setPricingModal(true)}
            className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-2"
          >
            <Plus size={15} />
            Add Pricing
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100 flex items-start gap-2">
          <AlertTriangle
            size={17}
            className="shrink-0 mt-0.5"
          />

          <span className="flex-1">{error}</span>

          <button
            type="button"
            onClick={() => setError('')}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* SUCCESS */}
      {success && (
        <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-100 flex items-start gap-2">
          <CheckCircle2
            size={17}
            className="shrink-0 mt-0.5"
          />

          <span className="flex-1">{success}</span>

          <button
            type="button"
            onClick={() => setSuccess('')}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* STATISTICS */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <Stat
          label="Active Pricing"
          value={active.length}
        />

        <Stat label="SEA" value={sea} />
        <Stat label="LAND" value={land} />
        <Stat label="AIR" value={air} />

        <Stat
          label="Packages"
          value={packages.length}
        />
      </div>

      {/* MAIN CONTENT */}
      <div className="grid xl:grid-cols-[1.15fr_.85fr] gap-5">
        {/* PACKAGE LIST */}
        <Card>
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Search
                size={17}
                className="text-slate-400"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Package ID / Tracking / Customer ID / Name"
                className="flex-1 min-w-0 outline-none text-sm"
              />
            </div>
          </div>

          <div className="overflow-auto max-h-[620px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {[
                    'Package',
                    'Customer',
                    'Mode',
                    'CBM',
                    'Weight',
                    'Pricing',
                    'Billing',
                  ].map((header) => (
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
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => selectPackage(p)}
                    className={`border-t cursor-pointer hover:bg-blue-50 ${
                      selected?.id === p.id
                        ? 'bg-blue-50'
                        : ''
                    }`}
                  >
                    <td className="p-3">
                      <b className="text-blue-600">
                        {p.packageId}
                      </b>

                      <div className="text-xs text-slate-400">
                        {p.trackingNumber || '—'}
                      </div>
                    </td>

                    <td className="p-3">
                      {p.customerName ||
                        p.customerId ||
                        '—'}
                    </td>

                    <td className="p-3">
                      {p.shippingMode} /{' '}
                      {p.pricing_type || 'GC'}
                    </td>

                    <td className="p-3">
                      {Number(
                        p.totalCbm || 0
                      ).toFixed(3)}
                    </td>

                    <td className="p-3">
                      {Number(
                        p.totalWeight || 0
                      ).toFixed(2)}{' '}
                      KG
                    </td>

                    <td className="p-3">
                      {p.pricing_id || '—'}
                    </td>

                    <td className="p-3">
                      {money(p.grandTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!filtered.length && (
              <div className="p-10 text-center text-slate-500">
                No packages found.
              </div>
            )}
          </div>
        </Card>

        {/* RIGHT PANELS */}
        <div className="space-y-5">
          {/* CHARGE CALCULATION */}
          <Card>
            <div className="p-4 border-b flex items-center gap-2">
              <Calculator
                size={17}
                className="text-blue-600"
              />

              <h2 className="font-bold">
                Charge Calculation
              </h2>
            </div>

            {selected ? (
              <div className="p-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Stat
                    label="CBM"
                    value={Number(
                      selected.totalCbm || 0
                    ).toFixed(3)}
                  />

                  <Stat
                    label="Weight"
                    value={`${Number(
                      selected.totalWeight || 0
                    ).toFixed(2)} KG`}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">
                      Mode / Type
                    </span>

                    <b>
                      {selected.shippingMode} /{' '}
                      {selected.pricing_type || 'GC'}
                    </b>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">
                      Route
                    </span>

                    <b className="text-right">
                      {selected.fromWarehouse || '—'}
                      {' → '}
                      {DESTINATION}
                    </b>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">
                      Pricing ID
                    </span>

                    <b>
                      {quote?.pricing_id ||
                        selected.pricing_id ||
                        'No active rate'}
                    </b>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">
                      Rate
                    </span>

                    <b>
                      {quote
                        ? money(
                            quote.rate,
                            quote.currency
                          )
                        : 'No active rate'}

                      {quote && (
                        <> / {quote.rate_type}</>
                      )}
                    </b>
                  </div>

                  <div className="flex justify-between gap-3 text-base">
                    <span>Shipping Cost</span>

                    <b>
                      {quote
                        ? money(
                            selected.shipping_cost,
                            quote.currency
                          )
                        : '—'}
                    </b>
                  </div>

                  <div className="flex justify-between gap-3 text-base">
                    <span>Grand Total</span>

                    <b>
                      {quote
                        ? money(
                            selected.grandTotal,
                            quote.currency
                          )
                        : '—'}
                    </b>
                  </div>
                </div>

                {/* CURRENT INVOICE */}
                {invoice && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs font-semibold text-blue-700">
                        Current Invoice
                      </span>

                      <span className="text-xs px-2 py-1 rounded-full bg-white text-slate-700 border">
                        {invoice.status || 'Unpaid'}
                      </span>
                    </div>

                    <div className="font-bold text-slate-900 break-all">
                      {invoice.invoice_no ||
                        `Invoice #${getInvoiceId(invoice)}`}
                    </div>

                    <div className="flex justify-between">
                      <span>Total</span>

                      <b>
                        {money(
                          invoice.grand_total ??
                          invoice.grandTotal
                        )}
                      </b>
                    </div>

                    <div className="flex justify-between">
                      <span>Outstanding</span>

                      <b>
                        {money(invoice.outstanding)}
                      </b>
                    </div>
                  </div>
                )}

                {/* GENERATE / PAYMENT / VOID */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={generate}
                    disabled={
                      loading ||
                      hasInvoice ||
                      !quote
                    }
                    className="flex-1 min-w-[145px] h-10 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    <FileText
                      size={15}
                      className="inline mr-2"
                    />

                    {hasInvoice
                      ? 'Invoice Created'
                      : 'Generate Invoice'}
                  </button>

                  {invoice &&
                    Number(
                      invoice.outstanding || 0
                    ) > 0 && (
                      <button
                        type="button"
                        onClick={openPayment}
                        disabled={loading}
                        className="h-10 px-4 rounded-lg border border-slate-200 text-sm disabled:opacity-50"
                      >
                        <CreditCard
                          size={15}
                          className="inline mr-2"
                        />
                        Pay
                      </button>
                    )}
                </div>

                {/* NEW: VOID BILL BUTTON */}
                {canVoid && (
                  <button
                    type="button"
                    onClick={() =>
                      openVoidBill(invoice)
                    }
                    disabled={loading || voidSaving}
                    className="w-full h-10 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-red-100 disabled:opacity-50"
                  >
                    <Ban size={16} />
                    Void Bill (Cancel Wrong Invoice)
                  </button>
                )}

                {invoiceHasPayment && (
                  <p className="text-xs text-amber-700">
                    This invoice has payment history.
                    Void Bill is disabled until Finance
                    resolves the payment.
                  </p>
                )}

                {/* VOID HISTORY */}
                {voidedInvoices.length > 0 && (
                  <div className="border-t pt-3 space-y-2">
                    <h3 className="font-semibold text-xs text-slate-500 uppercase">
                      Voided Bill History
                    </h3>

                    {voidedInvoices.map((oldInvoice) => (
                      <div
                        key={
                          getInvoiceId(oldInvoice) ||
                          oldInvoice.invoice_no
                        }
                        className="rounded-lg border border-red-100 bg-red-50 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-700 break-all">
                            {oldInvoice.invoice_no ||
                              `Invoice #${getInvoiceId(
                                oldInvoice
                              )}`}
                          </span>

                          <span className="text-xs font-semibold text-red-700">
                            VOID
                          </span>
                        </div>

                        {oldInvoice.meta?.void?.reason && (
                          <p className="text-xs text-slate-600 mt-1">
                            Reason:{' '}
                            {oldInvoice.meta.void.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm">
                Select a package to calculate its database
                pricing.
              </div>
            )}
          </Card>

          {/* ACTIVE PRICING RULES */}
          <Card>
            <div className="p-4 border-b">
              <h2 className="font-bold">
                Active Pricing Rules
              </h2>

              <p className="text-xs text-slate-500">
                Source: Laravel + MySQL. No React pricing
                seed is used here.
              </p>
            </div>

            <div className="overflow-auto max-h-72">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      'Pricing',
                      'Mode',
                      'Type',
                      'Route',
                      'Rate',
                      'Validity',
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
                  {active.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t"
                    >
                      <td className="p-3 font-semibold">
                        {p.pricing_id}
                      </td>

                      <td className="p-3">
                        {p.shipping_mode}
                      </td>

                      <td className="p-3">
                        {p.pricing_type}
                      </td>

                      <td className="p-3">
                        {p.origin}
                        {' → '}
                        {p.destination}
                      </td>

                      <td className="p-3">
                        {p.currency}{' '}
                        {Number(
                          p.rate || 0
                        ).toFixed(2)}
                        /{p.rate_type}
                      </td>

                      <td className="p-3">
                        {p.effective_date || '—'}
                        {' → '}
                        {p.expiry_date || 'Open'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* ADD PRICING MODAL                                    */}
      {/* ---------------------------------------------------- */}

      {pricingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <form
            onSubmit={savePricing}
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">
                  Add Pricing Rule
                </h2>

                <p className="text-xs text-slate-500">
                  Stored in MySQL and used by package
                  billing.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPricingModal(false)
                }
              >
                <X />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Rate Name">
                <Input
                  required
                  value={pricingForm.rate_name}
                  onChange={(e) =>
                    setPricingForm({
                      ...pricingForm,
                      rate_name: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Shipping Mode">
                <select
                  className="w-full h-10 border rounded-lg px-3 text-sm"
                  value={pricingForm.shipping_mode}
                  onChange={(e) =>
                    setPricingForm({
                      ...pricingForm,
                      shipping_mode: e.target.value,
                    })
                  }
                >
                  {['SEA', 'LAND', 'AIR'].map(
                    (option) => (
                      <option key={option}>
                        {option}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="Pricing Type">
                <select
                  className="w-full h-10 border rounded-lg px-3 text-sm"
                  value={pricingForm.pricing_type}
                  onChange={(e) =>
                    setPricingForm({
                      ...pricingForm,
                      pricing_type: e.target.value,
                    })
                  }
                >
                  <option>GC</option>
                  <option>SC</option>
                </select>
              </Field>

              <Field label="Rate Type">
                <select
                  className="w-full h-10 border rounded-lg px-3 text-sm"
                  value={pricingForm.rate_type}
                  onChange={(e) =>
                    setPricingForm({
                      ...pricingForm,
                      rate_type: e.target.value,
                    })
                  }
                >
                  <option>CBM</option>
                  <option>KG</option>
                </select>
              </Field>

              <Field label="China Origin">
                <select
                  className="w-full h-10 border rounded-lg px-3 text-sm"
                  value={pricingForm.origin}
                  onChange={(e) =>
                    setPricingForm({
                      ...pricingForm,
                      origin: e.target.value,
                    })
                  }
                >
                  {ORIGINS.map((origin) => (
                    <option key={origin}>
                      {origin}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Cambodia Destination">
                <Input
                  required
                  value={DESTINATION}
                  readOnly
                />
              </Field>

              <Field label="Rate">
                <Input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricingForm.rate}
                  onChange={(e) =>
                    setPricingForm({
                      ...pricingForm,
                      rate: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Currency">
                <Input
                  value={pricingForm.currency}
                  onChange={(e) =>
                    setPricingForm({
                      ...pricingForm,
                      currency:
                        e.target.value.toUpperCase(),
                    })
                  }
                />
              </Field>

              <Field label="Minimum CBM">
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={pricingForm.minimum_cbm}
                  onChange={(e) =>
                    setPricingForm({
                      ...pricingForm,
                      minimum_cbm: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Effective Date">
                <Input
                  type="date"
                  value={pricingForm.effective_date}
                  onChange={(e) =>
                    setPricingForm({
                      ...pricingForm,
                      effective_date: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Expiry Date">
                <Input
                  type="date"
                  value={pricingForm.expiry_date}
                  onChange={(e) =>
                    setPricingForm({
                      ...pricingForm,
                      expiry_date: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Status">
                <select
                  className="w-full h-10 border rounded-lg px-3 text-sm"
                  value={pricingForm.status}
                  onChange={(e) =>
                    setPricingForm({
                      ...pricingForm,
                      status: e.target.value,
                    })
                  }
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </Field>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t">
              <button
                type="button"
                onClick={() =>
                  setPricingModal(false)
                }
                className="h-10 px-4 border rounded-lg text-sm"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="h-10 px-5 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : 'Create Pricing'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* RECEIVE PAYMENT MODAL                                */}
      {/* ---------------------------------------------------- */}

      {paymentOpen && invoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex justify-between gap-3">
              <div>
                <h2 className="font-bold text-lg">
                  Receive Payment
                </h2>

                <p className="text-xs text-slate-500">
                  {invoice.invoice_no}
                  {' · '}
                  Outstanding{' '}
                  {money(invoice.outstanding)}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPaymentOpen(false)
                }
              >
                <X />
              </button>
            </div>

            <div className="space-y-4 mt-5">
              <Field label="Amount">
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={invoice.outstanding}
                  value={paymentAmount}
                  onChange={(e) =>
                    setPaymentAmount(
                      e.target.value
                    )
                  }
                />
              </Field>

              <Field label="Method">
                <select
                  className="w-full h-10 border rounded-lg px-3 text-sm"
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(
                      e.target.value
                    )
                  }
                >
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>ABA</option>
                  <option>ACLEDA</option>
                  <option>Other</option>
                </select>
              </Field>

              <button
                type="button"
                onClick={pay}
                disabled={loading}
                className="w-full h-10 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                <Receipt
                  size={15}
                  className="inline mr-2"
                />
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* NEW: VOID BILL MODAL                                 */}
      {/* ---------------------------------------------------- */}

      {voidOpen && voidInvoice && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center">
                  <Ban
                    size={22}
                    className="text-red-600"
                  />
                </div>

                <div>
                  <h2 className="font-bold text-lg text-slate-900">
                    Void Bill
                  </h2>

                  <p className="text-sm text-slate-500">
                    Cancel an incorrect invoice
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeVoidBill}
                disabled={voidSaving}
                className="text-slate-400 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">
                  Invoice
                </span>

                <b className="break-all text-right">
                  {voidInvoice.invoice_no ||
                    `#${getInvoiceId(voidInvoice)}`}
                </b>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-500">
                  Customer
                </span>

                <b className="text-right">
                  {voidInvoice.customer_name ||
                    selected?.customerName ||
                    selected?.customerId ||
                    '—'}
                </b>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-500">
                  Total
                </span>

                <b>
                  {money(
                    voidInvoice.grand_total ??
                    voidInvoice.grandTotal
                  )}
                </b>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-500">
                  Status
                </span>

                <b>
                  {voidInvoice.status || 'Unpaid'}
                </b>
              </div>
            </div>

            <div className="mt-4">
              <Field label="Reason for voiding this bill *">
                <textarea
                  value={voidReason}
                  onChange={(e) =>
                    setVoidReason(e.target.value)
                  }
                  rows={4}
                  maxLength={1000}
                  placeholder="Example: Wrong customer, incorrect rate, duplicate bill..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-100 resize-y"
                />
              </Field>

              <p className="text-xs text-slate-500 mt-1">
                Minimum 5 characters. The reason will
                be saved in the invoice history.
              </p>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-xs flex items-start gap-2">
              <AlertTriangle
                size={16}
                className="shrink-0"
              />

              <span>
                Voiding this bill will remove it from
                active billing, but its invoice number
                and audit history will be retained.
                This action cannot be undone here.
              </span>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={closeVoidBill}
                disabled={voidSaving}
                className="flex-1 h-10 border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Keep Bill
              </button>

              <button
                type="button"
                onClick={confirmVoidBill}
                disabled={
                  voidSaving ||
                  voidReason.trim().length < 5
                }
                className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50"
              >
                <Ban size={15} />

                {voidSaving
                  ? 'Voiding...'
                  : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
