import React from "react";

// Maps common ERP status words to a color scheme. Falls back to slate.
const STATUS_STYLES = {
  completed: "bg-emerald-50 text-emerald-600",
  approved: "bg-emerald-50 text-emerald-600",
  paid: "bg-emerald-50 text-emerald-600",
  active: "bg-emerald-50 text-emerald-600",
  delivered: "bg-emerald-50 text-emerald-600",
  confirmed: "bg-emerald-50 text-emerald-600",
  posted: "bg-violet-50 text-violet-600",
  submitted: "bg-blue-50 text-blue-600",
  "in transit": "bg-blue-50 text-blue-600",
  scheduled: "bg-slate-100 text-slate-600",
  new: "bg-blue-50 text-blue-600",
  qualified: "bg-emerald-50 text-emerald-600",
  contacted: "bg-emerald-50 text-emerald-600",
  proposal: "bg-violet-50 text-violet-600",
  negotiation: "bg-amber-50 text-amber-600",
  pending: "bg-amber-50 text-amber-600",
  "to receive": "bg-amber-50 text-amber-600",
  "to deliver": "bg-amber-50 text-amber-600",
  "due soon": "bg-amber-50 text-amber-600",
  draft: "bg-slate-100 text-slate-600",
  partial: "bg-amber-50 text-amber-600",
  unpaid: "bg-rose-50 text-rose-600",
  overdue: "bg-rose-50 text-rose-600",
  rejected: "bg-rose-50 text-rose-600",
  "low stock": "bg-amber-50 text-amber-600",
  "out of stock": "bg-rose-50 text-rose-600",
  open: "bg-blue-50 text-blue-600",
};

export default function StatusPill({ status }) {
  const key = (status || "").toLowerCase();
  const style = STATUS_STYLES[key] || "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap ${style}`}>
      {status}
    </span>
  );
}
