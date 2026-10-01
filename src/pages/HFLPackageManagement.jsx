import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle, AlertTriangle, ArrowRight, Building2, CheckCircle2,
  Clock3, Eye, Filter, MapPin, Package, Pencil, Plus, Search,
  RefreshCw, RotateCcw, Ship, Truck, Warehouse, X
} from "lucide-react";
import { formatHflDateTime } from '../utils/dateTime.js';
import { ProductThumb } from '../components/ProductImages.jsx';
import {
  createPackage,
  listPackages,
  updatePackage,
  syncChinaPackages,
  listChinaSyncLogs,
  uploadPackageImages,
  deletePackageImage,
} from "../services/packageApiService.js";

const CORE_STATUSES = [
  "Order Created",
  "Received at China Warehouse",
  "Waiting Shipment",
  "Loading",
  "Departed China",
  "In Transit",
  "Arrived Cambodia",
  "Cambodia Warehouse",
  "Measurement Completed",
  "Ready for Billing",
  "Invoiced",
  "Partially Paid",
  "Ready for Delivery",
  "Scheduled",
  "Out for Delivery",
  "Delivered",
  "Problem / Exception",
  "Returned",
  "Cancelled",
];

// Legacy values remain available only when an existing record already uses them.
const LEGACY_STATUSES = ["Waiting Supplier", "Inspection", "Measurement", "Customs", "Cambodia Port"];
const STATUSES = [...CORE_STATUSES, ...LEGACY_STATUSES];

const MODES = ["SEA", "LAND", "AIR", "EXPRESS", "SPECIAL"];

const STATUS_GROUPS = [
  { key: "all", label: "All Packages", match: () => true },
  {
    key: "china",
    label: "China Warehouse",
    match: (p) =>
      ["Received at China Warehouse", "Inspection", "Measurement", "Waiting Shipment", "Loading"].includes(p.status),
  },
  {
    key: "transit",
    label: "In Transit",
    match: (p) => ["Departed China", "In Transit"].includes(p.status),
  },
  {
    key: "cambodia",
    label: "Cambodia",
    match: (p) => ["Arrived Cambodia", "Cambodia Warehouse"].includes(p.status),
  },
  {
    key: "delivery",
    label: "Ready / Delivery",
    match: (p) => ["Ready for Delivery", "Out for Delivery"].includes(p.status),
  },
  { key: "delivered", label: "Delivered", match: (p) => p.status === "Delivered" },
  {
    key: "exception",
    label: "Exceptions",
    match: (p) => p.status === "Problem / Exception" || p.status === "Cancelled",
  },
];

const emptyBox = { length: "", width: "", height: "", quantity: 1, unit: "cm", weight: "" };
const emptyForm = {
  code: "",
  trackingNumber: "",
  customerId: "",
  customerName: "",
  supplier: "",
  productName: "",
  productCategory: "",
  quantity: 1,
  shippingMode: "SEA",
  pricingType: "GC",
  fromWarehouse: "Guangzhou - HFL",
  toWarehouse: "Phnom Penh - HFL",
  status: "Received at China Warehouse",
  shippingDate: new Date().toISOString().slice(0, 10),
  eta: "",
  notes: "",
  boxes: [{ ...emptyBox }],
};

const tone = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  red: "bg-rose-50 text-rose-700 border-rose-100",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
};

function statusTone(status = "") {
  const s = status.toLowerCase();
  if (s.includes("problem") || s.includes("cancel") || s.includes("return")) return tone.red;
  if (s === "delivered" || s === "ready for delivery" || s === "out for delivery") return tone.emerald;
  if (s.includes("billing") || s.includes("invoice") || s.includes("paid") || s.includes("measurement")) return tone.amber;
  if (s.includes("wait") || s.includes("inspection")) return tone.amber;
  return tone.blue;
}

function nextAction(p) {
  const status = String(p.status || "").trim();
  if (!p.customerId) return { label: "Assign Customer", tone: "amber", route: null };
  if (["Arrived Cambodia", "Cambodia Warehouse", "Measurement Completed"].includes(status))
    return { label: "Open Cambodia Warehouse", tone: "emerald", route: `/cambodia-warehouse?package=${encodeURIComponent(p.id)}` };
  if (status === "Ready for Billing")
    return { label: "Open Billing", tone: "amber", route: `/accounting/sales-invoice?package=${encodeURIComponent(p.id)}&autoCreate=0` };
  if (["Invoiced", "Partially Paid"].includes(status))
    return { label: "Open Billing", tone: "amber", route: `/accounting/sales-invoice?package=${encodeURIComponent(p.id)}&autoCreate=0` };
  if (["Ready for Delivery", "Scheduled", "Out for Delivery"].includes(status))
    return { label: "Open Delivery", tone: "emerald", route: `/delivery?package=${encodeURIComponent(p.id)}` };
  if (status === "Problem / Exception")
    return { label: "Resolve Exception", tone: "red", route: `/hfl-package/${encodeURIComponent(p.id)}` };
  if (status === "Returned")
    return { label: "Review Return", tone: "red", route: `/hfl-package/${encodeURIComponent(p.id)}` };
  if (status === "Delivered") return { label: "Completed", tone: "slate", route: `/hfl-package/${encodeURIComponent(p.id)}` };
  if (!p.totalCbm && !p.totalWeight) return { label: "Measure Package", tone: "amber", route: `/cambodia-warehouse?package=${encodeURIComponent(p.id)}` };
  if (["Received at China Warehouse", "Waiting Shipment", "Loading"].includes(status))
    return { label: "Prepare Shipment", tone: "blue", route: `/shipments?package=${encodeURIComponent(p.id)}` };
  if (["Departed China", "In Transit"].includes(status))
    return { label: "Track Movement", tone: "blue", route: `/tracking?package=${encodeURIComponent(p.id)}` };
  return { label: "Review Package", tone: "slate", route: `/hfl-package/${encodeURIComponent(p.id)}` };
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${props.className || ""}`}
    />
  );
}

function PhotoManager({ pkg, onChanged }) {
  const [china, setChina] = useState(pkg.chinaImages || []);
  const [custom, setCustom] = useState(pkg.customImages || []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setChina(pkg.chinaImages || []);
    setCustom(pkg.customImages || []);
  }, [pkg.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (updated) => {
    setChina(updated.chinaImages || []);
    setCustom(updated.customImages || []);
    onChanged?.();
  };

  const onPick = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    setBusy(true);
    setMessage("");
    try {
      apply(await uploadPackageImages(pkg.id, files));
      setMessage(`${files.length} photo(s) uploaded.`);
    } catch (error) {
      setMessage(error?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (url) => {
    if (!window.confirm("Remove this photo?")) return;
    setBusy(true);
    setMessage("");
    try {
      apply(await deletePackageImage(pkg.id, url));
    } catch (error) {
      setMessage(error?.message || "Could not remove the photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-900">Product Photos</div>
          <div className="text-xs text-slate-500">
            Photos from the China API are read-only. Photos you upload here are kept when China is synced again.
          </div>
        </div>
        <label className={`inline-flex h-9 cursor-pointer items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 ${busy ? "opacity-50 pointer-events-none" : ""}`}>
          {busy ? "Working..." : "+ Upload photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onPick} />
        </label>
      </div>

      {message && <div className="mt-2 text-xs font-semibold text-slate-600">{message}</div>}

      <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
        {china.map((src) => (
          <div key={src} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200">
            <img src={src} alt="China" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            <span className="absolute bottom-0 left-0 rounded-tr bg-black/70 px-1 text-[9px] font-bold text-white">China</span>
          </div>
        ))}
        {custom.map((src) => (
          <div key={src} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200">
            <img src={src} alt="Uploaded" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(src)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white"
              title="Remove"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {!china.length && !custom.length && (
          <div className="col-span-full py-4 text-center text-xs text-slate-400">No photo yet.</div>
        )}
      </div>
    </div>
  );
}

function Modal({ open, onClose, onSubmit, editing, busy, onPhotosChanged }) {
  const [form, setForm] = useState(editing || emptyForm);

  useEffect(() => setForm(editing || emptyForm), [editing]);

  if (!open) return null;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setBox = (index, key, value) =>
    setForm((f) => ({
      ...f,
      boxes: f.boxes.map((b, i) => (i === index ? { ...b, [key]: value } : b)),
    }));

  const boxCbm = (b) =>
    ((Number(b.length) || 0) *
      (Number(b.width) || 0) *
      (Number(b.height) || 0) *
      (Number(b.quantity) || 0)) /
    (b.unit === "m" ? 1 : b.unit === "mm" ? 1e9 : 1e6);

  const totalCbm = form.boxes.reduce((sum, b) => sum + boxCbm(b), 0);
  const totalWeight = form.boxes.reduce((sum, b) => sum + (Number(b.weight) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editing ? "Edit Package" : "Receive / Create Package"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Use manual entry only when the China source does not provide the package.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X size={19} /></button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
          className="space-y-6 p-5"
        >
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="mb-3 text-sm font-bold text-slate-900">1. Package Identification</div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Package Code"><Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="Auto-generated" /></Field>
              <Field label="China Tracking Number"><Input value={form.trackingNumber} onChange={(e) => set("trackingNumber", e.target.value)} placeholder="Tracking / waybill" /></Field>
              <Field label="Customer ID"><Input required value={form.customerId} onChange={(e) => set("customerId", e.target.value)} placeholder="HFL00001" /></Field>
              <Field label="Customer Name"><Input required value={form.customerName} onChange={(e) => set("customerName", e.target.value)} /></Field>
              <Field label="Supplier"><Input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} /></Field>
              <Field label="Product / Goods"><Input required value={form.productName} onChange={(e) => set("productName", e.target.value)} /></Field>
              <Field label="Category"><Input value={form.productCategory} onChange={(e) => set("productCategory", e.target.value)} /></Field>
              <Field label="Quantity"><Input type="number" min="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} /></Field>
              <Field label="Shipping Mode">
                <select value={form.shippingMode} onChange={(e) => set("shippingMode", e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
                  {MODES.map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Pricing Type">
                <select value={form.pricingType || "GC"} onChange={(e) => set("pricingType", e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
                  <option value="GC">GC</option>
                  <option value="SC">SC</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">2. Warehouse & Movement</div>
                <p className="text-xs text-slate-500">Define where the package is now and where it is going.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Current / China Warehouse"><Input value={form.fromWarehouse} onChange={(e) => set("fromWarehouse", e.target.value)} /></Field>
              <Field label="Destination Warehouse"><Input value={form.toWarehouse} onChange={(e) => set("toWarehouse", e.target.value)} /></Field>
              <Field label="Operational Status">
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  disabled={!!editing}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {editing ? (
                    <option value={form.status}>{form.status || 'Current Status'}</option>
                  ) : (
                    <>
                      <option value="Order Created">Order Created</option>
                      <option value="Received at China Warehouse">Received at China Warehouse</option>
                    </>
                  )}
                </select>
                {editing && (
                  <span className="mt-1 block text-[11px] text-slate-400">
                    Status changes must be completed from the operational workflow page.
                  </span>
                )}
              </Field>
              <Field label="ETA"><Input type="date" value={form.eta} onChange={(e) => set("eta", e.target.value)} /></Field>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">3. Boxes & Measurement</div>
                <p className="text-xs text-slate-500">CBM = Length × Width × Height × Quantity.</p>
              </div>
              <button type="button" onClick={() => setForm((f) => ({ ...f, boxes: [...f.boxes, { ...emptyBox }] }))} className="inline-flex h-9 items-center gap-1 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700">
                <Plus size={14} /> Add Box
              </button>
            </div>

            <div className="space-y-2">
              {form.boxes.map((b, i) => (
                <div key={i} className="grid gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-7">
                  <Input type="number" min="0" step="0.01" placeholder="Length" value={b.length} onChange={(e) => setBox(i, "length", e.target.value)} />
                  <Input type="number" min="0" step="0.01" placeholder="Width" value={b.width} onChange={(e) => setBox(i, "width", e.target.value)} />
                  <Input type="number" min="0" step="0.01" placeholder="Height" value={b.height} onChange={(e) => setBox(i, "height", e.target.value)} />
                  <Input type="number" min="1" placeholder="Qty" value={b.quantity} onChange={(e) => setBox(i, "quantity", e.target.value)} />
                  <select value={b.unit} onChange={(e) => setBox(i, "unit", e.target.value)} className="h-10 rounded-lg border border-slate-200 px-2 text-sm">
                    <option>cm</option><option>m</option><option>mm</option>
                  </select>
                  <Input type="number" min="0" step="0.01" placeholder="Weight KG" value={b.weight} onChange={(e) => setBox(i, "weight", e.target.value)} />
                  <div className="flex items-center justify-between text-xs font-bold text-blue-700">
                    {boxCbm(b).toFixed(3)} CBM
                    <button type="button" disabled={form.boxes.length === 1} onClick={() => setForm((f) => ({ ...f, boxes: f.boxes.filter((_, n) => n !== i) }))} className="text-rose-500 disabled:opacity-30"><X size={15} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-blue-50 p-4">
                <div className="text-xs text-slate-500">Total CBM</div>
                <div className="mt-1 text-2xl font-bold text-blue-700">{totalCbm.toFixed(3)} m³</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Total Weight</div>
                <div className="mt-1 text-2xl font-bold">{totalWeight.toFixed(2)} KG</div>
              </div>
            </div>
          </div>

          {editing?.id && <PhotoManager pkg={editing} onChanged={onPhotosChanged} />}

          <Field label="Operational Remarks"><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500" placeholder="Damage, missing information, special handling..." /></Field>

          <div className="flex justify-end gap-2 border-t pt-4">
            <button type="button" onClick={onClose} className="h-10 rounded-lg border px-4 text-sm">Cancel</button>
            <button disabled={busy} className="h-10 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? "Saving..." : editing ? "Save Changes" : "Create Package"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, title, value, color = "blue", onClick }) {
  const cls = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-700",
  }[color];

  return (
    <button onClick={onClick} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cls}`}><Icon size={19} /></div>
        <div><div className="text-xs text-slate-500">{title}</div><div className="mt-0.5 text-xl font-bold text-slate-900">{value}</div></div>
      </div>
    </button>
  );
}

function EmptyState({ loading }) {
  return (
    <div className="py-16 text-center">
      <Package className="mx-auto text-slate-300" size={40} />
      <div className="mt-3 text-sm font-semibold text-slate-700">{loading ? "Loading packages..." : "No packages match this view"}</div>
      <div className="mt-1 text-xs text-slate-400">Change the filters or sync the China source.</div>
    </div>
  );
}

export default function HFLPackageManagement() {
  const nav = useNavigate();
  const [filters, setFilters] = useState({ search: "", status: "All Status", shippingMode: "All Modes" });
  const [view, setView] = useState("all");
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [logs, setLogs] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPackages(await listPackages(filters));
    } catch (e) {
      setError(e?.message || "Unable to load packages. Check API authentication.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { listChinaSyncLogs().then(setLogs).catch(() => setLogs([])); }, [syncResult]);

  const counts = useMemo(() => Object.fromEntries(STATUS_GROUPS.map((g) => [g.key, packages.filter(g.match).length])), [packages]);
  const totalCbm = packages.reduce((s, p) => s + Number(p.totalCbm || 0), 0);
  const totalWeight = packages.reduce((s, p) => s + Number(p.totalWeight || 0), 0);

  const visiblePackages = useMemo(() => {
    const group = STATUS_GROUPS.find((g) => g.key === view) || STATUS_GROUPS[0];
    return packages.filter(group.match);
  }, [packages, view]);

  const doSync = async () => {
    setSyncing(true); setSyncResult(null); setError("");
    try {
      const result = await syncChinaPackages();
      setSyncResult(result);
      await load();
    } catch (e) {
      setError(e?.message || "China API sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  const save = async (form) => {
    setBusy(true); setError("");
    try {
      const saved = editing
        ? await updatePackage(editing.id, form)
        : await createPackage(form);

      setModal(false);
      setEditing(null);
      await load();

      const packageId = saved?.id || editing?.id;
      if (packageId && ["Arrived Cambodia", "Cambodia Warehouse", "Measurement Completed"].includes(form.status)) {
        nav(`/cambodia-warehouse?package=${encodeURIComponent(packageId)}`);
      } else if (packageId && ["Ready for Billing", "Invoiced", "Partially Paid"].includes(form.status)) {
        nav(`/accounting/sales-invoice?package=${encodeURIComponent(packageId)}&autoCreate=0`);
      } else if (packageId && ["Ready for Delivery", "Scheduled", "Out for Delivery"].includes(form.status)) {
        nav(`/delivery?package=${encodeURIComponent(packageId)}`);
      }
    } catch (e) {
      setError(e?.message || "Unable to save package.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => setFilters({ search: "", status: "All Status", shippingMode: "All Modes" });

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
            <Package size={15} /> Logistics Operations <ArrowRight size={13} /> Package Center
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Package Control Center</h1>
          <p className="mt-1 text-sm text-slate-500">Control packages from China receiving through Cambodia delivery.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={doSync} disabled={syncing} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing China..." : "Sync China"}
          </button>
          <button onClick={() => { setEditing(null); setModal(true); }} className="inline-flex h-10 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700">
            <Plus size={16} /> Receive Package
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {syncResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          China sync: <b>{syncResult.received ?? 0}</b> received · <b>{syncResult.created ?? 0}</b> created · <b>{syncResult.updated ?? 0}</b> updated · <b>{syncResult.duplicates ?? 0}</b> duplicates.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Stat icon={Package} title="All Packages" value={counts.all} onClick={() => setView("all")} />
        <Stat icon={Warehouse} title="China Warehouse" value={counts.china} color="amber" onClick={() => setView("china")} />
        <Stat icon={Ship} title="In Transit" value={counts.transit} onClick={() => setView("transit")} />
        <Stat icon={Building2} title="Cambodia" value={counts.cambodia} color="emerald" onClick={() => setView("cambodia")} />
        <Stat icon={Truck} title="Delivery Queue" value={counts.delivery} color="emerald" onClick={() => setView("delivery")} />
        <Stat icon={CheckCircle2} title="Delivered" value={counts.delivered} color="slate" onClick={() => setView("delivered")} />
        <Stat icon={AlertTriangle} title="Exceptions" value={counts.exception} color="red" onClick={() => setView("exception")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Current Volume</div>
          <div className="mt-1 text-2xl font-bold text-blue-700">{totalCbm.toFixed(3)} m³</div>
          <div className="mt-1 text-xs text-slate-400">{totalWeight.toFixed(2)} KG across loaded records</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Operational Queue</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{counts.china + counts.cambodia + counts.delivery}</div>
          <div className="mt-1 text-xs text-slate-400">Packages requiring operational attention</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Last China Sync</div>
          <div className="mt-1 text-sm font-bold text-slate-900">{logs[0]?.synced_at ? formatHflDateTime(logs[0].synced_at) : "Not synced yet"}</div>
          <div className="mt-1 text-xs text-slate-400">Use Sync China after new waybills are available.</div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
        <div className="text-xs font-bold uppercase tracking-wide text-blue-700">Operational Workflow</div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
          {["China", "In Transit", "Cambodia Receive", "Measure", "Ready for Billing", "Invoice", "Payment", "Delivery", "Delivered"].map((step, i) => (
            <React.Fragment key={step}>
              <span className="rounded-full bg-white px-2.5 py-1 border border-blue-100">{step}</span>
              {i < 8 && <ArrowRight size={13} className="text-blue-300" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            {STATUS_GROUPS.map((g) => (
              <button key={g.key} onClick={() => setView(g.key)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === g.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {g.label} <span className="ml-1 opacity-70">{counts[g.key]}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[280px] flex-1">
              <span className="mb-1 block text-xs font-semibold text-slate-600">Find Package</span>
              <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-blue-500">
                <Search size={16} className="text-slate-400" />
                <input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} placeholder="Package ID, tracking, customer, product..." className="w-full text-sm outline-none" />
              </div>
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">Status</span>
              <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
                <option>All Status</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">Mode</span>
              <select value={filters.shippingMode} onChange={(e) => setFilters((f) => ({ ...f, shippingMode: e.target.value }))} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
                <option>All Modes</option>{MODES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <button onClick={reset} className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm"><RotateCcw size={15} /> Reset</button>
            <button onClick={load} className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm"><RefreshCw size={15} /> Refresh</button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="font-bold text-slate-900">{STATUS_GROUPS.find((g) => g.key === view)?.label || "Packages"}</h2>
            <p className="text-xs text-slate-400">{loading ? "Loading..." : `${visiblePackages.length} package records`}</p>
          </div>
          <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex">
            <Filter size={14} /> Operational view
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1250px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                {["Package", "Customer", "Goods", "Qty / Box", "CBM", "Weight", "Route", "Mode", "Status", "Next Action", ""].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {!loading && visiblePackages.length === 0 ? (
                <tr><td colSpan="11"><EmptyState loading={false} /></td></tr>
              ) : visiblePackages.map((p) => {
                const action = nextAction(p);
                return (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <button onClick={() => nav(`/hfl-package/${encodeURIComponent(p.id)}`)} className="text-left">
                        <div className="font-bold text-blue-700">{p.packageId || p.code || "—"}</div>
                        <div className="mt-0.5 text-[11px] text-slate-400">{p.trackingNumber || "No tracking number"}</div>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{p.customerName || "Unassigned"}</div>
                      <div className="text-[11px] text-slate-400">{p.customerId || "Needs customer"}</div>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductThumb images={p.productImages} />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{p.productName || "—"}</div>
                          <div className="text-[11px] text-slate-400">{p.productCategory || "General goods"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{p.quantity || 0} / {p.boxCount || 0}</td>
                    <td className="px-4 py-3 font-semibold">{Number(p.totalCbm || 0).toFixed(3)}</td>
                    <td className="px-4 py-3">{Number(p.totalWeight || 0).toFixed(2)} KG</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs"><MapPin size={13} className="text-slate-400" /> {p.fromWarehouse || "China"}</div>
                      <div className="mt-1 text-[11px] text-slate-400">→ {p.toWarehouse || "Cambodia"}</div>
                    </td>
                    <td className="px-4 py-3"><span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold">{p.shippingMode || "—"}</span></td>
                    <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(p.status)}`}>{p.status}</span></td>
                    <td className="px-4 py-3">
                      {action.route ? (
                        <button
                          onClick={() => nav(action.route)}
                          className={`whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[11px] font-semibold hover:shadow-sm ${tone[action.tone]}`}
                          title={action.label}
                        >
                          {action.label}
                        </button>
                      ) : (
                        <span className={`whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold ${tone[action.tone]}`}>{action.label}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => nav(`/hfl-package/${encodeURIComponent(p.id)}`)} title="Package 360"><Eye size={16} className="text-blue-600" /></button>
                        <button onClick={() => { setEditing(p); setModal(true); }} title="Edit"><Pencil size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {loading && <EmptyState loading />}
      </div>

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} editing={editing} onSubmit={save} busy={busy} onPhotosChanged={load} />
    </div>
  );
}
