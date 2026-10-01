import React from "react";
import {
  BarChart3, ShoppingCart, FileText, PackageCheck, RotateCcw, Users,
  FilePlus2, Truck, Undo2, UserCircle2, Tag, Database,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, Dropdown, ViewAllLink } from "../../components/ui/Card.jsx";
import StatCard from "../../components/ui/StatCard.jsx";
import DonutStat from "../../components/ui/DonutStat.jsx";
import FunnelStat from "../../components/ui/FunnelStat.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import PageHero from "../../components/ui/PageHero.jsx";
import {
  SELL_STATS, SALES_TREND, SALES_BY_CATEGORY, TOP_CUSTOMERS,
  RECENT_SALES_ORDERS, RECENT_SALES_INVOICES, QUICK_ACTIONS,
  SALES_PIPELINE, DELIVERY_STATUS, UPCOMING_DELIVERIES,
} from "../../data/sellingData.js";

const STAT_ICONS = [ShoppingCart, FileText, BarChart3, PackageCheck, RotateCcw, Users];
const QUICK_ICONS = [FilePlus2, ShoppingCart, FileText, Truck, Undo2, UserCircle2, Tag, Database];

const SO_COLUMNS = [
  { key: "so", label: "Sales Order", type: "link" },
  { key: "customer", label: "Customer" },
  { key: "date", label: "Order Date" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "status", label: "Status", type: "status" },
];

const INVOICE_COLUMNS = [
  { key: "invoice", label: "Invoice No.", type: "link" },
  { key: "customer", label: "Customer" },
  { key: "date", label: "Invoice Date" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "status", label: "Status", type: "status" },
];

const DELIVERY_COLUMNS = [
  { key: "dn", label: "Delivery No.", type: "link" },
  { key: "customer", label: "Customer" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status", type: "status" },
];

export default function SellingDashboard() {
  return (
    <div className="flex flex-col gap-5">
      <PageHero icon={BarChart3} title="Selling" subtitle="Turn your quotations into sales. Deliver value worldwide." quote="More Sales A Stronger Tomorrow" />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {SELL_STATS.map((s, i) => (
          <StatCard key={s.label} icon={STAT_ICONS[i]} iconBg={s.iconBg} label={s.label} value={s.value} change={s.change} direction={s.direction} changeLabel="vs last month" menu={false} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr_1fr] gap-5">
        <Card>
          <CardHeader title="Sales Trend" right={<Dropdown label="Last 6 Months" options={["Last 3 Months", "Last 6 Months", "This Year"]} />} />
          <div className="px-4 pb-2 flex items-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" /> Sales Order</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Sales Invoice</span>
          </div>
          <div className="h-56 px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SALES_TREND} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white rounded-lg shadow-lg border border-slate-100 px-3 py-2 text-xs space-y-1">
                        <p className="font-semibold text-slate-700">{label} 2025</p>
                        <p className="flex justify-between gap-4"><span className="text-blue-600">Sales Order</span><span className="font-medium">{d.order.toLocaleString()}</span></p>
                        <p className="flex justify-between gap-4"><span className="text-emerald-600">Sales Invoice</span><span className="font-medium">{d.invoice.toLocaleString()}</span></p>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="order" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="invoice" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Sales by Item Category" right={<Dropdown label="This Year" options={["This Month", "This Quarter", "This Year"]} />} />
          <div className="px-5 pb-5">
            <DonutStat data={SALES_BY_CATEGORY} centerValue="$245,680" centerLabel="Total Sales" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Top Customers" right={<ViewAllLink />} />
          <div className="px-5 pb-4 space-y-1">
            <div className="grid grid-cols-[24px_1fr_auto_auto] gap-2 text-[10px] uppercase tracking-wide text-slate-400 pb-1 border-b border-slate-100">
              <span>#</span><span>Customer</span><span className="text-right">Sales Amount</span><span className="text-right">Orders</span>
            </div>
            {TOP_CUSTOMERS.map((c) => (
              <div key={c.rank} className="grid grid-cols-[24px_1fr_auto_auto] gap-2 items-center py-2 text-[13px] border-b border-slate-50 last:border-0">
                <span className="text-slate-400">{c.rank}</span>
                <span className="text-slate-700 truncate">{c.name}</span>
                <span className="font-medium text-slate-800 text-right">{c.amount}</span>
                <span className="text-slate-500 text-right">{c.orders}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Recent Sales Orders" right={<ViewAllLink />} />
          <DataTable columns={SO_COLUMNS} rows={RECENT_SALES_ORDERS} />
        </Card>
        <Card>
          <CardHeader title="Recent Sales Invoices" right={<ViewAllLink />} />
          <DataTable columns={INVOICE_COLUMNS} rows={RECENT_SALES_INVOICES} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card>
          <CardHeader title="Sales Pipeline" right={<Dropdown label="This Year" options={["This Month", "This Quarter", "This Year"]} />} />
          <div className="px-5 pb-5">
            <FunnelStat data={SALES_PIPELINE} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Delivery Status" right={<Dropdown label="This Month" options={["This Week", "This Month", "This Year"]} />} />
          <div className="px-5 pb-5">
            <DonutStat data={DELIVERY_STATUS} centerValue="112" centerLabel="Total Deliveries" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Upcoming Deliveries" right={<ViewAllLink />} />
          <DataTable columns={DELIVERY_COLUMNS} rows={UPCOMING_DELIVERIES} />
        </Card>
      </div>

      <Card>
        <CardHeader title="Quick Actions" />
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3 px-5 pb-5">
          {QUICK_ACTIONS.map((label, i) => {
            const Icon = QUICK_ICONS[i];
            return (
              <button key={label} className="flex flex-col items-center justify-center gap-2 border border-slate-200 rounded-xl py-4 hover:bg-slate-50 hover:border-blue-200 transition-colors">
                <Icon size={18} className="text-blue-600" strokeWidth={1.8} />
                <span className="text-[10.5px] text-slate-600 text-center leading-tight">{label}</span>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
