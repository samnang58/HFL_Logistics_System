import React from "react";

/**
 * Shared hero banner used at the top of every module dashboard
 * (Accounting, Approval Workspaces, CRM, Buying, Stock, Selling, HR).
 *
 * props:
 *  - icon (lucide component), iconBg
 *  - title, tagline (bold sub-title, optional), subtitle (description line)
 *  - quote (right-side italic quote), rightNote (small caption under quote)
 *  - right (custom node to fully replace the right side, e.g. date-range + actions)
 */
export default function PageHero({ icon: Icon, iconBg = "bg-blue-600", title, tagline, subtitle, quote, rightNote, right }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-sky-50 via-blue-50 to-blue-100 border border-blue-100">
      <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle,#1d4ed8_1px,transparent_1px)] [background-size:16px_16px]" />
      <div className="relative flex flex-wrap items-center justify-between gap-4 px-6 sm:px-8 py-6">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className={`w-14 h-14 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
              <Icon size={26} className="text-white" strokeWidth={2} />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">{title}</h1>
            {tagline && <p className="text-blue-700 font-semibold mt-0.5">{tagline}</p>}
            {subtitle && <p className="text-slate-500 text-sm mt-1 max-w-md">{subtitle}</p>}
          </div>
        </div>

        {right ? (
          <div className="shrink-0">{right}</div>
        ) : quote ? (
          <div className="hidden md:block text-right shrink-0 max-w-[240px]">
            <p className="italic text-slate-700 font-medium leading-snug">"{quote}"</p>
            {rightNote && <p className="text-slate-500 text-xs mt-1">{rightNote}</p>}
          </div>
        ) : null}
      </div>
    </div>
  );
}
