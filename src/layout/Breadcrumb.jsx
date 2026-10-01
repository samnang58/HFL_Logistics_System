import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import { ROUTE_INDEX } from "../data/navigation.js";

export default function Breadcrumb() {
  const location = useLocation();
  const entry = ROUTE_INDEX[location.pathname];

  // The two top-level landing pages (module overview + admin Home) don't
  // show a breadcrumb trail in the reference screenshots.
  if (!entry || location.pathname === "/hfl-logistics") return null;

  const isHome = location.pathname === "/home";

  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 flex-wrap">
      <Link to="/home" className="flex items-center gap-1 hover:text-blue-600">
        <Home size={14} />
        Home
      </Link>
      {!isHome && (
        <>
          {entry.parentLabel && (
            <>
              <span>›</span>
              <span>{entry.parentLabel}</span>
            </>
          )}
          <span>›</span>
          <span className="text-slate-700 font-medium">{entry.label}</span>
        </>
      )}
    </div>
  );
}
