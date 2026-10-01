import React from "react";
import { ArrowUp, ArrowDown, MoreHorizontal } from "lucide-react";
import { Card } from "./Card.jsx";

/**
 * Generic KPI / stat card used on every module dashboard.
 *
 * props:
 *  - icon, iconBg ("bg-blue-600" etc.)
 *  - label, value
 *  - change ("12%"), direction ("up" | "down" | null)
 *  - changeLabel ("vs last month")
 *  - tint ("bg-blue-50" etc.) optional background tint for the whole card
 *  - menu (bool) show the "..." icon
 */
export default function StatCard({
  icon: Icon,
  iconBg = "bg-blue-600",
  label,
  value,
  change,
  direction = "up",
  changeLabel,
  note,
  tint,
  menu = true,
}) {
  const changeColor = direction === "down" ? "text-rose-500" : "text-emerald-600";
  const ArrowIcon = direction === "down" ? ArrowDown : ArrowUp;

  return (
    <Card className={`${tint || ""} ${tint ? "!border-transparent" : ""}`}>
      <div className="p-4 flex items-start gap-3">
        {Icon && (
          <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon size={20} className="text-white" strokeWidth={2} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-[11px] font-medium text-slate-500 leading-tight">{label}</p>
            {menu && <MoreHorizontal size={15} className="text-slate-400 shrink-0" />}
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {change && (
            <p className={`text-xs font-medium flex items-center gap-1 mt-0.5 ${changeColor}`}>
              <ArrowIcon size={12} />
              {change}
              {changeLabel && <span className="text-slate-400 font-normal">{changeLabel}</span>}
            </p>
          )}
          {note && <p className="text-xs text-slate-400 mt-0.5">{note}</p>}
        </div>
      </div>
    </Card>
  );
}
