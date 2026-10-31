import React, { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import {
  listFinancialClosings,
  exportFinancialClosings,
} from '../services/financialClosingApi.js';

const initialFilters = {
  period_type: '',
  currency: '',
  status: '',
};

function formatAmount(value, currency) {
  const number = Number(value ?? 0);
  return `${currency === 'KHR' ? '៛' : '$'}${number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`;
}

export default function FinancialClosing() {
  const [filters, setFilters] = useState(initialFilters);
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [selectedClosing, setSelectedClosing] = useState(null);
  const [reopenReason, setReopenReason] = useState('');
  const [closingForm, setClosingForm] = useState({
    period_type: 'Daily',
    period_start: '',
    currency: 'USD',
  });


  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await listFinancialClosings({
        ...filters,
        page,
        per_page: 20,
      });

      const payload = response?.data ?? response;
      const pagination = Array.isArray(payload)
        ? { data: payload, last_page: 1 }
        : payload;

      setRecords(Array.isArray(pagination?.data) ? pagination.data : []);
      setLastPage(Math.max(1, Number(pagination?.last_page || 1)));
    } catch (err) {
      setError(err.message || 'Unable to load financial closings.');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  function changeFilter(name, value) {
    setFilters(current => ({ ...current, [name]: value }));
    setPage(1);
  }

  async function downloadExcel() {
    setExporting(true);
    setError('');

    try {
      await exportFinancialClosings(filters);
    } catch (err) {
      setError(err.message || 'Unable to download Excel.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="bg-white border rounded-2xl overflow-hidden">
      <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-lg">Financial Closing</h2>
          <p className="text-xs text-slate-500 mt-1">
            Daily / Monthly closing history and Excel reports
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="px-3 py-2 border rounded-lg text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            type="button"
            onClick={downloadExcel}
            disabled={exporting}
            className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={15} />
            {exporting ? 'Exporting...' : 'Download Excel'}
          </button>
        </div>
      </div>

      <div className="p-4 border-b bg-slate-50">
        <h3 className="font-semibold text-slate-800">Create Financial Closing</h3>
        <p className="text-xs text-amber-700 mt-1">
          Preparation only — financial closing is not enabled yet.
        </p>

        <div className="grid gap-3 sm:grid-cols-3 mt-4">
          <label className="text-sm">
            <span className="block text-xs font-semibold mb-1">Closing Type</span>
            <select
              value={closingForm.period_type}
              onChange={event => setClosingForm(current => ({
                ...current,
                period_type: event.target.value,
                period_start: '',
              }))}
              className="w-full h-10 border rounded-lg px-3"
            >
              <option value="Daily">Daily Closing</option>
              <option value="Monthly">Monthly Closing</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="block text-xs font-semibold mb-1">
              {closingForm.period_type === 'Monthly' ? 'Closing Month' : 'Closing Date'}
            </span>
            <input
              type={closingForm.period_type === 'Monthly' ? 'month' : 'date'}
              value={
                closingForm.period_type === 'Monthly'
                  ? closingForm.period_start.slice(0, 7)
                  : closingForm.period_start
              }
              onChange={event => setClosingForm(current => ({
                ...current,
                period_start: current.period_type === 'Monthly'
                  ? `${event.target.value}-01`
                  : event.target.value,
              }))}
              className="w-full h-10 border rounded-lg px-3"
            />
          </label>

          <label className="text-sm">
            <span className="block text-xs font-semibold mb-1">Currency</span>
            <select
              value={closingForm.currency}
              onChange={event => setClosingForm(current => ({
                ...current,
                currency: event.target.value,
              }))}
              className="w-full h-10 border rounded-lg px-3"
            >
              <option value="USD">USD</option>
              <option value="KHR">KHR</option>
            </select>
          </label>
        </div>

        <button
          type="button"
          disabled
          className="mt-4 px-5 py-2 bg-slate-300 text-slate-600 rounded-lg text-sm font-semibold cursor-not-allowed"
        >
          Confirm Closing (Coming Soon)
        </button>
      </div>

      <div className="p-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="block text-xs font-semibold mb-1">Period</span>
          <select
            value={filters.period_type}
            onChange={event => changeFilter('period_type', event.target.value)}
            className="w-full h-10 border rounded-lg px-3"
          >
            <option value="">All Periods</option>
            <option value="Daily">Daily</option>
            <option value="Monthly">Monthly</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="block text-xs font-semibold mb-1">Currency</span>
          <select
            value={filters.currency}
            onChange={event => changeFilter('currency', event.target.value)}
            className="w-full h-10 border rounded-lg px-3"
          >
            <option value="">All Currencies</option>
            <option value="USD">USD</option>
            <option value="KHR">KHR</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="block text-xs font-semibold mb-1">Status</span>
          <select
            value={filters.status}
            onChange={event => changeFilter('status', event.target.value)}
            className="w-full h-10 border rounded-lg px-3"
          >
            <option value="">All Statuses</option>
            <option value="Closed">Closed</option>
            <option value="Reopened">Reopened</option>
          </select>
        </label>
      </div>

      {error && (
        <div role="alert" className="mx-4 mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                'Period', 'Start', 'End', 'Currency', 'Income',
                'Expense', 'Closing Balance', 'Status', 'Closed By', 'Actions',
              ].map(heading => (
                <th key={heading} className="p-3 text-left text-xs whitespace-nowrap">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {records.map(record => (
              <tr key={record.id} className="border-t">
                <td className="p-3">{record.period_type}</td>
                <td className="p-3 whitespace-nowrap">{String(record.period_start || '').slice(0, 10)}</td>
                <td className="p-3 whitespace-nowrap">{String(record.period_end || '').slice(0, 10)}</td>
                <td className="p-3">{record.currency}</td>
                <td className="p-3 whitespace-nowrap text-emerald-700">
                  {formatAmount(record.total_income, record.currency)}
                </td>
                <td className="p-3 whitespace-nowrap text-red-600">
                  {formatAmount(record.total_expense, record.currency)}
                </td>
                <td className="p-3 whitespace-nowrap font-semibold">
                  {formatAmount(record.closing_balance, record.currency)}
                </td>
                <td className="p-3">{record.status}</td>
                <td className="p-3">{record.closer?.name || '—'}</td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClosing(record);
                      setReopenReason('');
                    }}
                    className="px-3 py-1.5 border rounded-lg text-xs font-semibold"
                  >
                    View Audit / Reopen
                  </button>
                </td>
              </tr>
            ))}

            {!loading && records.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-500">
                  No financial closing records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedClosing && (
        <div className="p-4 border-t bg-slate-50 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">Audit History / Reopen</h3>
              <p className="text-xs text-slate-500">
                {selectedClosing.period_type} · {String(selectedClosing.period_start || '').slice(0, 10)}
                {' · '}{selectedClosing.currency} · {selectedClosing.status}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedClosing(null)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              Close
            </button>
          </div>

          <div className="text-sm space-y-1">
            <p><strong>Closed by:</strong> {selectedClosing.closer?.name || '—'}</p>
            <p><strong>Closed at:</strong> {selectedClosing.closed_at || '—'}</p>
            <p><strong>Reopened by:</strong> {selectedClosing.reopener?.name || '—'}</p>
            <p><strong>Reopened at:</strong> {selectedClosing.reopened_at || '—'}</p>
            <p><strong>Reopen reason:</strong> {selectedClosing.reopen_reason || '—'}</p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Audit Events</h4>
            {Array.isArray(selectedClosing.audits) && selectedClosing.audits.length > 0 ? (
              <div className="space-y-2">
                {selectedClosing.audits.map(audit => (
                  <div key={audit.id} className="p-3 bg-white border rounded-lg text-sm">
                    <div className="font-semibold">{audit.action}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      {audit.performer?.name || 'Unknown user'} · {audit.performed_at || '—'}
                    </div>
                    <div className="text-xs mt-1">
                      {audit.previous_status || '—'} → {audit.new_status || '—'}
                    </div>
                    {audit.reason && (
                      <p className="text-xs mt-1">Reason: {audit.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No audit events available.</p>
            )}
          </div>

          {selectedClosing.status === 'Closed' && (
            <div className="border-t pt-4">
              <label className="block text-sm font-semibold mb-2">
                Reopen Reason (10–1000 characters)
              </label>
              <textarea
                value={reopenReason}
                onChange={event => setReopenReason(event.target.value)}
                maxLength={1000}
                rows={3}
                className="w-full border rounded-lg p-3 text-sm"
                placeholder="Explain why this financial period needs to be reopened..."
              />
              <p className="text-xs text-slate-500 mt-1">
                {reopenReason.length}/1000 characters
              </p>
              <button
                type="button"
                disabled
                className="mt-3 px-4 py-2 bg-slate-300 text-slate-600 rounded-lg text-sm cursor-not-allowed"
              >
                Confirm Reopen (Coming Soon)
              </button>
              <p className="text-xs text-amber-700 mt-2">
                Reopen is disabled until permissions and confirmation are verified.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="p-4 border-t flex items-center justify-between text-sm">
        <span className="text-slate-500">
          {loading ? 'Loading...' : `Page ${page} of ${lastPage}`}
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => setPage(current => current - 1)}
            className="px-3 py-2 border rounded-lg disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={loading || page >= lastPage}
            onClick={() => setPage(current => current + 1)}
            className="px-3 py-2 border rounded-lg disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
