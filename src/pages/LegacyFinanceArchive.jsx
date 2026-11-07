import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/apiClient.js";

// ERPNext archive is a historical snapshot; never call live finance write APIs here.
const pretty = (value) => value === null || value === undefined || value === "" ? "—" : String(value);
const money = (value, currency = "USD") => {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${currency || "USD"} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : pretty(value);
};
const asArray = (value) => Array.isArray(value) ? value : [];

function Field({ label, value }) {
  return <div className="min-w-0 rounded-lg border bg-slate-50 p-3">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="mt-1 break-words font-medium text-slate-800">{pretty(value)}</div>
  </div>;
}

function JsonPreview({ label, rows }) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return <details className="rounded-lg border bg-white p-3">
    <summary className="cursor-pointer font-semibold text-slate-800">{label} ({rows.length})</summary>
    <div className="mt-3 max-h-80 overflow-auto">
      <pre className="whitespace-pre-wrap break-all rounded bg-slate-50 p-3 text-xs">{JSON.stringify(rows, null, 2)}</pre>
    </div>
  </details>;
}

export default function LegacyFinanceArchive({ kind = "invoices" }) {
  const isInvoice = kind === "invoices";
  const path = `/legacy-finance/${isInvoice ? "invoices" : "payments"}`;
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [customer, setCustomer] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, last_page: 1 });
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");

  useEffect(() => { setPage(1); setInput(""); setSearch(""); setStatus(""); setCustomer(""); setCustomerSearch(""); setRows([]); setDetail(null); }, [kind]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setDetail(null);
    apiClient.get(path, { page, per_page: 25, search, customer_id: customerSearch, status })
      .then((response) => {
        if (!active) return;
        if (!Array.isArray(response?.data) || !response?.meta) throw new Error("Unexpected archive response");
        setRows(response.data);
        setMeta(response.meta);
      })
      .catch((e) => { if (active) { setError(e.message || "Archive request failed"); setRows([]); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, page, search, customerSearch, status]);

  const openDetail = async (name) => {
    setDetailLoading(true);
    setDetailError("");
    setDetail(null);
    try {
      const response = await apiClient.get(`${path}/${encodeURIComponent(name)}`);
      if (!response?.data || response.data.name !== name) throw new Error("Unexpected archive detail response");
      setDetail(response.data);
    } catch (e) {
      setDetailError(e.message || "Unable to fetch document");
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = isInvoice
    ? ["Invoice", "Customer", "Date", "Status", "Grand Total", "Outstanding", "Action"]
    : ["Payment", "Party", "Date", "Status", "Paid", "Allocated", "Action"];

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ERPNext Historical {isInvoice ? "Invoices" : "Payments"}</h1>
        <p className="mt-1 text-sm text-slate-500">Archived snapshot · Read-only · Not included in live finance totals</p>
      </div>
      <Link to="/finance" className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">Back to Live Finance</Link>
    </div>

    <div className="flex flex-wrap gap-2">
      <Link to="/finance/legacy-invoices" className={`rounded-lg px-4 py-2 text-sm ${isInvoice ? "bg-blue-600 text-white" : "border bg-white"}`}>Historical Invoices</Link>
      <Link to="/finance/legacy-payments" className={`rounded-lg px-4 py-2 text-sm ${!isInvoice ? "bg-blue-600 text-white" : "border bg-white"}`}>Historical Payments</Link>
    </div>

    <div className="rounded-xl border bg-white p-4">
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(input.trim()); setCustomerSearch(customer.trim()); }} className="flex flex-wrap gap-2">
        <input className="min-w-48 flex-1 rounded-lg border px-3 py-2 text-sm" maxLength={100} placeholder={isInvoice ? "Invoice number..." : "Payment number..."} value={input} onChange={(e) => setInput(e.target.value)} />
        <input className="min-w-40 flex-1 rounded-lg border px-3 py-2 text-sm" maxLength={191} placeholder="Exact Customer ID..." value={customer} onChange={(e) => setCustomer(e.target.value)} />
        <select aria-label="Status" className="rounded-lg border px-3 py-2 text-sm" value={status} onChange={(e) => {setStatus(e.target.value); setPage(1);}}>
          <option value="">All statuses</option>
          {(isInvoice ? ["Paid", "Overdue", "Cancelled", "Draft"] : ["Submitted", "Cancelled", "Draft"]).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Search</button>
        <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => { setInput(""); setCustomer(""); setSearch(""); setCustomerSearch(""); setStatus(""); setPage(1); }}>Clear</button>
      </form>
      <p className="mt-3 text-sm text-slate-500">Archive records found: <strong>{Number(meta.total || 0).toLocaleString()}</strong></p>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {loading && <p className="mt-3 text-sm text-slate-500">Loading archived records...</p>}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50"><tr>{columns.map((x) => <th key={x} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold">{x}</th>)}</tr></thead>
          <tbody>{!loading && rows.map((r) => <tr key={r.name} className="border-t">
            <td className="whitespace-nowrap px-3 py-3 font-semibold">{r.name}</td>
            <td className="px-3 py-3">{pretty(isInvoice ? r.customer_id : r.party_id)}</td>
            <td className="whitespace-nowrap px-3 py-3">{pretty(r.posting_date)}</td>
            <td className="px-3 py-3">{pretty(r.status)}</td>
            <td className="whitespace-nowrap px-3 py-3">{money(isInvoice ? r.grand_total : r.paid_amount, isInvoice ? r.currency : "USD")}</td>
            <td className="whitespace-nowrap px-3 py-3">{money(isInvoice ? r.outstanding_amount : r.allocated_amount, isInvoice ? r.currency : "USD")}</td>
            <td className="px-3 py-3"><button type="button" className="font-semibold text-blue-600 hover:underline" onClick={() => openDetail(r.name)}>View</button></td>
          </tr>)}</tbody>
        </table>
        {!loading && rows.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No archived documents match these filters.</p>}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button type="button" disabled={loading || page <= 1} onClick={() => setPage((x) => Math.max(1, x - 1))} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Previous</button>
        <span className="text-sm">Page {page} of {Number(meta.last_page || 1)}</span>
        <button type="button" disabled={loading || page >= Number(meta.last_page || 1)} onClick={() => setPage((x) => x + 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Next</button>
      </div>
    </div>

    {(detailLoading || detailError || detail) && <section className="space-y-4 rounded-xl border bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="text-lg font-bold">{detail?.name || "Document details"}</h2><p className="text-xs text-slate-500">Original ERPNext record · Read only</p></div>
        <button type="button" className="rounded-lg border px-3 py-1 text-sm" onClick={() => {setDetail(null);setDetailError("");}}>Close</button>
      </div>
      {detailLoading && <p className="text-sm text-slate-500">Loading details...</p>}
      {detailError && <p role="alert" className="text-sm text-red-600">{detailError}</p>}
      {detail && <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Document status" value={`${pretty(detail.status)} (${pretty(detail.docstatus)})`} />
          <Field label={isInvoice ? "Customer" : "Party"} value={isInvoice ? detail.customer : detail.party} />
          <Field label="Posting date" value={detail.posting_date} />
          <Field label="Modified" value={detail.modified} />
          <Field label={isInvoice ? "Grand total" : "Paid amount"} value={money(isInvoice ? detail.grand_total : detail.paid_amount, isInvoice ? detail.currency : detail.paid_from_account_currency)} />
          <Field label={isInvoice ? "Outstanding" : "Allocated"} value={money(isInvoice ? detail.outstanding_amount : detail.total_allocated_amount)} />
          <Field label={isInvoice ? "Currency" : "Unallocated"} value={isInvoice ? detail.currency : money(detail.unallocated_amount)} />
          <Field label={isInvoice ? "Due date" : "Payment type"} value={isInvoice ? detail.due_date : detail.payment_type} />
        </div>
        {isInvoice ? <>
          <JsonPreview label="Invoice line items" rows={asArray(detail.items)} />
          <JsonPreview label="Packages" rows={asArray(detail.packages)} />
          <JsonPreview label="Payment schedule" rows={asArray(detail.payment_schedule)} />
        </> : <JsonPreview label="Invoice allocations / References" rows={asArray(detail.references)} />}
        <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-semibold">Original JSON (staff only)</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all bg-slate-50 p-3 text-xs">{JSON.stringify(detail, null, 2)}</pre></details>
      </>}
    </section>}
  </div>;
}
