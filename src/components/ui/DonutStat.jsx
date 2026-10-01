import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

/**
 * data: [{ label, value, percent, color }]
 * centerLabel / centerValue rendered in the middle of the donut.
 */
export default function DonutStat({ data, centerValue, centerLabel }) {
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="relative w-44 h-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={1}
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-slate-900">{centerValue}</span>
          <span className="text-[11px] text-slate-400 text-center px-4">{centerLabel}</span>
        </div>
      </div>
      <ul className="flex-1 min-w-[160px] space-y-2">
        {data.map((d) => (
          <li key={d.label} className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
              {d.label}
            </span>
            <span className="font-medium text-slate-800">
              {d.value}
              {d.percent != null && <span className="text-slate-400 font-normal"> ({d.percent}%)</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
