import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Users, FileText, Receipt, CreditCard, CircleDollarSign, ShieldAlert } from 'lucide-react';
import { getTestData } from '../services/testDataService.js';

const SECTIONS = [
  { key: 'customers', title: 'Test Customers', icon: Users, id: 'customer_id' },
  { key: 'quotations', title: 'Test Quotations', icon: FileText, id: 'quotation_no' },
  { key: 'invoices', title: 'Test Invoices', icon: Receipt, id: 'invoice_no' },
  { key: 'payments', title: 'Test Payments', icon: CreditCard, id: 'payment_no' },
  { key: 'incomes', title: 'Test Incomes', icon: CircleDollarSign, id: 'income_no' },
];

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export default function TestDataManagement() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getTestData();
      setData(result && typeof result === 'object' ? result : {});
    } catch (err) {
      setError(
        err?.status === 403
          ? 'អ្នកមិនមានសិទ្ធិ test-data.manage ដើម្បីមើល Test Data ទេ។ សូមទាក់ទងអ្នកគ្រប់គ្រងប្រព័ន្ធ។'
          : err?.status === 401
            ? 'Session ផុតកំណត់។ សូម Login ម្ដងទៀត។'
            : err?.message || 'មិនអាចទាញយក Test Data បានទេ។'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Test Data Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            View isolated test records without modifying production records.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Read-only view. This page does not create, edit, delete, or mark existing invoices as test records.
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <ShieldAlert size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Unable to load Test Data</p>
            <p className="mt-1">{error}</p>
            <button type="button" onClick={load} className="mt-2 font-semibold underline">
              Try again
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {SECTIONS.map(({ key, title, icon: Icon }) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{title}</span>
              <Icon size={19} className="text-slate-400" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {loading ? '—' : Array.isArray(data[key]) ? data[key].length : 0}
            </p>
            <p className="mt-1 text-xs text-slate-400">Test records</p>
          </div>
        ))}
      </div>

      {SECTIONS.map(({ key, title, id }) => {
        const rows = Array.isArray(data[key]) ? data[key] : [];

        return (
          <section key={key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <h2 className="font-bold text-slate-800">{title}</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {loading ? 'Loading…' : `${rows.length} records`}
              </span>
            </div>

            {loading ? (
              <p className="p-5 text-sm text-slate-500">Loading records…</p>
            ) : error ? (
              <p className="p-5 text-sm text-slate-500">Data unavailable.</p>
            ) : rows.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No test records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3">Reference</th>
                      <th className="whitespace-nowrap px-4 py-3">Name / Description</th>
                      <th className="whitespace-nowrap px-4 py-3">Status</th>
                      <th className="whitespace-nowrap px-4 py-3">Amount</th>
                      <th className="whitespace-nowrap px-4 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, index) => (
                      <tr key={row.id ?? row[id] ?? index} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-blue-700">
                          {displayValue(row[id] ?? row.customer_id ?? row.id)}
                        </td>
                        <td className="px-4 py-3">
                          {displayValue(
                            row.name ??
                            row.customer_name ??
                            row.description ??
                            row.product_name ??
                            row.notes
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {displayValue(row.status ?? row.finance_status)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {row.amount !== undefined || row.grand_total !== undefined
                            ? `$${Number(row.amount ?? row.grand_total ?? 0).toFixed(2)}`
                            : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                          {displayValue(row.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
