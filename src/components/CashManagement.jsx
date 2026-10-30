import React, { useCallback, useEffect, useState } from 'react';
import {
  listCashAccounts,
  listCashTransactions,
} from '../services/cashApi.js';

const formatAmount = (amount, currency) => {
  const value = Number(amount ?? 0);

  if (!Number.isFinite(value)) return '—';

  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })} ${currency || ''}`;
};

export default function CashManagement() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [accountList, transactionPage] = await Promise.all([
        listCashAccounts(),
        listCashTransactions({
          per_page: 25,
          page,
          ...(selectedAccount
            ? { cash_account_id: selectedAccount }
            : {}),
        }),
      ]);

      setAccounts(Array.isArray(accountList) ? accountList : []);
      setTransactions(
        Array.isArray(transactionPage?.data)
          ? transactionPage.data
          : []
      );
      setLastPage(Math.max(1, Number(transactionPage?.last_page) || 1));
    } catch (err) {
      setError(err.message || 'Unable to load cash management data.');
    } finally {
      setLoading(false);
    }
  }, [page, selectedAccount]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Cash Management</h2>
          <p className="text-sm text-slate-500">
            Cash and bank accounts · Transaction history
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh Cash Data'}
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="border-b p-4">
          <h3 className="font-bold">Cash / Bank Accounts</h3>
          <p className="text-xs text-slate-500">
            Opening balance only — not current available balance.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Account', 'Type', 'Currency', 'Opening Balance', 'Status'].map((heading) => (
                  <th key={heading} className="p-3">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-t">
                  <td className="p-3 font-semibold">{account.name}</td>
                  <td className="p-3">{account.account_type}</td>
                  <td className="p-3">{account.currency}</td>
                  <td className="p-3">
                    {formatAmount(account.opening_balance, account.currency)}
                  </td>
                  <td className="p-3">
                    {account.is_active ? 'Active' : 'Inactive'}
                  </td>
                </tr>
              ))}
              {!loading && accounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-5 text-center text-slate-500">
                    No cash or bank accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h3 className="font-bold">Cash Transactions</h3>

          <select
            aria-label="Filter by cash account"
            value={selectedAccount}
            onChange={(event) => {
              setSelectedAccount(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">All Accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Date', 'Account', 'Type', 'Description', 'Amount'].map((heading) => (
                  <th key={heading} className="p-3">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-t">
                  <td className="whitespace-nowrap p-3">
                    {transaction.transaction_at
                      ? String(transaction.transaction_at).replace('T', ' ').slice(0, 19)
                      : '—'}
                  </td>
                  <td className="p-3">
                    {transaction.cash_account?.name || transaction.cash_account_id}
                  </td>
                  <td className="p-3">{transaction.transaction_type}</td>
                  <td className="p-3">{transaction.description}</td>
                  <td className="whitespace-nowrap p-3 font-semibold">
                    {formatAmount(transaction.amount, transaction.currency)}
                  </td>
                </tr>
              ))}
              {!loading && transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-5 text-center text-slate-500">
                    No cash transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-3 border-t p-4">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-sm text-slate-600">
            Page {page} / {lastPage}
          </span>

          <button
            type="button"
            disabled={loading || page >= lastPage}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
