import React, { useCallback, useEffect, useState } from 'react';
import {
  listCashAccounts,
  listCashTransactions,
  createCashAccount,
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
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountFormError, setAccountFormError] = useState('');
  const [accountForm, setAccountForm] = useState({
    name: '',
    account_type: 'Cash',
    currency: 'USD',
    opening_balance: '0',
  });

  const submitAccount = async (event) => {
    event.preventDefault();
    if (savingAccount) return;

    setAccountFormError('');
    const name = accountForm.name.trim();
    const currency = accountForm.currency.trim().toUpperCase();
    const openingBalance = Number(accountForm.opening_balance);

    if (!name || name.length > 150) {
      setAccountFormError('Account Name must be 1–150 characters.');
      return;
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      setAccountFormError('Currency must contain 3 letters, e.g. USD or KHR.');
      return;
    }
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      setAccountFormError('Opening Balance must be zero or greater.');
      return;
    }

    setSavingAccount(true);
    try {
      await createCashAccount({
        name,
        account_type: accountForm.account_type,
        currency,
        opening_balance: openingBalance,
      });
      setAccountForm({
        name: '',
        account_type: 'Cash',
        currency: 'USD',
        opening_balance: '0',
      });
      setShowAccountForm(false);
      await load();
    } catch (err) {
      setAccountFormError(err.message || 'Unable to create cash account.');
    } finally {
      setSavingAccount(false);
    }
  };

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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h3 className="font-bold">Cash / Bank Accounts</h3>
            <p className="text-xs text-slate-500">
              Opening balance only — not current available balance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAccountForm((current) => !current);
              setAccountFormError('');
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {showAccountForm ? 'Cancel' : 'Add Cash/Bank Account'}
          </button>
        </div>

        {showAccountForm && (
          <form onSubmit={submitAccount} className="grid gap-3 border-b bg-slate-50 p-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Account Name</span>
              <input
                required
                maxLength={150}
                value={accountForm.name}
                onChange={(e) => setAccountForm((current) => ({ ...current, name: e.target.value }))}
                className="w-full rounded-lg border bg-white px-3 py-2"
                placeholder="e.g. Main Cash"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Account Type</span>
              <select
                value={accountForm.account_type}
                onChange={(e) => setAccountForm((current) => ({ ...current, account_type: e.target.value }))}
                className="w-full rounded-lg border bg-white px-3 py-2"
              >
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Currency</span>
              <input
                required
                maxLength={3}
                value={accountForm.currency}
                onChange={(e) => setAccountForm((current) => ({ ...current, currency: e.target.value.toUpperCase() }))}
                className="w-full rounded-lg border bg-white px-3 py-2"
                placeholder="USD"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Opening Balance</span>
              <input
                required
                type="number"
                min="0"
                step="0.0001"
                value={accountForm.opening_balance}
                onChange={(e) => setAccountForm((current) => ({ ...current, opening_balance: e.target.value }))}
                className="w-full rounded-lg border bg-white px-3 py-2"
              />
            </label>
            {accountFormError && (
              <p role="alert" className="text-sm text-red-700 md:col-span-2">
                {accountFormError}
              </p>
            )}
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={savingAccount}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {savingAccount ? 'Saving...' : 'Save Account'}
              </button>
            </div>
          </form>
        )}

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
