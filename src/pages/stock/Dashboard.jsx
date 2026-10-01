import React from "react";
import {
  Boxes, Building2, DollarSign, AlertTriangle, PackageX, Plus, ClipboardList,
  ArrowLeftRight, SlidersHorizontal, ClipboardCheck, ScanLine, ChevronRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, Dropdown, ViewAllLink } from "../../components/ui/Card.jsx";
import StatCard from "../../components/ui/StatCard.jsx";
import DonutStat from "../../components/ui/DonutStat.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import PageHero from "../../components/ui/PageHero.jsx";
import {
  STOCK_STATS, STOCK_MOVEMENT, ITEM_CATEGORY_DISTRIBUTION, STOCK_VALUE_BY_WAREHOUSE,
  LOW_STOCK_ITEMS, OUT_OF_STOCK_ITEMS, RECENT_STOCK_ENTRIES, QUICK_ACTIONS, STOCK_REPORTS,
} from "../../data/stockData.js";

const STAT_ICONS = [Boxes, Building2, DollarSign, AlertTriangle, PackageX];
const QUICK_ICONS = [Plus, ClipboardList, ArrowLeftRight, SlidersHorizontal, ClipboardCheck, ScanLine];

const LOW_STOCK_COLUMNS = [
  { key: "code", label: "Item Code", type: "link" },
  { key: "name", label: "Item Name" },
  { key: "warehouse", label: "Warehouse" },
  { key: "qty", label: "Current Qty", align: "right" },
  { key: "reorder", label: "Reorder Level", align: "right" },
  { key: "status", label: "Status", type: "status" },
];

const ENTRIES_COLUMNS = [
  { key: "date", label: "Date" },
  { key: "type", label: "Type", type: "status" },
  { key: "ref", label: "Reference No." },
  { key: "item", label: "Item" },
  { key: "qty", label: "Qty", align: "right" },
  { key: "warehouse", label: "Warehouse" },
  { key: "user", label: "User" },
];

export default function StockDashboard() {
  const maxWarehouseValue = Math.max(...STOCK_VALUE_BY_WAREHOUSE.map((w) => w.value));

  return (
    <div className="flex flex-col gap-5">
      <PageHero icon={Boxes} title="Stock Management" subtitle="Track your inventory. Keep your supply chain moving." quote="Right Stock Right Place Right Time" rightNote="HFL LOGISTICS" />

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {STOCK_STATS.map((s, i) => (
          <StatCard key={s.label} icon={STAT_ICONS[i]} iconBg={s.iconBg} label={s.label} value={s.value} change={s.change} direction={s.direction} note={s.note} changeLabel={s.change ? "vs last month" : null} menu={false} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card>
          <CardHeader title="Stock Movement" right={<Dropdown label="Last 6 Months" options={["Last 3 Months", "Last 6 Months", "This Year"]} />} />
          <div className="px-4 pb-2 flex items-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" /> Stock In</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Stock Out</span>
          </div>
          <div className="h-56 px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={STOCK_MOVEMENT} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                <Tooltip />
                <Bar dataKey="stockIn" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="stockOut" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Item Category Distribution" />
          <div className="px-5 pb-5">
            <DonutStat data={ITEM_CATEGORY_DISTRIBUTION} centerValue="1,248" centerLabel="Total Items" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Stock Value by Warehouse" right={<Dropdown label="This Month" options={["This Month", "Last Month", "This Year"]} />} />
          <div className="px-5 pb-5 space-y-3">
            {STOCK_VALUE_BY_WAREHOUSE.map((w) => (
              <div key={w.name}>
                <div className="flex items-center justify-between text-[12.5px] mb-1">
                  <span className="text-slate-600 truncate pr-2">{w.name}</span>
                  <span className="font-semibold text-slate-800 shrink-0">{w.display}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(w.value / maxWarehouseValue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card>
          <CardHeader icon={AlertTriangle} iconColor="text-amber-500" title="Low Stock Items" right={<ViewAllLink />} />
          <DataTable columns={LOW_STOCK_COLUMNS} rows={LOW_STOCK_ITEMS} />
        </Card>
        <Card>
          <CardHeader icon={PackageX} iconColor="text-rose-500" title="Out of Stock Items" right={<ViewAllLink />} />
          <DataTable columns={LOW_STOCK_COLUMNS} rows={OUT_OF_STOCK_ITEMS} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-1">
          <CardHeader title="Recent Stock Entries" right={<ViewAllLink />} />
          <DataTable columns={ENTRIES_COLUMNS} rows={RECENT_STOCK_ENTRIES} />
        </Card>

        <Card>
          <CardHeader title="Quick Actions" />
          <div className="grid grid-cols-3 gap-3 px-5 pb-5">
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

        <Card>
          <CardHeader title="Reports" right={<ViewAllLink />} />
          <div className="px-5 pb-3">
            {STOCK_REPORTS.map((r) => (
              <button key={r} className="w-full flex items-center justify-between py-2 border-b border-slate-50 last:border-0 text-[13px] text-slate-600 hover:text-blue-600">
                {r}
                <ChevronRight size={14} className="text-slate-300" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
