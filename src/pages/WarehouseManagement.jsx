import React, { useEffect, useState } from "react";
import {
  Pencil,
  Warehouse,
  Phone,
  MapPin,
  Globe2,
  Save,
  X,
  RefreshCw,
} from "lucide-react";

import {
  listWarehouses,
  updateWarehouse,
} from "../services/warehouseApi.js";

const emptyForm = {
  code: "",
  name: "",
  country: "China",
  shipping_mode: "LAND",
  address: "",
  contact_name: "",
  phone: "",
  receiving_requirement: "",
  status: "active",
};

export default function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await listWarehouses();
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load warehouses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (warehouse) => {
    setForm({
      id: warehouse.id,
      code: warehouse.code || "",
      name: warehouse.name || "",
      country: warehouse.country || "",
      shipping_mode: warehouse.shipping_mode || "LAND",
      address: warehouse.address || "",
      contact_name: warehouse.contact_name || "",
      phone: warehouse.phone || "",
      receiving_requirement: warehouse.receiving_requirement || "",
      status: warehouse.status || "active",
    });

    setModal("edit");
    setError("");
  };

  const closeModal = () => {
    if (saving) return;
    setModal(null);
    setForm(emptyForm);
  };

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const save = async () => {
    if (!form.id) {
      setError("Warehouse record is required.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
    };

    try {
      await updateWarehouse(form.id, payload);

      closeModal();
      await load();
    } catch (e) {
      setError(e?.message || "Unable to save warehouse.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Warehouse size={26} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Warehouse Management
            </h1>

            <p className="text-sm text-slate-500">
              Manage warehouse addresses, phone numbers and receiving
              information.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={load}
            className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold flex items-center gap-2 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm text-slate-500">
            Total Warehouses
          </div>

          <div className="text-2xl font-bold text-slate-900 mt-1">
            {warehouses.length}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm text-slate-500">
            Active Warehouses
          </div>

          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {
              warehouses.filter(
                (w) =>
                  String(w.status).toLowerCase() === "active"
              ).length
            }
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm text-slate-500">
            Inactive Warehouses
          </div>

          <div className="text-2xl font-bold text-red-500 mt-1">
            {
              warehouses.filter(
                (w) =>
                  String(w.status).toLowerCase() !== "active"
              ).length
            }
          </div>
        </div>
      </div>

      {/* Warehouse List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">
            Warehouse List
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            Data is loaded from Laravel API and MySQL.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400">
            Loading warehouses...
          </div>
        ) : warehouses.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            No warehouses found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {warehouses.map((warehouse) => (
              <div
                key={warehouse.id}
                className="p-5 hover:bg-slate-50"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Warehouse size={22} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900">
                          {warehouse.name}
                        </h3>

                        <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
                          {warehouse.code}
                        </span>

                        <span
                          className={
                            String(warehouse.status).toLowerCase() ===
                            "active"
                              ? "px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold"
                              : "px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-semibold"
                          }
                        >
                          {warehouse.status}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <div className="flex gap-2">
                          <Globe2
                            size={16}
                            className="text-blue-600 mt-0.5 shrink-0"
                          />
                          <span>{warehouse.country}</span>
                        </div>

                        <div className="flex gap-2">
                          <MapPin
                            size={16}
                            className="text-blue-600 mt-0.5 shrink-0"
                          />
                          <span>
                            {warehouse.address || "No address"}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Phone
                            size={16}
                            className="text-blue-600 mt-0.5 shrink-0"
                          />
                          <span>
                            {warehouse.phone || "No phone"}
                          </span>
                        </div>
                      </div>

                      {warehouse.receiving_requirement && (
                        <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-800">
                          <b>Receiving Requirement:</b>{" "}
                          {warehouse.receiving_requirement}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 lg:shrink-0">
                    <button
                      onClick={() => openEdit(warehouse)}
                      className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold flex items-center gap-2 hover:bg-slate-50"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">
                  Edit Warehouse Location
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  Only warehouse phone and address can be edited.
                </p>
              </div>

              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 grid gap-5">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Warehouse
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900">
                    {form.name || "Warehouse"}
                  </h3>

                  {form.code && (
                    <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
                      {form.code}
                    </span>
                  )}

                  {form.shipping_mode && (
                    <span className="px-2 py-1 rounded-full bg-violet-50 text-violet-600 text-xs font-semibold">
                      {form.shipping_mode === "SEA"
                        ? "🚢 SEA"
                        : form.shipping_mode === "AIR"
                          ? "✈️ AIR"
                          : "🚚 LAND"}
                    </span>
                  )}

                  {form.country && (
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                      {form.country}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  System information is read-only. Only phone number and address can be changed.
                </p>
              </div>

              <label className="text-sm font-medium">
                Warehouse Phone
                <input
                  className="mt-1 w-full h-11 border border-slate-200 rounded-lg px-3"
                  value={form.phone}
                  onChange={(e) =>
                    updateField("phone", e.target.value)
                  }
                  placeholder="+8618219585523"
                />
              </label>

              <label className="text-sm font-medium">
                Address
                <textarea
                  className="mt-1 w-full min-h-28 border border-slate-200 rounded-lg px-3 py-2"
                  value={form.address}
                  onChange={(e) =>
                    updateField("address", e.target.value)
                  }
                  placeholder="Warehouse address"
                />
              </label>
            </div>

            <div className="p-5 border-t flex justify-end gap-2">
              <button
                onClick={closeModal}
                disabled={saving}
                className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={save}
                disabled={saving}
                className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
