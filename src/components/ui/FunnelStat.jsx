import React from "react";

/**
 * Simple CSS-based funnel (not a chart library) since both reference
 * screenshots use flat trapezoid bars that shrink stage over stage.
 * data: [{ label, value, percent, color }]
 */
export default function FunnelStat({ data }) {
  const max = data[0]?.percent || 100;
  return (
    <div className="flex items-center gap-8 flex-wrap">
      <div className="flex flex-col gap-1 w-full max-w-[220px]">
        {data.map((d, i) => {
          const widthPct = 40 + (60 * d.percent) / max; // keep a visible minimum width
          return (
            <div
              key={d.label}
              className="h-8 flex items-center justify-center text-white text-xs font-medium rounded-sm mx-auto"
              style={{ width: `${widthPct}%`, background: d.color }}
            />
          );
        })}
      </div>
      <ul className="flex-1 min-w-[160px] space-y-2.5">
        {data.map((d) => (
          <li key={d.label} className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
              {d.label}
            </span>
            <span className="font-medium text-slate-800">
              {d.value} <span className="text-slate-400 font-normal">({d.percent}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
