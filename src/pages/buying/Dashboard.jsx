import React from "react";
import {
  ShoppingCart, FileText, Truck, PackageX, Users, Plus, FileSpreadsheet,
  HelpCircle, Box, ClipboardList, Trophy, AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, Dropdown, ViewAllLink } from "../../components/ui/Card.jsx";
import StatCard from "../../components/ui/StatCard.jsx";
import DonutStat from "../../components/ui/DonutStat.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import PageHero from "../../components/ui/PageHero.jsx";
import {
  BUY_STATS, PURCHASE_TREND, PURCHASE_BY_CATEGORY, SUPPLIER_BY_COUNTRY,
  RECENT_PURCHASE_ORDERS, RECENT_PURCHASE_INVOICES, TOP_SUPPLIERS,
  QUICK_ACTIONS, PENDING_ACTIONS,
} from "../../data/buyingData.js";

const STAT_ICONS = [ShoppingCart, FileText, Truck, PackageX, Users];
const QUICK_ICONS = [Plus, FileSpreadsheet, HelpCircle, Users, Box, ClipboardList];

const QUICK_ACTION_PATHS = [
  "/buying/purchase-order",
  "/buying/purchase-invoice",
  "/buying/rfq",
  "/buying/supplier",
  "/stock/item",
  "/buying/material-request",
];

const PO_COLUMNS = [
  { key: "po", label: "PO Number", type: "link", render: (row) => row.po },
  { key: "supplier", label: "Supplier" },
  { key: "orderDate", label: "Order Date" },
  { key: "expected", label: "Expected Date" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "status", label: "Status", type: "status" },
];

const INVOICE_COLUMNS = [
  { key: "invoice", label: "Invoice No.", type: "link" },
  { key: "supplier", label: "Supplier" },
  { key: "date", label: "Invoice Date" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "status", label: "Status", type: "status" },
];

export default function BuyingDashboard() {
  const navigate = useNavigate();

  const go = (path) => navigate(path);

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        icon={ShoppingCart}
        title="Buying"
        tagline="Source. Purchase. Deliver."
        subtitle="Keep Your Business Moving Forward."
        quote="Smart Procurement Stronger Supply Chain"
      />

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {BUY_STATS.map((s, i) => (
          <StatCard
            key={s.label}
            icon={STAT_ICONS[i]}
            iconBg={s.iconBg}
            label={s.label}
            value={s.value}
            change={s.change}
            direction={s.direction}
            changeLabel="vs last month"
            menu={false}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card>
          <CardHeader
            title="Purchase Trend"
            right={
              <Dropdown
                label="Last 9 Months"
                options={["Last 6 Months", "Last 9 Months", "This Year"]}
              />
            }
          />
          <div className="px-4 pb-2 flex items-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600" /> Purchase Amount
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Number of Orders
            </span>
          </div>
          <div className="h-56 px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={PURCHASE_TREND} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar yAxisId="left" dataKey="amount" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Purchase by Item Category" />
          <div className="px-5 pb-5">
            <DonutStat data={PURCHASE_BY_CATEGORY} centerValue="$86,240" centerLabel="Total Purchase" />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Supplier by Country"
            right={<Dropdown label="All Suppliers" options={["All Suppliers", "Active Only"]} />}
          />
          <div className="relative h-32 mx-3 rounded-lg bg-slate-50 overflow-hidden mb-3">
            <svg viewBox="0 0 300 130" className="w-full h-full">
              {Array.from({ length: 11 }).map((_, r) =>
                Array.from({ length: 25 }).map((_, c) => (
                  <circle key={`${r}-${c}`} cx={c * 12 + 4} cy={r * 12 + 4} r="1" fill="#cbd5e1" />
                ))
              )}
              <circle cx="220" cy="30" r="4" fill="#1d4ed8" />
              <circle cx="120" cy="50" r="4" fill="#1d4ed8" />
              <circle cx="90" cy="80" r="4" fill="#1d4ed8" />
              <circle cx="60" cy="40" r="4" fill="#1d4ed8" />
            </svg>
          </div>
          <div className="px-5 pb-5 space-y-2">
            {SUPPLIER_BY_COUNTRY.map((c) => (
              <div key={c.country} className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-slate-600"><span>{c.flag}</span>{c.country}</span>
                <span className="font-medium text-slate-800">{c.value} <span className="text-slate-400 font-normal">({c.percent}%)</span></span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card>
          <CardHeader
            title="Recent Purchase Orders"
            right={<ViewAllLink label="View All" onClick={() => go("/buying/purchase-order")} />}
          />
          <DataTable
            columns={PO_COLUMNS.map((col) =>
              col.key === "po"
                ? {
                    ...col,
                    render: (row) => (
                      <button
                        type="button"
                        onClick={() => go(`/buying/purchase-order?po=${encodeURIComponent(row.po)}`)}
                        className="text-blue-600 hover:underline cursor-pointer font-medium"
                      >
                        {row.po}
                      </button>
                    ),
                  }
                : col
            )}
            rows={RECENT_PURCHASE_ORDERS}
          />
        </Card>

        <Card>
          <CardHeader
            title="Recent Purchase Invoices"
            right={<ViewAllLink label="View All" onClick={() => go("/buying/purchase-invoice")} />}
          />
          <DataTable
            columns={INVOICE_COLUMNS.map((col) =>
              col.key === "invoice"
                ? {
                    ...col,
                    render: (row) => (
                      <button
                        type="button"
                        onClick={() => go(`/buying/purchase-invoice?invoice=${encodeURIComponent(row.invoice)}`)}
                        className="text-blue-600 hover:underline cursor-pointer font-medium"
                      >
                        {row.invoice}
                      </button>
                    ),
                  }
                : col
            )}
            rows={RECENT_PURCHASE_INVOICES}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card>
          <CardHeader
            icon={Trophy}
            iconColor="text-amber-500"
            title="Top Suppliers"
            subtitle="By Purchase Amount"
            right={<Dropdown label="This Year" options={["This Month", "This Quarter", "This Year"]} />}
          />
          <div className="px-5 pb-5 space-y-3">
            {TOP_SUPPLIERS.map((s) => (
              <div key={s.rank}>
                <div className="flex items-center justify-between text-[13px] mb-1">
                  <span className="text-slate-600">{s.rank}. {s.name}</span>
                  <span className="font-semibold text-slate-800">{s.amount} <span className="text-slate-400 font-normal">({s.orders})</span></span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Quick Actions" />
          <div className="grid grid-cols-3 gap-3 px-5 pb-5">
            {QUICK_ACTIONS.map((label, i) => {
              const Icon = QUICK_ICONS[i];
              const path = QUICK_ACTION_PATHS[i];

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => go(path)}
                  aria-label={label}
                  className="flex flex-col items-center justify-center gap-2 border border-slate-200 rounded-xl py-4 hover:bg-slate-50 hover:border-blue-200 active:bg-blue-50 transition-colors cursor-pointer"
                >
                  <Icon size={18} className="text-blue-600" strokeWidth={1.8} />
                  <span className="text-[10.5px] text-slate-600 text-center leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader
            icon={AlertCircle}
            iconColor="text-amber-500"
            title="Pending Actions"
            right={<ViewAllLink label="View All" onClick={() => go("/buying/purchase-order")} />}
          />
          <div className="px-5 pb-3">
            {PENDING_ACTIONS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  if (p.label.includes("Purchase Orders")) go("/buying/purchase-order");
                  else if (p.label.includes("Purchase Receipts")) go("/buying/purchase-receipt");
                  else if (p.label.includes("Supplier Quotations")) go("/buying/supplier-quotation");
                  else if (p.label.includes("Material Requests")) go("/buying/material-request");
                  else if (p.label.includes("Overdue Purchase Orders")) go("/buying/purchase-order");
                }}
                className="w-full flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 text-[13px] text-slate-600 hover:bg-slate-50 text-left rounded-md px-1 cursor-pointer"
              >
                {p.label}
                <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-full px-2 py-0.5">{p.count}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
