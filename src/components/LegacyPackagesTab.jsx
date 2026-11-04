import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient.js';

const text = (value) =>
  value === null || value === undefined || value === ''
    ? '—'
    : String(value);

const numeric = (value, digits = 2) =>
  value === null || value === undefined || value === ''
    ? '—'
    : Number(value).toFixed(digits);

export default function LegacyPackagesTab({ customerId }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError('');
    setDetail(null);

    apiClient.get(
      `/customers/${encodeURIComponent(customerId)}/legacy-packages`,
      { page, per_page: 25 }
    )
      .then((response) => {
        if (!active) return;

        const data = response?.data;

        if (!data || !Array.isArray(data.data)) {
          throw new Error('Invalid historical package response');
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
  }, [customerId, page]);

  async function openDetails(archiveId) {
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);

    try {
      const response = await apiClient.get(
        `/customers/${encodeURIComponent(customerId)}` +
        `/legacy-packages/${encodeURIComponent(archiveId)}`
      );

      setDetail(response?.data || null);
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">
        Loading historical packages...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-white p-6 text-sm text-red-600">
        {error}
      </div>
    );
  }

  const packages = result?.data || [];
  const total = Number(result?.total || 0);
  const current = Number(result?.current_page || page);
  const last = Number(result?.last_page || 1);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="font-bold text-slate-900">
              Old Packages / ប្រវត្តិទំនិញចាស់
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              ERPNext historical records — read only
            </p>
          </div>
          <div className="text-sm font-semibold text-blue-700">
            {total.toLocaleString()} packages
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  'Package ID',
                  'Tracking',
                  'Shipping Date',
                  'Mode',
                  'Status',
                  'Weight',
                  'CBM',
                  'Items',
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-3 py-3 text-left text-xs font-semibold text-slate-600"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {packages.map((p) => (
                <tr key={p.id} className="border-t align-top">
                  <td className="px-3 py-3 font-medium">
                    {text(p.legacy_package_id)}
                  </td>
                  <td
                    className="px-3 py-3 text-xs max-w-48"
                    title={p.tracking_raw || ''}
                  >
                    <span className="block truncate max-w-48">
                      {text(p.tracking_raw)}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {text(p.shipping_date)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {text(p.shipping_mode)}
                  </td>
                  <td className="px-3 py-3">
                    {text(p.source_status)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {numeric(p.weight_kg)} KG
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {numeric(p.volume_cbm, 3)}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => openDetails(p.id)}
                      className="text-blue-600 hover:underline font-semibold whitespace-nowrap"
                    >
                      View ({p.item_count})
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {packages.length === 0 && (
            <div className="p-6 text-center text-slate-500 text-sm">
              No historical packages for this customer.
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-4 gap-3">
          <button
            type="button"
            disabled={current <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-2 rounded border text-sm disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-xs text-slate-600">
            Page {current} of {last}
          </span>

          <button
            type="button"
            disabled={current >= last}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-2 rounded border text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </section>

      {detailLoading && (
        <div className="rounded-xl border bg-white p-4 text-sm">
          Loading package items...
        </div>
      )}

      {detailError && (
        <div className="rounded-xl border bg-white p-4 text-sm text-red-600">
          {detailError}
        </div>
      )}

      {detail && (
        <section className="rounded-xl border bg-white p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-lg">
                {text(detail.legacy_package_id)}
              </h3>
              <div className="text-xs text-slate-500">
                Historical Package Details
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="px-3 py-1.5 rounded border text-sm"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-slate-500 text-xs">Status</div>
              <div>{text(detail.source_status)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Shipping Mode</div>
              <div>{text(detail.shipping_mode)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Weight</div>
              <div>{numeric(detail.weight_kg)} KG</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">CBM</div>
              <div>{numeric(detail.volume_cbm, 3)}</div>
            </div>
          </div>

          <div>
            <div className="font-semibold text-sm mb-2">
              Original Container ID (ERPNext)
            </div>
            <div className="p-3 rounded bg-slate-50 text-sm break-all">
              {text(detail.legacy_container_id)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Historical reference only — container details
              have not been migrated yet.
            </p>
          </div>

          <div>
            <div className="font-semibold text-sm mb-2">
              Original Tracking
            </div>
            <div className="p-3 rounded bg-slate-50 text-xs break-all whitespace-pre-wrap">
              {text(detail.tracking_raw)}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">
              Tracking History ({(detail.history || []).length})
            </h4>

            {Array.isArray(detail.history) && detail.history.length > 0 ? (
              <ol className="border-l-2 border-blue-200 ml-2 space-y-4">
                {detail.history.map((event) => (
                  <li key={event.id} className="relative pl-5">
                    <span
                      className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-blue-600"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-slate-800">
                        {text(event.status)}
                      </span>

                      {Number(event.is_return) === 1 && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          Return
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mt-1">
                      {text(event.event_at)}
                    </div>

                    {event.return_at && (
                      <div className="text-xs text-amber-700 mt-1">
                        Return Date: {text(event.return_at)}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">
                No historical tracking events for this package.
              </p>
            )}
          </div>

          <div>
            <h4 className="font-semibold mb-3">
              Historical Items ({detail.item_count})
            </h4>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Item Code', 'Item', 'UOM', 'Qty', 'Price'].map(
                      (label) => (
                        <th
                          key={label}
                          className="px-3 py-2 text-left text-xs"
                        >
                          {label}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(detail.items || []).map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">
                        {text(item.item_code)}
                      </td>
                      <td className="px-3 py-2">
                        {text(item.item_name)}
                      </td>
                      <td className="px-3 py-2">
                        {text(item.uom)}
                      </td>
                      <td className="px-3 py-2">
                        {text(item.quantity_raw)}
                      </td>
                      <td className="px-3 py-2">
                        {text(item.price_raw)}
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
