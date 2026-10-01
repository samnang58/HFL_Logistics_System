import React from "react";
import { useLocation } from "react-router-dom";
import { Package } from "lucide-react";
import { Card } from "../components/ui/Card.jsx";
import { ROUTE_INDEX } from "../data/navigation.js";

export default function PlaceholderPage() {
  const location = useLocation();
  const entry = ROUTE_INDEX[location.pathname];
  const label = entry?.label || "Page";

  return (
    <Card className="min-h-[420px] flex flex-col items-center justify-center text-center p-10">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <Package size={26} className="text-blue-600" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800">{label}</h2>
      <p className="text-sm text-slate-400 mt-1 max-w-xs">
        This page hasn't been designed from a reference screenshot yet. Send a UI reference for
        "{label}" and it will be built to match, following the same HFL Logistics design system.
      </p>
    </Card>
  );
}
