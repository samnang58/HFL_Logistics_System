
import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, RefreshCw, Search, Download, Pencil, X,
  CheckCircle2, Ban, Wallet, CalendarDays, AlertTriangle,
} from 'lucide-react';

import apiClient from '../api/apiClient.js';
import { downloadXlsx } from '../utils/xlsx.js';

// ============================================================
// EXPENSE TYPES AND CATEGORIES
// ============================================================

const CATEGORIES = {
  Operating: [
    'Fuel',
    'Food / Staff Meals',
    'Electricity',
    'Water',
    'Internet',
    'Phone',
    'Office Supplies',
    'Cleaning',
    'Vehicle Maintenance',
    'Other',
  ],

  'Logistics Cost': [
    'China Freight',
    'Customs',
    'Import Duties',
    'Port Fees',
    'Packaging',
    'Loading / Unloading',
    'Transportation',
    'Other',
  ],

  'Warehouse Cost': [
    'Warehouse Rent',
    'Warehouse Labor',
    'Utilities',
    'Equipment',
    'Maintenance',
    'Other',
  ],

  'Delivery Cost': [
    'Tuk Tuk',
    'VET',
    'Grab',
    'Rental Van',
    'Motorbike',
    'Fuel',
    'Other',
  ],

  Administrative: [
    'Salary',
    'Staff Benefits',
    'Office Rent',
    'Bank Fees',
    'Printing',
    'Tax & Fees',
    'Travel',
    'Other',
  ],

  Other: [
    'Marketing',
    'Emergency',
    'Miscellaneous',
    'Other',
  ],
};

const METHODS = [
  'Cash',
  'Bank Transfer',
  'ABA',
  'ACLEDA',
  'Other',
];

// ============================================================
// HELPERS
// ============================================================

const dateKey = value =>
  String(value || '').slice(0, 10);

const localToday = () => {
  const d = new Date();
  const pad = v => String(v).padStart(2, '0');

  return (
    `${d.getFullYear()}-` +
    `${pad(d.getMonth() + 1)}-` +
    `${pad(d.getDate())}`
  );
};

const startMonth = () =>
  `${localToday().slice(0, 7)}-01`;

const money = n =>
  `$${Number(n || 0).toFixed(2)}`;

const currencyOf = row =>
  String(row?.currency || 'USD').toUpperCase();

const getError = err => {
  const first = Object.values(
    err?.errors ||
    err?.payload?.errors ||
    {}
  )[0];

  return (
    (Array.isArray(first) ? first[0] : first) ||
    err?.message ||
    'Unable to complete request.'
  );
};

const parsePage = response => {
  const outer = response?.data ?? response;

  const page =
    outer?.data && !Array.isArray(outer.data)
      ? outer.data
      : outer;

  return {
    items: Array.isArray(page)
      ? page
      : Array.isArray(page?.data)
        ? page.data
        : [],

    last: Math.max(
      1,
      Number(page?.last_page || 1)
    ),
  };
};

const createForm = row => ({
  expense_type: row?.expense_type || 'Operating',
  category: row?.category || 'Fuel',
  description: row?.description || '',
  vendor: row?.vendor || '',
  amount: row?.amount ?? '',
  currency: currencyOf(row),

  expense_date:
    dateKey(row?.expense_date) || localToday(),

  status:
    row?.status === 'Pending'
      ? 'Pending'
      : 'Paid',

  payment_method:
    row?.payment_method || 'Cash',

  payment_reference:
    row?.payment_reference || '',

  reference: row?.reference || '',

  shipment_id: row?.shipment_id || '',
  container_id: row?.container_id || '',
  package_id: row?.package_id || '',

  notes: row?.notes || '',
});

// ============================================================
// ADD / EDIT EXPENSE MODAL
// ============================================================

function ExpenseEditor({
  record,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(
    () => createForm(record)
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) =>
    setForm(f => ({
      ...f,
      [key]: value,
    }));

  const categories =
    CATEGORIES[form.expense_type] ||
    CATEGORIES.Other;

  const custom =
    !categories.includes(form.category);

  const input =
    'mt-1 w-full h-10 rounded-lg border ' +
    'border-slate-200 px-3 text-sm outline-none ' +
    'focus:ring-2 focus:ring-blue-100';

  async function save(e) {
    e.preventDefault();

    if (saving) return;

    const amount = Number(form.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        'Enter an amount greater than zero.'
      );
      return;
    }

    if (
      !form.category.trim() ||
      !form.description.trim()
    ) {
      setError(
        'Category and description are required.'
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        amount,

        vendor:
          form.vendor.trim() || null,

        reference:
          form.reference.trim() || null,

        payment_method:
          form.status === 'Paid'
            ? form.payment_method
            : null,

        payment_reference:
          form.status === 'Paid'
            ? form.payment_reference.trim() || null
            : null,

        shipment_id:
          form.shipment_id || null,

        container_id:
          form.container_id || null,

        package_id:
          form.package_id || null,
      };

      if (record?.id) {
        await apiClient.put(
          `/expenses/${record.id}`,
          payload
        );
      } else {
        await apiClient.post(
          '/expenses',
          payload
        );
      }

      await onSaved();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4">
      <form
        onSubmit={save}
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        {/* HEADER */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5">
          <div>
            <h2 className="text-lg font-bold">
              {record?.id
                ? 'Edit Expense'
                : 'Record Daily Expense'}
            </h2>

            <p className="text-xs text-slate-500">
              Everyday company spending · New records use USD
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* FORM FIELDS */}
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <label className="text-xs font-semibold">
            Expense Type

            <select
              className={input}
              value={form.expense_type}
              onChange={e => {
                const expense_type = e.target.value;

                setForm(f => ({
                  ...f,
                  expense_type,
                  category:
                    CATEGORIES[expense_type][0],
                }));
              }}
            >
              {Object.keys(CATEGORIES).map(t => (
                <option key={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold">
            Category

            <select
              className={input}
              value={
                custom
                  ? '__custom'
                  : form.category
              }
              onChange={e =>
                set(
                  'category',
                  e.target.value === '__custom'
                    ? ''
                    : e.target.value
                )
              }
            >
              {categories.map(c => (
                <option
                  key={c}
                  value={c}
                >
                  {c}
                </option>
              ))}

              <option value="__custom">
                Custom category / ផ្សេងទៀត...
              </option>
            </select>

            {custom && (
              <input
                required
                className={input}
                maxLength={100}
                placeholder="Type your category"
                value={form.category}
                onChange={e =>
                  set('category', e.target.value)
                }
              />
            )}
          </label>

          <label className="text-xs font-semibold md:col-span-2">
            Expense Description / ឈ្មោះចំណាយ *

            <input
              required
              maxLength={1000}
              className={input}
              value={form.description}
              onChange={e =>
                set('description', e.target.value)
              }
              placeholder="e.g. Petrol for company vehicle, electricity, staff lunch"
            />
          </label>

          <label className="text-xs font-semibold">
            Amount ({form.currency}) *

            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              className={input}
              value={form.amount}
              onChange={e =>
                set('amount', e.target.value)
              }
            />
          </label>

          <label className="text-xs font-semibold">
            Expense Date *

            <input
              required
              type="date"
              className={input}
              value={form.expense_date}
              onChange={e =>
                set('expense_date', e.target.value)
              }
            />
          </label>

          <label className="text-xs font-semibold">
            Paid To / Supplier

            <input
              className={input}
              maxLength={255}
              value={form.vendor}
              onChange={e =>
                set('vendor', e.target.value)
              }
              placeholder="Shop, driver or employee"
            />
          </label>

          <label className="text-xs font-semibold">
            Payment Status

            <select
              className={input}
              value={form.status}
              onChange={e =>
                set('status', e.target.value)
              }
            >
              <option value="Paid">
                Paid
              </option>

              <option value="Pending">
                Pending
              </option>
            </select>
          </label>

          {form.status === 'Paid' && (
            <>
              <label className="text-xs font-semibold">
                Payment Method

                <select
                  className={input}
                  value={form.payment_method}
                  onChange={e =>
                    set(
                      'payment_method',
                      e.target.value
                    )
                  }
                >
                  {METHODS.map(m => (
                    <option key={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold">
                Payment Reference

                <input
                  className={input}
                  maxLength={255}
                  value={form.payment_reference}
                  onChange={e =>
                    set(
                      'payment_reference',
                      e.target.value
                    )
                  }
                  placeholder="ABA transaction / bank transfer"
                />
              </label>
            </>
          )}

          <label className="text-xs font-semibold">
            Receipt / Document No.

            <input
              className={input}
              maxLength={255}
              value={form.reference}
              onChange={e =>
                set('reference', e.target.value)
              }
              placeholder="Receipt number, if available"
            />
          </label>

          <label className="text-xs font-semibold">
            Shipment No. (optional)

            <input
              className={input}
              value={form.shipment_id}
              onChange={e =>
                set(
                  'shipment_id',
                  e.target.value
                )
              }
              placeholder="Shipment ID or HFL shipment number"
            />
          </label>

          <label className="text-xs font-semibold">
            Container No. (optional)

            <input
              className={input}
              value={form.container_id}
              onChange={e =>
                set(
                  'container_id',
                  e.target.value
                )
              }
              placeholder="Container ID or container number"
            />
          </label>

          <label className="text-xs font-semibold">
            Package Tracking (optional)

            <input
              className={input}
              value={form.package_id}
              onChange={e =>
                set(
                  'package_id',
                  e.target.value
                )
              }
              placeholder="Package ID or tracking code"
            />
          </label>

          <label className="text-xs font-semibold md:col-span-2">
            Notes

            <textarea
              rows={3}
              maxLength={2000}
              className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm"
              value={form.notes}
              onChange={e =>
                set('notes', e.target.value)
              }
            />
          </label>
        </div>

        {error && (
          <div className="mx-5 mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* SAVE BUTTON */}
        <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white p-5">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="h-10 rounded-lg border px-4"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-lg bg-blue-600 px-5 font-semibold text-white disabled:opacity-50"
          >
            {saving
              ? 'Saving...'
              : record?.id
                ? 'Save Changes'
                : 'Save Expense'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// DAILY EXPENSE REGISTER MAIN COMPONENT
// ============================================================

export default function DailyExpenseRegister({
  onChanged,
}) {
  const [from, setFrom] = useState(startMonth);
  const [to, setTo] = useState(localToday);

  const [reloadKey, setReloadKey] = useState(0);

  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [status, setStatus] = useState('All');

  const [editor, setEditor] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [page, setPage] = useState(1);

  const pageSize = 20;

  const refresh = () =>
    setReloadKey(v => v + 1);

  // ==========================================================
  // LOAD EXPENSES FROM LARAVEL API
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadAll() {
      if (from && to && from > to) {
        setError(
          'Start date cannot be after end date.'
        );

        setRows([]);
        return;
      }

      setBusy(true);
      setError('');

      try {
        const items = [];

        let current = 1;
        let last = 1;

        do {
          const response = await apiClient.get(
            '/expenses',
            {
              from,
              to,
              page: current,
              per_page: 100,
            }
          );

          const parsed = parsePage(response);

          items.push(...parsed.items);

          last = parsed.last;
          current++;
        } while (current <= last);

        if (active) {
          setRows(items);
        }
      } catch (err) {
        if (active) {
          setRows([]);
          setError(getError(err));
        }
      } finally {
        if (active) {
          setBusy(false);
        }
      }
    }

    loadAll();

    return () => {
      active = false;
    };
  }, [from, to, reloadKey]);

  // ==========================================================
  // FIXED DATE / TYPE / STATUS / SEARCH FILTER
  // ==========================================================

  // IMPORTANT:
  // Keep only ONE "filtered" useMemo block.
  // Apply date filtering locally as well as via API.

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return rows.filter(row => {
      const day = dateKey(row.expense_date);

      if (!day) {
        return false;
      }

      if (from && day < from) {
        return false;
      }

      if (to && day > to) {
        return false;
      }

      if (
        type !== 'All' &&
        row.expense_type !== type
      ) {
        return false;
      }

      if (
        status !== 'All' &&
        row.status !== status
      ) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [
        row.expense_no,
        row.description,
        row.category,
        row.vendor,
        row.reference,
        row.payment_reference,
        row.tracking_number,
      ].some(value =>
        String(value ?? '')
          .toLowerCase()
          .includes(term)
      );
    });
  }, [
    rows,
    from,
    to,
    type,
    status,
    query,
  ]);

  // ==========================================================
  // SUMMARY CALCULATIONS
  // ==========================================================

  // Only USD records are summed together.
  // Cancelled expenses are excluded.

  const usd = filtered.filter(
    row => currencyOf(row) === 'USD'
  );

  const active = usd.filter(
    row => row.status !== 'Cancelled'
  );

  const paid = active.filter(
    row => row.status === 'Paid'
  );

  const pending = active.filter(
    row => row.status === 'Pending'
  );

  const sum = list =>
    list.reduce(
      (n, row) =>
        n + Number(row.amount || 0),
      0
    );

  const todayPaid = sum(
    paid.filter(
      row =>
        dateKey(row.expense_date) ===
        localToday()
    )
  );

  const byCategory = useMemo(() => {
    const map = new Map();

    filtered
      .filter(
        row =>
          currencyOf(row) === 'USD' &&
          row.status !== 'Cancelled'
      )
      .forEach(row => {
        const key = row.category || 'Other';

        map.set(
          key,
          (map.get(key) || 0) +
            Number(row.amount || 0)
        );
      });

    return [...map.entries()].sort(
      (a, b) => b[1] - a[1]
    );
  }, [filtered]);

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const pages = Math.max(
    1,
    Math.ceil(filtered.length / pageSize)
  );

  const shown = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [
    from,
    to,
    query,
    type,
    status,
    reloadKey,
  ]);

  // ==========================================================
  // SAVE / REFRESH
  // ==========================================================

  async function saved() {
    setEditor(null);
    refresh();

    if (onChanged) {
      await onChanged();
    }
  }

  // ==========================================================
  // CANCEL EXPENSE
  // ==========================================================

  async function cancelExpense(row) {
    const reason = window.prompt(
      `Reason for cancelling ${row.expense_no}? ` +
      '(at least 5 characters)'
    );

    if (reason === null) {
      return;
    }

    if (reason.trim().length < 5) {
      setError(
        'Cancellation requires a reason of at least 5 characters.'
      );
      return;
    }

    setActionBusy(true);
    setError('');

    try {
      await apiClient.put(
        `/expenses/${row.id}`,
        {
          status: 'Cancelled',

          notes: [
            row.notes,
            `Cancelled (${new Date().toISOString()}): ${reason.trim()}`,
          ]
            .filter(Boolean)
            .join('\n'),
        }
      );

      refresh();

      if (onChanged) {
        await onChanged();
      }
    } catch (err) {
      setError(getError(err));
    } finally {
      setActionBusy(false);
    }
  }

  // ==========================================================
  // EXPORT EXCEL
  // ==========================================================

  async function exportExcel() {
    if (busy || exporting) {
      return;
    }

    setExporting(true);
    setError('');

    try {
      await downloadXlsx(
        `daily-expenses-${localToday()}.xlsx`,
        [
          {
            name: 'Expense Register',

            rows: [
              [
                'Expense No.',
                'Date',
                'Type',
                'Category',
                'Description',
                'Paid To',
                'Amount',
                'Currency',
                'Status',
                'Payment Method',
                'Payment Reference',
                'Receipt No.',
                'Shipment',
                'Container',
                'Package',
                'Notes',
              ],

              ...filtered.map(row => [
                row.expense_no,
                dateKey(row.expense_date),
                row.expense_type,
                row.category,
                row.description,
                row.vendor,
                Number(row.amount || 0),
                currencyOf(row),
                row.status,
                row.payment_method,
                row.payment_reference,
                row.reference,
                row.shipment_id,
                row.container_id,
                row.package_id,
                row.notes,
              ]),
            ],
          },

          {
            name: 'Summary',

            rows: [
              [
                'HFL Logistics - Daily Expense Register',
              ],

              [
                'From',
                from || 'All',
              ],

              [
                'To',
                to || 'All',
              ],

              [
                'Filter - Type',
                type,
              ],

              [
                'Filter - Status',
                status,
              ],

              [
                'Search',
                query || 'All',
              ],

              [
                'Records',
                filtered.length,
              ],

              [
                'Paid USD',
                sum(paid),
              ],

              [
                'Pending USD',
                sum(pending),
              ],

              [
                'Today Paid USD (within date filter)',
                todayPaid,
              ],
            ],
          },
        ]
      );
    } catch (err) {
      setError(getError(err));
    } finally {
      setExporting(false);
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="rounded-2xl border bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold">
              Daily Expense Register /
              បញ្ជីចំណាយប្រចាំថ្ងៃ
            </h2>

            <p className="text-xs text-slate-500">
              Fuel, staff meals, rent, electricity,
              salaries, freight, delivery,
              warehouse costs and more
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={busy}
              className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm disabled:opacity-50"
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            <button
              type="button"
              onClick={exportExcel}
              disabled={busy || exporting}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-300 px-3 text-sm font-semibold text-emerald-700 disabled:opacity-50"
            >
              <Download size={15} />

              {exporting
                ? 'Exporting...'
                : 'Download Excel'}
            </button>

            <button
              type="button"
              onClick={() => setEditor({})}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"
            >
              <Plus size={16} />
              Record Expense
            </button>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          [
            'Paid Today (USD, within filters)',
            money(todayPaid),
            CalendarDays,
          ],
          [
            'Paid in Selection',
            money(sum(paid)),
            Wallet,
          ],
          [
            'Pending (Unpaid)',
            money(sum(pending)),
            AlertTriangle,
          ],
          [
            'Expense Entries',
            String(filtered.length),
            CheckCircle2,
          ],
        ].map(([label, value, Icon]) => (
          <div
            key={label}
            className="rounded-xl border bg-white p-4"
          >
            <div className="flex justify-between text-xs text-slate-500">
              <span>{label}</span>
              <Icon size={16} />
            </div>

            <div className="mt-2 text-xl font-bold">
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs font-semibold">
            From Date

            <input
              type="date"
              value={from}
              onChange={e =>
                setFrom(e.target.value)
              }
              className="mt-1 h-10 w-full rounded-lg border px-3"
            />
          </label>

          <label className="text-xs font-semibold">
            To Date

            <input
              type="date"
              value={to}
              onChange={e =>
                setTo(e.target.value)
              }
              className="mt-1 h-10 w-full rounded-lg border px-3"
            />
          </label>

          <label className="text-xs font-semibold">
            Type

            <select
              className="mt-1 h-10 w-full rounded-lg border px-3"
              value={type}
              onChange={e =>
                setType(e.target.value)
              }
            >
              <option>All</option>

              {Object.keys(CATEGORIES).map(t => (
                <option key={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold">
            Status

            <select
              className="mt-1 h-10 w-full rounded-lg border px-3"
              value={status}
              onChange={e =>
                setStatus(e.target.value)
              }
            >
              {[
                'All',
                'Paid',
                'Pending',
                'Cancelled',
              ].map(s => (
                <option key={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold">
            Search Expense

            <div className="relative mt-1">
              <Search
                size={15}
                className="absolute left-3 top-3 text-slate-400"
              />

              <input
                value={query}
                onChange={e =>
                  setQuery(e.target.value)
                }
                placeholder="Description / Vendor / No."
                className="h-10 w-full rounded-lg border pl-9 pr-3 text-sm"
              />
            </div>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Default: current month.
            Totals include USD only and exclude cancelled expenses.
          </span>

          <button
            type="button"
            onClick={() => {
              setFrom('');
              setTo('');
              setQuery('');
              setType('All');
              setStatus('All');
            }}
            className="rounded-lg border px-3 py-1.5 font-semibold"
          >
            All Dates / Reset Filters
          </button>
        </div>
      </div>

      {/* EXPENSES BY CATEGORY */}
      {!!byCategory.length && (
        <div className="rounded-xl border bg-white p-4">
          <h3 className="mb-3 text-sm font-bold">
            Expenses by Category
            (USD, excluding Cancelled)
          </h3>

          <div className="flex flex-wrap gap-2">
            {byCategory.map(([name, amount]) => (
              <span
                key={name}
                className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold"
              >
                {name}: {money(amount)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CURRENCY NOTICE */}
      {filtered.some(
        row => currencyOf(row) !== 'USD'
      ) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Non-USD expenses are shown but not included
          in USD totals. No exchange-rate conversion
          is applied.
        </div>
      )}

      {/* ERRORS */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* EXPENSE TABLE */}
      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-bold">
            All Daily Expenses
          </h3>

          <span className="text-xs text-slate-500">
            {busy
              ? 'Loading...'
              : `${filtered.length} records`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                {[
                  'Date',
                  'Expense No.',
                  'Type / Category',
                  'Description / Supplier',
                  'Amount',
                  'Status',
                  'Payment / Receipt',
                  'Actions',
                ].map(h => (
                  <th
                    key={h}
                    className="whitespace-nowrap p-3 text-left"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {shown.map(row => (
                <tr
                  key={row.id}
                  className="border-t hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap p-3">
                    {dateKey(row.expense_date)}
                  </td>

                  <td className="p-3 font-semibold">
                    {row.expense_no}
                  </td>

                  <td className="p-3">
                    <div className="font-semibold">
                      {row.category}
                    </div>

                    <div className="text-xs text-slate-400">
                      {row.expense_type}
                    </div>
                  </td>

                  <td className="p-3">
                    <div>
                      {row.description || '—'}
                    </div>

                    <div className="text-xs text-slate-500">
                      {row.vendor || '—'}
                    </div>
                  </td>

                  <td
                    className={`p-3 font-bold ${
                      row.status === 'Cancelled'
                        ? 'text-slate-400 line-through'
                        : 'text-red-600'
                    }`}
                  >
                    {currencyOf(row) === 'USD'
                      ? money(row.amount)
                      : `${row.amount} ${currencyOf(row)}`}
                  </td>

                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        row.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : row.status === 'Pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>

                  <td className="p-3 text-xs">
                    <div>
                      {row.payment_method || '—'}
                    </div>

                    <div className="text-slate-500">
                      {row.payment_reference ||
                        row.reference ||
                        '—'}
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="flex gap-1">
                      {row.status !== 'Cancelled' && (
                        <>
                          {/* EDIT */}
                          <button
                            type="button"
                            title="Edit"
                            disabled={actionBusy}
                            onClick={() =>
                              setEditor(row)
                            }
                            className="rounded border p-2 text-blue-600"
                          >
                            <Pencil size={15} />
                          </button>

                          {/* MARK PAID */}
                          {row.status === 'Pending' && (
                            <button
                              type="button"
                              title="Mark paid"
                              disabled={actionBusy}
                              onClick={() =>
                                setEditor({
                                  ...row,
                                  status: 'Paid',
                                })
                              }
                              className="rounded border p-2 text-emerald-600"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}

                          {/* CANCEL */}
                          <button
                            type="button"
                            title="Cancel expense"
                            disabled={actionBusy}
                            onClick={() =>
                              cancelExpense(row)
                            }
                            className="rounded border p-2 text-red-600"
                          >
                            <Ban size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {!shown.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-10 text-center text-slate-500"
                  >
                    {busy
                      ? 'Loading expense records...'
                      : 'No expenses for this selection.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between border-t p-4 text-xs text-slate-500">
          <span>
            Page {page} of {pages}
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage(p => p - 1)
              }
              className="rounded-lg border px-3 py-2 disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={page >= pages}
              onClick={() =>
                setPage(p => p + 1)
              }
              className="rounded-lg border px-3 py-2 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ADD / EDIT EXPENSE MODAL */}
      {editor && (
        <ExpenseEditor
          record={editor?.id ? editor : null}
          onClose={() => setEditor(null)}
          onSaved={saved}
        />
      )}
    </div>
  );
}
