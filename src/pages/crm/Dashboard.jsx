import React from "react";
import {
  RefreshCw, Users, UserCheck, Gem, FileText, DollarSign, TrendingUp,
  UserPlus2, UserCircle2, Plus, Calendar, Mail, Trophy, ChevronRight,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, Dropdown, ViewAllLink } from "../../components/ui/Card.jsx";
import StatCard from "../../components/ui/StatCard.jsx";
import DonutStat from "../../components/ui/DonutStat.jsx";
import FunnelStat from "../../components/ui/FunnelStat.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import PageHero from "../../components/ui/PageHero.jsx";
import {
  CRM_STATS, SALES_PIPELINE, LEADS_VS_CUSTOMERS, CUSTOMER_BY_TYPE,
  RECENT_LEADS, RECENT_OPPORTUNITIES, UPCOMING_ACTIVITIES, TOP_CUSTOMERS,
  QUICK_ACTIONS, CRM_REPORTS,
} from "../../data/crmData.js";

const STAT_ICONS = [Users, UserCheck, Gem, FileText, DollarSign];
const QUICK_ICONS = [UserPlus2, UserCircle2, Plus, FileText, Calendar, Mail];

const LEADS_COLUMNS = [
  { key: "name", label: "Lead Name", type: "link" },
  { key: "company", label: "Company" },
  { key: "source", label: "Source" },
  { key: "status", label: "Status", type: "status" },
  { key: "created", label: "Created On" },
];

const OPP_COLUMNS = [
  { key: "title", label: "Opportunity", type: "link" },
  { key: "customer", label: "Customer" },
  { key: "value", label: "Value", align: "right" },
  { key: "stage", label: "Stage", type: "status" },
];

export default function CrmDashboard() {
  return (
    <div className="flex flex-col gap-5">
      <PageHero icon={RefreshCw} title="CRM" tagline="Build Stronger Relationships" subtitle="Turn leads into loyal customers. Grow your logistics business with smarter CRM." quote="Better Customers Bigger Opportunities" rightNote="People Trade Move the World" />

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {CRM_STATS.map((s, i) => (
          <StatCard key={s.label} icon={STAT_ICONS[i]} iconBg={s.iconBg} label={s.label} value={s.value} change={s.change} direction={s.direction} changeLabel="vs last month" menu={false} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card>
          <CardHeader title="Sales Pipeline" right={<Dropdown label="This Month" options={["This Week", "This Month", "This Year"]} />} />
          <div className="px-5 pb-5">
            <FunnelStat data={SALES_PIPELINE} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Leads & Customers" right={<Dropdown label="Last 12 Months" options={["Last 6 Months", "Last 12 Months"]} />} />
          <div className="px-4 pb-2 flex items-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" /> Leads</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Customers</span>
          </div>
          <div className="h-56 px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={LEADS_VS_CUSTOMERS} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white rounded-lg shadow-lg border border-slate-100 px-3 py-2 text-xs space-y-1">
                        <p className="font-semibold text-slate-700">{label} 2025</p>
                        <p className="flex justify-between gap-4"><span className="text-blue-600">Leads</span><span className="font-medium">{d.leads}</span></p>
                        <p className="flex justify-between gap-4"><span className="text-emerald-600">Customers</span><span className="font-medium">{d.customers}</span></p>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="leads" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="customers" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Customer by Type" />
          <div className="px-5 pb-5">
            <DonutStat data={CUSTOMER_BY_TYPE} centerValue="179" centerLabel="Total Customers" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card>
          <CardHeader title="Recent Leads" right={<ViewAllLink />} />
          <DataTable columns={LEADS_COLUMNS} rows={RECENT_LEADS} />
        </Card>

        <Card>
          <CardHeader title="Recent Opportunities" right={<ViewAllLink />} />
          <DataTable columns={OPP_COLUMNS} rows={RECENT_OPPORTUNITIES} />
        </Card>

        <Card>
          <CardHeader title="Upcoming Activities" right={<ViewAllLink />} />
          <div className="px-5 pb-3">
            {UPCOMING_ACTIVITIES.map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
                  <Calendar size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-800">{a.title}</p>
                  <p className="text-xs text-slate-400">{a.sub}</p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 text-right">{a.when}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-1">
          <CardHeader icon={Trophy} iconColor="text-amber-500" title="Top Customers" subtitle="By Revenue" right={<Dropdown label="This Year" options={["This Month", "This Quarter", "This Year"]} />} />
          <div className="px-5 pb-5 space-y-3">
            {TOP_CUSTOMERS.map((c) => (
              <div key={c.rank}>
                <div className="flex items-center justify-between text-[13px] mb-1">
                  <span className="text-slate-600">{c.rank}. {c.name}</span>
                  <span className="font-semibold text-slate-800">{c.amount}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${c.pct}%` }} />
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
          <CardHeader title="CRM Reports" right={<ViewAllLink />} />
          <div className="px-5 pb-3">
            {CRM_REPORTS.map((r) => (
              <button key={r} className="w-full flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 text-[13px] text-slate-600 hover:text-blue-600">
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
