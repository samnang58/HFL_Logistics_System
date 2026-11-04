import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient.js";

const show = (v) =>
  v === null || v === undefined || v === ""
    ? "—"
    : String(v);

export default function LegacyPackageInlineRows({
  search = "",
  onTotal,
}) {
  const [query, setQuery] = useState(search);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery(search);
      setPage(1);
      setDetail(null);
    }, 350);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    apiClient.get("/legacy-packages", {
      search: query,
      page,
      per_page: 25,
    })
      .then((response) => {
        if (!active) return;

        const data = response?.data;

        if (!data || !Array.isArray(data.data)) {
          throw new Error("Invalid historical package response");
        }

        setResult(data);
        onTotal?.(Number(data.total || 0));
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query, page, onTotal]);

  async function openDetails(id) {
    setDetail(null);
    setDetailLoading(true);
    setError("");

    try {
      const response = await apiClient.get(
        `/legacy-packages/${encodeURIComponent(id)}`
      );

      setDetail(response?.data || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  }

  const rows = result?.data || [];
  const total = Number(result?.total || 0);
  const lastPage = Number(result?.last_page || 1);

  return (
    <>
      {loading && (
        <tr>
          <td colSpan={11} className="px-4 py-5 text-slate-500">
            Loading old package records...
          </td>
        </tr>
      )}

      {error && (
        <tr>
          <td colSpan={11} className="px-4 py-4 text-red-600">
            {error}
          </td>
        </tr>
      )}

      {!loading && rows.map((p) => (
        <tr
          key={`legacy-${p.id}`}
          className="border-t border-slate-100 bg-slate-50/60 hover:bg-slate-100"
        >
          <td className="px-4 py-3">
            <div className="font-bold text-slate-800">
              {show(p.legacy_package_id)}
            </div>
            <span className="mt-1 inline-block rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
              OLD
            </span>
            <div
              className="mt-1 max-w-44 truncate text-[11px] text-slate-500"
              title={p.tracking_raw || ""}
            >
              {show(p.tracking_raw)}
            </div>
          </td>

          <td className="px-4 py-3">
            {show(p.customer_id)}
          </td>

          <td className="px-4 py-3 text-slate-500">
            ERPNext record
          </td>

          <td className="px-4 py-3">
            {p.item_count} items
          </td>

          <td className="px-4 py-3">
            {show(p.volume_cbm)}
          </td>

          <td className="px-4 py-3">
            {show(p.weight_kg)} KG
          </td>

          <td className="px-4 py-3 text-slate-500">
            —
          </td>

          <td className="px-4 py-3">
            {show(p.shipping_mode)}
          </td>

          <td className="px-4 py-3">
            {show(p.source_status)}
          </td>

          <td className="px-4 py-3">
            <span className="whitespace-nowrap rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600">
              Archived
            </span>
          </td>

          <td className="px-4 py-3">
            <button
              type="button"
              onClick={() => openDetails(p.id)}
              className="font-semibold text-blue-600 hover:underline"
            >
              View
            </button>
          </td>
        </tr>
      ))}

      {!loading && rows.length === 0 && !error && (
        <tr>
          <td colSpan={11} className="p-4 text-center text-slate-500">
            No matching old packages.
          </td>
        </tr>
      )}

      <tr className="border-t bg-slate-50">
        <td colSpan={11} className="px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-600">
              Old records: <strong>{total.toLocaleString()}</strong>
              {" · "}Page {page} of {lastPage}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border bg-white px-3 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={loading || page >= lastPage}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border bg-white px-3 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </td>
      </tr>

      {detailLoading && (
        <tr>
          <td colSpan={11} className="p-4 text-slate-500">
            Loading old package details...
          </td>
        </tr>
      )}

      {detail && (
        <tr>
          <td colSpan={11} className="p-4">
            <div className="rounded-xl border bg-white p-5 space-y-4">
              <div className="flex justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">
                    {show(detail.legacy_package_id)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    ERPNext package information
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="rounded border px-3 py-1 text-sm"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div>
                  <div className="text-xs text-slate-500">Customer</div>
                  {show(detail.customer_id)}
                </div>
                <div>
                  <div className="text-xs text-slate-500">Container</div>
                  {show(detail.legacy_container_id)}
                </div>
                <div>
                  <div className="text-xs text-slate-500">Status</div>
                  {show(detail.source_status)}
                </div>
                <div>
                  <div className="text-xs text-slate-500">Shipping Date</div>
                  {show(detail.shipping_date)}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold">
                  Original Tracking
                </div>
                <div className="mt-2 rounded bg-slate-50 p-3 text-xs break-all whitespace-pre-wrap">
                  {show(detail.tracking_raw)}
                </div>
              </div>

              <div>
                <h4 className="font-semibold">
                  Tracking History ({detail.history_count || 0})
                </h4>
                <div className="mt-3 max-h-80 overflow-y-auto border-l-2 border-blue-200 pl-4">
                  {(detail.history || []).map((event) => (
                    <div key={event.id} className="mb-3">
                      <div className="text-sm font-semibold">
                        {show(event.status)}
                        {Number(event.is_return) === 1
                          ? " · Return"
                          : ""}
                      </div>
                      <div className="text-xs text-slate-500">
                        {show(event.event_at)}
                      </div>
                    </div>
                  ))}
                </div>
                {Number(detail.history_count || 0) > 500 && (
                  <p className="text-xs text-amber-700">
                    Showing first 500 events only.
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-semibold">
                  Items ({detail.item_count})
                </h4>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {["Item Code", "Item", "Qty", "Price"].map(
                          (name) => (
                            <th
                              key={name}
                              className="px-3 py-2 text-left"
                            >
                              {name}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.items || []).map((item, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">
                            {show(item.item_code)}
                          </td>
                          <td className="px-3 py-2">
                            {show(item.item_name)}
                          </td>
                          <td className="px-3 py-2">
                            {show(item.quantity_raw)}
                          </td>
                          <td className="px-3 py-2">
                            {show(item.price_raw)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
