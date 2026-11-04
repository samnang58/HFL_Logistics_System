import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/apiClient.js";

const show = (value) =>
  value === null || value === undefined || value === ""
    ? "—"
    : String(value);

export default function LegacyPackageBrowser() {
  const navigate = useNavigate();

  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setDetail(null);

    apiClient
      .get("/legacy-packages", {
        page,
        per_page: 25,
        search,
      })
      .then((response) => {
        if (!active) return;

        const data = response?.data;

        if (!data || !Array.isArray(data.data)) {
          throw new Error("Invalid historical package response");
        }

        setResult(data);
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
  }, [page, search]);

  async function openPackage(id) {
    setDetail(null);
    setError("");

    try {
      const response = await apiClient.get(
        `/legacy-packages/${encodeURIComponent(id)}`
      );

      setDetail(response?.data || null);
    } catch (err) {
      setError(err.message);
    }
  }

  const rows = result?.data || [];
  const lastPage = Number(result?.last_page || 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Historical Packages
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ERPNext archived data · Read only
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/hfl-package")}
          className="rounded-lg border px-4 py-2 text-sm font-semibold"
        >
          Back to Live Packages
        </button>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(input.trim());
          }}
        >
          <input
            className="flex-1 min-w-48 rounded-lg border px-3 py-2 text-sm"
            placeholder="Package ID, Customer ID, Tracking..."
            value={input}
            maxLength={120}
            onChange={(e) => setInput(e.target.value)}
          />

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Search
          </button>

          <button
            type="button"
            className="rounded-lg border px-4 py-2 text-sm"
            onClick={() => {
              setInput("");
              setSearch("");
              setPage(1);
            }}
          >
            Clear
          </button>
        </form>

        <div className="mt-3 text-sm text-slate-600">
          Historical packages found:{" "}
          <strong>{Number(result?.total || 0).toLocaleString()}</strong>
        </div>

        {loading && (
          <p className="mt-4 text-sm text-slate-500">Loading...</p>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        {!loading && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Package ID",
                    "Customer",
                    "Tracking",
                    "Shipping Date",
                    "Status",
                    "Weight",
                    "CBM",
                    "Details",
                  ].map((title) => (
                    <th
                      key={title}
                      className="px-3 py-3 text-left text-xs font-semibold"
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-3 font-medium">
                      {show(p.legacy_package_id)}
                    </td>

                    <td className="px-3 py-3">
                      {p.customer_record_id ? (
                        <button
                          type="button"
                          className="text-blue-600 hover:underline"
                          onClick={() =>
                            navigate(`/customer/${p.customer_record_id}`)
                          }
                        >
                          {show(p.customer_id)}
                        </button>
                      ) : (
                        show(p.customer_id)
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className="block max-w-40 truncate"
                        title={p.tracking_raw || ""}
                      >
                        {show(p.tracking_raw)}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      {show(p.shipping_date)}
                    </td>

                    <td className="px-3 py-3">
                      {show(p.source_status)}
                    </td>

                    <td className="px-3 py-3">
                      {show(p.weight_kg)}
                    </td>

                    <td className="px-3 py-3">
                      {show(p.volume_cbm)}
                    </td>

                    <td className="px-3 py-3">
                      <button
                        type="button"
                        className="font-semibold text-blue-600 hover:underline"
                        onClick={() => openPackage(p.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {rows.length === 0 && (
              <p className="p-5 text-center text-slate-500">
                No historical packages found.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-between items-center">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border px-3 py-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-sm">
            Page {page} of {lastPage}
          </span>

          <button
            type="button"
            disabled={page >= lastPage || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border px-3 py-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {detail && (
        <section className="rounded-xl border bg-white p-5 space-y-4">
          <div className="flex justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">
                {show(detail.legacy_package_id)}
              </h2>
              <p className="text-xs text-slate-500">
                Historical Package Details · Read only
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">Customer</div>
              {show(detail.customer_id)}
            </div>
            <div>
              <div className="text-xs text-slate-500">Container ID</div>
              {show(detail.legacy_container_id)}
            </div>
            <div>
              <div className="text-xs text-slate-500">Status</div>
              {show(detail.source_status)}
            </div>
            <div>
              <div className="text-xs text-slate-500">Shipping Mode</div>
              {show(detail.shipping_mode)}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold">Original Tracking</div>
            <div className="mt-2 rounded bg-slate-50 p-3 text-xs break-all whitespace-pre-wrap">
              {show(detail.tracking_raw)}
            </div>
          </div>

          <div>
            <h3 className="font-semibold">
              Tracking History ({detail.history_count || 0})
            </h3>

            <div className="mt-3 max-h-80 overflow-y-auto border-l-2 border-blue-200 pl-4 space-y-3">
              {(detail.history || []).map((event) => (
                <div key={event.id}>
                  <div className="font-medium text-sm">
                    {show(event.status)}
                    {Number(event.is_return) === 1 ? " · Return" : ""}
                  </div>
                  <div className="text-xs text-slate-500">
                    {show(event.event_at)}
                  </div>
                </div>
              ))}
            </div>

            {Number(detail.history_count || 0) > 500 && (
              <p className="mt-2 text-xs text-amber-700">
                Only the first 500 events are shown.
              </p>
            )}
          </div>

          <div>
            <h3 className="font-semibold">
              Historical Items ({detail.item_count})
            </h3>

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["Item Code", "Item", "Qty", "Price"].map((x) => (
                      <th key={x} className="px-3 py-2 text-left">
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {(detail.items || []).map((item, index) => (
                    <tr key={index} className="border-t">
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
        </section>
      )}
    </div>
  );
}
