import React from "react";
import StatusPill from "./StatusPill.jsx";

/**
 * Generic table renderer.
 *
 * columns: [{ key, label, align?: "left"|"right", render?: (row) => node }]
 * rows: array of plain objects
 *
 * A column named "status" (or with type: "status") auto-renders a StatusPill.
 * A column with type: "link" renders blue underlined text.
 */
export default function DataTable({ columns, rows, dense = false }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-${col.align || "left"} font-medium text-slate-400 text-[11px] uppercase tracking-wide px-4 py-2 whitespace-nowrap`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              {columns.map((col) => {
                const value = row[col.key];
                let content;
                if (col.render) content = col.render(row);
                else if (col.type === "status") content = <StatusPill status={value} />;
                else if (col.type === "link") content = <span className="text-blue-600 hover:underline cursor-pointer">{value}</span>;
                else content = value;

                return (
                  <td
                    key={col.key}
                    className={`text-${col.align || "left"} px-4 ${dense ? "py-2" : "py-2.5"} text-slate-600 whitespace-nowrap`}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
