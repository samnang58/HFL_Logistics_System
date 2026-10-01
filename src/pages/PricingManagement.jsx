import React, { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  RotateCcw,
  Calculator,
  Tag,
  X,
} from 'lucide-react'

import {
  calculatePricingQuote,
  createPricing,
  listPricing,
  updatePricing,
  findApplicablePricing,
} from '../services/pricingApi.js'

const MODES = ['SEA', 'LAND', 'AIR']
const ORIGINS = ['Foshan', 'Guangzhou', 'Yiwu', 'China']
const DESTINATION = 'Cambodia Warehouse'

const empty = {
  rateName: '',
  shippingMode: 'SEA',
  pricingType: 'GC',
  origin: 'Guangzhou',
  destination: DESTINATION,
  rateType: 'CBM',
  rate: '',
  currency: 'USD',
  minimumCbm: 1,
  effectiveDate: new Date().toISOString().slice(0, 10),
  expiryDate: '',
  status: 'Active',
}

const money = (n) => `${Number(n || 0).toFixed(2)}`

function Field({ label, children, required = false }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
    </label>
  )
}

function Input(props) {
  return (
    <input
      {...props}
      className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
    />
  )
}

function Stat({ title, value }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <b>{value}</b>
    </div>
  )
}

function Modal({ editing, onClose, onSave }) {
  const [form, setForm] = useState(editing || empty)

  const set = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl max-h-[92vh] overflow-auto">
        <div className="px-5 py-4 border-b flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg">
              {editing ? 'Edit Pricing' : 'Add Pricing'}
            </h2>

            <p className="text-xs text-slate-500">
              Rates are stored in Laravel/MySQL and loaded from the API.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 grid md:grid-cols-2 gap-4"
        >
          <Field label="Rate Name" required>
            <Input
              value={form.rateName}
              onChange={(e) => set('rateName', e.target.value)}
              placeholder="China → Cambodia Land"
              required
            />
          </Field>

          <Field label="Shipping Mode" required>
            <select
              value={form.shippingMode}
              onChange={(e) => set('shippingMode', e.target.value)}
              className="w-full h-10 border rounded-lg px-3 text-sm"
            >
              {MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Pricing Type" required>
            <select
              value={form.pricingType || 'GC'}
              onChange={(e) => set('pricingType', e.target.value)}
              className="w-full h-10 border rounded-lg px-3 text-sm"
            >
              <option value="GC">GC</option>
              <option value="SC">SC</option>
            </select>
          </Field>

          <Field label="China Origin" required>
            <select
              value={form.origin}
              onChange={(e) => set('origin', e.target.value)}
              className="w-full h-10 border rounded-lg px-3 text-sm"
            >
              {ORIGINS.map((origin) => <option key={origin} value={origin}>{origin}</option>)}
            </select>
          </Field>

          <Field label="Cambodia Destination" required>
            <Input value={DESTINATION} readOnly />
          </Field>

          <Field label="Rate Type">
            <select
              value={form.rateType}
              onChange={(e) => set('rateType', e.target.value)}
              className="w-full h-10 border rounded-lg px-3 text-sm"
            >
              <option value="CBM">CBM</option>
              <option value="KG">KG</option>
            </select>
          </Field>

          <Field label="Rate" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.rate}
              onChange={(e) => set('rate', e.target.value)}
              required
            />
          </Field>

          <Field label="Currency">
            <Input
              value={form.currency}
              onChange={(e) =>
                set('currency', e.target.value.toUpperCase())
              }
            />
          </Field>

          <Field label="Minimum CBM">
            <Input
              type="number"
              min="0"
              step="0.001"
              value={form.minimumCbm}
              onChange={(e) => set('minimumCbm', e.target.value)}
            />
          </Field>

          <Field label="Effective Date">
            <Input
              type="date"
              value={form.effectiveDate}
              onChange={(e) => set('effectiveDate', e.target.value)}
            />
          </Field>

          <Field label="Expiry Date">
            <Input
              type="date"
              value={form.expiryDate}
              onChange={(e) => set('expiryDate', e.target.value)}
            />
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="w-full h-10 border rounded-lg px-3 text-sm"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </Field>

          <div className="md:col-span-2 flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 border rounded-lg text-sm"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-semibold"
            >
              {editing ? 'Save Changes' : 'Create Pricing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PricingManagement() {
  const [filters, setFilters] = useState({
    search: '',
    shippingMode: 'All Modes',
    status: 'All Status',
  })

  const [refresh, setRefresh] = useState(0)
  const [pricing, setPricing] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(null)
  const [modal, setModal] = useState(false)

  const [calc, setCalc] = useState({
    shippingMode: 'LAND',
    origin: 'Guangzhou',
    destination: DESTINATION,
    cbm: 2.5,
    weightKg: 0,
    deliveryFee: 0,
    handlingFee: 0,
    warehouseFee: 0,
    otherFee: 0,
    discount: 0,
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listPricing(filters)
      .then((rows) => { if (!cancelled) setPricing(rows) })
      .catch((error) => { if (!cancelled) alert(error.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filters, refresh])

  useEffect(() => {
    let cancelled = false
    findApplicablePricing(calc).then((row) => { if (!cancelled) setSelected(row) })
    return () => { cancelled = true }
  }, [calc.shippingMode, calc.origin, calc.destination])

  const active = pricing.filter((p) => p.status === 'Active')

  const air = pricing.filter(
    (p) => p.shippingMode === 'AIR'
  ).length

  const sea = pricing.filter(
    (p) => p.shippingMode === 'SEA'
  ).length

  const land = pricing.filter(
    (p) => p.shippingMode === 'LAND'
  ).length

  const quote = calculatePricingQuote({
    pricing: selected,
    ...calc,
  })

  const save = async (form) => {
    try {
      if (editing) await updatePricing(editing.id, form)
      else await createPricing(form)
      setModal(false)
      setEditing(null)
      setRefresh((value) => value + 1)
    } catch (error) {
      alert(error.message)
    }
  }

  const resetFilters = () => {
    setFilters({
      search: '',
      shippingMode: 'All Modes',
      status: 'All Status',
    })
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Tag size={20} />
          </div>

          <div>
            <h1 className="text-2xl font-bold">
              HFL Pricing List
            </h1>

            <p className="text-sm text-slate-500">
              Manage configurable shipping rates and calculate shipping charges
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditing(null)
            setModal(true)
          }}
          className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-2"
        >
          <Plus size={16} />
          Add Pricing
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat
          title="Total Pricing"
          value={pricing.length}
        />

        <Stat
          title="Active Rates"
          value={active.length}
        />

        <Stat
          title="Sea Rates"
          value={sea}
        />

        <Stat
          title="Land / Air"
          value={`${land} / ${air}`}
        />
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-xl p-3 flex flex-wrap gap-3 items-end">

        <label className="flex-1 min-w-[230px]">
          <span className="block text-xs font-medium mb-1">
            Search
          </span>

          <div className="h-10 border rounded-lg flex items-center px-3 gap-2">
            <Search
              size={16}
              className="text-slate-400"
            />

            <input
              value={filters.search}
              onChange={(e) =>
                setFilters((current) => ({
                  ...current,
                  search: e.target.value,
                }))
              }
              placeholder="Rate name, route, mode..."
              className="outline-none flex-1 text-sm"
            />
          </div>
        </label>

        <label>
          <span className="block text-xs font-medium mb-1">
            Shipping Mode
          </span>

          <select
            value={filters.shippingMode}
            onChange={(e) =>
              setFilters((current) => ({
                ...current,
                shippingMode: e.target.value,
              }))
            }
            className="h-10 border rounded-lg px-3 text-sm"
          >
            <option>All Modes</option>

            {MODES.map((mode) => (
              <option key={mode}>{mode}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="block text-xs font-medium mb-1">
            Status
          </span>

          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((current) => ({
                ...current,
                status: e.target.value,
              }))
            }
            className="h-10 border rounded-lg px-3 text-sm"
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </label>

        <button
          onClick={resetFilters}
          className="h-10 px-3 border rounded-lg text-sm inline-flex items-center gap-2"
        >
          <RotateCcw size={15} />
          Reset
        </button>
      </div>

      {/* Pricing Table */}
      <div className="bg-white border rounded-xl overflow-hidden">

        <div className="px-4 py-3 border-b">
          <h3 className="font-bold">
            Pricing Rules
          </h3>

          <p className="text-xs text-slate-400">
            {pricing.length} records
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">

            <thead className="bg-slate-50 text-xs">
              <tr>
                {[
                  'Pricing ID',
                  'Rate Name',
                  'Mode',
                  'Origin',
                  'Destination',
                  'Rate Type',
                  'Rate',
                  'Minimum CBM',
                  'Effective',
                  'Expiry',
                  'Status',
                  'Action',
                ].map((header) => (
                  <th
                    key={header}
                    className="text-left px-3 py-3 whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {pricing.map((p) => (
                <tr
                  key={p.id}
                  className="border-t hover:bg-slate-50"
                >
                  <td className="px-3 py-3 font-semibold text-blue-600">
                    {p.pricingId}
                  </td>

                  <td className="px-3">
                    {p.rateName}
                  </td>

                  <td className="px-3">
                    {p.shippingMode}
                  </td>

                  <td className="px-3">
                    {p.origin}
                  </td>

                  <td className="px-3">
                    {p.destination}
                  </td>

                  <td className="px-3">
                    {p.rateType}
                  </td>

                  <td className="px-3 font-semibold">
                    {p.currency} {money(p.rate)} / {p.rateType}
                  </td>

                  <td className="px-3">
                    {Number(p.minimumCbm).toFixed(3)}
                  </td>

                  <td className="px-3">
                    {p.effectiveDate}
                  </td>

                  <td className="px-3">
                    {p.expiryDate || '—'}
                  </td>

                  <td className="px-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        p.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>

                  <td className="px-3">
                    <div className="flex gap-3">

                      <button
                        onClick={() => {
                          setEditing(p)
                          setModal(true)
                        }}
                        className="p-1"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm('Pricing deletion is disabled. Set the rate to Inactive instead.')) {}
                        }}
                        className="p-1"
                      >
                        <Trash2
                          size={16}
                          className="text-red-500"
                        />
                      </button>

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!pricing.length && (
          <div className="p-10 text-center text-slate-500">
            No pricing rules found.
          </div>
        )}
      </div>

      {/* Shipping Calculator */}
      <section className="bg-white border rounded-xl overflow-hidden">

        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Calculator
            size={19}
            className="text-blue-600"
          />

          <div>
            <h2 className="font-bold">
              Shipping Cost Calculator
            </h2>

            <p className="text-xs text-slate-500">
              Uses the active pricing rule for the selected route and mode.
            </p>
          </div>
        </div>

        <div className="p-5 grid lg:grid-cols-3 gap-5">

          <div className="lg:col-span-2 grid md:grid-cols-3 gap-3">

            <Field label="Shipping Mode">
              <select
                value={calc.shippingMode}
                onChange={(e) =>
                  setCalc((current) => ({
                    ...current,
                    shippingMode: e.target.value,
                  }))
                }
                className="w-full h-10 border rounded-lg px-3 text-sm"
              >
                {MODES.map((mode) => (
                  <option key={mode}>{mode}</option>
                ))}
              </select>
            </Field>

            <Field label="Origin">
              <Input
                value={calc.origin}
                onChange={(e) =>
                  setCalc((current) => ({
                    ...current,
                    origin: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Destination">
              <Input
                value={calc.destination}
                onChange={(e) =>
                  setCalc((current) => ({
                    ...current,
                    destination: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Chargeable CBM">
              <Input
                type="number"
                min="0"
                step="0.001"
                value={calc.cbm}
                onChange={(e) =>
                  setCalc((current) => ({
                    ...current,
                    cbm: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Weight KG">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={calc.weightKg}
                onChange={(e) =>
                  setCalc((current) => ({
                    ...current,
                    weightKg: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Delivery Fee">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={calc.deliveryFee}
                onChange={(e) =>
                  setCalc((current) => ({
                    ...current,
                    deliveryFee: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Handling Fee">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={calc.handlingFee}
                onChange={(e) =>
                  setCalc((current) => ({
                    ...current,
                    handlingFee: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Warehouse Fee">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={calc.warehouseFee}
                onChange={(e) =>
                  setCalc((current) => ({
                    ...current,
                    warehouseFee: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Other Fee">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={calc.otherFee}
                onChange={(e) =>
                  setCalc((current) => ({
                    ...current,
                    otherFee: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Discount">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={calc.discount}
                onChange={(e) =>
                  setCalc((current) => ({
                    ...current,
                    discount: e.target.value,
                  }))
                }
              />
            </Field>

          </div>

          {/* Quote */}
          <div className="rounded-xl bg-slate-50 p-5">

            <div className="text-xs text-slate-500">
              Selected Pricing
            </div>

            <div className="font-bold mt-1">
              {selected
                ? selected.rateName
                : 'No active pricing found'}
            </div>

            {selected && (
              <div className="text-sm text-slate-500 mt-1">
                {selected.currency} {money(selected.rate)} /{' '}
                {selected.rateType}
              </div>
            )}

            <div className="mt-5 space-y-3 text-sm">

              <Row
                label="Chargeable"
                value={`${quote.chargeableQuantity.toFixed(
                  selected?.rateType === 'KG' ? 2 : 3
                )} ${selected?.rateType || '—'}`}
              />

              <Row
                label="Shipping Cost"
                value={`${quote.currency} ${money(
                  quote.shippingCost
                )}`}
              />

              <Row
                label="Additional Fees"
                value={`${quote.currency} ${money(
                  quote.subtotal - quote.shippingCost
                )}`}
              />

              <Row
                label="Discount"
                value={`- ${quote.currency} ${money(
                  quote.discount
                )}`}
              />

              <div className="pt-3 border-t flex justify-between font-bold text-lg">
                <span>Grand Total</span>

                <span className="text-blue-600">
                  {quote.currency} {money(quote.grandTotal)}
                </span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Modal */}
      {modal && (
        <Modal
          editing={editing}
          onClose={() => {
            setModal(false)
            setEditing(null)
          }}
          onSave={save}
        />
      )}
    </div>
  )
}