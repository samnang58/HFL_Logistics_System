import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ icon: Icon, iconColor = "text-blue-600", title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 flex-wrap">
      <div className="flex items-start gap-2.5">
        {Icon && <Icon size={19} className={`${iconColor} mt-0.5 shrink-0`} strokeWidth={2} />}
        <div>
          <h3 className="text-[15px] font-semibold text-slate-800 leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="flex items-center gap-2 flex-wrap">{right}</div>}
    </div>
  );
}

export function ViewAllLink({ label = "View All", onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-medium text-blue-600 flex items-center gap-1 hover:underline shrink-0"
    >
      {label} →
    </button>
  );
}

/** Functional dropdown -- click to open a small option list, selection updates the label. */
export function Dropdown({ label, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(label);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 whitespace-nowrap"
      >
        {value}
        <ChevronDown size={13} />
      </button>
      {open && options?.length > 0 && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                setValue(opt);
                setOpen(false);
                onChange?.(opt);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 ${
                opt === value ? "text-blue-600 font-medium" : "text-slate-600"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function IconButton({ children, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${
        active ? "bg-blue-50 border-blue-200 text-blue-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
