import React, { useState } from "react";
import {
  CheckCircle2, Send, RotateCcw, Users, FileText, Plus, ClipboardCheck,
  Workflow, Shield, UserCog, ScrollText, Search, AlertTriangle,
} from "lucide-react";
import { Card, CardHeader, Dropdown, ViewAllLink } from "../../components/ui/Card.jsx";
import StatCard from "../../components/ui/StatCard.jsx";
import DonutStat from "../../components/ui/DonutStat.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import PageHero from "../../components/ui/PageHero.jsx";
import {
  APR_STATS, REQUEST_TABS, APPROVAL_REQUESTS, APPROVAL_STATS_DONUT,
  QUICK_ACTIONS, RECENT_APPROVALS, OVERDUE_APPROVALS,
} from "../../data/approvalsData.js";

const STAT_ICONS = [Send, CheckCircle2, RotateCcw, Users, FileText];
const QUICK_ICONS = [Plus, ClipboardCheck, Workflow, Shield, UserCog, ScrollText];

const REQUEST_COLUMNS = [
  { key: "title", label: "Title", type: "link" },
  { key: "type", label: "Document Type" },
  { key: "ref", label: "Reference No." },
  { key: "requester", label: "Requester" },
  { key: "dept", label: "Department" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "status", label: "Status", type: "status" },
  { key: "created", label: "Created On" },
  {
    key: "action",
    label: "Action",
    render: () => (
      <button className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 whitespace-nowrap">
        Approve
      </button>
    ),
  },
];

const RECENT_COLUMNS = [
  { key: "title", label: "Title", type: "link" },
  { key: "type", label: "Document Type" },
  { key: "requester", label: "Requester" },
  { key: "status", label: "Status", type: "status" },
  { key: "when", label: "Approved On" },
];

const OVERDUE_COLUMNS = [
  { key: "title", label: "Title", type: "link" },
  { key: "type", label: "Document Type" },
  { key: "requester", label: "Requester" },
  { key: "days", label: "Days Overdue", render: (row) => <span className="text-rose-500 font-semibold">{row.days}</span> },
];

export default function ApprovalsDashboard() {
  const [activeTab, setActiveTab] = useState("All Requests");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = APPROVAL_REQUESTS.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col gap-5">
      <PageHero icon={CheckCircle2} iconBg="bg-emerald-500" title="Approval Workspaces" subtitle="Streamline your approval processes for faster and more efficient operations." quote="Right Approvals Keep Business Moving" rightNote="FAST · SAFE · WORLDWIDE" />

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {APR_STATS.map((s, i) => (
          <StatCard key={s.label} icon={STAT_ICONS[i]} iconBg={s.iconBg} label={s.label} value={s.value} change={s.change} direction={s.direction} note={s.note} menu={false} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <Card>
          <div className="flex items-center gap-1 px-5 pt-4 border-b border-slate-100 overflow-x-auto">
            {REQUEST_TABS.map((t) => (
              <button
                key={t.label}
                onClick={() => setActiveTab(t.label)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap ${
                  activeTab === t.label ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
                <span className={`text-[10px] rounded-full px-1.5 ${activeTab === t.label ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>{t.count}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-5 py-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 h-9 flex-1 min-w-[180px]">
              <Search size={14} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by title, reference, or requester..."
                className="bg-transparent outline-none text-xs text-slate-700 placeholder:text-slate-400 w-full"
              />
            </div>
            <Dropdown label="All Document Types" options={["All Document Types", "Purchase Order", "Payment Entry", "Sales Invoice", "Expense Claim"]} />
            <Dropdown label="All Statuses" options={["All Statuses", "Pending", "Overdue"]} />
            <Dropdown label="Created On (New → Old)" options={["Created On (New → Old)", "Created On (Old → New)", "Amount (High → Low)"]} />
          </div>

          <DataTable columns={REQUEST_COLUMNS} rows={pageRows} />

          <div className="flex items-center justify-between px-5 py-3 flex-wrap gap-2">
            <p className="text-xs text-slate-400">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} results
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40" disabled={page === 1}>‹</button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium ${page === i + 1 ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                >
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40" disabled={page === totalPages}>›</button>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-5">
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
            <CardHeader title="Approval Statistics" right={<Dropdown label="This Month" options={["This Week", "This Month", "This Year"]} />} />
            <div className="px-5 pb-5">
              <DonutStat data={APPROVAL_STATS_DONUT} centerValue="156" centerLabel="Total Requests" />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card>
          <CardHeader icon={CheckCircle2} iconColor="text-emerald-500" title="Recent Approvals" right={<ViewAllLink />} />
          <DataTable columns={RECENT_COLUMNS} rows={RECENT_APPROVALS} />
        </Card>

        <Card>
          <CardHeader icon={AlertTriangle} iconColor="text-rose-500" title="Overdue Approvals" right={<ViewAllLink />} />
          <DataTable columns={OVERDUE_COLUMNS} rows={OVERDUE_APPROVALS} />
          <div className="mx-5 mb-5 flex items-center justify-between gap-3 bg-rose-50 border border-rose-100 rounded-lg px-4 py-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-rose-600">3 approvals are overdue</p>
              <p className="text-xs text-rose-400">Please review and take action to avoid delays.</p>
            </div>
            <button className="bg-white border border-rose-200 text-rose-600 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-rose-100 whitespace-nowrap">
              View Overdue
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
