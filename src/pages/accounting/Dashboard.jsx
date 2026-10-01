import React, { useState } from "react";
import {
  Coins, TrendingUp, Wallet, BarChart3, Users, Landmark, PiggyBank,
  Banknote, ClipboardList, ChevronDown, FileBarChart, FileSpreadsheet,
  FileText, BookOpen,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, Dropdown, ViewAllLink } from "../../components/ui/Card.jsx";
import StatCard from "../../components/ui/StatCard.jsx";
import DonutStat from "../../components/ui/DonutStat.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import PageHero from "../../components/ui/PageHero.jsx";
import {
  ACC_STATS, INCOME_VS_EXPENSE, EXPENSE_BREAKDOWN, ACCOUNT_BALANCES,
  RECENT_TRANSACTIONS, OUTSTANDING_RECEIVABLE, QUICK_ACTIONS, FINANCIAL_REPORTS,
} from "../../data/accountingData.js";

const STAT_ICONS = [TrendingUp, Wallet, BarChart3, Users, Landmark];
const QUICK_ICONS = [FileText, FileSpreadsheet, Banknote, BookOpen, Landmark, ClipboardList, FileBarChart, FileText];
const REPORT_ICONS = [FileBarChart, Landmark, TrendingUp, BookOpen];
const REPORT_BG = ["bg-emerald-100 text-emerald-600", "bg-blue-100 text-blue-600", "bg-violet-100 text-violet-600", "bg-amber-100 text-amber-600"];

const TX_COLUMNS = [
  { key: "id", label: "#" },
  { key: "date", label: "Date" },
  { key: "type", label: "Type" },
  { key: "ref", label: "Reference No.", type: "link" },
  { key: "party", label: "Party" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "status", label: "Status", type: "status" },
];

const RECEIVABLE_COLUMNS = [
  { key: "id", label: "#" },
  { key: "customer", label: "Customer", type: "link" },
  { key: "invoice", label: "Invoice No." },
  { key: "due", label: "Due Date" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "status", label: "Status", type: "status" },
];

export default function AccountingDashboard() {
  const [tab, setTab] = useState("receivable");

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        icon={Coins}
        title="Accounting"
        subtitle="Manage your financial operations with accuracy and transparency."
        quote="Accurate Accounting Stronger Business"
        right={
          <div className="flex items-center gap-2">
            <Dropdown label="Sep 1 - Sep 10, 2025" options={["This Week", "This Month", "Last Month", "Custom Range"]} />
            <Dropdown label="Actions" options={["New Sales Invoice", "New Purchase Invoice", "New Journal Entry", "Export Report"]} />
          </div>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {ACC_STATS.map((s, i) => (
          <StatCard
            key={s.label}
            icon={STAT_ICONS[i]}
            iconBg={s.iconBg}
            label={s.label}
            value={s.value}
            change={s.change}
            direction={s.direction}
            changeLabel={s.change ? "vs last month" : null}
            note={s.note}
            menu={false}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr_1fr] gap-5">
        <Card>
          <CardHeader icon={BarChart3} title="Income vs Expense" right={<Dropdown label="Last 9 Months" options={["Last 6 Months", "Last 9 Months", "This Year"]} />} />
          <div className="px-4 pb-2 flex items-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" /> Income</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-300" /> Expense</span>
          </div>
          <div className="h-64 px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={INCOME_VS_EXPENSE} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                <Bar dataKey="income" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="expense" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Expense Breakdown" right={<Dropdown label="This Month" options={["This Month", "Last Month", "This Year"]} />} />
          <div className="px-5 pb-5">
            <DonutStat data={EXPENSE_BREAKDOWN} centerValue="$86,240" centerLabel="Total Expense" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Account Balance" right={<ViewAllLink />} />
          <div className="px-5 pb-5 space-y-1">
            {ACCOUNT_BALANCES.map((a) => (
              <div key={a.name} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="flex items-center gap-2.5 text-[13px] text-slate-600">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.iconBg}`}>
                    <PiggyBank size={14} />
                  </span>
                  {a.name}
                </span>
                <span className={`font-medium text-sm ${a.value.startsWith("-") ? "text-rose-500" : "text-slate-800"}`}>{a.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card>
          <CardHeader icon={ClipboardList} title="Recent Transactions" right={<ViewAllLink />} />
          <DataTable columns={TX_COLUMNS} rows={RECENT_TRANSACTIONS} />
        </Card>

        <Card>
          <CardHeader title="Outstanding Invoices" right={<ViewAllLink />} />
          <div className="px-5 flex items-center gap-2 border-b border-slate-100 pb-2">
            <button
              onClick={() => setTab("receivable")}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg ${tab === "receivable" ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"}`}
            >
              Receivable (Customers)
            </button>
            <button
              onClick={() => setTab("payable")}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg ${tab === "payable" ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"}`}
            >
              Payable (Suppliers)
            </button>
          </div>
          {tab === "receivable" ? (
            <DataTable columns={RECEIVABLE_COLUMNS} rows={OUTSTANDING_RECEIVABLE} />
          ) : (
            <div className="p-8 text-center text-sm text-slate-400">No outstanding payables to suppliers right now.</div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Quick Actions" />
          <div className="grid grid-cols-4 gap-3 px-5 pb-5">
            {QUICK_ACTIONS.map((label, i) => {
              const Icon = QUICK_ICONS[i];
              return (
                <button key={label} className="flex flex-col items-center justify-center gap-2 border border-slate-200 rounded-xl py-4 hover:bg-slate-50 hover:border-blue-200 transition-colors">
                  <Icon size={19} className="text-blue-600" strokeWidth={1.8} />
                  <span className="text-[11px] text-slate-600 text-center leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Financial Reports" right={<ViewAllLink />} />
          <div className="px-5 pb-3">
            {FINANCIAL_REPORTS.map((r, i) => {
              const Icon = REPORT_ICONS[i];
              return (
                <div key={r.title} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50/60 rounded-lg px-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${REPORT_BG[i]}`}>
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-800">{r.title}</p>
                    <p className="text-xs text-slate-400">{r.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
